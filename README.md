# Cérebro VC

> AI-native operating system for venture capital — sourcing, multi-axis screening, and evidence-based $100K decisions in 24 hours.

Built for **Hack-Nation Challenge 02: The VC Brain** in collaboration with the MIT Club of Northern California and the MIT Club of Germany, powered by the **Maschmeyer Group**.

- Preview: https://id-preview--6d627798-0f72-4201-89ea-42f30fcba3ec.lovable.app
- Published: https://cerebro-vc-hub.lovable.app

---

## The Challenge

Most exceptional founders stay invisible until they meet the right person. Their signal is scattered across pitch decks, GitHub repos, half-finished sites, and social posts. Diligence takes weeks and capital flows through networks, not merit.

Cérebro VC turns that closed relationship game into a data-driven meritocratic pipeline: **Sourcing → Screening → Diligence → Decision**, with a persistent Founder Score that follows a person across projects and never resets.

## What's Built

### 1. Sourcing (Data Architecture)
- **GitHub discovery** (`src/lib/providers/github.server.ts`) — trending repos by thesis sector with freshness, stars, and topic filters.
- **arXiv discovery** (`src/lib/providers/arxiv.server.ts`) — recent submissions per sector, plus author-level paper lookup.
- **Tavily web search** (`src/lib/providers/tavily.server.ts`) — advanced depth, curated `include_domains` (GitHub, arXiv, TechCrunch, YC, Crunchbase…) and noise `exclude_domains` (Pinterest, TikTok…), with automatic trust boosting on premium sources.
- **AI Discovery Feed** on the Dashboard triggers `discoverOpportunities` and enriches candidates end-to-end.

### 2. Multi-Axis Screening (Intelligence)
Every opportunity is scored on three **independent** axes — never averaged:
- **Founder** — background, pedigree, persistent Founder Score.
- **Market** — sizing, competition, sentiment (bullish / neutral / bear).
- **Idea vs Market** — does the idea survive scrutiny as-is, or can the team pivot?

Each axis carries a trend indicator and writes back to Memory.

### 3. Persistent Memory
Supabase schema (see `supabase/migrations/`):
- `founders`, `opportunities`, `evidence_logs`
- `founder_score_history` — Founder Score over time, never resets
- `opportunity_screenings`, `allegations`, `allegation_evidences` — append-only audit trail
- `thesis_config`, `user_organizations` — multi-tenant thesis engine

### 4. Evidence-Based Memo & Trust Score
Every claim in a memo traces back to `evidence_logs` with a per-claim trust score. Hits from curated high-signal domains get a `domainTrustBoost`. Missing data is flagged explicitly ("Cap table: not disclosed") instead of hallucinated.

---

## Tech Stack

- **Framework**: [TanStack Start v1](https://tanstack.com/start) (React 19, Vite 7) — deployed to Cloudflare Workers.
- **Styling**: Tailwind CSS v4 + shadcn/ui, dark Material 3 tokens (Notion-meets-Bloomberg aesthetic).
- **Data**: TanStack Query, TanStack Router (file-based routing).
- **Backend**: `createServerFn` server functions (typed RPC). No Supabase Edge Functions.
- **Database & Auth**: Supabase Postgres with RLS + Supabase Auth (email/password, Google OAuth via Lovable broker).
- **AI**: OpenAI API (`gpt-4o-mini`, structured `json_schema` outputs) with Lovable AI Gateway fallback.
- **Sourcing providers**: GitHub REST, arXiv Atom API, Tavily Search.

## Architecture

```text
                ┌──────────────────────────────────────────────┐
                │                Thesis Engine                 │
                │  sectors · stage · geo · check · risk        │
                └──────────────────────────────────────────────┘
                                    │
     ┌──────────────┬───────────────┼───────────────┬──────────────┐
     ▼              ▼               ▼               ▼              ▼
  GitHub        arXiv          Tavily          Inbound         Manual
 discovery    discovery     web search        applications      seed
     └──────────────┴───────────┬───┴───────────────┴──────────────┘
                                ▼
                       Enrichment pipeline
                (src/lib/vc.functions.ts + providers)
                                ▼
     ┌──────────────────────────────────────────────────────────┐
     │  Multi-axis Screening   →   Evidence Memo + Trust Score  │
     └──────────────────────────────────────────────────────────┘
                                ▼
                    Decision panel ($100K approve / reject)
                                ▼
           Persistent Memory (Supabase · Founder Score history)
```

App-internal logic lives in `createServerFn` handlers under `src/lib/*.functions.ts`. Raw HTTP endpoints (webhooks, health checks) live under `src/routes/api/public/*`.

## App Routes

| Path | Purpose |
| --- | --- |
| `/` | Landing page |
| `/auth` | Sign in / sign up |
| `/dashboard` | Thesis summary, AI Discovery Feed, Priority Decisions |
| `/sourcing` | Kanban pipeline of opportunities |
| `/thesis` | Thesis configuration + sentiment heatmap |
| `/founders` | Memory Bench — Founder Score leaderboard |
| `/opportunity/$id` | Multi-axis screening, SWOT, evidence memo, decision panel |
| `/settings` | Account & org settings |
| `/api/public/health` | Public health check |

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) 1.x
- A Supabase project (URL + publishable key + service role key)

### Environment Variables

Server-only (never `VITE_`-prefixed):

| Var | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Public/anon key for user-scoped server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key for privileged server ops |
| `OPENAI_API_KEY` | GPT-4o-mini for screening & memo generation |
| `GITHUB_TOKEN` | GitHub REST API (discovery + founder signals) |
| `TAVILY_API_KEY` | Tavily web search |
| `LOVABLE_API_KEY` | Optional — Lovable AI Gateway fallback |

Client-visible:

| Var | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Browser Supabase client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase client |

On Lovable, secrets are managed through the Cloud secrets UI — do not commit `.env` values.

### Install & Run

```bash
bun install
bun run dev          # http://localhost:8080
bun run build        # production build
bun run build:dev    # dev-mode SSR build (used by preview)
```

---

## Security Posture

Details in [`SECURITY.md`](./SECURITY.md). Highlights:

- Multi-tenant RLS on every data table, gated by the `public.is_org_member(user_id, org_id)` `SECURITY DEFINER` function. `EXECUTE` revoked from `anon` / `public`.
- **No `anon` grants** on any user data table. Public reads use narrow `TO anon` SELECT policies only where explicitly needed.
- **Secret redaction** (`src/lib/security/redact.ts`) masks OpenAI, Supabase, GitHub, Tavily, and JWT-shaped strings in logs and error responses. `throwSanitized` prevents stack traces from reaching the client.
- **Env guard** (`src/lib/security/env-guard.server.ts`) halts boot if a secret-shaped value ends up in a `VITE_*` public variable.
- **Provider hygiene**: OpenAI / GitHub / Tavily errors never echo upstream response bodies — only `Request failed (status)`.
- **Auth**: `demoSignup` returns the same shape whether or not the account exists (no account enumeration). Google OAuth goes through the Lovable broker.
- **Server boundaries**: `supabaseAdmin` is imported dynamically inside handlers to keep it out of the client bundle graph. Every mutating server fn runs `assertOrgAccess`.

## Project Structure

```text
src/
├── routes/
│   ├── __root.tsx                  # shell, head metadata, auth listener
│   ├── index.tsx                   # landing
│   ├── auth.tsx                    # sign in / sign up
│   ├── _authenticated/             # ssr:false gated subtree
│   │   ├── route.tsx               # integration-managed auth gate
│   │   ├── dashboard.tsx
│   │   ├── sourcing.tsx
│   │   ├── thesis.tsx
│   │   ├── founders.tsx
│   │   ├── opportunity.$id.tsx
│   │   └── settings.tsx
│   └── api/public/health.ts        # public HTTP endpoint
├── lib/
│   ├── vc.functions.ts             # discover / enrich / screen / memo / decide
│   ├── auth.functions.ts           # demoSignup (auto-confirm)
│   ├── providers/                  # github · arxiv · tavily · openai
│   ├── security/                   # redact · env-guard
│   ├── ai-gateway.server.ts        # Lovable AI Gateway helper
│   └── vc-ui.tsx                   # shared visual primitives
├── integrations/supabase/          # browser, server, admin, middleware, types
├── components/                     # AppSidebar (TopBar / BottomNav) + shadcn ui/
└── styles.css                      # Tailwind v4 tokens + theme

supabase/migrations/                # RLS, tables, roles, is_org_member RPC
```

## Roadmap / Stretch Goals

From the original brief, not yet built:

- **Agentic Traceability** — Web snippet behind each conclusion (evidence log is in place; UI drill-down is next).
- **Validator Agent** — cross-reference extracted claims against market DBs and flag hallucinations.
- **Sourcing Network Intelligence** — model the graph of programs, cohorts and individuals; learn which channels convert to funded deals.
- **Cold-start Founder Score** — predict from public footprints (Twitter / LinkedIn) for founders with no funding or GitHub history.

## Credits

- Challenge: **Hack-Nation Challenge 02 — The VC Brain**
- Partners: **MIT Club of Northern California**, **MIT Club of Germany**
- Sponsor: **Maschmeyer Group** — investing in exceptional founders
- Built with [Lovable](https://lovable.dev)

---

_Build the data layer. Build the reasoning layer. Build the experience. Give exceptional founders a fair shot._
