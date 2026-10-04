-- Run after applying the migration. All synthetic fixtures are rolled back.
begin;

insert into auth.users (id, email) values
  ('f6000000-0000-4000-8000-000000000001', 'rpc-owner-one@example.invalid'),
  ('f6000000-0000-4000-8000-000000000002', 'rpc-owner-two@example.invalid');
insert into public.profiles (id, email) values
  ('f6000000-0000-4000-8000-000000000001', 'rpc-owner-one@example.invalid'),
  ('f6000000-0000-4000-8000-000000000002', 'rpc-owner-two@example.invalid');
insert into public.institutions (id, provider, provider_institution_id, name)
values ('f6000000-0000-4000-8000-000000000010', 'test', 'rpc-test', 'RPC test');
insert into public.bank_connections (id, user_id, institution_id, provider)
select
  ('f6000000-0000-4000-8000-' || lpad((20 + owner)::text, 12, '0'))::uuid,
  ('f6000000-0000-4000-8000-' || lpad(owner::text, 12, '0'))::uuid,
  'f6000000-0000-4000-8000-000000000010',
  'test'
from generate_series(1, 2) as owner;
insert into public.accounts (
  id, user_id, bank_connection_id, provider_account_id, name, currency
)
select
  ('f6000000-0000-4000-8000-' || lpad((30 + owner)::text, 12, '0'))::uuid,
  ('f6000000-0000-4000-8000-' || lpad(owner::text, 12, '0'))::uuid,
  ('f6000000-0000-4000-8000-' || lpad((20 + owner)::text, 12, '0'))::uuid,
  'rpc-test-' || owner,
  'RPC test account',
  'EUR'
from generate_series(1, 2) as owner;

with fixtures (suffix, owner, amount, reporting_date) as (
  values
    (101, 1, -100.000001, date '2026-01-01'),
    (102, 1, 100.000001, date '2026-12-01'),
    (103, 1, -75.000001, date '2026-01-01'),
    (104, 1, 75, date '2026-12-01'),
    (105, 1, -20, date '2026-01-01'),
    (106, 1, 10, date '2026-12-01'),
    (201, 2, -30, date '2026-01-01'),
    (202, 2, 30, date '2026-12-01')
)
insert into public.transactions (
  id, user_id, account_id, stable_import_key, identity_source, provider,
  booking_status, amount, currency, booking_date, reporting_date
)
select
  ('f6000000-0000-4000-8000-' || lpad(suffix::text, 12, '0'))::uuid,
  ('f6000000-0000-4000-8000-' || lpad(owner::text, 12, '0'))::uuid,
  ('f6000000-0000-4000-8000-' || lpad((30 + owner)::text, 12, '0'))::uuid,
  'rpc-test-' || suffix,
  'provider_transaction_id',
  'test',
  'booked',
  amount,
  'EUR',
  reporting_date,
  reporting_date
from fixtures;

with fixtures (suffix, owner, treatment) as (
  values (401, 1, 'none'), (402, 1, 'none'),
    (403, 1, 'neutralized'), (404, 2, 'none')
)
insert into public.transaction_reconciliations (
  id, user_id, kind, currency, difference_treatment
)
select
  ('f6000000-0000-4000-8000-' || lpad(suffix::text, 12, '0'))::uuid,
  ('f6000000-0000-4000-8000-' || lpad(owner::text, 12, '0'))::uuid,
  'debt', 'EUR', treatment
from fixtures;
with fixtures (suffix, owner, group_suffix, position) as (
  values (101, 1, 401, 0), (102, 1, 401, 1),
    (103, 1, 402, 0), (104, 1, 402, 1),
    (105, 1, 403, 0), (106, 1, 403, 1),
    (201, 2, 404, 0), (202, 2, 404, 1)
)
insert into public.transaction_reconciliation_items (
  user_id, reconciliation_id, transaction_id, position
)
select
  ('f6000000-0000-4000-8000-' || lpad(owner::text, 12, '0'))::uuid,
  ('f6000000-0000-4000-8000-' || lpad(group_suffix::text, 12, '0'))::uuid,
  ('f6000000-0000-4000-8000-' || lpad(suffix::text, 12, '0'))::uuid,
  position
from fixtures;

do $$
begin
  if has_function_privilege('anon',
    'public.get_transaction_reconciliation_states(uuid,uuid[])', 'execute') then
    raise exception 'Anonymous users must not execute the state RPC.';
  end if;
  if (select prosecdef or provolatile <> 's' from pg_proc
    where oid = 'public.get_transaction_reconciliation_states(uuid,uuid[])'::regprocedure) then
    raise exception 'The state RPC must be stable and security invoker.';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f6000000-0000-4000-8000-000000000001', true);
do $$
declare
  owner_id uuid := 'f6000000-0000-4000-8000-000000000001';
  states jsonb;
  state_count integer;
begin
  select count(*), jsonb_object_agg(transaction_id::text, to_jsonb(state))
  into state_count, states
  from public.get_transaction_reconciliation_states(owner_id, array[
    'f6000000-0000-4000-8000-000000000101'::uuid,
    'f6000000-0000-4000-8000-000000000101'::uuid,
    'f6000000-0000-4000-8000-000000000103'::uuid,
    'f6000000-0000-4000-8000-000000000105'::uuid,
    'f6000000-0000-4000-8000-000000000201'::uuid,
    'f6000000-0000-4000-8000-000000000999'::uuid
  ]) as state;
  if states is null or state_count <> 3 then
    raise exception 'Return only requested owned memberships, without duplicates.';
  end if;
  if (states -> 'f6000000-0000-4000-8000-000000000101' ->> 'requires_review')::boolean
    is distinct from false then
    raise exception 'Balance must include the unrequested December counterpart exactly.';
  end if;
  if (states -> 'f6000000-0000-4000-8000-000000000103' ->> 'requires_review')::boolean
    is distinct from true then
    raise exception 'A one-millionth drift must require review.';
  end if;
  if (states -> 'f6000000-0000-4000-8000-000000000105' ->> 'requires_review')::boolean
    is distinct from false then
    raise exception 'Neutralized nonzero groups must not require review.';
  end if;
  if exists (select 1 from public.get_transaction_reconciliation_states(owner_id, null))
    or exists (select 1 from public.get_transaction_reconciliation_states(owner_id, '{}'::uuid[])) then
    raise exception 'Null and empty ID sets must return no memberships.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'f6000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists (select 1 from public.get_transaction_reconciliation_states(
    'f6000000-0000-4000-8000-000000000001',
    array['f6000000-0000-4000-8000-000000000101'::uuid])) then
    raise exception 'A caller cannot read another owner even with known IDs.';
  end if;
  if (select count(*) from public.get_transaction_reconciliation_states(
    'f6000000-0000-4000-8000-000000000002',
    array['f6000000-0000-4000-8000-000000000201'::uuid])) <> 1 then
    raise exception 'The second owner must still be able to read their own state.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
do $$
begin
  if exists (select 1 from public.get_transaction_reconciliation_states(
    'f6000000-0000-4000-8000-000000000001',
    array['f6000000-0000-4000-8000-000000000101'::uuid])) then
    raise exception 'Missing authentication must not expose any membership.';
  end if;
end;
$$;

reset role;
rollback;
select 'Reconciliation state SQL checks passed; all fixtures rolled back.' as result;
