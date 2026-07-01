-- ============================================================
-- TABLES DE PAIEMENT
-- ============================================================

-- 1. BANK TRANSFERS (virements bancaires)
CREATE TABLE IF NOT EXISTS public.bank_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  reference TEXT,
  admin_note TEXT,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bank_transfers TO authenticated;
GRANT ALL ON public.bank_transfers TO service_role;
ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own transfers" ON public.bank_transfers
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user create own transfers" ON public.bank_transfers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin manage transfers" ON public.bank_transfers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_bank_transfers_status ON public.bank_transfers(status);
CREATE INDEX idx_bank_transfers_user ON public.bank_transfers(user_id);

-- 2. CARD PAYMENTS (paiements par carte)
CREATE TABLE IF NOT EXISTS public.card_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_id TEXT, -- ID de la transaction PayZone
  payment_method TEXT,
  card_last4 TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.card_payments TO authenticated;
GRANT ALL ON public.card_payments TO service_role;
ALTER TABLE public.card_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own card payments" ON public.card_payments
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user create own card payments" ON public.card_payments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin manage card payments" ON public.card_payments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_card_payments_status ON public.card_payments(status);
CREATE INDEX idx_card_payments_user ON public.card_payments(user_id);

-- 3. AI USAGE (suivi des limites)
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
CREATE POLICY "user update own ai usage" ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin manage ai usage" ON public.ai_usage
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_ai_usage_user_date ON public.ai_usage(user_id, date);

-- 4. Fonction pour vérifier les limites IA
CREATE OR REPLACE FUNCTION public.check_ai_limit(p_user_id UUID, p_plan_id TEXT DEFAULT NULL)
RETURNS TABLE(can_use BOOLEAN, daily_limit INTEGER, used_today INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan_id TEXT;
  v_limit INTEGER;
  v_used INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Récupérer le plan de l'utilisateur
  IF p_plan_id IS NULL THEN
    SELECT plan_id INTO v_plan_id
    FROM public.user_subscriptions
    WHERE user_id = p_user_id AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1;
  ELSE
    v_plan_id := p_plan_id;
  END IF;

  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
  END IF;

  -- Récupérer la limite du plan
  SELECT ai_qcm_per_day INTO v_limit
  FROM public.subscription_plans
  WHERE id = v_plan_id;

  IF v_limit IS NULL THEN
    v_limit := 10;
  END IF;

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

-- 5. Fonction pour incrémenter l'utilisation IA
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id UUID, p_tokens INTEGER DEFAULT 0)
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

-- 6. Vue pour le chiffre d'affaires
CREATE OR REPLACE VIEW public.revenue_summary AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  SUM(amount) AS total_amount,
  COUNT(*) AS total_payments,
  COUNT(*) FILTER (WHERE status = 'succeeded') AS successful_payments
FROM public.card_payments
WHERE status IN ('succeeded', 'pending')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

GRANT SELECT ON public.revenue_summary TO authenticated;