create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

create table public.transaction_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  note text,
  currency text not null,
  difference_treatment text not null,
  adjustment_category_id uuid,
  adjustment_reporting_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_reconciliations_id_user_unique unique (id, user_id),
  constraint transaction_reconciliations_kind_check check (
    kind in ('debt', 'reimbursement', 'refund', 'other')
  ),
  constraint transaction_reconciliations_note_check check (
    note is null or note = btrim(note)
  ),
  constraint transaction_reconciliations_other_note_check check (
    kind <> 'other' or nullif(btrim(note), '') is not null
  ),
  constraint transaction_reconciliations_currency_check check (
    currency ~ '^[A-Z]{3}$'
  ),
  constraint transaction_reconciliations_treatment_check check (
    difference_treatment in ('none', 'neutralized', 'reportable')
  ),
  constraint transaction_reconciliations_adjustment_check check (
    (
      difference_treatment = 'reportable'
      and adjustment_category_id is not null
      and adjustment_reporting_date is not null
    )
    or (
      difference_treatment <> 'reportable'
      and adjustment_category_id is null
      and adjustment_reporting_date is null
    )
  ),
  constraint transaction_reconciliations_category_owner_fk foreign key (
    adjustment_category_id,
    user_id
  ) references public.transaction_categories(id, user_id) on delete restrict
);

create table public.transaction_reconciliation_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  reconciliation_id uuid not null,
  transaction_id uuid not null,
  position integer not null,
  created_at timestamptz not null default now(),
  primary key (reconciliation_id, transaction_id),
  constraint transaction_reconciliation_items_transaction_unique unique (
    transaction_id
  ),
  constraint transaction_reconciliation_items_position_unique unique (
    reconciliation_id,
    position
  ),
  constraint transaction_reconciliation_items_position_check check (
    position >= 0
  ),
  constraint transaction_reconciliation_items_reconciliation_owner_fk foreign key (
    reconciliation_id,
    user_id
  ) references public.transaction_reconciliations(id, user_id) on delete cascade,
  constraint transaction_reconciliation_items_transaction_owner_fk foreign key (
    transaction_id,
    user_id
  ) references public.transactions(id, user_id) on delete restrict
);

create table public.transaction_reconciliation_label_assignments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  reconciliation_id uuid not null,
  label_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (reconciliation_id, label_id),
  constraint transaction_reconciliation_labels_reconciliation_owner_fk foreign key (
    reconciliation_id,
    user_id
  ) references public.transaction_reconciliations(id, user_id) on delete cascade,
  constraint transaction_reconciliation_labels_label_owner_fk foreign key (
    label_id,
    user_id
  ) references public.transaction_labels(id, user_id) on delete cascade
);

create index transaction_reconciliations_user_updated_idx
  on public.transaction_reconciliations (user_id, updated_at desc);

create index transaction_reconciliation_items_user_transaction_idx
  on public.transaction_reconciliation_items (user_id, transaction_id);

create index transaction_reconciliation_labels_user_label_idx
  on public.transaction_reconciliation_label_assignments (user_id, label_id);

create trigger transaction_reconciliations_set_updated_at
before update on public.transaction_reconciliations
for each row execute function public.set_updated_at();

alter table public.transaction_reconciliations enable row level security;
alter table public.transaction_reconciliation_items enable row level security;
alter table public.transaction_reconciliation_label_assignments enable row level security;

create policy "Users can read their own transaction reconciliations"
on public.transaction_reconciliations for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own transaction reconciliations"
on public.transaction_reconciliations for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own transaction reconciliations"
on public.transaction_reconciliations for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own transaction reconciliations"
on public.transaction_reconciliations for delete
to authenticated
using (user_id = auth.uid());

create policy "Users can read their own transaction reconciliation items"
on public.transaction_reconciliation_items for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own transaction reconciliation items"
on public.transaction_reconciliation_items for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own transaction reconciliation items"
on public.transaction_reconciliation_items for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own transaction reconciliation items"
on public.transaction_reconciliation_items for delete
to authenticated
using (user_id = auth.uid());

create policy "Users can read their own reconciliation label assignments"
on public.transaction_reconciliation_label_assignments for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own reconciliation label assignments"
on public.transaction_reconciliation_label_assignments for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can delete their own reconciliation label assignments"
on public.transaction_reconciliation_label_assignments for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.save_transaction_reconciliation(
  p_reconciliation_id uuid,
  p_kind text,
  p_note text,
  p_transaction_ids uuid[],
  p_expected_balance numeric,
  p_difference_treatment text,
  p_adjustment_category_id uuid,
  p_adjustment_reporting_date date,
  p_label_ids uuid[],
  p_new_label_names text[]
)
returns table (
  saved_reconciliation_id uuid,
  current_balance numeric
)
language plpgsql
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_reconciliation_id uuid;
  v_currency text;
  v_balance numeric(20, 6);
  v_transaction_count integer;
  v_distinct_transaction_count integer;
  v_existing_owner uuid;
  v_label_id uuid;
  v_label_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  v_transaction_count := cardinality(coalesce(p_transaction_ids, '{}'::uuid[]));

  select count(distinct transaction_id)
  into v_distinct_transaction_count
  from unnest(coalesce(p_transaction_ids, '{}'::uuid[])) as transaction_id;

  if v_transaction_count < 2 or v_transaction_count <> v_distinct_transaction_count then
    raise exception 'A reconciliation requires at least two distinct transactions.'
      using errcode = '22023';
  end if;

  if p_kind not in ('debt', 'reimbursement', 'refund', 'other') then
    raise exception 'Invalid reconciliation kind.' using errcode = '22023';
  end if;

  p_note := nullif(btrim(p_note), '');

  if p_kind = 'other' and p_note is null then
    raise exception 'Other reconciliations require a note.' using errcode = '22023';
  end if;

  if p_difference_treatment not in ('none', 'neutralized', 'reportable') then
    raise exception 'Invalid difference treatment.' using errcode = '22023';
  end if;

  perform 1
  from public.transactions
  where user_id = v_user_id
    and id = any(p_transaction_ids)
  for update;

  select count(*), min(currency), sum(amount)
  into v_transaction_count, v_currency, v_balance
  from public.transactions
  where user_id = v_user_id
    and id = any(p_transaction_ids);

  if v_transaction_count <> cardinality(p_transaction_ids) then
    raise exception 'One or more transactions were not found.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.transactions
    where user_id = v_user_id
      and id = any(p_transaction_ids)
      and currency <> v_currency
  ) then
    raise exception 'All transactions must use the same currency.' using errcode = '22023';
  end if;

  if v_balance <> p_expected_balance then
    raise exception 'Transaction amounts changed while editing.' using errcode = '40001';
  end if;

  if p_reconciliation_id is not null then
    select user_id into v_existing_owner
    from public.transaction_reconciliations
    where id = p_reconciliation_id
    for update;

    if v_existing_owner is distinct from v_user_id then
      raise exception 'Reconciliation not found.' using errcode = '42501';
    end if;
  end if;

  if exists (
    select 1
    from public.transaction_reconciliation_items
    where transaction_id = any(p_transaction_ids)
      and reconciliation_id <> coalesce(p_reconciliation_id, gen_random_uuid())
  ) then
    raise exception 'A transaction already belongs to another reconciliation.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.transactions t
    left join public.transaction_reconciliation_items existing_item
      on existing_item.transaction_id = t.id
      and existing_item.reconciliation_id = p_reconciliation_id
    left join public.transaction_categories category
      on category.id = t.category_id
      and category.user_id = t.user_id
    where t.user_id = v_user_id
      and t.id = any(p_transaction_ids)
      and existing_item.transaction_id is null
      and (
        t.booking_status <> 'booked'
        or category.slug = 'internal_transfer'
      )
  ) then
    raise exception 'New reconciliation members must be booked external transactions.'
      using errcode = '22023';
  end if;

  if v_balance = 0 and p_difference_treatment <> 'none' then
    raise exception 'A zero balance cannot have a difference treatment.'
      using errcode = '22023';
  end if;

  if v_balance <> 0 and p_difference_treatment = 'none' then
    raise exception 'A non-zero balance requires a difference treatment.'
      using errcode = '22023';
  end if;

  if p_difference_treatment = 'reportable' then
    if p_adjustment_category_id is null or p_adjustment_reporting_date is null then
      raise exception 'A reportable difference requires category and date.'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.transaction_categories
      where id = p_adjustment_category_id
        and user_id = v_user_id
        and is_archived = false
        and slug not in ('internal_transfer', 'shared_expense_settlement')
    ) then
      raise exception 'The adjustment category is not reportable.' using errcode = '22023';
    end if;
  elsif p_adjustment_category_id is not null or p_adjustment_reporting_date is not null then
    raise exception 'Only reportable differences can have adjustment metadata.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_label_ids, '{}'::uuid[])) as selected_label_id
    where not exists (
      select 1
      from public.transaction_labels
      where id = selected_label_id
        and user_id = v_user_id
        and is_archived = false
    )
  ) then
    raise exception 'One or more labels are not available.' using errcode = '22023';
  end if;

  if p_difference_treatment <> 'reportable'
    and (
      cardinality(coalesce(p_label_ids, '{}'::uuid[])) > 0
      or cardinality(coalesce(p_new_label_names, '{}'::text[])) > 0
    )
  then
    raise exception 'Only reportable differences can have labels.' using errcode = '22023';
  end if;

  if p_reconciliation_id is null then
    insert into public.transaction_reconciliations (
      user_id,
      kind,
      note,
      currency,
      difference_treatment,
      adjustment_category_id,
      adjustment_reporting_date
    ) values (
      v_user_id,
      p_kind,
      p_note,
      v_currency,
      p_difference_treatment,
      p_adjustment_category_id,
      p_adjustment_reporting_date
    )
    returning id into v_reconciliation_id;
  else
    v_reconciliation_id := p_reconciliation_id;

    update public.transaction_reconciliations
    set kind = p_kind,
        note = p_note,
        currency = v_currency,
        difference_treatment = p_difference_treatment,
        adjustment_category_id = p_adjustment_category_id,
        adjustment_reporting_date = p_adjustment_reporting_date
    where id = v_reconciliation_id
      and user_id = v_user_id;

    delete from public.transaction_reconciliation_label_assignments
    where reconciliation_id = v_reconciliation_id;
  end if;

  delete from public.transaction_reconciliation_items
  where reconciliation_id = v_reconciliation_id;

  insert into public.transaction_reconciliation_items (
    user_id,
    reconciliation_id,
    transaction_id,
    position
  )
  select v_user_id, v_reconciliation_id, transaction_id, ordinal - 1
  from unnest(p_transaction_ids) with ordinality as selected(transaction_id, ordinal)
  on conflict (reconciliation_id, transaction_id)
  do update set position = excluded.position;

  if p_difference_treatment = 'reportable' then
    foreach v_label_name in array coalesce(p_new_label_names, '{}'::text[])
    loop
      v_label_name := regexp_replace(btrim(v_label_name), '[[:space:]]+', ' ', 'g');

      if char_length(v_label_name) < 1 or char_length(v_label_name) > 80 then
        raise exception 'Label names must contain between 1 and 80 characters.'
          using errcode = '22023';
      end if;

      insert into public.transaction_labels (user_id, name)
      values (v_user_id, v_label_name)
      on conflict (user_id, normalized_name)
      do update set is_archived = false
      returning id into v_label_id;

      p_label_ids := array_append(coalesce(p_label_ids, '{}'::uuid[]), v_label_id);
    end loop;

    insert into public.transaction_reconciliation_label_assignments (
      user_id,
      reconciliation_id,
      label_id
    )
    select distinct v_user_id, v_reconciliation_id, selected_label_id
    from unnest(coalesce(p_label_ids, '{}'::uuid[])) as selected_label_id
    on conflict do nothing;
  end if;

  return query select v_reconciliation_id, v_balance;
end;
$$;

create or replace function public.delete_transaction_reconciliation(
  p_reconciliation_id uuid
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  delete from public.transaction_reconciliations
  where id = p_reconciliation_id
    and user_id = auth.uid();

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count = 1;
end;
$$;

create or replace function public.search_transaction_reconciliation_candidates(
  p_currency text,
  p_query text default '',
  p_before_reporting_date date default null,
  p_before_id uuid default null,
  p_limit integer default 50,
  p_reconciliation_id uuid default null
)
returns table (
  id uuid,
  account_id uuid,
  booking_status text,
  booking_date date,
  reporting_date date,
  amount numeric,
  currency text,
  description text,
  merchant_name text,
  counterparty_name text,
  counterparty_account_last4 text,
  account_name text,
  account_iban_last4 text,
  institution_name text,
  institution_provider_id text,
  category_id uuid,
  category_name text,
  category_slug text,
  category_group_id uuid,
  category_group_name text,
  labels jsonb,
  is_existing_member boolean
)
language sql
stable
set search_path = public, extensions
as $$
  with candidate_rows as (
    select
      t.id,
      t.account_id,
      t.booking_status,
      t.booking_date,
      t.reporting_date,
      t.amount,
      t.currency,
      t.description,
      t.merchant_name,
      t.counterparty_name,
      t.counterparty_account_last4,
      account.name as account_name,
      account.iban_last4 as account_iban_last4,
      institution.name as institution_name,
      institution.provider_institution_id as institution_provider_id,
      category.id as category_id,
      category.name as category_name,
      category.slug as category_slug,
      category_group.id as category_group_id,
      category_group.name as category_group_name,
      coalesce(label_data.labels, '[]'::jsonb) as labels,
      own_item.transaction_id is not null as is_existing_member,
      lower(extensions.unaccent(concat_ws(' ',
        t.description,
        t.merchant_name,
        t.counterparty_name,
        t.amount::text,
        replace(t.amount::text, '.', ','),
        t.currency,
        to_char(t.reporting_date, 'YYYY-MM-DD'),
        institution.name,
        account.name,
        account.iban_last4,
        t.counterparty_account_last4,
        category.name,
        label_data.search_names
      ))) as search_text
    from public.transactions t
    join public.accounts account
      on account.id = t.account_id and account.user_id = t.user_id
    join public.bank_connections connection
      on connection.id = account.bank_connection_id and connection.user_id = t.user_id
    join public.institutions institution on institution.id = connection.institution_id
    left join public.transaction_categories category
      on category.id = t.category_id and category.user_id = t.user_id
    left join public.transaction_category_groups category_group
      on category_group.id = category.group_id and category_group.user_id = t.user_id
    left join public.transaction_reconciliation_items membership
      on membership.transaction_id = t.id
    left join public.transaction_reconciliation_items own_item
      on own_item.transaction_id = t.id
      and own_item.reconciliation_id = p_reconciliation_id
    left join lateral (
      select
        jsonb_agg(
          jsonb_build_object('id', label.id, 'name', label.name)
          order by assignment.created_at, label.name
        ) as labels,
        string_agg(label.name, ' ') as search_names
      from public.transaction_label_assignments assignment
      join public.transaction_labels label on label.id = assignment.label_id
      where assignment.transaction_id = t.id
    ) label_data on true
    where t.user_id = auth.uid()
      and t.currency = p_currency
      and (
        own_item.transaction_id is not null
        or (
          t.booking_status = 'booked'
          and membership.transaction_id is null
          and coalesce(category.slug, '') <> 'internal_transfer'
        )
      )
  )
  select
    candidate_rows.id,
    candidate_rows.account_id,
    candidate_rows.booking_status,
    candidate_rows.booking_date,
    candidate_rows.reporting_date,
    candidate_rows.amount,
    candidate_rows.currency,
    candidate_rows.description,
    candidate_rows.merchant_name,
    candidate_rows.counterparty_name,
    candidate_rows.counterparty_account_last4,
    candidate_rows.account_name,
    candidate_rows.account_iban_last4,
    candidate_rows.institution_name,
    candidate_rows.institution_provider_id,
    candidate_rows.category_id,
    candidate_rows.category_name,
    candidate_rows.category_slug,
    candidate_rows.category_group_id,
    candidate_rows.category_group_name,
    candidate_rows.labels,
    candidate_rows.is_existing_member
  from candidate_rows
  where (
      nullif(btrim(p_query), '') is null
      or candidate_rows.search_text like '%' || lower(extensions.unaccent(btrim(p_query))) || '%'
    )
    and (
      p_before_reporting_date is null
      or (
        coalesce(candidate_rows.reporting_date, date '0001-01-01'), candidate_rows.id
      ) < (p_before_reporting_date, p_before_id)
    )
  order by coalesce(candidate_rows.reporting_date, date '0001-01-01') desc,
    candidate_rows.id desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.save_transaction_reconciliation(
  uuid, text, text, uuid[], numeric, text, uuid, date, uuid[], text[]
) from public, anon;
grant execute on function public.save_transaction_reconciliation(
  uuid, text, text, uuid[], numeric, text, uuid, date, uuid[], text[]
) to authenticated;

revoke all on function public.delete_transaction_reconciliation(uuid)
from public, anon;
grant execute on function public.delete_transaction_reconciliation(uuid)
to authenticated;

revoke all on function public.search_transaction_reconciliation_candidates(
  text, text, date, uuid, integer, uuid
) from public, anon;
grant execute on function public.search_transaction_reconciliation_candidates(
  text, text, date, uuid, integer, uuid
) to authenticated;

comment on table public.transaction_reconciliations is
  'Finalized owner-scoped groups of bank transactions that should be financially reconciled.';

comment on table public.transaction_reconciliation_items is
  'Ordered transaction membership for finalized reconciliations; one reconciliation per transaction.';

comment on table public.transaction_reconciliation_label_assignments is
  'Labels applied to a reconciliation difference when that difference remains reportable.';
