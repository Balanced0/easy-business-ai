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
  analyticsFacts: string,
  hasData: boolean,
  language: "bn" | "en",
) {
  const langRule =
    language === "bn"
      ? `LANGUAGE RULE (CRITICAL): Reply ONLY in Bangla (Bengali). Do NOT include English translations. Use natural, conversational Bangla.`
      : `LANGUAGE RULE (CRITICAL): Reply ONLY in English. Do NOT include Bangla translations. Use clear, conversational English.`;

  const businessBlock = business
    ? `BUSINESS PROFILE:
- Name: ${business.business_name ?? "(unknown)"}
- Industry: ${business.industry ?? "(not specified)"}
- Description: ${business.description ?? "(not specified)"}
- Products: ${business.products ?? "(not specified)"}
- Target market: ${business.target_market ?? "(not specified)"}`
    : `BUSINESS PROFILE: (not yet provided)`;

  const noDataRule = hasData
    ? ""
    : `\nCRITICAL DATA RULE: The user has NOT uploaded any business data yet. You MUST NOT fabricate revenue, sales trends, inventory risks, customer sentiment, forecasts, competitor data, or trending products. For any question that requires business analytics, reply briefly with: "${language === "bn" ? "এই মুহূর্তে আমার কাছে আপনার ব্যবসার ডেটা নেই। বিশ্লেষণ পেতে অনুগ্রহ করে Upload পেজ থেকে আপনার sales/inventory/products/reviews/orders ফাইল আপলোড করুন।" : "I do not currently have business data available for analysis. Please upload your sales/inventory/products/reviews/orders files from the Upload page to activate analytics."}". Greetings, definitions, and generic how-to questions are still fine to answer.`;

  return `You are EasyBusiness AI — a practical AI commerce assistant for a small ecommerce store owner.

${langRule}

GROUNDING RULES (CRITICAL):
- Ground every analytics claim in the ANALYTICS FACTS and RETRIEVED CONTEXT below.
- Never invent revenue, units, SKUs, sentiment percentages, or trend numbers.
- If data is missing for the question, say so explicitly. Do not hedge with made-up estimates.
${noDataRule}

${businessBlock}

ANALYTICS FACTS (computed from this user's uploaded data):
${analyticsFacts || "(no analytics available — user has not uploaded data)"}

RETRIEVED CONTEXT (top semantic matches from this user's uploaded data):
${retrieved || "(no relevant documents found — user may not have uploaded relevant data)"}`;
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

        // Compute analytics facts from real uploaded data.
        const { computeAnalyticsForUser } = await import("@/lib/data-pipeline.server");
        const analytics = await computeAnalyticsForUser(authed.userId);

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: buildSystemPrompt(
            retrievedBlock,
            business as BusinessProfile | null,
            analytics.aiSummaryFacts,
            analytics.hasData,
            language,
          ),
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
