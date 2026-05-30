// GET /api/analytics
// Returns aggregated ecommerce metrics derived from the sample dataset.
// In a real deployment this would query live Supabase tables; here it
// exposes the same dataset the dashboard uses so the AI assistant and any
// external caller share a single source of truth.

import { createFileRoute } from "@tanstack/react-router";
import {
  competitorPrices,
  complaints,
  demandForecast,
  inventoryAlerts,
  positiveTrends,
  salesTrend,
  summaryCards,
  trendingProducts,
} from "@/lib/sample-data";

export const Route = createFileRoute("/api/analytics")({
  server: {
    handlers: {
      GET: async () => {
        const totalRevenue = salesTrend.reduce((s, m) => s + m.sales, 0);
        const totalOrders = salesTrend.reduce((s, m) => s + m.orders, 0);
        const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const lowStock = inventoryAlerts.filter((i) => i.status === "low");
        const overstock = inventoryAlerts.filter((i) => i.status === "overstock");

        return Response.json({
          summary: {
            totalRevenue,
            totalOrders,
            averageOrderValue: Number(aov.toFixed(2)),
            lowStockCount: lowStock.length,
            overstockCount: overstock.length,
          },
          summaryCards,
          salesTrend,
          demandForecast,
          inventory: {
            low: lowStock,
            overstock,
          },
          competitors: competitorPrices,
          trendingProducts,
          sentiment: {
            positive: positiveTrends,
            complaints,
          },
          generatedAt: new Date().toISOString(),
        });
      },
    },
  },
});
