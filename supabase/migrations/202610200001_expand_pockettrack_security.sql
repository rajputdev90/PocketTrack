-- Additive PocketTrack schema expansion. Preserves existing rows and tables.
-- Apply after 202610190001_pockettrack_core.sql.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  preferred_currency text not null default 'INR' check (char_length(preferred_currency) = 3),
  theme text not null default 'light' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  applies_to text not null check (applies_to in ('income', 'expense', 'transfer')),
  icon text,
  color text,
  created_at timestamptz not null default now()
);
create unique index if not exists categories_default_name_type_idx
  on public.categories (lower(name), applies_to) where user_id is null;
create unique index if not exists categories_user_name_type_idx
  on public.categories (user_id, lower(name), applies_to) where user_id is not null;

insert into public.categories (user_id, name, applies_to)
select null, seed.name, seed.applies_to
from (values
  ('Food', 'expense'), ('Travel', 'expense'), ('Education', 'expense'),
  ('Shopping', 'expense'), ('Entertainment', 'expense'), ('Bills', 'expense'),
  ('Health', 'expense'), ('Subscriptions', 'expense'), ('Salary', 'income'),
  ('Pocket money', 'income'), ('Gifts', 'income'), ('Other', 'expense'),
  ('Other', 'income'), ('Transfer', 'transfer')
) as seed(name, applies_to)
where not exists (
  select 1 from public.categories c
  where c.user_id is null and lower(c.name) = lower(seed.name)
    and c.applies_to = seed.applies_to
);

alter table public.transactions add column if not exists category_id uuid;
alter table public.transactions add column if not exists transfer_reference uuid;
alter table public.transactions add column if not exists updated_at timestamptz not null default now();
alter table public.budgets add column if not exists notes text;
alter table public.budgets add column if not exists created_at timestamptz not null default now();
alter table public.budgets add column if not exists updated_at timestamptz not null default now();
alter table public.savings_sources add column if not exists updated_at timestamptz not null default now();
alter table public.savings_events add column if not exists target_source_id uuid;
alter table public.savings_events add column if not exists updated_at timestamptz not null default now();
alter table public.goals add column if not exists updated_at timestamptz not null default now();

create table if not exists public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month, category_id)
);

create table if not exists public.savings_valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.savings_sources(id) on delete restrict,
  valued_on date not null,
  value numeric(14,2) not null check (value >= 0),
  notes text,
  created_at timestamptz not null default now()
);

-- A composite key lets foreign keys enforce that referenced sources share the row owner.
create unique index if not exists savings_sources_id_owner_idx
  on public.savings_sources (id, user_id);
create index if not exists transactions_owner_category_date_idx
  on public.transactions (user_id, category_id, date desc);
create index if not exists category_budgets_owner_month_idx
  on public.category_budgets (user_id, month);
create index if not exists savings_valuations_owner_source_date_idx
  on public.savings_valuations (user_id, source_id, valued_on desc);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_category_id_fkey') then
    alter table public.transactions add constraint transactions_category_id_fkey
      foreign key (category_id) references public.categories(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_source_owner_fkey') then
    alter table public.transactions add constraint transactions_source_owner_fkey
      foreign key (source_id, user_id) references public.savings_sources(id, user_id)
      on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'savings_events_source_owner_fkey') then
    alter table public.savings_events add constraint savings_events_source_owner_fkey
      foreign key (source_id, user_id) references public.savings_sources(id, user_id)
      on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'savings_events_target_owner_fkey') then
    alter table public.savings_events add constraint savings_events_target_owner_fkey
      foreign key (target_source_id, user_id) references public.savings_sources(id, user_id)
      on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'savings_valuations_source_owner_fkey') then
    alter table public.savings_valuations add constraint savings_valuations_source_owner_fkey
      foreign key (source_id, user_id) references public.savings_sources(id, user_id)
      on delete restrict not valid;
  end if;
end $$;

-- NOT VALID preserves legacy rows while enforcing the rule for new and changed rows.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'savings_events_transfer_pair_check') then
    alter table public.savings_events add constraint savings_events_transfer_pair_check
      check (
        (kind = 'transfer' and target_source_id is not null and target_source_id <> source_id)
        or (kind <> 'transfer' and target_source_id is null)
      ) not valid;
  end if;
end $$;

alter table public.savings_events drop constraint if exists savings_events_kind_check;
alter table public.savings_events add constraint savings_events_kind_check
  check (kind in ('contribution', 'withdrawal', 'valuation', 'transfer', 'opening_adjustment', 'correction'));

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.category_budgets enable row level security;
alter table public.savings_valuations enable row level security;

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists categories_read_defaults_or_own on public.categories;
create policy categories_read_defaults_or_own on public.categories
  for select using (user_id is null or user_id = auth.uid());
drop policy if exists categories_manage_own on public.categories;
create policy categories_manage_own on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists category_budgets_owner_all on public.category_budgets;
create policy category_budgets_owner_all on public.category_budgets
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.categories c
      where c.id = category_id and c.applies_to = 'expense'
        and (c.user_id is null or c.user_id = auth.uid())
    )
  );

drop policy if exists savings_valuations_owner_all on public.savings_valuations;
create policy savings_valuations_owner_all on public.savings_valuations
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.savings_sources s where s.id = source_id and s.user_id = auth.uid())
  );

-- Transaction category references may point only to a shared default or the user's own category.
drop policy if exists "Users can manage their own transactions" on public.transactions;
create policy "Users can manage their own transactions" on public.transactions
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (category_id is null or exists (
      select 1 from public.categories c
      where c.id = category_id and c.applies_to = type
        and (c.user_id is null or c.user_id = auth.uid())
    ))
  );

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['profiles','transactions','budgets','category_budgets','savings_sources','savings_events','goals'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

grant select, insert, update, delete on public.profiles, public.categories,
  public.transactions, public.budgets, public.category_budgets,
  public.savings_sources, public.savings_events, public.savings_valuations,
  public.goals to authenticated;
grant select on public.categories to anon;

commit;
