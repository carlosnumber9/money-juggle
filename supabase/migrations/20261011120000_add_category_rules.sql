begin;

create table public.category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid,
  account_id uuid,
  field text not null check (field in ('merchant_name', 'counterparty_name', 'description')),
  operator text not null check (operator in ('equals', 'contains')),
  value text not null check (length(btrim(value)) between 1 and 300),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  direction text not null check (direction in ('income', 'expense')),
  status text not null default 'proposed' check (status in ('proposed', 'active', 'paused', 'dismissed', 'deleted')),
  activated_at timestamptz,
  version integer not null default 1 check (version > 0),
  proposal_key text,
  evidence jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, proposal_key),
  foreign key (category_id, user_id) references public.transaction_categories(id, user_id) on delete restrict,
  foreign key (account_id, user_id) references public.accounts(id, user_id) on delete restrict,
  check (operator = 'equals' or field = 'description'),
  check (status <> 'active' or (category_id is not null and activated_at is not null))
);
create index category_rules_owner_status on public.category_rules(user_id, status);
alter table public.category_rules enable row level security;
grant select, insert, update on public.category_rules to authenticated;
grant all on public.category_rules to service_role;
create policy category_rules_select on public.category_rules for select to authenticated using (user_id = auth.uid());
create policy category_rules_insert on public.category_rules for insert to authenticated with check (user_id = auth.uid());
create policy category_rules_update on public.category_rules for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create function public.prepare_category_rule() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.value := btrim(regexp_replace(lower(new.value), '\s+', ' ', 'g'));
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.id <> old.id then
      raise exception 'Rule ownership is immutable.' using errcode = '22023';
    end if;
    new.version := old.version + 1;
  else
    new.version := 1;
  end if;
  if new.status = 'active' then
    if not exists (select 1 from public.transaction_categories c where c.id = new.category_id and c.user_id = new.user_id and not c.is_archived and c.slug <> 'internal_transfer') then
      raise exception 'Category is unavailable.' using errcode = '22023';
    end if;
    new.activated_at := statement_timestamp();
  end if;
  new.updated_at := statement_timestamp();
  return new;
end $$;
create trigger category_rules_prepare before insert or update on public.category_rules for each row execute function public.prepare_category_rule();

alter table public.transactions
  add column category_source text check (category_source in ('manual', 'rule')),
  add column category_rule_id uuid,
  add column category_rule_version integer,
  add column category_rule_conflict boolean not null default false,
  add constraint transactions_category_rule_owner_fk foreign key (category_rule_id, user_id) references public.category_rules(id, user_id) on delete restrict,
  add constraint transactions_category_rule_origin_check check (
    (category_source is not distinct from 'rule' and category_id is not null and category_rule_id is not null and category_rule_version is not null and category_rule_version > 0)
    or ((category_source is null or category_source = 'manual') and category_rule_id is null and category_rule_version is null)
  );
update public.transactions set category_source = 'manual' where category_id is not null;
create index transactions_category_rule_candidates on public.transactions(user_id, account_id, first_seen_at)
  where category_id is null and category_source is null;

create function public.category_rule_text_matches(p_field text,p_operator text,p_value text,p_merchant text,p_counterparty text,p_description text)
returns boolean language sql immutable set search_path = '' as $$
  select case when p_operator='equals' then normalized=p_value else position(p_value in normalized)>0 end
  from (select btrim(regexp_replace(lower(coalesce(case p_field when 'merchant_name' then p_merchant when 'counterparty_name' then p_counterparty when 'description' then p_description end,'')), '\s+', ' ', 'g')) as normalized) as input
  where length(p_value)>0;
$$;

-- This narrow provider-write boundary works without browser auth cookies.
create function public.apply_category_rule_assignments(p_user_id uuid, p_connection_id uuid, p_transaction_ids uuid[])
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  movement public.transactions%rowtype;
  chosen public.category_rules%rowtype;
  category_count integer;
  affected integer := 0;
begin
  if cardinality(p_transaction_ids) > 500 or not exists (
    select 1 from public.bank_connections where id = p_connection_id and user_id = p_user_id
  ) then raise exception 'Invalid rule application scope.' using errcode = '22023'; end if;
  -- Serialize rule edits and category archival against assignment.
  perform r.id from public.category_rules r join public.transaction_categories c on c.id=r.category_id and c.user_id=r.user_id
    where r.user_id=p_user_id and r.status='active' and not c.is_archived and c.slug<>'internal_transfer'
    order by r.id for share of r,c;
  for movement in
    select t.* from public.transactions t join public.accounts a on a.id=t.account_id and a.user_id=t.user_id
    where t.user_id=p_user_id and a.bank_connection_id=p_connection_id and t.id=any(p_transaction_ids)
      and t.booking_status='booked' and t.category_id is null and t.category_source is null
    order by t.id for update of t
  loop
    if exists(select 1 from public.transaction_reconciliation_items i where i.transaction_id=movement.id and i.user_id=p_user_id)
      or exists(select 1 from public.accounts a where a.user_id=p_user_id and a.id<>movement.account_id and a.iban_fingerprint=movement.counterparty_account_fingerprint)
      or exists(
        select 1 from public.transactions peer join public.accounts pa on pa.id=peer.account_id and pa.user_id=peer.user_id
        join public.accounts own on own.id=movement.account_id and own.user_id=movement.user_id
        where peer.user_id=p_user_id and peer.account_id<>movement.account_id and peer.currency=movement.currency
          and peer.amount=-movement.amount and movement.amount<>0
          and abs(peer.booking_date-movement.booking_date)<=3
          and (
            (movement.counterparty_account_last4=pa.iban_last4 and (peer.counterparty_account_last4=own.iban_last4 or peer.counterparty_account_last4 is null))
            or (peer.counterparty_account_last4=own.iban_last4 and (movement.counterparty_account_last4=pa.iban_last4 or movement.counterparty_account_last4 is null))
          )
      ) then continue; end if;
    select count(distinct r.category_id) into category_count
    from public.category_rules r join public.transaction_categories c on c.id=r.category_id and c.user_id=r.user_id
    where r.user_id=p_user_id and r.status='active' and not c.is_archived and c.slug<>'internal_transfer'
      and movement.first_seen_at>=r.activated_at and movement.booking_date>=(r.activated_at at time zone 'UTC')::date
      and r.currency=movement.currency and (r.account_id is null or r.account_id=movement.account_id)
      and r.direction=case when movement.amount>0 then 'income' when movement.amount<0 then 'expense' else '' end
      and public.category_rule_text_matches(r.field,r.operator,r.value,movement.merchant_name,movement.counterparty_name,movement.description);
    if category_count=1 then
      select r.* into chosen
      from public.category_rules r join public.transaction_categories c on c.id=r.category_id and c.user_id=r.user_id
      where r.user_id=p_user_id and r.status='active' and not c.is_archived and c.slug<>'internal_transfer'
        and movement.first_seen_at>=r.activated_at and movement.booking_date>=(r.activated_at at time zone 'UTC')::date
        and r.currency=movement.currency and (r.account_id is null or r.account_id=movement.account_id)
        and r.direction=case when movement.amount>0 then 'income' when movement.amount<0 then 'expense' else '' end
        and public.category_rule_text_matches(r.field,r.operator,r.value,movement.merchant_name,movement.counterparty_name,movement.description)
      order by r.activated_at,r.id limit 1;
      update public.transactions set category_id=chosen.category_id,category_source='rule',category_rule_id=chosen.id,category_rule_version=chosen.version,category_rule_conflict=false
        where id=movement.id and user_id=p_user_id and category_id is null and category_source is null;
      affected:=affected+1;
    else
      update public.transactions set category_rule_conflict=(category_count>1)
        where id=movement.id and user_id=p_user_id and category_id is null and category_source is null and category_rule_conflict is distinct from (category_count>1);
    end if;
  end loop;
  return affected;
end $$;
revoke all on function public.apply_category_rule_assignments(uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.apply_category_rule_assignments(uuid,uuid,uuid[]) to service_role;

commit;
