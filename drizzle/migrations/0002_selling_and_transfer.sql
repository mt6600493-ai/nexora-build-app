ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sale_contact text NOT NULL DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sale_price text NOT NULL DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_domain text NOT NULL DEFAULT '';

DROP FUNCTION IF EXISTS public.get_published_project(uuid);
CREATE FUNCTION public.get_published_project(_id uuid)
RETURNS TABLE(name text, description text, files jsonb, updated_at timestamptz, sale_contact text, sale_price text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.name, p.description, p.files, p.updated_at, p.sale_contact, p.sale_price
  FROM public.projects p WHERE p.id = _id AND p.visibility = 'public'
$$;
GRANT EXECUTE ON FUNCTION public.get_published_project(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.transfer_project(_id uuid, _email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = _id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You can only transfer your own projects';
  END IF;
  SELECT id INTO target FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF target IS NULL THEN RAISE EXCEPTION 'No Nexora account uses that email. Ask the buyer to sign up first.'; END IF;
  IF target = auth.uid() THEN RAISE EXCEPTION 'That is your own email'; END IF;
  UPDATE public.projects SET user_id = target, visibility = 'private', updated_at = now() WHERE id = _id;
  DELETE FROM public.project_versions WHERE project_id = _id;
END $$;
REVOKE ALL ON FUNCTION public.transfer_project(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.transfer_project(uuid, text) TO authenticated;