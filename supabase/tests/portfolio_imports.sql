-- Run after applying the migration. Synthetic fixtures are rolled back.
begin;
insert into auth.users(id, email) values
 ('f7000000-0000-4000-8000-000000000001', 'portfolio-one@example.invalid'),
 ('f7000000-0000-4000-8000-000000000002', 'portfolio-two@example.invalid');
insert into public.profiles(id, email) values
 ('f7000000-0000-4000-8000-000000000001', 'portfolio-one@example.invalid'),
 ('f7000000-0000-4000-8000-000000000002', 'portfolio-two@example.invalid');
insert into public.portfolio_import_drafts(id, user_id, original_values, source_hash, parser_version)
select ('f7000000-0000-4000-8000-' || lpad((10 + n)::text, 12, '0'))::uuid,
 'f7000000-0000-4000-8000-000000000001', '{}', repeat('a',64), 'test'
from generate_series(1,4) n;
update public.portfolio_import_drafts set expires_at = now() - interval '1 hour'
where id = 'f7000000-0000-4000-8000-000000000014';

do $$ begin
 if has_function_privilege('anon', 'public.confirm_portfolio_import(uuid,jsonb,uuid,boolean)', 'execute') then
  raise exception 'Anonymous execution must be denied.';
 end if;
 if (select prosecdef from pg_proc where oid = 'public.confirm_portfolio_import(uuid,jsonb,uuid,boolean)'::regprocedure) then
  raise exception 'RPC must use security invoker.';
 end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f7000000-0000-4000-8000-000000000001', true);
do $$
declare
 payload jsonb := '{"reportDate":"2026-10-10","currency":"EUR","cash":"0.60","positions":[{"name":"Synthetic fund","isin":"IE00B4L5Y983","quantity":"10.199032","price":"131.26","priceDate":"2026-10-09","value":"1338.67"}]}';
 v_saved_id uuid;
 original_revision uuid;
begin
 v_saved_id := public.confirm_portfolio_import('f7000000-0000-4000-8000-000000000011', payload, null, false);
 if public.confirm_portfolio_import('f7000000-0000-4000-8000-000000000011', payload, null, false) <> v_saved_id then
  raise exception 'Retry must be idempotent.';
 end if;
 if (select investments from public.portfolio_snapshots where id = v_saved_id) <> 1338.67
  or (select quantity from public.portfolio_positions where snapshot_id = v_saved_id) <> 10.199032 then
  raise exception 'Reported value and fractional units must be preserved.';
 end if;
 select revision into original_revision from public.portfolio_snapshots where id = v_saved_id;
 begin
  perform public.confirm_portfolio_import('f7000000-0000-4000-8000-000000000012', payload, null, true);
  raise exception 'Stale revision was accepted.';
 exception when serialization_failure then null; end;
 begin
  perform public.confirm_portfolio_import('f7000000-0000-4000-8000-000000000012', payload, original_revision, false);
  raise exception 'Replacement without acknowledgement was accepted.';
 exception when serialization_failure then null; end;
 perform public.confirm_portfolio_import('f7000000-0000-4000-8000-000000000012', jsonb_set(payload, '{positions}', '[]'), original_revision, true);
 if (select count(*) from public.portfolio_snapshots) <> 1
  or (select investments from public.portfolio_snapshots where id = v_saved_id) <> 0
  or exists(select 1 from public.portfolio_positions) then
  raise exception 'Replacement must remove old positions atomically.';
 end if;
 begin
  perform public.confirm_portfolio_import('f7000000-0000-4000-8000-000000000014', payload, null, false);
  raise exception 'Expired draft was accepted.';
 exception when no_data_found then null; end;
 begin
  perform public.confirm_portfolio_import('f7000000-0000-4000-8000-000000000013', jsonb_set(payload, '{positions,0,value}', '"NaN"'), original_revision, true);
  raise exception 'Invalid value was accepted.';
 exception when invalid_parameter_value then null; end;
end $$;
select set_config('request.jwt.claim.sub', 'f7000000-0000-4000-8000-000000000002', true);
do $$ begin
 if exists(select 1 from public.portfolio_snapshots) or exists(select 1 from public.portfolio_positions)
  or exists(select 1 from public.portfolio_import_drafts) then
  raise exception 'Other-owner data was readable.';
 end if;
 begin
  perform public.confirm_portfolio_import('f7000000-0000-4000-8000-000000000013', '{"currency":"EUR"}', null, false);
  raise exception 'Other-owner draft was accepted.';
 exception when no_data_found then null; end;
 begin
  insert into public.portfolio_import_drafts(user_id, original_values, source_hash, parser_version)
   values ('f7000000-0000-4000-8000-000000000001', '{}', repeat('a',64), 'test');
  raise exception 'Other-owner write was accepted.';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
