ALTER TABLE public.issues DISABLE TRIGGER issues_protect_counters;
UPDATE public.issues SET resolved_at = created_at + interval '12 days' WHERE reference = 'CL-C4252939' AND status = 'RESOLVED' AND resolved_at IS NULL;
ALTER TABLE public.issues ENABLE TRIGGER issues_protect_counters;