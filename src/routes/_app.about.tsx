import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/about")({
  head: () => ({ meta: [{ title: "About — EasyBusiness AI" }] }),
  component: AboutPage,
});

const stages = [
  { step: "1", title: "Data Sources", desc: "Shopify, WooCommerce, marketplaces, reviews, competitor sites" },
  { step: "2", title: "Processing", desc: "Cleaning, normalization, and enrichment of raw signals" },
  { step: "3", title: "Vector Storage", desc: "Embeddings stored for semantic retrieval and similarity search" },
  { step: "4", title: "Gemini + RAG", desc: "Retrieval-augmented generation grounded in your store data" },
  { step: "5", title: "AI Insights Dashboard", desc: "Clean cards, charts, and an assistant for daily decisions" },
];

const stack = ["Next.js", "Supabase", "Gemini API", "GraphDB", "RAG Architecture", "Firecrawl", "Playwright"];

function AboutPage() {
  return (
    <>
      <DashboardTopbar title="About / Architecture" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How EasyBusiness AI works</CardTitle>
            <CardDescription>
              End-to-end pipeline from raw commerce signals to actionable insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5">
              {stages.map((s, i) => (
                <div key={s.step} className="relative">
                  <div className="rounded-md border bg-card p-4">
                    <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {s.step}
                    </div>
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="hidden md:absolute md:right-[-10px] md:top-1/2 md:block md:h-px md:w-5 md:bg-border" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Technology stack</CardTitle>
            <CardDescription>Built on modern, reliable tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stack.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">About this demo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            EasyBusiness AI is designed for small ecommerce teams who need clear answers without
            wrestling spreadsheets. This dashboard shows sample data — connect your real store to
            see live insights.
          </CardContent>
        </Card>
      </main>
    </>
  );
}
