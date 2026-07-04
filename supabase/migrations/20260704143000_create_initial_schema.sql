create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_institution_id text not null,
  name text not null,
  country text,
  logo_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutions_status_check check (
    status in ('active', 'unavailable', 'unknown')
  ),
  constraint institutions_country_check check (
    country is null or country ~ '^[A-Z]{2}$'
  ),
  constraint institutions_provider_identifier_unique unique (
    provider,
    provider_institution_id
  )
);

create table public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid not null references public.institutions(id),
  provider text not null,
  provider_requisition_id text,
  provider_agreement_id text,
  status text not null default 'created',
  consent_expires_at timestamptz,
  redirect_url text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_connections_status_check check (
    status in ('created', 'linking', 'linked', 'expired', 'error', 'revoked')
  ),
  constraint bank_connections_id_user_unique unique (id, user_id)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_connection_id uuid not null,
  provider_account_id text not null,
  name text not null,
  iban_last4 text,
  currency text not null,
  account_type text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_connection_owner_fk foreign key (
    bank_connection_id,
    user_id
  ) references public.bank_connections(id, user_id) on delete cascade,
  constraint accounts_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint accounts_iban_last4_check check (
    iban_last4 is null or iban_last4 ~ '^[A-Za-z0-9]{4}$'
  ),
  constraint accounts_status_check check (
    status in ('active', 'inactive', 'closed', 'error')
  ),
  constraint accounts_id_user_unique unique (id, user_id),
  constraint accounts_provider_account_unique unique (
    user_id,
    bank_connection_id,
    provider_account_id
  )
);

create table public.transaction_category_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_category_groups_id_user_unique unique (id, user_id),
  constraint transaction_category_groups_slug_unique unique (user_id, slug)
);

create table public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null,
  name text not null,
  slug text not null,
  color text,
  icon text,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_categories_group_owner_fk foreign key (
    group_id,
    user_id
  ) references public.transaction_category_groups(id, user_id) on delete restrict,
  constraint transaction_categories_id_user_unique unique (id, user_id),
  constraint transaction_categories_slug_unique unique (user_id, slug)
);

create table public.balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null,
  balance_type text not null,
  amount numeric(20, 6) not null,
  currency text not null,
  reference_date date,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint balances_account_owner_fk foreign key (
    account_id,
    user_id
  ) references public.accounts(id, user_id) on delete cascade,
  constraint balances_currency_check check (currency ~ '^[A-Z]{3}$')
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null,
  stable_import_key text not null,
  identity_source text not null,
  provider text not null,
  provider_transaction_id text,
  provider_internal_transaction_id text,
  entry_reference text,
  end_to_end_id text,
  deduplication_fingerprint text,
  booking_status text not null,
  booking_date date,
  booking_datetime timestamptz,
  value_date date,
  value_datetime timestamptz,
  amount numeric(20, 6) not null,
  currency text not null,
  description text,
  merchant_name text,
  counterparty_name text,
  counterparty_account_last4 text,
  bank_transaction_code text,
  merchant_category_code text,
  category_id uuid,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_account_owner_fk foreign key (
    account_id,
    user_id
  ) references public.accounts(id, user_id) on delete cascade,
  constraint transactions_category_owner_fk foreign key (
    category_id,
    user_id
  ) references public.transaction_categories(id, user_id) on delete restrict,
  constraint transactions_booking_status_check check (
    booking_status in ('booked', 'pending', 'information')
  ),
  constraint transactions_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint transactions_counterparty_last4_check check (
    counterparty_account_last4 is null
    or counterparty_account_last4 ~ '^[A-Za-z0-9]{4}$'
  ),
  constraint transactions_identity_unique unique (
    user_id,
    account_id,
    stable_import_key
  )
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_connection_id uuid not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  constraint sync_runs_connection_owner_fk foreign key (
    bank_connection_id,
    user_id
  ) references public.bank_connections(id, user_id) on delete cascade,
  constraint sync_runs_status_check check (
    status in ('running', 'succeeded', 'failed', 'partial')
  )
);

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_connection_id uuid not null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  provider_status text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  constraint consent_events_connection_owner_fk foreign key (
    bank_connection_id,
    user_id
  ) references public.bank_connections(id, user_id) on delete cascade,
  constraint consent_events_type_check check (
    event_type in (
      'created',
      'redirected',
      'linked',
      'expired',
      'reconnected',
      'revoked',
      'failed'
    )
  )
);

create unique index bank_connections_provider_requisition_unique
  on public.bank_connections (user_id, provider, provider_requisition_id)
  where provider_requisition_id is not null;

create index bank_connections_user_id_idx
  on public.bank_connections (user_id);

create index accounts_user_id_idx
  on public.accounts (user_id);

create index balances_account_id_fetched_at_idx
  on public.balances (account_id, fetched_at desc);

create index transactions_account_id_booking_date_idx
  on public.transactions (account_id, booking_date desc);

create unique index transactions_provider_internal_id_unique
  on public.transactions (user_id, account_id, provider_internal_transaction_id)
  where provider_internal_transaction_id is not null;

create unique index transactions_provider_transaction_id_unique
  on public.transactions (user_id, account_id, provider_transaction_id)
  where provider_transaction_id is not null;

create index transactions_category_id_idx
  on public.transactions (category_id)
  where category_id is not null;

create index sync_runs_connection_started_at_idx
  on public.sync_runs (bank_connection_id, started_at desc);

create index consent_events_connection_occurred_at_idx
  on public.consent_events (bank_connection_id, occurred_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger institutions_set_updated_at
before update on public.institutions
for each row execute function public.set_updated_at();

create trigger bank_connections_set_updated_at
before update on public.bank_connections
for each row execute function public.set_updated_at();

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger transaction_category_groups_set_updated_at
before update on public.transaction_category_groups
for each row execute function public.set_updated_at();

create trigger transaction_categories_set_updated_at
before update on public.transaction_categories
for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.bank_connections enable row level security;
alter table public.accounts enable row level security;
alter table public.balances enable row level security;
alter table public.transaction_category_groups enable row level security;
alter table public.transaction_categories enable row level security;
alter table public.transactions enable row level security;
alter table public.sync_runs enable row level security;
alter table public.consent_events enable row level security;

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Authenticated users can read institutions"
on public.institutions for select
to authenticated
using (true);

create policy "Users can read their own bank connections"
on public.bank_connections for select
to authenticated
using (user_id = auth.uid());

create policy "Users can read their own accounts"
on public.accounts for select
to authenticated
using (user_id = auth.uid());

create policy "Users can read their own balances"
on public.balances for select
to authenticated
using (user_id = auth.uid());

create policy "Users can read their own transactions"
on public.transactions for select
to authenticated
using (user_id = auth.uid());

create policy "Users can read their own sync runs"
on public.sync_runs for select
to authenticated
using (user_id = auth.uid());

create policy "Users can read their own consent events"
on public.consent_events for select
to authenticated
using (user_id = auth.uid());

create policy "Users can read their own category groups"
on public.transaction_category_groups for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own category groups"
on public.transaction_category_groups for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own category groups"
on public.transaction_category_groups for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own category groups"
on public.transaction_category_groups for delete
to authenticated
using (user_id = auth.uid());

create policy "Users can read their own categories"
on public.transaction_categories for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own categories"
on public.transaction_categories for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own categories"
on public.transaction_categories for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own categories"
on public.transaction_categories for delete
to authenticated
using (user_id = auth.uid());

comment on table public.profiles is
  'Application-owned user profile linked to Supabase Auth.';
comment on table public.institutions is
  'Global reference list of banks and financial platforms.';
comment on table public.bank_connections is
  'User-owned PSD2 consent and requisition state.';
comment on table public.accounts is
  'User-owned linked bank accounts from provider data.';
comment on table public.balances is
  'User-owned account balance snapshots.';
comment on table public.transactions is
  'User-owned normalized transactions with stable sync identity.';
comment on table public.transaction_category_groups is
  'User-owned transaction category groups for reporting.';
comment on table public.transaction_categories is
  'User-owned transaction categories for app-owned reporting metadata.';
comment on table public.sync_runs is
  'User-owned synchronization attempt history.';
comment on table public.consent_events is
  'User-owned PSD2 consent lifecycle event history.';
