
-- ============ USER STATS (gamification core) ============
create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  streak_days integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  hearts integer not null default 5,
  hearts_updated_at timestamptz not null default now(),
  daily_goal integer not null default 30,
  daily_xp integer not null default 0,
  daily_xp_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

create policy "stats read own" on public.user_stats for select to authenticated using (user_id = auth.uid());
create policy "stats update own" on public.user_stats for update to authenticated using (user_id = auth.uid());
create policy "stats insert own" on public.user_stats for insert to authenticated with check (user_id = auth.uid());
-- public leaderboard read (only xp/level/streak, no PII)
create policy "stats public read" on public.user_stats for select to authenticated using (true);

-- auto-create stats on signup
create or replace function public.handle_new_user_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_stats (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_stats on auth.users;
create trigger on_auth_user_stats after insert on auth.users
  for each row execute function public.handle_new_user_stats();

-- backfill existing users
insert into public.user_stats (user_id)
select id from auth.users where id not in (select user_id from public.user_stats);

-- ============ LESSON PROGRESS ============
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null,
  module_id uuid not null,
  viewed_at timestamptz,
  completed_at timestamptz,
  best_score integer not null default 0,
  unique (user_id, lesson_id)
);
alter table public.lesson_progress enable row level security;
create policy "progress own" on public.lesson_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ ACHIEVEMENTS ============
create table public.achievements (
  id text primary key, -- 'first_lesson', 'streak_7', 'xp_1000'…
  title text not null,
  description text not null,
  emoji text not null default '🏆',
  xp_reward integer not null default 0,
  ord integer not null default 0
);
alter table public.achievements enable row level security;
create policy "ach public read" on public.achievements for select to authenticated using (true);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);
alter table public.user_achievements enable row level security;
create policy "ua read own" on public.user_achievements for select to authenticated using (user_id = auth.uid());
create policy "ua insert own" on public.user_achievements for insert to authenticated with check (user_id = auth.uid());

-- seed achievements
insert into public.achievements (id, title, description, emoji, xp_reward, ord) values
  ('first_lesson', 'Premier pas', 'Termine ta première leçon', '👶', 20, 1),
  ('streak_3', 'En route', '3 jours d''affilée', '🔥', 30, 2),
  ('streak_7', 'Une semaine !', '7 jours d''affilée', '🔥', 70, 3),
  ('streak_30', 'Inarrêtable', '30 jours d''affilée', '🌋', 300, 4),
  ('xp_100', 'Centenaire', '100 XP gagnés', '⭐', 0, 5),
  ('xp_500', 'Demi-mille', '500 XP gagnés', '💫', 0, 6),
  ('xp_1000', 'Mille XP', '1000 XP gagnés', '🌟', 0, 7),
  ('perfect_qcm', 'Sans faute', 'Un QCM 100% bon du premier coup', '🎯', 25, 8),
  ('combat_10', 'Combattant', '10 QCM réussis', '⚔️', 50, 9),
  ('combat_50', 'Vétéran', '50 QCM réussis', '🛡️', 200, 10),
  ('module_complete', 'Module maîtrisé', 'Toutes les leçons d''un module', '📚', 100, 11),
  ('ai_curious', 'Curieux', 'Pose 10 questions au tuteur IA', '🤖', 30, 12)
on conflict (id) do nothing;

-- ============ AWARD XP FUNCTION ============
create or replace function public.award_xp(_amount integer, _reason text default null)
returns table(new_xp integer, new_level integer, leveled_up boolean, new_streak integer)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _row public.user_stats;
  _old_level integer;
  _today date := current_date;
begin
  if _uid is null then raise exception 'not authenticated'; end if;

  insert into public.user_stats (user_id) values (_uid) on conflict do nothing;
  select * into _row from public.user_stats where user_id = _uid for update;
  _old_level := _row.level;

  -- daily xp reset
  if _row.daily_xp_date <> _today then
    _row.daily_xp := 0;
    _row.daily_xp_date := _today;
  end if;

  -- streak logic
  if _row.last_active_date is null or _row.last_active_date < _today - 1 then
    _row.streak_days := 1;
  elsif _row.last_active_date = _today - 1 then
    _row.streak_days := _row.streak_days + 1;
  end if; -- same day = no change

  _row.last_active_date := _today;
  if _row.streak_days > _row.longest_streak then _row.longest_streak := _row.streak_days; end if;

  _row.xp := _row.xp + greatest(_amount, 0);
  _row.daily_xp := _row.daily_xp + greatest(_amount, 0);
  -- level = floor(sqrt(xp/50)) + 1
  _row.level := greatest(1, floor(sqrt(_row.xp::numeric / 50.0))::int + 1);
  _row.updated_at := now();

  update public.user_stats set
    xp = _row.xp, level = _row.level, streak_days = _row.streak_days,
    longest_streak = _row.longest_streak, last_active_date = _row.last_active_date,
    daily_xp = _row.daily_xp, daily_xp_date = _row.daily_xp_date, updated_at = _row.updated_at
  where user_id = _uid;

  return query select _row.xp, _row.level, (_row.level > _old_level), _row.streak_days;
end $$;

-- ============ HEARTS ============
-- recharges 1 heart every 30 minutes up to 5
create or replace function public.refill_hearts_if_needed()
returns void language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _row public.user_stats;
  _mins integer;
  _gain integer;
begin
  if _uid is null then return; end if;
  insert into public.user_stats (user_id) values (_uid) on conflict do nothing;
  select * into _row from public.user_stats where user_id = _uid for update;
  if _row.hearts >= 5 then
    update public.user_stats set hearts_updated_at = now() where user_id = _uid;
    return;
  end if;
  _mins := extract(epoch from (now() - _row.hearts_updated_at))/60;
  _gain := floor(_mins / 30);
  if _gain > 0 then
    update public.user_stats
      set hearts = least(5, hearts + _gain), hearts_updated_at = hearts_updated_at + (_gain * interval '30 minutes')
      where user_id = _uid;
  end if;
end $$;

create or replace function public.consume_heart()
returns integer language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _h integer;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  perform public.refill_hearts_if_needed();
  update public.user_stats set hearts = greatest(0, hearts - 1),
    hearts_updated_at = case when hearts = 5 then now() else hearts_updated_at end
    where user_id = _uid
    returning hearts into _h;
  return _h;
end $$;
