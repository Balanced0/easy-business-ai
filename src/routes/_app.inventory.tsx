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
              <CardTitle className="text-2xl text-warning-foreground">{over.length}</CardTitle>
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
                        <Button size="sm" variant="outline">
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
    </>
  );
}
