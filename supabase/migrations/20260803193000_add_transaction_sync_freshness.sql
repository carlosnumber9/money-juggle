alter table public.bank_connections
  add column last_transaction_synced_at timestamptz;

update public.bank_connections as connection
set last_transaction_synced_at = latest.finished_at
from (
  select bank_connection_id, max(finished_at) as finished_at
  from public.sync_runs
  where status in ('succeeded', 'partial')
    and metadata ->> 'kind' = 'transactions'
    and finished_at is not null
  group by bank_connection_id
) as latest
where connection.id = latest.bank_connection_id;

comment on column public.bank_connections.last_transaction_synced_at is
  'Latest successful or partially successful incremental transaction synchronization timestamp.';
