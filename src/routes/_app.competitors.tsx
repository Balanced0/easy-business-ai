import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Globe, Download } from "lucide-react";
import { useT } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/competitors")({
  head: () => ({ meta: [{ title: "প্রতিযোগী / Competitors — EasyBusiness AI" }] }),
  component: CompetitorsPage,
});

type Competitor = {
  id: string;
  query: string;
  name: string;
  domain: string;
  url: string;
  description: string | null;
  last_scraped_at: string | null;
  status?: "structured_data" | "unstructured_data";
  raw_snippet?: string | null;
};

type Product = {
  id: string;
  competitor_id: string;
  source_url: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  availability: string | null;
  scraped_at: string;
};

type DebugInfo = {
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

async function authedFetch(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

type SeedReport = {
  source: string;
  seedUrl: string;
  ok: boolean;
  error?: string;
  finalUrl?: string;
  status?: number;
  markdownLength: number;
  markdownPreview: string;
  priceCount: number;
  productCardCount: number;
  productTitleCount: number;
  navShellDetected: boolean;
  verdict: "real_products" | "navigation_shell" | "empty" | "error";
};

function CompetitorsPage() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [validating, setValidating] = useState(false);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [seedReports, setSeedReports] = useState<SeedReport[]>([]);
  const [lastTotals, setLastTotals] = useState<{ domains: number; products: number } | null>(null);
  const [currentRunIds, setCurrentRunIds] = useState<Set<string>>(new Set());
  const [currentRunCount, setCurrentRunCount] = useState<number | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [dbLoadedAt, setDbLoadedAt] = useState<string | null>(null);


  const load = useCallback(async () => {
    const res = await authedFetch("/api/competitors/list");
    if (!res.ok) return;
    const json = await res.json();
    setCompetitors(json.competitors ?? []);
    setProducts(json.products ?? []);
    setDbLoadedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDiscover = async () => {
    if (!query.trim()) return;
    setDiscovering(true);
    setDebugInfo([]);
    setCurrentRunIds(new Set());
    setCurrentRunCount(null);
    setLastRunAt(null);
    try {
      const res = await authedFetch("/api/competitors/discover", {
        method: "POST",
        body: JSON.stringify({ query: query.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "discovery failed");
      setDebugInfo(json.debug ?? []);
      setLastTotals(json.totals ?? null);
      const returned: Array<{ id?: string }> = json.competitors ?? [];
      const ids = new Set<string>(
        returned
          .map((c) => c.id)
          .filter((id): id is string => typeof id === "string"),
      );
      setCurrentRunIds(ids);
      setCurrentRunCount(typeof json.count === "number" ? json.count : returned.length);
      setLastRunAt(new Date().toISOString());
      toast.success(
        `Discovered ${json.count} competitors (${json.productsInserted ?? 0} products)`,
      );
      await load();

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  };

  const handleClearCurrentRun = () => {
    setCurrentRunIds(new Set());
    setCurrentRunCount(null);
    setLastRunAt(null);
    setDebugInfo([]);
    setLastTotals(null);
  };

  const handleScrape = async (c: Competitor) => {
    setScrapingId(c.id);
    try {
      const res = await authedFetch("/api/competitors/scrape", {
        method: "POST",
        body: JSON.stringify({ competitorId: c.id, paginationLimit: 5 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "scrape failed");
      const failed = (json.statuses ?? []).filter(
        (s: { status: string }) => s.status === "failed",
      ).length;
      toast.success(
        `Scraped ${c.domain}: ${json.inserted} products${failed ? ` (${failed} failed)` : ""}`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setScrapingId(null);
    }
  };

  const handleValidate = async () => {
    if (!query.trim()) return;
    setValidating(true);
    setSeedReports([]);
    try {
      const res = await authedFetch("/api/competitors/validate-seeds", {
        method: "POST",
        body: JSON.stringify({ query: query.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "validation failed");
      setSeedReports(json.reports ?? []);
      const s = json.summary;
      toast.success(
        `Seeds: ${s.real_products} real · ${s.navigation_shell} shell · ${s.empty} empty · ${s.error} error`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  };

  return (
    <>
      <DashboardTopbar title="প্রতিযোগী ইন্টেলিজেন্স / Competitor Intelligence" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("প্রতিযোগী খুঁজুন / Discover competitors")}
            </CardTitle>
            <CardDescription>
              {t(
                "একটি পণ্যের নাম লিখুন (যেমন: wireless earbuds); সিস্টেম স্বয়ংক্রিয়ভাবে প্রতিযোগী খুঁজে দেবে। / Enter a product name (e.g. wireless earbuds) — the system auto-discovers competitors by scraping known ecommerce sites.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="wireless earbuds"
                onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
              />

              <Button onClick={handleDiscover} disabled={discovering || !query.trim()}>
                {discovering ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="mr-1 h-3.5 w-3.5" />
                )}
                {t("খুঁজুন / Discover")}
              </Button>
              <Button
                variant="outline"
                onClick={handleValidate}
                disabled={validating || !query.trim()}
              >
                {validating ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="mr-1 h-3.5 w-3.5" />
                )}
                {t("Validate seeds")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {seedReports.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Seed validation</CardTitle>
              <CardDescription>
                Per-seed Firecrawl probe — identify which sources return real
                product listings vs navigation / anti-bot shells.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {seedReports.map((r, i) => {
                const verdictVariant =
                  r.verdict === "real_products"
                    ? "secondary"
                    : r.verdict === "error"
                      ? "destructive"
                      : "outline";
                return (
                  <details
                    key={`${r.seedUrl}-${i}`}
                    className="rounded-md border bg-muted/30 p-2 text-xs"
                  >
                    <summary className="cursor-pointer select-none">
                      <span className="font-medium">{r.source}</span>
                      <Badge variant={verdictVariant} className="ml-2 text-[10px]">
                        {r.verdict}
                      </Badge>
                      <span className="ml-2 text-muted-foreground">
                        md:{r.markdownLength} · prices:{r.priceCount} · cards:
                        {r.productCardCount} · titles:{r.productTitleCount}
                        {r.navShellDetected ? " · ⚠ shell" : ""}
                      </span>
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="font-mono break-all text-[11px]">
                        seed: {r.seedUrl}
                      </div>
                      {r.finalUrl && r.finalUrl !== r.seedUrl && (
                        <div className="font-mono break-all text-[11px]">
                          final: {r.finalUrl}
                        </div>
                      )}
                      {r.status != null && (
                        <div className="text-[11px]">HTTP {r.status}</div>
                      )}
                      {r.error && (
                        <div className="text-destructive">⚠ {r.error}</div>
                      )}
                      {r.markdownPreview && (
                        <div>
                          <div className="font-medium mb-1">
                            First {r.markdownPreview.length} chars:
                          </div>
                          <pre className="whitespace-pre-wrap break-words rounded bg-background p-2 text-[11px] max-h-60 overflow-auto">
                            {r.markdownPreview}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </CardContent>
          </Card>
        )}


        {debugInfo.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("স্ক্রেপ ডায়াগনস্টিক্স / Scrape diagnostics")}
              </CardTitle>
              <CardDescription>
                {lastTotals
                  ? `${lastTotals.domains} domains · ${lastTotals.products} products extracted across ${debugInfo.length} seeds`
                  : `${debugInfo.length} seeds`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {debugInfo.map((d, i) => {
                const isOk = d.firecrawlStatus === "success";
                const isEmpty = d.firecrawlStatus === "empty" || d.markdownLength === 0;
                const isUnstructured = d.competitorStatus === "unstructured_data";
                return (
                  <details
                    key={`${d.seedUrl}-${i}`}
                    className="rounded-md border bg-muted/30 p-2 text-xs"
                  >
                    <summary className="cursor-pointer select-none">
                      <span className="font-mono break-all">{d.seedUrl}</span>
                      <span className="ml-2">
                        <Badge
                          variant={isOk ? "secondary" : "destructive"}
                          className="text-[10px]"
                        >
                          {d.firecrawlStatus}
                        </Badge>
                        {d.competitorStatus && d.competitorStatus !== "failed" && (
                          <Badge variant="outline" className="ml-1 text-[10px]">
                            {d.competitorStatus}
                          </Badge>
                        )}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        md:{d.markdownLength} · links:{d.rawLinkCount} · prices:
                        {d.priceMatches} · titles:{d.productStrings} · products:
                        {d.productsExtracted}
                      </span>
                    </summary>
                    <div className="mt-2 space-y-2">
                      {d.errorMessage && (
                        <div className="text-destructive">
                          ⚠ {d.errorMessage}
                        </div>
                      )}
                      {d.note && (
                        <div className="text-muted-foreground italic">{d.note}</div>
                      )}
                      {isUnstructured && (
                        <div className="text-muted-foreground italic">
                          {t("No products detected; competitor kept as unstructured data.")}
                        </div>
                      )}
                      {isEmpty && !d.errorMessage && (
                        <div className="text-destructive">
                          {t("Scrape returned empty response")}
                        </div>
                      )}
                      {d.sampleTitles.length > 0 && (
                        <div>
                          <div className="font-medium mb-1">Sample titles:</div>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {d.sampleTitles.map((s, j) => (
                              <li key={j} className="truncate">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {d.markdownPreview && (
                        <div>
                          <div className="font-medium mb-1">
                            Raw page data viewer (first {d.markdownPreview.length} chars):
                          </div>
                          <pre className="whitespace-pre-wrap break-words rounded bg-background p-2 text-[11px] max-h-48 overflow-auto">
                            {d.markdownPreview}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </CardContent>
          </Card>
        )}



        {competitors.length === 0 ? (
          <Card className="border-warning/40 bg-warning/[0.04]">
            <CardHeader>
              <CardTitle className="text-base">
                {t("কোনো প্রতিযোগী এখনো নেই / No competitors yet")}
              </CardTitle>
              <CardDescription>
                {t("উপরে একটি ক্যোয়ারি দিয়ে শুরু করুন। / Run a discovery query above to get started.")}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {competitors.map((c) => {
              const cProducts = products.filter((p) => p.competitor_id === c.id);
              const isUnstructured = c.status === "unstructured_data";
              return (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{c.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 truncate">
                          <Globe className="h-3 w-3 shrink-0" />
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline truncate"
                          >
                            {c.domain}
                          </a>
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {cProducts.length} {t("পণ্য / products")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isUnstructured && (
                      <Badge variant="outline" className="w-fit">
                        unstructured_data
                      </Badge>
                    )}
                    {c.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    {isUnstructured && c.raw_snippet && (
                      <div className="space-y-1 rounded-md border bg-muted/30 p-2">
                        <div className="text-[11px] font-medium text-muted-foreground">
                          Raw snippet
                        </div>
                        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words text-[11px]">
                          {c.raw_snippet}
                        </pre>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleScrape(c)}
                        disabled={scrapingId === c.id}
                      >
                        {scrapingId === c.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1 h-3.5 w-3.5" />
                        )}
                        {t("পণ্য স্ক্রেপ / Scrape products")}
                      </Button>
                    </div>
                    {cProducts.length > 0 && (
                      <div className="space-y-1 border-t pt-2">
                        {cProducts.slice(0, 5).map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <a
                              href={p.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate hover:underline"
                            >
                              {p.title || p.source_url}
                            </a>
                            {p.price != null && (
                              <span className="shrink-0 font-medium">
                                {p.currency ?? ""}
                                {p.price}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
