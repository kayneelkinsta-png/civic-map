-- ===== Geographic hierarchy =====
CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.countries TO anon, authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countries public read" ON public.countries FOR SELECT USING (true);
CREATE POLICY "countries admin write" ON public.countries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER countries_updated_at BEFORE UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  gss_code text,
  boundary extensions.geography,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regions TO anon, authenticated;
GRANT ALL ON public.regions TO service_role;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regions public read" ON public.regions FOR SELECT USING (true);
CREATE POLICY "regions admin write" ON public.regions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER regions_updated_at BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX regions_boundary_idx ON public.regions USING gist (boundary);

-- ===== Authorities expansion =====
ALTER TABLE public.authorities
  ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES public.countries(id),
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.regions(id),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reporting_info jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS authorities_boundary_idx ON public.authorities USING gist (boundary);
CREATE INDEX IF NOT EXISTS wards_boundary_idx ON public.wards USING gist (boundary);

-- ===== Postcode sectors =====
CREATE TABLE public.postcode_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL UNIQUE,
  district text NOT NULL,
  authority_id uuid REFERENCES public.authorities(id) ON DELETE SET NULL,
  ward_id uuid REFERENCES public.wards(id) ON DELETE SET NULL,
  population integer,
  boundary extensions.geography,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.postcode_sectors TO anon, authenticated;
GRANT ALL ON public.postcode_sectors TO service_role;
ALTER TABLE public.postcode_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sectors public read" ON public.postcode_sectors FOR SELECT USING (true);
CREATE POLICY "sectors admin write" ON public.postcode_sectors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER postcode_sectors_updated_at BEFORE UPDATE ON public.postcode_sectors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Data sources =====
CREATE TABLE public.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation text NOT NULL,
  dataset_name text NOT NULL,
  dataset_type text NOT NULL DEFAULT 'other',
  source_url text,
  licence text,
  authority_id uuid REFERENCES public.authorities(id) ON DELETE SET NULL,
  last_imported_at timestamptz,
  record_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  import_status text NOT NULL DEFAULT 'not_configured',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.data_sources TO anon, authenticated;
GRANT ALL ON public.data_sources TO service_role;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data sources public read" ON public.data_sources FOR SELECT USING (true);
CREATE POLICY "data sources admin write" ON public.data_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER data_sources_updated_at BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Infrastructure assets =====
CREATE TABLE public.infrastructure_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type text NOT NULL,
  external_asset_id text,
  name text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  geom extensions.geography GENERATED ALWAYS AS
    (extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude),4326)::extensions.geography) STORED,
  authority_id uuid REFERENCES public.authorities(id) ON DELETE SET NULL,
  ward_id uuid REFERENCES public.wards(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'operational',
  source_id uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  source_updated_at timestamptz,
  is_sample boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX infrastructure_assets_source_ref_idx
  ON public.infrastructure_assets (source_id, external_asset_id)
  WHERE source_id IS NOT NULL AND external_asset_id IS NOT NULL;
CREATE INDEX infrastructure_assets_geom_idx ON public.infrastructure_assets USING gist (geom);
CREATE INDEX infrastructure_assets_type_idx ON public.infrastructure_assets (asset_type);
GRANT SELECT ON public.infrastructure_assets TO anon, authenticated;
GRANT ALL ON public.infrastructure_assets TO service_role;
ALTER TABLE public.infrastructure_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets public read" ON public.infrastructure_assets FOR SELECT USING (true);
CREATE POLICY "assets admin write" ON public.infrastructure_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER infrastructure_assets_updated_at BEFORE UPDATE ON public.infrastructure_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Issue geographic detail =====
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS postcode_sector text,
  ADD COLUMN IF NOT EXISTS location_accuracy text NOT NULL DEFAULT 'map_pin',
  ADD COLUMN IF NOT EXISTS severity smallint NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.infrastructure_assets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS issues_geom_idx ON public.issues USING gist (geom);
CREATE INDEX IF NOT EXISTS issues_authority_idx ON public.issues (authority_id);
CREATE INDEX IF NOT EXISTS issues_ward_idx ON public.issues (ward_id);
CREATE INDEX IF NOT EXISTS issues_sector_idx ON public.issues (postcode_sector);
CREATE INDEX IF NOT EXISTS issues_asset_idx ON public.issues (asset_id);

-- ===== Geographic lookup =====
CREATE OR REPLACE FUNCTION public.resolve_ward(_lat double precision, _lng double precision)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE found uuid; pt extensions.geography;
BEGIN
  pt := extensions.ST_SetSRID(extensions.ST_MakePoint(_lng,_lat),4326)::extensions.geography;
  SELECT w.id INTO found FROM public.wards w
  WHERE w.boundary IS NOT NULL AND extensions.ST_Intersects(w.boundary, pt) LIMIT 1;
  RETURN found;
END; $$;
REVOKE EXECUTE ON FUNCTION public.resolve_ward(double precision,double precision) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_ward(double precision,double precision) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_issue_geography()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.authority_id IS NULL THEN
    NEW.authority_id := public.resolve_authority(NEW.latitude, NEW.longitude);
  END IF;
  IF NEW.ward_id IS NULL THEN
    NEW.ward_id := public.resolve_ward(NEW.latitude, NEW.longitude);
  END IF;
  IF NEW.postcode IS NOT NULL THEN
    NEW.postcode := upper(trim(NEW.postcode));
    NEW.postcode_sector := left(NEW.postcode, length(NEW.postcode) - 2);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS issues_assign_authority ON public.issues;
CREATE TRIGGER issues_assign_geography BEFORE INSERT ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.assign_issue_geography();

-- residents must not reassign authority/ward/asset ownership fields
CREATE OR REPLACE FUNCTION public.protect_issue_counters()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    NEW.confirmation_count := OLD.confirmation_count;
    NEW.last_confirmed_at := OLD.last_confirmed_at;
    NEW.reporter_id := OLD.reporter_id;
    NEW.is_sample := OLD.is_sample;
    NEW.status := OLD.status;
    NEW.resolved_at := OLD.resolved_at;
    NEW.authority_id := OLD.authority_id;
    NEW.ward_id := OLD.ward_id;
    NEW.reference := OLD.reference;
  END IF;
  RETURN NEW;
END; $$;

-- ===== Insights aggregates =====
CREATE OR REPLACE FUNCTION public.insights_summary()
RETURNS TABLE (
  total_reports bigint,
  unresolved_reports bigint,
  resolved_reports bigint,
  confirmation_total bigint,
  median_age_days numeric,
  median_resolution_days numeric
) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    count(*),
    count(*) FILTER (WHERE status <> 'RESOLVED'),
    count(*) FILTER (WHERE status = 'RESOLVED'),
    (SELECT count(*) FROM public.issue_confirmations),
    percentile_cont(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(epoch FROM (now() - created_at))/86400
    ) FILTER (WHERE status <> 'RESOLVED')::numeric,
    percentile_cont(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(epoch FROM (resolved_at - created_at))/86400
    ) FILTER (WHERE resolved_at IS NOT NULL)::numeric
  FROM public.issues WHERE is_hidden = false;
$$;

CREATE OR REPLACE FUNCTION public.insights_by_category()
RETURNS TABLE (category_id uuid, name text, emoji text, total bigint, unresolved bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT c.id, c.name, c.emoji, count(i.id),
         count(i.id) FILTER (WHERE i.status <> 'RESOLVED')
  FROM public.issue_categories c
  LEFT JOIN public.issues i ON i.category_id = c.id AND i.is_hidden = false
  GROUP BY c.id, c.name, c.emoji ORDER BY count(i.id) DESC;
$$;

CREATE OR REPLACE FUNCTION public.insights_by_authority()
RETURNS TABLE (authority_id uuid, name text, total bigint, unresolved bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT a.id, a.name, count(i.id), count(i.id) FILTER (WHERE i.status <> 'RESOLVED')
  FROM public.authorities a
  LEFT JOIN public.issues i ON i.authority_id = a.id AND i.is_hidden = false
  GROUP BY a.id, a.name ORDER BY count(i.id) DESC;
$$;

CREATE OR REPLACE FUNCTION public.insights_by_ward()
RETURNS TABLE (ward_id uuid, name text, total bigint, unresolved bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT w.id, w.name, count(i.id), count(i.id) FILTER (WHERE i.status <> 'RESOLVED')
  FROM public.wards w
  JOIN public.issues i ON i.ward_id = w.id AND i.is_hidden = false
  GROUP BY w.id, w.name ORDER BY count(i.id) DESC;
$$;

CREATE OR REPLACE FUNCTION public.insights_by_sector()
RETURNS TABLE (sector text, total bigint, unresolved bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT i.postcode_sector, count(*), count(*) FILTER (WHERE i.status <> 'RESOLVED')
  FROM public.issues i
  WHERE i.is_hidden = false AND i.postcode_sector IS NOT NULL
  GROUP BY i.postcode_sector ORDER BY count(*) DESC;
$$;

CREATE OR REPLACE FUNCTION public.insights_trend(_months integer DEFAULT 12)
RETURNS TABLE (month date, reported bigint, resolved bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT m::date,
    (SELECT count(*) FROM public.issues i
      WHERE i.is_hidden = false AND date_trunc('month', i.created_at) = m),
    (SELECT count(*) FROM public.issues i
      WHERE i.is_hidden = false AND date_trunc('month', i.resolved_at) = m)
  FROM generate_series(
    date_trunc('month', now()) - make_interval(months => GREATEST(_months,1) - 1),
    date_trunc('month', now()), interval '1 month') AS m
  ORDER BY m;
$$;

GRANT EXECUTE ON FUNCTION public.insights_summary() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insights_by_category() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insights_by_authority() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insights_by_ward() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insights_by_sector() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insights_trend(integer) TO anon, authenticated;

-- ===== Seed: country + region, link Southampton =====
INSERT INTO public.countries (code, name) VALUES
  ('ENG','England'), ('SCT','Scotland'), ('WLS','Wales'), ('NIR','Northern Ireland')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.regions (country_id, name, slug, gss_code)
SELECT c.id, 'South East', 'south-east', 'E12000008' FROM public.countries c WHERE c.code = 'ENG'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.authorities a
SET country_id = (SELECT id FROM public.countries WHERE code = 'ENG'),
    region_id = (SELECT id FROM public.regions WHERE slug = 'south-east')
WHERE a.slug = 'southampton-city-council';