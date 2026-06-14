// Lovable AI Gateway provider + per-user BYOK resolver.
//
// Resolution order for `resolveUserGateway`:
//   1. If the user has a `byok_gemini_key` set on their profile, use a
//      Google-direct OpenAI-compatible provider with THEIR key. They are
//      not charged any of our credits (they pay Google directly).
//   2. Otherwise fall back to the shared Lovable workspace key.
//
// The returned object also exposes `usedByok` so callers can skip charging.

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ResolvedGateway = {
  provider: ReturnType<typeof createOpenAICompatible>;
  /** Model id to pass to provider(...) — already namespaced per provider. */
  modelFor: (kind: "chat" | "vision") => string;
  usedByok: boolean;
};

export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

function createGoogleDirectProvider(userKey: string) {
  // Google's Gemini API exposes an OpenAI-compatible endpoint.
  // https://ai.google.dev/gemini-api/docs/openai
  return createOpenAICompatible({
    name: "gemini-direct",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: {
      Authorization: `Bearer ${userKey}`,
    },
  });
}

export async function resolveUserGateway(userId: string): Promise<ResolvedGateway> {
  // Load this user's BYOK key (if any).
  let byok: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("byok_gemini_key")
      .eq("user_id", userId)
      .maybeSingle();
    byok = (data?.byok_gemini_key as string | null) ?? null;
  } catch (err) {
    console.warn("[ai-gateway] failed to read BYOK key", err);
  }

  if (byok && byok.trim().length > 10) {
    const provider = createGoogleDirectProvider(byok.trim());
    return {
      provider,
      // Google-direct uses unprefixed Gemini model IDs.
      modelFor: (kind) =>
        kind === "vision" ? "gemini-2.5-pro" : "gemini-2.5-flash",
      usedByok: true,
    };
  }

  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) {
    throw new Error("LOVABLE_API_KEY not configured and user has no BYOK key");
  }
  const provider = createLovableAiGatewayProvider(lovableKey);
  return {
    provider,
    modelFor: (kind) =>
      kind === "vision"
        ? "google/gemini-2.5-pro"
        : "google/gemini-3-flash-preview",
    usedByok: false,
  };
}

/**
 * Quick connectivity test for a user-supplied Gemini key.
 * Returns { ok: true } on success, otherwise { ok: false, error }.
 */
export async function testGeminiKey(key: string): Promise<{ ok: boolean; error?: string }> {
  if (!key || key.trim().length < 10) return { ok: false, error: "Key looks empty or too short" };
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(key.trim()),
    );
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `Google returned ${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
