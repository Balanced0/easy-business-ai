// Product Graph Intelligence Engine.
//
// Treats Firecrawl /scrape output as weak signals, not data sources. Pipeline:
//   1. Query expansion → category, synonyms, brands, price expectations
//   2. Seed graph generation (ecommerce templates per category)
//   3. Firecrawl scrape with STRICT filter (title + price + repeated patterns)
//   4. Product node system with confidence score
//   5. Competitor = domain with ≥3 valid product nodes
//   6. Product graph: clustering by brand / price range / category / domain
//   7. Output: competitors (ranked), clusters, price distribution, top brands
//
// UI contract (unchanged): { competitors, productsInserted, statuses, debug,
// totals } is returned; extra fields (graph, clusters, brands, priceDist) are
// additive and ignored by the existing UI.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { firecrawlScrape, type ScrapedPage } from "./firecrawl.server";

// ───────────────────────── 1. Query expansion ─────────────────────────

type Category =
  | "audio" | "mobile" | "computers" | "electronics"
  | "footwear" | "fashion" | "beauty" | "home"
  | "toys" | "sports" | "grocery" | "general";

type QueryExpansion = {
  raw: string;
  normalized: string;
  category: Category;
  synonyms: string[];
  brands: string[];
  priceRange: { min: number; max: number }; // USD-equivalent expectation
};

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

const CATEGORY_SYNONYMS: Record<Category, string[]> = {
  audio: ["wireless earbuds", "bluetooth headphones", "tws earphones"],
  mobile: ["smartphone", "android phone", "cell phone"],
  computers: ["laptop", "notebook computer", "ultrabook"],
  electronics: ["consumer electronics", "gadget"],
  footwear: ["shoes", "sneakers", "trainers"],
  fashion: ["apparel", "clothing", "outfit"],
  beauty: ["cosmetics", "skincare", "makeup"],
  home: ["home decor", "furniture"],
  toys: ["kids toys", "games"],
  sports: ["sports gear", "fitness equipment"],
  grocery: ["food", "pantry"],
  general: [],
};

const CATEGORY_BRANDS: Record<Category, string[]> = {
  audio: ["Sony", "Bose", "JBL", "Apple", "Samsung", "Sennheiser", "Anker", "Soundcore", "Beats", "Skullcandy", "Xiaomi", "Realme", "Oneplus", "Edifier"],
  mobile: ["Apple", "Samsung", "Xiaomi", "Oppo", "Vivo", "Realme", "Oneplus", "Google", "Huawei", "Nokia", "Motorola"],
  computers: ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "MSI", "Microsoft", "Razer", "LG", "Samsung"],
  electronics: ["Sony", "Samsung", "LG", "Canon", "Nikon", "GoPro", "DJI", "Bose"],
  footwear: ["Nike", "Adidas", "Puma", "Reebok", "New Balance", "Asics", "Converse", "Vans", "Bata"],
  fashion: ["Zara", "H&M", "Uniqlo", "Levi's", "Nike", "Adidas", "Gucci", "Tommy Hilfiger"],
  beauty: ["L'Oreal", "Maybelline", "MAC", "Estee Lauder", "Nivea", "Olay", "Lakme", "Garnier"],
  home: ["IKEA", "Philips", "Dyson", "Bosch"],
  toys: ["Lego", "Hasbro", "Mattel", "Fisher-Price"],
  sports: ["Nike", "Adidas", "Decathlon", "Wilson", "Yonex"],
  grocery: ["Nestle", "Unilever", "PepsiCo", "Kraft"],
  general: [],
};

const CATEGORY_PRICE_USD: Record<Category, { min: number; max: number }> = {
  audio: { min: 5, max: 800 },
  mobile: { min: 50, max: 2500 },
  computers: { min: 100, max: 5000 },
  electronics: { min: 20, max: 3000 },
  footwear: { min: 10, max: 500 },
  fashion: { min: 5, max: 1000 },
  beauty: { min: 2, max: 300 },
  home: { min: 10, max: 3000 },
  toys: { min: 2, max: 300 },
  sports: { min: 5, max: 2000 },
  grocery: { min: 1, max: 100 },
  general: { min: 1, max: 5000 },
};

function categorize(query: string): Category {
  const q = query.toLowerCase();
  for (const { cat, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => q.includes(w))) return cat;
  }
  return "general";
}

function expandQuery(query: string): QueryExpansion {
  const normalized = query.trim().toLowerCase();
  const category = categorize(normalized);
  return {
    raw: query,
    normalized,
    category,
    synonyms: CATEGORY_SYNONYMS[category],
    brands: CATEGORY_BRANDS[category],
    priceRange: CATEGORY_PRICE_USD[category],
  };
}

// ───────────────────────── 2. Seed graph generation ─────────────────────────

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

function buildSeeds(exp: QueryExpansion): string[] {
  const enc = encodeURIComponent(exp.normalized);
  return CATEGORY_SEEDS[exp.category].map((t) => t.replace(/\{q\}/g, enc));
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

// ───────────────────────── Types (preserved for UI) ─────────────────────────

export type ScrapeStatus = {
  url: string;
  status: "success" | "failed" | "skipped";
  message?: string;
};

export type PageType =
  | "product_page"
  | "category_page"
  | "navigation_page"
  | "irrelevant_page";

export type DebugInfo = {
  seedUrl: string;
  domain: string;
  firecrawlStatus: "success" | "failed" | "empty";
  errorMessage?: string;
  competitorStatus?:
    | "structured_data"
    | "unstructured_data"
    | "empty_response"
    | "failed"
    | "discarded";
  pageType?: PageType;
  markdownLength: number;
  priceMatches: number;
  productStrings: number;
  rawLinkCount: number;
  sampleTitles: string[];
  markdownPreview: string;
  productsExtracted: number;
  note?: string;
};

// ───────────────────────── 3. Strict signal extraction ─────────────────────────

const PRICE_RE =
  /(USD|EUR|GBP|BDT|INR|Rs\.?|৳|\$|€|£|₹)\s?([0-9]{1,3}(?:[,.\s][0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g;

const CURRENCY_TO_USD: Record<string, number> = {
  USD: 1, $: 1,
  EUR: 1.08, "€": 1.08,
  GBP: 1.27, "£": 1.27,
  INR: 0.012, "₹": 0.012, "Rs": 0.012, "Rs.": 0.012,
  BDT: 0.0085, "৳": 0.0085,
};

const NAV_URL_RE =
  /\/(login|signin|signup|register|account|help|support|seller|customer-service|contact|about|privacy|terms|shipping|returns?)(\/|$|\?)/i;
const PRODUCT_URL_RE =
  /\/(product|item|products|listing|dp|itm)\/|\/p\/|-i\.|\/itm\//i;
const CATEGORY_URL_RE =
  /\/(catalog|category|categories|search|sch\/|w\/wholesale|searchpage|keyword)/i;
const NAV_KEYWORDS = [
  "login", "sign in", "sign up", "register", "my account",
  "help center", "customer service", "seller center", "become a seller",
  "contact us", "about us", "privacy policy", "terms of use",
  "shipping policy", "return policy", "track order",
];
const PRODUCT_KEYWORDS = [
  "add to cart", "buy now", "add to bag", "in stock", "out of stock", "order now",
];

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

function findTitles(md: string): TitleHit[] {
  const out: TitleHit[] = [];
  const linkRe = /\[([^\]\n]{4,200})\]\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(md)) !== null) {
    const text = m[1].replace(/\s+/g, " ").trim();
    if (text.length < 4) continue;
    if (/^(home|next|prev|more|see all|shop|click)$/i.test(text)) continue;
    out.push({ index: m.index, text, url: m[2] });
  }
  if (out.length === 0) {
    const phraseRe =
      /(?:^|\n|\.\s+)((?:[A-Z][A-Za-z0-9'’&+./-]{1,40}\s+){2,7}[A-Z][A-Za-z0-9'’&+./-]{1,40})/g;
    while ((m = phraseRe.exec(md)) !== null) {
      const text = m[1].replace(/\s+/g, " ").trim();
      if (text.length < 8 || text.length > 160) continue;
      out.push({ index: m.index + (m[0].length - m[1].length), text });
    }
  }
  const seen = new Set<string>();
  return out.filter((h) => {
    const k = h.text.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function classifyPage(
  url: string,
  markdown: string,
  priceCount: number,
  titleCount: number,
): PageType {
  if (NAV_URL_RE.test(url)) return "navigation_page";
  const md = markdown.toLowerCase();
  const navHits = NAV_KEYWORDS.filter((k) => md.includes(k)).length;
  const prodHits = PRODUCT_KEYWORDS.filter((k) => md.includes(k)).length;
  if (priceCount === 0 && navHits >= 3 && titleCount < 3) return "navigation_page";
  if (priceCount === 0 && titleCount === 0) return "irrelevant_page";
  if (PRODUCT_URL_RE.test(url) || prodHits >= 1) return "product_page";
  if (CATEGORY_URL_RE.test(url)) return "category_page";
  if (priceCount >= 1 && titleCount >= 1) return "category_page";
  return "irrelevant_page";
}

// ───────────────────────── 4. Product Node System ─────────────────────────

type ProductNode = {
  domain: string;
  source_url: string;
  title: string;
  price?: number;
  currency?: string;
  priceUsd?: number;
  brand?: string;
  category: Category;
  confidence: number; // 0..1
};

function detectBrand(title: string, brands: string[]): string | undefined {
  const lc = title.toLowerCase();
  for (const b of brands) {
    if (lc.includes(b.toLowerCase())) return b;
  }
  return undefined;
}

function toUsd(price: number, currency: string): number | undefined {
  const rate = CURRENCY_TO_USD[currency] ?? CURRENCY_TO_USD[currency.replace(/\.$/, "")];
  return rate ? price * rate : undefined;
}

function scoreConfidence(args: {
  hasPrice: boolean;
  hasUrl: boolean;
  hasBrand: boolean;
  priceInRange: boolean;
  titleLen: number;
  pageType: PageType;
}): number {
  let s = 0;
  if (args.hasPrice) s += 0.4;
  if (args.hasUrl) s += 0.2;
  if (args.hasBrand) s += 0.2;
  if (args.priceInRange) s += 0.1;
  if (args.titleLen >= 12 && args.titleLen <= 120) s += 0.05;
  if (args.pageType === "product_page") s += 0.05;
  return Math.min(1, s);
}

function extractNodes(
  page: ScrapedPage,
  seedUrl: string,
  seedHost: string,
  exp: QueryExpansion,
): { nodes: ProductNode[]; pageType: PageType; debug: Omit<DebugInfo, "seedUrl" | "domain"> } {
  const md = page.markdown ?? "";
  const prices = findPrices(md);
  const titles = findTitles(md);
  const pageType = classifyPage(seedUrl, md, prices.length, titles.length);
  const preview = md.slice(0, 500);

  const nodes: ProductNode[] = [];
  const repeated = titles.length >= 3; // "repeated product-like patterns"

  if ((pageType === "product_page" || pageType === "category_page") && repeated) {
    const seen = new Set<string>();
    for (const t of titles.slice(0, 40)) {
      // Pair nearest price within 500 chars
      let bestPrice: PriceHit | undefined;
      let bestDist = Infinity;
      for (const p of prices) {
        const d = Math.abs(p.index - t.index);
        if (d < bestDist && d < 500) { bestDist = d; bestPrice = p; }
      }
      const hasPrice = !!bestPrice;
      // STRICT: title must exist AND a price must exist on the page (paired or category-level)
      if (!hasPrice) continue;
      const url = t.url ?? `${seedUrl}#t-${t.index}`;
      if (t.url && NAV_URL_RE.test(t.url)) continue;
      if (seen.has(url)) continue;
      seen.add(url);

      const priceUsd = bestPrice ? toUsd(bestPrice.price, bestPrice.currency) : undefined;
      const inRange = priceUsd != null
        ? priceUsd >= exp.priceRange.min && priceUsd <= exp.priceRange.max
        : false;
      const brand = detectBrand(t.text, exp.brands);

      const confidence = scoreConfidence({
        hasPrice,
        hasUrl: !!t.url,
        hasBrand: !!brand,
        priceInRange: inRange,
        titleLen: t.text.length,
        pageType,
      });

      // Discard very low-confidence noise
      if (confidence < 0.45) continue;

      nodes.push({
        domain: t.url ? hostFrom(t.url) || seedHost : seedHost,
        source_url: url,
        title: t.text,
        price: bestPrice?.price,
        currency: bestPrice?.currency,
        priceUsd,
        brand,
        category: exp.category,
        confidence,
      });
    }
  }

  const competitorStatus: DebugInfo["competitorStatus"] =
    md.length === 0
      ? "empty_response"
      : pageType === "navigation_page" || pageType === "irrelevant_page"
        ? "discarded"
        : nodes.length > 0
          ? "structured_data"
          : "discarded";

  const note =
    md.length === 0
      ? "Scrape returned empty response"
      : pageType === "navigation_page"
        ? "Navigation page — discarded"
        : pageType === "irrelevant_page"
          ? "Irrelevant page — no product signals, discarded"
          : !repeated
            ? "No repeated product-like patterns — discarded"
            : nodes.length === 0
              ? "No valid product nodes (title + price required) — discarded"
              : undefined;

  return {
    nodes,
    pageType,
    debug: {
      firecrawlStatus: md.length > 0 ? "success" : "empty",
      competitorStatus,
      pageType,
      markdownLength: md.length,
      priceMatches: prices.length,
      productStrings: titles.length,
      rawLinkCount: page.links.length,
      sampleTitles: nodes.slice(0, 5).map((n) => n.title),
      markdownPreview: preview,
      productsExtracted: nodes.length,
      note,
    },
  };
}

// ───────────────────────── 6. Product graph construction ─────────────────────────

type PriceBucket = "under_25" | "25_100" | "100_500" | "500_2000" | "over_2000" | "unknown";

function bucketize(priceUsd?: number): PriceBucket {
  if (priceUsd == null) return "unknown";
  if (priceUsd < 25) return "under_25";
  if (priceUsd < 100) return "25_100";
  if (priceUsd < 500) return "100_500";
  if (priceUsd < 2000) return "500_2000";
  return "over_2000";
}

type ProductCluster = {
  key: string;
  brand?: string;
  priceBucket: PriceBucket;
  category: Category;
  size: number;
  domains: string[];
  sampleTitles: string[];
};

function buildGraph(nodes: ProductNode[]) {
  // Brand counts
  const brandCount = new Map<string, number>();
  // Price distribution
  const priceDist: Record<PriceBucket, number> = {
    under_25: 0, "25_100": 0, "100_500": 0, "500_2000": 0, over_2000: 0, unknown: 0,
  };
  // Clusters by brand+bucket+category
  const clusters = new Map<string, ProductCluster>();

  for (const n of nodes) {
    if (n.brand) brandCount.set(n.brand, (brandCount.get(n.brand) ?? 0) + 1);
    const bucket = bucketize(n.priceUsd);
    priceDist[bucket]++;
    const key = `${n.brand ?? "unknown"}|${bucket}|${n.category}`;
    const c = clusters.get(key) ?? {
      key, brand: n.brand, priceBucket: bucket, category: n.category,
      size: 0, domains: [], sampleTitles: [],
    };
    c.size++;
    if (!c.domains.includes(n.domain)) c.domains.push(n.domain);
    if (c.sampleTitles.length < 4) c.sampleTitles.push(n.title);
    clusters.set(key, c);
  }

  const topBrands = Array.from(brandCount.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const clusterList = Array.from(clusters.values()).sort((a, b) => b.size - a.size).slice(0, 20);

  return { clusters: clusterList, priceDistribution: priceDist, topBrands };
}

// ───────────────────────── Main pipeline ─────────────────────────

type DiscoveryOptions = {
  maxDomains?: number;
  maxProducts?: number;
};

const MIN_PRODUCTS_PER_COMPETITOR = 3;

export async function discoverFromQuery(
  userId: string,
  query: string,
  opts: DiscoveryOptions = {},
) {
  const maxDomains = Math.min(Math.max(opts.maxDomains ?? 20, 1), 50);
  const maxProducts = Math.min(Math.max(opts.maxProducts ?? 80, 1), 300);

  const expansion = expandQuery(query);
  const seeds = buildSeeds(expansion);
  const statuses: ScrapeStatus[] = [];
  const debug: DebugInfo[] = [];
  const nodesByDomain = new Map<string, ProductNode[]>();

  const totalNodes = () =>
    Array.from(nodesByDomain.values()).reduce((s, l) => s + l.length, 0);

  const addNode = (n: ProductNode) => {
    if (totalNodes() >= maxProducts) return;
    if (nodesByDomain.size >= maxDomains && !nodesByDomain.has(n.domain)) return;
    const list = nodesByDomain.get(n.domain) ?? [];
    if (list.some((x) => x.source_url === n.source_url)) return;
    list.push(n);
    nodesByDomain.set(n.domain, list);
  };

  // ── Scrape seeds ─────────────────────────────────────────
  for (const seedUrl of seeds) {
    if (totalNodes() >= maxProducts) break;
    const seedHost = hostFrom(seedUrl);
    const { page, error } = await safeScrape(seedUrl, {
      formats: ["markdown", "links"],
      waitFor: 3000,
      actions: [{ type: "wait", milliseconds: 3000 }],
    });
    if (!page) {
      statuses.push({ url: seedUrl, status: "failed", message: error });
      debug.push({
        seedUrl, domain: seedHost,
        firecrawlStatus: "failed",
        competitorStatus: "failed",
        errorMessage: error ?? "Scrape returned empty response",
        markdownLength: 0, priceMatches: 0, productStrings: 0,
        rawLinkCount: 0, sampleTitles: [], markdownPreview: "",
        productsExtracted: 0,
        note: "Scrape returned empty response",
      });
      console.error(`[graph] seed=${seedUrl} status=failed err=${error}`);
      continue;
    }
    statuses.push({ url: seedUrl, status: "success" });
    const { nodes, pageType, debug: d } = extractNodes(page, seedUrl, seedHost, expansion);
    debug.push({ seedUrl, domain: seedHost, ...d });
    console.info(
      `[graph] seed=${seedUrl} type=${pageType} mdLen=${d.markdownLength} ` +
      `prices=${d.priceMatches} titles=${d.productStrings} nodes=${nodes.length}`,
    );
    for (const n of nodes) addNode(n);
  }

  // ── 5. Competitor filter: ≥3 valid product nodes ─────────
  for (const [domain, list] of Array.from(nodesByDomain.entries())) {
    if (list.length < MIN_PRODUCTS_PER_COMPETITOR) {
      nodesByDomain.delete(domain);
      const d = debug.find((x) => x.domain === domain);
      if (d) {
        d.competitorStatus = "discarded";
        d.note = `Only ${list.length} valid product node(s) — needs ≥${MIN_PRODUCTS_PER_COMPETITOR}`;
      }
    }
  }

  // ── 6. Graph construction ────────────────────────────────
  const allNodes = Array.from(nodesByDomain.values()).flat();
  const graph = buildGraph(allNodes);

  // ── Persist competitors (ranked by product volume) ───────
  const ranked = Array.from(nodesByDomain.entries())
    .sort((a, b) => b[1].length - a[1].length);

  const competitorRows = ranked
    .filter(([d]) => d.length > 0)
    .map(([domain, list]) => {
      const domainDebug = debug.find((d) => d.domain === domain);
      const avgConf = list.reduce((s, n) => s + n.confidence, 0) / list.length;
      return {
        user_id: userId,
        query,
        name: nameFromHost(domain),
        domain,
        url: `https://${domain}`,
        description: domainDebug?.markdownPreview || null,
        source: `product_graph:${expansion.category}:conf_${avgConf.toFixed(2)}`,
      };
    });

  let competitors: Array<Record<string, unknown> & { id: string; domain: string }> = [];
  if (competitorRows.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("competitors")
      .upsert(competitorRows, { onConflict: "user_id,domain,query" })
      .select("*");
    if (error) throw new Error(`competitors upsert failed: ${error.message}`);
    competitors = (data ?? []) as typeof competitors;
  }

  // ── Persist product nodes ────────────────────────────────
  let productsInserted = 0;
  for (const [domain, list] of nodesByDomain) {
    const comp = competitors.find((c) => c.domain === domain);
    if (!comp || list.length === 0) continue;
    const rows = list.map((n) => ({
      user_id: userId,
      competitor_id: comp.id,
      source_url: n.source_url,
      title: n.title,
      price: typeof n.price === "number" ? n.price : null,
      currency: n.currency ?? null,
      availability: null,
      image_url: null,
      raw: {
        query,
        domain,
        category: n.category,
        brand: n.brand ?? null,
        priceUsd: n.priceUsd ?? null,
        confidence: n.confidence,
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

  // ── Output (UI-compatible + additive graph fields) ───────
  const competitorsRanked = competitors
    .map((c) => {
      const list = nodesByDomain.get(c.domain) ?? [];
      const avgConf = list.length
        ? list.reduce((s, n) => s + n.confidence, 0) / list.length
        : 0;
      return {
        ...c,
        product_count: list.length,
        confidence: avgConf >= 0.75 ? "high" : avgConf >= 0.55 ? "medium" : "low",
        status: "structured_data" as const,
        raw_snippet: debug.find((d) => d.domain === c.domain)?.markdownPreview ?? c.description,
      };
    })
    .sort((a, b) => b.product_count - a.product_count);

  return {
    competitors: competitorsRanked,
    productsInserted,
    statuses,
    debug,
    totals: { domains: nodesByDomain.size, products: totalNodes() },
    // Additive graph intelligence (UI ignores unknown fields):
    category: expansion.category,
    seeds,
    expansion,
    graph,
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

  // Look up the competitor's original query to expand context for brand detection.
  const { data: comp } = await supabaseAdmin
    .from("competitors")
    .select("query")
    .eq("id", competitorId)
    .eq("user_id", userId)
    .maybeSingle();
  const expansion = expandQuery(comp?.query ?? "");

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

  const { nodes, pageType, debug } = extractNodes(page, url, seedHost, expansion);
  console.info(
    `[rescrape] url=${url} type=${pageType} mdLen=${debug.markdownLength} ` +
    `prices=${debug.priceMatches} titles=${debug.productStrings} nodes=${nodes.length}`,
  );
  if (nodes.length === 0) return { inserted: 0, statuses };

  const rows = nodes.slice(0, 40).map((n) => ({
    user_id: userId,
    competitor_id: competitorId,
    source_url: n.source_url,
    title: n.title,
    price: typeof n.price === "number" ? n.price : null,
    currency: n.currency ?? null,
    availability: null,
    image_url: null,
    raw: {
      rescrape: true,
      brand: n.brand ?? null,
      priceUsd: n.priceUsd ?? null,
      confidence: n.confidence,
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
