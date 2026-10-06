CREATE TABLE public.exam_retakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, exam_id)
);
GRANT SELECT ON public.exam_retakes TO anon, authenticated;
GRANT ALL ON public.exam_retakes TO service_role;
ALTER TABLE public.exam_retakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view retakes" ON public.exam_retakes FOR SELECT USING (true);
CREATE POLICY "Service role manages retakes" ON public.exam_retakes FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');