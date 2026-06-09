import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Boxes,
  Brain,
  Network,
  MessageSquareText,
  Globe,
  CheckCircle2,
  Database,
  Sparkles,
  Search,
  Clock,
  ArrowRight,
  XCircle,
  Star,
} from "lucide-react";
import { useT } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/intelligence")({
  head: () => ({
    meta: [
      { title: "এআই ইন্টেলিজেন্স কোর / AI Intelligence Core — EasyBusiness AI" },
      {
        name: "description",
        content:
          "How EasyBusiness AI turns your data into intelligence — RAG, embeddings, model routing, and explainable output.",
      },
    ],
  }),
  component: IntelligencePage,
});

const PIPELINE = [
  {
    icon: Upload,
    title: "ডেটা ইনজেশন / Data Ingestion",
    body:
      "আপনার CSV/XLSX ফাইল পার্স করা হয়, স্কিমার সাথে যাচাই করা হয় এবং রো-লেভেল সিকিউরিটি সহ Supabase Postgres-এ সংরক্ষিত হয়। / Your CSV/XLSX files are parsed, validated against schema, and stored in Supabase Postgres with row-level security.",
  },
  {
    icon: Boxes,
    title: "এমবেডিং ও ইনডেক্সিং / Embedding & Indexing",
    body:
      "প্রতিটি ডকুমেন্ট চাঙ্ক OpenAI text-embedding-3-small (1536 dimensions) দিয়ে এমবেড করা হয় এবং মিলিসেকেন্ড সিম্যান্টিক রিট্রিভালের জন্য pgvector-এ সংরক্ষিত হয়। / Each document chunk is embedded using OpenAI text-embedding-3-small (1536 dimensions) and stored in pgvector for millisecond semantic retrieval.",
  },
  {
    icon: Brain,
    title: "রিট্রিভাল-অগমেন্টেড জেনারেশন / Retrieval-Augmented Generation",
    body:
      "প্রশ্ন করলে কোসাইন সিমিলারিটির মাধ্যমে শীর্ষ-K প্রাসঙ্গিক চাঙ্ক রিট্রিভ হয় এবং Gemini 2.5 Flash-এর কনটেক্সট উইন্ডোতে গ্রাউন্ডেড এভিডেন্স হিসেবে ইনজেক্ট হয়। / When you ask a question, the top-K most relevant chunks are retrieved via cosine similarity search, then injected into the Gemini 2.5 Flash context window as grounded evidence.",
  },
  {
    icon: Network,
    title: "মডেল সিলেকশন লজিক / Model Selection Logic",
    body:
      "হালকা প্রশ্ন → Gemini 2.5 Flash (গতি)। জটিল রিজনিং → Gemini 2.5 Pro। এমবেডিং → text-embedding-3-small। সবকিছু Lovable AI Gateway দিয়ে রুট হয় — কোন ইউজার API কী লাগে না। / Light queries → Gemini 2.5 Flash (speed). Complex reasoning → Gemini 2.5 Pro. Embeddings → text-embedding-3-small. All routed through the Lovable AI Gateway — no user API keys required.",
  },
  {
    icon: MessageSquareText,
    title: "ব্যাখ্যাযোগ্য আউটপুট / Explainable Output",
    body:
      "প্রতিটি ইনসাইটের সাথে থাকে: যে সোর্স ডেটা থেকে এটি এসেছে, একটি কনফিডেন্স স্কোর (High/Medium/Low) এবং বাংলা বা ইংরেজিতে সহজ ব্যাখ্যা। / Every insight includes: the source data it was derived from, a confidence score (High/Medium/Low), and plain-English reasoning in Bangla or English.",
  },
  {
    icon: Globe,
    title: "প্রতিযোগী ইন্টেলিজেন্স / Competitor Intelligence",
    body:
      "Firecrawl /v2/search লাইভ ওয়েব ডেটা স্ক্র্যাপ করে → Gemini স্ট্রাকচার্ড পণ্য ডেটা এক্সট্র্যাক্ট করে → কোসাইন সিমিলারিটি নয়েজ ফিল্টার করে → FX নর্মালাইজেশন → র‍্যাঙ্কড প্রতিযোগী তুলনা। / Firecrawl /v2/search scrapes live web data → Gemini extracts structured product data → cosine similarity filters noise → FX normalization → ranked competitive comparison.",
  },
];

function IntelligencePage() {
  const t = useT();
  const { user } = useAuth();
  const [docCount, setDocCount] = useState<number | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [docs, msg, batch] = await Promise.all([
        supabase.from("knowledge_documents").select("id", { count: "exact", head: true }),
        supabase
          .from("chat_messages")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("upload_batches")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setDocCount(docs.count ?? 0);
      setLastQuery((msg.data as { created_at: string } | null)?.created_at ?? null);
      setLastUpload((batch.data as { created_at: string } | null)?.created_at ?? null);
    })();
  }, [user]);

  return (
    <>
      <DashboardTopbar title="এআই ইন্টেলিজেন্স কোর / AI Intelligence Core" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        {/* Section 1: pipeline */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              {t("আপনার ডেটা কীভাবে ইন্টেলিজেন্সে পরিণত হয় / How your data becomes intelligence")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("আপলোড থেকে অ্যাকশনেবল রিকমেন্ডেশন পর্যন্ত ছয়টি ধাপ / Six stages from upload to actionable recommendation")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PIPELINE.map((step, i) => {
              const Icon = step.icon;
              return (
                <Card key={i} className="relative overflow-hidden">
                  <div className="absolute right-3 top-3 text-xs font-mono text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-sm">{t(step.title)}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-muted-foreground">{t(step.body)}</p>
                  </CardContent>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight className="absolute -right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-primary/40 lg:block" />
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* Section 2: live system status */}
        <section>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{t("লাইভ সিস্টেম স্ট্যাটাস / Live system status")}</CardTitle>
              </div>
              <CardDescription>
                {t("আপনার অ্যাকাউন্টে এআই অবকাঠামোর রিয়েল-টাইম স্বাস্থ্য / Real-time health of your AI infrastructure")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <StatusRow
                icon={Database}
                label={t("Supabase সংযোগ / Supabase connection")}
                value={t("সংযুক্ত / Connected")}
                ok
              />
              <StatusRow
                icon={Sparkles}
                label={t("এআই গেটওয়ে / AI Gateway")}
                value={t("সংযুক্ত / Connected")}
                ok
              />
              <StatusRow
                icon={Search}
                label={t("ভেক্টর সার্চ / Vector search")}
                value={
                  docCount === null
                    ? t("লোড হচ্ছে... / Loading...")
                    : `${t("সক্রিয় / Active")} — ${docCount} ${t("ডকুমেন্ট / documents")}`
                }
                ok={docCount !== null}
              />
              <StatusRow
                icon={Clock}
                label={t("শেষ এআই প্রশ্ন / Last AI query")}
                value={lastQuery ? new Date(lastQuery).toLocaleString() : t("এখনও নেই / None yet")}
                ok={!!lastQuery}
              />
              <StatusRow
                icon={Upload}
                label={t("ডেটা সতেজতা / Data freshness")}
                value={lastUpload ? new Date(lastUpload).toLocaleString() : t("কোনও আপলোড নেই / No uploads")}
                ok={!!lastUpload}
              />
            </CardContent>
          </Card>
        </section>

        {/* Section 3: what makes this different */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              {t("কী এটিকে আলাদা করে / What makes this different")}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ComparisonCard
              title={t("ঐতিহ্যবাহী ড্যাশবোর্ড / Traditional dashboards")}
              items={[
                { ok: false, text: t("শুধু রো চার্ট / Raw charts only") },
                { ok: false, text: t("কোন রিকমেন্ডেশন নেই / No recommendations") },
                { ok: false, text: t("শুধু ইংরেজি / English only") },
                { ok: false, text: t("ডেটা অ্যানালিস্ট প্রয়োজন / Requires data analyst") },
                { ok: false, text: t("কোন প্রতিযোগী ডেটা নেই / No competitor data") },
              ]}
            />
            <ComparisonCard
              highlight
              title="EasyBusiness AI"
              items={[
                { ok: true, text: t("এআই-জেনারেটেড ইনসাইট / AI-generated insights") },
                { ok: true, text: t("অ্যাকশনেবল রিকমেন্ডেশন / Actionable recommendations") },
                { ok: true, text: t("বাংলা + ইংরেজি / Bangla + English") },
                { ok: true, text: t("নন-টেকনিকাল মালিকদের জন্য / Works for non-technical owners") },
                { ok: true, text: t("লাইভ প্রতিযোগী ইন্টেলিজেন্স / Live competitor intelligence") },
                { ok: true, text: t("ব্যাখ্যাযোগ্য রিজনিং / Explainable reasoning") },
                { ok: true, text: t("ডেটা কখনও ট্রেনিংয়ে নয় / Data never used for training") },
              ]}
            />
            <ComparisonCard
              title={t("এন্টারপ্রাইজ টুল (SAP, Tableau) / Enterprise tools (SAP, Tableau)")}
              items={[
                { ok: false, text: t("$৫০,০০০+/বছর / $50,000+/year") },
                { ok: false, text: t("৬ মাসের ইমপ্লিমেন্টেশন / 6-month implementation") },
                { ok: false, text: t("IT টিম প্রয়োজন / Requires IT team") },
                { ok: false, text: t("SME-দের জন্য ডিজাইন করা নয় / Not designed for SMEs") },
                { ok: false, text: t("দক্ষিণ এশীয় মার্কেটপ্লেস সাপোর্ট নেই / No South Asian marketplace support") },
              ]}
            />
          </div>
        </section>
      </main>
    </>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border bg-card/40 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-center gap-2">
          <Badge
            variant="secondary"
            className={
              ok
                ? "bg-success/10 text-success border border-success/20"
                : "bg-muted text-muted-foreground"
            }
          >
            {ok ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
            <span className="truncate">{value}</span>
          </Badge>
        </div>
      </div>
    </div>
  );
}

function ComparisonCard({
  title,
  items,
  highlight,
}: {
  title: string;
  items: { ok: boolean; text: string }[];
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary ring-1 ring-primary/40 shadow-lg" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          {highlight && (
            <Badge className="gap-1">
              <Star className="h-3 w-3" /> EasyBusiness
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              {it.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
              )}
              <span className={it.ok ? "" : "text-muted-foreground"}>{it.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
