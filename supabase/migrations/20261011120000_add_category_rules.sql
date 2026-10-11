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
    (category_source = 'rule' and category_id is not null and category_rule_id is not null and category_rule_version is not null and category_rule_version > 0)
    or ((category_source is null or category_source = 'manual') and category_rule_id is null and category_rule_version is null)
  );
update public.transactions set category_source = 'manual' where category_id is not null;
create index transactions_category_rule_candidates on public.transactions(user_id, account_id, first_seen_at)
  where category_id is null and category_source is null;

commit;
