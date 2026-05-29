import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/about")({
  head: () => ({ meta: [{ title: "সম্পর্কে / About — EasyBusiness AI" }] }),
  component: AboutPage,
});

const stages = [
  { step: "১", title: "ডেটা সোর্স / Data Sources", desc: "Shopify, WooCommerce, marketplaces, reviews, competitor sites" },
  { step: "২", title: "প্রসেসিং / Processing", desc: "র সিগন্যাল ক্লিনিং ও সমৃদ্ধকরণ / Cleaning, normalization, and enrichment" },
  { step: "৩", title: "ভেক্টর স্টোরেজ / Vector Storage", desc: "সিম্যান্টিক রিট্রিভাল ও সাদৃশ্য অনুসন্ধান / Embeddings for semantic retrieval" },
  { step: "৪", title: "Gemini + RAG", desc: "আপনার স্টোর ডেটায় গ্রাউন্ডেড RAG / Retrieval-augmented generation grounded in your data" },
  { step: "৫", title: "এআই ড্যাশবোর্ড / AI Insights Dashboard", desc: "পরিষ্কার কার্ড, চার্ট, সহকারী / Clean cards, charts, and an assistant" },
];

const stack = ["TanStack Start", "Lovable Cloud", "Gemini API", "RAG Architecture", "Recharts", "Tailwind CSS"];

function AboutPage() {
  return (
    <>
      <DashboardTopbar title="সম্পর্কে / About / Architecture" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">EasyBusiness AI কীভাবে কাজ করে / How it works</CardTitle>
            <CardDescription>
              র কমার্স সিগন্যাল থেকে কার্যকর অন্তর্দৃষ্টি পর্যন্ত পাইপলাইন / End-to-end pipeline from raw commerce signals to actionable insights
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
            <CardTitle className="text-base">প্রযুক্তি স্ট্যাক / Technology stack</CardTitle>
            <CardDescription>আধুনিক, নির্ভরযোগ্য টুলে নির্মিত / Built on modern, reliable tools</CardDescription>
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
            <CardTitle className="text-base">এই ডেমো সম্পর্কে / About this demo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            EasyBusiness AI ছোট ইকমার্স টিমের জন্য তৈরি যারা স্প্রেডশিটের ঝামেলা ছাড়াই পরিষ্কার উত্তর চান। এই ড্যাশবোর্ডে নমুনা ডেটা দেখানো হচ্ছে — লাইভ ইনসাইটের জন্য আপনার আসল স্টোর সংযুক্ত করুন।
            <br /><br />
            EasyBusiness AI is designed for small ecommerce teams who need clear answers without wrestling spreadsheets. This dashboard shows sample data — connect your real store to see live insights.
          </CardContent>
        </Card>
      </main>
    </>
  );
}
