## Plan: Create `README.md`

Write a single new file `README.md` at the project root, in English, that documents the project as it exists today (not the original spec).

### Structure

1. **Header** — `Cérebro VC` title, one-line tagline ("AI-native operating system for venture capital sourcing, screening & $100K decisions in 24h"), Hack-Nation / Maschmeyer Group credit line, link to preview & published URLs.

2. **The Challenge** — 3–4 sentence summary of the Hack-Nation Challenge 02 problem (invisible founders, 24h $100K checks, sourcing → screening → diligence → decision) so the repo stands on its own.

3. **What's built** — mapped to the four pillars actually implemented:
   - Sourcing (GitHub trending discovery, arXiv discovery, Tavily web search with curated include/exclude domains and trust boosting)
   - Multi-axis Screening (Founder / Market / Idea-vs-Market, no averaging)
   - Persistent Memory (Supabase `founders`, `opportunities`, `evidence_logs`, `founder_score_history`, `opportunity_screenings`, `allegations`)
   - Evidence-based Memo & Trust Score (per-claim evidence with trust boost from trusted domains)

4. **Tech stack** — TanStack Start v1 (React 19, Vite 7, Cloudflare Workers target), Tailwind v4, shadcn/ui, TanStack Query, Supabase (Auth + Postgres + RLS), OpenAI API, GitHub API, Tavily, arXiv.

5. **Architecture** — short ASCII diagram of pipeline (Sourcing → Screening → Memo → Decision) over Memory, plus note that server logic uses `createServerFn` (no Edge Functions), and public API lives under `src/routes/api/public/*`.

6. **App routes** — table mapping the actual routes: `/` landing, `/auth`, `/dashboard`, `/sourcing`, `/thesis`, `/founders`, `/opportunity/$id`, `/settings`, `/api/public/health`.

7. **Getting started**
   - Prerequisites (Bun, Supabase project)
   - Env vars: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`, `TAVILY_API_KEY` (plus `VITE_*` public equivalents)
   - Install & run: `bun install`, `bun run dev`, `bun run build`
   - Note that on Lovable, secrets are managed via the Cloud secrets UI

8. **Security posture** — brief bullets referencing `SECURITY.md`: multi-tenant RLS with `is_org_member`, secret redaction in logs/errors, no `anon` grants on data tables, server-only secrets, sanitized errors, generic auth responses (no account enumeration). Link to `SECURITY.md`.

9. **Project structure** — short tree of `src/routes`, `src/lib` (functions, providers, security), `src/integrations/supabase`, `supabase/migrations`.

10. **Roadmap / stretch** — Agentic traceability, validator agent, sourcing network intelligence graph (from the brief, marked as future work).

11. **Credits** — Hack-Nation, MIT Club NorCal, MIT Club Germany, Maschmeyer Group; built with Lovable.

### Constraints

- English only.
- Reflect current implementation (server functions, not edge functions; the routes and providers that actually exist).
- No fabricated metrics or screenshots.
- ~200–300 lines, standard GitHub-flavored Markdown.
- Do not modify any other file.
