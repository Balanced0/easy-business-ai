import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage, useT } from "@/hooks/use-language";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "মূল্য / Pricing — EasyBusiness AI" },
      {
        name: "description",
        content:
          "EasyBusiness AI-এর সরল ও স্বচ্ছ মূল্য পরিকল্পনা। Simple, transparent pricing for SME ecommerce teams.",
      },
      { property: "og:title", content: "Pricing — EasyBusiness AI" },
      {
        property: "og:description",
        content: "Plans for solo sellers to enterprise marketplaces.",
      },
    ],
  }),
  component: PricingPage,
});

type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthly: number | null; // null => custom
  features: string[];
  cta: string;
  highlight?: boolean;
  ctaVariant?: "default" | "outline" | "secondary";
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "ফ্রি / Free",
    tagline: "ছোট দল ও পরীক্ষার জন্য / For testing and tiny stores",
    monthly: 0,
    features: [
      "১টি মার্কেটপ্লেস / 1 marketplace",
      "১০০ অর্ডার/মাস / 100 orders per month",
      "বেসিক ড্যাশবোর্ড / Basic dashboard",
      "এআই সহকারী নেই / No AI assistant",
      "প্রতিযোগী বিশ্লেষণ নেই / No competitor analysis",
      "RAG সার্চ নেই / No RAG search",
    ],
    cta: "শুরু করুন / Get started",
    ctaVariant: "outline",
  },
  {
    id: "starter",
    name: "স্টার্টার / Starter",
    tagline: "প্রথম বৃদ্ধির জন্য / For your first growth phase",
    monthly: 19,
    features: [
      "৩টি মার্কেটপ্লেস / 3 marketplaces",
      "১,০০০ অর্ডার/মাস / 1,000 orders per month",
      "এআই সহকারী (৫০ প্রশ্ন/মাস) / AI assistant (50 queries per month)",
      "বেসিক প্রতিযোগী (৫ সার্চ/মাস) / Basic competitor (5 searches per month)",
      "শুধু CSV আপলোড / CSV upload only",
    ],
    cta: "ফ্রি ট্রায়াল শুরু করুন / Start free trial",
  },
  {
    id: "pro",
    name: "প্রো / Pro",
    tagline: "স্কেলিং ব্র্যান্ডের জন্য / For scaling brands",
    monthly: 49,
    features: [
      "আনলিমিটেড মার্কেটপ্লেস / Unlimited marketplaces",
      "১০,০০০ অর্ডার/মাস / 10,000 orders per month",
      "আনলিমিটেড এআই সহকারী / Unlimited AI assistant",
      "আনলিমিটেড প্রতিযোগী বিশ্লেষণ / Unlimited competitor analysis",
      "RAG সার্চ / RAG search",
      "ভয়েস সহকারী / Voice assistant",
      "অ্যাডভান্সড KPIs / Advanced KPIs",
      "প্রাইওরিটি সাপোর্ট / Priority support",
    ],
    cta: "ফ্রি ট্রায়াল শুরু করুন / Start free trial",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "এন্টারপ্রাইজ / Enterprise",
    tagline: "বড় টিম ও কাস্টম চাহিদা / Large teams & custom needs",
    monthly: null,
    features: [
      "প্রো-এর সবকিছু / Everything in Pro",
      "কাস্টম ইন্টিগ্রেশন / Custom integrations",
      "ডেডিকেটেড সাপোর্ট / Dedicated support",
      "SLA / SLA guarantee",
      "হোয়াইট-লেবেল / White-label option",
      "API অ্যাক্সেস / API access",
    ],
    cta: "সেলসের সাথে যোগাযোগ / Contact sales",
    ctaVariant: "outline",
  },
];

const COMPARISON: { label: string; values: (string | boolean)[] }[] = [
  { label: "মার্কেটপ্লেস / Marketplaces", values: ["1", "3", "Unlimited", "Unlimited"] },
  { label: "অর্ডার/মাস / Orders per month", values: ["100", "1,000", "10,000", "Custom"] },
  { label: "ড্যাশবোর্ড / Dashboard", values: ["Basic", "Standard", "Advanced", "Advanced + Custom"] },
  { label: "এআই সহকারী / AI assistant", values: [false, "50/mo", "Unlimited", "Unlimited"] },
  { label: "প্রতিযোগী বিশ্লেষণ / Competitor analysis", values: [false, "5/mo", "Unlimited", "Unlimited"] },
  { label: "RAG সার্চ / RAG search", values: [false, false, true, true] },
  { label: "ভয়েস সহকারী / Voice assistant", values: [false, false, true, true] },
  { label: "ডেটা আপলোড / Data upload", values: ["CSV", "CSV", "CSV + XLSX + API", "All + Custom"] },
  { label: "API অ্যাক্সেস / API access", values: [false, false, false, true] },
  { label: "হোয়াইট-লেবেল / White-label", values: [false, false, false, true] },
  { label: "সাপোর্ট / Support", values: ["Community", "Email", "Priority", "Dedicated"] },
  { label: "SLA / SLA", values: [false, false, false, true] },
];

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
function toBn(s: string) {
  return s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

function PricingNav() {
  const { lang, toggleLang } = useLanguage();
  const t = useT();
  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">EasyBusiness AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="flex h-8 items-center overflow-hidden rounded-md border text-xs"
          >
            <span
              className={
                lang === "bn"
                  ? "bg-primary text-primary-foreground rounded py-[4px] px-[8px] mx-[4px]"
                  : "px-2 py-1 text-muted-foreground"
              }
            >
              বাং
            </span>
            <span
              className={
                lang === "en"
                  ? "bg-primary text-primary-foreground rounded py-[4px] px-[8px] mx-[4px]"
                  : "px-2 py-1 text-muted-foreground"
              }
            >
              En
            </span>
          </button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/login">{t("লগইন / Log in")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/signup">{t("সাইন আপ / Sign up")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function PricingPage() {
  const t = useT();
  const { lang } = useLanguage();
  const [annual, setAnnual] = useState(false);
  const [openPlan, setOpenPlan] = useState<Plan | null>(null);

  const fmtPrice = (monthly: number) => {
    const effective = annual ? Math.round(monthly * 0.8) : monthly;
    const s = `$${effective}`;
    return lang === "bn" ? toBn(s) : s;
  };

  const handleCTA = (plan: Plan) => {
    if (plan.id === "free") {
      window.location.href = "/signup";
      return;
    }
    if (plan.id === "enterprise") {
      window.location.href = "mailto:sales@easybusiness.ai?subject=Enterprise%20inquiry";
      return;
    }
    setOpenPlan(plan);
  };

  return (
    <div className="min-h-screen bg-background">
      <PricingNav />

      <main className="mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" />
            {t("সরল মূল্য / Simple pricing")}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            {t("আপনার ব্যবসার সাথে বাড়ুন / Plans that grow with you")}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {t(
              "যেকোনো সময় বাতিল করুন। কোন লুকানো ফি নেই। / Cancel anytime. No hidden fees. Switch plans whenever you need.",
            )}
          </p>

          {/* Billing toggle */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border bg-card px-4 py-2">
            <span className={`text-sm ${annual ? "text-muted-foreground" : "font-semibold"}`}>
              {t("মাসিক / Monthly")}
            </span>
            <Switch checked={annual} onCheckedChange={setAnnual} aria-label="Billing toggle" />
            <span className={`text-sm ${annual ? "font-semibold" : "text-muted-foreground"}`}>
              {t("বার্ষিক / Annual")}
            </span>
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {t("২০% ছাড় / Save 20%")}
            </Badge>
          </div>
        </div>

        {/* Plan cards */}
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${plan.highlight ? "border-primary shadow-lg ring-1 ring-primary/40" : ""}`}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {t("সবচেয়ে জনপ্রিয় / Most popular")}
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{t(plan.name)}</CardTitle>
                <CardDescription className="text-xs">{t(plan.tagline)}</CardDescription>
                <div className="mt-3 flex items-baseline gap-2">
                  {plan.monthly === null ? (
                    <span className="text-3xl font-bold">{t("কাস্টম / Custom")}</span>
                  ) : plan.monthly === 0 ? (
                    <span className="text-3xl font-bold">{t("ফ্রি / Free")}</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{fmtPrice(plan.monthly)}</span>
                      <span className="text-xs text-muted-foreground">{t("/মাস / /mo")}</span>
                      {annual && (
                        <span className="text-xs text-muted-foreground line-through">
                          {lang === "bn" ? toBn(`$${plan.monthly}`) : `$${plan.monthly}`}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{t(f)}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={plan.ctaVariant ?? "default"}
                  onClick={() => handleCTA(plan)}
                >
                  {t(plan.cta)}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comparison table */}
        <section className="mt-16">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold">{t("ফিচার তুলনা / Feature comparison")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("সব প্ল্যানের পার্থক্য এক নজরে / Every plan side-by-side")}
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">{t("ফিচার / Feature")}</TableHead>
                  {PLANS.map((p) => (
                    <TableHead key={p.id} className="text-center">
                      {t(p.name)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARISON.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{t(row.label)}</TableCell>
                    {row.values.map((v, i) => (
                      <TableCell key={i} className="text-center text-sm">
                        {typeof v === "boolean" ? (
                          v ? (
                            <Check className="mx-auto h-4 w-4 text-primary" />
                          ) : (
                            <X className="mx-auto h-4 w-4 text-muted-foreground/50" />
                          )
                        ) : (
                          v
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="mt-16 rounded-xl border bg-card p-8 text-center">
          <h3 className="text-xl font-semibold">
            {t("নিশ্চিত নন কোনটি বেছে নেবেন? / Not sure which plan fits?")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("আমাদের টিমের সাথে কথা বলুন। / Talk to our team — we'll help you pick the right plan.")}
          </p>
          <Button asChild className="mt-4" variant="outline">
            <a href="mailto:sales@easybusiness.ai">{t("যোগাযোগ করুন / Contact us")}</a>
          </Button>
        </section>
      </main>

      {/* Mock checkout */}
      <Dialog open={!!openPlan} onOpenChange={(o) => !o && setOpenPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("আপগ্রেড / Upgrade to")} {openPlan ? t(openPlan.name) : ""}
            </DialogTitle>
            <DialogDescription>
              {t("ডেমো চেকআউট — কোন আসল পেমেন্ট নেওয়া হবে না। / Demo checkout — no real payment will be processed.")}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setOpenPlan(null);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="card">{t("কার্ড নম্বর / Card number")}</Label>
              <Input id="card" placeholder="4242 4242 4242 4242" inputMode="numeric" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp">{t("মেয়াদ / Expiry")}</Label>
                <Input id="exp" placeholder="MM/YY" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cvc">CVC</Label>
                <Input id="cvc" placeholder="123" inputMode="numeric" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("কার্ডে নাম / Name on card")}</Label>
              <Input id="name" placeholder="Jane Doe" required />
            </div>
            {openPlan && openPlan.monthly !== null && openPlan.monthly > 0 && (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  {t(annual ? "বার্ষিক বিলিং / Billed annually" : "মাসিক বিলিং / Billed monthly")}
                </span>
                <span className="font-semibold">
                  {fmtPrice(openPlan.monthly)} {t("/মাস / /mo")}
                </span>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenPlan(null)}>
                {t("বাতিল / Cancel")}
              </Button>
              <Button type="submit">{t("সাবস্ক্রাইব / Subscribe")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
