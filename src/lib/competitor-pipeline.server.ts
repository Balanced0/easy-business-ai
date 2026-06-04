// Modular competitor discovery + product extraction pipeline.
// Designed to be called from API routes today and a cron scheduler later.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  firecrawlSearch,
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
    return url;
  }
}

function nameFromHost(host: string): string {
  const base = host.split(".")[0] ?? host;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// 1. Discover competitors from a product/category query via Firecrawl /search.
export async function discoverCompetitors(
  userId: string,
  query: string,
  limit = 10,
) {
  const q = `${query} buy online store`;
  const results = await firecrawlSearch(q, { limit });

  // One competitor per unique domain.
  const byDomain = new Map<string, { url: string; title?: string; description?: string }>();
  for (const r of results) {
    if (!r.url) continue;
    const host = hostFrom(r.url);
    if (!host || host.includes("google.") || host.includes("youtube.")) continue;
    if (!byDomain.has(host)) {
      byDomain.set(host, { url: r.url, title: r.title, description: r.description });
    }
  }

  const rows = Array.from(byDomain.entries()).map(([domain, r]) => ({
    user_id: userId,
    query,
    name: r.title?.split(/[|\-–]/)[0]?.trim() || nameFromHost(domain),
    domain,
    url: r.url,
    description: r.description ?? null,
    source: "firecrawl_search",
  }));

  if (rows.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("competitors")
    .upsert(rows, { onConflict: "user_id,domain,query" })
    .select("*");
  if (error) throw new Error(`competitors upsert failed: ${error.message}`);
  return data ?? [];
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

  // Markdown fallback: title from first H1, price by regex.
  const md = p.markdown ?? "";
  const h1 = md.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const priceMatch = md.match(/(?:USD|EUR|GBP|BDT|৳|\$|€|£)\s*([0-9][0-9.,]*)/i);
  return {
    title: h1,
    price: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined,
    currency: priceMatch?.[0].match(/USD|EUR|GBP|BDT|৳|\$|€|£/i)?.[0],
  };
}

// 2a. Single-page product scrape.
export async function scrapeCompetitorPage(
  userId: string,
  competitorId: string,
  url: string,
) {
  const page = await firecrawlScrape(url, { extractSchema: PRODUCT_EXTRACT_SCHEMA });
  return persistProducts(userId, competitorId, [page]);
}

// 2b. Multi-page crawl (paginated product extraction).
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
