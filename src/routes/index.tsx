import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brain,
  TrendingUp,
  Search,
  PackageSearch,
  MessageSquare,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EasyBusiness AI — Commerce Intelligence for SMEs" },
      {
        name: "description",
        content:
          "AI-powered commerce intelligence dashboard for SMEs. Track sales, inventory, competitors, and customer sentiment in one place.",
      },
      { property: "og:title", content: "EasyBusiness AI — Commerce Intelligence" },
      { property: "og:description", content: "AI-powered commerce intelligence dashboard for SMEs." },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: Brain,
    title: "AI Business Insights",
    desc: "Plain-language summaries of what's driving your numbers each week.",
  },
  {
    icon: TrendingUp,
    title: "Demand Forecasting",
    desc: "Predict sales by SKU so you order the right quantity at the right time.",
  },
  {
    icon: Search,
    title: "Competitor Tracking",
    desc: "Monitor competitor pricing and ratings without manual spreadsheets.",
  },
  {
    icon: PackageSearch,
    title: "Inventory Alerts",
    desc: "Catch low stock and overstock risks before they cost you margin.",
  },
  {
    icon: MessageSquare,
    title: "AI Commerce Assistant",
    desc: "Ask plain questions like 'why are sales dropping?' and get answers.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">EasyBusiness AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <Link to="/about" className="hover:text-foreground">About</Link>
          </nav>
          <Button asChild size="sm">
            <Link to="/dashboard">Open Dashboard</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Built for small ecommerce teams
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            AI-powered commerce intelligence for SMEs
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Understand market trends, customer behavior, inventory risks, and competitor moves —
            with clear AI-generated recommendations, in one simple dashboard.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/dashboard">
                Get Started <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">View Dashboard</Link>
            </Button>
          </div>
        </div>

        {/* Preview card */}
        <div className="mx-auto mt-16 max-w-5xl rounded-xl border bg-card p-2 shadow-sm">
          <div className="rounded-lg bg-muted/40 p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Total Sales", "$248,920", "+12.4%"],
                ["Revenue", "$182,540", "+8.1%"],
                ["Inventory Risk", "7 items", "review"],
                ["Trending", "12 SKUs", "+4 this wk"],
              ].map(([l, v, d]) => (
                <div key={l} className="rounded-md border bg-card p-3 text-left">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</div>
                  <div className="mt-1 text-lg font-semibold">{v}</div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid h-32 grid-cols-12 items-end gap-1.5">
              {[40, 55, 48, 62, 70, 58, 72, 80, 76, 88, 92, 100].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="rounded-sm bg-primary/80"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Everything you need to run a smarter store
            </h2>
            <p className="mt-2 text-muted-foreground">
              Practical tools, not buzzwords. Designed for SME teams who need answers fast.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border bg-card">
                <CardHeader>
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription>{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid items-start gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                How it works
              </h2>
              <p className="mt-2 text-muted-foreground">
                We connect to your store, enrich it with market data, and translate it into
                actionable recommendations powered by retrieval-augmented AI.
              </p>
            </div>
            <ol className="space-y-3 text-sm">
              {[
                "Connect your store data sources",
                "We process & store signals in a vector database",
                "Gemini + RAG pipeline generates insights",
                "You get a clean dashboard and an AI assistant",
              ].map((step, i) => (
                <li key={step} className="flex gap-3 rounded-md border bg-card p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Ready to see your store clearly?</h2>
          <p className="mt-2 text-muted-foreground">
            Explore the demo dashboard with sample ecommerce data.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/dashboard">Open the Dashboard</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} EasyBusiness AI</span>
          <span>Built for SMEs · Demo data shown throughout</span>
        </div>
      </footer>
    </div>
  );
}
