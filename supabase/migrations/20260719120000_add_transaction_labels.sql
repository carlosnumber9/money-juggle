-- Add owner-scoped labels for optional cross-category transaction grouping.

alter table public.transactions
  add constraint transactions_id_user_unique unique (id, user_id);

create table public.transaction_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  normalized_name text generated always as (
    lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
  ) stored,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_labels_id_user_unique unique (id, user_id),
  constraint transaction_labels_user_normalized_name_unique unique (
    user_id,
    normalized_name
  ),
  constraint transaction_labels_name_length_check check (
    char_length(name) between 1 and 80
  ),
  constraint transaction_labels_name_normalized_check check (
    name = regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')
  )
);

create table public.transaction_label_assignments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid not null,
  label_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (transaction_id, label_id),
  constraint transaction_label_assignments_transaction_owner_fk foreign key (
    transaction_id,
    user_id
  ) references public.transactions(id, user_id) on delete cascade,
  constraint transaction_label_assignments_label_owner_fk foreign key (
    label_id,
    user_id
  ) references public.transaction_labels(id, user_id) on delete cascade
);

create index transaction_label_assignments_user_label_idx
  on public.transaction_label_assignments (user_id, label_id);

create trigger transaction_labels_set_updated_at
before update on public.transaction_labels
for each row execute function public.set_updated_at();

alter table public.transaction_labels enable row level security;
alter table public.transaction_label_assignments enable row level security;

create policy "Users can read their own transaction labels"
on public.transaction_labels for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own transaction labels"
on public.transaction_labels for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own transaction labels"
on public.transaction_labels for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can read their own transaction label assignments"
on public.transaction_label_assignments for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own transaction label assignments"
on public.transaction_label_assignments for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can remove their own transaction label assignments"
on public.transaction_label_assignments for delete
to authenticated
using (user_id = auth.uid());

comment on table public.transaction_labels is
  'User-owned labels for optional cross-category transaction grouping.';

comment on table public.transaction_label_assignments is
  'Owner-scoped many-to-many assignments between transactions and labels.';
