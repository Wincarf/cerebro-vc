# Security Notes — Cérebro VC

## Access model

- Every data table (`founders`, `opportunities`, `evidence_logs`,
  `opportunity_screenings`, `founder_score_history`, `thesis_config`,
  `allegations`, `allegation_evidences`, `user_organizations`) has RLS enabled
  and is scoped to `public.is_org_member(organization_id)` (SECURITY DEFINER).
- `anon` has **no** grants on those tables.
- Only intentionally public HTTP surface: `GET /api/public/health`.

## Secrets — where each key belongs

Client-visible (all `VITE_*`, baked into the browser bundle — must be
publishable/anon values only):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Server-only (`process.env.*`, read inside server-fn handlers, never at module
scope of shared files):

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` and/or `SUPABASE_SECRET_KEYS`
- `OPENAI_API_KEY`, `TAVILY_API_KEY`, `GITHUB_TOKEN`
- `LOVABLE_API_KEY`

Anything secret-shaped that leaks into a `VITE_*` key trips
`src/lib/security/env-guard.server.ts` and the server refuses to boot.

## Environments (dev / staging / prod)

Recommended: one Lovable project per environment, each with its own Supabase
project ref and its own runtime secrets. Code reads `process.env.*` with no
environment-name assumptions, so the same source works in all three.

Never copy production secrets into dev/staging or vice versa. Rotate the
affected key immediately if that happens.

## Logging & error shape

Server functions must throw / return sanitized errors via
`src/lib/security/redact.ts` (`sanitizeError`, `throwSanitized`,
`safeLog`/`safeError`). Provider bodies, headers, cookies, JWTs and
known-shape API keys are stripped before anything is logged or returned.

## Pre-deploy check

After `bun run build`, grep the built client bundle to confirm no secrets
leaked:

```
rg -n 'sk-[A-Za-z0-9_-]{20,}|sb_secret_|service_role|ghp_|tvly-' dist/
```

Zero hits expected.

## Known accepted risks

- **Leaked Password Protection**: manual Supabase dashboard toggle
  (Auth → Providers → Email). Recommended for production; won't be enforced
  from code.
- **Rate limiting**: no primitive on the current backend. Add an ad-hoc limit
  before production if AI-cost endpoints (`enrichOpportunity`,
  `discoverOpportunities`) are exposed to untrusted traffic.