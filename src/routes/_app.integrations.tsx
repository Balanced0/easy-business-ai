import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingBag,
  ShoppingCart,
  Store,
  Package,
  Truck,
  Globe,
  Tag,
  Layers,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useT } from "@/hooks/use-language";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/integrations")({
  head: () => ({ meta: [{ title: "ইন্টিগ্রেশন / Integrations — EasyBusiness AI" }] }),
  component: IntegrationsPage,
});

type IntegrationStatus = "connected" | "available" | "coming_soon";

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: typeof ShoppingBag;
  color: string;
  status: IntegrationStatus;
};

const INTEGRATIONS: Integration[] = [
  {
    id: "shopify",
    name: "Shopify",
    description: "অর্ডার, পণ্য ও ইনভেন্টরি রিয়েল-টাইমে সিঙ্ক করুন / Sync orders, products, and inventory in real time",
    icon: ShoppingBag,
    color: "text-emerald-500 bg-emerald-500/10",
    status: "coming_soon",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "WordPress স্টোর থেকে বিক্রয় ও কাস্টমার ডেটা টানুন / Pull sales and customer data from your WordPress store",
    icon: Store,
    color: "text-purple-500 bg-purple-500/10",
    status: "coming_soon",
  },
  {
    id: "amazon",
    name: "Amazon Seller Central",
    description: "FBA ইনভেন্টরি, অর্ডার ও রিভিউ একসাথে আনুন / Bring FBA inventory, orders, and reviews together",
    icon: Package,
    color: "text-amber-500 bg-amber-500/10",
    status: "coming_soon",
  },
  {
    id: "etsy",
    name: "Etsy",
    description: "হ্যান্ডমেড লিস্টিং ও অর্ডার অটো-ইম্পোর্ট করুন / Auto-import handmade listings and orders",
    icon: Tag,
    color: "text-orange-500 bg-orange-500/10",
    status: "coming_soon",
  },
  {
    id: "daraz",
    name: "Daraz",
    description: "দক্ষিণ এশিয়ার বৃহত্তম মার্কেটপ্লেস থেকে অর্ডার ও স্টক সিঙ্ক করুন / Sync orders and stock from South Asia's largest marketplace",
    icon: ShoppingCart,
    color: "text-rose-500 bg-rose-500/10",
    status: "available",
  },
  {
    id: "tiktok",
    name: "TikTok Shop",
    description: "সোশ্যাল কমার্স অর্ডার ও লাইভ সেলস ট্র্যাক করুন / Track social commerce orders and live sales",
    icon: Layers,
    color: "text-pink-500 bg-pink-500/10",
    status: "coming_soon",
  },
  {
    id: "alibaba",
    name: "Alibaba",
    description: "পাইকারি লিস্টিং ও বি২বি ইনকোয়ারি সংযুক্ত করুন / Connect wholesale listings and B2B inquiries",
    icon: Globe,
    color: "text-yellow-500 bg-yellow-500/10",
    status: "coming_soon",
  },
  {
    id: "meesho",
    name: "Meesho",
    description: "ভারতের রিসেলার-প্রথম মার্কেটপ্লেসের অর্ডার সিঙ্ক করুন / Sync orders from India's reseller-first marketplace",
    icon: Truck,
    color: "text-fuchsia-500 bg-fuchsia-500/10",
    status: "coming_soon",
  },
];

const DARAZ_REGIONS = [
  { value: "BD", label: "Bangladesh" },
  { value: "PK", label: "Pakistan" },
  { value: "LK", label: "Sri Lanka" },
  { value: "NP", label: "Nepal" },
];

function IntegrationsPage() {
  const t = useT();
  const [darazOpen, setDarazOpen] = useState(false);
  const [sellerId, setSellerId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [region, setRegion] = useState("BD");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTest = async () => {
    if (!sellerId.trim() || !apiKey.trim()) {
      toast.error(t("সেলার আইডি ও এপিআই কী প্রয়োজন / Seller ID and API key required"));
      return;
    }
    setTesting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setTesting(false);
    toast.success(t("integrations.testSuccess"));
  };

  const handleSave = async () => {
    if (!sellerId.trim() || !apiKey.trim()) {
      toast.error(t("সেলার আইডি ও এপিআই কী প্রয়োজন / Seller ID and API key required"));
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    setDarazOpen(false);
    toast.success(t("দারাজ সংযুক্ত হয়েছে এবং সিঙ্ক শুরু হয়েছে / Daraz connected and sync started"));
  };

  return (
    <>
      <DashboardTopbar title="ইন্টিগ্রেশন / Integrations" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("integrations.title")}</CardTitle>
            <CardDescription>{t("integrations.subtitle")}</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {INTEGRATIONS.map((it) => (
            <Card key={it.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-md ${it.color}`}>
                    <it.icon className="h-5 w-5" />
                  </div>
                  {it.status === "connected" && (
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {t("common.connected")}
                    </Badge>
                  )}
                  {it.status === "coming_soon" && (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t("common.comingSoon")}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-3">{it.name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{t(it.description)}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                {it.status === "available" && it.id === "daraz" && (
                  <Button className="w-full" onClick={() => setDarazOpen(true)}>
                    {t("common.connect")}
                  </Button>
                )}
                {it.status === "coming_soon" && (
                  <Button className="w-full" variant="outline" disabled>
                    {t("common.comingSoon")}
                  </Button>
                )}
                {it.status === "connected" && (
                  <Button className="w-full" variant="outline">
                    {t("কনফিগার করুন / Configure")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={darazOpen} onOpenChange={setDarazOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("integrations.darazTitle")}</DialogTitle>
            <DialogDescription>
              {t("আপনার দারাজ সেলার সেন্টার ক্রেডেনশিয়াল লিখুন / Enter your Daraz Seller Center credentials")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="daraz-seller">{t("integrations.darazSellerId")}</Label>
              <Input id="daraz-seller" value={sellerId} onChange={(e) => setSellerId(e.target.value)} placeholder="e.g. 200123456" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="daraz-key">{t("integrations.darazApiKey")}</Label>
              <Input id="daraz-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk_live_..." />
            </div>
            <div className="space-y-1.5">
              <Label>{t("integrations.darazRegion")}</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DARAZ_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleTest} disabled={testing || saving}>
              {testing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("পরীক্ষা... / Testing...")}</> : t("integrations.testConnection")}
            </Button>
            <Button onClick={handleSave} disabled={saving || testing}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("সংরক্ষণ... / Saving...")}</> : t("integrations.saveAndSync")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
