// Server-only Firecrawl client wrappers, routed through the Lovable connector
// gateway. Centralizes /search, /scrape, and /crawl so routes stay thin and
// scheduler-friendly. No Playwright / browser scraping anywhere in the stack.

const GATEWAY_BASE = "https://connector-gateway.lovable.dev/firecrawl/v2";

function keys() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");
  if (!fcKey) throw new Error("Firecrawl connector not configured (FIRECRAWL_API_KEY missing)");
  return { lovableKey, fcKey };
}

async function gw<T = unknown>(path: string, body: unknown): Promise<T> {
  const { lovableKey, fcKey } = keys();
  const res = await fetch(`${GATEWAY_BASE}${path}`, {
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
    throw new Error(`Firecrawl ${path} ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

// NOTE: Firecrawl /search is not available in this environment. Discovery is
// crawl-driven only — see competitor-pipeline.server.ts.


export type ScrapedPage = {
  url: string;
  markdown: string;
  html?: string;
  metadata?: Record<string, unknown>;
  json?: Record<string, unknown>;
};

type ScrapeResp = {
  data?: {
    markdown?: string;
    html?: string;
    metadata?: Record<string, unknown>;
    json?: Record<string, unknown>;
  };
  markdown?: string;
  html?: string;
  metadata?: Record<string, unknown>;
  json?: Record<string, unknown>;
};

export async function firecrawlScrape(
  url: string,
  opts: { extractSchema?: Record<string, unknown> } = {},
): Promise<ScrapedPage> {
  const formats: unknown[] = ["markdown"];
  if (opts.extractSchema) {
    formats.push({ type: "json", schema: opts.extractSchema });
  }
  const json = await gw<ScrapeResp>("/scrape", {
    url,
    formats,
    onlyMainContent: true,
  });
  const d = json.data ?? json;
  return {
    url,
    markdown: d.markdown ?? "",
    html: d.html,
    metadata: d.metadata,
    json: d.json,
  };
}

export type CrawlPage = {
  url: string;
  markdown: string;
  metadata?: Record<string, unknown>;
  json?: Record<string, unknown>;
};

type StartCrawlResp = { id?: string; jobId?: string };
type CrawlStatusResp = {
  status?: string;
  completed?: number;
  total?: number;
  next?: string | null;
  data?: Array<{
    markdown?: string;
    metadata?: { sourceURL?: string; url?: string } & Record<string, unknown>;
    json?: Record<string, unknown>;
  }>;
};

// Start an async crawl, poll until done (with a hard ceiling), return pages.
// Used for paginated product extraction (category pages → product pages).
export async function firecrawlCrawl(
  url: string,
  opts: {
    limit?: number;
    maxDepth?: number;
    includePaths?: string[];
    excludePaths?: string[];
    extractSchema?: Record<string, unknown>;
    timeoutMs?: number;
  } = {},
): Promise<CrawlPage[]> {
  const formats: unknown[] = ["markdown"];
  if (opts.extractSchema) {
    formats.push({ type: "json", schema: opts.extractSchema });
  }

  const start = await gw<StartCrawlResp>("/crawl", {
    url,
    limit: opts.limit ?? 25,
    maxDepth: opts.maxDepth ?? 2,
    includePaths: opts.includePaths,
    excludePaths: opts.excludePaths,
    scrapeOptions: { formats, onlyMainContent: true },
  });

  const id = start.id ?? start.jobId;
  if (!id) throw new Error("Firecrawl crawl did not return a job id");

  const { lovableKey, fcKey } = keys();
  const deadline = Date.now() + (opts.timeoutMs ?? 90_000);
  const pages: CrawlPage[] = [];

  while (Date.now() < deadline) {
    const res = await fetch(`${GATEWAY_BASE}/crawl/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": fcKey,
      },
    });
    if (!res.ok) {
      throw new Error(`Firecrawl crawl status ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as CrawlStatusResp;
    for (const p of json.data ?? []) {
      const pageUrl =
        (p.metadata?.sourceURL as string | undefined) ??
        (p.metadata?.url as string | undefined) ??
        "";
      if (!pageUrl) continue;
      pages.push({
        url: pageUrl,
        markdown: p.markdown ?? "",
        metadata: p.metadata,
        json: p.json,
      });
    }
    if (json.status === "completed" || json.status === "failed") break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Dedupe by URL.
  const seen = new Set<string>();
  return pages.filter((p) => (seen.has(p.url) ? false : (seen.add(p.url), true)));
}

// JSON-extraction schema for product pages — used by both /scrape and /crawl.
export const PRODUCT_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    price: { type: "number" },
    currency: { type: "string" },
    availability: { type: "string" },
    image_url: { type: "string" },
  },
} as const;
