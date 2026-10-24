import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Brain,
  TrendingUp,
  PackageSearch,
  MessageSquare,
  BarChart3,
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

function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();
  return (
    <button
      onClick={toggleLang}
      className="flex h-8 items-center overflow-hidden rounded-md border border-white/15 bg-white/5 text-xs"
    >
      <span
        className={`${lang === "bn" ? "bg-white text-[#0a0a1a] rounded py-[4px] px-[8px] mx-[4px]" : "px-2 py-1 text-white/60"}`}
      >
        বাং
      </span>
      <span
        className={`${lang === "en" ? "bg-white text-[#0a0a1a] rounded py-[4px] px-[8px] mx-[4px]" : "px-2 py-1 text-white/60"}`}
      >
        En
      </span>
    </button>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EasyBusiness AI: ছোট ব্যবসার জন্য কমার্স ইন্টেলিজেন্স / Commerce Intelligence for SMEs" },
      {
        name: "description",
        content:
          "ছোট ব্যবসার জন্য এআই-চালিত কমার্স ইন্টেলিজেন্স ড্যাশবোর্ড। AI-powered commerce intelligence dashboard for SMEs.",
      },
      { property: "og:title", content: "EasyBusiness AI: কমার্স ইন্টেলিজেন্স / Commerce Intelligence" },
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
    featured: true,
  },
  {
    icon: TrendingUp,
    titleBn: "চাহিদা পূর্বাভাস",
    title: "Demand Forecasting",
    descBn: "সঠিক সময়ে সঠিক পরিমাণ অর্ডার করার জন্য SKU অনুযায়ী বিক্রয় পূর্বাভাস।",
    desc: "Predict sales by SKU so you order the right quantity at the right time.",
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

// Realistic, static illustrative figures clearly designated as sample data
const sampleBars = [38, 48, 56, 62, 54, 70, 76, 84, 80, 89, 93, 97];
const sampleSales = 248500;
const sampleRevenue = 182300;
const sampleInventoryRisk = 4;
const sampleTrending = 12;
const sampleSalesDelta = 14.2;
const sampleRevenueDelta = 8.6;
const sampleTrendingDelta = 3;

function LandingPage() {
  const { lang } = useLanguage();
  const t = useT();

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a1a]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4f46e5] text-white">
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

      {/* Hero section */}
      <section className="relative overflow-hidden bg-[#0a0a1a] text-white">
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1
              className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {lang === "bn" ? (
                <>
                  ছোট ব্যবসার জন্য এআই-চালিত কমার্স ইন্টেলিজেন্স
                </>
              ) : (
                <>
                  Commerce intelligence built for small store teams
                </>
              )}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/65 md:text-lg">
              {lang === "bn"
                ? "মার্কেট ট্রেন্ড, গ্রাহক আচরণ ও ইনভেন্টরি ঝুঁকি, সব এক জায়গায় পরিষ্কার সুপারিশ সহ।"
                : "Market trends, customer behavior, and inventory risk, unified into clear actionable recommendations."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[#4f46e5] text-white hover:bg-[#6366f1]"
              >
                <Link to="/dashboard">
                  {t("ড্যাশবোর্ড খুলুন / Open Dashboard")}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/about">{t("আরও জানুন / Learn More")}</Link>
              </Button>
            </div>
          </div>

          {/* Honest Demo Preview Header */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="mb-3 flex items-center justify-between text-xs text-white/50">
              <span>{t("নমুনা ড্যাশবোর্ড / Sample Store Dashboard (Live Preview)")}</span>
              <span className="rounded border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                {t("নমুনা ডেটা / Demo Data")}
              </span>
            </div>

            {/* Structured Sample Metrics Grid */}
            <div className="grid grid-cols-6 gap-3 md:grid-cols-12 md:gap-4">
              {/* Sales Column */}
              <div className="col-span-6 row-span-2 rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:col-span-7">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/50">
                  <span>{t("মোট বিক্রয় / Total Sales")}</span>
                  <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-300">
                    {fmtSigned(sampleSalesDelta, lang)}%
                  </span>
                </div>
                <div
                  className="mt-2 text-4xl font-semibold tabular-nums tracking-tight md:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  ${fmtNum(sampleSales, lang)}
                </div>
                <div className="mt-5 grid h-28 grid-cols-12 items-end gap-1.5">
                  {sampleBars.map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className="rounded-sm bg-[#4f46e5]"
                    />
                  ))}
                </div>
              </div>

              {/* Revenue */}
              <div className="col-span-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-5">
                <div className="text-[11px] uppercase tracking-wider text-white/50">
                  {t("রাজস্ব / Revenue")}
                </div>
                <div
                  className="mt-1 text-2xl font-semibold tabular-nums md:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  ${fmtNum(sampleRevenue, lang)}
                </div>
                <div className="mt-1 text-xs text-emerald-300 tabular-nums">
                  {fmtSigned(sampleRevenueDelta, lang)}%
                </div>
              </div>

              {/* Trending SKUs */}
              <div className="col-span-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-5">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/60">
                  <TrendingUp className="h-3 w-3" />
                  {t("ট্রেন্ডিং / Trending")}
                </div>
                <div
                  className="mt-1 text-2xl font-semibold tabular-nums md:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {fmtNum(sampleTrending, lang)} SKUs
                </div>
                <div className="mt-1 text-xs text-white/50 tabular-nums">
                  {fmtSigned(sampleTrendingDelta, lang, 0)} {lang === "bn" ? "this wk" : "this wk"}
                </div>
              </div>

              {/* AI Insight card */}
              <div className="col-span-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-7">
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
                        ? "গত সপ্তাহে কটন টি-শার্টের চাহিদা ১৮% বেড়েছে: স্টক বাড়ানোর সময়।"
                        : "Cotton tees demand up 18% week-over-week: recommended time to restock."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Inventory risk */}
              <div className="col-span-3 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4 md:col-span-3">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-200/80">
                  <PackageSearch className="h-3 w-3" />
                  {t("ইনভেন্টরি ঝুঁকি / Risk")}
                </div>
                <div
                  className="mt-1 text-2xl font-semibold tabular-nums md:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {fmtNum(sampleInventoryRisk, lang)}
                </div>
                <div className="mt-1 text-xs text-white/50">
                  {lang === "bn" ? "items" : "items"}
                </div>
              </div>

              {/* Assistant quick card */}
              <div className="col-span-3 flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-2">
                <MessageSquare className="h-4 w-4 text-[#a5b4fc]" />
                <div className="text-[11px] leading-snug text-white/70">
                  {lang === "bn" ? "সহকারী প্রশ্ন" : "Commerce Q&A"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features with visual hierarchy */}
      <section id="features" className="relative border-t border-white/10">
        <div className="relative mx-auto max-w-6xl px-4 py-24">
          <div className="mb-14 max-w-2xl">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-[#a5b4fc]">
              {lang === "bn" ? "ফিচার" : "Features"}
            </div>
            <h2
              className="text-balance text-3xl leading-[1.1] tracking-tight md:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {lang === "bn" ? (
                <>স্মার্ট স্টোর পরিচালনার ব্যবহারিক সমাধান</>
              ) : (
                <>Everything you need to run a smarter store</>
              )}
            </h2>
            <p className="mt-4 max-w-xl text-base text-white/60">
              {lang === "bn"
                ? "বাজওয়ার্ড নয়, ব্যবহারিক টুল। দ্রুত সিদ্ধান্ত গ্রহণে SME টিমের জন্য তৈরি।"
                : "Practical tools built for store owners who need answers grounded in real data."}
            </p>
          </div>

          {/* Varied Hierarchy Layout */}
          <div className="space-y-4">
            {/* Flagship Feature Card */}
            <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-[#141432] to-[#0a0a1a] p-8 md:p-10">
              <div className="grid gap-6 md:grid-cols-[1.5fr_1fr] md:items-center">
                <div>
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#4f46e5]/20 text-[#a5b4fc]">
                    <Brain className="h-5 w-5" />
                  </div>
                  <h3
                    className="text-2xl font-semibold tracking-tight text-white md:text-3xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {lang === "bn" ? features[0].titleBn : features[0].title}
                  </h3>
                  <p className="mt-3 max-w-lg text-base leading-relaxed text-white/70">
                    {lang === "bn" ? features[0].descBn : features[0].desc}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-white/75">
                  <div className="font-mono text-[11px] text-[#a5b4fc]">Weekly Summary Example:</div>
                  <p className="mt-2 leading-relaxed">
                    "Weekly revenue grew 14% primarily driven by top 3 cotton apparel SKUs. Restock advised before upcoming promotional weekend."
                  </p>
                </div>
              </div>
            </div>

            {/* Supporting 2x2 Feature Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {features.slice(1).map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-white/10 bg-[#0a0a1a] p-6 transition-colors hover:bg-[#141432]/60"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[#a5b4fc]">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <h3
                    className="text-lg font-medium tracking-tight text-white"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {lang === "bn" ? f.titleBn : f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {lang === "bn" ? f.descBn : f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <div className="grid items-start gap-14 md:grid-cols-[1fr_1.2fr]">
            <div className="md:sticky md:top-24">
              <div className="mb-4 text-xs uppercase tracking-[0.2em] text-[#a5b4fc]">
                {lang === "bn" ? "প্রক্রিয়া" : "Process"}
              </div>
              <h2
                className="text-balance text-3xl leading-[1.1] tracking-tight md:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {lang === "bn" ? (
                  <>কীভাবে কাজ করে</>
                ) : (
                  <>How it works</>
                )}
              </h2>
              <p className="mt-4 text-base text-white/60">
                {lang === "bn"
                  ? "আমরা আপনার স্টোরের সাথে সংযুক্ত হই, মার্কেট ডেটা দিয়ে সমৃদ্ধ করি, এবং RAG দ্বারা চালিত কার্যকর সুপারিশে অনুবাদ করি।"
                  : "We connect to your store, enrich it with market data, and translate it into actionable recommendations powered by retrieval-augmented AI."}
              </p>
            </div>
            <ol className="relative space-y-3">
              {[
                ["আপনার স্টোর ডেটা সোর্স সংযুক্ত করুন", "Connect your store data sources"],
                ["ভেক্টর ডেটাবেসে সিগন্যাল প্রসেস ও সংরক্ষণ", "Process and store signals in a vector database"],
                ["Gemini + RAG পাইপলাইন ইনসাইট তৈরি করে", "Gemini + RAG pipeline generates grounded insights"],
                ["আপনি পরিষ্কার ড্যাশবোর্ড ও এআই সহকারী পান", "You get a clean dashboard and commerce assistant"],
              ].map(([bn, en], i) => (
                <li key={en} className="flex items-start gap-5 rounded-xl border border-white/10 bg-[#0a0a1a] p-5">
                  <span
                    className="text-2xl text-[#4f46e5] tabular-nums font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="pt-0.5 text-base text-white/85">
                    {lang === "bn" ? bn : en}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-white/10 overflow-hidden">
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center">
          <h2
            className="text-balance text-4xl leading-[1.05] tracking-tight md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {lang === "bn" ? (
              <>আপনার স্টোর স্পষ্টভাবে দেখতে প্রস্তুত?</>
            ) : (
              <>Ready to see your store clearly?</>
            )}
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base text-white/65">
            {t("নমুনা ডেটা সহ ডেমো ড্যাশবোর্ডটি দেখুন। / Explore the demo dashboard with sample ecommerce data.")}
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-[#4f46e5] text-white hover:bg-[#6366f1]"
          >
            <Link to="/dashboard">
              {t("ড্যাশবোর্ড খুলুন / Open Dashboard")}
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-xs text-white/40 md:flex-row">
          <span>© {new Date().getFullYear()} EasyBusiness AI</span>
          <span>{t("SME-দের জন্য নির্মিত / Built for SMEs")}</span>
        </div>
      </footer>
    </div>
  );
}
