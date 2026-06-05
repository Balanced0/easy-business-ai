import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useT } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/upload")({
  head: () => ({ meta: [{ title: "ডেটা আপলোড / Upload Data — EasyBusiness AI" }] }),
  component: UploadPage,
});

const KINDS = [
  { id: "sales", label: "Sales", hint: "Columns: date, sku, product_name, quantity, revenue, channel" },
  { id: "inventory", label: "Inventory", hint: "Columns: sku, name, stock, reorder_threshold, cost, price" },
  { id: "products", label: "Products", hint: "Columns: sku, name, category, price" },
  { id: "reviews", label: "Reviews", hint: "Columns: product, rating, sentiment, content, date" },
  { id: "orders", label: "Orders", hint: "Columns: order_id, customer, total, status, date" },
] as const;

type Kind = (typeof KINDS)[number]["id"];

type Batch = {
  id: string;
  kind: string;
  filename: string | null;
  row_count: number;
  created_at: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function UploadPage() {
  const t = useT();
  const [kind, setKind] = useState<Kind>("sales");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  const refreshBatches = async () => {
    setLoadingBatches(true);
    const { data } = await supabase
      .from("upload_batches")
      .select("id,kind,filename,row_count,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setBatches((data ?? []) as Batch[]);
    setLoadingBatches(false);
  };

  useEffect(() => {
    void refreshBatches();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setLastResult(null);
    try {
      const headers = await authHeaders();
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", headers, body: form });
      const json = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(json.details)
          ? json.details.slice(0, 3).map((d: { row: number; message: string }) => `Row ${d.row}: ${d.message}`).join("; ")
          : json.error;
        throw new Error(detail || "Upload failed");
      }
      setLastResult({
        ok: true,
        message: `Inserted ${json.rowsInserted} rows · ${json.embedded} embeddings indexed`,
      });
      toast.success(`${kind}: ${json.rowsInserted} rows ingested`);
      setFile(null);
      (document.getElementById("file-input") as HTMLInputElement | null)?.value && ((document.getElementById("file-input") as HTMLInputElement).value = "");
      await refreshBatches();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <DashboardTopbar title="ডেটা আপলোড / Upload Data" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">{t("CSV বা XLSX আপলোড করুন / Upload CSV or XLSX")}</CardTitle>
            </div>
            <CardDescription>
              {t("আপনার ব্যবসার ডেটা আপলোড করুন। ড্যাশবোর্ড ও এআই সহকারী এই ডেটা থেকে বিশ্লেষণ তৈরি করবে। / Upload your business data. The dashboard and AI assistant will generate analytics from this data.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label className="text-sm">{t("ডেটাসেট টাইপ / Dataset type")}</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {KINDS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setKind(k.id)}
                      className={`rounded-md border p-3 text-left text-sm transition-colors ${
                        kind === k.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        {k.label}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {KINDS.find((k) => k.id === kind)?.hint}
                </div>
              </div>
              <div>
                <Label htmlFor="file-input" className="text-sm">{t("ফাইল / File")} (.csv, .xlsx)</Label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-2"
                />
              </div>
              <Button type="submit" disabled={!file || uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {t("আপলোড / Upload")}
              </Button>
              {lastResult && (
                <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${lastResult.ok ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
                  {lastResult.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{lastResult.message}</span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("সাম্প্রতিক আপলোড / Recent uploads")}</CardTitle>
            <CardDescription>{t("আপনার অ্যাকাউন্টে আপলোডকৃত ব্যাচ / Batches uploaded under your account")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBatches ? (
              <div className="text-sm text-muted-foreground">{t("লোড হচ্ছে... / Loading...")}</div>
            ) : batches.length === 0 ? (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                {t("এখনও কোনও আপলোড নেই / No uploads yet")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("টাইপ / Type")}</TableHead>
                    <TableHead>{t("ফাইল / File")}</TableHead>
                    <TableHead className="text-right">{t("রেকর্ড / Rows")}</TableHead>
                    <TableHead>{t("সময় / When")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell><Badge variant="secondary" className="capitalize">{b.kind}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{b.filename ?? "—"}</TableCell>
                      <TableCell className="text-right">{b.row_count}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(b.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
