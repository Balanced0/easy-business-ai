import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import {
  Loader2,
  Search,
  TrendingDown,
  TrendingUp,
  Minus,
  Star,
  ExternalLink,
  Package,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { useT } from "@/hooks/use-language";
import { useCurrency } from "@/hooks/use-currency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_app/competitors")({
  head: () => ({ meta: [{ title: "প্রতিযোগী / Competitors — EasyBusiness AI" }] }),
  component: CompetitorsPage,
});

type Comparison = "cheaper" | "similar" | "pricier" | "unknown";

type AnalyzedProduct = {
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
  comparison: Comparison;
  price_delta_pct?: number;
};

type AnalyzeResponse = {
  ok: boolean;
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
  error?: string;
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

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 2 : 0 })}`;
}

function CompBadge({ c, delta }: { c: Comparison; delta?: number }) {
  if (c === "unknown") return <Badge variant="outline" className="text-[10px]">no price</Badge>;
  const map = {
    cheaper: { Icon: TrendingDown, label: "Cheaper", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    similar: { Icon: Minus, label: "Similar", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    pricier: { Icon: TrendingUp, label: "Pricier", cls: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  } as const;
  const { Icon, label, cls } = map[c];
  const pct = typeof delta === "number" ? ` ${delta > 0 ? "+" : ""}${delta.toFixed(0)}%` : "";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", cls)}>
      <Icon className="h-3 w-3" />
      {label}
      {pct}
    </span>
  );
}

function Stars({ value }: { value?: number }) {
  if (typeof value !== "number") return <span className="text-xs text-muted-foreground">—</span>;
  const v = Math.max(0, Math.min(5, value));
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <span className="font-medium">{v.toFixed(1)}</span>
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5 text-xs">
          <Icon className="h-3.5 w-3.5" /> {label}
        </CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardHeader>
    </Card>
  );
}

function CompetitorsPage() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [myPrice, setMyPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const myPriceNum = Number(myPrice);
      const res = await authedFetch("/api/competitors/analyze", {
        method: "POST",
        body: JSON.stringify({
          query: query.trim(),
          myPrice: Number.isFinite(myPriceNum) && myPriceNum > 0 ? myPriceNum : undefined,
          currency: "USD",
        }),
      });
      const json = (await res.json()) as AnalyzeResponse;
      if (!res.ok) throw new Error(json.error || "analysis failed");
      setResult(json);
      if (json.products.length === 0) {
        toast.warning("No closely matching competitor products found.");
      } else {
        toast.success(`Found ${json.products.length} relevant competitors`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const products = result?.products ?? [];
  const baseline = result?.baseline_price ?? null;

  const priceChartData = useMemo(
    () =>
      products
        .filter((p) => p.price_usd != null)
        .slice(0, 12)
        .map((p, i) => ({
          name: `${i + 1}. ${(p.brand ? `${p.brand} ` : "") + p.title}`.slice(0, 38),
          price: Number((p.price_usd as number).toFixed(2)),
          comparison: p.comparison,
        })),
    [products],
  );

  const scatterData = useMemo(
    () =>
      products
        .filter((p) => p.price_usd != null && p.rating != null)
        .map((p) => ({
          x: p.price_usd as number,
          y: p.rating as number,
          z: Math.max(20, Math.min(400, (p.review_count ?? 50) / 2)),
          title: p.title,
          comparison: p.comparison,
        })),
    [products],
  );

  const COMP_COLORS: Record<Comparison, string> = {
    cheaper: "hsl(152 60% 45%)",
    similar: "hsl(40 90% 55%)",
    pricier: "hsl(350 75% 55%)",
    unknown: "hsl(var(--muted-foreground))",
  };

  return (
    <>
      <DashboardTopbar title="প্রতিযোগী ইন্টেলিজেন্স / Competitor Intelligence" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("পণ্য তুলনা করুন / Compare your product")}
            </CardTitle>
            <CardDescription>
              {t(
                "আপনার পণ্যের নাম ও দাম দিন; আমরা প্রতিযোগী পণ্য খুঁজে আপনার দামের সাথে তুলনা করব। / Enter your product and price — we find true competitors and compare price, rating, and reviews side-by-side.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. wireless earbuds with noise cancellation"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={myPrice}
                onChange={(e) => setMyPrice(e.target.value)}
                placeholder="Your price (USD)"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
              <Button onClick={handleAnalyze} disabled={loading || !query.trim()}>
                {loading ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="mr-1 h-3.5 w-3.5" />
                )}
                {t("বিশ্লেষণ / Analyze")}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Price is optional — if blank, we compare against the median competitor price.
            </p>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching the web, extracting products, and scoring relevance…
            </CardContent>
          </Card>
        )}

        {!loading && !result && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Enter a product to see semantically-matched competitors and a side-by-side comparison.
            </CardContent>
          </Card>
        )}

        {!loading && result && products.length === 0 && (
          <Card className="border-warning/40">
            <CardHeader>
              <CardTitle className="text-base">No strong matches</CardTitle>
              <CardDescription>
                Scanned {result.sources_scanned} sources but no products passed the relevance
                threshold. Try a more specific product name (e.g. brand + model).
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && result && products.length > 0 && (
          <>
            {/* KPIs */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={Package}
                label="Relevant competitors"
                value={result.stats.count}
                hint={`${result.sources_scanned} sources scanned`}
              />
              <KpiCard
                icon={DollarSign}
                label={baseline ? `Your price${result.baseline_source === "median" ? " (median)" : ""}` : "Median price"}
                value={fmtUsd(baseline ?? result.stats.median_price)}
                hint={`Range ${fmtUsd(result.stats.min_price)} – ${fmtUsd(result.stats.max_price)}`}
              />
              <KpiCard
                icon={Star}
                label="Avg rating"
                value={result.stats.avg_rating != null ? result.stats.avg_rating.toFixed(2) : "—"}
                hint="across competitors"
              />
              <KpiCard
                icon={MessageSquare}
                label="Total reviews"
                value={result.stats.total_reviews.toLocaleString()}
                hint="market signal volume"
              />
            </div>

            {/* Positioning summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Market positioning</CardTitle>
                <CardDescription>
                  How {result.stats.count} competitor products compare to{" "}
                  {result.baseline_source === "user" ? "your price" : "the median price"} of{" "}
                  <span className="font-medium">{fmtUsd(baseline)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border bg-emerald-500/5 p-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                      <TrendingDown className="h-3.5 w-3.5" /> Cheaper than you
                    </div>
                    <div className="mt-1 text-2xl font-semibold">{result.stats.cheaper}</div>
                  </div>
                  <div className="rounded-md border bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                      <Minus className="h-3.5 w-3.5" /> Similar (±10%)
                    </div>
                    <div className="mt-1 text-2xl font-semibold">{result.stats.similar}</div>
                  </div>
                  <div className="rounded-md border bg-rose-500/5 p-3">
                    <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
                      <TrendingUp className="h-3.5 w-3.5" /> Pricier than you
                    </div>
                    <div className="mt-1 text-2xl font-semibold">{result.stats.pricier}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid gap-3 lg:grid-cols-2">
              {priceChartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Price vs your baseline</CardTitle>
                    <CardDescription>
                      Dashed line = {result.baseline_source === "user" ? "your" : "median"} price ({fmtUsd(baseline)})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={priceChartData} layout="vertical" margin={{ left: 8, right: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                        <XAxis type="number" fontSize={11} tickFormatter={(v) => `$${v}`} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={160}
                          fontSize={10}
                          tickFormatter={(v: string) => (v.length > 26 ? v.slice(0, 25) + "…" : v)}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                          formatter={(v: number) => [`$${v}`, "Price"]}
                        />
                        {baseline != null && (
                          <ReferenceLine
                            x={baseline}
                            stroke="hsl(var(--primary))"
                            strokeDasharray="4 4"
                            label={{
                              value: result.baseline_source === "user" ? "You" : "Median",
                              position: "top",
                              fontSize: 10,
                              fill: "hsl(var(--primary))",
                            }}
                          />
                        )}
                        <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                          {priceChartData.map((d, i) => (
                            <Cell key={i} fill={COMP_COLORS[d.comparison]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {scatterData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Price vs rating</CardTitle>
                    <CardDescription>
                      Bubble size = review volume. Spot under-priced high-rated products.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Price"
                          fontSize={11}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Rating"
                          domain={[0, 5]}
                          fontSize={11}
                        />
                        <ZAxis type="number" dataKey="z" range={[40, 400]} />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                          formatter={(value: number, name: string) =>
                            name === "Price" ? [`$${value}`, "Price"] : [value, name]
                          }
                          labelFormatter={() => ""}
                        />
                        {baseline != null && (
                          <ReferenceLine
                            x={baseline}
                            stroke="hsl(var(--primary))"
                            strokeDasharray="4 4"
                          />
                        )}
                        <Scatter data={scatterData}>
                          {scatterData.map((d, i) => (
                            <Cell key={i} fill={COMP_COLORS[d.comparison]} fillOpacity={0.75} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Product comparison list */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top competitor products</CardTitle>
                <CardDescription>
                  Ranked by semantic relevance to your search
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {products.map((p, i) => (
                  <div
                    key={`${p.source_url}-${i}`}
                    className="flex items-start gap-3 rounded-md border p-3 transition hover:bg-muted/30"
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-md border object-cover"
                        loading="lazy"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {p.brand && (
                              <Badge variant="secondary" className="text-[10px]">
                                {p.brand}
                              </Badge>
                            )}
                            <span className="truncate text-sm font-medium">{p.title}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="truncate">{p.domain}</span>
                            <Stars value={p.rating} />
                            {typeof p.review_count === "number" && (
                              <span>{p.review_count.toLocaleString()} reviews</span>
                            )}
                            <span className="text-[10px]">
                              {Math.round(p.similarity * 100)}% match
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold tabular-nums">
                            {fmtUsd(p.price_usd)}
                          </div>
                          <div className="mt-0.5">
                            <CompBadge c={p.comparison} delta={p.price_delta_pct} />
                          </div>
                        </div>
                      </div>
                    </div>
                    {p.source_url && (
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 self-center rounded-md border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Open product page"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
