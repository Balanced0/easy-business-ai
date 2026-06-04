// Crawl-only competitor discovery + product extraction pipeline.
// No Firecrawl /search anywhere — discovery starts from seed URLs, crawls
// them, extracts product-like pages + outbound domains, and expands the
// competitor list from there. Idempotent (upserts) and scheduler-friendly.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  firecrawlScrape,
  firecrawlCrawl,
  PRODUCT_EXTRACT_SCHEMA,
  type ScrapedPage,
  type CrawlPage,
} from "./firecrawl.server";

function hostFrom(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function nameFromHost(host: string): string {
  const base = host.split(".")[0] ?? host;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// Heuristic: looks like an individual product/listing URL.
function looksLikeProductUrl(url: string): boolean {
  return /\/(product|products|p|item|items|shop|listing|dp|sku)\//i.test(url);
}

// Pull every absolute URL out of a markdown blob (links, images, bare URLs).
function extractUrlsFromMarkdown(md: string): string[] {
  const out = new Set<string>();
  const re = /https?:\/\/[^\s)\]"'<>]+/g;
  for (const m of md.matchAll(re)) out.add(m[0].replace(/[.,)\]]+$/, ""));
  return [...out];
}

type DiscoveryOptions = {
  limit?: number; // pages crawled per seed
  includePaths?: string[];
  excludePaths?: string[];
};

// 1. Crawl seed URL(s), discover competitor domains from outbound links,
//    persist competitor rows, and persist any product-like pages found in
//    the same crawl (avoiding a second round-trip).
export async function discoverFromSeeds(
  userId: string,
  seedUrls: string[],
  opts: DiscoveryOptions = {},
) {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const allCompetitors: Record<string, unknown>[] = [];
  let productsInserted = 0;

  for (const seedUrl of seedUrls) {
    const seedHost = hostFrom(seedUrl);
    if (!seedHost) continue;

    const pages = await firecrawlCrawl(seedUrl, {
      limit,
      includePaths: opts.includePaths,
      excludePaths: opts.excludePaths,
      extractSchema: PRODUCT_EXTRACT_SCHEMA,
    });

    // a) Aggregate outbound domains discovered across crawled pages.
    const byDomain = new Map<
      string,
      { url: string; title?: string; description?: string }
    >();
    // Seed itself is always a competitor.
    byDomain.set(seedHost, { url: seedUrl });

    for (const p of pages) {
      const urls = [
        ...extractUrlsFromMarkdown(p.markdown ?? ""),
        ...(Array.isArray((p.metadata as { links?: unknown })?.links)
          ? ((p.metadata as { links: string[] }).links ?? [])
          : []),
      ];
      for (const u of urls) {
        const host = hostFrom(u);
        if (!host) continue;
        if (
          host.includes("google.") ||
          host.includes("youtube.") ||
          host.includes("facebook.") ||
          host.includes("instagram.") ||
          host.includes("twitter.") ||
          host.includes("x.com") ||
          host.includes("pinterest.") ||
          host.includes("tiktok.") ||
          host.includes("linkedin.") ||
          host.endsWith(".gov") ||
          host.endsWith(".edu")
        )
          continue;
        if (!byDomain.has(host)) byDomain.set(host, { url: u });
      }
    }

    const rows = Array.from(byDomain.entries()).map(([domain, r]) => ({
      user_id: userId,
      query: seedUrl,
      name: nameFromHost(domain),
      domain,
      url: r.url,
      description: null,
      source: "firecrawl_crawl",
    }));

    if (rows.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("competitors")
        .upsert(rows, { onConflict: "user_id,domain,query" })
        .select("*");
      if (error) throw new Error(`competitors upsert failed: ${error.message}`);
      if (data) allCompetitors.push(...data);
    }

    // b) For the seed domain's own competitor row, persist any product pages
    //    found in this crawl (product-like URL OR JSON had a price/title).
    const seedComp = (allCompetitors as Array<{ id: string; domain: string }>).find(
      (c) => c.domain === seedHost,
    );
    if (seedComp) {
      const productPages = pages.filter((p) => {
        const j = p.json as { title?: unknown; price?: unknown } | undefined;
        return (
          looksLikeProductUrl(p.url) ||
          (j && (typeof j.title === "string" || typeof j.price === "number"))
        );
      });
      if (productPages.length > 0) {
        const { inserted } = await persistProducts(
          userId,
          seedComp.id,
          productPages,
        );
        productsInserted += inserted;
      }
    }
  }

  return { competitors: allCompetitors, productsInserted };
}

type ProductExtract = {
  title?: string;
  price?: number;
  currency?: string;
  availability?: string;
  image_url?: string;
};

function extractFromPage(p: ScrapedPage | CrawlPage): ProductExtract {
  const j = (p.json ?? {}) as ProductExtract;
  if (j.title || typeof j.price === "number") return j;
  const md = p.markdown ?? "";
  const h1 = md.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const priceMatch = md.match(/(?:USD|EUR|GBP|BDT|৳|\$|€|£)\s*([0-9][0-9.,]*)/i);
  return {
    title: h1,
    price: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined,
    currency: priceMatch?.[0].match(/USD|EUR|GBP|BDT|৳|\$|€|£/i)?.[0],
  };
}

// 2a. Single-page product scrape (on-demand from UI).
export async function scrapeCompetitorPage(
  userId: string,
  competitorId: string,
  url: string,
) {
  const page = await firecrawlScrape(url, { extractSchema: PRODUCT_EXTRACT_SCHEMA });
  return persistProducts(userId, competitorId, [page]);
}

// 2b. Crawl an existing competitor for paginated product extraction.
export async function crawlCompetitor(
  userId: string,
  competitorId: string,
  startUrl: string,
  opts: { limit?: number; includePaths?: string[]; excludePaths?: string[] } = {},
) {
  const pages = await firecrawlCrawl(startUrl, {
    limit: opts.limit ?? 25,
    includePaths: opts.includePaths,
    excludePaths: opts.excludePaths,
    extractSchema: PRODUCT_EXTRACT_SCHEMA,
  });
  return persistProducts(userId, competitorId, pages);
}

async function persistProducts(
  userId: string,
  competitorId: string,
  pages: (ScrapedPage | CrawlPage)[],
) {
  const rows = pages
    .map((p) => {
      const e = extractFromPage(p);
      if (!e.title && typeof e.price !== "number") return null;
      return {
        user_id: userId,
        competitor_id: competitorId,
        source_url: p.url,
        title: e.title ?? null,
        price: typeof e.price === "number" ? e.price : null,
        currency: e.currency ?? null,
        availability: e.availability ?? null,
        image_url: e.image_url ?? null,
        raw: { metadata: p.metadata, json: p.json } as unknown as never,
        scraped_at: new Date().toISOString(),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return { inserted: 0 };

  const { error, count } = await supabaseAdmin
    .from("competitor_products")
    .upsert(rows, { onConflict: "user_id,source_url", count: "exact" });
  if (error) throw new Error(`competitor_products upsert failed: ${error.message}`);

  await supabaseAdmin
    .from("competitors")
    .update({ last_scraped_at: new Date().toISOString() })
    .eq("id", competitorId)
    .eq("user_id", userId);

  return { inserted: count ?? rows.length };
}
