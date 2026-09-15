
DROP VIEW IF EXISTS public.public_profiles;

CREATE TABLE public.public_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  postcode_district TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public profiles read" ON public.public_profiles FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.public_profiles (id, first_name, postcode_district, avatar_url, created_at)
  VALUES (NEW.id, NEW.first_name, NEW.postcode_district, NEW.avatar_url, NEW.created_at)
  ON CONFLICT (id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        postcode_district = EXCLUDED.postcode_district,
        avatar_url = EXCLUDED.avatar_url;
  RETURN NULL;
END; $$;
CREATE TRIGGER profiles_sync_public AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

INSERT INTO public.public_profiles (id, first_name, postcode_district, avatar_url, created_at)
SELECT id, first_name, postcode_district, avatar_url, created_at FROM public.profiles
ON CONFLICT (id) DO NOTHING;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_public_profile() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_issue_confirmations() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_issue_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_issue_counters() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.assign_issue_authority() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.resolve_authority(DOUBLE PRECISION, DOUBLE PRECISION) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(UUID) FROM anon, public;
