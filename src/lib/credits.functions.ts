// Client-callable server functions for the credit ledger.
// Imported by hooks, the billing page, and the topbar badge.

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
      // Lazy backfill if the trigger missed (e.g. user created before migration).
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
