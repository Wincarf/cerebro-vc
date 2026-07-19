
-- 1. Add is_org_member helper (SECURITY DEFINER, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = auth.uid() AND organization_id = _org
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;

-- 2. Tighten legacy policies that accepted NULL organization_id
-- founder_score_history
DROP POLICY IF EXISTS "org select founders" ON public.founder_score_history;
DROP POLICY IF EXISTS "org insert founders history" ON public.founder_score_history;
CREATE POLICY "fsh_org_select" ON public.founder_score_history
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "fsh_org_insert" ON public.founder_score_history
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));

-- opportunity_screenings
DROP POLICY IF EXISTS "org select opportunity screenings" ON public.opportunity_screenings;
DROP POLICY IF EXISTS "org insert opportunity screenings" ON public.opportunity_screenings;
CREATE POLICY "opp_screenings_org_select" ON public.opportunity_screenings
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "opp_screenings_org_insert" ON public.opportunity_screenings
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));

-- allegations / allegation_evidences: same NULL-org loophole via joined opportunities
DROP POLICY IF EXISTS "org select allegations" ON public.allegations;
DROP POLICY IF EXISTS "org insert allegations" ON public.allegations;
CREATE POLICY "allegations_org_select" ON public.allegations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.opportunities o
      WHERE o.id = allegations.opportunity_id AND public.is_org_member(o.organization_id))
  );
CREATE POLICY "allegations_org_insert" ON public.allegations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.opportunities o
      WHERE o.id = allegations.opportunity_id AND public.is_org_member(o.organization_id))
  );

DROP POLICY IF EXISTS "org select allegation evidences" ON public.allegation_evidences;
DROP POLICY IF EXISTS "org insert allegation evidences" ON public.allegation_evidences;
CREATE POLICY "allegation_evidences_org_select" ON public.allegation_evidences
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.allegations a
      JOIN public.opportunities o ON o.id = a.opportunity_id
      WHERE a.id = allegation_evidences.allegation_id AND public.is_org_member(o.organization_id))
  );
CREATE POLICY "allegation_evidences_org_insert" ON public.allegation_evidences
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.allegations a
      JOIN public.opportunities o ON o.id = a.opportunity_id
      WHERE a.id = allegation_evidences.allegation_id AND public.is_org_member(o.organization_id))
  );

-- 3. Ensure no anon grants leak on sensitive tables
REVOKE ALL ON public.founders, public.opportunities, public.evidence_logs,
             public.opportunity_screenings, public.founder_score_history,
             public.thesis_config, public.allegations, public.allegation_evidences,
             public.user_organizations FROM anon;
