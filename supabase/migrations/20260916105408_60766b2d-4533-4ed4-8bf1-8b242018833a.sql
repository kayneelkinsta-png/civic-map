ALTER TABLE public.infrastructure_assets
  ADD COLUMN IF NOT EXISTS boundary extensions.geography(MultiPolygon,4326),
  ADD COLUMN IF NOT EXISTS geometry_type text NOT NULL DEFAULT 'point',
  ADD COLUMN IF NOT EXISTS source_version text;

CREATE INDEX IF NOT EXISTS infrastructure_assets_boundary_idx
  ON public.infrastructure_assets USING gist (boundary);
CREATE INDEX IF NOT EXISTS infrastructure_assets_geometry_type_idx
  ON public.infrastructure_assets (geometry_type);

ALTER TABLE public.data_sources ADD COLUMN IF NOT EXISTS source_version text;

-- Bounding box of an authority's ward coverage, in British National Grid,
-- so importers can select only the source tiles they need.
CREATE OR REPLACE FUNCTION public.authority_bng_bbox(_authority_id uuid)
RETURNS TABLE(minx double precision, miny double precision, maxx double precision, maxy double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT extensions.ST_XMin(b), extensions.ST_YMin(b), extensions.ST_XMax(b), extensions.ST_YMax(b)
  FROM (
    SELECT extensions.ST_Extent(
      extensions.ST_Transform(w.boundary::extensions.geometry, 27700)
    )::extensions.geometry AS b
    FROM public.wards w
    WHERE w.authority_id = _authority_id AND w.boundary IS NOT NULL
  ) s;
$$;

REVOKE EXECUTE ON FUNCTION public.authority_bng_bbox(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authority_bng_bbox(uuid) TO service_role;

-- Reusable polygon-dataset import. Source geometry is preserved as supplied
-- (only reprojected); invalid geometry is rejected, never silently repaired.
CREATE OR REPLACE FUNCTION public.import_area_assets(
  _source_id uuid,
  _authority_id uuid,
  _payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_considered int := 0;
  v_invalid int := 0;
  v_duplicates int := 0;
  v_outside int := 0;
  v_inserted int := 0;
  v_updated int := 0;
  v_ward int := 0;
BEGIN
  CREATE TEMP TABLE _area_src ON COMMIT DROP AS
  SELECT
    nullif(e->>'external_asset_id','') AS eid,
    nullif(e->>'name','') AS nm,
    coalesce(nullif(e->>'asset_type',''),'greenspace') AS at,
    nullif(e->>'source_version','') AS sv,
    coalesce(e->'metadata','{}'::jsonb) AS md,
    CASE WHEN (e->>'wkt') IS NULL THEN NULL
         ELSE extensions.ST_Multi(
                extensions.ST_Transform(
                  extensions.ST_SetSRID(extensions.ST_GeomFromText(e->>'wkt'), 27700), 4326))
    END AS g
  FROM jsonb_array_elements(_payload) e;

  SELECT count(*) INTO v_considered FROM _area_src;

  SELECT count(*) INTO v_invalid FROM _area_src
   WHERE eid IS NULL OR g IS NULL OR extensions.ST_IsEmpty(g) OR NOT extensions.ST_IsValid(g);

  CREATE TEMP TABLE _area_valid ON COMMIT DROP AS
  SELECT DISTINCT ON (eid) * FROM _area_src
   WHERE eid IS NOT NULL AND g IS NOT NULL
     AND NOT extensions.ST_IsEmpty(g) AND extensions.ST_IsValid(g)
   ORDER BY eid;

  SELECT (v_considered - v_invalid) - count(*) INTO v_duplicates FROM _area_valid;

  -- Keep only features that actually fall inside the authority's ward coverage,
  -- and assign the ward with the largest overlap (documented method).
  CREATE TEMP TABLE _area_keep ON COMMIT DROP AS
  SELECT v.*,
         extensions.ST_PointOnSurface(v.g) AS pt,
         (SELECT w.id FROM public.wards w
           WHERE w.authority_id = _authority_id AND w.boundary IS NOT NULL
             AND extensions.ST_Intersects(w.boundary::extensions.geometry, v.g)
           ORDER BY extensions.ST_Area(
             extensions.ST_Intersection(w.boundary::extensions.geometry, v.g)) DESC
           LIMIT 1) AS wid
  FROM _area_valid v;

  DELETE FROM _area_keep WHERE wid IS NULL;
  GET DIAGNOSTICS v_outside = ROW_COUNT;

  WITH up AS (
    INSERT INTO public.infrastructure_assets (
      asset_type, external_asset_id, name, latitude, longitude, geom, boundary,
      geometry_type, authority_id, ward_id, status, source_id, source_version,
      source_updated_at, is_sample, metadata
    )
    SELECT at, eid, nm,
           extensions.ST_Y(pt), extensions.ST_X(pt),
           pt::extensions.geography, g::extensions.geography,
           'polygon', _authority_id, wid, 'operational', _source_id, sv,
           now(), false, md
    FROM _area_keep
    ON CONFLICT (source_id, external_asset_id)
      WHERE source_id IS NOT NULL AND external_asset_id IS NOT NULL
    DO UPDATE SET
      asset_type = EXCLUDED.asset_type,
      name = EXCLUDED.name,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      geom = EXCLUDED.geom,
      boundary = EXCLUDED.boundary,
      geometry_type = EXCLUDED.geometry_type,
      authority_id = EXCLUDED.authority_id,
      ward_id = EXCLUDED.ward_id,
      source_version = EXCLUDED.source_version,
      source_updated_at = EXCLUDED.source_updated_at,
      metadata = EXCLUDED.metadata,
      status = CASE WHEN public.infrastructure_assets.status = 'source_removed'
                    THEN 'operational' ELSE public.infrastructure_assets.status END,
      updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert), count(*) FILTER (WHERE NOT was_insert)
    INTO v_inserted, v_updated FROM up;

  SELECT count(*) INTO v_ward FROM _area_keep WHERE wid IS NOT NULL;

  RETURN jsonb_build_object(
    'considered', v_considered,
    'invalid', v_invalid,
    'duplicates', v_duplicates,
    'outside_boundary', v_outside,
    'inserted', v_inserted,
    'updated', v_updated,
    'ward_assigned', v_ward
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.import_area_assets(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_area_assets(uuid, uuid, jsonb) TO service_role;

-- Retirement: assets absent from a later release are retained and flagged.
CREATE OR REPLACE FUNCTION public.retire_missing_source_assets(_source_id uuid, _keep text[])
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_removed int := 0;
BEGIN
  UPDATE public.infrastructure_assets a
     SET status = 'source_removed', updated_at = now()
   WHERE a.source_id = _source_id
     AND a.external_asset_id IS NOT NULL
     AND a.status <> 'source_removed'
     AND NOT (a.external_asset_id = ANY (_keep));
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  RETURN v_removed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retire_missing_source_assets(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retire_missing_source_assets(uuid, text[]) TO service_role;

-- Map read: greenspace shapes for the visible area only.
CREATE OR REPLACE FUNCTION public.area_assets_in_bounds(
  _west double precision, _south double precision,
  _east double precision, _north double precision,
  _limit integer DEFAULT 400
) RETURNS TABLE(id uuid, name text, asset_type text, geojson json)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT a.id, a.name, a.asset_type,
         extensions.ST_AsGeoJSON(a.boundary::extensions.geometry, 6)::json
  FROM public.infrastructure_assets a
  WHERE a.boundary IS NOT NULL
    AND a.status <> 'source_removed'
    AND extensions.ST_Intersects(
          a.boundary,
          extensions.ST_MakeEnvelope(_west, _south, _east, _north, 4326)::extensions.geography)
  LIMIT greatest(coalesce(_limit, 400), 1);
$$;

GRANT EXECUTE ON FUNCTION public.area_assets_in_bounds(double precision, double precision, double precision, double precision, integer) TO anon, authenticated, service_role;