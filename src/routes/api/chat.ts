import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  salesTrend,
  demandForecast,
  inventoryAlerts,
  competitorPrices,
  sentimentBreakdown,
  positiveTrends,
  complaints,
  trendingProducts,
  summaryCards,
  aiSummary,
} from "@/lib/sample-data";

const storeContext = JSON.stringify(
  {
    summaryCards,
    aiSummary,
    salesTrend,
    demandForecast,
    inventoryAlerts,
    competitorPrices,
    sentimentBreakdown,
    positiveTrends,
    complaints,
    trendingProducts,
  },
  null,
  2,
);

const systemPrompt = `You are the EasyBusiness AI commerce assistant for a small ecommerce store owner.
Be concise, practical, and friendly. Use plain language — no jargon.
Always ground answers in the STORE DATA below. Cite specific numbers, SKUs, or product names when relevant.
If the user asks something not covered by the data, say so briefly and suggest what data they'd need to track.
Format answers with short paragraphs or compact bullet lists.

STORE DATA (JSON):
${storeContext}`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: systemPrompt,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
