import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "ব্যবসা সেটআপ / Business setup — EasyBusiness AI" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const t = useT();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({
    business_name: "",
    industry: "",
    description: "",
    products: "",
    target_market: "",
    monthly_revenue: "",
  });
  const [busy, setBusy] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            business_name: data.business_name ?? "",
            industry: data.industry ?? "",
            description: data.description ?? "",
            products: data.products ?? "",
            target_market: data.target_market ?? "",
            monthly_revenue: data.monthly_revenue ?? "",
          });
        }
        setLoadingExisting(false);
      });
  }, [user, loading, navigate]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("business_profiles")
      .upsert({ user_id: user.id, ...form }, { onConflict: "user_id" });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t("সংরক্ষণ হয়েছে / Saved"));
      navigate({ to: "/dashboard" });
    }
  };

  if (loading || loadingExisting) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{t("আপনার ব্যবসা সম্পর্কে বলুন / Tell us about your business")}</CardTitle>
          <CardDescription>{t("AI আপনার ব্যবসার জন্য ব্যক্তিগত পরামর্শ দেবে / The AI will tailor insights to your business")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("ব্যবসার নাম / Business name")} *</Label>
                <Input required value={form.business_name} onChange={update("business_name")} />
              </div>
              <div className="space-y-1">
                <Label>{t("শিল্প / Industry")}</Label>
                <Input placeholder={t("যেমন ফ্যাশন, ইলেকট্রনিক্স / e.g. fashion, electronics")} value={form.industry} onChange={update("industry")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("বিবরণ / Description")}</Label>
              <Textarea rows={2} value={form.description} onChange={update("description")} />
            </div>
            <div className="space-y-1">
              <Label>{t("পণ্য / Products")}</Label>
              <Textarea rows={2} placeholder={t("আপনি কী বিক্রি করেন / What you sell")} value={form.products} onChange={update("products")} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("টার্গেট মার্কেট / Target market")}</Label>
                <Input value={form.target_market} onChange={update("target_market")} />
              </div>
              <div className="space-y-1">
                <Label>{t("মাসিক রাজস্ব / Monthly revenue")}</Label>
                <Input placeholder="$" value={form.monthly_revenue} onChange={update("monthly_revenue")} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {t("সংরক্ষণ করুন এবং ড্যাশবোর্ডে যান / Save and continue")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
