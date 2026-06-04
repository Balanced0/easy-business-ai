// Scrape-only competitor discovery + product extraction pipeline.
// No /search, no /crawl — only Firecrawl /scrape is available in this env.
//
// Flow:
//   discoverFromSeeds(seed)
//     → scrape(seed)                          [links + products extraction]
//     → filter outbound links for ecommerce domains
//     → upsert competitors
//     → for each new competitor: scrape homepage + paginated pages
//     → upsert competitor_products
// Per-URL failures are caught and reported, never crash the run.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  firecrawlScrape,
  PRODUCT_EXTRACT_SCHEMA,
  type ScrapedPage,
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

const SOCIAL_BLOCK = [
  "google.",
  "youtube.",
  "facebook.",
  "instagram.",
  "twitter.",
  "x.com",
  "pinterest.",
  "tiktok.",
  "linkedin.",
  "whatsapp.",
  "t.me",
  "reddit.",
  "wikipedia.",
  "cloudflare.",
  "gstatic.",
  "googleapis.",
];

function isJunkHost(host: string): boolean {
  if (!host) return true;
  if (host.endsWith(".gov") || host.endsWith(".edu")) return true;
  return SOCIAL_BLOCK.some((s) => host.includes(s));
}

const ECOM_HINTS = [
  "/product",
  "/products",
  "/item",
  "/items",
  "/shop",
  "/catalog",
  "/category",
  "/collections",
  "/store",
  "/p/",
  "/dp/",
  "/sku",
  "/listing",
];

// A URL looks ecommerce if its path hits one of the hints, OR the host
// matches a known marketplace pattern.
const KNOWN_MARKETPLACES = [
  "amazon.",
  "ebay.",
  "etsy.",
  "aliexpress.",
  "alibaba.",
  "daraz.",
  "shopee.",
  "lazada.",
  "walmart.",
  "target.com",
  "bestbuy.",
  "flipkart.",
  "rakuten.",
  "mercadolibre.",
  "shopify.",
];

function looksEcommerce(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (ECOM_HINTS.some((h) => path.includes(h))) return true;
    if (KNOWN_MARKETPLACES.some((m) => u.hostname.includes(m))) return true;
    return false;
  } catch {
    return false;
  }
}

// Pagination link detection for a given base URL.
function findPaginationUrls(baseUrl: string, links: string[], max: number): string[] {
  const baseHost = hostFrom(baseUrl);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const link of links) {
    if (out.length >= max) break;
    if (hostFrom(link) !== baseHost) continue;
    if (
      /([?&](page|p|start|offset)=\d+)|(\/page\/\d+)|(\/p\/\d+\/?$)/i.test(link)
    ) {
      if (seen.has(link)) continue;
      seen.add(link);
      out.push(link);
    }
  }
  return out;
}

type DiscoveryOptions = {
  limit?: number; // max competitors to surface from a seed
  paginationLimit?: number; // pages per competitor (default 5)
};

export type ScrapeStatus = {
  url: string;
  status: "success" | "failed" | "skipped";
  message?: string;
  productsInserted?: number;
};

async function safeScrape(
  url: string,
  opts: Parameters<typeof firecrawlScrape>[1] = {},
): Promise<{ page?: ScrapedPage; error?: string }> {
  try {
    const page = await firecrawlScrape(url, opts);
    return { page };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function discoverFromSeeds(
  userId: string,
  seedUrls: string[],
  opts: DiscoveryOptions = {},
) {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const paginationLimit = Math.min(Math.max(opts.paginationLimit ?? 5, 0), 20);
  const allCompetitors: Array<Record<string, unknown> & { id: string; domain: string; url: string }> = [];
  const statuses: ScrapeStatus[] = [];
  let productsInserted = 0;

  for (const seedUrl of seedUrls) {
    const seedHost = hostFrom(seedUrl);
    if (!seedHost) {
      statuses.push({ url: seedUrl, status: "skipped", message: "invalid url" });
      continue;
    }

    // 1) Scrape the seed (links + product extraction).
    const { page: seedPage, error: seedErr } = await safeScrape(seedUrl, {
      formats: ["markdown", "links"],
      extractSchema: PRODUCT_EXTRACT_SCHEMA,
    });
    if (!seedPage) {
      statuses.push({ url: seedUrl, status: "failed", message: seedErr });
      continue;
    }
    statuses.push({ url: seedUrl, status: "success" });

    // 2) Aggregate competitor domains from outbound links.
    const byDomain = new Map<string, { url: string }>();
    byDomain.set(seedHost, { url: seedUrl });

    for (const link of seedPage.links) {
      const host = hostFrom(link);
      if (!host || isJunkHost(host)) continue;
      if (!looksEcommerce(link) && host === seedHost) continue;
      // Keep ecommerce-looking links (including same-host product pages),
      // and keep any outbound host whose URL looks ecommerce.
      if (host === seedHost) continue; // same host, only used for products below
      if (!looksEcommerce(link)) continue;
      if (!byDomain.has(host)) byDomain.set(host, { url: link });
      if (byDomain.size >= limit + 1) break; // +1 for seed itself
    }

    const competitorRows = Array.from(byDomain.entries()).map(([domain, r]) => ({
      user_id: userId,
      query: seedUrl,
      name: nameFromHost(domain),
      domain,
      url: r.url,
      description: null,
      source: "firecrawl_scrape",
    }));

    if (competitorRows.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("competitors")
        .upsert(competitorRows, { onConflict: "user_id,domain,query" })
        .select("*");
      if (error) throw new Error(`competitors upsert failed: ${error.message}`);
      if (data) allCompetitors.push(...(data as typeof allCompetitors));
    }

    // 3) Persist products from the seed scrape itself (for the seed host).
    const seedComp = allCompetitors.find((c) => c.domain === seedHost);
    if (seedComp) {
      const seedProductPages = [seedPage];
      // Also follow ecommerce-looking same-host links found on the seed page
      // as additional product page candidates (cap to paginationLimit).
      const sameHostProductLinks = seedPage.links
        .filter((l) => hostFrom(l) === seedHost && looksEcommerce(l) && l !== seedUrl)
        .slice(0, paginationLimit);
      for (const link of sameHostProductLinks) {
        const { page, error } = await safeScrape(link, {
          formats: ["markdown", "links"],
          extractSchema: PRODUCT_EXTRACT_SCHEMA,
        });
        if (page) {
          seedProductPages.push(page);
          statuses.push({ url: link, status: "success" });
        } else {
          statuses.push({ url: link, status: "failed", message: error });
        }
      }
      const { inserted } = await persistProducts(userId, seedComp.id, seedProductPages);
      productsInserted += inserted;
    }

    // 4) For each discovered competitor (other than seed), scrape homepage
    //    + a few paginated URLs.
    for (const comp of allCompetitors) {
      if (comp.domain === seedHost) continue;
      const startUrl = comp.url;
      const { page, error } = await safeScrape(startUrl, {
        formats: ["markdown", "links"],
        extractSchema: PRODUCT_EXTRACT_SCHEMA,
      });
      if (!page) {
        statuses.push({ url: startUrl, status: "failed", message: error });
        continue;
      }
      statuses.push({ url: startUrl, status: "success" });
      const pages: ScrapedPage[] = [page];
      const paginated = findPaginationUrls(startUrl, page.links, paginationLimit);
      for (const pUrl of paginated) {
        const r = await safeScrape(pUrl, {
          formats: ["markdown", "links"],
          extractSchema: PRODUCT_EXTRACT_SCHEMA,
        });
        if (r.page) {
          pages.push(r.page);
          statuses.push({ url: pUrl, status: "success" });
        } else {
          statuses.push({ url: pUrl, status: "failed", message: r.error });
        }
      }
      const { inserted } = await persistProducts(userId, comp.id, pages);
      productsInserted += inserted;
    }
  }

  return { competitors: allCompetitors, productsInserted, statuses };
}

type ProductExtract = {
  title?: string;
  price?: number;
  currency?: string;
  availability?: string;
  image_url?: string;
};

function parsePrice(raw: unknown): { price?: number; currency?: string } {
  if (typeof raw === "number") return { price: raw };
  if (typeof raw !== "string") return {};
  const m = raw.match(/(USD|EUR|GBP|BDT|৳|\$|€|£|Rs\.?|₹|INR)?\s*([0-9][0-9.,]*)/i);
  if (!m) return {};
  const num = Number(m[2].replace(/,/g, ""));
  return { price: Number.isFinite(num) ? num : undefined, currency: m[1] };
}

function extractFromPage(p: ScrapedPage): ProductExtract {
  const j = (p.json ?? {}) as {
    product_name?: string;
    title?: string;
    price?: unknown;
    currency?: string;
    availability?: string;
    image_url?: string;
  };
  if (j.product_name || j.title || j.price != null) {
    const parsed = parsePrice(j.price);
    return {
      title: j.product_name ?? j.title,
      price: parsed.price,
      currency: j.currency ?? parsed.currency,
      availability: j.availability,
      image_url: j.image_url,
    };
  }
  const md = p.markdown ?? "";
  const h1 = md.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const priceMatch = md.match(/(?:USD|EUR|GBP|BDT|৳|\$|€|£|Rs\.?|₹|INR)\s*([0-9][0-9.,]*)/i);
  return {
    title: h1,
    price: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined,
    currency: priceMatch?.[0].match(/USD|EUR|GBP|BDT|৳|\$|€|£|Rs\.?|₹|INR/i)?.[0],
  };
}

// Single-page on-demand scrape (used by /api/competitors/scrape).
export async function scrapeCompetitorPage(
  userId: string,
  competitorId: string,
  url: string,
  opts: { paginationLimit?: number } = {},
) {
  const paginationLimit = Math.min(Math.max(opts.paginationLimit ?? 5, 0), 20);
  const statuses: ScrapeStatus[] = [];

  const { page, error } = await safeScrape(url, {
    formats: ["markdown", "links"],
    extractSchema: PRODUCT_EXTRACT_SCHEMA,
  });
  if (!page) {
    statuses.push({ url, status: "failed", message: error });
    return { inserted: 0, statuses };
  }
  statuses.push({ url, status: "success" });

  const pages: ScrapedPage[] = [page];
  const paginated = findPaginationUrls(url, page.links, paginationLimit);
  for (const pUrl of paginated) {
    const r = await safeScrape(pUrl, {
      formats: ["markdown", "links"],
      extractSchema: PRODUCT_EXTRACT_SCHEMA,
    });
    if (r.page) {
      pages.push(r.page);
      statuses.push({ url: pUrl, status: "success" });
    } else {
      statuses.push({ url: pUrl, status: "failed", message: r.error });
    }
  }

  const { inserted } = await persistProducts(userId, competitorId, pages);
  return { inserted, statuses };
}

async function persistProducts(
  userId: string,
  competitorId: string,
  pages: ScrapedPage[],
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
