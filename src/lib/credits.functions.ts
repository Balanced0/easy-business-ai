// Client-callable server functions for the credit ledger + BYOK key management.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MyCredits = {
  balance: number;
  freeQuotaRemaining: number;
  freeQuotaMonthly: number;
  quotaResetAt: string;
  lifetimePurchased: number;
};

export const getMyCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyCredits> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_credits")
      .select("balance,free_quota_remaining,free_quota_monthly,quota_reset_at,lifetime_purchased")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[getMyCredits]", error);
    }

    if (!data) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("user_credits")
        .insert({ user_id: userId })
        .select()
        .maybeSingle();
      return {
        balance: 0,
        freeQuotaRemaining: 100,
        freeQuotaMonthly: 100,
        quotaResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lifetimePurchased: 0,
      };
    }

    return {
      balance: data.balance,
      freeQuotaRemaining: data.free_quota_remaining,
      freeQuotaMonthly: data.free_quota_monthly,
      quotaResetAt: data.quota_reset_at,
      lifetimePurchased: data.lifetime_purchased,
    };
  });

export type MyTransaction = {
  id: string;
  delta: number;
  reason: string;
  balance_after: number;
  created_at: string;
};

export const getMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("credit_transactions")
      .select("id,delta,reason,balance_after,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[getMyTransactions]", error);
      return [] as MyTransaction[];
    }
    return (data ?? []) as MyTransaction[];
  });

export type CreditPack = {
  id: string;
  slug: string;
  name: string;
  credits: number;
  price_cents: number;
  currency: string;
};

export const getCreditPacks = createServerFn({ method: "GET" }).handler(
  async (): Promise<CreditPack[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("credit_packs")
      .select("id,slug,name,credits,price_cents,currency")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("[getCreditPacks]", error);
      return [];
    }
    return (data ?? []) as CreditPack[];
  },
);

// ===== BYOK key management =====

export type ByokStatus = { hasKey: boolean; preview: string | null };

export const getByokStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ByokStatus> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select("byok_gemini_key")
      .eq("user_id", userId)
      .maybeSingle();
    const key = data?.byok_gemini_key ?? null;
    if (!key) return { hasKey: false, preview: null };
    const preview = key.length > 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : "••••";
    return { hasKey: true, preview };
  });

export const saveByokKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => {
    const key = (input?.key ?? "").trim();
    if (!key || key.length < 10) throw new Error("Key looks too short");
    if (key.length > 500) throw new Error("Key looks too long");
    return { key };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    // Validate the key against Google first so we don't store garbage.
    const { testGeminiKey } = await import("@/lib/ai-gateway.server");
    const result = await testGeminiKey(data.key);
    if (!result.ok) throw new Error(result.error ?? "Could not verify the key with Google");

    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, byok_gemini_key: data.key }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearByokKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ byok_gemini_key: null })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
