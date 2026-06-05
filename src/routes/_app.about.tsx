import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/hooks/use-language";

export const Route = createFileRoute("/_app/about")({
  head: () => ({ meta: [{ title: "সম্পর্কে / About — EasyBusiness AI" }] }),
  component: AboutPage,
});

const stages = [
  { step: "১ / 1", title: "ডেটা আপলোড / Upload Data", desc: "CSV/XLSX ফাইল আপলোড করুন — বিক্রয়, ইনভেন্টরি, পণ্য, রিভিউ, এবং অর্ডার ডেটা / Upload CSV/XLSX files for sales, inventory, products, reviews, and orders" },
  { step: "২ / 2", title: "এআই প্রসেসিং / AI Processing", desc: "ডেটা ক্লিনিং, এমবেডিং ইনডেক্সিং, এবং অটোমেটেড অ্যানালিটিক্স কম্পিউটেশন / Data cleaning, embedding indexing, and automated analytics computation" },
  { step: "৩ / 3", title: "ড্যাশবোর্ড ও অন্তর্দৃষ্টি / Dashboard & Insights", desc: "বিক্রয় প্রবণতা, চাহিদা পূর্বাভাস, ইনভেন্টরি সতর্কতা, রিভিউ সেন্টিমেন্ট, এবং RAG-ভিত্তিক সার্চ / Sales trends, demand forecasts, inventory alerts, review sentiment, and RAG-powered search" },
  { step: "৪ / 4", title: "এআই সহকারী / AI Assistant", desc: "আপনার স্টোর ডেটা থেকে সরাসরি উত্তর পান — ভয়েস ইনপুট ও আউটপুট সহ (শুধু ইংরেজি) / Get answers grounded in your store data — with voice input and output (English only)" },
  { step: "৫ / 5", title: "প্রতিযোগী বিশ্লেষণ / Competitor Analysis", desc: "সিম্যান্টিক সাদৃশ্য বিশ্লেষণ, মূল্য/রেটিং/রিভিউ তুলনা, এবং আধুনিক চার্টের মাধ্যমে বাজার অবস্থান / Semantic similarity analysis, price/rating/review comparison, and market positioning via modern charts" },
];


const stack = [
  "TanStack Start",
  "React 19",
  "Tailwind CSS",
  "Lovable Cloud",
  "Supabase",
  "Gemini API",
  "Recharts",
  "Firecrawl",
  "RAG Architecture",
  "Zod",
];

function AboutPage() {
  const t = useT();
  return (
    <>
      <DashboardTopbar title="সম্পর্কে / About / Architecture" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        {/* Product Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("EasyBusiness AI সম্পর্কে / About EasyBusiness AI")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              {t(
                "ছোট ও মাঝারি আকারের ইকমার্স ব্যবসাগুলো প্রায়শই বাজার প্রবণতা, গ্রাহক আচরণ, ইনভেন্টরি ঝুঁকি, এবং প্রতিযোগী কার্যকলাপ বুঝতে সংগ্রাম করে কারণ তাদের কাছে ডেটা অ্যানালিস্ট ও অ্যাডভান্সড অ্যানালিটিক্স টুলের অ্যাক্সেস সীমিত। বেশিরভাগ বিদ্যমান ড্যাশবোর্ড ব্যবসার মালিকদের জটিল চার্ট ও কাঁচা মেট্রিক্স দিয়ে অভিভূত করে কার্যকর গাইডেন্স ছাড়াই, যা দুর্বল সিদ্ধান্ত, স্টক সমস্যা, মূল্য inefficiency, এবং রাজস্ব ক্ষতির দিকে নিয়ে যায়। / Small and medium-sized ecommerce businesses often struggle to understand market trends, customer behavior, inventory risks, and competitor activity because they have limited access to data analysts and advanced analytics tools. Most existing dashboards overwhelm business owners with complex charts and raw metrics without actionable guidance, leading to poor decisions, stock issues, pricing inefficiencies, and revenue loss."
              )}
            </p>
            <p>
              {t(
                "EasyBusiness AI এই সমস্যার সমাধান করে একটি AI-চালিত কমার্স ইন্টেলিজেন্স ড্যাশবোর্ড প্রদানের মাধ্যমে যা বাস্তব ইকমার্স ডেটাকে SME বিক্রেতাদের, অনলাইন রিটেইলারদের, এবং মার্কেটপ্লেস ভেন্ডরদের জন্য সহজ, কার্যকর ব্যবসায়িক অন্তর্দৃষ্টিতে রূপান্তরিত করে। / EasyBusiness AI solves this problem by providing an AI-powered commerce intelligence dashboard that transforms real-world ecommerce data into simple, actionable business insights for SME sellers, online retailers, and marketplace vendors."
              )}
            </p>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("EasyBusiness AI কীভাবে কাজ করে / How it works")}</CardTitle>
            <CardDescription>
              {t("ব্যবহারকারীর ডেটা থেকে কার্যকর অন্তর্দৃষ্টি পর্যন্ত পুরো প্রক্রিয়া / The complete journey from your data to actionable insights")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5 items-stretch">
              {stages.map((s, i) => (
                <div key={s.step} className="relative flex">
                  <div className="flex h-full w-full flex-col rounded-md border bg-card p-4">
                    <div className="mb-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {t(s.step)}
                    </div>
                    <div className="text-sm font-medium">{t(s.title)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{t(s.desc)}</div>
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
            <CardTitle className="text-base">{t("প্রযুক্তি স্ট্যাক / Technology stack")}</CardTitle>
            <CardDescription>{t("বাস্তব প্রযুক্তি যেগুলো দিয়ে এই প্ল্যাটফর্মটি নির্মিত / The actual technologies used to build this platform")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stack.map((tItem) => (
                <Badge key={tItem} variant="secondary" className="text-xs">
                  {tItem}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("EasyBusiness AI সম্পর্কে / About EasyBusiness AI")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            {t(
              "EasyBusiness AI একটি সম্পূর্ণ কার্যকর SaaS পণ্য — কোনও ডেমো নয়। এটি SME ইকমার্স টিমদের জন্য ডিজাইন করা হয়েছে যারা স্প্রেডশিটের ঝামেলা ছাড়াই পরিষ্কার, AI-চালিত উত্তর চান। আপনার ডেটা আপলোড করুন, বিশ্লেষণ দেখুন, প্রশ্ন করুন, এবং প্রতিযোগিতামূলক বাজারে দ্রুত ও স্মার্ট সিদ্ধান্ত নিন। / EasyBusiness AI is a fully functional SaaS product — not a demo. It is designed for SME ecommerce teams who want clear, AI-powered answers without wrestling spreadsheets. Upload your data, view analytics, ask questions, and make fast, smart decisions in a competitive market."
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
