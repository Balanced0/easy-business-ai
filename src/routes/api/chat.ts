// POST /api/chat — authenticated, per-user RAG chat with Gemini.

import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { searchSimilar } from "@/lib/embeddings.server";
import { getAuthedUser } from "@/lib/auth-route.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type BusinessProfile = {
  business_name: string | null;
  industry: string | null;
  description: string | null;
  products: string | null;
  target_market: string | null;
  monthly_revenue: string | null;
};

function buildSystemPrompt(
  retrieved: string,
  business: BusinessProfile | null,
  language: "bn" | "en",
) {
  const langRule =
    language === "bn"
      ? `LANGUAGE RULE (CRITICAL): Reply ONLY in Bangla (Bengali). Do NOT include English translations. Use natural, conversational Bangla.`
      : `LANGUAGE RULE (CRITICAL): Reply ONLY in English. Do NOT include Bangla translations. Use clear, conversational English.`;

  const businessBlock = business
    ? `BUSINESS PROFILE (the user owns this business — tailor every recommendation to it):
- Name: ${business.business_name ?? "(unknown)"}
- Industry: ${business.industry ?? "(not specified)"}
- Description: ${business.description ?? "(not specified)"}
- Products: ${business.products ?? "(not specified)"}
- Target market: ${business.target_market ?? "(not specified)"}
- Monthly revenue: ${business.monthly_revenue ?? "(not specified)"}`
    : `BUSINESS PROFILE: (not yet provided — answer generically and suggest completing onboarding)`;

  return `You are EasyBusiness AI — a friendly, practical AI commerce assistant for a small ecommerce store owner.

${langRule}

PERSONALITY:
- Warm and conversational. For greetings / small talk, respond naturally; do NOT force store data into the reply.
- For business / analytics questions, ground every claim in the BUSINESS PROFILE and RETRIEVED CONTEXT below. Cite specific numbers, SKUs, or product names when available.
- If the data does not cover the question, say so briefly and suggest what to track next.
- Keep answers concise. Short paragraphs or compact bullets. Never invent figures.

${businessBlock}

RETRIEVED CONTEXT (top semantic matches from this user's knowledge base):
${retrieved || "(no relevant documents found for this query — the user may need to seed their knowledge base from the assistant page)"}`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });

        let payload: { messages?: UIMessage[]; language?: "bn" | "en" } = {};
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = payload.messages;
        const language = payload.language === "en" ? "en" : "bn";
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        // Load this user's business profile (RLS via authed.supabase).
        const { data: business } = await authed.supabase
          .from("business_profiles")
          .select("business_name,industry,description,products,target_market,monthly_revenue")
          .eq("user_id", authed.userId)
          .maybeSingle();

        // Latest user text → embedding → RAG retrieval scoped to this user.
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const lastUserText =
          lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim() ?? "";

        let retrievedBlock = "";
        try {
          if (lastUserText.length > 2) {
            const matches = await searchSimilar(lastUserText, authed.userId, { matchCount: 6 });
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

        // Persist the latest user message to history (best-effort).
        if (lastUserText) {
          try {
            // Ensure a conversation exists (one per user for now).
            let conversationId: string | null = null;
            const { data: conv } = await supabaseAdmin
              .from("chat_conversations")
              .select("id")
              .eq("user_id", authed.userId)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (conv?.id) {
              conversationId = conv.id;
              await supabaseAdmin
                .from("chat_conversations")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", conversationId);
            } else {
              const { data: newConv } = await supabaseAdmin
                .from("chat_conversations")
                .insert({ user_id: authed.userId, title: lastUserText.slice(0, 80) })
                .select("id")
                .single();
              conversationId = newConv?.id ?? null;
            }
            if (conversationId) {
              await supabaseAdmin.from("chat_messages").insert({
                conversation_id: conversationId,
                user_id: authed.userId,
                role: "user",
                content: lastUserText,
                language,
              });
            }
          } catch (err) {
            console.warn("[/api/chat] history save skipped:", err);
          }
        }

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: buildSystemPrompt(retrievedBlock, business as BusinessProfile | null, language),
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
