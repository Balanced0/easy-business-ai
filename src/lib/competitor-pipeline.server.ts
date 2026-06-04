// Scrape-only competitor discovery + product extraction pipeline.
// Handles JS-rendered ecommerce sites by using Firecrawl waitFor + actions
// and falling back to markdown URL parsing when the links array is empty.

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
  "google.", "youtube.", "facebook.", "instagram.", "twitter.", "x.com",
  "pinterest.", "tiktok.", "linkedin.", "whatsapp.", "t.me", "reddit.",
  "wikipedia.", "cloudflare.", "gstatic.", "googleapis.",
];

function isJunkHost(host: string): boolean {
  if (!host) return true;
  if (host.endsWith(".gov") || host.endsWith(".edu")) return true;
  return SOCIAL_BLOCK.some((s) => host.includes(s));
}

const PRODUCT_PATH_HINTS = [
  "/products/", "/product/", "/-i", "/p-", "/item", "/items",
  "/catalog", "/shop", "/store", "/collections/", "/dp/", "/sku", "/listing",
];

const KNOWN_MARKETPLACES = [
  "amazon.", "ebay.", "etsy.", "aliexpress.", "alibaba.", "daraz.",
  "shopee.", "lazada.", "walmart.", "target.com", "bestbuy.", "flipkart.",
  "rakuten.", "mercadolibre.", "shopify.",
];

function looksProductUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    return PRODUCT_PATH_HINTS.some((h) => path.includes(h));
  } catch {
    return false;
  }
}

function looksEcommerceHost(host: string): boolean {
  return KNOWN_MARKETPLACES.some((m) => host.includes(m));
}

function extractUrlsFromMarkdown(md: string): string[] {
  const out = new Set<string>();
  const re = /\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) out.add(m[1]);
  const bare = /(?<![("])(https?:\/\/[^\s)<>"']+)/g;
  while ((m = bare.exec(md)) !== null) out.add(m[1]);
  return Array.from(out);
}

function findPaginationUrls(baseUrl: string, links: string[], max: number): string[] {
  const baseHost = hostFrom(baseUrl);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const link of links) {
    if (out.length >= max) break;
    if (hostFrom(link) !== baseHost) continue;
    if (/([?&](page|p|start|offset)=\d+)|(\/page\/\d+)|(\/p\/\d+\/?$)/i.test(link)) {
      if (seen.has(link)) continue;
      seen.add(link);
      out.push(link);
    }
  }
  return out;
}

type DiscoveryOptions = {
  limit?: number;
  paginationLimit?: number;
  internalProductLimit?: number;
};

export type ScrapeStatus = {
  url: string;
  status: "success" | "failed" | "skipped";
  message?: string;
};

export type DebugInfo = {
  seedUrl: string;
  rawLinkCount: number;
  markdownFallbackUsed: boolean;
  internalProductLinks: number;
  externalCompetitorDomains: number;
  firstLinks: string[];
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
  const internalProductLimit = Math.min(Math.max(opts.internalProductLimit ?? 10, 0), 50);
  const allCompetitors: Array<Record<string, unknown> & { id: string; domain: string; url: string }> = [];
  const statuses: ScrapeStatus[] = [];
  const debug: DebugInfo[] = [];
  let productsInserted = 0;

  for (const seedUrl of seedUrls) {
    const seedHost = hostFrom(seedUrl);
    if (!seedHost) {
      statuses.push({ url: seedUrl, status: "skipped", message: "invalid url" });
      continue;
    }

    // 1) Scrape the seed with JS render wait.
    const { page: seedPage, error: seedErr } = await safeScrape(seedUrl, {
      formats: ["markdown", "links", "html"],
      extractSchema: PRODUCT_EXTRACT_SCHEMA,
      waitFor: 3000,
      actions: [{ type: "wait", milliseconds: 3000 }],
    });
    if (!seedPage) {
      statuses.push({ url: seedUrl, status: "failed", message: seedErr });
      debug.push({
        seedUrl, rawLinkCount: 0, markdownFallbackUsed: false,
        internalProductLinks: 0, externalCompetitorDomains: 0, firstLinks: [],
      });
      continue;
    }
    statuses.push({ url: seedUrl, status: "success" });

    // 2) Build link pool: use Firecrawl links; if empty, fall back to markdown parsing.
    let linkPool = seedPage.links.slice();
    let markdownFallbackUsed = false;
    if (linkPool.length === 0 && seedPage.markdown) {
      linkPool = extractUrlsFromMarkdown(seedPage.markdown);
      markdownFallbackUsed = true;
    }
    const rawLinkCount = linkPool.length;

    // 3) Partition: internal product URLs vs external competitor domains.
    const internalProductUrls: string[] = [];
    const seenInternal = new Set<string>();
    const externalByDomain = new Map<string, { url: string }>();

    for (const link of linkPool) {
      const host = hostFrom(link);
      if (!host || isJunkHost(host)) continue;
      if (host === seedHost) {
        if (looksProductUrl(link) && !seenInternal.has(link) && link !== seedUrl) {
          seenInternal.add(link);
          internalProductUrls.push(link);
        }
      } else {
        if (!looksProductUrl(link) && !looksEcommerceHost(host)) continue;
        if (!externalByDomain.has(host)) externalByDomain.set(host, { url: link });
        if (externalByDomain.size >= limit) {
          /* keep collecting? cap below when building rows */
        }
      }
    }

    debug.push({
      seedUrl,
      rawLinkCount,
      markdownFallbackUsed,
      internalProductLinks: internalProductUrls.length,
      externalCompetitorDomains: externalByDomain.size,
      firstLinks: linkPool.slice(0, 5),
    });

    // 4) Upsert seed competitor + external competitor rows.
    const competitorRows = [
      {
        user_id: userId,
        query: seedUrl,
        name: nameFromHost(seedHost),
        domain: seedHost,
        url: seedUrl,
        description: null,
        source: "firecrawl_scrape",
      },
      ...Array.from(externalByDomain.entries())
        .slice(0, limit)
        .map(([domain, r]) => ({
          user_id: userId,
          query: seedUrl,
          name: nameFromHost(domain),
          domain,
          url: r.url,
          description: null,
          source: "firecrawl_scrape",
        })),
    ];

    const { data, error } = await supabaseAdmin
      .from("competitors")
      .upsert(competitorRows, { onConflict: "user_id,domain,query" })
      .select("*");
    if (error) throw new Error(`competitors upsert failed: ${error.message}`);
    if (data) allCompetitors.push(...(data as typeof allCompetitors));

    // 5) Scrape top N internal product URLs (first-party products for seed).
    const seedComp = allCompetitors.find((c) => c.domain === seedHost);
    if (seedComp) {
      const productPages: ScrapedPage[] = [seedPage];
      for (const link of internalProductUrls.slice(0, internalProductLimit)) {
        const { page, error: e } = await safeScrape(link, {
          formats: ["markdown", "links", "html"],
          extractSchema: PRODUCT_EXTRACT_SCHEMA,
          waitFor: 2000,
        });
        if (page) {
          productPages.push(page);
          statuses.push({ url: link, status: "success" });
        } else {
          statuses.push({ url: link, status: "failed", message: e });
        }
      }
      const { inserted } = await persistProducts(userId, seedComp.id, productPages);
      productsInserted += inserted;
    }

    // 6) For each external competitor, scrape its landing URL + a bit of pagination.
    for (const comp of allCompetitors) {
      if (comp.domain === seedHost) continue;
      const startUrl = comp.url;
      const { page, error: e } = await safeScrape(startUrl, {
        formats: ["markdown", "links", "html"],
        extractSchema: PRODUCT_EXTRACT_SCHEMA,
        waitFor: 2000,
      });
      if (!page) {
        statuses.push({ url: startUrl, status: "failed", message: e });
        continue;
      }
      statuses.push({ url: startUrl, status: "success" });
      const pages: ScrapedPage[] = [page];
      const paginated = findPaginationUrls(startUrl, page.links, paginationLimit);
      for (const pUrl of paginated) {
        const r = await safeScrape(pUrl, {
          formats: ["markdown", "links"],
          extractSchema: PRODUCT_EXTRACT_SCHEMA,
          waitFor: 2000,
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

  return { competitors: allCompetitors, productsInserted, statuses, debug };
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

export async function scrapeCompetitorPage(
  userId: string,
  competitorId: string,
  url: string,
  opts: { paginationLimit?: number } = {},
) {
  const paginationLimit = Math.min(Math.max(opts.paginationLimit ?? 5, 0), 20);
  const statuses: ScrapeStatus[] = [];

  const { page, error } = await safeScrape(url, {
    formats: ["markdown", "links", "html"],
    extractSchema: PRODUCT_EXTRACT_SCHEMA,
    waitFor: 3000,
    actions: [{ type: "wait", milliseconds: 3000 }],
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
      waitFor: 2000,
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
