ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS teacher_note text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS video_url text;