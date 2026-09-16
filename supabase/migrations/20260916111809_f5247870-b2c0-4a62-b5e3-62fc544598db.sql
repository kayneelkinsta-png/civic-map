CREATE TABLE public.reporting_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_name text NOT NULL,
  authority_id uuid REFERENCES public.authorities(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.issue_categories(id) ON DELETE SET NULL,
  service_type text NOT NULL,
  reporting_method text NOT NULL DEFAULT 'unknown',
  reporting_url text,
  api_status text NOT NULL DEFAULT 'unknown',
  api_endpoint text,
  is_active boolean NOT NULL DEFAULT true,
  source text,
  source_url text,
  last_verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reporting_destinations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reporting_destinations TO authenticated;
GRANT ALL ON public.reporting_destinations TO service_role;

ALTER TABLE public.reporting_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active reporting destinations are public"
  ON public.reporting_destinations FOR SELECT USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage reporting destinations"
  ON public.reporting_destinations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX reporting_destinations_lookup_idx
  ON public.reporting_destinations (authority_id, category_id) WHERE is_active;

CREATE TRIGGER reporting_destinations_updated_at
  BEFORE UPDATE ON public.reporting_destinations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.infrastructure_assets
  ADD COLUMN responsible_org_id uuid REFERENCES public.authorities(id) ON DELETE SET NULL,
  ADD COLUMN responsibility_source text;

CREATE INDEX infrastructure_assets_responsible_org_idx
  ON public.infrastructure_assets (responsible_org_id);

CREATE OR REPLACE FUNCTION public.resolve_reporting_destination(_authority_id uuid, _category_id uuid)
RETURNS TABLE (
  id uuid,
  organisation_name text,
  service_type text,
  reporting_method text,
  reporting_url text,
  api_status text,
  source text,
  source_url text,
  last_verified_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT d.id, d.organisation_name, d.service_type, d.reporting_method,
         d.reporting_url, d.api_status, d.source, d.source_url, d.last_verified_at
  FROM public.reporting_destinations d
  WHERE d.is_active
    AND (d.authority_id IS NULL OR d.authority_id = _authority_id)
    AND (d.category_id IS NULL OR d.category_id = _category_id)
  ORDER BY (d.authority_id IS NOT NULL) DESC, (d.category_id IS NOT NULL) DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_reporting_destination(uuid, uuid) TO anon, authenticated, service_role;