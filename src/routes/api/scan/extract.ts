// POST /api/scan/extract — handwritten copy → structured rows via Gemini vision.
// Body: { kind: 'sales' | 'inventory' | 'products' | 'orders' | 'customers',
//         images: string[]  // data:image/...;base64,...
//       }
// Returns: { ok: true, rows: Array<Record<string, string>>, columns: string[], unclear: number }
//
// Charged per image (3 credits each) via the user's credit ledger,
// unless the user has a BYOK Gemini key.

import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";
import { getAuthedUser } from "@/lib/auth-route.server";
import { resolveUserGateway } from "@/lib/ai-gateway.server";
import {
  chargeCredits,
  refundCredits,
  isWorkspaceAiError,
  InsufficientCreditsError,
  insufficientCreditsResponse,
} from "@/lib/credits.server";

type ScanKind = "sales" | "inventory" | "products" | "orders" | "customers";

const SCHEMA_BY_KIND: Record<ScanKind, { columns: string[]; hint: string }> = {
  sales: {
    columns: ["date", "product_name", "sku", "quantity", "revenue", "channel"],
    hint: "Daily sales register. date = ISO yyyy-mm-dd. revenue = total amount for that line. channel = sales channel if shown.",
  },
  inventory: {
    columns: ["sku", "name", "stock", "reorder_threshold", "cost", "price"],
    hint: "Inventory / stock sheet. stock = units on hand. reorder_threshold = restock trigger.",
  },
  products: {
    columns: ["sku", "name", "category", "price"],
    hint: "Product catalog.",
  },
  orders: {
    columns: ["date", "order_id", "customer", "total", "status"],
    hint: "Order log.",
  },
  customers: {
    columns: ["name", "phone", "email", "city", "notes"],
    hint: "Customer list.",
  },
};

const Body = z.object({
  kind: z.enum(["sales", "inventory", "products", "orders", "customers"]),
  images: z.array(z.string().min(20)).min(1).max(6),
});

export const Route = createFileRoute("/api/scan/extract")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });

        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch (err) {
          return Response.json(
            { error: "Invalid input", detail: err instanceof Error ? err.message : String(err) },
            { status: 400 },
          );
        }

        const { kind, images } = parsed;
        const pageCount = images.length;

        let gw;
        try {
          gw = await resolveUserGateway(authed.userId);
        } catch {
          return new Response("AI gateway not configured", { status: 500 });
        }

        if (!gw.usedByok) {
          try {
            await chargeCredits(authed.userId, "scan_extract", { pages: pageCount }, pageCount);
          } catch (err) {
            if (err instanceof InsufficientCreditsError) return insufficientCreditsResponse(err);
            throw err;
          }
        }

        const schema = SCHEMA_BY_KIND[kind];
        const systemPrompt = `You are an expert OCR and structured-data extractor for handwritten ${kind} sheets used by small ecommerce businesses.

TASK
Extract every row from the provided ${pageCount > 1 ? `${pageCount} images (treat them as consecutive pages of the same sheet)` : "image"}.
Return strict JSON ONLY (no markdown, no commentary).

OUTPUT SHAPE
{
  "rows": [ { "${schema.columns.join('": "...", "')}": "..." }, ... ],
  "unclear_count": <integer total of cells you marked null>
}

COLUMNS: ${schema.columns.join(", ")}
HINT: ${schema.hint}

RULES
- Normalize numbers (Bangla ০১২৩ → ASCII 0123). Strip currency symbols and commas — leave bare numeric strings.
- Dates → "yyyy-mm-dd". If only day/month is written, infer the year as the current year.
- If a cell is unreadable, use null (not "").
- Skip header rows and totals/footer rows.
- Output every legible row, in order.`;

        try {
          const result = await generateText({
            model: gw.provider(gw.modelFor("vision")),
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: systemPrompt },
                  ...images.map((url) => ({
                    type: "image" as const,
                    image: url,
                  })),
                ],
              },
            ],
          });

          // The model is asked to return strict JSON; tolerate ```json wrappers.
          let text = result.text.trim();
          const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (fence) text = fence[1].trim();
          let payload: { rows?: unknown; unclear_count?: number };
          try {
            payload = JSON.parse(text);
          } catch (err) {
            console.error("[/api/scan/extract] non-JSON response", text.slice(0, 400));
            throw new Error("Model returned non-JSON output");
          }

          const rows = Array.isArray(payload.rows) ? payload.rows : [];
          const cleaned = rows
            .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
            .map((r) => {
              const out: Record<string, string> = {};
              for (const c of schema.columns) {
                const v = (r as Record<string, unknown>)[c];
                out[c] = v == null ? "" : String(v);
              }
              return out;
            });

          return Response.json({
            ok: true,
            kind,
            columns: schema.columns,
            rows: cleaned,
            unclear: typeof payload.unclear_count === "number" ? payload.unclear_count : 0,
            byok: gw.usedByok,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/scan/extract] failed", msg);
          if (!gw.usedByok) {
            await refundCredits(
              authed.userId,
              "scan_extract",
              { error: msg, workspace_unavailable: isWorkspaceAiError(err) },
              pageCount,
            );
          }
          const status = isWorkspaceAiError(err) ? 503 : 500;
          return Response.json(
            {
              error: isWorkspaceAiError(err) ? "WORKSPACE_AI_UNAVAILABLE" : "EXTRACTION_FAILED",
              message: msg,
            },
            { status },
          );
        }
      },
    },
  },
});
