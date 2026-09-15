ALTER TABLE public.issues DISABLE TRIGGER USER;

UPDATE public.issues i
SET ward_id = public.resolve_ward(i.latitude, i.longitude)
WHERE i.latitude IS NOT NULL AND i.longitude IS NOT NULL;

ALTER TABLE public.issues ENABLE TRIGGER USER;

UPDATE public.infrastructure_assets a
SET ward_id = public.resolve_ward(a.latitude, a.longitude)
WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL;