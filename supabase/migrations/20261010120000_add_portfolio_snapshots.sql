create table public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null default 'trade-republic' check (platform = 'trade-republic'),
  report_date date not null,
  currency text not null check (currency = 'EUR'),
  cash numeric(20,6) not null,
  investments numeric(20,6) not null check (investments >= 0),
  revision uuid not null default gen_random_uuid(),
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  parser_version text not null,
  original_values jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, platform, report_date)
);

create table public.portfolio_positions (
  snapshot_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  isin text not null check (isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  name text not null check (length(btrim(name)) between 1 and 250),
  quantity numeric(20,6) not null check (quantity >= 0),
  price numeric(20,6) not null check (price >= 0),
  price_date date not null,
  value numeric(20,6) not null check (value >= 0),
  primary key (snapshot_id, isin),
  foreign key (snapshot_id, user_id)
    references public.portfolio_snapshots(id, user_id) on delete cascade
);

create table public.portfolio_import_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  original_values jsonb not null,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  parser_version text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  confirmed_snapshot_id uuid,
  foreign key (confirmed_snapshot_id, user_id)
    references public.portfolio_snapshots(id, user_id) on delete cascade
);

create index portfolio_import_drafts_owner_expiry_idx
  on public.portfolio_import_drafts(user_id, expires_at);
create index portfolio_positions_owner_idx on public.portfolio_positions(user_id);

alter table public.portfolio_snapshots enable row level security;
alter table public.portfolio_positions enable row level security;
alter table public.portfolio_import_drafts enable row level security;

grant select, insert, update, delete on public.portfolio_snapshots,
  public.portfolio_positions, public.portfolio_import_drafts to authenticated;

create policy "Owners manage portfolio snapshots" on public.portfolio_snapshots
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Owners manage portfolio positions" on public.portfolio_positions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Owners manage portfolio drafts" on public.portfolio_import_drafts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create function public.confirm_portfolio_import(
  p_draft_id uuid,
  p_values jsonb,
  p_expected_revision uuid,
  p_replace boolean
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_draft public.portfolio_import_drafts%rowtype;
  v_snapshot public.portfolio_snapshots%rowtype;
  v_date date;
  v_cash numeric(20,6);
  v_investments numeric(20,6);
  v_row jsonb;
  v_positions jsonb;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  select * into v_draft from public.portfolio_import_drafts
    where id = p_draft_id and user_id = v_user_id for update;
  if not found or v_draft.expires_at <= now() then
    raise exception 'Draft expired or unavailable.' using errcode = 'P0002';
  end if;
  if v_draft.confirmed_snapshot_id is not null then
    return v_draft.confirmed_snapshot_id;
  end if;
  if jsonb_typeof(p_values) is distinct from 'object'
    or p_values->>'currency' is distinct from 'EUR'
    or coalesce(p_values->>'reportDate', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or coalesce(p_values->>'cash', '') !~ '^[+-]?\d+(\.\d{1,6})?$'
    or jsonb_typeof(p_values->'positions') is distinct from 'array' then
    raise exception 'Invalid portfolio.' using errcode = '22023';
  end if;
  v_date := (p_values->>'reportDate')::date;
  v_cash := (p_values->>'cash')::numeric;
  v_positions := p_values->'positions';
  if jsonb_array_length(v_positions) > 500 then
    raise exception 'Too many positions.' using errcode = '22023';
  end if;
  for v_row in select value from jsonb_array_elements(v_positions) loop
    if coalesce(v_row->>'isin', '') !~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'
      or coalesce(length(btrim(v_row->>'name')), 0) not between 1 and 250
      or coalesce(v_row->>'quantity', '') !~ '^\d+(\.\d{1,6})?$'
      or coalesce(v_row->>'price', '') !~ '^\d+(\.\d{1,6})?$'
      or coalesce(v_row->>'value', '') !~ '^\d+(\.\d{1,6})?$'
      or coalesce(v_row->>'priceDate', '') !~ '^\d{4}-\d{2}-\d{2}$'
      or (v_row->>'priceDate')::date > v_date then
      raise exception 'Invalid position.' using errcode = '22023';
    end if;
  end loop;
  if (select count(distinct value->>'isin') from jsonb_array_elements(v_positions))
    <> jsonb_array_length(v_positions) then
    raise exception 'Duplicate ISIN.' using errcode = '22023';
  end if;
  select coalesce(sum((value->>'value')::numeric), 0) into v_investments
    from jsonb_array_elements(v_positions);

  -- Serialize dates even when no snapshot exists yet. Draft row locks handle retries.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_date::text, 0));
  select * into v_snapshot from public.portfolio_snapshots
    where user_id = v_user_id and platform = 'trade-republic' and report_date = v_date
    for update;
  if v_snapshot.revision is distinct from p_expected_revision then
    raise exception 'Snapshot changed during review.' using errcode = '40001';
  end if;
  if v_snapshot.id is not null and p_replace is distinct from true then
    raise exception 'Replacement confirmation required.' using errcode = '40001';
  end if;
  if v_snapshot.id is null then
    insert into public.portfolio_snapshots (
      user_id, report_date, currency, cash, investments, source_hash, parser_version, original_values
    ) values (
      v_user_id, v_date, 'EUR', v_cash, v_investments,
      v_draft.source_hash, v_draft.parser_version, v_draft.original_values
    ) returning id into v_id;
  else
    v_id := v_snapshot.id;
    update public.portfolio_snapshots set cash = v_cash, investments = v_investments,
      revision = gen_random_uuid(), updated_at = now(), source_hash = v_draft.source_hash,
      parser_version = v_draft.parser_version, original_values = v_draft.original_values
      where id = v_id and user_id = v_user_id;
    delete from public.portfolio_positions where snapshot_id = v_id and user_id = v_user_id;
  end if;
  insert into public.portfolio_positions (snapshot_id, user_id, isin, name, quantity, price, price_date, value)
    select v_id, v_user_id, value->>'isin', btrim(value->>'name'),
      (value->>'quantity')::numeric, (value->>'price')::numeric,
      (value->>'priceDate')::date, (value->>'value')::numeric
    from jsonb_array_elements(v_positions);
  update public.portfolio_import_drafts set confirmed_snapshot_id = v_id
    where id = p_draft_id and user_id = v_user_id;
  return v_id;
end;
$$;

revoke all on function public.confirm_portfolio_import(uuid, jsonb, uuid, boolean) from public, anon;
grant execute on function public.confirm_portfolio_import(uuid, jsonb, uuid, boolean) to authenticated;
