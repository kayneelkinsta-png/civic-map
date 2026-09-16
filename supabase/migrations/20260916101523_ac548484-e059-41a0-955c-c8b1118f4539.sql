ALTER TABLE public.data_sources
  ADD COLUMN IF NOT EXISTS attribution text,
  ADD COLUMN IF NOT EXISTS update_frequency text,
  ADD COLUMN IF NOT EXISTS coverage text,
  ADD COLUMN IF NOT EXISTS source_id_field text,
  ADD COLUMN IF NOT EXISTS accessed_at timestamptz;

ALTER TABLE public.infrastructure_assets
  ADD COLUMN IF NOT EXISTS postcode_sector text;

CREATE INDEX IF NOT EXISTS infrastructure_assets_sector_idx
  ON public.infrastructure_assets (postcode_sector);

CREATE OR REPLACE FUNCTION public.import_infrastructure_assets(
  _source_id uuid,
  _asset_type text,
  _authority_id uuid,
  _payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_considered int := 0;
  v_invalid int := 0;
  v_duplicates int := 0;
  v_outside int := 0;
  v_inserted int := 0;
  v_updated int := 0;
  v_removed int := 0;
BEGIN
  CREATE TEMP TABLE _naptan_src ON COMMIT DROP AS
  SELECT
    nullif(e->>'external_asset_id','') AS eid,
    nullif(e->>'name','') AS nm,
    (e->>'latitude')::float8 AS lat,
    (e->>'longitude')::float8 AS lng,
    nullif(e->>'source_updated_at','')::timestamptz AS sua,
    nullif(e->>'postcode_sector','') AS ps,
    coalesce(e->'metadata','{}'::jsonb) AS md
  FROM jsonb_array_elements(_payload) e;

  SELECT count(*) INTO v_considered FROM _naptan_src;

  SELECT count(*) INTO v_invalid FROM _naptan_src
   WHERE eid IS NULL OR lat IS NULL OR lng IS NULL
      OR lat NOT BETWEEN -90 AND 90 OR lng NOT BETWEEN -180 AND 180
      OR (lat = 0 AND lng = 0);

  CREATE TEMP TABLE _naptan_valid ON COMMIT DROP AS
  SELECT DISTINCT ON (eid) * FROM _naptan_src
   WHERE eid IS NOT NULL AND lat IS NOT NULL AND lng IS NOT NULL
     AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180
     AND NOT (lat = 0 AND lng = 0)
   ORDER BY eid, sua DESC NULLS LAST;

  SELECT (v_considered - v_invalid) - count(*) INTO v_duplicates FROM _naptan_valid;

  CREATE TEMP TABLE _naptan_keep ON COMMIT DROP AS
  SELECT v.*, public.resolve_ward(v.lat, v.lng) AS wid FROM _naptan_valid v;

  DELETE FROM _naptan_keep WHERE wid IS NULL;
  GET DIAGNOSTICS v_outside = ROW_COUNT;

  WITH up AS (
    INSERT INTO public.infrastructure_assets (
      asset_type, external_asset_id, name, latitude, longitude,
      authority_id, ward_id, postcode_sector, status, source_id,
      source_updated_at, is_sample, metadata
    )
    SELECT _asset_type, eid, nm, lat, lng, _authority_id, wid, ps,
           'operational', _source_id, sua, false, md
    FROM _naptan_keep
    ON CONFLICT (source_id, external_asset_id)
      WHERE source_id IS NOT NULL AND external_asset_id IS NOT NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      authority_id = EXCLUDED.authority_id,
      ward_id = EXCLUDED.ward_id,
      postcode_sector = COALESCE(EXCLUDED.postcode_sector, public.infrastructure_assets.postcode_sector),
      source_updated_at = EXCLUDED.source_updated_at,
      metadata = EXCLUDED.metadata,
      status = CASE WHEN public.infrastructure_assets.status = 'source_removed'
                    THEN 'operational' ELSE public.infrastructure_assets.status END,
      updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert), count(*) FILTER (WHERE NOT was_insert)
    INTO v_inserted, v_updated FROM up;

  UPDATE public.infrastructure_assets a
     SET status = 'source_removed', updated_at = now()
   WHERE a.source_id = _source_id
     AND a.external_asset_id IS NOT NULL
     AND a.status <> 'source_removed'
     AND NOT EXISTS (SELECT 1 FROM _naptan_keep k WHERE k.eid = a.external_asset_id);
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  RETURN jsonb_build_object(
    'considered', v_considered,
    'invalid', v_invalid,
    'duplicates', v_duplicates,
    'outside_boundary', v_outside,
    'inserted', v_inserted,
    'updated', v_updated,
    'marked_source_removed', v_removed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_infrastructure_assets(uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_infrastructure_assets(uuid, text, uuid, jsonb) TO service_role;