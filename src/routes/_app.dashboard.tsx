import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  salesTrend,
  demandForecast,
  inventoryAlerts,
  competitorPrices,
  sentimentBreakdown,
  summaryCards,
  aiSummary,
  trendingProducts,
} from "@/lib/sample-data";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Loader2, Search, X } from "lucide-react";
import { useLanguage, useT } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardStructuredSearchResult } from "@/lib/dashboard-search";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EasyBusiness AI" },
      { name: "description", content: "Overview of sales, inventory, and AI insights." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : undefined,
    t: typeof s.t === "number" ? s.t : undefined,
  }),
  component: DashboardPage,
});

type SearchResponse = {
  query: string;
  mode: "keyword" | "natural-language";
  structured: DashboardStructuredSearchResult;
  aiSummary: string | null;
  ragMatches: Array<{ title: string | null; source_type: string; content: string }>;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function DashboardPage() {
  const t = useT();
  const { lang } = useLanguage();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const lastHandledKey = useRef<string | null>(null);

  useEffect(() => {
    const q = search.q?.trim();
    if (!q) {
      setSearchLoading(false);
      setSearchError(null);
      setSearchResult(null);
      return;
    }

    const key = `${q}|${search.t ?? ""}|${lang}`;
    if (lastHandledKey.current === key) return;
    lastHandledKey.current = key;

    let cancelled = false;
    const run = async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const headers = await authHeaders();
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ query: q, language: lang }),
        });
        const json = (await res.json()) as SearchResponse | { error?: string };
        if (!res.ok) throw new Error("error" in json ? json.error || "Search failed" : "Search failed");
        if (!cancelled) setSearchResult(json as SearchResponse);
      } catch (error) {
        if (!cancelled) {
          setSearchResult(null);
          setSearchError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [search.q, search.t, lang]);

  const clearSearch = () => {
    lastHandledKey.current = null;
    setSearchResult(null);
    setSearchError(null);
    setSearchLoading(false);
    navigate({ search: {}, replace: true });
  };

  const visibleSummaryCards = searchResult?.structured.resultCards ?? summaryCards;
  const visibleTrending = searchResult?.structured.matchedProducts.length
    ? searchResult.structured.matchedProducts.slice(0, 4).map((item) => ({
        name: item.name,
        growth: item.source === "inventory" ? t("স্টক ম্যাচ / Stock match") : item.source === "competitor" ? t("মূল্য ম্যাচ / Price match") : t("ম্যাচ / Match"),
      }))
    : trendingProducts;
  const visibleInventory = useMemo(() => {
    if (!searchResult?.structured.matchedProducts.length) return inventoryAlerts;
    const names = new Set(
      searchResult.structured.matchedProducts
        .filter((item) => item.source === "inventory")
        .map((item) => item.name),
    );
    return names.size > 0 ? inventoryAlerts.filter((item) => names.has(item.name)) : inventoryAlerts;
  }, [searchResult]);
  const visibleCompetitors = useMemo(() => {
    if (!searchResult?.structured.matchedProducts.length) return competitorPrices;
    const names = new Set(
      searchResult.structured.matchedProducts
        .filter((item) => item.source === "competitor")
        .map((item) => item.name),
    );
    return names.size > 0 ? competitorPrices.filter((item) => names.has(item.product)) : competitorPrices;
  }, [searchResult]);
  const visibleAiSummary = searchResult?.aiSummary || (searchResult ? searchResult.structured.matchedInsights.join("\n") : aiSummary);

  return (
    <>
      <DashboardTopbar title="ড্যাশবোর্ড / Dashboard" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        {(search.q || searchLoading || searchResult || searchError) && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </div>
                <div>
                  <CardTitle className="text-base">
                    {t("সার্চ ফলাফল / Search results")}
                    {search.q ? <span className="ml-2 text-muted-foreground">“{search.q}”</span> : null}
                  </CardTitle>
                  <CardDescription>
                    {searchLoading
                      ? t("ড্যাশবোর্ড আপডেট হচ্ছে... / Updating dashboard...")
                      : searchResult
                      ? `${searchResult.structured.totalMatches} ${t("ম্যাচ পাওয়া গেছে / matches found")}`
                      : searchError
                      ? searchError
                      : t("সার্চ ক্লিয়ার করা হয়েছে / Search cleared")}
                  </CardDescription>
                </div>
                {searchResult ? (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {searchResult.mode === "natural-language"
                      ? t("AI + RAG")
                      : t("স্ট্রাকচার্ড / Structured")}
                  </Badge>
                ) : null}
                {(search.q || searchResult || searchError) && (
                  <Button variant="outline" size="sm" onClick={clearSearch} className="gap-1">
                    <X className="h-3.5 w-3.5" />
                    {t("ক্লিয়ার / Clear")}
                  </Button>
                )}
              </div>
            </CardHeader>
            {searchResult ? (
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium">{t("ম্যাচিং পণ্য / Matching products")}</div>
                      <div className="mt-2 space-y-2">
                        {searchResult.structured.matchedProducts.length > 0 ? (
                          searchResult.structured.matchedProducts.slice(0, 5).map((item) => (
                            <div key={`${item.source}-${item.name}`} className="rounded-md border p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-medium">{item.name}</div>
                                <Badge variant="secondary" className="text-xs">
                                  {item.source}
                                </Badge>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-md border p-3 text-sm text-muted-foreground">
                            {t("কোনও সরাসরি পণ্য ম্যাচ পাওয়া যায়নি / No direct product matches found")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium">{t("এআই সারাংশ / AI summary")}</div>
                      <div className="mt-2 rounded-md border p-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                        {visibleAiSummary}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t("সম্পর্কিত ইনসাইট / Related insights")}</div>
                      <div className="mt-2 space-y-2">
                        {searchResult.structured.matchedInsights.slice(0, 4).map((item) => (
                          <div key={item} className="rounded-md border p-3 text-sm text-muted-foreground">
                            {t(item)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            ) : null}
          </Card>
        )}

        {/* Summary cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visibleSummaryCards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wide">
                  {t(c.label)}
                </CardDescription>
                <CardTitle className="text-2xl">{c.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`flex items-center gap-1 text-xs ${
                    c.positive ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  {c.positive ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  )}
                  {t(c.delta)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI summary */}
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">{t("এআই বিজনেস সারাংশ / AI business summary")}</CardTitle>
              <Badge variant="secondary" className="ml-auto text-xs">
                {searchResult ? t("সার্চ ভিত্তিক / Search based") : t("২ মিনিট আগে আপডেট / Updated 2 min ago")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {t(visibleAiSummary)}
            </p>
          </CardContent>
        </Card>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("বিক্রয় প্রবণতা / Sales trend")}</CardTitle>
              <CardDescription>{t("মাসিক রাজস্ব, গত ১২ মাস / Monthly revenue, last 12 months")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend} margin={{ left: -10, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      fill="url(#g1)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("ট্রেন্ডিং পণ্য / Trending products")}</CardTitle>
              <CardDescription>{t("এই সপ্তাহের শীর্ষ / Top movers this week")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {visibleTrending.map((p) => (
                  <li key={p.name} className="flex items-center justify-between">
                    <span className="text-sm">{p.name}</span>
                    <Badge variant="secondary" className="text-success bg-success/10">
                      {p.growth}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Forecast + sentiment */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("চাহিদা পূর্বাভাস / Demand forecast")}</CardTitle>
              <CardDescription>{t("প্রকৃত বনাম পূর্বাভাস, পরবর্তী ৪ সপ্তাহ / Actual vs. predicted units, next 4 weeks projected")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={demandForecast} margin={{ left: -10, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="actual" stroke="var(--color-chart-1)" strokeWidth={2} />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="var(--color-chart-2)"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("গ্রাহক সন্তুষ্টি / Customer sentiment")}</CardTitle>
              <CardDescription>{t("গত ৩০ দিনের রিভিউ / Last 30 days reviews")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {sentimentBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory + competitors */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("ইনভেন্টরি সতর্কতা / Inventory alerts")}</CardTitle>
              <CardDescription>{t("মনোযোগ প্রয়োজন / Items needing attention")}</CardDescription>
            </CardHeader>
              <CardContent className="space-y-2">
               {visibleInventory.map((i) => (
                <div
                  key={i.sku}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">
                      SKU {i.sku} · {i.stock} {t("স্টকে / in stock")}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      i.status === "low"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/15 text-warning-foreground"
                    }
                  >
                    {i.status === "low" ? (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    ) : (
                      <AlertTriangle className="mr-1 h-3 w-3" />
                    )}
                    {i.status === "low" ? t("কম স্টক / Low stock") : t("অতিরিক্ত স্টক / Overstock")}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("প্রতিযোগী মূল্য / Competitor pricing")}</CardTitle>
              <CardDescription>{t("৩ জন প্রতিযোগীর সাথে তুলনা / Compared to 3 tracked competitors")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("পণ্য / Product")}</TableHead>
                    <TableHead className="text-right">{t("আপনি / You")}</TableHead>
                    <TableHead className="text-right">A</TableHead>
                    <TableHead className="text-right">B</TableHead>
                    <TableHead className="text-right">C</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCompetitors.map((c) => (
                    <TableRow key={c.product}>
                      <TableCell className="font-medium">{c.product}</TableCell>
                      <TableCell className="text-right">${c.you.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${c.compA.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${c.compB.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${c.compC.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
