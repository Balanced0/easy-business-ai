// POST /api/search — RAG-only semantic search over the user's uploaded data.
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { getAuthedUser } from "@/lib/auth-route.server";
import { searchSimilar } from "@/lib/embeddings.server";
import { computeAnalyticsForUser } from "@/lib/data-pipeline.server";

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });

        let payload: { query?: string; language?: "bn" | "en" } = {};
        try {
          payload = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const query = payload.query?.trim();
        const language = payload.language === "en" ? "en" : "bn";
        if (!query) return Response.json({ error: "Query is required" }, { status: 400 });

        const analytics = await computeAnalyticsForUser(authed.userId);

        if (!analytics.hasData) {
          return Response.json({
            query,
            hasData: false,
            ragMatches: [],
            aiSummary:
              language === "bn"
                ? "এই মুহূর্তে আপনার ব্যবসার কোনো ডেটা আপলোড করা নেই। বিশ্লেষণ চালু করতে অনুগ্রহ করে Upload পেজ থেকে CSV/XLSX আপলোড করুন।"
                : "No business data uploaded yet. Upload CSV/XLSX from the Upload page to activate analytics.",
            matchedProducts: [],
            matchedInsights: [],
          });
        }

        const q = query.toLowerCase();
        const matchedProducts = [
          ...analytics.inventory.low
            .filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
            .map((i) => ({ name: i.name, source: "inventory", detail: `${i.sku} · ${i.stock} in stock · Low` })),
          ...analytics.inventory.overstock
            .filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
            .map((i) => ({ name: i.name, source: "inventory", detail: `${i.sku} · ${i.stock} in stock · Overstock` })),
          ...analytics.trendingProducts
            .filter((p) => p.name.toLowerCase().includes(q))
            .map((p) => ({ name: p.name, source: "trending", detail: `${p.unitsSold} units · ${p.growth}` })),
        ];

        let ragMatches: Array<{ title: string | null; source_type: string; content: string }> = [];
        let aiSummary: string | null = null;
        try {
          const matches = await searchSimilar(query, authed.userId, { matchCount: 4 });
          ragMatches = matches.map((m) => ({ title: m.title, source_type: m.source_type, content: m.content }));

          const key = process.env.LOVABLE_API_KEY;
          if (key) {
            const gateway = createLovableAiGatewayProvider(key);
            const retrieved = ragMatches
              .map((m, i) => `#${i + 1} [${m.source_type}] ${m.title ?? ""}\n${m.content}`)
              .join("\n\n");
            const prompt = `You are EasyBusiness AI generating a concise dashboard search summary.

${language === "bn" ? "Reply only in Bangla. No English translation." : "Reply only in English."}

User query: ${query}

ANALYTICS FACTS (computed from user's uploaded data):
${analytics.aiSummaryFacts}

RETRIEVED CONTEXT (top semantic matches from user's uploaded data):
${retrieved || "(no extra retrieval context)"}

Rules:
- Ground every claim in the facts and retrieved context above.
- Never invent numbers, SKUs, or trends. If data is missing for the query, say so briefly.
- 2-4 short bullet-style lines.`;
            const result = await generateText({ model: gateway("google/gemini-3-flash-preview"), prompt });
            aiSummary = result.text.trim() || null;
          }
        } catch (error) {
          console.warn("[/api/search] AI/RAG step skipped:", error);
        }

        return Response.json({
          query,
          hasData: true,
          matchedProducts,
          matchedInsights: [analytics.aiSummaryFacts].filter(Boolean),
          aiSummary,
          ragMatches,
        });
      },
    },
  },
});
