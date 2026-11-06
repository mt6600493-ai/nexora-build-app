CREATE OR REPLACE FUNCTION public.plan_of(_uid uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN public.has_role(_uid,'admin') THEN 'admin'
    ELSE COALESCE((SELECT CASE WHEN plan='pro_plus' THEN 'pro_plus' ELSE 'pro' END FROM public.user_plans WHERE user_id=_uid AND plan IN ('premium','pro','pro_plus') AND (premium_until IS NULL OR premium_until>now())),'free') END
$$;

CREATE OR REPLACE FUNCTION public.my_quota() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); b_today int; b_month int; c_today int; p text;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  p := public.plan_of(uid);
  SELECT COALESCE(builds,0), COALESCE(chats,0) INTO b_today, c_today FROM public.ai_usage WHERE user_id=uid AND day=public.pk_today();
  SELECT COALESCE(sum(builds),0) INTO b_month FROM public.ai_usage WHERE user_id=uid AND day>=date_trunc('month',public.pk_today())::date;
  RETURN jsonb_build_object('plan',p,'premium',p<>'free','admin',p='admin',
    'builds_today',COALESCE(b_today,0),'builds_month',COALESCE(b_month,0),'chats_today',COALESCE(c_today,0),
    'daily_limit',CASE WHEN p='free' THEN 10 ELSE -1 END,
    'monthly_limit',CASE p WHEN 'free' THEN 100 WHEN 'pro' THEN 1000 WHEN 'pro_plus' THEN 5000 ELSE -1 END,
    'first_publish_free', NOT EXISTS (SELECT 1 FROM public.project_publishes WHERE user_id=uid),
    'publish',public.publish_allowance(uid));
END $$;

CREATE OR REPLACE FUNCTION public.consume_ai(_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); q jsonb; cost int := 2;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','auth'); END IF;
  IF _kind NOT IN ('build','chat','publish') THEN RETURN jsonb_build_object('ok',false,'reason','kind'); END IF;
  q := public.my_quota();
  IF q->>'plan'='admin' THEN RETURN jsonb_build_object('ok',true); END IF;
  IF _kind='publish' AND (q->>'first_publish_free')::boolean THEN RETURN jsonb_build_object('ok',true,'free',true); END IF;
  IF _kind='chat' THEN
    IF q->>'plan'='free' AND (q->>'chats_today')::int>=100 THEN RETURN jsonb_build_object('ok',false,'reason','chat'); END IF;
  ELSE
    IF (q->>'daily_limit')::int>=0 AND (q->>'builds_today')::int+cost>(q->>'daily_limit')::int THEN RETURN jsonb_build_object('ok',false,'reason','daily'); END IF;
    IF (q->>'builds_month')::int+cost>(q->>'monthly_limit')::int THEN RETURN jsonb_build_object('ok',false,'reason','monthly'); END IF;
  END IF;
  INSERT INTO public.ai_usage(user_id,day,builds,chats) VALUES (uid,public.pk_today(),CASE WHEN _kind='chat' THEN 0 ELSE cost END,CASE WHEN _kind='chat' THEN 1 ELSE 0 END)
  ON CONFLICT (user_id,day) DO UPDATE SET builds=ai_usage.builds+EXCLUDED.builds, chats=ai_usage.chats+EXCLUDED.chats;
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.publish_allowance(_uid uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE used int; allowed int; created timestamptz; p text := public.plan_of(_uid);
BEGIN
  IF p='admin' THEN RETURN jsonb_build_object('used',0,'allowed',-1); END IF;
  IF p IN ('pro','pro_plus') THEN
    SELECT count(*) INTO used FROM public.project_publishes WHERE user_id=_uid AND first_published_at>=date_trunc('month',now());
    RETURN jsonb_build_object('used',used,'allowed',CASE WHEN p='pro' THEN 5 ELSE 10 END);
  END IF;
  SELECT created_at INTO created FROM auth.users WHERE id=_uid;
  allowed := 2 + GREATEST(0,(EXTRACT(year FROM age(now(),COALESCE(created,now())))*12+EXTRACT(month FROM age(now(),COALESCE(created,now()))))::int);
  SELECT count(*) INTO used FROM public.project_publishes WHERE user_id=_uid;
  RETURN jsonb_build_object('used',used,'allowed',allowed);
END $$;

GRANT EXECUTE ON FUNCTION public.plan_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_visit(uuid,text) TO anon, authenticated;