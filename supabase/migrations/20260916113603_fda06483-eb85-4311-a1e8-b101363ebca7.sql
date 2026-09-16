
ALTER TABLE public.reporting_destinations
  ADD COLUMN IF NOT EXISTS requires_manual_condition boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.resolve_reporting_destination(_authority_id uuid, _category_id uuid)
RETURNS TABLE(
  id uuid,
  organisation_name text,
  service_type text,
  reporting_method text,
  reporting_url text,
  api_status text,
  source text,
  source_url text,
  last_verified_at timestamp with time zone
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT d.id, d.organisation_name, d.service_type, d.reporting_method, d.reporting_url,
         d.api_status, d.source, d.source_url, d.last_verified_at
  FROM public.reporting_destinations d
  WHERE d.is_active
    AND NOT d.requires_manual_condition
    AND d.last_verified_at IS NOT NULL
    AND _category_id IS NOT NULL
    AND d.category_id = _category_id
    AND (d.authority_id IS NULL OR _authority_id IS NULL OR d.authority_id = _authority_id)
  ORDER BY (d.authority_id IS NOT DISTINCT FROM _authority_id) DESC, d.last_verified_at DESC
  LIMIT 1
$$;
