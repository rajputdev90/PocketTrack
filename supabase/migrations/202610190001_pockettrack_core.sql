-- PocketTrack core schema. Apply to a new Supabase project after reviewing.
create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, description text not null check (char_length(description) between 1 and 120),
  amount numeric(14,2) not null check (amount > 0), type text not null check (type in ('income','expense','transfer')),
  category text not null, payment_method text, notes text, source_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.savings_sources (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60), type text not null,
  opening_balance numeric(14,2) not null default 0 check (opening_balance >= 0), target numeric(14,2), notes text,
  archived boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.savings_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.savings_sources(id) on delete restrict,
  date date not null, kind text not null check (kind in ('contribution','withdrawal','valuation','transfer')),
  amount numeric(14,2) not null check (kind = 'valuation' or amount >= 0), notes text, created_at timestamptz not null default now()
);
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100), target numeric(14,2) not null check (target > 0),
  current numeric(14,2) not null default 0 check (current >= 0), target_date date,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  notes text, status text not null default 'active' check (status in ('active','paused','completed','archived')),
  source_id uuid references public.savings_sources(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'), total numeric(14,2) not null check (total >= 0),
  categories jsonb not null default '{}'::jsonb, unique(user_id, month)
);

do $$ declare t text; begin
  foreach t in array array['transactions','savings_sources','savings_events','goals','budgets'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists "Users can manage their own %I" on public.%I',t,t);
    execute format('create policy "Users can manage their own %I" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',t,t);
  end loop;
end $$;

create index if not exists transactions_owner_date_idx on public.transactions(user_id,date desc);
create index if not exists savings_events_owner_date_idx on public.savings_events(user_id,date desc);
create index if not exists goals_owner_status_idx on public.goals(user_id,status);

-- Cross-table ownership checks prevent a user from linking their row to another user's source.
drop policy if exists "Users can manage their own savings_events" on public.savings_events;
create policy "Users can manage their own savings_events" on public.savings_events
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from public.savings_sources s where s.id = source_id and s.user_id = auth.uid()));
drop policy if exists "Users can manage their own goals" on public.goals;
create policy "Users can manage their own goals" on public.goals
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and (source_id is null or exists (select 1 from public.savings_sources s where s.id = source_id and s.user_id = auth.uid())));
