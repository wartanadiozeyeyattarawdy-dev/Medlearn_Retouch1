ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS resource_url text;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS audio_url text;