import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { getAuthedUser } from "@/lib/auth-route.server";
import { searchSimilar } from "@/lib/embeddings.server";
import {
  buildStructuredDashboardSearch,
  detectSearchMode,
} from "@/lib/dashboard-search";

function buildSearchPrompt(query: string, structuredSummary: string, retrieved: string, language: "bn" | "en") {
  const langRule =
    language === "bn"
      ? "Reply only in Bangla. No English translation."
      : "Reply only in English. No Bangla translation.";

  return `You are EasyBusiness AI generating a concise dashboard search summary.

${langRule}

User query: ${query}

Structured matches from the dashboard dataset:
${structuredSummary}

Retrieved knowledge base context:
${retrieved || "No extra retrieval context found."}

Instructions:
- Return a short, high-signal answer for a dashboard results panel.
- Mention specific products, inventory risks, trends, or customer issues when available.
- If data is thin, say so briefly and give the most likely next step.
- Keep it to 2-4 short bullet-style lines or compact sentences.`;
}

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

        const structured = buildStructuredDashboardSearch(query);
        const mode = detectSearchMode(query);

        let aiSummary: string | null = null;
        let ragMatches: Array<{ title: string | null; source_type: string; content: string }> = [];

        try {
          const matches = await searchSimilar(query, authed.userId, { matchCount: 4 });
          ragMatches = matches.map((match) => ({
            title: match.title,
            source_type: match.source_type,
            content: match.content,
          }));

          if (mode === "natural-language" || !structured.hasStructuredResults) {
            const key = process.env.LOVABLE_API_KEY;
            if (key) {
              const gateway = createLovableAiGatewayProvider(key);
              const structuredSummary = JSON.stringify(
                {
                  mode: structured.mode,
                  sections: structured.sections,
                  totalMatches: structured.totalMatches,
                  matchedProducts: structured.matchedProducts,
                  matchedInsights: structured.matchedInsights.slice(0, 4),
                },
                null,
                2,
              );
              const retrieved = ragMatches
                .map((match, index) => `#${index + 1} [${match.source_type}] ${match.title ?? ""}\n${match.content}`)
                .join("\n\n");

              const result = await generateText({
                model: gateway("google/gemini-3-flash-preview"),
                prompt: buildSearchPrompt(query, structuredSummary, retrieved, language),
              });
              aiSummary = result.text.trim() || null;
            }
          }
        } catch (error) {
          console.warn("[/api/search] AI/RAG step skipped:", error);
        }

        return Response.json({
          query,
          mode,
          structured,
          aiSummary,
          ragMatches,
        });
      },
    },
  },
});