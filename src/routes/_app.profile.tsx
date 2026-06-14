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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
      </main>
    </>
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

