import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { KeyRound, ExternalLink, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/hooks/use-language";
import { useCurrency, SUPPORTED_CURRENCIES, CURRENCY_META, type CurrencyCode } from "@/hooks/use-currency";
import { useCredits } from "@/hooks/use-credits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getByokStatus, saveByokKey, clearByokKey } from "@/lib/credits.functions";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "প্রোফাইল / Profile — EasyBusiness AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const t = useT();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    business_name: "",
    industry: "",
    description: "",
    products: "",
    target_market: "",
    monthly_revenue: "",
  });
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    Promise.all([
      supabase.from("business_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]).then(([{ data: biz }, { data: prof }]) => {
      if (biz) {
        setForm({
          business_name: biz.business_name ?? "",
          industry: biz.industry ?? "",
          description: biz.description ?? "",
          products: biz.products ?? "",
          target_market: biz.target_market ?? "",
          monthly_revenue: biz.monthly_revenue ?? "",
        });
      }
      setFullName(prof?.full_name ?? user.user_metadata?.full_name ?? "");
      setLoadingData(false);
    });
  }, [user, loading]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const [bizRes, profRes] = await Promise.all([
      supabase.from("business_profiles").upsert({ user_id: user.id, ...form }, { onConflict: "user_id" }),
      supabase.from("profiles").upsert(
        { user_id: user.id, full_name: fullName, email: user.email ?? null },
        { onConflict: "user_id" },
      ),
    ]);
    setBusy(false);
    if (bizRes.error || profRes.error) toast.error((bizRes.error ?? profRes.error)!.message);
    else toast.success(t("সংরক্ষণ হয়েছে / Saved"));
  };

  const initials = (fullName || user?.email || "U")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loading || loadingData) {
    return (
      <>
        <DashboardTopbar title="প্রোফাইল / Profile" />
        <main className="flex-1 p-4 md:p-6 text-sm text-muted-foreground">Loading…</main>
      </>
    );
  }

  return (
    <>
      <DashboardTopbar title="প্রোফাইল / Profile" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{fullName || user?.email}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("আপনার তথ্য / Your information")}</CardTitle>
            <CardDescription>{t("আপনার অ্যাকাউন্ট ও ব্যবসার বিবরণ আপডেট করুন / Update your account and business details")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("পূর্ণ নাম / Full name")}</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t("ইমেইল / Email")}</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("ব্যবসার নাম / Business name")}</Label>
                  <Input value={form.business_name} onChange={update("business_name")} />
                </div>
                <div className="space-y-1">
                  <Label>{t("শিল্প / Industry")}</Label>
                  <Input value={form.industry} onChange={update("industry")} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("বিবরণ / Description")}</Label>
                <Textarea rows={2} value={form.description} onChange={update("description")} />
              </div>
              <div className="space-y-1">
                <Label>{t("পণ্য / Products")}</Label>
                <Textarea rows={2} value={form.products} onChange={update("products")} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("টার্গেট মার্কেট / Target market")}</Label>
                  <Input value={form.target_market} onChange={update("target_market")} />
                </div>
                <div className="space-y-1">
                  <Label>{t("মাসিক রাজস্ব / Monthly revenue")}</Label>
                  <Input value={form.monthly_revenue} onChange={update("monthly_revenue")} />
                </div>
              </div>
              <CurrencyPreference />

              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {t("সংরক্ষণ করুন / Save changes")}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
                  {t("ফিরে যান / Back")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <ByokKeyCard />
      </main>
    </>
  );
}

function ByokKeyCard() {
  const t = useT();
  const { refresh: refreshCredits } = useCredits();
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getByokStatus);
  const saveFn = useServerFn(saveByokKey);
  const clearFn = useServerFn(clearByokKey);

  const { data: status, isLoading } = useQuery({
    queryKey: ["byok-status"],
    queryFn: () => fetchStatus(),
    staleTime: 30_000,
  });

  const [editing, setEditing] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveFn({ data: { key: keyInput.trim() } });
      toast.success(t("API key সংরক্ষণ হয়েছে / API key saved"));
      setKeyInput("");
      setEditing(false);
      await qc.invalidateQueries({ queryKey: ["byok-status"] });
      refreshCredits();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (!confirm(t("আপনার API key সরাবেন? / Remove your API key?"))) return;
    setBusy(true);
    try {
      await clearFn();
      toast.success(t("API key সরানো হয়েছে / API key removed"));
      await qc.invalidateQueries({ queryKey: ["byok-status"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">
            {t("নিজের AI Key দিয়ে চালান (BYOK) / Bring your own AI key")}
          </CardTitle>
          {status?.hasKey && (
            <Badge variant="secondary" className="ml-auto gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t("সক্রিয় / Active")}
            </Badge>
          )}
        </div>
        <CardDescription>
          {t(
            "নিজের Google Gemini API key যোগ করলে আপনার AI সম্পূর্ণ স্বাধীন হবে — কোনো শেয়ার্ড পুলের উপর নির্ভর করবে না, এবং আপনার ক্রেডিট খরচ হবে না। / Add your own Google Gemini API key to make your AI fully independent — no shared pool, no credit charges from us.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("লোড হচ্ছে... / Loading...")}</p>
        ) : status?.hasKey && !editing ? (
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <div>
              <div className="text-xs text-muted-foreground">{t("সংরক্ষিত key / Saved key")}</div>
              <code className="text-sm">{status.preview}</code>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                {t("পরিবর্তন / Change")}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClear} disabled={busy}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("সরান / Remove")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-sm">{t("Gemini API key")}</Label>
            <Input
              type="password"
              placeholder="AIzaSy…"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoComplete="off"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={busy || keyInput.trim().length < 10}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("সংরক্ষণ ও যাচাই / Save & verify")}
              </Button>
              {editing && (
                <Button variant="outline" onClick={() => { setEditing(false); setKeyInput(""); }}>
                  {t("বাতিল / Cancel")}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step-by-step tutorial */}
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">
              {t("কীভাবে নিজের ফ্রি Gemini key পাবেন / How to get your free Gemini key")}
            </h4>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>{t("Google AI Studio-তে যান / Go to Google AI Studio")} — <code className="text-foreground">aistudio.google.com</code></li>
            <li>{t("আপনার Google অ্যাকাউন্ট দিয়ে সাইন ইন করুন / Sign in with your Google account")}</li>
            <li>{t("'Get API Key' বাটনে ক্লিক করুন / Click 'Get API Key'")}</li>
            <li>{t("'Create API key' এ ক্লিক করুন / Click 'Create API key'")}</li>
            <li>{t("key টি কপি করুন / Copy the key")} (AIzaSy…)</li>
            <li>{t("উপরের ইনপুট বক্সে পেস্ট করে Save করুন / Paste it in the field above and Save")}</li>
          </ol>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("Google AI Studio খুলুন / Open Google AI Studio")}
            <ExternalLink className="h-3 w-3" />
          </a>
          <p className="text-xs text-muted-foreground border-t pt-2">
            {t(
              "💡 এটি সম্পূর্ণ ফ্রি এবং Google এর Gemini ফ্রি tier-এ প্রতিদিন প্রচুর AI অনুরোধ অন্তর্ভুক্ত। আপনার নিজের key ব্যবহার করলে আপনি আমাদের প্ল্যাটফর্ম কোটার উপর নির্ভর করবেন না — আপনার AI assistant চলবে সম্পূর্ণ স্বাধীনভাবে। / It's completely free — Google's Gemini free tier includes generous daily AI usage. With your own key, your AI assistant runs independently of our platform quota.",
            )}
          </p>
        </div>

        {/* FAQ */}
        <div className="rounded-lg border p-4 space-y-2">
          <h4 className="text-sm font-semibold">
            {t("আমার key যোগ করা কি নিরাপদ? / Is it safe to add my key here?")}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t(
              "হ্যাঁ। আপনার key শুধুমাত্র আপনার অ্যাকাউন্টের সাথে যুক্ত করে আমাদের ডেটাবেসে সংরক্ষণ করা হয়, এবং row-level security নিয়ম দ্বারা সুরক্ষিত যাতে শুধু আপনি (এবং সার্ভার যখন আপনার AI অনুরোধ চালায়) এটি অ্যাক্সেস করতে পারেন। এটি অন্য কোনো ব্যবহারকারীর সাথে শেয়ার করা হয় না, public API-তে প্রকাশ করা হয় না, এবং কেবল আপনার নিজের AI কল করার জন্য Google-এ পাঠানো হয়। আপনি যেকোনো সময় 'সরান / Remove' বাটনে ক্লিক করে এটি মুছে ফেলতে পারেন। / Yes. Your key is stored against your own account and protected by row-level security so only you (and the server when it makes AI requests on your behalf) can access it. It is never shared with other users, never exposed in any public API, and is only sent to Google to make your own AI calls. You can remove it at any time with the Remove button.",
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CurrencyPreference() {
  const t = useT();
  const { currency, setCurrency } = useCurrency();
  const handleChange = async (value: string) => {
    await setCurrency(value as CurrencyCode);
    toast.success(t("মুদ্রা পছন্দ আপডেট হয়েছে / Currency preference updated"));
  };
  return (
    <div className="space-y-1 max-w-sm">
      <Label>{t("profile.currency")}</Label>
      <Select value={currency} onValueChange={handleChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {SUPPORTED_CURRENCIES.map((code) => (
            <SelectItem key={code} value={code}>
              <span className="font-medium">{code}</span>
              <span className="text-muted-foreground ml-2">{CURRENCY_META[code].symbol} · {CURRENCY_META[code].label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{t("profile.currencyHelp")}</p>
    </div>
  );
}

