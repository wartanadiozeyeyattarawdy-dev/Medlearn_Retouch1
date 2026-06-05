
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'duo-green',
  ADD COLUMN IF NOT EXISTS public_profile boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS avatar_emoji text NOT NULL DEFAULT '🧠',
  ADD COLUMN IF NOT EXISTS bio text;

DROP POLICY IF EXISTS "profiles read own" ON public.profiles;
CREATE POLICY "profiles read public or own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public_profile = true OR id = auth.uid());
