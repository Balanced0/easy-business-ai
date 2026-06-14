import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScanLine, Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { useT } from "@/hooks/use-language";
import { useCredits } from "@/hooks/use-credits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScanCamera } from "@/components/scan-camera";
import { ScanReviewTable } from "@/components/scan-review-table";
import { CREDIT_COSTS } from "@/lib/credit-costs";

export const Route = createFileRoute("/_app/scan")({
  head: () => ({ meta: [{ title: "হাতের লেখা স্ক্যান / Scan handwriting — EasyBusiness AI" }] }),
  component: ScanPage,
});

type Kind = "sales" | "inventory" | "products" | "orders";
const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: "sales", label: "Sales", hint: "Date, product, qty, revenue" },
  { id: "inventory", label: "Inventory", hint: "SKU, name, stock, threshold" },
  { id: "products", label: "Products", hint: "SKU, name, category, price" },
  { id: "orders", label: "Orders", hint: "Date, order, customer, total" },
];

type Step = "capture" | "review" | "done";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function ScanPage() {
  const t = useT();
  const { refresh: refreshCredits, showOutOfCredits } = useCredits();
  const [step, setStep] = useState<Step>("capture");
  const [kind, setKind] = useState<Kind>("sales");
  const [pages, setPages] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [unclear, setUnclear] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ inserted: number } | null>(null);

  const extract = async () => {
    if (pages.length === 0) return;
    setExtracting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/scan/extract", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ kind, images: pages }),
      });
      if (res.status === 402) {
        const cost = CREDIT_COSTS.scan_extract * pages.length;
        showOutOfCredits("scan_extract", cost);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "WORKSPACE_AI_UNAVAILABLE") {
          toast.error(
            t(
              "এআই সেবা সাময়িকভাবে অনুপলব্ধ। আপনার প্রোফাইলে আপনার নিজের Gemini API key যোগ করুন। / AI service is temporarily unavailable. Add your own Gemini key on your Profile to bypass this.",
            ),
          );
          return;
        }
        throw new Error(json.message || json.error || "Extraction failed");
      }
      setColumns(json.columns);
      setRows(json.rows);
      setUnclear(json.unclear ?? 0);
      setStep("review");
      refreshCredits();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  };

  const commit = async () => {
    if (rows.length === 0) return;
    setCommitting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/scan/commit", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ kind, rows, source: "handwriting-scan" }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(json.details)
          ? json.details.slice(0, 3).map((d: { row: number; message: string }) => `Row ${d.row}: ${d.message}`).join("; ")
          : json.error;
        throw new Error(detail || "Save failed");
      }
      setLastResult({ inserted: json.rowCount ?? rows.length });
      toast.success(`${kind}: ${json.rowCount ?? rows.length} rows saved`);
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setCommitting(false);
    }
  };

  const reset = () => {
    setStep("capture");
    setPages([]);
    setRows([]);
    setColumns([]);
    setUnclear(0);
    setLastResult(null);
  };

  const cost = CREDIT_COSTS.scan_extract * Math.max(1, pages.length);

  return (
    <>
      <DashboardTopbar title="হাতের লেখা স্ক্যান / Scan handwriting" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {t("ক্যামেরা দিয়ে হাতে লেখা ডেটা স্ক্যান করুন / Scan handwritten data with your camera")}
              </CardTitle>
            </div>
            <CardDescription>
              {t(
                "ক্যামেরায় আপনার বিক্রয়/স্টক/অর্ডার খাতা দেখান, এআই প্রতিটি সারি বের করে আপনার ডেটায় যোগ করবে। / Point your camera at a sales / inventory / order sheet — AI will extract every row and add it to your data.",
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {step === "capture" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("ধাপ ১: ডেটা টাইপ ও পেজ / Step 1: Choose type & capture pages")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">{t("ডেটাসেট টাইপ / Dataset type")}</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {KINDS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setKind(k.id)}
                      className={`rounded-md border p-3 text-left text-sm transition-colors ${
                        kind === k.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                      }`}
                    >
                      <div className="font-medium">{k.label}</div>
                      <div className="text-xs text-muted-foreground">{k.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              <ScanCamera pages={pages} onPagesChange={setPages} />

              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                <div>
                  <Badge variant="secondary" className="mr-2">
                    {pages.length} {t("পেজ / pages")}
                  </Badge>
                  <span className="text-muted-foreground">
                    {t("খরচ / Cost")}: <strong>{cost}</strong> {t("ক্রেডিট / credits")}
                  </span>
                </div>
                <Button onClick={extract} disabled={pages.length === 0 || extracting}>
                  {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {t("এআই দিয়ে এক্সট্র্যাক্ট করুন / Extract with AI")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "review" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("ধাপ ২: পর্যালোচনা ও সংশোধন / Step 2: Review & fix")}
              </CardTitle>
              <CardDescription>
                {rows.length} {t("সারি বের করা হয়েছে / rows extracted")}
                {unclear > 0 ? ` · ${unclear} ${t("অস্পষ্ট সেল / unclear cells")}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {unclear > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t(
                      "কিছু সেল এআই পড়তে পারেনি — সেভ করার আগে দ্রুত একবার দেখে নিন। / AI couldn't read some cells — please review before saving.",
                    )}
                  </AlertDescription>
                </Alert>
              )}
              <ScanReviewTable columns={columns} rows={rows} onChange={setRows} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={commit} disabled={committing || rows.length === 0}>
                  {committing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {t("আমার ডেটায় সংরক্ষণ করুন / Save to my data")}
                </Button>
                <Button variant="outline" onClick={() => setStep("capture")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("ফিরে যান / Back")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && lastResult && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <CardTitle className="text-base">
                  {lastResult.inserted} {t("সারি সংরক্ষণ হয়েছে / rows saved")}
                </CardTitle>
              </div>
              <CardDescription>
                {t(
                  "এআই সহকারী এখন এই ডেটা থেকে প্রশ্নের উত্তর দিতে পারবে। / The AI Assistant can now answer questions about this data.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={reset}>{t("আরেকটি পেজ স্ক্যান করুন / Scan another sheet")}</Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">{t("ড্যাশবোর্ডে যান / Go to dashboard")}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/assistant">{t("এআই-কে প্রশ্ন করুন / Ask the AI")}</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
