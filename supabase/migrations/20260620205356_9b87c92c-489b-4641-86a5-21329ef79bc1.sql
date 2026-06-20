
-- 1. question_reports
CREATE TABLE public.question_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reward_given boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.question_reports TO authenticated;
GRANT ALL ON public.question_reports TO service_role;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user can read own reports" ON public.question_reports FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user can create own reports" ON public.question_reports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin can update reports" ON public.question_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_question_reports_status ON public.question_reports(status);
CREATE INDEX idx_question_reports_user ON public.question_reports(user_id);

-- 2. subscription_plans
CREATE TABLE public.subscription_plans (
  id text PRIMARY KEY,
  label text NOT NULL,
  price_mad integer NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'month' CHECK (period IN ('free','month','year')),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  hearts_max integer NOT NULL DEFAULT 5,
  ai_qcm_per_day integer NOT NULL DEFAULT 10,
  ord integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO authenticated, anon;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read plans" ON public.subscription_plans FOR SELECT USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin can manage plans" ON public.subscription_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. user_subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own sub" ON public.user_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manages subs" ON public.user_subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_user_subscriptions_user ON public.user_subscriptions(user_id);

-- 4. user_stats additions for hearts system
ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS hearts_max integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS activity_minutes_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activity_date date,
  ADD COLUMN IF NOT EXISTS bonus_hearts_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_ping timestamptz;

-- 5. ping_activity: called every ~60s by the app while user is active
CREATE OR REPLACE FUNCTION public.ping_activity()
RETURNS TABLE(hearts integer, hearts_max integer, activity_minutes integer, awarded integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.user_stats;
  _today date := current_date;
  _gain integer := 0;
  _prev_threshold integer;
  _new_threshold integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.user_stats (user_id) VALUES (_uid) ON CONFLICT DO NOTHING;
  SELECT * INTO _row FROM public.user_stats WHERE user_id = _uid FOR UPDATE;

  -- daily reset
  IF _row.activity_date IS NULL OR _row.activity_date <> _today THEN
    _row.activity_minutes_today := 0;
    _row.activity_date := _today;
  END IF;

  -- only count if at least 30s since last ping (anti-spam)
  IF _row.last_activity_ping IS NULL OR _row.last_activity_ping < now() - interval '30 seconds' THEN
    _prev_threshold := _row.activity_minutes_today / 30;
    _row.activity_minutes_today := _row.activity_minutes_today + 1;
    _new_threshold := _row.activity_minutes_today / 30;
    _gain := GREATEST(0, _new_threshold - _prev_threshold);
    IF _gain > 0 AND _row.hearts < _row.hearts_max THEN
      _row.hearts := LEAST(_row.hearts_max, _row.hearts + _gain);
    END IF;
    _row.last_activity_ping := now();
  END IF;

  UPDATE public.user_stats SET
    hearts = _row.hearts,
    activity_minutes_today = _row.activity_minutes_today,
    activity_date = _row.activity_date,
    last_activity_ping = _row.last_activity_ping,
    updated_at = now()
  WHERE user_id = _uid;

  RETURN QUERY SELECT _row.hearts, _row.hearts_max, _row.activity_minutes_today, _gain;
END $$;

-- 6. award_bonus_hearts: admin uses when validating a report
CREATE OR REPLACE FUNCTION public.award_bonus_hearts(_user_id uuid, _amount integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _new_hearts integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin requis'; END IF;
  INSERT INTO public.user_stats (user_id) VALUES (_user_id) ON CONFLICT DO NOTHING;
  UPDATE public.user_stats
    SET hearts = LEAST(hearts_max, hearts + GREATEST(_amount, 0)),
        bonus_hearts_total = bonus_hearts_total + GREATEST(_amount, 0),
        updated_at = now()
    WHERE user_id = _user_id
    RETURNING hearts INTO _new_hearts;
  RETURN _new_hearts;
END $$;

-- 7. seed plans
INSERT INTO public.subscription_plans (id, label, price_mad, period, features, hearts_max, ai_qcm_per_day, ord)
VALUES
  ('free','Gratuit',0,'free','["Accès aux modules publics","5 cœurs max","10 QCM IA / jour"]'::jsonb,5,10,0),
  ('premium_month','Premium mensuel',49,'month','["Tous les modules","Cœurs illimités (50 max)","QCM IA illimités","Tuteur Lens sans limite","Statistiques avancées"]'::jsonb,50,9999,1),
  ('premium_year','Premium annuel',399,'year','["Tout du Premium mensuel","2 mois offerts","Badge supporter"]'::jsonb,50,9999,2)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, price_mad = EXCLUDED.price_mad, features = EXCLUDED.features, hearts_max = EXCLUDED.hearts_max;
