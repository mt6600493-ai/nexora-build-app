CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.user_plans (
  user_id uuid PRIMARY KEY,
  plan text NOT NULL DEFAULT 'free',
  premium_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_plans TO authenticated;
GRANT ALL ON public.user_plans TO service_role;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan" ON public.user_plans FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.ai_usage (
  user_id uuid NOT NULL,
  day date NOT NULL,
  builds int NOT NULL DEFAULT 0,
  chats int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage" ON public.ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.project_publishes (
  project_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  first_published_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_publishes TO authenticated;
GRANT ALL ON public.project_publishes TO service_role;
ALTER TABLE public.project_publishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own publishes" ON public.project_publishes FOR SELECT TO authenticated USING (user_id = auth.uid());
INSERT INTO public.project_publishes (project_id, user_id, first_published_at)
  SELECT id, user_id, COALESCE(published_at, updated_at) FROM public.projects WHERE visibility = 'public'
  ON CONFLICT DO NOTHING;

CREATE TABLE public.project_visits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  device text NOT NULL DEFAULT 'desktop',
  visited_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_visits_project_idx ON public.project_visits (project_id, visited_at);
GRANT ALL ON public.project_visits TO service_role;
ALTER TABLE public.project_visits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_premium(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin') OR EXISTS (
    SELECT 1 FROM public.user_plans WHERE user_id = _uid AND plan = 'premium' AND (premium_until IS NULL OR premium_until > now()))
$$;

CREATE OR REPLACE FUNCTION public.pk_today() RETURNS date LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'Asia/Karachi')::date
$$;

CREATE OR REPLACE FUNCTION public.publish_allowance(_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE used int; allowed int; created timestamptz;
BEGIN
  IF public.has_role(_uid, 'admin') THEN RETURN jsonb_build_object('used', 0, 'allowed', -1); END IF;
  IF public.is_premium(_uid) THEN
    SELECT count(*) INTO used FROM public.project_publishes WHERE user_id = _uid AND first_published_at >= date_trunc('month', now());
    RETURN jsonb_build_object('used', used, 'allowed', 10);
  END IF;
  SELECT created_at INTO created FROM auth.users WHERE id = _uid;
  allowed := 2 + GREATEST(0, (EXTRACT(year FROM age(now(), COALESCE(created, now()))) * 12 + EXTRACT(month FROM age(now(), COALESCE(created, now()))))::int);
  SELECT count(*) INTO used FROM public.project_publishes WHERE user_id = _uid;
  RETURN jsonb_build_object('used', used, 'allowed', allowed);
END $$;

CREATE OR REPLACE FUNCTION public.my_quota()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); b_today int; b_month int; c_today int;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(builds,0), COALESCE(chats,0) INTO b_today, c_today FROM public.ai_usage WHERE user_id = uid AND day = public.pk_today();
  SELECT COALESCE(sum(builds),0) INTO b_month FROM public.ai_usage WHERE user_id = uid AND day >= date_trunc('month', public.pk_today())::date;
  RETURN jsonb_build_object(
    'premium', public.is_premium(uid), 'admin', public.has_role(uid, 'admin'),
    'builds_today', COALESCE(b_today,0), 'builds_month', COALESCE(b_month,0), 'chats_today', COALESCE(c_today,0),
    'publish', public.publish_allowance(uid));
END $$;
GRANT EXECUTE ON FUNCTION public.my_quota() TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_ai(_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); q jsonb;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'auth'); END IF;
  IF _kind NOT IN ('build','chat') THEN RETURN jsonb_build_object('ok', false, 'reason', 'kind'); END IF;
  IF NOT public.is_premium(uid) THEN
    q := public.my_quota();
    IF _kind = 'build' AND (q->>'builds_today')::int >= 10 THEN RETURN jsonb_build_object('ok', false, 'reason', 'daily'); END IF;
    IF _kind = 'build' AND (q->>'builds_month')::int >= 100 THEN RETURN jsonb_build_object('ok', false, 'reason', 'monthly'); END IF;
    IF _kind = 'chat' AND (q->>'chats_today')::int >= 100 THEN RETURN jsonb_build_object('ok', false, 'reason', 'chat'); END IF;
  END IF;
  INSERT INTO public.ai_usage (user_id, day, builds, chats)
    VALUES (uid, public.pk_today(), CASE WHEN _kind='build' THEN 1 ELSE 0 END, CASE WHEN _kind='chat' THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, day) DO UPDATE SET
    builds = ai_usage.builds + CASE WHEN _kind='build' THEN 1 ELSE 0 END,
    chats = ai_usage.chats + CASE WHEN _kind='chat' THEN 1 ELSE 0 END;
  RETURN jsonb_build_object('ok', true);
END $$;
GRANT EXECUTE ON FUNCTION public.consume_ai(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_publish_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a jsonb;
BEGIN
  IF NEW.visibility = 'public' AND (TG_OP = 'INSERT' OR OLD.visibility IS DISTINCT FROM 'public')
     AND NOT EXISTS (SELECT 1 FROM public.project_publishes WHERE project_id = NEW.id) THEN
    a := public.publish_allowance(NEW.user_id);
    IF (a->>'allowed')::int >= 0 AND (a->>'used')::int >= (a->>'allowed')::int THEN
      RAISE EXCEPTION 'PUBLISH_LIMIT: You have used all your publishes. Upgrade to Premium to publish more apps.';
    END IF;
    INSERT INTO public.project_publishes (project_id, user_id) VALUES (NEW.id, NEW.user_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER projects_publish_quota BEFORE INSERT OR UPDATE OF visibility ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publish_quota();

CREATE OR REPLACE FUNCTION public.record_visit(_project uuid, _device text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid;
BEGIN
  SELECT user_id INTO owner FROM public.projects WHERE id = _project AND visibility = 'public';
  IF owner IS NULL THEN RETURN; END IF;
  INSERT INTO public.project_visits (project_id, owner_id, device)
    VALUES (_project, owner, CASE WHEN _device = 'mobile' THEN 'mobile' ELSE 'desktop' END);
END $$;
GRANT EXECUTE ON FUNCTION public.record_visit(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.project_stats(_project uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = _project AND user_id = auth.uid()) THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'total', count(*),
    'today', count(*) FILTER (WHERE (visited_at AT TIME ZONE 'Asia/Karachi')::date = public.pk_today()),
    'mobile', count(*) FILTER (WHERE device = 'mobile'),
    'desktop', count(*) FILTER (WHERE device = 'desktop'),
    'week', (SELECT jsonb_agg(jsonb_build_object('day', d::date, 'visits',
        (SELECT count(*) FROM public.project_visits v WHERE v.project_id = _project AND (v.visited_at AT TIME ZONE 'Asia/Karachi')::date = d::date)) ORDER BY d)
      FROM generate_series(public.pk_today() - 6, public.pk_today(), interval '1 day') d))
  INTO r FROM public.project_visits WHERE project_id = _project;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.project_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE prem int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT count(*) INTO prem FROM public.user_plans WHERE plan = 'premium' AND (premium_until IS NULL OR premium_until > now());
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM auth.users),
    'new_today', (SELECT count(*) FROM auth.users WHERE (created_at AT TIME ZONE 'Asia/Karachi')::date = public.pk_today()),
    'logins_today', (SELECT count(*) FROM auth.users WHERE (last_sign_in_at AT TIME ZONE 'Asia/Karachi')::date = public.pk_today()),
    'premium', prem,
    'free', (SELECT count(*) FROM auth.users) - prem,
    'revenue_month', prem * 25,
    'visits', (SELECT count(*) FROM public.project_visits),
    'visits_today', (SELECT count(*) FROM public.project_visits WHERE (visited_at AT TIME ZONE 'Asia/Karachi')::date = public.pk_today()),
    'projects', (SELECT count(*) FROM public.projects),
    'published', (SELECT count(*) FROM public.projects WHERE visibility = 'public'),
    'ai_today', (SELECT COALESCE(sum(builds + chats),0) FROM public.ai_usage WHERE day = public.pk_today()));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_users()
RETURNS TABLE (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, premium boolean, premium_until timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at, public.is_premium(u.id), p.premium_until
    FROM auth.users u LEFT JOIN public.user_plans p ON p.user_id = u.id ORDER BY u.created_at DESC LIMIT 500;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_plan(_uid uuid, _premium boolean, _months int DEFAULT 1)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.user_plans (user_id, plan, premium_until, updated_at)
    VALUES (_uid, CASE WHEN _premium THEN 'premium' ELSE 'free' END, CASE WHEN _premium THEN now() + make_interval(months => GREATEST(_months,1)) END, now())
  ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, premium_until = EXCLUDED.premium_until, updated_at = now();
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(uuid, boolean, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_founder_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'mt6600493@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_founder_admin AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_founder_admin();
INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'mt6600493@gmail.com' ON CONFLICT DO NOTHING;