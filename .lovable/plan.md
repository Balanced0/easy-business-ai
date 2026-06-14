## Part 1 — Why your new account still says "payment required" (and the real fix)

### Diagnosis

The per-account **credit ledger** I shipped last turn is working — new accounts get 100 free credits via a DB trigger, and `/api/chat` charges that user's row before calling the model. I verified the trigger, the `spend_credits` function, and the route wiring.

But there's a second layer underneath that the ledger can't isolate: **the actual Gemini call goes through Lovable AI Gateway using a single workspace key (`LOVABLE_API_KEY`)**. When that workspace key returns a 402 from the gateway (workspace credits low, rate-limited, or model unavailable), every signed-in user sees the same upstream error mid-stream — regardless of how much credit they have in *our* ledger. The Assistant page renders `error.message` from `useChat`, which is where "Payment Required" is coming from. That's why creating a new account didn't help.

So we need to do two things to make AI truly per-account:

1. **Refund + clearly distinguish** the two failure modes so the user isn't told *they* are out of credits when it's actually the workspace pool.
2. **Add a per-user BYOK option** — let each user paste their own Google AI Studio (Gemini) API key in their profile. When set, `/api/chat`, `/api/voice/tts`, `/api/voice/stt`, and competitor analyze use **that** key instead of the shared workspace key. With a personal key (Google's free tier covers most usage), each account is fully independent of the workspace pool.

### Implementation

- **Migration**: add `byok_gemini_key_encrypted text` to `profiles` (encrypted with `pgcrypto` using a server-side key, decrypted only inside server functions). Also add `byok_provider text default 'lovable'`.
- **`src/lib/ai-gateway.server.ts`**: add a `resolveUserGateway(userId)` helper. If the user has a BYOK key, return a Google-direct provider (`@ai-sdk/google` with their key, base URL `https://generativelanguage.googleapis.com`). Otherwise return the existing Lovable gateway provider.
- **Charge logic**: when BYOK is used, **skip** `chargeCredits` (they're paying Google directly). Log the action in `credit_transactions` with `reason: 'byok_free'` and `delta: 0` so it shows in history.
- **Refund on upstream 402**: wrap the `streamText` call in `/api/chat` (and the others) — if the stream errors with a Lovable gateway 402/429 *after* we charged the user, call `refundCredits` and surface a distinct error code (`WORKSPACE_AI_UNAVAILABLE`) so the assistant shows a clearer message ("AI service is temporarily unavailable — your credits were not charged. Add your own Gemini key in Profile to bypass this.").
- **UI**: in `src/routes/_app.profile.tsx`, add a "Bring your own AI key" card — input for Gemini key, "Test connection" button, save/clear. Bilingual copy.
- **Fix existing bug**: `refundCredits` currently calls `grant_credits` with 4 positional args, but the SQL signature is `(_user_id, _amount, _reason, _stripe_session_id, _meta)`. The meta is being passed as `_stripe_session_id`. Fix the call site to pass `null` for stripe id and meta as 5th arg.

---

## Part 2 — Enable Stripe and wire up real "Buy credits" checkout

### Steps

1. Call `payments--recommend_payment_provider` → expect Stripe recommendation for a digital SaaS product. Then `payments--enable_stripe_payments`.
2. **Create the 3 credit packs as Stripe one-time products** via `batch_create_product` (Starter 500 cr / $5, Growth 2000 cr / $15, Scale 10000 cr / $50). Tax code `txcd_10000000` (digital service).
3. **Migration**: backfill `credit_packs.stripe_price_id` with the IDs returned by step 2.
4. **New server function** `createCreditCheckout(packId)` in `src/lib/credits.functions.ts`:
   - Authenticated via `requireSupabaseAuth`.
   - Calls Stripe Checkout sessions API with `mode: 'payment'`, `line_items: [{ price: stripe_price_id, quantity: 1 }]`, `client_reference_id: user.id`, `metadata: { user_id, credits, pack_id }`, success URL `/billing?success=1`, cancel URL `/billing`.
   - Returns `{ url }`. Frontend redirects.
5. **New webhook route** `src/routes/api/public/stripe-webhook.ts`:
   - Verifies Stripe signature with `STRIPE_WEBHOOK_SECRET`.
   - On `checkout.session.completed`, reads `metadata.user_id` + `metadata.credits`, calls `grant_credits(user_id, credits, 'purchase', session.id, {...})`. Idempotent on `stripe_session_id` unique index (already there).
   - Returns 200 quickly; logs failures.
6. **Billing page**: wire "Buy" buttons to call `createCreditCheckout` and redirect. Show success toast on `?success=1`.
7. Tax handling: default to `automatic_tax: { enabled: true }` (calculate + collect only, since seller country eligibility for `managed_payments` may not apply — safest default for a global digital product).

---

## Part 3 — Handwritten-copy camera scan → AI data extraction

### New feature: `/scan` route under `_app` layout

A third data-entry path alongside CSV/XLSX upload and Integrations. User points their phone/laptop camera at a handwritten sales register / inventory sheet / order list; AI extracts structured rows and lets them review + commit to their existing tables.

### UX flow

1. **Capture step** — full-screen camera view (uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`). Big shutter button. Alternative: "Upload image" file picker (for desktop or pre-taken photos). Multiple pages supported (snap 1..N, then "Extract all").
2. **Choose data type** — radio: Sales / Inventory / Orders / Products / Customers. Drives which schema the AI extracts to.
3. **Extract step** — preview thumbnails → "Extract data" button → calls `/api/scan/extract` with base64 JPEGs.
4. **Review step** — editable table of extracted rows (column headers matching the chosen type). User can fix mistakes, delete bad rows, then "Save to my data".
5. **Commit step** — inserts rows into the existing table (`sales_records`, `inventory_items`, etc.) and re-runs the embedding pipeline so the new data is searchable by the assistant.

### Components and files

- **`src/routes/_app.scan.tsx`** — the route + multi-step UI (capture / type / review / done). Bilingual via existing `useT()`.
- **`src/components/scan-camera.tsx`** — camera capture component with shutter, retake, page thumbnails, file-upload fallback. Handles `getUserMedia` errors (permission denied, no camera).
- **`src/components/scan-review-table.tsx`** — editable grid (`<input>` per cell), row delete, validation hints (e.g. numeric for quantity).
- **`src/routes/api/scan/extract.ts`** — POST. Authed. Charges new credit action `scan_extract` (cost: **3 credits per page**). Sends images to Gemini 2.5 Pro (best vision/handwriting) via Lovable Gateway with structured output (AI SDK `Output.object` + Zod schema per data type). Returns `{ rows: [...], confidence_per_row }`.
- **`src/routes/api/scan/commit.ts`** — POST. Authed. Inserts user-confirmed rows into the appropriate table (RLS scoped to `auth.uid()`), then triggers embedding re-index via existing `data-pipeline.server.ts` helpers. No AI cost.

### Cost table addition

In `src/lib/credit-costs.ts`:
```
scan_extract = 3   // per page; reflects vision-model cost
```
Plus bilingual labels.

### Sidebar + navigation

- Add **"Scan handwriting"** entry in `src/components/app-sidebar.tsx` under the existing "Data" group, with a `ScanLine` lucide icon.
- Add a "Scan handwritten copy" card on the existing Upload page that deep-links to `/scan`, so users discover the third option from the same place they upload CSVs today.

### Prompt design (server-side)

System prompt explains: "Extract every row from this handwritten {datatype} sheet. Output strict JSON matching the schema. If a column is unclear, mark it null and add it to `unclear_fields`. Numbers in Bangla or English numerals both accepted; normalize to ASCII digits. Dates → ISO 8601." Then attach images as `image_url` parts. Use `google/gemini-2.5-pro` (best handwriting accuracy in the Lovable catalog).

### Out of scope (call out)

- No "live OCR overlay" / bounding boxes — just snap → extract.
- No PDF multi-page OCR (yet) — image upload only.
- No auto-deduplication against existing rows — user reviews and commits.

---

## Execution order

1. Migration: BYOK column on `profiles` + `scan_extract` credit cost (TS only, no migration).
2. Fix `refundCredits` arg bug + add typed `WORKSPACE_AI_UNAVAILABLE` error path + per-user gateway resolver.
3. Profile UI for BYOK Gemini key (with test button).
4. Enable Stripe (`recommend` → `enable_stripe_payments`) → create products → backfill `stripe_price_id` → implement `createCreditCheckout` + webhook → wire billing page Buy buttons.
5. Handwriting scan: cost table → API routes → camera + review components → `/scan` route → sidebar entry + Upload-page card → bilingual strings.

## Files touched (additive, no refactor)

**New**: `src/routes/_app.scan.tsx`, `src/components/scan-camera.tsx`, `src/components/scan-review-table.tsx`, `src/routes/api/scan/extract.ts`, `src/routes/api/scan/commit.ts`, `src/routes/api/public/stripe-webhook.ts`, plus one migration.

**Edited**: `src/lib/credit-costs.ts`, `src/lib/credits.server.ts` (refund fix + workspace-unavailable error), `src/lib/credits.functions.ts` (add `createCreditCheckout`), `src/lib/ai-gateway.server.ts` (per-user resolver), `src/routes/api/chat.ts`, `src/routes/api/voice/{tts,stt}.ts`, `src/routes/api/competitors/analyze.ts` (use resolver + clearer error), `src/routes/_app.profile.tsx` (BYOK card), `src/routes/_app.billing.tsx` (live Buy), `src/routes/_app.upload.tsx` (Scan card), `src/routes/_app.assistant.tsx` (distinct error UX), `src/components/app-sidebar.tsx`, `src/lib/i18n/{en,bn}.ts`, `src/integrations/supabase/types.ts` (regenerated post-migration).

## Risks / things you should know

- **BYOK keys live in your database** encrypted with `pgcrypto` — safer than localStorage, but still: if your Supabase service role key leaks, the BYOK keys are decryptable. That's the same trust model as any SaaS storing third-party API keys.
- **Stripe in test mode** until you complete Stripe verification — buying credits will work end-to-end but with test cards only. Live mode needs you to claim the Stripe account.
- **Handwriting accuracy** depends heavily on legibility. Confidence column lets users sanity-check before committing. Gemini 2.5 Pro is the best available — but neat printing > cursive for accuracy.
- **No subscription plans** still — sticking to free quota + top-ups as you chose.
