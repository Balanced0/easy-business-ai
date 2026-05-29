import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { competitorPrices } from "@/lib/sample-data";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useT } from "@/hooks/use-language";

export const Route = createFileRoute("/_app/competitors")({
  head: () => ({ meta: [{ title: "প্রতিযোগী / Competitors — EasyBusiness AI" }] }),
  component: CompetitorsPage,
});

const trends = [
  { label: "পোশাক ক্যাটাগরি / Apparel category", dir: "up", note: "চাহিদা সপ্তাহে ৬% বাড়ছে / Demand rising 6% WoW" },
  { label: "ফুটওয়্যার ক্যাটাগরি / Footwear category", dir: "up", note: "Competitor B দাম ৮% কমিয়েছে / Competitor B price cut 8%" },
  { label: "অ্যাক্সেসরিজ / Accessories", dir: "flat", note: "স্থিতিশীল মার্কেট শেয়ার / Stable market share" },
  { label: "ইলেকট্রনিক্স / Electronics", dir: "down", note: "গড় বিক্রয় মূল্য কমছে / Avg. selling price falling" },
];

function CompetitorsPage() {
  const t = useT();
  return (
    <>
      <DashboardTopbar title="প্রতিযোগী ইন্টেলিজেন্স / Competitor Intelligence" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trends.map((tr) => (
            <Card key={tr.label}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase">{t(tr.label)}</CardDescription>
                <CardTitle className="flex items-center gap-2 text-base">
                  {tr.dir === "up" && <TrendingUp className="h-4 w-4 text-success" />}
                  {tr.dir === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
                  {tr.dir === "flat" && <Minus className="h-4 w-4 text-muted-foreground" />}
                  <span className="capitalize">
                    {tr.dir === "flat" ? t("স্থিতিশীল / Stable") : tr.dir === "up" ? t("ঊর্ধ্বমুখী / Up") : t("নিম্নমুখী / Down")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{t(tr.note)}</CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("মূল্য ও রেটিং তুলনা / Price & rating comparison")}</CardTitle>
            <CardDescription>{t("আপনার দাম বনাম ৩ জন প্রতিযোগী / Your prices vs. 3 tracked competitors")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("পণ্য / Product")}</TableHead>
                  <TableHead className="text-right">{t("আপনার দাম / Your price")}</TableHead>
                  <TableHead className="text-right">Comp A</TableHead>
                  <TableHead className="text-right">Comp B</TableHead>
                  <TableHead className="text-right">Comp C</TableHead>
                  <TableHead className="text-right">{t("আপনার রেটিং / Your rating")}</TableHead>
                  <TableHead>{t("অবস্থান / Position")}</TableHead>
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
                          {cheaper ? t("গড়ের নিচে / Below avg") : t("গড়ের উপরে / Above avg")}
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
