CREATE TABLE public.project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT '',
  files jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.project_versions TO authenticated;
GRANT ALL ON public.project_versions TO service_role;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own versions" ON public.project_versions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own versions" ON public.project_versions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users delete own versions" ON public.project_versions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX project_versions_project_idx ON public.project_versions(project_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_published_project(_id uuid)
RETURNS TABLE(name text, description text, files jsonb, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.name, p.description, p.files, p.updated_at
  FROM public.projects p
  WHERE p.id = _id AND p.visibility = 'public'
$$;
REVOKE ALL ON FUNCTION public.get_published_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_project(uuid) TO anon, authenticated;