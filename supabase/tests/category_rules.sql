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
rollback;
