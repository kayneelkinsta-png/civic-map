CREATE OR REPLACE FUNCTION public.resolve_authority(_lat double precision, _lng double precision)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE found UUID; pt extensions.geography;
BEGIN
  IF _lat IS NULL OR _lng IS NULL THEN
    RETURN NULL;
  END IF;
  pt := extensions.ST_SetSRID(extensions.ST_MakePoint(_lng,_lat),4326)::extensions.geography;
  -- Strictly geographic: no nearest, default or oldest-authority fallback.
  SELECT a.id INTO found
  FROM public.authorities a
  WHERE a.is_active
    AND a.boundary IS NOT NULL
    AND extensions.ST_Intersects(a.boundary, pt)
  LIMIT 1;
  RETURN found;
END; $function$