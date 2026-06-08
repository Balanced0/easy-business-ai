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
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Loader2, Search, X, Upload, DollarSign, ShieldCheck, PackageMinus, Clock, Info } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage, useT } from "@/hooks/use-language";
import { useCurrency } from "@/hooks/use-currency";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EasyBusiness AI" },
      { name: "description", content: "Overview of sales, inventory, and AI insights from your uploaded data." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : undefined,
    t: typeof s.t === "number" ? s.t : undefined,
  }),
  component: DashboardPage,
});

type Analytics = {
  hasData: boolean;
  dataAvailability: Record<string, number>;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalUnits: number;
    averageOrderValue: number;
    lowStockCount: number;
    overstockCount: number;
    trendingProductCount: number;
  };
  salesTrend: Array<{ month: string; sales: number; orders: number }>;
  demandForecast: Array<{ week: string; actual: number | null; forecast: number }>;
  inventory: {
    low: Array<{ sku: string; name: string; stock: number; recommend: number; status: "low" }>;
    overstock: Array<{ sku: string; name: string; stock: number; recommend: number; status: "overstock" }>;
  };
  trendingProducts: Array<{ name: string; growth: string; unitsSold: number }>;
  sentiment: { breakdown: Array<{ name: string; value: number }>; positive: string[]; complaints: string[] };
  summaryCards: Array<{ label: string; value: string; delta: string; positive: boolean }>;
  aiSummaryFacts: string;
  valueGenerated: {
    revenueOpportunities: number;
    stockoutsAvoided: number;
    inventorySavings: number;
    timeSavedHours: number;
    aiQueriesCount: number;
  };
  reasoning: {
    bullets: string[];
    confidence: "high" | "medium" | "low";
    confidenceScore: number;
  };
};

type SearchResponse = {
  query: string;
  hasData: boolean;
  aiSummary: string | null;
  matchedProducts: Array<{ name: string; source: string; detail: string }>;
  matchedInsights: string[];
  ragMatches: Array<{ title: string | null; source_type: string; content: string }>;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const SENTIMENT_COLORS = ["var(--color-chart-2)", "var(--color-chart-3)", "var(--color-destructive)"];

function DashboardPage() {
  const t = useT();
  const { lang } = useLanguage();
  const { formatCurrency } = useCurrency();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const lastHandledKey = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await authHeaders();
        const res = await fetch("/api/analytics", { headers: h });
        const json = (await res.json()) as Analytics;
        if (!cancelled) setAnalytics(json);
      } catch (err) {
        console.error("[dashboard] analytics fetch failed", err);
      } finally {
        if (!cancelled) setLoadingAnalytics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    (async () => {
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
    })();
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

  const hasData = analytics?.hasData ?? false;
  const summaryCards = analytics?.summaryCards ?? [];
  const salesTrend = analytics?.salesTrend ?? [];
  const trendingProducts = analytics?.trendingProducts ?? [];
  const demandForecast = analytics?.demandForecast ?? [];
  const sentimentBreakdown = useMemo(
    () => (analytics?.sentiment.breakdown ?? []).map((s, i) => ({ ...s, color: SENTIMENT_COLORS[i] ?? "var(--color-chart-1)" })),
    [analytics],
  );
  const inventoryAlerts = useMemo(
    () => [...(analytics?.inventory.low ?? []), ...(analytics?.inventory.overstock ?? [])],
    [analytics],
  );
  const aiSummary = analytics?.aiSummaryFacts ?? "";

  const visibleAiSummary = searchResult?.aiSummary || aiSummary;

  return (
    <>
      <DashboardTopbar title="ড্যাশবোর্ড / Dashboard" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        {!loadingAnalytics && !hasData && (
          <Card className="border-warning/40 bg-warning/[0.04]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-warning/15 text-warning-foreground">
                  <Upload className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{t("কোনও ডেটা পাওয়া যায়নি / No data available yet")}</CardTitle>
                  <CardDescription>
                    {t("বিশ্লেষণ চালু করতে আপনার ডেটা আপলোড করুন / Upload data to activate analytics")}
                  </CardDescription>
                </div>
                <Button asChild size="sm">
                  <Link to="/upload">
                    <Upload className="mr-1 h-3.5 w-3.5" />
                    {t("আপলোড / Upload")}
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

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
                      ? searchResult.hasData
                        ? `${searchResult.matchedProducts.length} ${t("ম্যাচ পাওয়া গেছে / matches found")}`
                        : t("কোনও ডেটা নেই / No data available")
                      : searchError ?? t("সার্চ ক্লিয়ার করা হয়েছে / Search cleared")}
                  </CardDescription>
                </div>
                {(search.q || searchResult || searchError) && (
                  <Button variant="outline" size="sm" onClick={clearSearch} className="ml-auto gap-1">
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
                    <div className="text-sm font-medium">{t("ম্যাচিং পণ্য / Matching products")}</div>
                    <div className="mt-2 space-y-2">
                      {searchResult.matchedProducts.length > 0 ? (
                        searchResult.matchedProducts.slice(0, 5).map((item) => (
                          <div key={`${item.source}-${item.name}`} className="rounded-md border p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium">{item.name}</div>
                              <Badge variant="secondary" className="text-xs">{item.source}</Badge>
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
                  <div className="space-y-3">
                    <div className="text-sm font-medium">{t("এআই সারাংশ / AI summary")}</div>
                    <div className="mt-2 rounded-md border p-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                      {searchResult.aiSummary || t("কোনও সারাংশ উপলব্ধ নেই / No summary available")}
                    </div>
                  </div>
                </div>
              </CardContent>
            ) : null}
          </Card>
        )}

        {/* Value Generated card */}
        {(() => {
          const vg = analytics?.valueGenerated;
          const fmtCurrency = (n: number) => `$${(n || 0).toLocaleString()}`;
          const items = [
            {
              key: "revenue",
              icon: DollarSign,
              label: "রাজস্ব সুযোগ / Revenue opportunities",
              value: fmtCurrency(vg?.revenueOpportunities ?? 0),
              hint: "রিস্টক সুপারিশ × গড় মার্জিন / Restock recommendations × avg margin",
            },
            {
              key: "stockouts",
              icon: ShieldCheck,
              label: "স্টকআউট ঝুঁকি এড়ানো / Stockout risks avoided",
              value: String(vg?.stockoutsAvoided ?? 0),
              hint: "ফুরিয়ে যাওয়ার আগে চিহ্নিত কম-স্টক আইটেম / Low-stock items flagged before running out",
            },
            {
              key: "savings",
              icon: PackageMinus,
              label: "ইনভেন্টরি সাশ্রয় / Inventory savings",
              value: fmtCurrency(vg?.inventorySavings ?? 0),
              hint: "ক্লিয়ারেন্সের জন্য চিহ্নিত অতিরিক্ত স্টকের মূল্য / Overstocked value identified for clearance",
            },
            {
              key: "time",
              icon: Clock,
              label: "সময় সাশ্রয় / Time saved",
              value: `${vg?.timeSavedHours ?? 0} ${t("ঘণ্টা / hrs")}`,
              hint: `${vg?.aiQueriesCount ?? 0} ${t("এআই প্রশ্ন × ২.৫ ঘণ্টা / AI queries × 2.5 hrs")}`,
            },
          ];
          return (
            <Card className="border-success/30 bg-gradient-to-br from-success/[0.06] to-primary/[0.04]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-success/15 text-success">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {t("ইজিবিজনেস এআই এই মাসে যে মূল্য তৈরি করেছে / Value EasyBusiness AI Generated This Month")}
                    </CardTitle>
                    <CardDescription>
                      {t("আপনার আপলোডকৃত ডেটা থেকে গণনা করা / Computed from your uploaded data")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map((it) => (
                    <div key={it.key} className="rounded-lg border bg-card/60 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10 text-success">
                          <it.icon className="h-4 w-4" />
                        </div>
                        <TrendingUp className="h-4 w-4 text-success" />
                      </div>
                      <div className="mt-3 text-2xl font-semibold tracking-tight">{it.value}</div>
                      <div className="mt-1 text-xs font-medium">{t(it.label)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t(it.hint)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Summary cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.length === 0 ? (
            <Card className="sm:col-span-2 lg:col-span-4">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {loadingAnalytics ? t("লোড হচ্ছে... / Loading...") : t("কোনও সারাংশ মেট্রিক নেই — ডেটা আপলোড করুন / No summary metrics — upload data")}
              </CardContent>
            </Card>
          ) : (
            summaryCards.map((c) => (
              <Card key={c.label}>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wide">{t(c.label)}</CardDescription>
                  <CardTitle className="text-2xl">{c.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`flex items-center gap-1 text-xs ${c.positive ? "text-success" : "text-muted-foreground"}`}>
                    {c.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                    {t(c.delta)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* AI summary */}
        {(() => {
          const reasoning = analytics?.reasoning;
          const conf = reasoning?.confidence ?? "low";
          const confClass =
            conf === "high"
              ? "bg-success/15 text-success border-success/30"
              : conf === "medium"
              ? "bg-warning/15 text-warning-foreground border-warning/30"
              : "bg-destructive/10 text-destructive border-destructive/30";
          const confLabel =
            conf === "high"
              ? t("উচ্চ / High")
              : conf === "medium"
              ? t("মাঝারি / Medium")
              : t("নিম্ন / Low");
          const confExplain =
            conf === "high"
              ? t("ব্যাপক ডেটা ও ধারাবাহিক সংকেতের ভিত্তিতে উচ্চ নির্ভরতা। / High confidence: based on broad data and consistent signals.")
              : conf === "medium"
              ? t("পর্যাপ্ত ডেটা, তবে আরও আপলোডে নির্ভরতা বাড়বে। / Medium confidence: enough data, more uploads will improve reliability.")
              : t("সীমিত ডেটা — নির্ভরতা বাড়াতে আরও ডেটা আপলোড করুন। / Low confidence: limited data — upload more for stronger reliability.");
          return (
            <Card className="border-primary/20 bg-primary/[0.03]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base">{t("এআই বিজনেস সারাংশ / AI business summary")}</CardTitle>
                  <div className="ml-auto flex items-center gap-2">
                    <TooltipProvider delayDuration={150}>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className={`text-xs gap-1 cursor-help ${confClass}`}>
                            <Info className="h-3 w-3" />
                            {t("আত্মবিশ্বাস / Confidence")}: {confLabel}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">{confExplain}</TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                    <Badge variant="secondary" className="text-xs">
                      {hasData ? t("রিয়েল ডেটা / Real data") : t("ডেটা প্রয়োজন / Data required")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {visibleAiSummary ? t(visibleAiSummary) : t("বিশ্লেষণ পেতে আপনার বিক্রয়/ইনভেন্টরি/রিভিউ ডেটা আপলোড করুন / Upload your sales/inventory/review data to see analytics.")}
                </p>
                {reasoning && reasoning.bullets.length > 0 && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="why" className="border-t">
                      <AccordionTrigger className="text-sm">
                        {t("এই সুপারিশ কেন? / Why this recommendation?")}
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                          {reasoning.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("বিক্রয় প্রবণতা / Sales trend")}</CardTitle>
              <CardDescription>{t("মাসিক রাজস্ব / Monthly revenue")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                {salesTrend.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t("কোনও বিক্রয় ডেটা নেই / No sales data")}
                  </div>
                ) : (
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
                      <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="sales" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#g1)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("ট্রেন্ডিং পণ্য / Trending products")}</CardTitle>
              <CardDescription>{t("শীর্ষ পারফর্মার / Top performers")}</CardDescription>
            </CardHeader>
            <CardContent>
              {trendingProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">{t("কোনও ডেটা নেই / No data")}</div>
              ) : (
                <ul className="space-y-3">
                  {trendingProducts.slice(0, 5).map((p) => (
                    <li key={p.name} className="flex items-center justify-between">
                      <span className="text-sm">{p.name}</span>
                      <Badge variant="secondary" className="text-success bg-success/10">{p.growth}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Forecast + sentiment */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("চাহিদা পূর্বাভাস / Demand forecast")}</CardTitle>
              <CardDescription>{t("প্রকৃত বনাম পূর্বাভাস / Actual vs. forecast")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-60 w-full">
                {demandForecast.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t("কোনও বিক্রয় ইতিহাস নেই / No sales history")}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={demandForecast} margin={{ left: -10, right: 8, top: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                      <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="actual" stroke="var(--color-chart-1)" strokeWidth={2} />
                      <Line type="monotone" dataKey="forecast" stroke="var(--color-chart-2)" strokeDasharray="4 4" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("গ্রাহক সন্তুষ্টি / Customer sentiment")}</CardTitle>
              <CardDescription>{t("রিভিউ থেকে / From reviews")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-60 w-full">
                {sentimentBreakdown.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t("কোনও রিভিউ ডেটা নেই / No review data")}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sentimentBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {sentimentBreakdown.map((e) => (
                          <Cell key={e.name} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("ইনভেন্টরি সতর্কতা / Inventory alerts")}</CardTitle>
              <CardDescription>{t("মনোযোগ প্রয়োজন / Items needing attention")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {inventoryAlerts.length === 0 ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  {t("কোনও সতর্কতা নেই — ইনভেন্টরি আপলোড করুন / No alerts — upload inventory")}
                </div>
              ) : (
                inventoryAlerts.map((i) => (
                  <div key={`${i.sku}-${i.status}`} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">SKU {i.sku} · {i.stock} {t("স্টকে / in stock")}</div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={i.status === "low" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning-foreground"}
                    >
                      {i.status === "low" ? <TrendingDown className="mr-1 h-3 w-3" /> : <AlertTriangle className="mr-1 h-3 w-3" />}
                      {i.status === "low" ? t("কম স্টক / Low stock") : t("অতিরিক্ত স্টক / Overstock")}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("ডেটা প্রাপ্যতা / Data availability")}</CardTitle>
              <CardDescription>{t("আপলোডকৃত রেকর্ড / Uploaded records")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("ডেটাসেট / Dataset")}</TableHead>
                    <TableHead className="text-right">{t("রেকর্ড / Records")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(analytics?.dataAvailability ?? {}).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell className="capitalize">{k}</TableCell>
                      <TableCell className="text-right">{v}</TableCell>
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
