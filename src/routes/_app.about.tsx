import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Globe2,
  Languages,
  Brain,
  Upload,
  Radar,
  ShoppingBag,
  Store,
  Package,
  Palette,
  Building2,
  DollarSign,
  Handshake,
  Layers,
  LineChart,
} from "lucide-react";
import { useT } from "@/hooks/use-language";

export const Route = createFileRoute("/_app/about")({
  head: () => ({ meta: [{ title: "সম্পর্কে / About — EasyBusiness AI" }] }),
  component: AboutPage,
});

const revenueStreams = [
  {
    icon: DollarSign,
    title: "SaaS সাবস্ক্রিপশন / SaaS subscriptions",
    desc: "মাসিক ও বার্ষিক প্ল্যান — Free থেকে Enterprise পর্যন্ত। / Tiered monthly and annual plans from Free to Enterprise.",
  },
  {
    icon: Handshake,
    title: "মার্কেটপ্লেস API রাজস্ব শেয়ার / Marketplace API revenue share",
    desc: "Daraz, Shopify, Amazon ইন্টিগ্রেশন থেকে অংশীদারিত্বের আয়। / Partner revenue share from Daraz, Shopify, Amazon integrations.",
  },
  {
    icon: Layers,
    title: "হোয়াইট-লেবেল লাইসেন্সিং / White-label licensing",
    desc: "এজেন্সি ও বড় রিটেইলারদের জন্য কাস্টম-ব্র্যান্ডেড ড্যাশবোর্ড। / Custom-branded dashboards for agencies and large retailers.",
  },
  {
    icon: LineChart,
    title: "এন্টারপ্রাইজ ডেটা ইনসাইট / Enterprise data insights",
    desc: "অ্যানোনিমাইজড মার্কেট ইন্টেলিজেন্স রিপোর্ট ব্র্যান্ড ও বিনিয়োগকারীদের কাছে। / Anonymized market intelligence reports for brands and investors.",
  },
];

const advantages = [
  {
    icon: Languages,
    title: "বাংলা-ফার্স্ট এআই / Bangla-first AI",
    desc: "স্থানীয় ভাষায় চিন্তা করা প্রথম এআই বিজনেস অ্যানালিস্ট। / The first AI business analyst that thinks in your language.",
  },
  {
    icon: Brain,
    title: "আপনার ডেটার উপর RAG / RAG over your data",
    desc: "জেনেরিক উত্তর নয় — উত্তর আপনার আসল বিক্রয় ও ইনভেন্টরিতে গ্রাউন্ডেড। / Not generic answers — every reply is grounded in your real sales and inventory.",
  },
  {
    icon: Upload,
    title: "নো-কোড ডেটা আপলোড / No-code data upload",
    desc: "CSV বা XLSX টানুন, কোন ইঞ্জিনিয়ার লাগবে না। / Drag a CSV or XLSX — no engineers, no integrations required.",
  },
  {
    icon: Radar,
    title: "রিয়েল-টাইম প্রতিযোগী ইন্টেলিজেন্স / Real-time competitor intelligence",
    desc: "মূল্য, রেটিং, রিভিউ ট্র্যাক করুন সিম্যান্টিক সাদৃশ্য সহ। / Track competitor price, rating, reviews with semantic similarity scoring.",
  },
];

const customers = [
  { icon: ShoppingBag, label: "Daraz বিক্রেতা / Daraz sellers" },
  { icon: Store, label: "Shopify মার্চেন্ট / Shopify merchants" },
  { icon: Package, label: "Amazon বিক্রেতা / Amazon sellers" },
  { icon: Palette, label: "Etsy বিক্রেতা / Etsy sellers" },
  { icon: Building2, label: "ইন্ডিপেন্ডেন্ট ব্র্যান্ড / Independent brands" },
];

const roadmap = [
  {
    phase: "ফেজ ১ / Phase 1",
    when: "এখন / Now",
    region: "বাংলাদেশ / Bangladesh",
    desc: "Daraz, Shopify ও স্থানীয় বিক্রেতাদের জন্য চালু। / Live for Daraz, Shopify, and local sellers.",
  },
  {
    phase: "ফেজ ২ / Phase 2",
    when: "Q3 2025",
    region: "দক্ষিণ এশিয়া / South Asia",
    desc: "ভারত, পাকিস্তান, শ্রীলঙ্কা — হিন্দি ও উর্দু সাপোর্ট। / Expand to India, Pakistan, Sri Lanka with Hindi and Urdu support.",
  },
  {
    phase: "ফেজ ৩ / Phase 3",
    when: "Q1 2026",
    region: "দক্ষিণ-পূর্ব এশিয়া / Southeast Asia",
    desc: "ইন্দোনেশিয়া, ভিয়েতনাম, থাইল্যান্ড, ফিলিপাইন। / Indonesia, Vietnam, Thailand, Philippines via Shopee and Lazada.",
  },
  {
    phase: "ফেজ ৪ / Phase 4",
    when: "2027",
    region: "গ্লোবাল / Global",
    desc: "মধ্যপ্রাচ্য, আফ্রিকা, লাতিন আমেরিকা। / MEA and LATAM with full multilingual coverage.",
  },
];

function AboutPage() {
  const t = useT();
  return (
    <>
      <DashboardTopbar title="সম্পর্কে / About / Business Model" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-12">
          <Badge variant="secondary" className="mb-3">
            <Sparkles className="mr-1 h-3 w-3" /> {t("ইনভেস্টর ওভারভিউ / Investor overview")}
          </Badge>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
            {t("SME বিক্রেতাদের জন্য AI বিজনেস অ্যানালিস্ট / AI Business Analyst for SME Sellers")}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            {t(
              "কাঁচা ইকমার্স ডেটাকে বাংলা ও ইংরেজিতে কার্যকর সিদ্ধান্তে রূপান্তর করি — কোন অ্যানালিস্ট লাগবে না। / We turn raw ecommerce data into actionable decisions in Bangla and English — no analyst required.",
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/pricing">{t("মূল্য দেখুন / View pricing")}</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:investors@easybusiness.ai">{t("বিনিয়োগকারী কিট / Investor kit")}</a>
            </Button>
          </div>
        </section>

        {/* Market opportunity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("বাজার সুযোগ / Market opportunity")}</CardTitle>
            <CardDescription>
              {t("একটি বিশাল, কম-সেবা পাওয়া SME ইকমার্স বাজার / A massive, underserved SME ecommerce market")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-5">
                <div className="text-3xl font-bold text-primary">$47B</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {t("দক্ষিণ ও দক্ষিণ-পূর্ব এশিয়ার SME ইকমার্স বাজার / SME ecommerce market in South & Southeast Asia")}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-5">
                <div className="text-3xl font-bold text-primary">4.2M</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {t("সক্রিয় অনলাইন বিক্রেতা / Active online sellers underserved by enterprise analytics tools")}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-5">
                <div className="text-3xl font-bold text-primary">18%</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {t("বার্ষিক বৃদ্ধি (CAGR) / Annual growth rate across the region")}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {t(
                "এন্টারপ্রাইজ অ্যানালিটিক্স টুলগুলি জটিল ও ব্যয়বহুল। ছোট বিক্রেতারা স্প্রেডশিটে আটকে আছেন। EasyBusiness AI সেই ফাঁক পূরণ করে। / Enterprise analytics tools are complex and expensive. Small sellers are stuck in spreadsheets. EasyBusiness AI fills that gap.",
              )}
            </p>
          </CardContent>
        </Card>

        {/* Revenue streams */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("রাজস্ব ধারা / Revenue streams")}</CardTitle>
            <CardDescription>
              {t("চারটি পরিপূরক আয়ের পথ / Four complementary monetization channels")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {revenueStreams.map((r) => (
                <div key={r.title} className="flex gap-3 rounded-lg border bg-card p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <r.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t(r.title)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{t(r.desc)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Competitive advantage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("প্রতিযোগিতামূলক সুবিধা / Competitive advantage")}</CardTitle>
            <CardDescription>{t("আমরা কেন জিতি / Why we win")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {advantages.map((a) => (
                <div key={a.title} className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <a.icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-medium">{t(a.title)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t(a.desc)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Target customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("টার্গেট গ্রাহক / Target customers")}</CardTitle>
            <CardDescription>{t("কারা EasyBusiness AI ব্যবহার করে / Who uses EasyBusiness AI")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {customers.map((c) => (
                <div
                  key={c.label}
                  className="flex flex-col items-center gap-2 rounded-lg border bg-card p-5 text-center"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium">{t(c.label)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Global roadmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-primary" />
              {t("গ্লোবাল সম্প্রসারণ রোডম্যাপ / Global expansion roadmap")}
            </CardTitle>
            <CardDescription>
              {t("বাংলাদেশ থেকে শুরু, পরবর্তীতে বিশ্ব / Starting in Bangladesh, scaling worldwide")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 hidden w-px bg-border md:left-1/2 md:block" />
              <div className="space-y-4">
                {roadmap.map((r, i) => (
                  <div
                    key={r.phase}
                    className={`relative flex flex-col gap-3 md:flex-row md:items-center ${
                      i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                    }`}
                  >
                    <div className="absolute left-2 top-2 hidden h-3 w-3 rounded-full border-2 border-background bg-primary md:left-1/2 md:block md:-translate-x-1/2" />
                    <div className="md:w-1/2 md:px-8">
                      <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {t(r.phase)}
                          </Badge>
                          <span className="text-xs font-medium text-primary">{r.when}</span>
                        </div>
                        <div className="mt-2 text-sm font-semibold">{t(r.region)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{t(r.desc)}</div>
                      </div>
                    </div>
                    <div className="hidden md:block md:w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Traction CTA */}
        <section className="rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">
            {t("আমাদের যাত্রায় যোগ দিন / Join our journey")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            {t(
              "ওয়েটলিস্টে নাম লেখান, প্রারম্ভিক অ্যাক্সেস ও বিনিয়োগকারী আপডেট পান। / Join the waitlist for early access, product updates, and investor news.",
            )}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <a href="mailto:hello@easybusiness.ai?subject=Join%20the%20waitlist">
                {t("ওয়েটলিস্টে যোগ দিন / Join the waitlist")}
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/pricing">{t("মূল্য দেখুন / See pricing")}</Link>
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
