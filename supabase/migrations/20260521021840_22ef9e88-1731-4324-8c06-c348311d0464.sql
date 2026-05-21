
create extension if not exists "pg_trgm";

do $$ begin
  create type public.app_role as enum ('admin', 'student');
exception when duplicate_object then null; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles read own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles read own" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "user_roles admin all" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.years (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  ord int not null default 0
);
alter table public.years enable row level security;
create policy "years read all auth" on public.years for select to authenticated using (true);
create policy "years admin all" on public.years for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  year_id uuid references public.years(id) on delete set null,
  name text not null,
  emoji text default '📘',
  description text default '',
  learning_info text default '',
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.modules enable row level security;
create policy "modules read all auth" on public.modules for select to authenticated using (true);
create policy "modules admin all" on public.modules for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create index modules_name_trgm on public.modules using gin (name gin_trgm_ops);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  ord int not null default 0,
  full_text text not null default '',
  summary text not null default '',
  traps text default '',
  mini_case text default '',
  created_at timestamptz not null default now()
);
alter table public.lessons enable row level security;
create policy "lessons read all auth" on public.lessons for select to authenticated using (true);
create policy "lessons admin all" on public.lessons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.abbreviations (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  short text not null,
  full_form text not null,
  unique (module_id, short)
);
alter table public.abbreviations enable row level security;
create policy "abbr read all auth" on public.abbreviations for select to authenticated using (true);
create policy "abbr admin all" on public.abbreviations for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  source text not null default 'admin',
  stem text not null,
  ord int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.questions enable row level security;
create policy "questions read all auth" on public.questions for select to authenticated using (true);
create policy "questions admin all" on public.questions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  letter text not null,
  text text not null,
  is_correct boolean not null default false,
  explanation text not null default ''
);
alter table public.choices enable row level security;
create policy "choices read all auth" on public.choices for select to authenticated using (true);
create policy "choices admin all" on public.choices for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  chosen_letters text[] not null default '{}',
  correct boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.attempts enable row level security;
create policy "attempts read own" on public.attempts for select to authenticated using (user_id = auth.uid());
create policy "attempts insert own" on public.attempts for insert to authenticated with check (user_id = auth.uid());

create or replace function public.search_modules(q text, _year uuid default null)
returns table(id uuid, name text, emoji text, description text, year_id uuid, score real)
language sql stable security definer set search_path = public as $$
  select m.id, m.name, m.emoji, m.description, m.year_id,
         case when q is null or q = '' then 1.0 else similarity(m.name, q) end as score
  from public.modules m
  where m.published
    and (_year is null or m.year_id = _year)
    and (q is null or q = '' or m.name % q or m.name ilike '%' || q || '%')
  order by score desc, m.name asc
  limit 100;
$$;

insert into public.years (label, ord) values ('1ère année',1),('2ème année',2),('3ème année',3),('4ème année',4),('5ème année',5),('6ème année',6),('7ème année',7) on conflict do nothing;
