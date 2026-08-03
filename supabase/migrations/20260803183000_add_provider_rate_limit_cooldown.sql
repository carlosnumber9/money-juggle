alter table public.bank_connections
  add column provider_rate_limited_until timestamptz;

comment on column public.bank_connections.provider_rate_limited_until is
  'Server-managed deadline before which provider account-data requests must be skipped after a rate limit.';
