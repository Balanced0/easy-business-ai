// Server-only data pipeline: parse uploaded files, validate, insert into per-user
// tables, and compute analytics from real stored data.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseCSV } from "@/lib/csv";
import * as XLSX from "xlsx";

export type UploadKind = "sales" | "inventory" | "products" | "reviews" | "orders";

export const UPLOAD_KINDS: UploadKind[] = [
  "sales",
  "inventory",
  "products",
  "reviews",
  "orders",
];

const ALIASES: Record<string, string> = {
  product: "product_name",
  product_name: "product_name",
  name: "name",
  item: "name",
  date: "date",
  sale_date: "date",
  order_date: "date",
  qty: "quantity",
  quantity: "quantity",
  units: "quantity",
  revenue: "revenue",
  sales: "revenue",
  amount: "revenue",
  total: "total",
  price: "price",
  cost: "cost",
  sku: "sku",
  channel: "channel",
  stock: "stock",
  inventory: "stock",
  on_hand: "stock",
  reorder: "reorder_threshold",
  reorder_threshold: "reorder_threshold",
  reorder_point: "reorder_threshold",
  category: "category",
  rating: "rating",
  stars: "rating",
  sentiment: "sentiment",
  content: "content",
  review: "content",
  comment: "content",
  order_id: "order_id",
  customer: "customer",
  customer_name: "customer",
  status: "status",
};

function norm(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, "_");
}

function mapRow(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = ALIASES[norm(k)] ?? norm(k);
    out[key] = v == null ? "" : String(v).trim();
  }
  return out;
}

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(String(v).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: string | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function parseFileBuffer(
  filename: string,
  buffer: ArrayBuffer,
): Promise<Record<string, unknown>[]> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = new TextDecoder().decode(buffer);
    return parseCSV(text);
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
  }
  throw new Error("Unsupported file type. Use .csv or .xlsx");
}

export type ValidationError = { row: number; message: string };

type IngestResult = { batchId: string; rowCount: number };

export async function ingestRows(opts: {
  userId: string;
  kind: UploadKind;
  filename: string;
  rawRows: Record<string, unknown>[];
}): Promise<{ ok: true; result: IngestResult } | { ok: false; errors: ValidationError[] }> {
  const { userId, kind, filename, rawRows } = opts;
  if (rawRows.length === 0) {
    return { ok: false, errors: [{ row: 0, message: "File contains no rows" }] };
  }

  const rows = rawRows.map(mapRow);
  const errors: ValidationError[] = [];

  // Create batch first
  const { data: batch, error: batchErr } = await supabaseAdmin
    .from("upload_batches")
    .insert({ user_id: userId, kind, filename, row_count: rows.length })
    .select("id")
    .single();
  if (batchErr || !batch) {
    return { ok: false, errors: [{ row: 0, message: batchErr?.message ?? "Failed to create batch" }] };
  }
  const batchId = batch.id;

  let inserted = 0;

  if (kind === "sales") {
    const payload = rows
      .map((r, i) => {
        if (!r.product_name && !r.name && !r.sku) {
          errors.push({ row: i + 2, message: "Missing product/sku" });
          return null;
        }
        return {
          user_id: userId,
          batch_id: batchId,
          sale_date: parseDate(r.date),
          sku: r.sku || null,
          product_name: r.product_name || r.name || null,
          quantity: num(r.quantity),
          revenue: num(r.revenue),
          channel: r.channel || null,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
    if (payload.length === 0) return { ok: false, errors: errors.length ? errors : [{ row: 0, message: "No valid sales rows" }] };
    const { error } = await supabaseAdmin.from("sales_records").insert(payload as never);
    if (error) return { ok: false, errors: [{ row: 0, message: error.message }] };
    inserted = payload.length;
  } else if (kind === "inventory") {
    const payload = rows
      .map((r, i) => {
        const sku = r.sku || r.name;
        if (!sku) {
          errors.push({ row: i + 2, message: "Missing sku/name" });
          return null;
        }
        return {
          user_id: userId,
          batch_id: batchId,
          sku,
          name: r.name || r.product_name || sku,
          stock: num(r.stock),
          reorder_threshold: num(r.reorder_threshold),
          cost: r.cost ? num(r.cost) : null,
          price: r.price ? num(r.price) : null,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
    if (payload.length === 0) return { ok: false, errors: errors.length ? errors : [{ row: 0, message: "No valid inventory rows" }] };
    const { error } = await supabaseAdmin.from("inventory_items").insert(payload as never);
    if (error) return { ok: false, errors: [{ row: 0, message: error.message }] };
    inserted = payload.length;
  } else if (kind === "products") {
    const payload = rows
      .map((r, i) => {
        if (!r.name && !r.product_name && !r.sku) {
          errors.push({ row: i + 2, message: "Missing name/sku" });
          return null;
        }
        return {
          user_id: userId,
          batch_id: batchId,
          sku: r.sku || null,
          name: r.name || r.product_name || r.sku,
          category: r.category || null,
          price: r.price ? num(r.price) : null,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
    if (payload.length === 0) return { ok: false, errors: errors.length ? errors : [{ row: 0, message: "No valid product rows" }] };
    const { error } = await supabaseAdmin.from("product_records").insert(payload as never);
    if (error) return { ok: false, errors: [{ row: 0, message: error.message }] };
    inserted = payload.length;
  } else if (kind === "reviews") {
    const payload = rows
      .map((r, i) => {
        if (!r.content && !r.rating) {
          errors.push({ row: i + 2, message: "Missing review content/rating" });
          return null;
        }
        const rating = r.rating ? num(r.rating) : null;
        let sentiment = r.sentiment?.toLowerCase() || null;
        if (!sentiment && rating != null) {
          sentiment = rating >= 4 ? "positive" : rating >= 3 ? "neutral" : "negative";
        }
        return {
          user_id: userId,
          batch_id: batchId,
          product: r.product_name || r.name || null,
          rating,
          sentiment,
          content: r.content || null,
          review_date: parseDate(r.date),
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
    if (payload.length === 0) return { ok: false, errors: errors.length ? errors : [{ row: 0, message: "No valid review rows" }] };
    const { error } = await supabaseAdmin.from("review_records").insert(payload as never);
    if (error) return { ok: false, errors: [{ row: 0, message: error.message }] };
    inserted = payload.length;
  } else if (kind === "orders") {
    const payload = rows
      .map((r, i) => {
        if (!r.order_id && !r.total) {
          errors.push({ row: i + 2, message: "Missing order_id/total" });
          return null;
        }
        const dateStr = r.date;
        return {
          user_id: userId,
          batch_id: batchId,
          order_id: r.order_id || null,
          customer: r.customer || null,
          total: num(r.total || r.revenue),
          status: r.status || null,
          ordered_at: dateStr && parseDate(dateStr) ? new Date(dateStr).toISOString() : null,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
    if (payload.length === 0) return { ok: false, errors: errors.length ? errors : [{ row: 0, message: "No valid order rows" }] };
    const { error } = await supabaseAdmin.from("order_records").insert(payload as never);
    if (error) return { ok: false, errors: [{ row: 0, message: error.message }] };
    inserted = payload.length;
  }

  await supabaseAdmin.from("upload_batches").update({ row_count: inserted }).eq("id", batchId);
  return { ok: true, result: { batchId, rowCount: inserted } };
}

// ============ ANALYTICS ============

export type Analytics = {
  hasData: boolean;
  dataAvailability: {
    sales: number;
    inventory: number;
    products: number;
    reviews: number;
    orders: number;
  };
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalUnits: number;
    averageOrderValue: number;
    lowStockCount: number;
    overstockCount: number;
    trendingProductCount: number;
  };
  salesTrend: Array<{ month: string; sales: number; orders: number }>;
  demandForecast: Array<{ week: string; actual: number | null; forecast: number }>;
  inventory: {
    low: Array<{ sku: string; name: string; stock: number; recommend: number; status: "low" }>;
    overstock: Array<{ sku: string; name: string; stock: number; recommend: number; status: "overstock" }>;
  };
  trendingProducts: Array<{ name: string; growth: string; unitsSold: number }>;
  sentiment: {
    breakdown: Array<{ name: string; value: number }>;
    positive: string[];
    complaints: string[];
  };
  summaryCards: Array<{ label: string; value: string; delta: string; positive: boolean }>;
  aiSummaryFacts: string;
  generatedAt: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function computeAnalyticsForUser(userId: string): Promise<Analytics> {
  const [salesRes, invRes, ordersRes, reviewsRes, productsRes] = await Promise.all([
    supabaseAdmin.from("sales_records").select("*").eq("user_id", userId).limit(10000),
    supabaseAdmin.from("inventory_items").select("*").eq("user_id", userId).limit(5000),
    supabaseAdmin.from("order_records").select("*").eq("user_id", userId).limit(10000),
    supabaseAdmin.from("review_records").select("*").eq("user_id", userId).limit(10000),
    supabaseAdmin.from("product_records").select("*").eq("user_id", userId).limit(5000),
  ]);

  const sales = (salesRes.data ?? []) as Array<{
    sale_date: string | null; product_name: string | null; sku: string | null;
    quantity: number; revenue: number;
  }>;
  const inventory = (invRes.data ?? []) as Array<{
    sku: string; name: string | null; stock: number; reorder_threshold: number;
  }>;
  const orders = (ordersRes.data ?? []) as Array<{ total: number; ordered_at: string | null }>;
  const reviews = (reviewsRes.data ?? []) as Array<{
    sentiment: string | null; rating: number | null; content: string | null; product: string | null;
  }>;
  const products = (productsRes.data ?? []);

  const dataAvailability = {
    sales: sales.length,
    inventory: inventory.length,
    products: products.length,
    reviews: reviews.length,
    orders: orders.length,
  };
  const hasData = Object.values(dataAvailability).some((n) => n > 0);

  // Sales trend by month (last 12)
  const byMonth = new Map<string, { sales: number; orders: number }>();
  for (const r of sales) {
    if (!r.sale_date) continue;
    const d = new Date(r.sale_date);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const cur = byMonth.get(key) ?? { sales: 0, orders: 0 };
    cur.sales += Number(r.revenue) || 0;
    cur.orders += Number(r.quantity) || 0;
    byMonth.set(key, cur);
  }
  const sortedMonths = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  const salesTrend = sortedMonths.map(([k, v]) => {
    const m = Number(k.split("-")[1]) - 1;
    return { month: MONTHS[m] ?? k, sales: Math.round(v.sales), orders: Math.round(v.orders) };
  });

  const totalRevenue = sales.reduce((s, r) => s + (Number(r.revenue) || 0), 0)
    + orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const totalUnits = sales.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const totalOrders = orders.length || sales.length;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Inventory classification
  const low = inventory
    .filter((i) => i.reorder_threshold > 0 && i.stock <= i.reorder_threshold)
    .map((i) => ({
      sku: i.sku,
      name: i.name ?? i.sku,
      stock: Number(i.stock) || 0,
      recommend: Math.max(0, Math.round((i.reorder_threshold || 0) * 2 - (Number(i.stock) || 0))),
      status: "low" as const,
    }));
  const overstockThreshold = (avg: number) => avg * 5;
  const avgStock = inventory.length
    ? inventory.reduce((s, i) => s + (Number(i.stock) || 0), 0) / inventory.length
    : 0;
  const overstock = inventory
    .filter((i) => avgStock > 0 && i.stock >= overstockThreshold(avgStock))
    .map((i) => ({
      sku: i.sku,
      name: i.name ?? i.sku,
      stock: Number(i.stock) || 0,
      recommend: 0,
      status: "overstock" as const,
    }));

  // Trending products: top by units across all sales, with growth vs prior period
  const productTotals = new Map<string, { units: number; recent: number; prior: number }>();
  const now = Date.now();
  const RECENT_MS = 30 * 24 * 60 * 60 * 1000;
  for (const r of sales) {
    const key = r.product_name || r.sku || "Unknown";
    const cur = productTotals.get(key) ?? { units: 0, recent: 0, prior: 0 };
    const qty = Number(r.quantity) || 0;
    cur.units += qty;
    if (r.sale_date) {
      const t = new Date(r.sale_date).getTime();
      if (!Number.isNaN(t)) {
        if (now - t <= RECENT_MS) cur.recent += qty;
        else if (now - t <= 2 * RECENT_MS) cur.prior += qty;
      }
    }
    productTotals.set(key, cur);
  }
  const trendingProducts = [...productTotals.entries()]
    .sort((a, b) => b[1].units - a[1].units)
    .slice(0, 6)
    .map(([name, v]) => {
      const growth = v.prior > 0 ? Math.round(((v.recent - v.prior) / v.prior) * 100) : 0;
      return {
        name,
        unitsSold: v.units,
        growth: growth === 0 && v.prior === 0 ? `${v.units} units` : `${growth >= 0 ? "+" : ""}${growth}%`,
      };
    });

  // Demand forecast: simple moving avg over last 8 weeks of sales
  const byWeek = new Map<string, number>();
  for (const r of sales) {
    if (!r.sale_date) continue;
    const d = new Date(r.sale_date);
    if (Number.isNaN(d.getTime())) continue;
    const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7);
    const key = `${d.getUTCFullYear()}-W${week}`;
    byWeek.set(key, (byWeek.get(key) ?? 0) + (Number(r.quantity) || 0));
  }
  const sortedWeeks = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8);
  const actualWeeks = sortedWeeks.map(([k, v], i) => ({ week: `W${i + 1}`, actual: Math.round(v) as number | null, forecast: 0 }));
  const baseAvg = actualWeeks.length
    ? actualWeeks.reduce((s, w) => s + (w.actual ?? 0), 0) / actualWeeks.length
    : 0;
  // Project next 4 weeks
  const forecastWeeks: Array<{ week: string; actual: number | null; forecast: number }> = [];
  for (let i = 0; i < 4; i++) {
    forecastWeeks.push({ week: `W${actualWeeks.length + i + 1}`, actual: null, forecast: Math.round(baseAvg * (1 + i * 0.05)) });
  }
  const demandForecast = [
    ...actualWeeks.map((w) => ({ ...w, forecast: Math.round((w.actual ?? 0) * 1.0) })),
    ...forecastWeeks,
  ];

  // Sentiment
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const r of reviews) {
    const s = (r.sentiment ?? "").toLowerCase();
    if (s === "positive" || s === "neutral" || s === "negative") {
      sentimentCounts[s as keyof typeof sentimentCounts]++;
    } else if (r.rating != null) {
      if (r.rating >= 4) sentimentCounts.positive++;
      else if (r.rating >= 3) sentimentCounts.neutral++;
      else sentimentCounts.negative++;
    }
  }
  const totalSentiment = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;
  const breakdown = totalSentiment === 0
    ? []
    : [
        { name: "Positive", value: Math.round((sentimentCounts.positive / totalSentiment) * 100) },
        { name: "Neutral", value: Math.round((sentimentCounts.neutral / totalSentiment) * 100) },
        { name: "Negative", value: Math.round((sentimentCounts.negative / totalSentiment) * 100) },
      ];

  const positive = reviews
    .filter((r) => (r.sentiment ?? "").toLowerCase() === "positive" || (r.rating ?? 0) >= 4)
    .slice(0, 3)
    .map((r) => r.content?.slice(0, 140) ?? `${r.product ?? "Product"} review`);
  const complaints = reviews
    .filter((r) => (r.sentiment ?? "").toLowerCase() === "negative" || ((r.rating ?? 5) <= 2))
    .slice(0, 3)
    .map((r) => r.content?.slice(0, 140) ?? `${r.product ?? "Product"} complaint`);

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const summaryCards = hasData
    ? [
        { label: "Total Sales", value: fmt(totalRevenue), delta: `${totalUnits} units`, positive: totalRevenue > 0 },
        { label: "Orders", value: String(totalOrders), delta: `AOV ${fmt(aov)}`, positive: totalOrders > 0 },
        {
          label: "Inventory Risk",
          value: `${low.length + overstock.length} items`,
          delta: `${low.length} low · ${overstock.length} overstock`,
          positive: low.length === 0 && overstock.length === 0,
        },
        {
          label: "Trending Products",
          value: String(trendingProducts.length),
          delta: trendingProducts[0]?.name ?? "—",
          positive: trendingProducts.length > 0,
        },
      ]
    : [];

  const aiSummaryFacts = hasData
    ? [
        `Total revenue: ${fmt(totalRevenue)} across ${totalOrders} orders (${totalUnits} units).`,
        trendingProducts.length
          ? `Top product: ${trendingProducts[0].name} (${trendingProducts[0].unitsSold} units${trendingProducts[0].growth ? `, ${trendingProducts[0].growth}` : ""}).`
          : "",
        low.length ? `${low.length} SKUs below reorder threshold.` : "",
        overstock.length ? `${overstock.length} SKUs in overstock state.` : "",
        breakdown.length
          ? `Sentiment: ${breakdown[0].value}% positive, ${breakdown[2]?.value ?? 0}% negative across ${totalSentiment} reviews.`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return {
    hasData,
    dataAvailability,
    summary: {
      totalRevenue: Math.round(totalRevenue),
      totalOrders,
      totalUnits,
      averageOrderValue: Number(aov.toFixed(2)),
      lowStockCount: low.length,
      overstockCount: overstock.length,
      trendingProductCount: trendingProducts.length,
    },
    salesTrend,
    demandForecast,
    inventory: { low, overstock },
    trendingProducts,
    sentiment: { breakdown, positive, complaints },
    summaryCards,
    aiSummaryFacts,
    generatedAt: new Date().toISOString(),
  };
}

// Build embedding documents from uploaded rows so RAG retrieval works on real data.
export function buildDocumentsFromBatch(
  kind: UploadKind,
  rows: Record<string, unknown>[],
): Array<{ source_type: string; title: string; content: string; metadata: Record<string, unknown> }> {
  const docs: Array<{ source_type: string; title: string; content: string; metadata: Record<string, unknown> }> = [];
  // Chunk in groups of 25 rows for compact embeddings.
  for (let i = 0; i < rows.length; i += 25) {
    const chunk = rows.slice(i, i + 25);
    const lines = chunk.map((r) =>
      Object.entries(r)
        .filter(([, v]) => v !== "" && v != null)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | "),
    );
    docs.push({
      source_type: `upload:${kind}`,
      title: `${kind} batch ${Math.floor(i / 25) + 1}`,
      content: `User-uploaded ${kind} data:\n${lines.join("\n")}`,
      metadata: { kind, chunkStart: i, chunkEnd: i + chunk.length },
    });
  }
  return docs;
}
