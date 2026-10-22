CREATE TABLE public.project_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  path text NOT NULL DEFAULT '',
  data text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.project_assets TO authenticated;
GRANT ALL ON public.project_assets TO service_role;
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
CREATE INDEX project_assets_project_idx ON public.project_assets(project_id);

CREATE POLICY "Owners read their project assets" ON public.project_assets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Owners add assets to their projects" ON public.project_assets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Owners delete their project assets" ON public.project_assets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS published_files jsonb,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_hash text;

CREATE OR REPLACE FUNCTION public.get_published_project(_id uuid)
 RETURNS TABLE(name text, description text, files jsonb, updated_at timestamp with time zone, sale_contact text, sale_price text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.name, p.description,
    COALESCE((
      SELECT jsonb_object_agg(f.key,
        CASE WHEN jsonb_typeof(f.value) = 'string' AND (f.value #>> '{}') LIKE 'nexora-asset:%'
          THEN COALESCE((SELECT to_jsonb(a.data) FROM public.project_assets a JOIN public.projects ap ON ap.id = a.project_id
                         WHERE a.id::text = substr(f.value #>> '{}', 14) AND ap.user_id = p.user_id), f.value)
          ELSE f.value END)
      FROM jsonb_each(COALESCE(p.published_files, p.files)) f
    ), '{}'::jsonb),
    COALESCE(p.published_at, p.updated_at), p.sale_contact, p.sale_price
  FROM public.projects p WHERE p.id = _id AND p.visibility = 'public'
$$;

CREATE OR REPLACE FUNCTION public.list_published_projects()
 RETURNS TABLE(id uuid, updated_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, COALESCE(p.published_at, p.updated_at) FROM public.projects p
  WHERE p.visibility = 'public' ORDER BY 2 DESC LIMIT 5000
$$;
GRANT EXECUTE ON FUNCTION public.get_published_project(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_published_projects() TO anon, authenticated;