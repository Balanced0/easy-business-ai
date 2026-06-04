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

function CompetitorsPage() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    const res = await authedFetch("/api/competitors/list");
    if (!res.ok) return;
    const json = await res.json();
    setCompetitors(json.competitors ?? []);
    setProducts(json.products ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDiscover = async () => {
    if (!query.trim()) return;
    setDiscovering(true);
    try {
      const res = await authedFetch("/api/competitors/discover", {
        method: "POST",
        body: JSON.stringify({ seedUrl: query.trim(), limit: 25 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "discovery failed");
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
                "একটি seed URL দিন (ক্যাটাগরি পেজ বা ইকমার্স এন্ট্রি পয়েন্ট); ক্রল করে প্রতিযোগী আবিষ্কার হবে। / Paste a seed URL (category page or ecommerce entry point) — crawl-based discovery will expand from there.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="https://example-shop.com/category/earbuds"
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
                    {c.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleScrape(c, "scrape")}
                        disabled={scrapingId === c.id}
                      >
                        {scrapingId === c.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1 h-3.5 w-3.5" />
                        )}
                        {t("পেজ স্ক্রেপ / Scrape page")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleScrape(c, "crawl")}
                        disabled={scrapingId === c.id}
                      >
                        {scrapingId === c.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1 h-3.5 w-3.5" />
                        )}
                        {t("ক্রল / Crawl site")}
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
