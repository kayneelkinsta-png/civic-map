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
      asset_type, external_asset_id, name, latitude, longitude, boundary,
      geometry_type, authority_id, ward_id, status, source_id, source_version,
      source_updated_at, is_sample, metadata
    )
    SELECT at, eid, nm,
           extensions.ST_Y(pt), extensions.ST_X(pt),
           g::extensions.geography,
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