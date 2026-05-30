// POST /api/chat
// Streaming chat endpoint. For each user turn we:
//   1. Take the latest user message
//   2. Embed it and run a similarity search over knowledge_documents
//   3. Inject the matched context + the live store snapshot into the
//      system prompt
//   4. Stream Gemini's response back via the AI SDK UI message stream
//
// Small-talk ("hi", "how are you", "what can you do?") is handled by the
// model itself — no hardcoded branches.

import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { searchSimilar } from "@/lib/embeddings.server";
import {
  aiSummary,
  competitorPrices,
  inventoryAlerts,
  summaryCards,
  trendingProducts,
} from "@/lib/sample-data";

function buildSystemPrompt(retrieved: string, liveContext: string) {
  return `You are EasyBusiness AI — a friendly, practical AI commerce assistant for a small ecommerce store owner.

LANGUAGE RULE (CRITICAL): Always reply in BANGLA (Bengali) FIRST, then provide the SAME answer in ENGLISH right after, using this format:

বাংলা: <answer in Bangla>

English: <same answer in English>

PERSONALITY:
- Be warm and conversational. For greetings or small talk ("hi", "how are you", "what can you do?"), respond naturally like a real AI assistant — do NOT force store data into the answer.
- For business / analytics questions, ground every claim in the RETRIEVED CONTEXT or LIVE STORE SNAPSHOT below. Cite specific numbers, SKUs, or product names.
- If the data does not cover the question, say so briefly and suggest what to track next.
- Keep answers concise. Use short paragraphs or compact bullets. Never invent figures.

RETRIEVED CONTEXT (top semantic matches from the knowledge base for this question):
${retrieved || "(no relevant documents found for this query)"}

LIVE STORE SNAPSHOT:
${liveContext}`;
}

function liveSnapshot() {
  return JSON.stringify(
    {
      headlineSummary: aiSummary,
      kpis: summaryCards,
      inventoryAlerts,
      competitorPrices,
      trendingProducts,
    },
    null,
    2,
  );
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: { messages?: UIMessage[] } = {};
        try {
          payload = (await request.json()) as { messages?: UIMessage[] };
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = payload.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        // Extract the latest user message text for retrieval
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const lastUserText =
          lastUser?.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join(" ")
            .trim() ?? "";

        // RAG retrieval — best-effort. If embeddings table is empty or fails,
        // we still proceed with the live snapshot so chat never breaks.
        let retrievedBlock = "";
        try {
          if (lastUserText.length > 2) {
            const matches = await searchSimilar(lastUserText, { matchCount: 6 });
            if (matches.length > 0) {
              retrievedBlock = matches
                .map(
                  (m, i) =>
                    `#${i + 1} [${m.source_type}] ${m.title ?? ""} (similarity ${m.similarity.toFixed(3)})\n${m.content}`,
                )
                .join("\n\n");
            }
          }
        } catch (err) {
          console.warn("[/api/chat] retrieval skipped:", err);
        }

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: buildSystemPrompt(retrievedBlock, liveSnapshot()),
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
