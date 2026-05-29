import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { sentimentBreakdown, positiveTrends, complaints } from "@/lib/sample-data";
import { ThumbsUp, MessageCircleWarning } from "lucide-react";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({ meta: [{ title: "গ্রাহক / Customer Insights — EasyBusiness AI" }] }),
  component: CustomersPage,
});

const reviewVolume = [
  { day: "সোম / Mon", reviews: 18 },
  { day: "মঙ্গল / Tue", reviews: 22 },
  { day: "বুধ / Wed", reviews: 31 },
  { day: "বৃহস্পতি / Thu", reviews: 27 },
  { day: "শুক্র / Fri", reviews: 35 },
  { day: "শনি / Sat", reviews: 42 },
  { day: "রবি / Sun", reviews: 29 },
];

function CustomersPage() {
  return (
    <>
      <DashboardTopbar title="গ্রাহক অন্তর্দৃষ্টি / Customer Insights" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">রিভিউ সন্তুষ্টি / Review sentiment</CardTitle>
              <CardDescription>গত ৩০ দিনের বিভাজন / Last 30 days breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {sentimentBreakdown.map((e) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">রিভিউ ভলিউম / Review volume</CardTitle>
              <CardDescription>এই সপ্তাহ / This week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reviewVolume} margin={{ left: -10, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="reviews" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-success" />
                <CardTitle className="text-base">ইতিবাচক ফিডব্যাক প্রবণতা / Positive feedback trends</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {positiveTrends.map((p) => (
                  <li key={p} className="flex gap-2 rounded-md border p-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageCircleWarning className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base">সাধারণ অভিযোগ / Common complaints</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {complaints.map((p) => (
                  <li key={p} className="flex gap-2 rounded-md border p-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
