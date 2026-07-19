
-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founders TO authenticated;
GRANT ALL ON public.founders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_logs TO authenticated;
GRANT ALL ON public.evidence_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thesis_config TO authenticated;
GRANT ALL ON public.thesis_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_organizations TO authenticated;
GRANT ALL ON public.user_organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_screenings TO authenticated;
GRANT ALL ON public.opportunity_screenings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allegations TO authenticated;
GRANT ALL ON public.allegations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allegation_evidences TO authenticated;
GRANT ALL ON public.allegation_evidences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_score_history TO authenticated;
GRANT ALL ON public.founder_score_history TO service_role;

-- Ensure user_organizations RLS policies allow the user to read their own membership rows
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_organizations_self_select ON public.user_organizations;
CREATE POLICY user_organizations_self_select ON public.user_organizations
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Extra columns
ALTER TABLE public.founders ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.founders ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.founders ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.founders ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Auto-provision org + thesis on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.thesis_config (organization_id, sectors, geography, check_size, risk_appetite)
  VALUES (new_org_id, ARRAY['AI Infrastructure','DeepTech'], ARRAY['Global'], 100000, 'high');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
