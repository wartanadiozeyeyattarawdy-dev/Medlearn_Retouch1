-- ============================================================
-- AI LIMITS - Tables et fonctions
-- ============================================================

-- 1. AI USAGE (suivi des requêtes)
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  requests_count INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

GRANT SELECT, INSERT, UPDATE ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own ai usage" ON public.ai_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user insert own ai usage" ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user update own ai usage" ON public.ai_usage
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_ai_usage_user_date ON public.ai_usage(user_id, date);

-- 2. Fonction pour vérifier si l'utilisateur peut utiliser l'IA
CREATE OR REPLACE FUNCTION public.check_ai_limit(p_user_id UUID)
RETURNS TABLE(can_use BOOLEAN, daily_limit INTEGER, used_today INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan_id TEXT;
  v_limit INTEGER;
  v_used INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Récupérer le plan actif de l'utilisateur
  SELECT plan_id INTO v_plan_id
  FROM public.user_subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
  END IF;

  -- Récupérer la limite du plan
  SELECT ai_qcm_per_day INTO v_limit
  FROM public.subscription_plans
  WHERE id = v_plan_id;

  v_limit := COALESCE(v_limit, 10);

  -- Récupérer l'utilisation du jour
  SELECT requests_count INTO v_used
  FROM public.ai_usage
  WHERE user_id = p_user_id AND date = v_today;

  v_used := COALESCE(v_used, 0);

  RETURN QUERY SELECT
    (v_used < v_limit) AS can_use,
    v_limit AS daily_limit,
    v_used AS used_today;
END $$;

-- 3. Fonction pour incrémenter l'utilisation
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id UUID,
  p_tokens INTEGER DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_new_count INTEGER;
BEGIN
  INSERT INTO public.ai_usage (user_id, date, requests_count, tokens_used)
  VALUES (p_user_id, v_today, 1, p_tokens)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    requests_count = ai_usage.requests_count + 1,
    tokens_used = ai_usage.tokens_used + p_tokens,
    updated_at = now()
  RETURNING requests_count INTO v_new_count;

  RETURN v_new_count;
END $$;

-- 4. Vue pour les stats d'utilisation
CREATE OR REPLACE VIEW public.ai_usage_stats AS
SELECT
  u.user_id,
  p.full_name,
  u.date,
  u.requests_count,
  u.tokens_used,
  sp.label AS plan_label,
  sp.ai_qcm_per_day AS daily_limit
FROM public.ai_usage u
LEFT JOIN public.profiles p ON p.id = u.user_id
LEFT JOIN public.user_subscriptions us ON us.user_id = u.user_id AND us.status = 'active'
LEFT JOIN public.subscription_plans sp ON sp.id = us.plan_id
ORDER BY u.date DESC, u.requests_count DESC;

GRANT SELECT ON public.ai_usage_stats TO authenticated;