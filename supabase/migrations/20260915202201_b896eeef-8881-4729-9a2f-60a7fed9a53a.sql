
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','moderator','resident');
CREATE TYPE public.issue_status AS ENUM ('NEW','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','REOPENED');

-- UTILITY
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  surname TEXT NOT NULL DEFAULT '',
  postcode TEXT,
  postcode_district TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- public-safe profile projection
CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, first_name, postcode_district, avatar_url, created_at FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','moderator'));
$$;

-- NEW USER HOOK
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, surname, postcode, postcode_district)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'surname',''),
    NULLIF(NEW.raw_user_meta_data->>'postcode',''),
    NULLIF(split_part(upper(trim(COALESCE(NEW.raw_user_meta_data->>'postcode',''))),' ',1),'')
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'resident') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- AUTHORITIES
CREATE TABLE public.authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  authority_type TEXT NOT NULL DEFAULT 'unitary',
  gss_code TEXT,
  website_url TEXT,
  contact_email TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  boundary extensions.geography(MultiPolygon,4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX authorities_boundary_idx ON public.authorities USING GIST (boundary);
GRANT SELECT ON public.authorities TO anon, authenticated;
GRANT ALL ON public.authorities TO service_role;
ALTER TABLE public.authorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authorities public read" ON public.authorities FOR SELECT USING (true);
CREATE POLICY "authorities admin write" ON public.authorities FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER authorities_updated_at BEFORE UPDATE ON public.authorities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WARDS
CREATE TABLE public.wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_id UUID NOT NULL REFERENCES public.authorities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gss_code TEXT,
  boundary extensions.geography(MultiPolygon,4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wards_boundary_idx ON public.wards USING GIST (boundary);
CREATE INDEX wards_authority_idx ON public.wards(authority_id);
GRANT SELECT ON public.wards TO anon, authenticated;
GRANT ALL ON public.wards TO service_role;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wards public read" ON public.wards FOR SELECT USING (true);
CREATE POLICY "wards admin write" ON public.wards FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- POSTCODES
CREATE TABLE public.postcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postcode TEXT NOT NULL UNIQUE,
  outcode TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  authority_id UUID REFERENCES public.authorities(id) ON DELETE SET NULL,
  ward_id UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  geom extensions.geography(Point,4326) GENERATED ALWAYS AS (extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude),4326)::extensions.geography) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX postcodes_geom_idx ON public.postcodes USING GIST (geom);
CREATE INDEX postcodes_outcode_idx ON public.postcodes(outcode);
GRANT SELECT ON public.postcodes TO anon, authenticated;
GRANT ALL ON public.postcodes TO service_role;
ALTER TABLE public.postcodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "postcodes public read" ON public.postcodes FOR SELECT USING (true);
CREATE POLICY "postcodes admin write" ON public.postcodes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- CATEGORIES
CREATE TABLE public.issue_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'alert-triangle',
  emoji TEXT NOT NULL DEFAULT '⚠️',
  colour TEXT NOT NULL DEFAULT '#64748b',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.issue_categories TO anon, authenticated;
GRANT ALL ON public.issue_categories TO service_role;
ALTER TABLE public.issue_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.issue_categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.issue_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ISSUES
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE DEFAULT ('CL-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES public.issue_categories(id),
  authority_id UUID REFERENCES public.authorities(id) ON DELETE SET NULL,
  ward_id UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  address_text TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom extensions.geography(Point,4326) GENERATED ALWAYS AS (extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude),4326)::extensions.geography) STORED,
  status public.issue_status NOT NULL DEFAULT 'NEW',
  confirmation_count INTEGER NOT NULL DEFAULT 0,
  last_confirmed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX issues_geom_idx ON public.issues USING GIST (geom);
CREATE INDEX issues_status_idx ON public.issues(status);
CREATE INDEX issues_category_idx ON public.issues(category_id);
CREATE INDEX issues_created_idx ON public.issues(created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.issues TO authenticated;
GRANT SELECT ON public.issues TO anon;
GRANT ALL ON public.issues TO service_role;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issues public read" ON public.issues FOR SELECT USING (is_hidden = false OR reporter_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "issues insert own" ON public.issues FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "issues update own" ON public.issues FOR UPDATE TO authenticated USING (auth.uid() = reporter_id) WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "issues staff update" ON public.issues FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- guard: residents must not tamper with community counters
CREATE OR REPLACE FUNCTION public.protect_issue_counters()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    NEW.confirmation_count := OLD.confirmation_count;
    NEW.last_confirmed_at := OLD.last_confirmed_at;
    NEW.reporter_id := OLD.reporter_id;
    NEW.is_sample := OLD.is_sample;
    NEW.status := OLD.status;
    NEW.resolved_at := OLD.resolved_at;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER issues_protect_counters BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.protect_issue_counters();

-- STATUS HISTORY
CREATE TABLE public.issue_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  from_status public.issue_status,
  to_status public.issue_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX issue_status_history_issue_idx ON public.issue_status_history(issue_id);
GRANT SELECT ON public.issue_status_history TO anon, authenticated;
GRANT ALL ON public.issue_status_history TO service_role;
ALTER TABLE public.issue_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status history public read" ON public.issue_status_history FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.log_issue_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.issue_status_history (issue_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, NEW.reporter_id);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.issue_status_history (issue_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    IF NEW.status = 'RESOLVED' THEN
      UPDATE public.issues SET resolved_at = now() WHERE id = NEW.id AND resolved_at IS NULL;
    END IF;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER issues_log_status AFTER INSERT OR UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.log_issue_status();

-- PHOTOS
CREATE TABLE public.issue_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX issue_photos_issue_idx ON public.issue_photos(issue_id);
GRANT SELECT ON public.issue_photos TO anon, authenticated;
GRANT INSERT, DELETE ON public.issue_photos TO authenticated;
GRANT ALL ON public.issue_photos TO service_role;
ALTER TABLE public.issue_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos public read" ON public.issue_photos FOR SELECT USING (true);
CREATE POLICY "photos insert own" ON public.issue_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "photos delete own" ON public.issue_photos FOR DELETE TO authenticated USING (auth.uid() = uploaded_by OR public.is_staff(auth.uid()));

-- CONFIRMATIONS
CREATE TABLE public.issue_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issue_id, user_id)
);
CREATE INDEX issue_confirmations_issue_idx ON public.issue_confirmations(issue_id);
GRANT SELECT ON public.issue_confirmations TO anon, authenticated;
GRANT INSERT, UPDATE ON public.issue_confirmations TO authenticated;
GRANT ALL ON public.issue_confirmations TO service_role;
ALTER TABLE public.issue_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "confirmations public read" ON public.issue_confirmations FOR SELECT USING (true);
CREATE POLICY "confirmations insert own" ON public.issue_confirmations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "confirmations update own" ON public.issue_confirmations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_issue_confirmations()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target UUID;
BEGIN
  target := COALESCE(NEW.issue_id, OLD.issue_id);
  UPDATE public.issues i
  SET confirmation_count = (SELECT count(*) FROM public.issue_confirmations c WHERE c.issue_id = target),
      last_confirmed_at = (SELECT max(c.updated_at) FROM public.issue_confirmations c WHERE c.issue_id = target),
      status = CASE WHEN i.status = 'RESOLVED' THEN 'REOPENED'::public.issue_status ELSE i.status END
  WHERE i.id = target;
  RETURN NULL;
END; $$;
CREATE TRIGGER confirmations_sync AFTER INSERT OR UPDATE OR DELETE ON public.issue_confirmations FOR EACH ROW EXECUTE FUNCTION public.sync_issue_confirmations();

-- re-confirmation cooldown (6 hours)
CREATE OR REPLACE FUNCTION public.guard_confirmation_cooldown()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.updated_at > now() - interval '6 hours' THEN
    RAISE EXCEPTION 'You have already confirmed this issue recently.';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER confirmations_cooldown BEFORE UPDATE ON public.issue_confirmations FOR EACH ROW EXECUTE FUNCTION public.guard_confirmation_cooldown();

-- COMMENTS
CREATE TABLE public.issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX issue_comments_issue_idx ON public.issue_comments(issue_id);
GRANT SELECT ON public.issue_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.issue_comments TO authenticated;
GRANT ALL ON public.issue_comments TO service_role;
ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments public read" ON public.issue_comments FOR SELECT USING (is_hidden = false OR public.is_staff(auth.uid()));
CREATE POLICY "comments insert own" ON public.issue_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments update own" ON public.issue_comments FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments delete own" ON public.issue_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_staff(auth.uid()));
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.issue_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FOLLOWERS
CREATE TABLE public.issue_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issue_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.issue_followers TO authenticated;
GRANT ALL ON public.issue_followers TO service_role;
ALTER TABLE public.issue_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followers read own" ON public.issue_followers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "followers insert own" ON public.issue_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "followers delete own" ON public.issue_followers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications delete own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- MODERATION
CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderation staff read" ON public.moderation_actions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "moderation staff insert" ON public.moderation_actions FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = moderator_id);

-- AUTHORITY ROUTING (point-in-polygon when boundaries exist, single-authority fallback)
CREATE OR REPLACE FUNCTION public.resolve_authority(_lat DOUBLE PRECISION, _lng DOUBLE PRECISION)
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE found UUID; pt extensions.geography;
BEGIN
  pt := extensions.ST_SetSRID(extensions.ST_MakePoint(_lng,_lat),4326)::extensions.geography;
  SELECT a.id INTO found FROM public.authorities a
  WHERE a.boundary IS NOT NULL AND extensions.ST_Intersects(a.boundary, pt) LIMIT 1;
  IF found IS NULL THEN
    SELECT a.id INTO found FROM public.authorities a ORDER BY a.created_at LIMIT 1;
  END IF;
  RETURN found;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_issue_authority()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.authority_id IS NULL THEN
    NEW.authority_id := public.resolve_authority(NEW.latitude, NEW.longitude);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER issues_assign_authority BEFORE INSERT ON public.issues FOR EACH ROW EXECUTE FUNCTION public.assign_issue_authority();

-- SEED: authority + categories
INSERT INTO public.authorities (name, slug, authority_type, gss_code, website_url)
VALUES ('Southampton City Council','southampton-city-council','unitary','E06000045','https://www.southampton.gov.uk');

INSERT INTO public.issue_categories (slug, name, emoji, icon, colour, sort_order) VALUES
('pothole','Potholes / road defects','🕳️','circle-dot','#b45309',1),
('street-lighting','Street lighting','💡','lightbulb','#ca8a04',2),
('bins','Bins','🗑️','trash-2','#15803d',3),
('pavements','Pavements','🚶','footprints','#0f766e',4),
('fly-tipping','Fly-tipping','🧹','package-x','#7c2d12',5),
('trees','Trees','🌳','tree-pine','#166534',6),
('traffic-lights','Traffic lights','🚦','traffic-cone','#b91c1c',7),
('flooding','Flooding / drainage','🌊','waves','#1d4ed8',8),
('bus-stops','Bus stops','🚏','bus','#6d28d9',9),
('other','Other','⚠️','alert-triangle','#475569',10);
