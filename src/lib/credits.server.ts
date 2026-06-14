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

export class WorkspaceAiUnavailableError extends Error {
  code = "WORKSPACE_AI_UNAVAILABLE" as const;
  constructor(message: string) {
    super(`WORKSPACE_AI_UNAVAILABLE: ${message}`);
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
  multiplier = 1,
): Promise<ChargeResult> {
  const cost = CREDIT_COSTS[action] * Math.max(1, Math.floor(multiplier));
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
 * Skips when the user used their own BYOK key (no charge happened).
 */
export async function refundCredits(
  userId: string,
  action: CreditAction,
  meta: Record<string, unknown> = {},
  multiplier = 1,
): Promise<void> {
  const amount = CREDIT_COSTS[action] * Math.max(1, Math.floor(multiplier));
  // grant_credits signature: (_user_id, _amount, _reason, _stripe_session_id, _meta)
  const { error } = await supabaseAdmin.rpc("grant_credits", {
    _user_id: userId,
    _amount: amount,
    _reason: "refund",
    _stripe_session_id: null,
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

/**
 * Helper: standard 503 JSON response when the shared Lovable AI workspace
 * pool is exhausted or temporarily unavailable. Distinct from the per-user
 * INSUFFICIENT_CREDITS so the UI can show "service issue" instead of
 * "buy credits".
 */
export function workspaceUnavailableResponse(err: WorkspaceAiUnavailableError) {
  return Response.json(
    {
      error: "WORKSPACE_AI_UNAVAILABLE",
      message: err.message,
    },
    { status: 503 },
  );
}

/**
 * Detect if an upstream error looks like a Lovable AI Gateway exhaustion /
 * rate-limit (402 / 429 / "credits"). Used to decide whether to refund the
 * user (whose ledger has been charged) and surface a clearer error.
 */
export function isWorkspaceAiError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { statusCode?: number })?.statusCode;
  if (status === 402 || status === 429) return true;
  return /402|429|payment required|rate.?limit|exhaust|insufficient.*(credit|quota)/i.test(msg);
}
