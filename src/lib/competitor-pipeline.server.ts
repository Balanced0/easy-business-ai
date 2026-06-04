// Query-driven competitor discovery using Firecrawl /scrape ONLY.
// Flow:
//   1. User submits a product query (e.g. "wireless earbuds")
//   2. Generate seed search-style URLs against known ecommerce templates
//   3. Scrape each seed, extract product links + titles + prices
//   4. Group products by domain → infer competitors
//   5. Expand: for each new competitor, scrape one more page (depth 2)
//   6. Persist competitors + products, return confidence flags
//
// Hard limits: max 20 domains and max 50 products per run.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  firecrawlScrape,
  PRODUCT_EXTRACT_SCHEMA,
  type ScrapedPage,
} from "./firecrawl.server";

// ───────────────────────── Seed templates ─────────────────────────

// Generic ecommerce search-style URL templates. {q} is the URL-encoded query.
// These are reusable across queries and require no external search API.
const SEED_TEMPLATES = [
  "https://www.amazon.com/s?k={q}",
  "https://www.ebay.com/sch/i.html?_nkw={q}",
  "https://www.walmart.com/search?q={q}",
  "https://www.etsy.com/search?q={q}",
  "https://www.aliexpress.com/wholesale?SearchText={q}",
  "https://www.target.com/s?searchTerm={q}",
  "https://www.bestbuy.com/site/searchpage.jsp?st={q}",
  "https://www.daraz.com.bd/catalog/?q={q}",
  "https://www.flipkart.com/search?q={q}",
  "https://shopee.com/search?keyword={q}",
];

// Fallback list of known ecommerce homepages, used when seed scrapes return
// nothing useful (e.g. all blocked / JS-walled).
const FALLBACK_DOMAINS = [
  "https://www.amazon.com",
  "https://www.ebay.com",
  "https://www.walmart.com",
  "https://www.etsy.com",
];

function buildSeedsForQuery(query: string): string[] {
  const q = encodeURIComponent(query.trim());
  return SEED_TEMPLATES.map((t) => t.replace("{q}", q));
}

// ───────────────────────── Helpers ─────────────────────────

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
  "wikipedia.", "cloudflare.", "gstatic.", "googleapis.", "doubleclick.",
  "bing.", "yahoo.", "duckduckgo.",
];

function isJunkHost(host: string): boolean {
  if (!host) return true;
  if (host.endsWith(".gov") || host.endsWith(".edu")) return true;
  return SOCIAL_BLOCK.some((s) => host.includes(s));
}

const PRODUCT_PATH_HINTS = [
  "/products/", "/product/", "/-i", "/p-", "/item", "/items",
  "/catalog", "/shop", "/store", "/collections/", "/dp/", "/sku",
  "/listing", "/itm/", "/ip/",
];

function looksProductUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (path === "/" || path.length < 3) return false;
    return PRODUCT_PATH_HINTS.some((h) => path.includes(h));
  } catch {
    return false;
  }
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

// ───────────────────────── Types ─────────────────────────

export type ScrapeStatus = {
  url: string;
  status: "success" | "failed" | "skipped";
  message?: string;
};

export type DebugInfo = {
  seedUrl: string;
  rawLinkCount: number;
  markdownFallbackUsed: boolean;
  productLinksFound: number;
  uniqueDomains: number;
  firstLinks: string[];
};

type DiscoveredProduct = {
  domain: string;
  source_url: string;
  title?: string;
  price?: number;
  currency?: string;
  image_url?: string;
};

// ───────────────────────── Product extraction ─────────────────────────

function parsePrice(raw: unknown): { price?: number; currency?: string } {
  if (typeof raw === "number") return { price: raw };
  if (typeof raw !== "string") return {};
  const m = raw.match(/(USD|EUR|GBP|BDT|৳|\$|€|£|Rs\.?|₹|INR)?\s*([0-9][0-9.,]*)/i);
  if (!m) return {};
  const num = Number(m[2].replace(/,/g, ""));
  return { price: Number.isFinite(num) ? num : undefined, currency: m[1] };
}

function titleForLink(link: string, md: string): string | undefined {
  try {
    // Markdown link: [text](url)
    const safe = link.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\[([^\\]]{3,200})\\]\\(${safe}\\)`);
    const m = md.match(re);
    if (m) return m[1].replace(/\s+/g, " ").trim();
  } catch {
    /* noop */
  }
  return undefined;
}

function extractProductsFromListPage(
  page: ScrapedPage,
  seedHost: string,
): DiscoveredProduct[] {
  let pool = page.links.slice();
  if (pool.length === 0 && page.markdown) {
    pool = extractUrlsFromMarkdown(page.markdown);
  }
  const out: DiscoveredProduct[] = [];
  const seen = new Set<string>();
  const md = page.markdown ?? "";
  for (const link of pool) {
    const host = hostFrom(link);
    if (!host || isJunkHost(host)) continue;
    if (!looksProductUrl(link)) continue;
    if (seen.has(link)) continue;
    seen.add(link);
    // Try to grab a nearby price from the markdown using the anchor text region.
    const title = titleForLink(link, md);
    out.push({
      domain: host || seedHost,
      source_url: link,
      title,
    });
  }
  return out;
}

function extractFromProductPage(p: ScrapedPage): {
  title?: string;
  price?: number;
  currency?: string;
  image_url?: string;
} {
  const j = (p.json ?? {}) as {
    product_name?: string;
    title?: string;
    price?: unknown;
    currency?: string;
    image_url?: string;
  };
  if (j.product_name || j.title || j.price != null) {
    const parsed = parsePrice(j.price);
    return {
      title: j.product_name ?? j.title,
      price: parsed.price,
      currency: j.currency ?? parsed.currency,
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

// ───────────────────────── Main pipeline ─────────────────────────

type DiscoveryOptions = {
  maxDomains?: number;
  maxProducts?: number;
};

export async function discoverFromQuery(
  userId: string,
  query: string,
  opts: DiscoveryOptions = {},
) {
  const maxDomains = Math.min(Math.max(opts.maxDomains ?? 20, 1), 50);
  const maxProducts = Math.min(Math.max(opts.maxProducts ?? 50, 1), 200);

  const seeds = buildSeedsForQuery(query);
  const statuses: ScrapeStatus[] = [];
  const debug: DebugInfo[] = [];
  const productsByDomain = new Map<string, DiscoveredProduct[]>();

  const addProduct = (p: DiscoveredProduct) => {
    if (totalProducts() >= maxProducts) return;
    if (productsByDomain.size >= maxDomains && !productsByDomain.has(p.domain)) return;
    const list = productsByDomain.get(p.domain) ?? [];
    if (list.some((x) => x.source_url === p.source_url)) return;
    list.push(p);
    productsByDomain.set(p.domain, list);
  };
  const totalProducts = () =>
    Array.from(productsByDomain.values()).reduce((s, l) => s + l.length, 0);

  // ── Step 1+2: Scrape seed search pages ──────────────────────────
  for (const seedUrl of seeds) {
    if (totalProducts() >= maxProducts) break;
    const seedHost = hostFrom(seedUrl);
    const { page, error } = await safeScrape(seedUrl, {
      formats: ["markdown", "links"],
      waitFor: 3000,
      actions: [{ type: "wait", milliseconds: 3000 }],
    });
    if (!page) {
      statuses.push({ url: seedUrl, status: "failed", message: error });
      debug.push({
        seedUrl, rawLinkCount: 0, markdownFallbackUsed: false,
        productLinksFound: 0, uniqueDomains: 0, firstLinks: [],
      });
      continue;
    }
    statuses.push({ url: seedUrl, status: "success" });

    const products = extractProductsFromListPage(page, seedHost);
    const rawLinkCount = page.links.length || extractUrlsFromMarkdown(page.markdown ?? "").length;
    const uniqueDomains = new Set(products.map((p) => p.domain)).size;
    debug.push({
      seedUrl,
      rawLinkCount,
      markdownFallbackUsed: page.links.length === 0,
      productLinksFound: products.length,
      uniqueDomains,
      firstLinks: (page.links.length ? page.links : extractUrlsFromMarkdown(page.markdown ?? ""))
        .slice(0, 5),
    });
    for (const p of products) addProduct(p);
  }

  // ── Fallback: if nothing yet, hit a few known marketplace homepages
  if (totalProducts() === 0) {
    for (const url of FALLBACK_DOMAINS) {
      const { page } = await safeScrape(url, {
        formats: ["markdown", "links"],
        waitFor: 2000,
      });
      if (!page) continue;
      const seedHost = hostFrom(url);
      for (const p of extractProductsFromListPage(page, seedHost)) addProduct(p);
      if (totalProducts() > 0) break;
    }
  }

  // ── Step 4: Expansion — scrape one extra page per new competitor
  // (depth 2). Pick the first product URL we found per domain as the
  // anchor and scrape it to enrich with title/price/image.
  for (const [domain, list] of productsByDomain) {
    if (totalProducts() >= maxProducts) break;
    const anchor = list[0];
    if (!anchor) continue;
    const { page } = await safeScrape(anchor.source_url, {
      formats: ["markdown", "links"],
      extractSchema: PRODUCT_EXTRACT_SCHEMA,
      waitFor: 2000,
    });
    if (!page) {
      statuses.push({ url: anchor.source_url, status: "failed" });
      continue;
    }
    statuses.push({ url: anchor.source_url, status: "success" });
    const extracted = extractFromProductPage(page);
    anchor.title = anchor.title ?? extracted.title;
    anchor.price = extracted.price;
    anchor.currency = extracted.currency;
    anchor.image_url = extracted.image_url;

    // Pick up a couple more product URLs from the same domain on this page.
    const more = extractProductsFromListPage(page, domain).filter(
      (p) => p.domain === domain,
    );
    for (const m of more.slice(0, 3)) addProduct(m);
  }

  // ── Step 6: Persist competitors + products
  const competitorRows = Array.from(productsByDomain.keys()).map((domain) => ({
    user_id: userId,
    query,
    name: nameFromHost(domain),
    domain,
    url: `https://${domain}`,
    description: null,
    source: "firecrawl_scrape_query",
  }));

  let competitors: Array<Record<string, unknown> & { id: string; domain: string }> = [];
  if (competitorRows.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("competitors")
      .upsert(competitorRows, { onConflict: "user_id,domain,query" })
      .select("*");
    if (error) throw new Error(`competitors upsert failed: ${error.message}`);
    competitors = (data ?? []) as typeof competitors;
  }

  let productsInserted = 0;
  for (const [domain, list] of productsByDomain) {
    const comp = competitors.find((c) => c.domain === domain);
    if (!comp) continue;
    const rows = list
      .filter((p) => p.title || typeof p.price === "number")
      .map((p) => ({
        user_id: userId,
        competitor_id: comp.id,
        source_url: p.source_url,
        title: p.title ?? null,
        price: typeof p.price === "number" ? p.price : null,
        currency: p.currency ?? null,
        availability: null,
        image_url: p.image_url ?? null,
        raw: { query, domain } as unknown as never,
        scraped_at: new Date().toISOString(),
      }));
    if (rows.length === 0) continue;
    const { error, count } = await supabaseAdmin
      .from("competitor_products")
      .upsert(rows, { onConflict: "user_id,source_url", count: "exact" });
    if (error) throw new Error(`competitor_products upsert failed: ${error.message}`);
    productsInserted += count ?? rows.length;
    await supabaseAdmin
      .from("competitors")
      .update({ last_scraped_at: new Date().toISOString() })
      .eq("id", comp.id)
      .eq("user_id", userId);
  }

  // Confidence flag per competitor based on product volume.
  const competitorsWithConfidence = competitors.map((c) => {
    const n = (productsByDomain.get(c.domain) ?? []).length;
    const confidence = n >= 5 ? "high" : n >= 2 ? "medium" : "low";
    return { ...c, product_count: n, confidence };
  });

  return {
    competitors: competitorsWithConfidence,
    productsInserted,
    statuses,
    debug,
    totals: { domains: productsByDomain.size, products: totalProducts() },
  };
}

// ───────────────────────── Single-competitor rescrape ─────────────────────────
// Used by POST /api/competitors/scrape to refresh products for one competitor.

export async function scrapeCompetitorPage(
  userId: string,
  competitorId: string,
  url: string,
) {
  const statuses: ScrapeStatus[] = [];
  const seedHost = hostFrom(url);

  const { page, error } = await safeScrape(url, {
    formats: ["markdown", "links"],
    extractSchema: PRODUCT_EXTRACT_SCHEMA,
    waitFor: 3000,
    actions: [{ type: "wait", milliseconds: 3000 }],
  });
  if (!page) {
    statuses.push({ url, status: "failed", message: error });
    return { inserted: 0, statuses };
  }
  statuses.push({ url, status: "success" });

  const listed = extractProductsFromListPage(page, seedHost);
  const rows = listed.slice(0, 25).map((p) => ({
    user_id: userId,
    competitor_id: competitorId,
    source_url: p.source_url,
    title: p.title ?? null,
    price: null,
    currency: null,
    availability: null,
    image_url: null,
    raw: { rescrape: true } as unknown as never,
    scraped_at: new Date().toISOString(),
  }));

  // Also try the page itself as a product page.
  const single = extractFromProductPage(page);
  if (single.title || typeof single.price === "number") {
    rows.push({
      user_id: userId,
      competitor_id: competitorId,
      source_url: url,
      title: single.title ?? null,
      price: typeof single.price === "number" ? single.price : null,
      currency: single.currency ?? null,
      availability: null,
      image_url: single.image_url ?? null,
      raw: { rescrape: true } as unknown as never,
      scraped_at: new Date().toISOString(),
    });
  }

  if (rows.length === 0) return { inserted: 0, statuses };

  const { error: upErr, count } = await supabaseAdmin
    .from("competitor_products")
    .upsert(rows, { onConflict: "user_id,source_url", count: "exact" });
  if (upErr) throw new Error(`competitor_products upsert failed: ${upErr.message}`);

  await supabaseAdmin
    .from("competitors")
    .update({ last_scraped_at: new Date().toISOString() })
    .eq("id", competitorId)
    .eq("user_id", userId);

  return { inserted: count ?? rows.length, statuses };
}
