// Builds KnowledgeDoc[] from the in-app sample data so we can seed the
// vector store with realistic ecommerce context (reviews, products,
// inventory, competitors, market trends).

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
import type { KnowledgeDoc } from "@/lib/embeddings.server";

export function buildSeedDocuments(): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = [];

  // High-level KPIs
  docs.push({
    source_type: "analytics",
    title: "Store KPI snapshot",
    content: summaryCards
      .map((c) => `${c.label}: ${c.value} (${c.delta})`)
      .join("\n"),
    metadata: { kind: "kpis" },
  });

  // Sales trend
  docs.push({
    source_type: "analytics",
    title: "Monthly sales trend (last 12 months)",
    content: salesTrend
      .map((m) => `${m.month}: $${m.sales} revenue across ${m.orders} orders`)
      .join("\n"),
    metadata: { kind: "sales_trend" },
  });

  // Demand forecast
  docs.push({
    source_type: "market_trend",
    title: "8-week demand forecast",
    content: demandForecast
      .map(
        (w) =>
          `${w.week}: actual=${w.actual ?? "n/a"}, forecast=${w.forecast}`,
      )
      .join("\n"),
    metadata: { kind: "demand_forecast" },
  });

  // Inventory rows — one doc per SKU for fine-grained retrieval
  for (const it of inventoryAlerts) {
    docs.push({
      source_type: "inventory",
      title: `${it.sku} — ${it.name}`,
      content: `SKU ${it.sku} (${it.name}) is currently at ${it.stock} units. Status: ${it.status}. Recommended reorder quantity: ${it.recommend}.`,
      metadata: { sku: it.sku, stock: it.stock, status: it.status },
    });
  }

  // Competitor pricing
  for (const c of competitorPrices) {
    docs.push({
      source_type: "competitor",
      title: `Competitor pricing — ${c.product}`,
      content: `For ${c.product}, our price is $${c.you}. Competitor A: $${c.compA}. Competitor B: $${c.compB}. Competitor C: $${c.compC}. Average customer rating: ${c.rating}.`,
      metadata: { product: c.product, rating: c.rating },
    });
  }

  // Trending products
  docs.push({
    source_type: "market_trend",
    title: "Trending products this period",
    content: trendingProducts
      .map((p) => `${p.name}: growth ${p.growth}`)
      .join("\n"),
    metadata: { kind: "trending" },
  });

  // Reviews — positive trends and complaints become individual review docs
  for (const t of positiveTrends) {
    docs.push({
      source_type: "review",
      title: "Positive customer feedback theme",
      content: t,
      metadata: { sentiment: "positive" },
    });
  }
  for (const c of complaints) {
    docs.push({
      source_type: "review",
      title: "Customer complaint theme",
      content: c,
      metadata: { sentiment: "negative" },
    });
  }

  return docs;
}
