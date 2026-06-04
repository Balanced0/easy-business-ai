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
import { Loader2, Search, Globe, TrendingUp, Package, Store } from "lucide-react";
import { useT } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_app/competitors")({
  head: () => ({ meta: [{ title: "প্রতিযোগী / Competitors — EasyBusiness AI" }] }),
  component: CompetitorsPage,
});

type Competitor = {
  id: string;
  name: string;
  domain: string;
  url: string;
  description: string | null;
  product_count?: number;
  confidence?: "high" | "medium" | "low";
};

type PriceDist = Record<
  "under_25" | "25_100" | "100_500" | "500_2000" | "over_2000" | "unknown",
  number
>;

type Graph = {
  priceDistribution: PriceDist;
  topBrands: Array<{ brand: string; count: number }>;
  clusters: Array<{
    key: string;
    brand?: string;
    priceBucket: string;
    category: string;
    size: number;
    domains: string[];
    sampleTitles: string[];
  }>;
};

type DiscoverResponse = {
  ok: boolean;
  count: number;
  productsInserted: number;
  competitors: Competitor[];
  totals?: { domains: number; products: number };
  category?: string;
  graph?: Graph;
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

const PRICE_LABELS: Record<keyof PriceDist, string> = {
  under_25: "<$25",
  "25_100": "$25–100",
  "100_500": "$100–500",
  "500_2000": "$500–2k",
  over_2000: ">$2k",
  unknown: "Unknown",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 200 80% 55%))",
  "hsl(var(--chart-3, 30 90% 55%))",
  "hsl(var(--chart-4, 280 70% 60%))",
  "hsl(var(--chart-5, 150 60% 50%))",
  "hsl(var(--muted-foreground))",
];

function CompetitorsPage() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [result, setResult] = useState<DiscoverResponse | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");

  const handleDiscover = async () => {
    if (!query.trim()) return;
    setDiscovering(true);
    setResult(null);
    try {
      const res = await authedFetch("/api/competitors/discover", {
        method: "POST",
        body: JSON.stringify({ query: query.trim() }),
      });
      const json = (await res.json()) as DiscoverResponse;
      if (!res.ok) throw new Error(json.error || "discovery failed");
      setResult(json);
      setLastQuery(query.trim());
      if ((json.count ?? 0) === 0) {
        toast.warning("No competitors found. Try a different product name.");
      } else {
        toast.success(
          `Found ${json.count} competitors with ${json.totals?.products ?? 0} products`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  };

  const competitors = result?.competitors ?? [];
  const graph = result?.graph;

  const competitorChartData = useMemo(
    () =>
      competitors
        .slice(0, 10)
        .map((c) => ({ name: c.domain, products: c.product_count ?? 0 })),
    [competitors],
  );

  const priceChartData = useMemo(() => {
    if (!graph?.priceDistribution) return [];
    return (Object.keys(PRICE_LABELS) as Array<keyof PriceDist>)
      .filter((k) => k !== "unknown" || graph.priceDistribution[k] > 0)
      .map((k) => ({ bucket: PRICE_LABELS[k], count: graph.priceDistribution[k] }));
  }, [graph]);

  const brandChartData = useMemo(
    () =>
      (graph?.topBrands ?? [])
        .slice(0, 8)
        .map((b) => ({ brand: b.brand, count: b.count })),
    [graph],
  );

  const totalProducts = result?.totals?.products ?? 0;
  const totalDomains = result?.totals?.domains ?? competitors.length;
  const avgProducts = competitors.length
    ? Math.round((totalProducts / competitors.length) * 10) / 10
    : 0;

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
                "একটি পণ্যের নাম লিখুন (যেমন: wireless earbuds); সিস্টেম স্বয়ংক্রিয়ভাবে প্রতিযোগী খুঁজে দেবে। / Enter a product name (e.g. wireless earbuds) — the system scrapes the web to find competitors and surface market insights.",
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
            </div>
          </CardContent>
        </Card>

        {discovering && (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scraping the web for competitors…
            </CardContent>
          </Card>
        )}

        {!discovering && !result && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Enter a product name above to discover competitors and market insights.
            </CardContent>
          </Card>
        )}

        {!discovering && result && competitors.length === 0 && (
          <Card className="border-warning/40 bg-warning/[0.04]">
            <CardHeader>
              <CardTitle className="text-base">No competitors found</CardTitle>
              <CardDescription>
                The scrape returned no valid product pages for{" "}
                <span className="font-medium">{lastQuery}</span>. Try a more specific
                product (e.g. "bluetooth earbuds" instead of "audio").
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!discovering && result && competitors.length > 0 && (
          <>
            {/* KPI tiles */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5" /> Competitors
                  </CardDescription>
                  <CardTitle className="text-2xl">{totalDomains}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> Products extracted
                  </CardDescription>
                  <CardTitle className="text-2xl">{totalProducts}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Avg products / competitor
                  </CardDescription>
                  <CardTitle className="text-2xl">{avgProducts}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Charts row */}
            <div className="grid gap-3 lg:grid-cols-2">
              {competitorChartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top competitors by product volume</CardTitle>
                    <CardDescription>
                      Domains ranked by number of products found for "{lastQuery}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={competitorChartData} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" allowDecimals={false} fontSize={11} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          fontSize={11}
                          tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 17) + "…" : v)}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="products" radius={[0, 4, 4, 0]}>
                          {competitorChartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {priceChartData.some((d) => d.count > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Price distribution</CardTitle>
                    <CardDescription>
                      How products in this market are priced (USD-normalized)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={priceChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="bucket" fontSize={11} />
                        <YAxis allowDecimals={false} fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {brandChartData.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top brands</CardTitle>
                    <CardDescription>Most-mentioned brands across competitor catalogs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={brandChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="brand" fontSize={11} />
                        <YAxis allowDecimals={false} fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Competitor cards */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Competitors</h2>
                <Badge variant="secondary">{competitors.length}</Badge>
                {result.category && (
                  <Badge variant="outline" className="text-[10px]">
                    {result.category}
                  </Badge>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {competitors.map((c) => (
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
                          {c.product_count ?? 0} products
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {c.confidence && (
                        <Badge
                          variant={c.confidence === "high" ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {c.confidence} confidence
                        </Badge>
                      )}
                      {c.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {c.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Product clusters insight */}
            {graph?.clusters && graph.clusters.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Product clusters</CardTitle>
                  <CardDescription>
                    Groups of similar products by brand, price band, and category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {graph.clusters.slice(0, 8).map((cl) => (
                    <div
                      key={cl.key}
                      className="rounded-md border bg-muted/30 p-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">{cl.brand ?? "unknown brand"}</Badge>
                        <Badge variant="outline">
                          {PRICE_LABELS[cl.priceBucket as keyof PriceDist] ?? cl.priceBucket}
                        </Badge>
                        <Badge variant="outline">{cl.category}</Badge>
                        <span className="ml-auto text-muted-foreground">
                          {cl.size} products · {cl.domains.length} domains
                        </span>
                      </div>
                      {cl.sampleTitles.length > 0 && (
                        <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-muted-foreground">
                          {cl.sampleTitles.slice(0, 3).map((s, i) => (
                            <li key={i} className="truncate">
                              {s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}
