// Query-driven competitor discovery using Firecrawl /scrape ONLY.
//
// IMPORTANT: Firecrawl /scrape is treated as a RAW TEXT extractor. We do NOT
// rely on structured JSON, /product URL conventions, or strict schemas. The
// pipeline extracts best-effort signals (product-like strings + price-like
// patterns) from the returned markdown and turns them into competitor +
// product rows. A seed that returns any markdown MUST produce a competitor
// and at least one product entry — even low-confidence data is stored.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { firecrawlScrape, type ScrapedPage } from "./firecrawl.server";

// ───────────────────────── Category mapping + seed lists ─────────────────────────

type Category =
  | "audio" | "mobile" | "computers" | "electronics"
  | "footwear" | "fashion" | "beauty" | "home"
  | "toys" | "sports" | "grocery" | "general";

const CATEGORY_KEYWORDS: Array<{ cat: Category; words: string[] }> = [
  { cat: "audio", words: ["earbud", "earphone", "headphone", "headset", "speaker", "airpod", "soundbar"] },
  { cat: "mobile", words: ["phone", "smartphone", "iphone", "android", "mobile", "tablet", "ipad"] },
  { cat: "computers", words: ["laptop", "notebook", "macbook", "desktop", "monitor", "keyboard", "mouse", "ssd", "gpu", "ram"] },
  { cat: "footwear", words: ["shoe", "sneaker", "boot", "sandal", "heel", "loafer", "trainer"] },
  { cat: "fashion", words: ["shirt", "tshirt", "t-shirt", "jeans", "dress", "jacket", "coat", "hoodie", "watch", "bag", "wallet", "fashion"] },
  { cat: "beauty", words: ["lipstick", "makeup", "cosmetic", "skincare", "perfume", "shampoo", "cream", "serum"] },
  { cat: "home", words: ["sofa", "chair", "table", "lamp", "kitchen", "cookware", "bedding", "pillow", "mattress", "furniture"] },
  { cat: "toys", words: ["toy", "lego", "doll", "puzzle", "board game"] },
  { cat: "sports", words: ["bike", "bicycle", "yoga", "fitness", "dumbbell", "treadmill", "football", "cricket", "tennis"] },
  { cat: "grocery", words: ["snack", "tea", "coffee", "spice", "rice", "oil", "grocery"] },
  { cat: "electronics", words: ["camera", "drone", "tv", "console", "playstation", "xbox", "gadget", "electronic"] },
];

const CATEGORY_SEEDS: Record<Category, string[]> = {
  audio: ["https://www.daraz.com.bd/catalog/?q={q}", "https://www.aliexpress.com/w/wholesale-{q}.html", "https://www.ebay.com/sch/i.html?_nkw={q}", "https://www.amazon.com/s?k={q}"],
  mobile: ["https://www.daraz.com.bd/catalog/?q={q}", "https://www.aliexpress.com/w/wholesale-{q}.html", "https://www.ebay.com/sch/i.html?_nkw={q}", "https://www.amazon.com/s?k={q}"],
  computers: ["https://www.daraz.com.bd/catalog/?q={q}", "https://www.aliexpress.com/w/wholesale-{q}.html", "https://www.ebay.com/sch/i.html?_nkw={q}", "https://www.amazon.com/s?k={q}", "https://www.bestbuy.com/site/searchpage.jsp?st={q}"],
  electronics: ["https://www.daraz.com.bd/catalog/?q={q}", "https://www.aliexpress.com/w/wholesale-{q}.html", "https://www.ebay.com/sch/i.html?_nkw={q}", "https://www.amazon.com/s?k={q}"],
  footwear: ["https://www.daraz.com.bd/catalog/?q={q}", "https://www.aliexpress.com/w/wholesale-{q}.html", "https://www.ebay.com/sch/i.html?_nkw={q}", "https://www.amazon.com/s?k={q}", "https://www.zappos.com/search?term={q}"],
  fashion: ["https://www.daraz.com.bd/catalog/?q={q}", "https://www.aliexpress.com/w/wholesale-{q}.html", "https://www.ebay.com/sch/i.html?_nkw={q}", "https://www.amazon.com/s?k={q}", "https://www.etsy.com/search?q={q}"],
  beauty: ["https://www.daraz.com.bd/catalog/?q={q}", "https://www.aliexpress.com/w/wholesale-{q}.html", "https://www.amazon.com/s?k={q}", "https://www.sephora.com/search?keyword={q}"],
  home: ["https://www.daraz.com.bd/catalog/?q={q}", "https://www.aliexpress.com/w/wholesale-{q}.html", "https://www.amazon.com/s?k={q}", "https://www.wayfair.com/keyword.php?keyword={q}"],
  toys: ["https://www.daraz.com.bd/catalog/?q={q}", "https://www.aliexpress.com/w/wholesale-{q}.html", "https://www.amazon.com/s?k={q}", "https://www.ebay.com/sch/i.html?_nkw={q}"],
  sports: ["https://www.daraz.com.bd/catalog/?q={q}", "https://www.aliexpress.com/w/wholesale-{q}.html", "https://www.amazon.com/s?k={q}", "https://www.ebay.com/sch/i.html?_nkw={q}"],
  grocery: ["https://www.amazon.com/s?k={q}", "https://www.walmart.com/search?q={q}", "https://www.daraz.com.bd/catalog/?q={q}"],
  general: ["https://www.amazon.com/s?k={q}", "https://www.ebay.com/sch/i.html?_nkw={q}", "https://www.aliexpress.com/w/wholesale-{q}.html", "https://www.daraz.com.bd/catalog/?q={q}"],
};

function categorize(query: string): Category {
  const q = query.toLowerCase();
  for (const { cat, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => q.includes(w))) return cat;
  }
  return "general";
}

function buildSeedsForQuery(query: string): { category: Category; seeds: string[] } {
  const trimmed = query.trim();
  const enc = encodeURIComponent(trimmed);
  const category = categorize(trimmed);
  const seeds = CATEGORY_SEEDS[category].map((t) => t.replace(/\{q\}/g, enc));
  return { category, seeds };
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
  domain: string;
  firecrawlStatus: "success" | "failed" | "empty";
  errorMessage?: string;
  competitorStatus?: "structured_data" | "unstructured_data" | "empty_response" | "failed";
  markdownLength: number;
  priceMatches: number;
  productStrings: number;
  rawLinkCount: number;
  sampleTitles: string[];
  markdownPreview: string;
  productsExtracted: number;
  note?: string;
};

type DiscoveredProduct = {
  domain: string;
  source_url: string;
  title?: string;
  price?: number;
  currency?: string;
  rawSnippet?: string;
  status?: "structured_data" | "unstructured_data";
};

// ───────────────────────── Raw signal extraction ─────────────────────────
// Treat markdown as noisy text. Extract:
//   - product-like strings (markdown link texts, capitalized phrases)
//   - price-like patterns (currency symbol + number)
// Pair prices with nearest title by character offset.

const PRICE_RE =
  /(USD|EUR|GBP|BDT|INR|Rs\.?|৳|\$|€|£|₹)\s?([0-9]{1,3}(?:[,.\s][0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g;

type PriceHit = { index: number; raw: string; price: number; currency: string };
type TitleHit = { index: number; text: string; url?: string };

function findPrices(md: string): PriceHit[] {
  const out: PriceHit[] = [];
  PRICE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PRICE_RE.exec(md)) !== null) {
    const num = Number(m[2].replace(/[,\s]/g, ""));
    if (!Number.isFinite(num) || num <= 0) continue;
    out.push({ index: m.index, raw: m[0], price: num, currency: m[1] });
  }
  return out;
}

function findProductStrings(md: string): TitleHit[] {
  const out: TitleHit[] = [];
  // 1) Markdown links [text](url) — text is usually a product title.
  const linkRe = /\[([^\]\n]{4,200})\]\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(md)) !== null) {
    const text = m[1].replace(/\s+/g, " ").trim();
    if (text.length < 4) continue;
    if (/^(home|next|prev|more|see all|shop|click)$/i.test(text)) continue;
    out.push({ index: m.index, text, url: m[2] });
  }
  // 2) Capitalized phrases (3+ words) — fallback when no markdown links.
  if (out.length === 0) {
    const phraseRe =
      /(?:^|\n|\.\s+)((?:[A-Z][A-Za-z0-9'’&+./-]{1,40}\s+){2,7}[A-Z][A-Za-z0-9'’&+./-]{1,40})/g;
    while ((m = phraseRe.exec(md)) !== null) {
      const text = m[1].replace(/\s+/g, " ").trim();
      if (text.length < 8 || text.length > 160) continue;
      out.push({ index: m.index + (m[0].length - m[1].length), text });
    }
  }
  // De-duplicate by text.
  const seen = new Set<string>();
  return out.filter((h) => {
    const k = h.text.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function pairPrices(titles: TitleHit[], prices: PriceHit[]): TitleHit[] {
  // For each title, find nearest price within 500 chars; attach to title.
  return titles.map((t) => {
    let best: PriceHit | undefined;
    let bestDist = Infinity;
    for (const p of prices) {
      const d = Math.abs(p.index - t.index);
      if (d < bestDist && d < 500) {
        bestDist = d;
        best = p;
      }
    }
    return best
      ? ({ ...t, price: best.price, currency: best.currency } as TitleHit & {
          price?: number;
          currency?: string;
        })
      : t;
  });
}

function extractSignals(
  page: ScrapedPage,
  seedUrl: string,
  seedHost: string,
): { products: DiscoveredProduct[]; debug: Omit<DebugInfo, "seedUrl" | "domain"> } {
  const md = page.markdown ?? "";
  const prices = findPrices(md);
  const titles = findProductStrings(md);
  const paired = pairPrices(titles, prices) as Array<
    TitleHit & { price?: number; currency?: string }
  >;

  const products: DiscoveredProduct[] = [];
  const seen = new Set<string>();

  for (const h of paired.slice(0, 30)) {
    const url = h.url ?? `${seedUrl}#t-${h.index}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const host = h.url ? hostFrom(h.url) || seedHost : seedHost;
    products.push({
      domain: host,
      source_url: url,
      title: h.text,
      price: h.price,
      currency: h.currency,
    });
  }

  // If we have prices but no titles, still emit price-only entries.
  if (products.length === 0 && prices.length > 0) {
    for (const [i, p] of prices.slice(0, 10).entries()) {
      products.push({
        domain: seedHost,
        source_url: `${seedUrl}#p-${i}`,
        title: `${nameFromHost(seedHost)} listing ${i + 1}`,
        price: p.price,
        currency: p.currency,
      });
    }
  }

  // Guarantee: if markdown exists, emit at least one placeholder product
  // for the seed domain so the dataset is never empty.
  if (products.length === 0 && md.length > 0) {
    products.push({
      domain: seedHost,
      source_url: `${seedUrl}#raw`,
      title: `${nameFromHost(seedHost)} search results`,
      rawSnippet: md.slice(0, 500),
      status: "unstructured_data",
    });
  }

  const normalizedProducts = products.map((p) => ({
    ...p,
    rawSnippet: p.rawSnippet ?? md.slice(0, 500),
    status: p.status ?? "structured_data",
  }));

  return {
    products: normalizedProducts,
    debug: {
      firecrawlStatus: md.length > 0 ? "success" as const : "empty" as const,
      competitorStatus: md.length === 0
        ? "empty_response"
        : normalizedProducts.some((p) => p.status === "unstructured_data")
          ? "unstructured_data"
          : "structured_data",
      markdownLength: md.length,
      priceMatches: prices.length,
      productStrings: titles.length,
      rawLinkCount: page.links.length,
      sampleTitles: titles.slice(0, 5).map((t) => t.text),
      markdownPreview: md.slice(0, 500),
      productsExtracted: normalizedProducts.length,
      note: md.length === 0
          ? "Scrape returned empty response"
          : normalizedProducts.some((p) => p.status === "unstructured_data")
            ? "No structured data found, showing raw scrape output"
          : undefined,
    },
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

  const { category, seeds } = buildSeedsForQuery(query);
  const statuses: ScrapeStatus[] = [];
  const debug: DebugInfo[] = [];
  const productsByDomain = new Map<string, DiscoveredProduct[]>();

  const totalProducts = () =>
    Array.from(productsByDomain.values()).reduce((s, l) => s + l.length, 0);

  const addProduct = (p: DiscoveredProduct) => {
    if (totalProducts() >= maxProducts) return;
    if (productsByDomain.size >= maxDomains && !productsByDomain.has(p.domain)) return;
    const list = productsByDomain.get(p.domain) ?? [];
    if (list.some((x) => x.source_url === p.source_url)) return;
    list.push(p);
    productsByDomain.set(p.domain, list);
  };

  const ensureDomain = (domain: string) => {
    if (!domain) return;
    if (productsByDomain.has(domain)) return;
    if (productsByDomain.size >= maxDomains) return;
    productsByDomain.set(domain, []);
  };

  // ── Scrape seed search pages ──────────────────────────
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
      const dbg: DebugInfo = {
        seedUrl, domain: seedHost,
        firecrawlStatus: "failed",
        competitorStatus: "failed",
        errorMessage: error ?? "Scrape returned empty response",
        markdownLength: 0, priceMatches: 0, productStrings: 0,
        rawLinkCount: 0, sampleTitles: [], markdownPreview: "",
        productsExtracted: 0,
        note: "Scrape returned empty response",
      };
      debug.push(dbg);
      console.error(`[discover] seed=${seedUrl} status=failed err=${error}`);
      continue;
    }
    statuses.push({ url: seedUrl, status: "success" });
    ensureDomain(seedHost);

    const { products, debug: d } = extractSignals(page, seedUrl, seedHost);
    debug.push({ seedUrl, domain: seedHost, ...d });
    console.info(
      `[discover] seed=${seedUrl} status=success mdLen=${d.markdownLength} ` +
      `prices=${d.priceMatches} titles=${d.productStrings} links=${d.rawLinkCount} ` +
      `products=${d.productsExtracted}`,
    );
    for (const p of products) addProduct(p);
  }

  // ── Persist competitors ─────────────────────────────────
  const competitorRows = Array.from(productsByDomain.keys())
    .filter((d) => d.length > 0)
    .map((domain) => ({
      user_id: userId,
      query,
      name: nameFromHost(domain),
      domain,
      url: `https://${domain}`,
      description: debug.find((d) => d.domain === domain)?.markdownPreview || null,
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

  // ── Persist products (any signal counts) ───────────────
  let productsInserted = 0;
  for (const [domain, list] of productsByDomain) {
    const comp = competitors.find((c) => c.domain === domain);
    if (!comp || list.length === 0) continue;
    const rows = list.map((p) => ({
      user_id: userId,
      competitor_id: comp.id,
      source_url: p.source_url,
      title: p.title ?? null,
      price: typeof p.price === "number" ? p.price : null,
      currency: p.currency ?? null,
      availability: null,
      image_url: null,
      raw: {
        query,
        domain,
        low_confidence: !p.price,
        status: p.status ?? "structured_data",
        rawSnippet: p.rawSnippet ?? null,
      } as unknown as never,
      scraped_at: new Date().toISOString(),
    }));
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

  const competitorsWithConfidence = competitors.map((c) => {
    const list = productsByDomain.get(c.domain) ?? [];
    const hasUnstructured = list.some((p) => p.status === "unstructured_data");
    return {
      ...c,
      product_count: list.length,
      confidence: hasUnstructured ? "low" : "medium",
      status: hasUnstructured ? "unstructured_data" : "structured_data",
      raw_snippet: debug.find((d) => d.domain === c.domain)?.markdownPreview ?? c.description,
    };
  });

  return {
    competitors: competitorsWithConfidence,
    productsInserted,
    statuses,
    debug,
    totals: { domains: productsByDomain.size, products: totalProducts() },
    category,
    seeds,
  };
}

// ───────────────────────── Single-competitor rescrape ─────────────────────────

export async function scrapeCompetitorPage(
  userId: string,
  competitorId: string,
  url: string,
) {
  const statuses: ScrapeStatus[] = [];
  const seedHost = hostFrom(url);

  const { page, error } = await safeScrape(url, {
    formats: ["markdown", "links"],
    waitFor: 3000,
    actions: [{ type: "wait", milliseconds: 3000 }],
  });
  if (!page) {
    statuses.push({ url, status: "failed", message: error });
    return { inserted: 0, statuses };
  }
  statuses.push({ url, status: "success" });

  const { products, debug } = extractSignals(page, url, seedHost);
  console.info(
    `[rescrape] url=${url} status=success mdLen=${debug.markdownLength} ` +
    `prices=${debug.priceMatches} titles=${debug.productStrings} links=${debug.rawLinkCount} ` +
    `products=${debug.productsExtracted}`,
  );

  const rows = products.slice(0, 30).map((p) => ({
    user_id: userId,
    competitor_id: competitorId,
    source_url: p.source_url,
    title: p.title ?? null,
    price: typeof p.price === "number" ? p.price : null,
    currency: p.currency ?? null,
    availability: null,
    image_url: null,
    raw: {
      rescrape: true,
      status: p.status ?? "structured_data",
      rawSnippet: p.rawSnippet ?? null,
    } as unknown as never,
    scraped_at: new Date().toISOString(),
  }));

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
