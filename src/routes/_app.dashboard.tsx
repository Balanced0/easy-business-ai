import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  salesTrend,
  demandForecast,
  inventoryAlerts,
  competitorPrices,
  sentimentBreakdown,
  summaryCards,
  aiSummary,
  trendingProducts,
} from "@/lib/sample-data";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EasyBusiness AI" },
      { name: "description", content: "Overview of sales, inventory, and AI insights." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <>
      <DashboardTopbar title="Dashboard" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        {/* Summary cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wide">
                  {c.label}
                </CardDescription>
                <CardTitle className="text-2xl">{c.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`flex items-center gap-1 text-xs ${
                    c.positive ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  {c.positive ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  )}
                  {c.delta}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI summary */}
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">AI business summary</CardTitle>
              <Badge variant="secondary" className="ml-auto text-xs">Updated 2 min ago</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {aiSummary}
            </p>
          </CardContent>
        </Card>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Sales trend</CardTitle>
              <CardDescription>Monthly revenue, last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend} margin={{ left: -10, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      fill="url(#g1)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trending products</CardTitle>
              <CardDescription>Top movers this week</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {trendingProducts.map((p) => (
                  <li key={p.name} className="flex items-center justify-between">
                    <span className="text-sm">{p.name}</span>
                    <Badge variant="secondary" className="text-success bg-success/10">
                      {p.growth}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Forecast + sentiment */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Demand forecast</CardTitle>
              <CardDescription>Actual vs. predicted units, next 4 weeks projected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={demandForecast} margin={{ left: -10, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="actual" stroke="var(--color-chart-1)" strokeWidth={2} />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="var(--color-chart-2)"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer sentiment</CardTitle>
              <CardDescription>Last 30 days reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {sentimentBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
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
        </div>

        {/* Inventory + competitors */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory alerts</CardTitle>
              <CardDescription>Items needing attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {inventoryAlerts.map((i) => (
                <div
                  key={i.sku}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">
                      SKU {i.sku} · {i.stock} in stock
                    </div>
                  </div>
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
                    {i.status === "low" ? "Low stock" : "Overstock"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Competitor pricing</CardTitle>
              <CardDescription>Compared to 3 tracked competitors</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">You</TableHead>
                    <TableHead className="text-right">A</TableHead>
                    <TableHead className="text-right">B</TableHead>
                    <TableHead className="text-right">C</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitorPrices.map((c) => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
