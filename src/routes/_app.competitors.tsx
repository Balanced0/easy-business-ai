import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { competitorPrices } from "@/lib/sample-data";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export const Route = createFileRoute("/_app/competitors")({
  head: () => ({ meta: [{ title: "Competitors — EasyBusiness AI" }] }),
  component: CompetitorsPage,
});

const trends = [
  { label: "Apparel category", dir: "up", note: "Demand rising 6% WoW" },
  { label: "Footwear category", dir: "up", note: "Competitor B price cut 8%" },
  { label: "Accessories", dir: "flat", note: "Stable market share" },
  { label: "Electronics", dir: "down", note: "Avg. selling price falling" },
];

function CompetitorsPage() {
  return (
    <>
      <DashboardTopbar title="Competitor Intelligence" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trends.map((t) => (
            <Card key={t.label}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase">{t.label}</CardDescription>
                <CardTitle className="flex items-center gap-2 text-base">
                  {t.dir === "up" && <TrendingUp className="h-4 w-4 text-success" />}
                  {t.dir === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
                  {t.dir === "flat" && <Minus className="h-4 w-4 text-muted-foreground" />}
                  <span className="capitalize">{t.dir === "flat" ? "Stable" : t.dir}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{t.note}</CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Price & rating comparison</CardTitle>
            <CardDescription>Your prices vs. 3 tracked competitors</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Your price</TableHead>
                  <TableHead className="text-right">Comp A</TableHead>
                  <TableHead className="text-right">Comp B</TableHead>
                  <TableHead className="text-right">Comp C</TableHead>
                  <TableHead className="text-right">Your rating</TableHead>
                  <TableHead>Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitorPrices.map((c) => {
                  const avg = (c.compA + c.compB + c.compC) / 3;
                  const cheaper = c.you < avg;
                  return (
                    <TableRow key={c.product}>
                      <TableCell className="font-medium">{c.product}</TableCell>
                      <TableCell className="text-right">${c.you.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${c.compA.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${c.compB.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${c.compC.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{c.rating} ★</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            cheaper
                              ? "bg-success/10 text-success"
                              : "bg-warning/15 text-warning-foreground"
                          }
                        >
                          {cheaper ? "Below avg" : "Above avg"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
