import {
  aiSummary as defaultAiSummary,
  complaints,
  competitorPrices,
  inventoryAlerts,
  positiveTrends,
  summaryCards,
  trendingProducts,
} from "@/lib/sample-data";

export type SearchMode = "keyword" | "natural-language";

export type SearchMetricCard = {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
};

export type SearchProductMatch = {
  name: string;
  source: string;
  detail: string;
};

export type DashboardStructuredSearchResult = {
  query: string;
  mode: SearchMode;
  sections: string[];
  totalMatches: number;
  hasStructuredResults: boolean;
  resultCards: SearchMetricCard[];
  matchedProducts: SearchProductMatch[];
  matchedInsights: string[];
};

const analyticsKeywords = [
  "sale",
  "sales",
  "revenue",
  "order",
  "orders",
  "trend",
  "trending",
  "growth",
  "drop",
  "decline",
  "performance",
  "analytics",
  "dashboard",
  "বিক্রয়",
  "রাজস্ব",
  "অর্ডার",
  "ট্রেন্ড",
  "প্রবণতা",
  "কমছে",
  "বাড়ছে",
  "বিশ্লেষণ",
];

const inventoryKeywords = [
  "inventory",
  "stock",
  "restock",
  "sku",
  "warehouse",
  "low",
  "overstock",
  "product",
  "products",
  "পণ্য",
  "স্টক",
  "ইনভেন্টরি",
  "রিস্টক",
  "sku",
  "কম",
  "অতিরিক্ত",
];

const competitorKeywords = [
  "competitor",
  "competitors",
  "pricing",
  "price",
  "compare",
  "market",
  "share",
  "প্রতিযোগী",
  "দাম",
  "মূল্য",
  "তুলনা",
  "মার্কেট",
];

const customerKeywords = [
  "customer",
  "customers",
  "review",
  "reviews",
  "sentiment",
  "feedback",
  "complaint",
  "complaints",
  "customer support",
  "গ্রাহক",
  "রিভিউ",
  "সন্তুষ্টি",
  "ফিডব্যাক",
  "অভিযোগ",
];

const naturalLanguageHints = [
  "why",
  "how",
  "what",
  "which",
  "should",
  "can",
  "help",
  "explain",
  "tell",
  "insight",
  "recommend",
  "কেন",
  "কী",
  "কি",
  "কোন",
  "কিভাবে",
  "সাহায্য",
  "ব্যাখ্যা",
  "পরামর্শ",
];

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function matchesQuery(query: string, fields: Array<string | number | null | undefined>) {
  const tokens = unique(tokenize(query));
  const haystack = normalize(
    fields
      .filter((field): field is string | number => field !== null && field !== undefined)
      .join(" "),
  );

  if (!haystack) return false;
  if (haystack.includes(normalize(query))) return true;
  return tokens.some((token) => haystack.includes(token));
}

function inferSections(query: string) {
  const q = normalize(query);
  const sections = new Set<string>();
  const addIfMatches = (name: string, keywords: string[]) => {
    if (keywords.some((keyword) => q.includes(keyword))) sections.add(name);
  };

  addIfMatches("analytics", analyticsKeywords);
  addIfMatches("inventory", inventoryKeywords);
  addIfMatches("competitors", competitorKeywords);
  addIfMatches("customers", customerKeywords);
  return sections;
}

export function detectSearchMode(query: string): SearchMode {
  const q = normalize(query);
  const tokens = tokenize(query);
  if (q.includes("?") || tokens.length >= 4) return "natural-language";
  if (naturalLanguageHints.some((hint) => q.includes(hint))) return "natural-language";
  return "keyword";
}

export function buildStructuredDashboardSearch(query: string): DashboardStructuredSearchResult {
  const sections = inferSections(query);

  const matchedProducts: SearchProductMatch[] = [];
  const addProduct = (name: string, source: string, detail: string) => {
    if (matchedProducts.some((item) => item.name === name && item.source === source)) return;
    matchedProducts.push({ name, source, detail });
  };

  inventoryAlerts.forEach((item) => {
    if (matchesQuery(query, [item.name, item.sku, item.status])) {
      sections.add("inventory");
      addProduct(
        item.name,
        "inventory",
        `${item.sku} · ${item.stock} in stock · ${item.status === "low" ? "Low stock" : "Overstock"}`,
      );
    }
  });

  competitorPrices.forEach((item) => {
    if (matchesQuery(query, [item.product, item.you, item.compA, item.compB, item.compC])) {
      sections.add("competitors");
      addProduct(
        item.product,
        "competitor",
        `Your price $${item.you.toFixed(2)} · Market avg $${(((item.compA + item.compB + item.compC) / 3)).toFixed(2)}`,
      );
    }
  });

  trendingProducts.forEach((item) => {
    if (matchesQuery(query, [item.name, item.growth])) {
      sections.add("analytics");
      addProduct(item.name, "trending", `Weekly growth ${item.growth}`);
    }
  });

  const matchedInsights = unique(
    [
      ...summaryCards
        .filter((item) => matchesQuery(query, [item.label, item.value, item.delta]))
        .map((item) => `${item.label}: ${item.value} (${item.delta})`),
      ...positiveTrends.filter((item) => matchesQuery(query, [item])),
      ...complaints.filter((item) => matchesQuery(query, [item])),
    ],
  );

  if (matchedInsights.some((item) => matchesQuery(item, analyticsKeywords))) {
    sections.add("analytics");
  }
  if (matchedInsights.some((item) => matchesQuery(item, customerKeywords))) {
    sections.add("customers");
  }

  const totalMatches = matchedProducts.length + matchedInsights.length;
  const mode = detectSearchMode(query);
  const sectionCount = sections.size;

  return {
    query,
    mode,
    sections: [...sections],
    totalMatches,
    hasStructuredResults: totalMatches > 0,
    resultCards: [
      {
        label: "মোট ম্যাচ / Total matches",
        value: String(totalMatches),
        delta: `${sectionCount} ${sectionCount === 1 ? "section" : "sections"}`,
        positive: totalMatches > 0,
      },
      {
        label: "পণ্য ম্যাচ / Product matches",
        value: String(matchedProducts.length),
        delta:
          matchedProducts.length > 0
            ? matchedProducts[0].name
            : "কোনও সরাসরি পণ্য ম্যাচ নেই / No direct product matches",
        positive: matchedProducts.length > 0,
      },
      {
        label: "ইনসাইট / Insights",
        value: String(matchedInsights.length),
        delta:
          matchedInsights.length > 0
            ? "স্ট্রাকচার্ড ডেটা মিলেছে / Structured data matched"
            : "RAG fallback may be used",
        positive: matchedInsights.length > 0,
      },
      {
        label: "সার্চ মোড / Search mode",
        value: mode === "natural-language" ? "AI + RAG" : "Structured",
        delta:
          mode === "natural-language"
            ? "প্রশ্নভিত্তিক বিশ্লেষণ / Natural-language analysis"
            : "কীওয়ার্ড ফিল্টার / Keyword filtering",
        positive: true,
      },
    ],
    matchedProducts,
    matchedInsights: matchedInsights.length > 0 ? matchedInsights : [defaultAiSummary],
  };
}