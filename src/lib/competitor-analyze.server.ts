// Product-level competitor analysis with semantic similarity filtering and
// my-product comparison. Pipeline:
//   1. Firecrawl /v2/search → top web results scraped to markdown
//   2. Gemini extracts structured products {title, price, rating, reviews, ...}
//   3. Lovable AI embeddings → cosine similarity vs query; weak matches dropped
//   4. Compare vs user-supplied price (or median baseline): cheaper/similar/pricier
//   5. Return ranked products + summary stats for clean charts

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";
const AI_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";

function firecrawlKey(): string {
  const k = process.env.FIRECRAWL_API_KEY;
  if (!k) throw new Error("FIRECRAWL_API_KEY missing — connect Firecrawl in Connectors");
  return k;
}
function lovableKey(): string {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY missing");
  return k;
}

// ── Currency normalization ────────────────────────────────────────
const FX: Record<string, number> = {
  USD: 1, $: 1,
  EUR: 1.08, "€": 1.08,
  GBP: 1.27, "£": 1.27,
  INR: 0.012, "₹": 0.012, RS: 0.012,
  BDT: 0.0085, "৳": 0.0085, TK: 0.0085,
  CAD: 0.73, AUD: 0.66, JPY: 0.0067, CNY: 0.14,
};
function toUsd(price: number, currency?: string): number {
  if (!currency) return price;
  const c = currency.trim().toUpperCase().replace(/\.$/, "");
  const rate = FX[c] ?? FX[currency.trim()] ?? 1;
  return price * rate;
}

// ── 1. Firecrawl Search ───────────────────────────────────────────
type SearchResult = { url: string; title?: string; markdown?: string };

async function firecrawlSearch(query: string, limit = 8): Promise<SearchResult[]> {
  const res = await fetch(`${FIRECRAWL_BASE}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `${query} buy price review`,
      limit,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl /search ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    data?: { web?: SearchResult[] } | SearchResult[];
  };
  const data = json.data;
  const list = Array.isArray(data) ? data : (data?.web ?? []);
  return list.filter((r) => r.url);
}

// ── 2. Gemini structured extraction ──────────────────────────────
export type RawProduct = {
  title: string;
  price?: number;
  currency?: string;
  rating?: number;
  review_count?: number;
  brand?: string;
  image_url?: string;
  source_url?: string;
};

async function extractProductsLLM(
  query: string,
  pageUrl: string,
  markdown: string,
): Promise<RawProduct[]> {
  const trimmed = markdown.slice(0, 12000);
  if (trimmed.length < 200) return [];

  const sys = `You extract competitor product listings from messy webpage markdown.
Return strict JSON: {"products":[{title, price, currency, rating, review_count, brand, image_url, source_url}]}
Rules:
- Only include actual purchasable products related to the user's search query.
- price: numeric only (no currency symbols). currency: "USD","EUR","GBP","INR","BDT" etc.
- rating: 0-5 numeric if shown. review_count: integer if shown.
- source_url: absolute URL to product page; if missing, leave blank.
- Skip ads, recommendation widgets, navigation, "you may also like" sections.
- Max 12 most relevant products. Empty array if none.`;

  const user = `Search query: "${query}"
Page URL: ${pageUrl}
Markdown:
"""
${trimmed}
"""`;

  const res = await fetch(AI_CHAT_URL, {
    method: "POST",
    headers: {
      "Lovable-API-Key": lovableKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    console.warn(`[analyze] LLM extract failed ${res.status} for ${pageUrl}`);
    return [];
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content) as { products?: RawProduct[] };
    return Array.isArray(parsed.products) ? parsed.products : [];
  } catch {
    return [];
  }
}

// ── 3. Embeddings + cosine similarity ────────────────────────────
async function embed(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      "Lovable-API-Key": lovableKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: inputs,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data.map((d) => d.embedding);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ── 4. Pipeline ──────────────────────────────────────────────────
export type AnalyzedProduct = {
  title: string;
  brand?: string;
  price_usd?: number;
  price_raw?: number;
  currency?: string;
  rating?: number;
  review_count?: number;
  image_url?: string;
  source_url?: string;
  domain: string;
  similarity: number;
  comparison: "cheaper" | "similar" | "pricier" | "unknown";
  price_delta_pct?: number; // (product - baseline) / baseline * 100
};

export type AnalyzeResult = {
  query: string;
  baseline_price: number | null;
  baseline_source: "user" | "median" | "none";
  products: AnalyzedProduct[];
  stats: {
    count: number;
    avg_price: number | null;
    median_price: number | null;
    min_price: number | null;
    max_price: number | null;
    avg_rating: number | null;
    total_reviews: number;
    cheaper: number;
    similar: number;
    pricier: number;
  };
  sources_scanned: number;
  diagnostics: Array<{ url: string; products_found: number; error?: string }>;
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export async function analyzeCompetitors(
  query: string,
  opts: { myPriceUsd?: number; minSimilarity?: number; maxResults?: number } = {},
): Promise<AnalyzeResult> {
  const minSim = opts.minSimilarity ?? 0.55;
  const maxResults = opts.maxResults ?? 24;

  // 1. Search
  const results = await firecrawlSearch(query, 8);
  const diagnostics: AnalyzeResult["diagnostics"] = [];

  // 2. Extract products in parallel
  const extractions = await Promise.all(
    results.map(async (r) => {
      if (!r.markdown || r.markdown.length < 200) {
        diagnostics.push({ url: r.url, products_found: 0, error: "no markdown" });
        return [] as RawProduct[];
      }
      try {
        const items = await extractProductsLLM(query, r.url, r.markdown);
        diagnostics.push({ url: r.url, products_found: items.length });
        return items.map((p) => ({
          ...p,
          source_url: p.source_url || r.url,
        }));
      } catch (e) {
        diagnostics.push({
          url: r.url,
          products_found: 0,
          error: e instanceof Error ? e.message : String(e),
        });
        return [] as RawProduct[];
      }
    }),
  );

  const rawProducts = extractions.flat().filter((p) => p.title && p.title.length > 3);
  if (rawProducts.length === 0) {
    return {
      query,
      baseline_price: opts.myPriceUsd ?? null,
      baseline_source: opts.myPriceUsd != null ? "user" : "none",
      products: [],
      stats: {
        count: 0, avg_price: null, median_price: null, min_price: null,
        max_price: null, avg_rating: null, total_reviews: 0,
        cheaper: 0, similar: 0, pricier: 0,
      },
      sources_scanned: results.length,
      diagnostics,
    };
  }

  // 3. Dedupe (by lowercased title + domain)
  const seen = new Set<string>();
  const deduped = rawProducts.filter((p) => {
    const key = `${p.title.toLowerCase().trim()}|${hostOf(p.source_url ?? "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 4. Embed + similarity filter
  const [queryEmb] = await embed([query]);
  const titleEmbs = await embed(deduped.map((p) => `${p.brand ?? ""} ${p.title}`.trim()));

  const scored = deduped.map((p, i) => ({
    p,
    sim: cosine(queryEmb, titleEmbs[i]),
  }));

  const filtered = scored
    .filter((s) => s.sim >= minSim)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, maxResults);

  // 5. Normalize prices to USD
  const enriched = filtered.map(({ p, sim }) => {
    const priceUsd =
      typeof p.price === "number" && Number.isFinite(p.price) && p.price > 0
        ? toUsd(p.price, p.currency)
        : undefined;
    return {
      title: p.title,
      brand: p.brand,
      price_usd: priceUsd,
      price_raw: typeof p.price === "number" ? p.price : undefined,
      currency: p.currency,
      rating: typeof p.rating === "number" ? p.rating : undefined,
      review_count: typeof p.review_count === "number" ? p.review_count : undefined,
      image_url: p.image_url,
      source_url: p.source_url,
      domain: hostOf(p.source_url ?? ""),
      similarity: Number(sim.toFixed(3)),
    };
  });

  // 6. Baseline + comparison
  const validPrices = enriched
    .map((p) => p.price_usd)
    .filter((x): x is number => typeof x === "number");

  const medianPrice = median(validPrices);
  let baseline: number | null = null;
  let baselineSource: AnalyzeResult["baseline_source"] = "none";
  if (typeof opts.myPriceUsd === "number" && opts.myPriceUsd > 0) {
    baseline = opts.myPriceUsd;
    baselineSource = "user";
  } else if (medianPrice != null) {
    baseline = medianPrice;
    baselineSource = "median";
  }

  const products: AnalyzedProduct[] = enriched.map((p) => {
    let comparison: AnalyzedProduct["comparison"] = "unknown";
    let delta: number | undefined;
    if (baseline != null && p.price_usd != null) {
      delta = ((p.price_usd - baseline) / baseline) * 100;
      if (delta <= -10) comparison = "cheaper";
      else if (delta >= 10) comparison = "pricier";
      else comparison = "similar";
    }
    return { ...p, comparison, price_delta_pct: delta };
  });

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const ratings = products.map((p) => p.rating).filter((x): x is number => typeof x === "number");
  const totalReviews = products.reduce((s, p) => s + (p.review_count ?? 0), 0);

  return {
    query,
    baseline_price: baseline,
    baseline_source: baselineSource,
    products,
    stats: {
      count: products.length,
      avg_price: avg(validPrices),
      median_price: medianPrice,
      min_price: validPrices.length ? Math.min(...validPrices) : null,
      max_price: validPrices.length ? Math.max(...validPrices) : null,
      avg_rating: avg(ratings),
      total_reviews: totalReviews,
      cheaper: products.filter((p) => p.comparison === "cheaper").length,
      similar: products.filter((p) => p.comparison === "similar").length,
      pricier: products.filter((p) => p.comparison === "pricier").length,
    },
    sources_scanned: results.length,
    diagnostics,
  };
}
