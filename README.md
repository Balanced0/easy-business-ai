# EasyBusiness AI

An AI-powered commerce intelligence dashboard that transforms real-world
ecommerce data into simple, actionable business insights for SME sellers,
online retailers, and marketplace vendors.

Small and medium ecommerce businesses often struggle to understand market
trends, customer behavior, inventory risk, and competitor activity because
they lack data analysts and advanced analytics tools. Most existing
dashboards overwhelm owners with raw charts and metrics but offer no clear
guidance. EasyBusiness AI turns uploaded sales, inventory, and customer
data into plain-English answers, smart alerts, and competitor comparisons.

The product runs on **Lovable Cloud** (managed Supabase) and the **Lovable
AI Gateway**, deployed to **Cloudflare Workers** via TanStack Start.

---

## Table of Contents

- [Features](#features)
- [Business Model, Pricing & Ethics](#business-model-pricing--ethics)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Database](#database)
- [Deployment](#deployment)

---

## Features

### Core product features
- **Multilingual UI** — Bangla / English toggle across the whole app, including dashboard cards, AI summaries, and the About page.
- **Authentication** — email + password and Google OAuth via Supabase Auth (Lovable Cloud).
- **Onboarding** — captures business profile, marketplace, currency, and goals.
- **Data upload** — CSV / XLSX import for sales, inventory, customers; parsed with `xlsx` and the project's CSV helpers.
- **Dashboard** — KPI cards (Total Sales, Orders, Inventory Risks, Trending Products), revenue / orders timeseries, and an AI-generated business summary, all bilingual.
- **Inventory** — stock health, low-stock alerts, restock risk scoring.
- **Customers** — segmentation and behavioral insights from uploaded order history.
- **Competitors** — semantic competitor analysis (see below).
- **AI Assistant** — chat with your data using retrieval over your uploaded documents (RAG), powered by the Lovable AI Gateway.
- **Voice** — speech-to-text and text-to-speech endpoints for the assistant.
- **Notifications** — in-app notifications popover in the topbar.
- **Profile / settings** — manage account, language, theme, and preferred currency.
- **Pricing** — public `/pricing` route with 4 tiers (Free, Starter $19/mo, Pro $49/mo, Enterprise), monthly/annual billing toggle, feature comparison table, and demo checkout flow.
- **About / Investor overview** — public `/about` route with market opportunity metrics, revenue streams, competitive advantages, target customer segments, and a global expansion roadmap.
- **Value Generated** — dashboard card computing `revenueOpportunities`, `inventorySavings`, `timeSavedHours`, and AI recommendations derived from uploaded data.
- **Explainable AI** — confidence badges (High / Medium / Low) on dashboard summaries with an accordion revealing data-driven reasoning for each insight.
- **Privacy & Data** — `/privacy` route for dataset management, AI usage policy review, a paginated audit log of the last 50 AI actions, and JSON export of all uploaded data.
- **Multi-currency** — 8-currency support (USD, BDT, INR, GBP, EUR, MYR, SGD, AED) with static FX rates and `Intl.NumberFormat` formatting; preference stored in `profiles.preferred_currency`.
- **Marketplace Integrations** — `/integrations` grid for Shopify, Amazon, Daraz, Etsy, TikTok Shop, etc.; includes a live Daraz connection dialog (Seller ID, API Key, Region).
- **AI Intelligence Core** — `/intelligence` route visualizing the 6-stage pipeline (Ingestion → Embeddings → RAG → Model Routing → Explainability → Competitor Intelligence) with live system status from `knowledge_documents`, `chat_messages`, and `upload_batches`.
- **Responsible AI** — 5-pillar ethical commitment in the Privacy page: data isolation (RLS), no model training on user data, explainable outputs, bias-aware median normalization, and full audit trails.

### Competitor analysis pipeline
1. **Firecrawl `/v2/search`** scrapes top web results for the searched product to markdown.
2. **Gemini (via Lovable AI Gateway)** extracts structured products: `title, price, currency, rating, review_count, brand, image_url`.
3. **`text-embedding-3-small` embeddings** compute cosine similarity vs the query; weak matches are dropped (default threshold `0.55`).
4. **Currency normalization** converts every price to USD via a built-in FX table.
5. **Comparison vs baseline** (your price, or the median if not provided): each product is labeled `cheaper` / `similar` / `pricier` with a `price_delta_pct`.
6. **Clean visualizations** — ranked product cards plus summary charts for price spread, rating distribution, review volume, and competitive standing.

### AI / RAG
- Documents you upload are chunked and embedded with `openai/text-embedding-3-small` (1536 dims).
- Stored in the `knowledge_documents` table with pgvector.
- Retrieval uses a Postgres `match_documents` RPC for cosine similarity search, scoped per user.
- The assistant calls Gemini / GPT models through the Lovable AI Gateway with the retrieved context.

---

## Business Model, Pricing & Ethics

### Pricing tiers
| Plan | Monthly | Annual | Key limits |
|------|---------|--------|------------|
| **Free** | $0 | $0 | 1 marketplace, 100 orders/mo, basic dashboard |
| **Starter** | $19 | ~$15 (20% off) | 3 marketplaces, 1,000 orders/mo, 50 AI queries, 5 competitor searches |
| **Pro** | $49 | ~$39 (20% off) | Unlimited marketplaces, 10,000 orders/mo, unlimited AI & competitor analysis, RAG, voice, priority support |
| **Enterprise** | Custom | Custom | Everything in Pro + custom integrations, dedicated support, SLA, white-label, API access |

### Revenue streams
1. **SaaS subscriptions** — tiered monthly and annual plans from Free to Enterprise.
2. **Marketplace API revenue share** — partner revenue from Daraz, Shopify, Amazon integrations.
3. **White-label licensing** — custom-branded dashboards for agencies and large retailers.
4. **Enterprise data insights** — anonymized market intelligence reports for brands and investors.

### Global expansion roadmap
- **Phase 1 — Bangladesh (2025, completed)** — Live for Daraz, Shopify, and local sellers.
- **Phase 2 — South Asia (2026, in progress)** — Expand to India, Pakistan, Sri Lanka with Hindi and Urdu support.
- **Phase 3 — Southeast Asia (Q4 2026, upcoming)** — Indonesia, Vietnam, Thailand, Philippines via Shopee and Lazada.
- **Phase 4 — Global (2027, vision)** — MEA and LATAM with full multilingual coverage.

### Responsible AI commitments
- **Data isolation** — every user’s data is scoped by Row-Level Security (RLS); no cross-tenant access.
- **No model training on user data** — uploaded datasets are never used to train or fine-tune foundation models.
- **Explainable outputs** — every AI insight surfaces its reasoning and confidence level.
- **Bias awareness** — competitor price comparisons use median-based normalization to avoid outlier skew.
- **Audit trails** — a complete log of AI actions and data access is available for export and review in the Privacy page.

---

## Tech Stack

### Framework & runtime
- **TanStack Start v1** — full-stack React 19 framework (SSR + server functions).
- **TanStack Router** — type-safe, file-based routing under `src/routes/`.
- **TanStack React Query v5** — data fetching, caching, suspense queries.
- **Vite 7** — build tool, configured via `@lovable.dev/vite-tanstack-config`.
- **Cloudflare Workers** — production runtime (`@cloudflare/vite-plugin`, `wrangler`), `nodejs_compat` flag enabled.
- **React 19** + **React DOM 19**.
- **TypeScript 5.8** in strict mode.

### Styling & UI
- **Tailwind CSS v4** — configured via `src/styles.css` using native `@import` and `@theme` (no `tailwind.config.js`).
- **tw-animate-css** — animation utilities.
- **shadcn/ui** — full component set in `src/components/ui/*` built on top of:
  - **Radix UI primitives** (`@radix-ui/react-*`) — dialog, dropdown, popover, tabs, select, tooltip, accordion, alert-dialog, hover-card, scroll-area, slider, switch, toggle, etc.
- **lucide-react** — icon set.
- **class-variance-authority**, **clsx**, **tailwind-merge** — variant + class utilities.
- **sonner** — toast notifications.
- **cmdk** — command palette.
- **vaul** — drawers.
- **embla-carousel-react** — carousels.
- **react-resizable-panels** — split panes.
- **react-day-picker** + **date-fns** — date picking & formatting.
- **input-otp** — OTP inputs.

### Forms & validation
- **react-hook-form** + **@hookform/resolvers**
- **Zod 4** — schemas for forms and API input validation.

### Charts
- **Recharts** — bar / line / area / pie charts used across Dashboard and Competitors.

### Backend (Lovable Cloud / Supabase)
- **@supabase/supabase-js** — auth, Postgres, storage, realtime.
- **pgvector** — embedding similarity search.
- Three client variants:
  - `src/integrations/supabase/client.ts` — browser, anon key, session persistence.
  - `src/integrations/supabase/client.server.ts` — server-only, service role, bypasses RLS.
  - `src/integrations/supabase/auth-middleware.ts` — server functions with the user's bearer token (RLS-scoped).

### AI
- **Lovable AI Gateway** (`ai.gateway.lovable.dev`) — no user API key needed. Models used:
  - `google/gemini-2.5-flash` — competitor extraction, summaries.
  - `google/gemini-2.5-pro` — heavier reasoning.
  - `openai/gpt-5-mini` / `openai/gpt-5` — assistant chat.
  - `openai/text-embedding-3-small` — embeddings (1536 dim).
- **ai** (Vercel AI SDK) + **@ai-sdk/react** + **@ai-sdk/openai-compatible** — streaming chat.

### Data ingestion
- **xlsx** — Excel parsing for the upload flow.
- Custom CSV helpers in `src/lib/csv.ts`.

### External integrations
- **Firecrawl `/v2/search`** — competitor web scraping (requires `FIRECRAWL_API_KEY`).

### Tooling
- **ESLint 9** + **typescript-eslint** + **eslint-plugin-react-hooks** + **eslint-plugin-react-refresh**.
- **Prettier 3** + **eslint-config-prettier** + **eslint-plugin-prettier**.
- **Bun** for installs / scripts (`bunfig.toml`).

---

## Architecture

### High-level

```text
┌───────────────────────────────────────────────────────────────┐
│ Browser (React 19 + TanStack Router + React Query)            │
│  - Routes in src/routes/                                       │
│  - shadcn/ui components, Tailwind v4 tokens                    │
│  - supabase browser client for auth + realtime                 │
└───────────────────────────────────────────────────────────────┘
                │ RPC (createServerFn) + fetch (/api/*)
                ▼
┌───────────────────────────────────────────────────────────────┐
│ TanStack Start SSR (Cloudflare Worker runtime)                 │
│  - src/server.ts → SSR entry with branded error wrapper        │
│  - src/start.ts  → registers attachSupabaseAuth + error MW     │
│  - createServerFn handlers (app logic)                         │
│  - createFileRoute server handlers under src/routes/api/*      │
│    (webhooks, voice STT/TTS, competitor analyze, chat, upload) │
└───────────────────────────────────────────────────────────────┘
                │
   ┌────────────┼─────────────────────────────────────────────┐
   ▼            ▼                                             ▼
┌────────┐  ┌────────────────────────┐              ┌──────────────────┐
│ Lovable│  │ Supabase (Lovable      │              │ Firecrawl /v2/    │
│ AI     │  │ Cloud)                  │              │ search            │
│ Gateway│  │ - Postgres + pgvector   │              │ (competitors)     │
│        │  │ - Auth (email + Google) │              └──────────────────┘
│ Gemini │  │ - Storage               │
│ GPT-5  │  │ - RLS policies          │
│ embed  │  │ - match_documents RPC   │
└────────┘  └────────────────────────┘
```

### Server-side patterns

- **App-internal logic**: `createServerFn` from `@tanstack/react-start`
  (e.g. `src/lib/competitor-analyze.server.ts`, `src/lib/data-pipeline.server.ts`).
  Protected functions use `requireSupabaseAuth` middleware so RLS applies as
  the calling user.
- **`attachSupabaseAuth`** is registered as a global `functionMiddleware` in
  `src/start.ts`, automatically attaching `Authorization: Bearer <token>` to
  every server-function RPC from the browser.
- **Public HTTP endpoints** live under `src/routes/api/` as
  `createFileRoute(...)` files with a `server.handlers` block (e.g.
  `api/competitors/analyze`, `api/chat`, `api/upload`, `api/voice/stt|tts`).
- **Admin operations** (webhooks, trusted writes) use `supabaseAdmin` from
  `src/integrations/supabase/client.server.ts` — never imported into client code.
- **SSR error handling**: `src/server.ts` wraps the TanStack Start handler
  and turns catastrophic `h3` 500 JSON responses into a branded HTML error
  page rendered by `src/lib/error-page.ts`.

### Client-side patterns

- File-based routes under `src/routes/`; the layout `_app.tsx` wraps the
  authenticated dashboard surface (sidebar, topbar, outlet).
- `useLanguage()` (`src/hooks/use-language.tsx`) provides a `t()` translator
  for Bangla ↔ English; bilingual strings are stored as
  `"<bn> / <en>"` so a single source of truth renders correctly in either mode.
  Structured key-based translations live under `src/lib/i18n/` (English and Bangla modules)
  with a `getTranslation()` helper for scalable locale management.
- `useAuth()` exposes the Supabase session and gating logic for protected routes.
- `useCurrency()` (`src/hooks/use-currency.tsx`) provides multi-currency formatting
  (USD, BDT, INR, GBP, EUR, MYR, SGD, AED) with static FX rates and `Intl.NumberFormat`.
- `useTheme()` handles dark/light tokens defined in `src/styles.css`.

---

## Project Structure

```text
src/
├── components/
│   ├── app-sidebar.tsx          # main navigation
│   ├── dashboard-topbar.tsx     # header with notifications + lang/theme
│   ├── notifications-popover.tsx
│   └── ui/                      # shadcn/ui primitives
├── hooks/
│   ├── use-auth.tsx
│   ├── use-language.tsx
│   ├── use-currency.tsx         # multi-currency formatting & FX rates
│   ├── use-theme.tsx
│   └── use-mobile.tsx
├── integrations/
│   ├── lovable/
│   └── supabase/
│       ├── client.ts            # browser (anon key)
│       ├── client.server.ts     # admin (service role) — server only
│       ├── auth-middleware.ts   # RLS-scoped server client
│       ├── auth-attacher.ts     # adds bearer header to serverFn calls
│       └── types.ts             # generated DB types (do not edit)
├── lib/
│   ├── ai-gateway.server.ts     # Lovable AI Gateway provider
│   ├── auth-route.server.ts
│   ├── competitor-analyze.server.ts   # Firecrawl + Gemini + embeddings
│   ├── competitor-pipeline.server.ts
│   ├── csv.ts                   # CSV parsing helpers
│   ├── data-pipeline.server.ts  # dashboard KPI + AI summary builder
│   ├── embeddings.server.ts     # embed + match_documents RAG
│   ├── error-capture.ts
│   ├── error-page.ts
│   ├── firecrawl.server.ts
│   ├── i18n/                      # structured translations (en.ts, bn.ts, types.ts, index.ts)
│   └── utils.ts
├── routes/
│   ├── __root.tsx               # SSR shell, providers
│   ├── index.tsx                # landing page
│   ├── login.tsx
│   ├── signup.tsx
│   ├── onboarding.tsx
│   ├── _app.tsx                 # authenticated layout (sidebar + topbar)
│   ├── _app.dashboard.tsx
│   ├── _app.upload.tsx
│   ├── _app.inventory.tsx
│   ├── _app.customers.tsx
│   ├── _app.competitors.tsx
│   ├── _app.assistant.tsx
│   ├── _app.profile.tsx
│   ├── _app.about.tsx
│   ├── _app.privacy.tsx
│   ├── _app.integrations.tsx
│   ├── _app.intelligence.tsx
│   ├── pricing.tsx
│   └── api/
│       ├── analytics.ts
│       ├── chat.ts
│       ├── upload.ts
│       ├── scrape.ts
│       ├── search.ts
│       ├── embeddings.ts
│       ├── competitors/
│       │   ├── analyze.ts
│       │   ├── discover.ts
│       │   ├── list.ts
│       │   ├── scrape.ts
│       │   └── validate-seeds.ts
│       └── voice/
│           ├── stt.ts
│           └── tts.ts
├── router.tsx                   # QueryClient + router config
├── server.ts                    # SSR Worker entry (error wrapper)
├── start.ts                     # global middleware registration
├── styles.css                   # Tailwind v4 tokens + theme
└── routeTree.gen.ts             # auto-generated (do not edit)

supabase/config.toml             # auto-managed
wrangler.jsonc                   # Cloudflare Worker config
vite.config.ts                   # Vite + TanStack Start config
```

---

## Setup

### Prerequisites
- **Bun** ≥ 1.1 (or Node ≥ 20 + npm — Bun recommended).
- A **Lovable Cloud** project (auto-provisions Supabase + the AI Gateway).

### Install

```bash
bun install
```

### Run locally

```bash
bun run dev
```

The dev server runs on the port assigned by Vite (printed on start).

### Build

```bash
bun run build       # production build (Cloudflare Worker bundle)
bun run build:dev   # dev-mode build (prerenders some routes)
bun run preview     # preview the production build locally
```

### Lint / format

```bash
bun run lint
bun run format
```

---

## Environment Variables

`.env` is auto-managed by Lovable Cloud — **do not edit it manually**.

| Variable                          | Where         | Purpose |
|-----------------------------------|---------------|---------|
| `VITE_SUPABASE_URL`               | client (Vite) | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY`   | client (Vite) | Supabase anon/publishable key |
| `VITE_SUPABASE_PROJECT_ID`        | client (Vite) | Supabase project ref |
| `SUPABASE_URL`                    | server        | Same URL, runtime |
| `SUPABASE_PUBLISHABLE_KEY`        | server        | Publishable key, runtime |
| `SUPABASE_SERVICE_ROLE_KEY`       | server (secret) | Admin client, bypasses RLS |
| `LOVABLE_API_KEY`                 | server (secret) | Lovable AI Gateway + embeddings |
| `FIRECRAWL_API_KEY`               | server (secret) | Competitor web search |

Server secrets are managed via the Lovable secrets tool (Connectors panel),
never committed to source.

---

## Available Scripts

| Script         | Description |
|----------------|-------------|
| `bun run dev`        | Start Vite dev server with HMR |
| `bun run build`      | Production build (Cloudflare Worker) |
| `bun run build:dev`  | Development-mode build |
| `bun run preview`    | Preview a production build locally |
| `bun run lint`       | ESLint over the repo |
| `bun run format`     | Prettier write |

---

## Database

Managed via Lovable Cloud (Supabase). Key tables:

- `profiles` — user profile / onboarding data.
- `knowledge_documents` — uploaded docs + `vector(1536)` embeddings for RAG.
- `notifications` — in-app notification feed.
- Plus sales / inventory / customer tables populated by the upload pipeline.

All `public.*` tables have RLS enabled and explicit `GRANT`s for
`authenticated` / `service_role` (and `anon` only where appropriate). Roles
are stored in a dedicated `user_roles` table with a `SECURITY DEFINER`
`has_role()` function to prevent recursive RLS issues and privilege
escalation. The `match_documents(query_embedding, match_count,
filter_source_types, filter_user_id)` RPC powers similarity search.

Schema changes are made through the Lovable migration tool — never edit
`src/integrations/supabase/types.ts` or `client.ts` directly.

---

## Deployment

The app deploys automatically through Lovable:

- **Preview URL**: `https://id-preview--<project-id>.lovable.app`
- **Published URL**: `https://easy-business-ai.lovable.app`

Production builds output a Cloudflare Worker bundle (`wrangler.jsonc` /
`@cloudflare/vite-plugin`). The SSR entry is `src/server.ts`, which wraps
the TanStack Start handler and renders a branded error page on
catastrophic SSR failure. `nodejs_compat` is enabled so server functions
can use safe Node built-ins (`fs`, `path`, `crypto`, `Buffer`, `stream`,
`url`, `events`, `timers`, `net`, `http`, `https`, `zlib`).

---

## License

Proprietary — © EasyBusiness AI.
