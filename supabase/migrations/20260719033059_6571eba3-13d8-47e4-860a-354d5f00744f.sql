ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS discovery_reason text,
  ADD COLUMN IF NOT EXISTS discovered_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE INDEX IF NOT EXISTS opportunities_dedupe_key_idx ON public.opportunities(organization_id, dedupe_key);
CREATE INDEX IF NOT EXISTS opportunities_discovered_at_idx ON public.opportunities(discovered_at DESC);