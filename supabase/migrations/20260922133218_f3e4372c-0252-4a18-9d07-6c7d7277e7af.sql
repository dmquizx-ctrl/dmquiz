CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  class TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  curriculum TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  semester TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  subject_category TEXT NOT NULL DEFAULT 'อื่น ๆ',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject_code, academic_year, semester)
);

CREATE INDEX subjects_subject_category_idx ON public.subjects(subject_category);
CREATE INDEX subjects_grade_level_idx ON public.subjects(grade_level);

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  option_count INTEGER DEFAULT 4 CHECK (option_count IN (3, 4)),
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  image_path TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 10,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  unlock_note TEXT,
  subject_id UUID REFERENCES public.subjects(id),
  teacher_id UUID REFERENCES public.teachers(id),
  created_by UUID REFERENCES public.admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  UNIQUE(exam_id, question_id)
);

CREATE TABLE public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  total_questions INTEGER NOT NULL,
  answers JSONB NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_student_id ON public.students(student_id);
CREATE INDEX idx_exam_results_student_id ON public.exam_results(student_id);
CREATE INDEX idx_exam_results_exam_id ON public.exam_results(exam_id);
CREATE INDEX idx_exam_questions_exam_id ON public.exam_questions(exam_id);

GRANT SELECT ON public.students TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO anon, authenticated;
GRANT SELECT ON public.exams TO anon, authenticated;
GRANT SELECT ON public.exam_questions TO anon, authenticated;
GRANT SELECT ON public.exam_results TO anon, authenticated;
GRANT ALL ON public.admins, public.students, public.teachers, public.subjects, public.questions, public.exams, public.exam_questions, public.exam_results TO service_role;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage admins" ON public.admins FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage students" ON public.students FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Anyone can view students" ON public.students FOR SELECT USING (true);

CREATE POLICY "Anyone can view teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert teachers" ON public.teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update teachers" ON public.teachers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete teachers" ON public.teachers FOR DELETE USING (true);

CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert subjects" ON public.subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update subjects" ON public.subjects FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete subjects" ON public.subjects FOR DELETE USING (true);

CREATE POLICY "Anyone can view questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert questions" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update questions" ON public.questions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete questions" ON public.questions FOR DELETE USING (true);

CREATE POLICY "Anyone can view active exams" ON public.exams FOR SELECT USING (is_active = true);
CREATE POLICY "Service role can manage exams" ON public.exams FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anyone can view exam questions" ON public.exam_questions FOR SELECT USING (true);
CREATE POLICY "Service role can manage exam questions" ON public.exam_questions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anyone can view exam results" ON public.exam_results FOR SELECT USING (true);
CREATE POLICY "Service role can manage exam results" ON public.exam_results FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.generate_exam_questions(
  p_exam_id uuid,
  p_question_count integer,
  p_subject_id uuid DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM exam_questions WHERE exam_id = p_exam_id;

  INSERT INTO exam_questions (exam_id, question_id, question_order)
  SELECT
    p_exam_id,
    id,
    ROW_NUMBER() OVER (ORDER BY RANDOM()) as question_order
  FROM questions
  WHERE
    (p_subject_id IS NULL OR subject_id = p_subject_id)
    AND (p_teacher_id IS NULL OR teacher_id = p_teacher_id)
  ORDER BY RANDOM()
  LIMIT p_question_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_exam_questions(uuid, integer, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_exam_questions(uuid, integer, uuid, uuid) TO service_role;