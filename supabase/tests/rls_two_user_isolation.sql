-- Run in the Supabase SQL Editor as the project owner.
-- Requires at least two Auth users. It creates one temporary test transaction,
-- switches to a second authenticated identity, checks read/update/delete, and
-- rolls the transaction back so neither account's data is changed.

begin;

do $$
begin
  if (select count(*) from auth.users) < 2 then
    raise exception 'Create/sign up a second test account before running this check.';
  end if;
end;
$$;

-- First (oldest) account owns a disposable marker row.
select set_config(
  'request.jwt.claim.sub',
  (select id::text from auth.users order by created_at asc, id asc limit 1),
  true
);
set local role authenticated;

with inserted as (
  insert into public.transactions (user_id, date, description, amount, type, category)
  values (auth.uid(), current_date, 'Temporary RLS isolation check', 1.00, 'expense', 'Other')
  returning id
)
select set_config('pockettrack.test_row_id', id::text, true) as temporary_test_row_id
from inserted;

reset role;

-- A different authenticated account should not see, update, or delete that row.
select set_config(
  'request.jwt.claim.sub',
  (select id::text from auth.users order by created_at desc, id desc limit 1),
  true
);
set local role authenticated;

select count(*) as visible_rows_expected_zero
from public.transactions
where id = current_setting('pockettrack.test_row_id')::uuid;

with changed as (
  update public.transactions
  set description = 'Unexpectedly updated by another account'
  where id = current_setting('pockettrack.test_row_id')::uuid
  returning id
)
select count(*) as updated_rows_expected_zero from changed;

with removed as (
  delete from public.transactions
  where id = current_setting('pockettrack.test_row_id')::uuid
  returning id
)
select count(*) as deleted_rows_expected_zero from removed;

reset role;
rollback;
