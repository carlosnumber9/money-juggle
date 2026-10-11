-- Synthetic label management fixtures; never retain changes or financial data.
begin;

insert into auth.users (id, email) values
  ('fa000000-0000-4000-8000-000000000001', 'label-owner@example.invalid'),
  ('fa000000-0000-4000-8000-000000000002', 'label-other@example.invalid');
insert into public.profiles (id, email) values
  ('fa000000-0000-4000-8000-000000000001', 'label-owner@example.invalid'),
  ('fa000000-0000-4000-8000-000000000002', 'label-other@example.invalid');
insert into public.institutions (id, provider, provider_institution_id, name)
values ('fa000000-0000-4000-8000-000000000010', 'test', 'label-test', 'Label test');
insert into public.bank_connections (id, user_id, institution_id, provider)
values ('fa000000-0000-4000-8000-000000000020', 'fa000000-0000-4000-8000-000000000001',
  'fa000000-0000-4000-8000-000000000010', 'test');
insert into public.accounts (id, user_id, bank_connection_id, provider_account_id, name, currency)
values ('fa000000-0000-4000-8000-000000000030', 'fa000000-0000-4000-8000-000000000001',
  'fa000000-0000-4000-8000-000000000020', 'label-test', 'Label test', 'EUR');
insert into public.transactions (id, user_id, account_id, stable_import_key, identity_source,
  provider, booking_status, amount, currency, booking_date, reporting_date)
values ('fa000000-0000-4000-8000-000000000040', 'fa000000-0000-4000-8000-000000000001',
  'fa000000-0000-4000-8000-000000000030', 'label-test', 'provider_transaction_id',
  'test', 'booked', -20, 'EUR', '2026-10-01', '2026-10-01');
insert into public.transaction_reconciliations (id, user_id, kind, currency, difference_treatment)
values ('fa000000-0000-4000-8000-000000000050', 'fa000000-0000-4000-8000-000000000001',
  'debt', 'EUR', 'none');
insert into public.transaction_reconciliation_items (user_id, reconciliation_id, transaction_id, position)
values ('fa000000-0000-4000-8000-000000000001', 'fa000000-0000-4000-8000-000000000050',
  'fa000000-0000-4000-8000-000000000040', 0);
insert into public.transaction_labels (id, user_id, name) values
  ('fa000000-0000-4000-8000-000000000060', 'fa000000-0000-4000-8000-000000000001', 'Trip'),
  ('fa000000-0000-4000-8000-000000000061', 'fa000000-0000-4000-8000-000000000002', 'Other');
insert into public.transaction_label_assignments (user_id, transaction_id, label_id)
values ('fa000000-0000-4000-8000-000000000001', 'fa000000-0000-4000-8000-000000000040',
  'fa000000-0000-4000-8000-000000000060');
insert into public.transaction_reconciliation_label_assignments (user_id, reconciliation_id, label_id)
values ('fa000000-0000-4000-8000-000000000001', 'fa000000-0000-4000-8000-000000000050',
  'fa000000-0000-4000-8000-000000000060');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'fa000000-0000-4000-8000-000000000002', true);
do $$ begin
  delete from public.transaction_labels where id = 'fa000000-0000-4000-8000-000000000060';
  if found then raise exception 'Another user deleted the label.'; end if;
  update public.transaction_labels set name = 'Not owned'
    where id = 'fa000000-0000-4000-8000-000000000060';
  if found then raise exception 'Another user renamed the label.'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'fa000000-0000-4000-8000-000000000001', true);
do $$ begin
  insert into public.transaction_labels (user_id, name)
  values ('fa000000-0000-4000-8000-000000000001', 'Independent');
  begin
    insert into public.transaction_labels (user_id, name)
    values ('fa000000-0000-4000-8000-000000000001', 'trip');
    raise exception 'Duplicate label was accepted.';
  exception when unique_violation then null; end;
  begin
    update public.transaction_labels set name = ' '
      where id = 'fa000000-0000-4000-8000-000000000060';
    raise exception 'Empty label was accepted.';
  exception when check_violation then null; end;
  update public.transaction_labels set name = 'Renamed trip'
    where id = 'fa000000-0000-4000-8000-000000000060';
  if not exists (select 1 from public.transaction_label_assignments
      where label_id = 'fa000000-0000-4000-8000-000000000060')
    or not exists (select 1 from public.transaction_reconciliation_label_assignments
      where label_id = 'fa000000-0000-4000-8000-000000000060') then
    raise exception 'Rename removed assignments.';
  end if;
  delete from public.transaction_labels where id = 'fa000000-0000-4000-8000-000000000060';
  if not found then raise exception 'Owner could not delete the label.'; end if;
  if exists (select 1 from public.transaction_label_assignments
      where label_id = 'fa000000-0000-4000-8000-000000000060')
    or exists (select 1 from public.transaction_reconciliation_label_assignments
      where label_id = 'fa000000-0000-4000-8000-000000000060') then
    raise exception 'Deletion retained assignments.';
  end if;
  if not exists (select 1 from public.transactions
      where id = 'fa000000-0000-4000-8000-000000000040' and amount = -20)
    or not exists (select 1 from public.transaction_reconciliations
      where id = 'fa000000-0000-4000-8000-000000000050')
    or not exists (select 1 from public.transaction_reconciliation_items
      where transaction_id = 'fa000000-0000-4000-8000-000000000040') then
    raise exception 'Deletion changed financial records.';
  end if;
end $$;

reset role;
do $$ begin
  if not exists (select 1 from public.transaction_labels
    where id = 'fa000000-0000-4000-8000-000000000061' and name = 'Other') then
    raise exception 'Another owner label changed.';
  end if;
end $$;
rollback;
