import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      { title: "EasyBusiness AI — ছোট ব্যবসার জন্য কমার্স ইন্টেলিজেন্স / Commerce Intelligence for SMEs" },
      {
        name: "description",
        content:
          "ছোট ব্যবসার জন্য এআই-চালিত কমার্স ইন্টেলিজেন্স ড্যাশবোর্ড। AI-powered commerce intelligence dashboard for SMEs.",
      },
      { property: "og:title", content: "EasyBusiness AI — কমার্স ইন্টেলিজেন্স / Commerce Intelligence" },
      { property: "og:description", content: "ছোট ব্যবসার জন্য এআই-চালিত ড্যাশবোর্ড / AI-powered commerce intelligence dashboard for SMEs." },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: Brain,
    titleBn: "এআই বিজনেস ইনসাইট",
    title: "AI Business Insights",
    descBn: "সাপ্তাহিক সংখ্যা পরিচালিত কারণগুলোর সহজ ভাষায় সারাংশ।",
    desc: "Plain-language summaries of what's driving your numbers each week.",
  },
  {
    icon: TrendingUp,
    titleBn: "চাহিদা পূর্বাভাস",
    title: "Demand Forecasting",
    descBn: "সঠিক সময়ে সঠিক পরিমাণ অর্ডার করার জন্য SKU অনুযায়ী বিক্রয় পূর্বাভাস।",
    desc: "Predict sales by SKU so you order the right quantity at the right time.",
  },
  {
    icon: Search,
    titleBn: "প্রতিযোগী ট্র্যাকিং",
    title: "Competitor Tracking",
    descBn: "স্প্রেডশিট ছাড়াই প্রতিযোগীর দাম ও রেটিং মনিটর করুন।",
    desc: "Monitor competitor pricing and ratings without manual spreadsheets.",
  },
  {
    icon: PackageSearch,
    titleBn: "ইনভেন্টরি সতর্কতা",
    title: "Inventory Alerts",
    descBn: "মার্জিন হারানোর আগে কম স্টক ও অতিরিক্ত স্টক ধরুন।",
    desc: "Catch low stock and overstock risks before they cost you margin.",
  },
  {
    icon: MessageSquare,
    titleBn: "এআই কমার্স সহকারী",
    title: "AI Commerce Assistant",
    descBn: "‘বিক্রয় কেন কমছে?’ এর মতো সহজ প্রশ্ন করুন, উত্তর পান।",
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
            <span className="text-sm font-semibold">ইজিবিজনেস / EasyBusiness AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">ফিচার / Features</a>
            <a href="#how" className="hover:text-foreground">কীভাবে কাজ করে / How it works</a>
            <Link to="/about" className="hover:text-foreground">সম্পর্কে / About</Link>
          </nav>
          <Button asChild size="sm">
            <Link to="/dashboard">ড্যাশবোর্ড / Open Dashboard</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            ছোট ইকমার্স টিমের জন্য তৈরি / Built for small ecommerce teams
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            ছোট ব্যবসার জন্য এআই-চালিত কমার্স ইন্টেলিজেন্স
          </h1>
          <h2 className="mt-2 text-xl font-medium tracking-tight text-muted-foreground md:text-2xl">
            AI-powered commerce intelligence for SMEs
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            মার্কেট ট্রেন্ড, গ্রাহক আচরণ, ইনভেন্টরি ঝুঁকি এবং প্রতিযোগীর পদক্ষেপ বুঝুন — একটি সহজ ড্যাশবোর্ডে।
            <br />
            Understand market trends, customer behavior, inventory risks, and competitor moves — with clear AI-generated recommendations.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/dashboard">
                শুরু করুন / Get Started <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">ড্যাশবোর্ড দেখুন / View Dashboard</Link>
            </Button>
          </div>
        </div>

        {/* Preview card */}
        <div className="mx-auto mt-16 max-w-5xl rounded-xl border bg-card p-2 shadow-sm">
          <div className="rounded-lg bg-muted/40 p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["মোট বিক্রয় / Total Sales", "$248,920", "+12.4%"],
                ["রাজস্ব / Revenue", "$182,540", "+8.1%"],
                ["ইনভেন্টরি ঝুঁকি / Inventory Risk", "৭ items", "review"],
                ["ট্রেন্ডিং / Trending", "১২ SKUs", "+৪ this wk"],
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
              স্মার্ট স্টোর চালানোর সব কিছু
            </h2>
            <h3 className="text-lg font-medium text-muted-foreground">
              Everything you need to run a smarter store
            </h3>
            <p className="mt-2 text-muted-foreground">
              বাজওয়ার্ড নয়, ব্যবহারিক টুল। দ্রুত উত্তর প্রয়োজন এমন SME টিমের জন্য ডিজাইন করা।
              <br />
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
                  <CardTitle className="text-base">
                    {f.titleBn} <span className="text-muted-foreground font-normal">/ {f.title}</span>
                  </CardTitle>
                  <CardDescription>
                    {f.descBn}
                    <br />
                    <span className="text-xs opacity-80">{f.desc}</span>
                  </CardDescription>
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
                কীভাবে কাজ করে
              </h2>
              <h3 className="text-lg font-medium text-muted-foreground">How it works</h3>
              <p className="mt-2 text-muted-foreground">
                আমরা আপনার স্টোরের সাথে সংযুক্ত হই, মার্কেট ডেটা দিয়ে সমৃদ্ধ করি, এবং RAG দ্বারা চালিত কার্যকর সুপারিশে অনুবাদ করি।
                <br />
                We connect to your store, enrich it with market data, and translate it into actionable recommendations powered by retrieval-augmented AI.
              </p>
            </div>
            <ol className="space-y-3 text-sm">
              {[
                ["আপনার স্টোর ডেটা সোর্স সংযুক্ত করুন", "Connect your store data sources"],
                ["ভেক্টর ডেটাবেসে সিগন্যাল প্রসেস ও সংরক্ষণ", "We process & store signals in a vector database"],
                ["Gemini + RAG পাইপলাইন ইনসাইট তৈরি করে", "Gemini + RAG pipeline generates insights"],
                ["আপনি পরিষ্কার ড্যাশবোর্ড ও এআই সহকারী পান", "You get a clean dashboard and an AI assistant"],
              ].map(([bn, en], i) => (
                <li key={en} className="flex gap-3 rounded-md border bg-card p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {i + 1}
                  </span>
                  <span>
                    {bn}
                    <span className="ml-1 text-xs text-muted-foreground">/ {en}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            আপনার স্টোর স্পষ্টভাবে দেখতে প্রস্তুত?
          </h2>
          <h3 className="text-lg font-medium text-muted-foreground">
            Ready to see your store clearly?
          </h3>
          <p className="mt-2 text-muted-foreground">
            নমুনা ডেটা সহ ডেমো ড্যাশবোর্ডটি দেখুন। / Explore the demo dashboard with sample ecommerce data.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/dashboard">ড্যাশবোর্ড খুলুন / Open the Dashboard</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} EasyBusiness AI</span>
          <span>SME-দের জন্য নির্মিত · ডেমো ডেটা / Built for SMEs · Demo data shown throughout</span>
        </div>
      </footer>
    </div>
  );
}
