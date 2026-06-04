// POST /api/competitors/validate-seeds  { query: string }
// Tests each seed URL through Firecrawl and returns diagnostics so we can
// identify which seed sources actually return product listings vs
// navigation/anti-bot shells. Does NOT touch the pipeline, schema, or DB.

import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";
import { firecrawlScrape } from "@/lib/firecrawl.server";

type Body = { query?: string };

// Mirror of the seed templates in competitor-pipeline.server.ts. Kept local
// so this endpoint stays a pure read-only probe and doesn't import or
// perturb the pipeline.
const SEED_TEMPLATES: Array<{ source: string; template: string }> = [
  { source: "amazon", template: "https://www.amazon.com/s?k={q}" },
  { source: "ebay", template: "https://www.ebay.com/sch/i.html?_nkw={q}" },
  { source: "aliexpress", template: "https://www.aliexpress.com/w/wholesale-{q}.html" },
  { source: "daraz", template: "https://www.daraz.com.bd/catalog/?q={q}" },
  { source: "walmart", template: "https://www.walmart.com/search?q={q}" },
  { source: "bestbuy", template: "https://www.bestbuy.com/site/searchpage.jsp?st={q}" },
  { source: "etsy", template: "https://www.etsy.com/search?q={q}" },
  { source: "zappos", template: "https://www.zappos.com/search?term={q}" },
  { source: "sephora", template: "https://www.sephora.com/search?keyword={q}" },
  { source: "wayfair", template: "https://www.wayfair.com/keyword.php?keyword={q}" },
];

const PRICE_RE = /(?:[৳$€£₹¥]|USD|EUR|GBP|BDT|INR)\s?\d{1,3}(?:[.,]\d{2,3})*(?:\.\d{1,2})?/gi;
const PRODUCT_CARD_RE = /!\[[^\]]*\]\([^)]+\)\s*\n?\s*\[?[^\n]{8,140}/g; // image + adjacent text
const TITLE_LINK_RE = /\[([A-Za-z0-9][^\]]{8,160})\]\(https?:\/\/[^\s)]+\)/g;
const NAV_SHELL_RE = /(robot check|enter the characters|are you a human|access denied|captcha|verify you are human|unusual traffic|temporarily unavailable)/i;

type SeedReport = {
  source: string;
  seedUrl: string;
  ok: boolean;
  error?: string;
  finalUrl?: string;
  status?: number;
  markdownLength: number;
  markdownPreview: string;
  priceCount: number;
  productCardCount: number;
  productTitleCount: number;
  navShellDetected: boolean;
  verdict: "real_products" | "navigation_shell" | "empty" | "error";
};

function analyze(source: string, seedUrl: string, page: {
  url: string;
  markdown: string;
  metadata?: Record<string, unknown>;
}): SeedReport {
  const md = page.markdown ?? "";
  const priceCount = (md.match(PRICE_RE) ?? []).length;
  const productCardCount = (md.match(PRODUCT_CARD_RE) ?? []).length;
  const productTitleCount = (md.match(TITLE_LINK_RE) ?? []).length;
  const navShellDetected = NAV_SHELL_RE.test(md);
  const meta = page.metadata as { sourceURL?: string; url?: string; statusCode?: number } | undefined;
  const finalUrl = meta?.sourceURL ?? meta?.url ?? page.url;
  const status = meta?.statusCode;

  let verdict: SeedReport["verdict"];
  if (md.length === 0) verdict = "empty";
  else if (navShellDetected) verdict = "navigation_shell";
  else if (priceCount >= 5 && productTitleCount >= 5) verdict = "real_products";
  else verdict = "navigation_shell";

  return {
    source,
    seedUrl,
    ok: true,
    finalUrl,
    status,
    markdownLength: md.length,
    markdownPreview: md.slice(0, 1000),
    priceCount,
    productCardCount,
    productTitleCount,
    navShellDetected,
    verdict,
  };
}

export const Route = createFileRoute("/api/competitors/validate-seeds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const body = (await request.json().catch(() => ({}))) as Body;
        const query = (body.query ?? "").trim();
        if (!query) {
          return Response.json({ error: "query required" }, { status: 400 });
        }
        const enc = encodeURIComponent(query);
        const seeds = SEED_TEMPLATES.map((s) => ({
          source: s.source,
          seedUrl: s.template.replace(/\{q\}/g, enc),
        }));

        const reports = await Promise.all(
          seeds.map(async ({ source, seedUrl }): Promise<SeedReport> => {
            try {
              const page = await firecrawlScrape(seedUrl, {
                formats: ["markdown", "links"],
              });
              return analyze(source, seedUrl, page);
            } catch (err) {
              return {
                source,
                seedUrl,
                ok: false,
                error: err instanceof Error ? err.message : String(err),
                markdownLength: 0,
                markdownPreview: "",
                priceCount: 0,
                productCardCount: 0,
                productTitleCount: 0,
                navShellDetected: false,
                verdict: "error",
              };
            }
          }),
        );

        const summary = {
          total: reports.length,
          real_products: reports.filter((r) => r.verdict === "real_products").length,
          navigation_shell: reports.filter((r) => r.verdict === "navigation_shell").length,
          empty: reports.filter((r) => r.verdict === "empty").length,
          error: reports.filter((r) => r.verdict === "error").length,
        };

        return Response.json({ ok: true, query, summary, reports });
      },
    },
  },
});
