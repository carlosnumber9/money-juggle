-- Synthetic ownership and provenance fixtures; always rolled back.
begin;
insert into auth.users(id, email) values
 ('f8000000-0000-4000-8000-000000000001', 'rules-one@example.invalid'),
 ('f8000000-0000-4000-8000-000000000002', 'rules-two@example.invalid');
insert into public.profiles(id, email) values
 ('f8000000-0000-4000-8000-000000000001', 'rules-one@example.invalid'),
 ('f8000000-0000-4000-8000-000000000002', 'rules-two@example.invalid');
insert into public.transaction_category_groups(id,user_id,name,slug) values
 ('f8000000-0000-4000-8000-000000000010','f8000000-0000-4000-8000-000000000001','Test','test'),
 ('f8000000-0000-4000-8000-000000000020','f8000000-0000-4000-8000-000000000002','Test','test');
insert into public.transaction_categories(id,user_id,group_id,name,slug) values
 ('f8000000-0000-4000-8000-000000000011','f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000010','Test','test'),
 ('f8000000-0000-4000-8000-000000000021','f8000000-0000-4000-8000-000000000002','f8000000-0000-4000-8000-000000000020','Test','test');
set local role authenticated;
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000001',true);
insert into public.category_rules(id,user_id,category_id,field,operator,value,currency,direction,status) values
 ('f8000000-0000-4000-8000-000000000030','f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000011','merchant_name','equals','  NETFLIX  ','EUR','expense','active');
do $$ begin
 if (select value from public.category_rules where id='f8000000-0000-4000-8000-000000000030') <> 'netflix' then raise exception 'Rule normalization failed.'; end if;
 begin
  insert into public.category_rules(user_id,category_id,field,operator,value,currency,direction,status) values
   ('f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000021','description','equals','test','EUR','expense','proposed');
  raise exception 'Cross-owner category was accepted.';
 exception when foreign_key_violation then null; end;
end $$;
update public.category_rules set status='paused' where id='f8000000-0000-4000-8000-000000000030';
do $$ begin
 if (select version from public.category_rules where id='f8000000-0000-4000-8000-000000000030') <> 2 then raise exception 'Rule version failed.'; end if;
end $$;
select set_config('request.jwt.claim.sub','f8000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from public.category_rules) then raise exception 'Other owner rules are visible.'; end if;
 begin
  insert into public.category_rules(user_id,field,operator,value,currency,direction) values
   ('f8000000-0000-4000-8000-000000000001','description','equals','test','EUR','expense');
  raise exception 'Other owner rule write was accepted.';
 exception when insufficient_privilege then null; end;
end $$;

reset role;
insert into public.institutions(id,provider,provider_institution_id,name) values ('f8000000-0000-4000-8000-000000000040','test','rules-fixture','Fixture');
insert into public.bank_connections(id,user_id,institution_id,provider) values ('f8000000-0000-4000-8000-000000000041','f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000040','test');
insert into public.accounts(id,user_id,bank_connection_id,provider_account_id,name,currency,iban_fingerprint) values
 ('f8000000-0000-4000-8000-000000000042','f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000041','one','One','EUR',repeat('a',64)),
 ('f8000000-0000-4000-8000-000000000043','f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000041','two','Two','EUR',repeat('b',64));
insert into public.transaction_categories(id,user_id,group_id,name,slug) values ('f8000000-0000-4000-8000-000000000012','f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000010','Other','other');
update public.category_rules set status='active' where id='f8000000-0000-4000-8000-000000000030';
insert into public.category_rules(user_id,category_id,field,operator,value,currency,direction,status)
select 'f8000000-0000-4000-8000-000000000001',id,'merchant_name','equals','spotify','EUR','expense','active'
from public.transaction_categories where id in ('f8000000-0000-4000-8000-000000000011','f8000000-0000-4000-8000-000000000012');
insert into public.transactions(id,user_id,account_id,stable_import_key,identity_source,provider,booking_status,booking_date,reporting_date,first_seen_at,amount,currency,merchant_name,category_id,category_source,counterparty_account_fingerprint)
select ('f8000000-0000-4000-8000-'||lpad((100+n)::text,12,'0'))::uuid,'f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000042',n::text,'test','test',
 case when n=7 then 'pending' else 'booked' end,
 case when n=4 then current_date-1 else current_date+1 end,current_date+1,
 case when n=5 then now()-interval '1 day' else now()+interval '1 minute' end,-10,
 case when n=6 then 'USD' else 'EUR' end,case when n=10 then 'Spotify' else '  NETFLIX  ' end,
 case when n=3 then 'f8000000-0000-4000-8000-000000000012'::uuid else null end,
 case when n in (2,3) then 'manual' else null end,
 case when n=8 then repeat('b',64) else null end
from generate_series(1,10) n;
insert into public.transaction_reconciliations(id,user_id,kind,note,currency,difference_treatment) values ('f8000000-0000-4000-8000-000000000050','f8000000-0000-4000-8000-000000000001','other','Fixture','EUR','neutralized');
insert into public.transaction_reconciliation_items(user_id,reconciliation_id,transaction_id,position) values ('f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000050','f8000000-0000-4000-8000-000000000109',0);
do $$ begin
 if has_function_privilege('authenticated','public.apply_category_rule_assignments(uuid,uuid,uuid[])','execute') or has_function_privilege('anon','public.apply_category_rule_assignments(uuid,uuid,uuid[])','execute') then raise exception 'Provider RPC is not private.'; end if;
 if (select prosecdef from pg_proc where oid='public.apply_category_rule_assignments(uuid,uuid,uuid[])'::regprocedure) then raise exception 'RPC must be security invoker.'; end if;
 begin
  update public.transactions set category_rule_id='f8000000-0000-4000-8000-000000000030' where id='f8000000-0000-4000-8000-000000000102';
  raise exception 'Invalid provenance was accepted.';
 exception when check_violation then null; end;
end $$;
set local role service_role;
do $$ declare count_applied integer; selected_ids uuid[]; begin
 select array_agg(id) into selected_ids from public.transactions where user_id='f8000000-0000-4000-8000-000000000001';
 count_applied:=public.apply_category_rule_assignments('f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000041',selected_ids);
 if count_applied<>1 then raise exception 'Expected one assignment, got %.',count_applied; end if;
 if not exists(select 1 from public.transactions where id='f8000000-0000-4000-8000-000000000101' and category_source='rule' and category_rule_version=3) then raise exception 'Provenance was not recorded.'; end if;
 if not exists(select 1 from public.transactions where id='f8000000-0000-4000-8000-000000000110' and category_id is null and category_rule_conflict) then raise exception 'Conflict was not retained.'; end if;
 if exists(select 1 from public.transactions where user_id='f8000000-0000-4000-8000-000000000001' and id not in ('f8000000-0000-4000-8000-000000000101','f8000000-0000-4000-8000-000000000103') and category_id is not null) then raise exception 'Protected or neutral row was categorized.'; end if;
 if public.apply_category_rule_assignments('f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000041',selected_ids)<>0 then raise exception 'Repeated application is not idempotent.'; end if;
 begin
  perform public.apply_category_rule_assignments('f8000000-0000-4000-8000-000000000002','f8000000-0000-4000-8000-000000000041',selected_ids);
  raise exception 'Other owner connection was accepted.';
 exception when invalid_parameter_value then null; end;
end $$;
update public.category_rules set status='paused' where user_id='f8000000-0000-4000-8000-000000000001';
select public.apply_category_rule_assignments('f8000000-0000-4000-8000-000000000001','f8000000-0000-4000-8000-000000000041',array['f8000000-0000-4000-8000-000000000110'::uuid]);
do $$ begin
 if (select category_rule_conflict from public.transactions where id='f8000000-0000-4000-8000-000000000110') then raise exception 'Resolved conflict remained marked.'; end if;
 if (select category_source from public.transactions where id='f8000000-0000-4000-8000-000000000101')<>'rule' then raise exception 'Pausing changed historical assignment.'; end if;
end $$;
rollback;
