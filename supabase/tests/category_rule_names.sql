-- Synthetic name and activation fixtures; always rolled back.
begin;
insert into auth.users(id, email) values
 ('f9000000-0000-4000-8000-000000000001', 'rule-names@example.invalid');
insert into public.profiles(id, email) values
 ('f9000000-0000-4000-8000-000000000001', 'rule-names@example.invalid');
insert into public.transaction_category_groups(id,user_id,name,slug) values
 ('f9000000-0000-4000-8000-000000000010','f9000000-0000-4000-8000-000000000001','Test','test');
insert into public.transaction_categories(id,user_id,group_id,name,slug) values
 ('f9000000-0000-4000-8000-000000000011','f9000000-0000-4000-8000-000000000001','f9000000-0000-4000-8000-000000000010','Test','test');

set local role authenticated;
select set_config('request.jwt.claim.sub','f9000000-0000-4000-8000-000000000001',true);
insert into public.category_rules(id,user_id,category_id,field,operator,value,currency,direction,status) values
 ('f9000000-0000-4000-8000-000000000030','f9000000-0000-4000-8000-000000000001','f9000000-0000-4000-8000-000000000011','merchant_name','equals','  NETFLIX  ','EUR','expense','active');
create temporary table initial_rule as select * from public.category_rules where id='f9000000-0000-4000-8000-000000000030';

update public.category_rules set name='  Suscripción familiar  ' where id='f9000000-0000-4000-8000-000000000030' and version=1;
do $$ begin
 if (select name from initial_rule) <> 'netflix' then raise exception 'Default name did not match the previous title.'; end if;
 if not exists (
   select 1 from public.category_rules r join initial_rule i on i.id=r.id
   where r.name='Suscripción familiar' and r.value=i.value and r.activated_at=i.activated_at and r.version=i.version+1 and r.status=i.status
 ) then raise exception 'Rename changed matching, activation or name casing.'; end if;
 begin
  update public.category_rules set name=' ' where id='f9000000-0000-4000-8000-000000000030';
  raise exception 'Empty name was accepted.';
 exception when check_violation then null; end;
 begin
  update public.category_rules set name=repeat('a',301) where id='f9000000-0000-4000-8000-000000000030';
  raise exception 'Oversized name was accepted.';
 exception when check_violation then null; end;
 update public.category_rules set name='Stale edit' where id='f9000000-0000-4000-8000-000000000030' and version=1;
 if found then raise exception 'Stale version changed the name.'; end if;
end $$;

-- Linked query APIs may execute the entire fixture as one statement batch.
create temporary table condition_revision as
 with revised as (
  update public.category_rules set value='spotify' where id='f9000000-0000-4000-8000-000000000030'
  returning name,value,activated_at,statement_timestamp() as expected_activated_at
 ) select * from revised;
do $$ begin
 if not exists (
   select 1 from condition_revision r cross join initial_rule i
   where r.name='Suscripción familiar' and r.value='spotify'
     and r.activated_at=r.expected_activated_at and r.activated_at>=i.activated_at
 ) then raise exception 'Condition editing changed the name or failed to advance activation.'; end if;
end $$;

update public.category_rules set status='paused' where id='f9000000-0000-4000-8000-000000000030' and status='active';
update public.category_rules set status='active' where id='f9000000-0000-4000-8000-000000000030' and status='paused';
do $$ begin
 if not exists(select 1 from public.category_rules where id='f9000000-0000-4000-8000-000000000030' and status='active' and name='Suscripción familiar' and version=5) then raise exception 'Status toggle lost the name or version.'; end if;
end $$;
rollback;
