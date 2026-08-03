alter table public.bank_connections
  add column sync_lease_token uuid,
  add column sync_lease_until timestamptz,
  add constraint bank_connections_sync_lease_pair_check check (
    (sync_lease_token is null and sync_lease_until is null)
    or (sync_lease_token is not null and sync_lease_until is not null)
  );

comment on column public.bank_connections.sync_lease_token is
  'Opaque server-generated token identifying the current synchronization lease holder.';
comment on column public.bank_connections.sync_lease_until is
  'Short server-managed synchronization lease deadline; expired leases may be replaced atomically.';
