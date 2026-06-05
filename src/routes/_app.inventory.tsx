import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, TrendingDown, Package, Upload, Sparkles, ShoppingCart } from "lucide-react";
import { useT } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({ meta: [{ title: "ইনভেন্টরি / Inventory — EasyBusiness AI" }] }),
  component: InventoryPage,
});

type InvItem = { sku: string; name: string; stock: number; recommend: number; status: "low" | "overstock" };
type Analytics = {
  hasData: boolean;
  inventory: { low: InvItem[]; overstock: InvItem[] };
  summary: { lowStockCount: number; overstockCount: number };
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function InventoryPage() {
  const t = useT();
  const [a, setA] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InvItem | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const h = await authHeaders();
        const res = await fetch("/api/analytics", { headers: h });
        setA(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleConfirm = async () => {
    if (!selected) return;
    setActing(true);
    await new Promise((r) => setTimeout(r, 600));
    setActing(false);
    setSelected(null);
    toast.success(
      selected.status === "low"
        ? t(`রিস্টক অর্ডার তৈরি হয়েছে / Restock order created for ${selected.name} (${selected.recommend} units)`)
        : t(`প্রমো ক্যাম্পেইন শুরু হয়েছে / Promo campaign started for ${selected.name}`),
    );
  };


  const items = [...(a?.inventory.low ?? []), ...(a?.inventory.overstock ?? [])];
  const low = a?.inventory.low ?? [];
  const over = a?.inventory.overstock ?? [];

  return (
    <>
      <DashboardTopbar title="ইনভেন্টরি ইন্টেলিজেন্স / Inventory Intelligence" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        {!loading && !a?.hasData && (
          <Card className="border-warning/40 bg-warning/[0.04]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <CardTitle className="text-base">{t("কোনও ইনভেন্টরি ডেটা নেই / No inventory data")}</CardTitle>
                <Button asChild size="sm" className="ml-auto">
                  <Link to="/upload">{t("আপলোড / Upload")}</Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase">{t("কম স্টক / Low stock")}</CardDescription>
              <CardTitle className="text-2xl text-destructive">{low.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {t("রিঅর্ডার থ্রেশহোল্ডের নিচে / Below reorder threshold")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase">{t("অতিরিক্ত স্টক / Overstock")}</CardDescription>
              <CardTitle className="text-2xl text-warning">{over.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {t("প্রমো বা বান্ডেল বিবেচনা করুন / Consider promo or bundle")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase">{t("মোট SKU / Total SKUs")}</CardDescription>
              <CardTitle className="text-2xl">{items.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {t("সতর্কতাযুক্ত আইটেম / Items with alerts")}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("ইনভেন্টরি আইটেম / Inventory items")}</CardTitle>
            <CardDescription>{t("স্টক স্বাস্থ্য ও সুপারিশকৃত রিস্টক / Stock health and recommended restock")}</CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                {loading ? t("লোড হচ্ছে... / Loading...") : t("কোনও আইটেম নেই / No items")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("পণ্য / Product")}</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">{t("স্টকে / In stock")}</TableHead>
                    <TableHead>{t("অবস্থা / Status")}</TableHead>
                    <TableHead className="text-right">{t("সুপারিশকৃত রিস্টক / Recommended restock")}</TableHead>
                    <TableHead className="text-right">{t("অ্যাকশন / Action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={`${i.sku}-${i.status}`}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell className="text-muted-foreground">{i.sku}</TableCell>
                      <TableCell className="text-right">{i.stock}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={i.status === "low" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning-foreground"}
                        >
                          {i.status === "low" ? <TrendingDown className="mr-1 h-3 w-3" /> : <AlertTriangle className="mr-1 h-3 w-3" />}
                          {i.status === "low" ? t("কম / Low") : t("অতিরিক্ত / Overstock")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{i.recommend > 0 ? `${i.recommend} units` : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelected(i)}>
                          <Package className="mr-1 h-3 w-3" />
                          {i.status === "low" ? t("রিস্টক / Restock") : t("প্রমোট / Promote")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.status === "low" ? (
                <><ShoppingCart className="h-4 w-4" /> {t("রিস্টক নিশ্চিত করুন / Confirm restock")}</>
              ) : (
                <><Sparkles className="h-4 w-4" /> {t("প্রমোশন চালু করুন / Launch promotion")}</>
              )}
            </DialogTitle>
            <DialogDescription>
              {selected?.status === "low"
                ? t(`${selected?.name} (SKU ${selected?.sku}) এর জন্য ${selected?.recommend} ইউনিট অর্ডার করুন / Place an order for ${selected?.recommend} units of ${selected?.name} (SKU ${selected?.sku}). Current stock: ${selected?.stock}.`)
                : t(`${selected?.name} (SKU ${selected?.sku}) এর জন্য ১৫% ছাড়ের প্রমো শুরু করুন / Start a 15% promo on ${selected?.name} (SKU ${selected?.sku}) to clear ${selected?.stock} units in stock.`)}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("পণ্য / Product")}</span><span className="font-medium">{selected?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SKU</span><span>{selected?.sku}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("স্টক / Stock")}</span><span>{selected?.stock}</span></div>
            {selected?.status === "low" && (
              <div className="flex justify-between"><span className="text-muted-foreground">{t("সুপারিশ / Suggested")}</span><span className="font-medium">{selected?.recommend} units</span></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={acting}>{t("বাতিল / Cancel")}</Button>
            <Button onClick={handleConfirm} disabled={acting}>
              {acting ? t("প্রক্রিয়াকরণ... / Processing...") : selected?.status === "low" ? t("অর্ডার তৈরি করুন / Create order") : t("প্রমো শুরু করুন / Start promo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
