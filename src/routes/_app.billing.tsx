import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, Sparkles, Calendar, ShoppingCart, ArrowDownRight, ArrowUpRight, Check } from "lucide-react";
import { useT } from "@/hooks/use-language";
import { useCredits } from "@/hooks/use-credits";
import { getCreditPacks, getMyTransactions, type CreditPack, type MyTransaction } from "@/lib/credits.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({ meta: [{ title: "বিলিং ও ক্রেডিট / Billing & Credits — EasyBusiness AI" }] }),
  component: BillingPage,
});

function BillingPage() {
  const t = useT();
  const { credits, total, refresh } = useCredits();
  const fetchPacks = useServerFn(getCreditPacks);
  const fetchTx = useServerFn(getMyTransactions);

  const { data: packs = [] } = useQuery({
    queryKey: ["credit-packs"],
    queryFn: () => fetchPacks(),
    staleTime: 5 * 60_000,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["my-transactions"],
    queryFn: () => fetchTx(),
    staleTime: 30_000,
  });

  const resetDate = credits?.quotaResetAt
    ? new Date(credits.quotaResetAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";

  const handleBuy = (pack: CreditPack) => {
    // Stripe checkout flow is wired in a follow-up step.
    toast.info(
      t(
        "পেমেন্ট ইন্টিগ্রেশন শীঘ্রই আসছে — আমরা Stripe সেটআপ সম্পন্ন করছি। / Payments are being set up — Stripe checkout is coming next.",
      ),
      { description: `${pack.name} • ${pack.credits.toLocaleString()} credits` },
    );
    refresh();
  };

  return (
    <>
      <DashboardTopbar title="বিলিং ও ক্রেডিট / Billing & Credits" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        {/* Balance summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Zap className="h-3.5 w-3.5" />
                {t("মোট ক্রেডিট / Total credits")}
              </CardDescription>
              <CardTitle className="text-3xl">{total.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {t("সব এআই অ্যাকশনের জন্য ব্যবহারযোগ্য / Usable for every AI action")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                {t("ফ্রি কোটা বাকি / Free quota left")}
              </CardDescription>
              <CardTitle className="text-3xl">
                {(credits?.freeQuotaRemaining ?? 0).toLocaleString()}
                <span className="text-base font-normal text-muted-foreground">
                  {" / "}
                  {(credits?.freeQuotaMonthly ?? 100).toLocaleString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {t("প্রতি মাসে রিসেট / Resets every month")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                {t("পরবর্তী রিসেট / Next reset")}
              </CardDescription>
              <CardTitle className="text-xl">{resetDate}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {t("আজীবন কেনা: / Lifetime purchased:")} {(credits?.lifetimePurchased ?? 0).toLocaleString()}
            </CardContent>
          </Card>
        </div>

        {/* Credit packs */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("ক্রেডিট প্যাক কিনুন / Buy credit packs")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {packs.map((pack, idx) => {
              const popular = idx === 1;
              const pricePerCredit = pack.price_cents / pack.credits;
              return (
                <Card key={pack.id} className={popular ? "border-primary shadow-md" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{pack.name}</CardTitle>
                      {popular && <Badge>{t("জনপ্রিয় / Popular")}</Badge>}
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">${(pack.price_cents / 100).toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        / {pack.credits.toLocaleString()} {t("ক্রেডিট / credits")}
                      </span>
                    </div>
                    <CardDescription>
                      ≈ ${pricePerCredit.toFixed(4)} {t("প্রতি ক্রেডিট / per credit")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      {t("কখনও মেয়াদ শেষ হয় না / Never expire")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      {t("সব এআই ফিচারে কাজ করে / Works on every AI feature")}
                    </div>
                    <Button className="mt-3 w-full" onClick={() => handleBuy(pack)}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {t("কিনুন / Buy")}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {packs.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("ক্রেডিট প্যাক লোড হচ্ছে... / Loading packs...")}</p>
            )}
          </div>
        </section>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("সাম্প্রতিক ক্রেডিট লেনদেন / Recent credit activity")}</CardTitle>
            <CardDescription>{t("শেষ ৫০টি কার্যক্রম / Last 50 activities")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("সময় / When")}</TableHead>
                  <TableHead>{t("কারণ / Reason")}</TableHead>
                  <TableHead className="text-right">{t("পরিবর্তন / Change")}</TableHead>
                  <TableHead className="text-right">{t("ব্যালেন্স / Balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TxRow key={tx.id} tx={tx} />
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                      {t("কোনো কার্যক্রম নেই / No activity yet")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function TxRow({ tx }: { tx: MyTransaction }) {
  const t = useT();
  const isSpend = tx.delta < 0;
  const reasonLabel = formatReason(tx.reason, t);
  return (
    <TableRow>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(tx.created_at).toLocaleString()}
      </TableCell>
      <TableCell className="text-sm">{reasonLabel}</TableCell>
      <TableCell className="text-right">
        <span
          className={`inline-flex items-center gap-1 text-sm font-medium ${
            isSpend ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {isSpend ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
          {isSpend ? "" : "+"}
          {tx.delta}
        </span>
      </TableCell>
      <TableCell className="text-right text-sm">{tx.balance_after}</TableCell>
    </TableRow>
  );
}

function formatReason(reason: string, t: (s: string) => string): string {
  if (reason === "free_grant") return t("স্বাগত ক্রেডিট / Welcome credits");
  if (reason === "monthly_reset") return t("মাসিক রিসেট / Monthly reset");
  if (reason === "purchase") return t("ক্রেডিট কেনা / Credit purchase");
  if (reason === "refund") return t("ফেরত / Refund");
  if (reason.startsWith("spend:")) {
    const action = reason.slice(6);
    const map: Record<string, string> = {
      chat: t("এআই সহকারী মেসেজ / AI Assistant message"),
      voice_tts: t("ভয়েস রিপ্লাই / Voice reply"),
      voice_stt: t("ভয়েস ট্রান্সক্রিপশন / Voice transcription"),
      competitor_analyze: t("প্রতিযোগী বিশ্লেষণ / Competitor analysis"),
      competitor_discover: t("প্রতিযোগী খোঁজ / Competitor discovery"),
      competitor_scrape: t("প্রতিযোগী স্ক্র্যাপ / Competitor scrape"),
      embedding: t("ডেটা ইন্ডেক্সিং / Data indexing"),
      dashboard_summary: t("ড্যাশবোর্ড সারসংক্ষেপ / Dashboard summary"),
    };
    return map[action] ?? action;
  }
  return reason;
}
