import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { useLanguage, useT } from "@/hooks/use-language";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
function toBnDigits(s: string) {
  return s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}
function fmtNum(n: number, lang: "bn" | "en") {
  const s = Math.round(n).toLocaleString("en-US");
  return lang === "bn" ? toBnDigits(s) : s;
}
function fmtSigned(n: number, lang: "bn" | "en", digits = 1) {
  const sign = n >= 0 ? "+" : "−";
  const s = Math.abs(n).toFixed(digits);
  return sign + (lang === "bn" ? toBnDigits(s) : s);
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function useAnimatedHero() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2200);
    return () => clearInterval(id);
  }, []);
  return tick;
}

function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();
  return (
    <button
      onClick={toggleLang}
      className="flex h-8 items-center overflow-hidden rounded-md border text-xs"
    >
      <span
        className={`${lang === "bn" ? "bg-primary text-primary-foreground rounded py-[4px] px-[8px] mx-[4px]" : "px-2 py-1 text-muted-foreground rounded-xl"}`}
      >
        বাং
      </span>
      <span
        className={`${lang === "en" ? "bg-primary text-primary-foreground rounded py-[4px] px-[8px] mx-[4px]" : "px-2 py-1 text-muted-foreground rounded-xl"}`}
      >
        En
      </span>
    </button>
  );
}

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
    descBn: "'বিক্রয় কেন কমছে?' এর মতো সহজ প্রশ্ন করুন, উত্তর পান।",
    desc: "Ask plain questions like 'why are sales dropping?' and get answers.",
  },
];

function LandingPage() {
  const { lang } = useLanguage();
  const t = useT();
  const tick = useAnimatedHero();

  // Random bars: each bar gets a pseudo-random height every tick.
  const bars = Array.from({ length: 12 }, (_, i) => {
    const r = seededRandom(tick * 17 + i * 31);
    return 20 + r * 80; // 20–100%
  });

  // Card numbers jump to random values around a base every tick.
  const totalSales = 240000 + seededRandom(tick * 7) * 16000;
  const revenue = 175000 + seededRandom(tick * 11 + 1) * 16000;
  const inventoryRisk = Math.max(3, Math.round(5 + seededRandom(tick * 13 + 2) * 6));
  const trending = Math.max(8, Math.round(9 + seededRandom(tick * 19 + 3) * 8));
  const salesDelta = 10 + seededRandom(tick * 23 + 4) * 6;
  const revenueDelta = 6 + seededRandom(tick * 29 + 5) * 5;
  const trendingDelta = Math.max(1, Math.round(2 + seededRandom(tick * 37 + 6) * 5));

  const cards: Array<[string, string, string]> = [
    [
      "মোট বিক্রয় / Total Sales",
      `$${fmtNum(totalSales, lang)}`,
      `${fmtSigned(salesDelta, lang)}%`,
    ],
    [
      "রাজস্ব / Revenue",
      `$${fmtNum(revenue, lang)}`,
      `${fmtSigned(revenueDelta, lang)}%`,
    ],
    [
      "ইনভেন্টরি ঝুঁকি / Inventory Risk",
      `${fmtNum(inventoryRisk, lang)} ${lang === "bn" ? "items" : "items"}`,
      t("পর্যালোচনা / review"),
    ],
    [
      "ট্রেন্ডিং / Trending",
      `${fmtNum(trending, lang)} SKUs`,
      `${fmtSigned(trendingDelta, lang, 0)} ${lang === "bn" ? "this wk" : "this wk"}`,
    ],
  ];

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a1a]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#1e1e5a] text-white shadow-[0_4px_20px_-4px_rgba(79,70,229,0.6)]">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span
              className="text-base font-medium tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("ইজিবিজনেস / EasyBusiness AI")}
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-white/60 md:flex">
            <a href="#features" className="transition-colors hover:text-white">{t("ফিচার / Features")}</a>
            <a href="#how" className="transition-colors hover:text-white">{t("কীভাবে কাজ করে / How it works")}</a>
            <Link to="/about" className="transition-colors hover:text-white">{t("সম্পর্কে / About")}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button asChild size="sm" className="bg-white text-[#0a0a1a] hover:bg-white/90">
              <Link to="/dashboard">{t("ড্যাশবোর্ড / Open Dashboard")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — Midnight Indigo bento */}
      <section className="relative overflow-hidden bg-[#0a0a1a] text-white">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[#4f46e5] opacity-30 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-[#1e1e5a] opacity-50 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7c7cff] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#a5b4fc]" />
              </span>
              {t("ছোট ইকমার্স টিমের জন্য তৈরি / Built for small ecommerce teams")}
            </div>
            <h1
              className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {lang === "bn" ? (
                <>
                  ছোট ব্যবসার জন্য{" "}
                  <span className="bg-gradient-to-r from-[#a5b4fc] via-white to-[#818cf8] bg-clip-text text-transparent">
                    এআই-চালিত
                  </span>{" "}
                  কমার্স ইন্টেলিজেন্স
                </>
              ) : (
                <>
                  Commerce intelligence,{" "}
                  <span className="bg-gradient-to-r from-[#a5b4fc] via-white to-[#818cf8] bg-clip-text text-transparent">
                    rewritten
                  </span>{" "}
                  for small teams
                </>
              )}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/65 md:text-lg">
              {lang === "bn"
                ? "মার্কেট ট্রেন্ড, গ্রাহক আচরণ, ইনভেন্টরি ঝুঁকি এবং প্রতিযোগীর পদক্ষেপ — সব এক জায়গায়, পরিষ্কার AI সুপারিশ সহ।"
                : "Market trends, customer behavior, inventory risk, and competitor moves — unified into clear AI recommendations."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[#4f46e5] text-white shadow-[0_10px_40px_-12px_rgba(79,70,229,0.8)] hover:bg-[#6366f1]"
              >
                <Link to="/dashboard">
                  {t("শুরু করুন / Get Started")} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/dashboard">{t("ড্যাশবোর্ড দেখুন / View Dashboard")}</Link>
              </Button>
            </div>
          </div>

          {/* Bento grid */}
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-6 gap-3 md:grid-cols-12 md:gap-4">
            {/* Big metric: Total Sales */}
            <div className="col-span-6 row-span-2 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-sm md:col-span-7">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/50">
                <span>{t("মোট বিক্রয় / Total Sales")}</span>
                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-300">
                  {fmtSigned(salesDelta, lang)}%
                </span>
              </div>
              <div
                className="mt-2 text-4xl font-semibold tabular-nums tracking-tight md:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ${fmtNum(totalSales, lang)}
              </div>
              <div className="mt-5 grid h-28 grid-cols-12 items-end gap-1.5">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="rounded-sm bg-gradient-to-t from-[#4f46e5] to-[#a5b4fc] transition-[height] duration-[2200ms] ease-in-out"
                  />
                ))}
              </div>
            </div>

            {/* Revenue */}
            <div className="col-span-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm md:col-span-5">
              <div className="text-[11px] uppercase tracking-wider text-white/50">
                {t("রাজস্ব / Revenue")}
              </div>
              <div
                className="mt-1 text-2xl font-semibold tabular-nums md:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ${fmtNum(revenue, lang)}
              </div>
              <div className="mt-1 text-xs text-emerald-300 tabular-nums">
                {fmtSigned(revenueDelta, lang)}%
              </div>
            </div>

            {/* Trending SKUs */}
            <div className="col-span-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#4f46e5]/20 to-transparent p-4 backdrop-blur-sm md:col-span-5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/60">
                <TrendingUp className="h-3 w-3" />
                {t("ট্রেন্ডিং / Trending")}
              </div>
              <div
                className="mt-1 text-2xl font-semibold tabular-nums md:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {fmtNum(trending, lang)} SKUs
              </div>
              <div className="mt-1 text-xs text-white/50 tabular-nums">
                {fmtSigned(trendingDelta, lang, 0)} {lang === "bn" ? "this wk" : "this wk"}
              </div>
            </div>

            {/* AI Insight card */}
            <div className="col-span-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm md:col-span-7">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4f46e5]/20 text-[#a5b4fc]">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/50">
                    {lang === "bn" ? "এআই ইনসাইট" : "AI Insight"}
                  </div>
                  <p className="mt-1 text-sm text-white/80">
                    {lang === "bn"
                      ? "গত সপ্তাহে কটন টি-শার্টের চাহিদা ১৮% বেড়েছে — স্টক বাড়ানোর সময়।"
                      : "Cotton tees demand up 18% week-over-week — time to restock."}
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory risk */}
            <div className="col-span-3 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4 backdrop-blur-sm md:col-span-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-200/80">
                <PackageSearch className="h-3 w-3" />
                {t("ইনভেন্টরি ঝুঁকি / Risk")}
              </div>
              <div
                className="mt-1 text-2xl font-semibold tabular-nums md:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {fmtNum(inventoryRisk, lang)}
              </div>
              <div className="mt-1 text-xs text-white/50">
                {lang === "bn" ? "items" : "items"}
              </div>
            </div>

            {/* Assistant pill */}
            <div className="col-span-3 flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-4 backdrop-blur-sm md:col-span-2">
              <MessageSquare className="h-4 w-4 text-[#a5b4fc]" />
              <div className="text-[11px] leading-snug text-white/70">
                {lang === "bn" ? "জিজ্ঞাসা করুন" : "Ask the AI"}
                <ArrowRight className="ml-1 inline h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {lang === "bn" ? "স্মার্ট স্টোর চালানোর সব কিছু" : "Everything you need to run a smarter store"}
            </h2>
            <h3 className="text-lg font-medium text-muted-foreground">
              {lang === "bn" ? "Everything you need to run a smarter store" : "স্মার্ট স্টোর চালানোর সব কিছু"}
            </h3>
            <p className="mt-2 text-muted-foreground">
              {lang === "bn"
                ? "বাজওয়ার্ড নয়, ব্যবহারিক টুল। দ্রুত উত্তর প্রয়োজন এমন SME টিমের জন্য ডিজাইন করা।"
                : "Practical tools, not buzzwords. Designed for SME teams who need answers fast."}
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
                    {lang === "bn" ? f.titleBn : f.title}
                  </CardTitle>
                  <CardDescription>
                    {lang === "bn" ? f.descBn : f.desc}
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
                {lang === "bn" ? "কীভাবে কাজ করে" : "How it works"}
              </h2>
              <h3 className="text-lg font-medium text-muted-foreground">
                {lang === "bn" ? "How it works" : "কীভাবে কাজ করে"}
              </h3>
              <p className="mt-2 text-muted-foreground">
                {lang === "bn"
                  ? "আমরা আপনার স্টোরের সাথে সংযুক্ত হই, মার্কেট ডেটা দিয়ে সমৃদ্ধ করি, এবং RAG দ্বারা চালিত কার্যকর সুপারিশে অনুবাদ করি।"
                  : "We connect to your store, enrich it with market data, and translate it into actionable recommendations powered by retrieval-augmented AI."}
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
                    {lang === "bn" ? bn : en}
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
            {lang === "bn" ? "আপনার স্টোর স্পষ্টভাবে দেখতে প্রস্তুত?" : "Ready to see your store clearly?"}
          </h2>
          <h3 className="text-lg font-medium text-muted-foreground">
            {lang === "bn" ? "Ready to see your store clearly?" : "আপনার স্টোর স্পষ্টভাবে দেখতে প্রস্তুত?"}
          </h3>
          <p className="mt-2 text-muted-foreground">
            {t("নমুনা ডেটা সহ ডেমো ড্যাশবোর্ডটি দেখুন। / Explore the demo dashboard with sample ecommerce data.")}
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/dashboard">{t("ড্যাশবোর্ড খুলুন / Open the Dashboard")}</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} EasyBusiness AI</span>
          <span>{t("SME-দের জন্য নির্মিত / Built for SMEs")}</span>
        </div>
      </footer>
    </div>
  );
}
