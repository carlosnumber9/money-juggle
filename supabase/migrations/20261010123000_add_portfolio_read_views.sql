-- Return exact decimals as JSON strings while preserving the underlying owner RLS.
create view public.portfolio_snapshot_values with (security_invoker = true) as
select id, user_id, platform, report_date, currency, cash::text as cash,
  investments::text as investments, revision
from public.portfolio_snapshots;
create view public.portfolio_position_values with (security_invoker = true) as
select snapshot_id, user_id, isin, name, quantity::text as quantity,
  price::text as price, price_date, value::text as value
from public.portfolio_positions;
revoke all on public.portfolio_snapshot_values, public.portfolio_position_values from public, anon;
grant select on public.portfolio_snapshot_values, public.portfolio_position_values to authenticated;
