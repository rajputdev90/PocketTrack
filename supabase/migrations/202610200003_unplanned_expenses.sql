-- Add a user-controlled label for unexpected expenses.
-- Existing rows remain classified as planned; amounts and budget calculations are unchanged.
begin;

alter table public.transactions
  add column if not exists is_unplanned boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_unplanned_expense_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_unplanned_expense_check
      check (not is_unplanned or type = 'expense');
  end if;
end
$$;

commit;
