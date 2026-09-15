ALTER TABLE public.wards
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS wards_gss_code_key ON public.wards (gss_code) WHERE gss_code IS NOT NULL;

DELETE FROM public.data_sources WHERE dataset_name = '__probe__';