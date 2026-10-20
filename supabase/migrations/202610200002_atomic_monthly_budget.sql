-- Keep the overall and category-level budget changes in one database transaction.
create or replace function public.replace_monthly_budget(
  p_budget_id uuid,
  p_month text,
  p_total numeric,
  p_categories jsonb,
  p_category_budgets jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then
    raise exception 'Authentication required';
  end if;
  if p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Invalid budget month';
  end if;
  if p_budget_id is null or p_total is null or p_total < 0 then
    raise exception 'Invalid overall budget';
  end if;
  if jsonb_typeof(p_categories) is distinct from 'object'
    or jsonb_typeof(p_category_budgets) is distinct from 'array' then
    raise exception 'Invalid category budget data';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_category_budgets) as entries(item)
    left join public.categories c on c.id = (item->>'category_id')::uuid
    where c.id is null
      or c.applies_to <> 'expense'
      or (c.user_id is not null and c.user_id <> owner_id)
      or coalesce(item->>'amount', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
      or (item->>'amount')::numeric < 0
  ) then
    raise exception 'A category budget is invalid or references an unavailable category';
  end if;

  insert into public.budgets (id, user_id, month, total, categories)
  values (p_budget_id, owner_id, p_month, p_total, p_categories)
  on conflict (user_id, month) do update
    set total = excluded.total,
        categories = excluded.categories,
        updated_at = now();

  delete from public.category_budgets
  where user_id = owner_id and month = p_month;

  insert into public.category_budgets (user_id, month, category_id, amount)
  select owner_id, p_month, (item->>'category_id')::uuid, (item->>'amount')::numeric
  from jsonb_array_elements(p_category_budgets) as entries(item);
end;
$$;

revoke all on function public.replace_monthly_budget(uuid, text, numeric, jsonb, jsonb) from public, anon;
grant execute on function public.replace_monthly_budget(uuid, text, numeric, jsonb, jsonb) to authenticated;
