# EasyBusiness AI

> AI-powered commerce intelligence for small and medium ecommerce sellers.

**Live app:** https://easy-business-ai.lovable.app

---

## Overview

EasyBusiness AI turns messy ecommerce data (sales, inventory, customers) into
plain-English insights, smart alerts, and competitor comparisons. SME sellers,
online retailers, and marketplace vendors get the kind of analytics normally
reserved for teams with dedicated data analysts — without the complexity.

Upload a CSV or XLSX and the app gives you:
- KPI cards, revenue/order charts, and an AI business summary
- Inventory health with low-stock and restock-risk alerts
- Customer segmentation from your order history
- Competitor analysis for any product (Firecrawl + Gemini + embeddings)
- A chat assistant that answers questions about *your* data (RAG)
- Bilingual UI (Bangla / English) and 8-currency support

---

## Main Technologies

- **Framework:** TanStack Start v1 (React 19 + SSR + server functions)
- **Router / Data:** TanStack Router, TanStack React Query v5
- **Build:** Vite 7
- **Runtime:** Cloudflare Workers (via `@cloudflare/vite-plugin`, `nodejs_compat`)
- **Language:** TypeScript 5.8 (strict)
- **Styling:** Tailwind CSS v4 (native `@import` + `@theme`), shadcn/ui, Radix UI, lucide-react
- **Backend:** Lovable Cloud (managed Supabase — Postgres + pgvector, Auth, Storage, RLS)
- **AI:** Lovable AI Gateway — Gemini 2.5 Flash/Pro, GPT-5 / GPT-5-mini, `text-embedding-3-small`
- **AI SDK:** Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`)
- **Forms / Validation:** react-hook-form, Zod 4
- **Charts:** Recharts
- **Data parsing:** xlsx, custom CSV helpers
- **External APIs:** Firecrawl `/v2/search` (competitor scraping)
- **Package manager:** Bun

---

## Core Features

- **Authentication** — Email + password and Google OAuth (Supabase Auth)
- **Onboarding** — Business profile, marketplace, currency, goals
- **Data upload** — CSV / XLSX import for sales, inventory, customers
- **Dashboard** — KPI cards, timeseries charts, AI-generated business summary
- **Inventory intelligence** — stock health, low-stock alerts, restock risk
- **Customer intelligence** — segmentation and behavioral insights
- **Competitor analysis** — Firecrawl search → Gemini extraction → embedding
  similarity → currency-normalized comparison vs your price
- **AI Assistant (RAG)** — chat over your uploaded data using pgvector search
- **Voice** — speech-to-text and text-to-speech endpoints for the assistant
- **Explainable AI** — confidence badges and reasoning behind every insight
- **Multilingual UI** — Bangla ↔ English toggle across the whole app
- **Multi-currency** — USD, BDT, INR, GBP, EUR, MYR, SGD, AED
- **Marketplace integrations** — Shopify, Amazon, Daraz, Etsy, TikTok Shop, etc.
- **Pricing & Billing** — Free / Starter / Pro / Enterprise tiers with monthly/annual toggle
- **Privacy & Audit** — dataset management, AI action audit log, JSON export
- **Notifications** — in-app notification popover
- **Themes** — dark/light mode with semantic design tokens

---

## Dependencies

### Runtime
- `react`, `react-dom` (v19)
- `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-query`, `@tanstack/router-plugin`
- `@cloudflare/vite-plugin`, `nitro`
- `@supabase/supabase-js`
- `ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`
- `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`
- shadcn/ui + Radix UI primitives (`@radix-ui/react-*`: dialog, dropdown-menu,
  popover, tabs, select, tooltip, accordion, alert-dialog, hover-card,
  scroll-area, slider, switch, toggle, navigation-menu, and more)
- `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`
- `react-hook-form`, `@hookform/resolvers`, `zod`
- `recharts`, `embla-carousel-react`, `react-day-picker`, `date-fns`,
  `react-resizable-panels`, `cmdk`, `vaul`, `sonner`, `input-otp`
- `xlsx`
- `@lovable.dev/cloud-auth-js`

### Dev
- `typescript`, `typescript-eslint`, `eslint`, `eslint-plugin-react-hooks`,
  `eslint-plugin-react-refresh`, `eslint-plugin-prettier`, `eslint-config-prettier`
- `prettier`
- `vite`, `@vitejs/plugin-react`, `vite-tsconfig-paths`
- `@lovable.dev/vite-tanstack-config`
- `@types/node`, `@types/react`, `@types/react-dom`, `globals`

See [`package.json`](./package.json) for the exact versions.

---

## Run Locally

### Prerequisites
- **Bun** ≥ 1.1 (recommended) or **Node.js** ≥ 20 + npm
- A **Lovable Cloud** project (auto-provisions Supabase + AI Gateway)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd easy-business-ai
```

### 2. Install dependencies

```bash
bun install
# or: npm install
```

### 3. Environment variables

`.env` is auto-managed by Lovable Cloud — do NOT edit manually. If you are
running outside Lovable, create a `.env` with:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # server-only secret
LOVABLE_API_KEY=...                # AI Gateway + embeddings
FIRECRAWL_API_KEY=...              # competitor search
```

### 4. Start the dev server

```bash
bun run dev
```

Open the URL Vite prints (usually `http://localhost:8080`).

### 5. Other scripts

| Script              | Description                                  |
|---------------------|----------------------------------------------|
| `bun run dev`       | Vite dev server with HMR                     |
| `bun run build`     | Production build (Cloudflare Worker bundle)  |
| `bun run build:dev` | Development-mode build                       |
| `bun run preview`   | Preview a production build locally           |
| `bun run lint`      | ESLint over the repo                         |
| `bun run format`    | Prettier write                               |

---

## Links & Resources

- **Live app:** https://easy-business-ai.lovable.app
- **Preview:** https://id-preview--d0e0d938-9fc4-4da0-8e23-784fb1f85d2a.lovable.app
- **TanStack Start docs:** https://tanstack.com/start
- **TanStack Router docs:** https://tanstack.com/router
- **TanStack Query docs:** https://tanstack.com/query
- **Tailwind CSS v4:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **Supabase docs:** https://supabase.com/docs
- **Cloudflare Workers:** https://developers.cloudflare.com/workers
- **Vercel AI SDK:** https://sdk.vercel.ai/docs
- **Firecrawl:** https://firecrawl.dev
- **Lovable:** https://lovable.dev

---

## License

Proprietary — © EasyBusiness AI.
