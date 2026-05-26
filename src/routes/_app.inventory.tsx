import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inventoryAlerts } from "@/lib/sample-data";
import { AlertTriangle, TrendingDown, Package } from "lucide-react";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({ meta: [{ title: "Inventory — EasyBusiness AI" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const low = inventoryAlerts.filter((i) => i.status === "low");
  const over = inventoryAlerts.filter((i) => i.status === "overstock");

  return (
    <>
      <DashboardTopbar title="Inventory Intelligence" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase">Low stock</CardDescription>
              <CardTitle className="text-2xl text-destructive">{low.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Action needed within 7 days
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase">Overstock</CardDescription>
              <CardTitle className="text-2xl text-warning-foreground">{over.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Consider promo or bundle
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase">Predicted demand (30d)</CardDescription>
              <CardTitle className="text-2xl">4,280 units</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-success">
              +9% vs. last month
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory items</CardTitle>
            <CardDescription>Stock health and AI recommended restock quantity</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">In stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Recommended restock</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryAlerts.map((i) => (
                  <TableRow key={i.sku}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="text-muted-foreground">{i.sku}</TableCell>
                    <TableCell className="text-right">{i.stock}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          i.status === "low"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/15 text-warning-foreground"
                        }
                      >
                        {i.status === "low" ? (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        ) : (
                          <AlertTriangle className="mr-1 h-3 w-3" />
                        )}
                        {i.status === "low" ? "Low" : "Overstock"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {i.recommend > 0 ? `${i.recommend} units` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">
                        <Package className="mr-1 h-3 w-3" />
                        {i.status === "low" ? "Restock" : "Promote"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
