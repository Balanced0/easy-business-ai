// Server-only helpers for charging and refunding user AI credits.
// Wraps the spend_credits / grant_credits SQL functions.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CREDIT_COSTS, type CreditAction } from "@/lib/credit-costs";

export class InsufficientCreditsError extends Error {
  code = "INSUFFICIENT_CREDITS" as const;
  constructor(public action: CreditAction, public cost: number) {
    super(`INSUFFICIENT_CREDITS: ${action} requires ${cost} credits`);
  }
}

export type ChargeResult = { newBalance: number; newQuota: number };

/**
 * Atomically deducts the flat cost for `action` from `userId`.
 * Throws InsufficientCreditsError if the user doesn't have enough.
 * Throws Error for any other database failure.
 */
export async function chargeCredits(
  userId: string,
  action: CreditAction,
  meta: Record<string, unknown> = {},
): Promise<ChargeResult> {
  const cost = CREDIT_COSTS[action];
  const reason = `spend:${action}`;

  const { data, error } = await supabaseAdmin.rpc("spend_credits", {
    _user_id: userId,
    _amount: cost,
    _reason: reason,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _meta: meta as any,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("INSUFFICIENT_CREDITS")) {
      throw new InsufficientCreditsError(action, cost);
    }
    console.error("[credits] spend_credits failed", error);
    throw new Error(`spend_credits failed: ${msg}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    newBalance: row?.new_balance ?? 0,
    newQuota: row?.new_quota ?? 0,
  };
}

/**
 * Refunds a previously charged amount. Use only when the underlying AI call
 * failed AFTER credits were deducted (e.g. Lovable Gateway returned 402/429).
 */
export async function refundCredits(
  userId: string,
  action: CreditAction,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const amount = CREDIT_COSTS[action];
  const { error } = await supabaseAdmin.rpc("grant_credits", {
    _user_id: userId,
    _amount: amount,
    _reason: "refund",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _meta: { refunded_action: action, ...meta } as any,
  });
  if (error) console.error("[credits] refund failed", error);
}

/**
 * Helper: standard 402 JSON response when chargeCredits throws.
 */
export function insufficientCreditsResponse(err: InsufficientCreditsError) {
  return Response.json(
    {
      error: "INSUFFICIENT_CREDITS",
      message: err.message,
      action: err.action,
      cost: err.cost,
    },
    { status: 402 },
  );
}
