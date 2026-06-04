// Server-only Firecrawl client — SCRAPE ONLY.
// /search and /crawl are not available in this environment (connector_not_found),
// so the entire pipeline is built on /scrape with formats: ["links","markdown"]
// and optional JSON extraction for product data.

const GATEWAY_BASE = "https://connector-gateway.lovable.dev/firecrawl/v2";

function keys() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");
  if (!fcKey) throw new Error("Firecrawl connector not configured (FIRECRAWL_API_KEY missing)");
  return { lovableKey, fcKey };
}

export type ScrapedPage = {
  url: string;
  markdown: string;
  html?: string;
  links: string[];
  metadata?: Record<string, unknown>;
  json?: Record<string, unknown>;
};

type ScrapeResp = {
  data?: {
    markdown?: string;
    html?: string;
    links?: string[];
    metadata?: Record<string, unknown>;
    json?: Record<string, unknown>;
  };
  markdown?: string;
  html?: string;
  links?: string[];
  metadata?: Record<string, unknown>;
  json?: Record<string, unknown>;
};

export async function firecrawlScrape(
  url: string,
  opts: {
    extractSchema?: Record<string, unknown>;
    formats?: ("markdown" | "links" | "html")[];
    waitFor?: number;
    actions?: Array<Record<string, unknown>>;
  } = {},
): Promise<ScrapedPage> {
  const { lovableKey, fcKey } = keys();
  const baseFormats = opts.formats ?? ["markdown", "links"];
  const formats: unknown[] = [...baseFormats];
  if (opts.extractSchema) {
    formats.push({ type: "json", schema: opts.extractSchema });
  }

  const body: Record<string, unknown> = { url, formats, onlyMainContent: false };
  if (opts.waitFor) body.waitFor = opts.waitFor;
  if (opts.actions) body.actions = opts.actions;

  const res = await fetch(`${GATEWAY_BASE}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": fcKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl /scrape ${res.status}: ${text}`);
  }
  const json = (await res.json()) as ScrapeResp;
  const d = json.data ?? json;
  return {
    url,
    markdown: d.markdown ?? "",
    html: d.html,
    links: Array.isArray(d.links) ? d.links : [],
    metadata: d.metadata,
    json: d.json,
  };
}

// JSON-extraction schema for product pages.
export const PRODUCT_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    product_name: { type: "string" },
    price: { type: "string" },
    currency: { type: "string" },
    availability: { type: "string" },
    url: { type: "string" },
    image_url: { type: "string" },
  },
} as const;
