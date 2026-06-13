## Goal

Move AI usage off the shared workspace `LOVABLE_API_KEY` pool and onto a **per-account credit ledger**. Each EasyBusiness AI user gets a free monthly quota, sees their balance in the app, and can buy top-up credit packs through Stripe when they run out. The Lovable AI key stays server-side (it still pays the underlying Gemini bill) — but the *app* decides whether a given user is allowed to spend.

---

## 1. Database (one migration)

New tables, all RLS-scoped to `auth.uid()`:

- **`user_credits`** — `user_id` (PK, FK auth.users), `balance` int, `free_quota_remaining` int, `quota_reset_at` timestamptz, `lifetime_purchased` int, `updated_at`. Auto-created via a `handle_new_user`-style trigger seeded with the free monthly quota (e.g. 100).
- **`credit_transactions`** — `id`, `user_id`, `delta` int (negative = spend, positive = grant/purchase), `reason` text (`'free_grant' | 'monthly_reset' | 'purchase' | 'spend:chat' | 'spend:competitor' | 'spend:voice_tts' | 'spend:voice_stt' | 'spend:embedding' | 'refund'`), `action_meta` jsonb, `stripe_session_id` text nullable, `created_at`. Append-only audit log.
- **`credit_packs`** — `id`, `name`, `credits` int, `price_cents` int, `currency`, `stripe_price_id`, `active` bool. Seeded with 3 packs (e.g. Starter 500 cr / $5, Growth 2 000 cr / $15, Scale 10 000 cr / $50).

Plus a **`spend_credits(user_id, amount, reason, meta)`** SECURITY DEFINER SQL function that atomically: checks balance+quota, decrements quota first then balance, inserts a transaction row, raises if insufficient. Returns the new balance. This avoids races between concurrent AI calls.

GRANTs: `authenticated` gets SELECT on own rows; all writes go through the function or service role. `service_role` ALL.

## 2. Flat cost table (server constant)

```
chat message        = 1
voice TTS reply     = 2
voice STT           = 1
competitor analyze  = 5
competitor discover = 3
embedding (per doc) = 1
dashboard summary   = 2
```

Lives in `src/lib/credit-costs.ts` (shared) so the UI can show "This will cost N credits" before the call.

## 3. Server enforcement (wrap every AI entry point)

Add `src/lib/credits.server.ts` with `chargeCredits(userId, action, meta)` which calls the SQL function and **throws a typed `InsufficientCreditsError`** on failure. Then update each AI route/server-fn to:

1. Authenticate user (already done via `requireSupabaseAuth` / bearer).
2. Call `chargeCredits` **before** invoking the Lovable AI Gateway.
3. If the gateway itself returns 402/429 from Lovable's side, refund the credit (insert positive `refund` transaction) and surface the error.

Files touched (additive — no refactor of existing logic):
- `src/routes/api/chat.ts` — charge 1 per user message.
- `src/routes/api/voice/tts.ts` — charge 2.
- `src/routes/api/voice/stt.ts` — charge 1.
- `src/routes/api/competitors/analyze.ts`, `discover.ts`, `scrape.ts` — charge per their cost.
- `src/routes/api/embeddings.ts` and `src/lib/data-pipeline.server.ts` — charge per embedded doc on upload.
- Dashboard summary server-fn — charge 2.

The shared 402/429 error from Lovable AI Gateway now becomes a **per-user** error, not a global one.

## 4. Stripe top-ups (built-in Lovable Payments)

Enable **Stripe (seamless)** via `payments--enable_stripe_payments`. With seller country dependent: default to `automatic_tax` (tax calc only) since EasyBusiness AI sells globally and the seller country may not be eligible for full managed_payments; switch to `managed_payments` if eligible.

Then:
- Create the 3 credit packs as Stripe products via `batch_create_product` (one-time prices, digital — tax code `txcd_10000000`).
- New server route `src/routes/api/public/stripe-webhook.ts` — verifies Stripe signature, on `checkout.session.completed` reads `metadata.user_id` + `metadata.credits`, inserts a positive `credit_transactions` row and increments `user_credits.balance` (via service role). Idempotent on `stripe_session_id`.
- New server fn `createCreditCheckout(packId)` — creates a Stripe Checkout Session with `client_reference_id = user.id`, `metadata.user_id`, `metadata.credits`, success/cancel URLs back to `/billing`.

## 5. Free quota reset

A SQL function `reset_monthly_quotas()` that resets `free_quota_remaining` and bumps `quota_reset_at` for any row past 30 days. Called lazily inside `spend_credits` (cheap, per-call) so we don't need pg_cron.

## 6. UI

- **New route `src/routes/_app.billing.tsx`** — Bilingual page:
  - Current balance + free quota remaining + next reset date.
  - Recent 20 transactions table.
  - 3 credit-pack cards with "Buy" buttons → call `createCreditCheckout`.
- **Topbar badge** in `src/components/dashboard-topbar.tsx` — small "⚡ {balance} credits" chip, links to `/billing`. Pulls from a `useCredits()` hook backed by a `getMyCredits` server-fn (cached via TanStack Query, invalidated on auth events and after each AI call).
- **`InsufficientCreditsDialog`** component — when any AI call throws `InsufficientCreditsError`, show a modal explaining "You're out of AI credits" with a CTA to `/billing`. Wired into the assistant chat error handler, competitors page, voice button.
- **Sidebar** — add "Billing & Credits" under the existing user/account group in `app-sidebar.tsx`.

## 7. Bilingual strings

All new copy added to `src/lib/i18n/en.ts` and `bn.ts` (keys: `credits.balance`, `credits.outOfCredits`, `credits.buyMore`, `billing.title`, `billing.packs.*`, etc.). Existing `t()` keeps working.

---

## Technical details

- **Atomicity**: balance check + decrement + audit insert all happen inside the `spend_credits` PL/pgSQL function in one transaction. Prevents double-spend on concurrent requests.
- **Refund safety**: only refund if `chargeCredits` succeeded *and* the AI call failed with a Lovable-side 402/429 or network error. Don't refund on user-aborted streams or app bugs.
- **Webhook security**: standard Stripe signature verification with `STRIPE_WEBHOOK_SECRET` (Lovable seamless Stripe provides this automatically). Idempotency key = `stripe_session_id` on `credit_transactions` with a unique index.
- **No breaking changes**: every existing AI route keeps the same request/response shape; we just add a charging step at the top and a new error type. The shared `LOVABLE_API_KEY` continues to pay Lovable; the ledger decides *who* is allowed to spend it.
- **Order of execution**: (1) migration → (2) ledger + cost table + `credits.server.ts` → (3) wrap AI routes + add error dialog → (4) enable Stripe + create packs + checkout + webhook → (5) billing page + topbar badge + sidebar entry + i18n strings.

## Out of scope (call out for later)

- Subscription tiers tied to the existing `/pricing` page (you picked "free quota + top-ups only" — pricing page stays marketing-only for now).
- Token-based metering (you picked flat per-action).
- Admin dashboard to grant/revoke credits manually.
