import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { ThumbsUp, MessageCircleWarning, Upload } from "lucide-react";
import { useT } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({ meta: [{ title: "গ্রাহক / Customer Insights — EasyBusiness AI" }] }),
  component: CustomersPage,
});

type Analytics = {
  hasData: boolean;
  sentiment: { breakdown: Array<{ name: string; value: number }>; positive: string[]; complaints: string[] };
  dataAvailability: { reviews: number };
};

const COLORS = ["var(--color-chart-2)", "var(--color-chart-3)", "var(--color-destructive)"];

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function CustomersPage() {
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

  const breakdown = (a?.sentiment.breakdown ?? []).map((s, i) => ({ ...s, color: COLORS[i] ?? "var(--color-chart-1)" }));
  const positive = a?.sentiment.positive ?? [];
  const complaints = a?.sentiment.complaints ?? [];
  const hasReviews = (a?.dataAvailability.reviews ?? 0) > 0;

  return (
    <>
      <DashboardTopbar title="গ্রাহক অন্তর্দৃষ্টি / Customer Insights" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        {!loading && !hasReviews && (
          <Card className="border-warning/40 bg-warning/[0.04]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <CardTitle className="text-base">{t("কোনও রিভিউ ডেটা নেই / No review data")}</CardTitle>
                <Button asChild size="sm" className="ml-auto">
                  <Link to="/upload">{t("রিভিউ আপলোড / Upload reviews")}</Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("রিভিউ সন্তুষ্টি / Review sentiment")}</CardTitle>
              <CardDescription>{t("আপনার আপলোডকৃত রিভিউ থেকে / From your uploaded reviews")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                {breakdown.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t("কোনও ডেটা নেই / No data")}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                        {breakdown.map((e) => (
                          <Cell key={e.name} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("সারাংশ / Summary")}</CardTitle>
              <CardDescription>{a?.dataAvailability.reviews ?? 0} {t("রিভিউ বিশ্লেষণ করা হয়েছে / reviews analyzed")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {breakdown.map((b) => (
                <div key={b.name} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{b.name}</span>
                  <span className="font-medium">{b.value}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-success" />
                <CardTitle className="text-base">{t("ইতিবাচক ফিডব্যাক / Positive feedback")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {positive.length === 0 ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">{t("কোনও ইতিবাচক রিভিউ নেই / No positive reviews")}</div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {positive.map((p, i) => (
                    <li key={i} className="flex gap-2 rounded-md border p-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageCircleWarning className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base">{t("সাধারণ অভিযোগ / Common complaints")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {complaints.length === 0 ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">{t("কোনও অভিযোগ নেই / No complaints")}</div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {complaints.map((p, i) => (
                    <li key={i} className="flex gap-2 rounded-md border p-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
