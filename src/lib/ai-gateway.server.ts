// Per-user AI gateway that talks DIRECTLY to Google Gemini.
//
// No dependency on the Lovable AI Gateway. Resolution order:
//   1. If the user has a `byok_gemini_key` saved on their profile, use it.
//   2. Otherwise fall back to the server-side `GEMINI_API_KEY` secret.
//
// Both paths use Google's OpenAI-compatible endpoint so the existing AI SDK
// integrations (streamText / generateText) keep working unchanged.

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ResolvedGateway = {
  provider: ReturnType<typeof createOpenAICompatible>;
  /** Model id to pass to provider(...). */
  modelFor: (kind: "chat" | "vision") => string;
  /** Raw API key used for non-AI-SDK calls (embeddings). */
  apiKey: string;
  /** Whether this came from the user's own key (BYOK). */
  usedByok: boolean;
};

const GOOGLE_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

function createGoogleProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "google-gemini",
    baseURL: GOOGLE_OPENAI_BASE,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

function modelFor(kind: "chat" | "vision"): string {
  return kind === "vision" ? "gemini-2.5-pro" : "gemini-2.5-flash";
}

export async function resolveUserGateway(userId: string): Promise<ResolvedGateway> {
  // Try the user's BYOK key first.
  let byok: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("byok_gemini_key")
      .eq("user_id", userId)
      .maybeSingle();
    const raw = (data?.byok_gemini_key as string | null) ?? null;
    if (raw && raw.trim().length > 10) byok = raw.trim();
  } catch (err) {
    console.warn("[ai-gateway] failed to read BYOK key", err);
  }

  if (byok) {
    return { provider: createGoogleProvider(byok), modelFor, apiKey: byok, usedByok: true };
  }

  const fallback = process.env.GEMINI_API_KEY?.trim();
  if (!fallback) {
    throw new Error(
      "AI is not configured: no personal Gemini API key set on this account and the server GEMINI_API_KEY is missing.",
    );
  }
  return { provider: createGoogleProvider(fallback), modelFor, apiKey: fallback, usedByok: false };
}

/**
 * Quick connectivity test for a user-supplied Gemini key.
 * Returns { ok: true } on success, otherwise { ok: false, error }.
 */
export async function testGeminiKey(key: string): Promise<{ ok: boolean; error?: string }> {
  const k = key?.trim();
  if (!k || k.length < 10) return { ok: false, error: "Key looks empty or too short" };
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(k),
    );
    if (!res.ok) {
      return { ok: false, error: `Google rejected the key (${res.status}). Double-check it on aistudio.google.com/app/apikey.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach Google to verify the key. Try again in a moment." };
  }
}
