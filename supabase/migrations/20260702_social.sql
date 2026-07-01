-- ============================================================
-- SOCIAL FEATURES - Profs, Étudiants, Services
-- ============================================================

-- 1. RÔLES ÉTENDUS
-- Ajouter des rôles plus précis
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'professor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tutor';

-- 2. PROFILS ENRICHIS
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_professor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_tutor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS specialization TEXT,
ADD COLUMN IF NOT EXISTS institution TEXT,
ADD COLUMN IF NOT EXISTS years_experience INTEGER,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 3. SERVICES DES ÉTUDIANTS (résumés, cours particuliers)
CREATE TABLE IF NOT EXISTS public.student_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('summary', 'tutoring', 'notes', 'flashcards')),
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  price DECIMAL(10,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT TRUE,
  file_url TEXT,
  thumbnail_url TEXT,
  tags TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  views_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.student_services TO authenticated;
GRANT ALL ON public.student_services TO service_role;
ALTER TABLE public.student_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read published services" ON public.student_services
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY "user can manage own services" ON public.student_services
  FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin can manage all services" ON public.student_services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_student_services_status ON public.student_services(status);
CREATE INDEX idx_student_services_type ON public.student_services(type);
CREATE INDEX idx_student_services_module ON public.student_services(module_id);

-- 4. COURS DES PROFESSEURS
CREATE TABLE IF NOT EXISTS public.professor_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all')),
  price DECIMAL(10,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT TRUE,
  thumbnail_url TEXT,
  video_url TEXT,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  tags TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  views_count INTEGER DEFAULT 0,
  students_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.professor_courses TO authenticated;
GRANT ALL ON public.professor_courses TO service_role;
ALTER TABLE public.professor_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read published courses" ON public.professor_courses
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY "professors can manage own courses" ON public.professor_courses
  FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin can manage all courses" ON public.professor_courses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_professor_courses_status ON public.professor_courses(status);
CREATE INDEX idx_professor_courses_level ON public.professor_courses(level);

-- 5. EXAMENS BLANCS AVEC CHRONO
CREATE TABLE IF NOT EXISTS public.mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_questions INTEGER NOT NULL DEFAULT 0,
  passing_score INTEGER DEFAULT 60,
  is_free BOOLEAN DEFAULT TRUE,
  price DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  attempts_count INTEGER DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mock_exams TO authenticated;
GRANT ALL ON public.mock_exams TO service_role;
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read published exams" ON public.mock_exams
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY "professors can manage own exams" ON public.mock_exams
  FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin can manage all exams" ON public.mock_exams
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_mock_exams_status ON public.mock_exams(status);
CREATE INDEX idx_mock_exams_module ON public.mock_exams(module_id);

-- 6. QUESTIONS D'EXAMEN BLANC
CREATE TABLE IF NOT EXISTS public.mock_exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  ord INTEGER NOT NULL DEFAULT 0,
  points INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mock_exam_questions TO authenticated;
GRANT ALL ON public.mock_exam_questions TO service_role;
ALTER TABLE public.mock_exam_questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_mock_exam_questions_exam ON public.mock_exam_questions(exam_id);

-- 7. TENTATIVES D'EXAMEN BLANC
CREATE TABLE IF NOT EXISTS public.mock_exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  answers JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mock_exam_attempts TO authenticated;
GRANT ALL ON public.mock_exam_attempts TO service_role;
ALTER TABLE public.mock_exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own attempts" ON public.mock_exam_attempts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users can create own attempts" ON public.mock_exam_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users can update own attempts" ON public.mock_exam_attempts
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_mock_exam_attempts_exam ON public.mock_exam_attempts(exam_id);
CREATE INDEX idx_mock_exam_attempts_user ON public.mock_exam_attempts(user_id);

-- 8. SUIVI (FOLLOW)
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can see follows" ON public.follows
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users can manage own follows" ON public.follows
  FOR ALL TO authenticated USING (follower_id = auth.uid());

CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

-- 9. REVIEWS / NOTES
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID, -- peut être student_services.id ou professor_courses.id
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read reviews" ON public.reviews
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users can create reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());

CREATE INDEX idx_reviews_target ON public.reviews(target_id);
CREATE INDEX idx_reviews_service ON public.reviews(service_id);