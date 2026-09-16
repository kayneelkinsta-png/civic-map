CREATE TYPE public.organisation_type AS ENUM ('local_authority','national_government','devolved_government','contractor','transport_body','utility','private_operator','other_public_body','other');

CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  organisation_type public.organisation_type NOT NULL DEFAULT 'other',
  authority_id uuid REFERENCES public.authorities(id) ON DELETE SET NULL,
  website_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organisations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisations TO authenticated;
GRANT ALL ON public.organisations TO service_role;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organisations are publicly readable" ON public.organisations FOR SELECT USING (true);
CREATE POLICY "Admins manage organisations" ON public.organisations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER organisations_updated_at BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.reporting_destinations
  ADD COLUMN organisation_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL;

ALTER TABLE public.infrastructure_assets
  ADD COLUMN owner_org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  ADD COLUMN ownership_source text;

ALTER TABLE public.wards
  ADD COLUMN geography_type text NOT NULL DEFAULT 'ward',
  ADD COLUMN code_type text,
  ADD COLUMN effective_from date,
  ADD COLUMN effective_to date;
ALTER TABLE public.wards ADD CONSTRAINT wards_geography_type_check
  CHECK (geography_type IN ('ward','electoral_division','community','district_electoral_area','parish','postcode_sector','local_authority'));
UPDATE public.wards SET geography_type = 'ward' WHERE geography_type IS DISTINCT FROM 'ward';

ALTER TABLE public.authorities
  ADD COLUMN boundary_source_id uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  ADD COLUMN boundary_source_version text,
  ADD COLUMN boundary_effective_from date,
  ADD COLUMN boundary_imported_at timestamptz;

CREATE TABLE public.authority_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_id uuid NOT NULL UNIQUE REFERENCES public.authorities(id) ON DELETE CASCADE,
  config_number integer NOT NULL UNIQUE,
  display_name text NOT NULL,
  search_label text NOT NULL,
  location_fallback_label text NOT NULL,
  map_centre_lat double precision NOT NULL,
  map_centre_lng double precision NOT NULL,
  map_default_zoom double precision NOT NULL,
  coverage_note text,
  import_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.authority_configs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.authority_configs TO authenticated;
GRANT ALL ON public.authority_configs TO service_role;
ALTER TABLE public.authority_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authority configs are publicly readable" ON public.authority_configs FOR SELECT USING (true);
CREATE POLICY "Admins manage authority configs" ON public.authority_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER authority_configs_updated_at BEFORE UPDATE ON public.authority_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();