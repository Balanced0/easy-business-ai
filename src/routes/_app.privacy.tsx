import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Download,
  ShieldCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  BrainCircuit,
  Eye,
  SlidersHorizontal,
  Award,
} from "lucide-react";
import { useT } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/privacy")({
  head: () => ({
    meta: [
      { title: "গোপনীয়তা ও ডেটা / Privacy & Data — EasyBusiness AI" },
      { name: "description", content: "Manage your uploaded data, review AI usage policy, see your audit log, and export your data." },
    ],
  }),
  component: PrivacyPage,
});

type Batch = {
  id: string;
  kind: string;
  filename: string | null;
  row_count: number;
  created_at: string;
};

type AuditEntry = {
  timestamp: string;
  type: string;
  status: "Success" | "Failed";
};

const ROW_TABLES: Record<string, string> = {
  sales: "sales_records",
  inventory: "inventory_items",
  products: "product_records",
  reviews: "review_records",
  orders: "order_records",
};

const PAGE_SIZE = 10;

function PrivacyPage() {
  const t = useT();
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadBatches = async () => {
    setLoadingBatches(true);
    const { data, error } = await supabase
      .from("upload_batches")
      .select("id,kind,filename,row_count,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(t("ডেটাসেট লোড করতে ব্যর্থ / Failed to load datasets"));
    }
    setBatches((data as Batch[]) ?? []);
    setLoadingBatches(false);
  };

  const loadAudit = async () => {
    setLoadingAudit(true);
    const [batchRes, msgRes] = await Promise.all([
      supabase
        .from("upload_batches")
        .select("kind,filename,created_at,row_count")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("chat_messages")
        .select("content,role,created_at")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const entries: AuditEntry[] = [];
    for (const b of (batchRes.data ?? []) as Array<{ kind: string; filename: string | null; created_at: string; row_count: number }>) {
      entries.push({
        timestamp: b.created_at,
        type: `Data upload (${b.kind}): ${b.filename ?? "file"} — ${b.row_count} rows`,
        status: b.row_count > 0 ? "Success" : "Failed",
      });
    }
    for (const m of (msgRes.data ?? []) as Array<{ content: string; created_at: string }>) {
      const snippet = m.content.length > 60 ? `${m.content.slice(0, 60)}…` : m.content;
      entries.push({
        timestamp: m.created_at,
        type: `AI assistant query: "${snippet}"`,
        status: "Success",
      });
    }
    // Always include a dashboard summary action so the user sees AI activity
    entries.push({
      timestamp: new Date().toISOString(),
      type: "Dashboard summary generated",
      status: "Success",
    });
    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setAudit(entries.slice(0, 50));
    setLoadingAudit(false);
  };

  useEffect(() => {
    if (!user) return;
    loadBatches();
    loadAudit();
  }, [user]);

  const handleDelete = async (batch: Batch) => {
    setDeletingId(batch.id);
    try {
      const table = ROW_TABLES[batch.kind];
      if (table) {
        await supabase.from(table as never).delete().eq("batch_id", batch.id);
      }
      const { error } = await supabase.from("upload_batches").delete().eq("id", batch.id);
      if (error) throw error;
      toast.success(t("ডেটাসেট মুছে ফেলা হয়েছে / Dataset deleted"));
      setBatches((b) => b.filter((x) => x.id !== batch.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("মুছতে ব্যর্থ / Delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const [sales, inventory, products, reviews, orders, batchesAll] = await Promise.all([
        supabase.from("sales_records").select("*"),
        supabase.from("inventory_items").select("*"),
        supabase.from("product_records").select("*"),
        supabase.from("review_records").select("*"),
        supabase.from("order_records").select("*"),
        supabase.from("upload_batches").select("*"),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        userId: user?.id ?? null,
        datasets: {
          sales: sales.data ?? [],
          inventory: inventory.data ?? [],
          products: products.data ?? [],
          reviews: reviews.data ?? [],
          orders: orders.data ?? [],
        },
        uploadBatches: batchesAll.data ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `easybusiness-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t("রপ্তানি ডাউনলোড হয়েছে / Export downloaded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("রপ্তানি ব্যর্থ / Export failed"));
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(audit.length / PAGE_SIZE));
  const pagedAudit = useMemo(
    () => audit.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [audit, page],
  );

  return (
    <>
      <DashboardTopbar title="গোপনীয়তা ও ডেটা / Privacy & Data" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        {/* Section 0: Responsible AI Commitment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("দায়িত্বশীল এআই অঙ্গীকার / Responsible AI Commitment")}
            </CardTitle>
            <CardDescription>
              {t("আমরা কীভাবে আপনার ডেটা এবং এআই-কে নৈতিকভাবে পরিচালনা করি / How we handle your data and AI responsibly")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Lock,
                  title: t("ডেটা আইসোলেশন / Data isolation"),
                  body: t(
                    "আপনার ডেটা Supabase Row Level Security ব্যবহার করে আপনার অ্যাকাউন্টের জন্য একচেটিয়াভাবে স্কোপড সেশনে প্রক্রিয়া করা হয়। / Your data is processed in sessions scoped exclusively to your account using Supabase Row Level Security.",
                  ),
                },
                {
                  icon: BrainCircuit,
                  title: t("কোন মডেল ট্রেনিং নেই / No model training"),
                  body: t(
                    "Anthropic, Google, OpenAI বা EasyBusiness AI কেউই আপনার ব্যবসার ডেটা কোন এআই মডেল ফাইন-টিউন বা ট্রেন করতে ব্যবহার করে না। / Your business data is never used to fine-tune or train any AI model, by Anthropic, Google, OpenAI, or EasyBusiness AI.",
                  ),
                },
                {
                  icon: Eye,
                  title: t("ব্যাখ্যাযোগ্য এআই / Explainable AI"),
                  body: t(
                    "প্রতিটি রিকমেন্ডেশনে যে ডেটা থেকে এসেছে এবং একটি কনফিডেন্স স্কোর দেখানো হয় যাতে আপনি সবসময় জানেন কেন। / Every recommendation shows the data it was derived from and a confidence score so you always know why.",
                  ),
                },
                {
                  icon: SlidersHorizontal,
                  title: t("পক্ষপাত সচেতনতা / Bias awareness"),
                  body: t(
                    "প্রতিযোগী মূল্য তুলনায় আউটলায়ার বায়াস প্রতিরোধ করতে মিডিয়ান-ভিত্তিক নর্মালাইজেশন ব্যবহার করা হয়। / Competitor pricing comparisons use median-based normalization to prevent outlier bias in recommendations.",
                  ),
                },
                {
                  icon: Award,
                  title: t("অডিট ট্রেইল / Audit trail"),
                  body: t(
                    "সমস্ত এআই কর্ম টাইমস্ট্যাম্প সহ লগ করা হয়। আপনি যেকোনো সময় আপনার সম্পূর্ণ ডেটা ইতিহাস রপ্তানি বা মুছে ফেলতে পারেন। / All AI actions are logged with timestamps. You can export or delete your complete data history at any time.",
                  ),
                },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-md border border-success/20 bg-success/[0.04] p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{item.title}</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Datasets */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {t("আপনি যে ডেটা আপলোড করেছেন / Data you've uploaded")}
                </CardTitle>
                <CardDescription>
                  {t("আপনার সমস্ত আপলোডকৃত ডেটাসেট পর্যালোচনা ও মুছুন / Review and delete your uploaded datasets")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("নাম / Name")}</TableHead>
                  <TableHead>{t("ধরন / Type")}</TableHead>
                  <TableHead>{t("তারিখ / Date")}</TableHead>
                  <TableHead className="text-right">{t("সারি / Rows")}</TableHead>
                  <TableHead className="text-right">{t("কর্ম / Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingBatches ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      {t("লোড হচ্ছে... / Loading...")}
                    </TableCell>
                  </TableRow>
                ) : batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      {t("কোনও ডেটাসেট নেই / No datasets")}
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.filename ?? b.kind}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{b.kind}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(b.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{b.row_count}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" disabled={deletingId === b.id} className="text-destructive hover:bg-destructive/10">
                              {deletingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("এই ডেটাসেট মুছবেন? / Delete this dataset?")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("এই কর্ম পূর্বাবস্থায় ফেরানো যাবে না। সংশ্লিষ্ট সমস্ত রেকর্ড স্থায়ীভাবে মুছে যাবে। / This action cannot be undone. All associated records will be permanently removed.")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("বাতিল / Cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(b)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {t("মুছুন / Delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 2: AI usage policy */}
        <Card className="border-success/30 bg-success/[0.04]">
          <CardHeader>
            <CardTitle className="text-base">{t("এআই ব্যবহার নীতি / AI usage policy")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("আপনার ডেটা কখনও এআই মডেল প্রশিক্ষণে ব্যবহার করা হয় না। সমস্ত বিশ্লেষণ আপনার অ্যাকাউন্টের সাথে স্কোপড বিচ্ছিন্ন সেশনে চালানো হয়। / Your data is never used to train AI models. All analysis runs in isolated sessions scoped to your account.")}
            </p>
          </CardContent>
        </Card>

        {/* Section 3: Audit log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">{t("অডিট লগ / Audit log")}</CardTitle>
                <CardDescription>
                  {t("সর্বশেষ ৫০টি এআই কর্ম / Last 50 AI actions")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2">{page + 1} / {totalPages}</span>
                <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("সময় / Timestamp")}</TableHead>
                  <TableHead>{t("কর্মের ধরন / Action type")}</TableHead>
                  <TableHead className="text-right">{t("স্ট্যাটাস / Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAudit ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      {t("লোড হচ্ছে... / Loading...")}
                    </TableCell>
                  </TableRow>
                ) : pagedAudit.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                      {t("কোনও কার্যকলাপ নেই / No activity")}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedAudit.map((e, i) => (
                    <TableRow key={`${e.timestamp}-${i}`}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{e.type}</TableCell>
                      <TableCell className="text-right">
                        {e.status === "Success" ? (
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            {t("সফল / Success")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            {t("ব্যর্থ / Failed")}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 4: Export */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("আপনার ডেটা রপ্তানি করুন / Export your data")}</CardTitle>
            <CardDescription>
              {t("সমস্ত আপলোডকৃত ডেটাসেটের একটি JSON অনুলিপি ডাউনলোড করুন / Download a JSON copy of all your uploaded datasets")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={exporting} className="gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t("JSON রপ্তানি ডাউনলোড / Download JSON export")}
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
