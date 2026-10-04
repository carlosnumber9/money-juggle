-- Read reconciliation states without encoding transaction IDs in a GET URL.
create function public.get_transaction_reconciliation_states(
  p_user_id uuid,
  p_transaction_ids uuid[]
)
returns table (
  transaction_id uuid,
  reconciliation_id uuid,
  difference_treatment text,
  requires_review boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with requested_memberships as materialized (
    select items.transaction_id, items.reconciliation_id, items.user_id
    from public.transaction_reconciliation_items as items
    where items.user_id = p_user_id
      and items.user_id = (select auth.uid())
      and items.transaction_id = any(coalesce(p_transaction_ids, '{}'::uuid[]))
  ),
  balances as (
    -- Include every member, even when only one transaction or month is requested.
    select items.reconciliation_id, sum(transactions.amount) as balance
    from public.transaction_reconciliation_items as items
    join public.transactions as transactions
      on transactions.id = items.transaction_id
      and transactions.user_id = items.user_id
    where items.user_id = p_user_id
      and items.reconciliation_id in (
        select requested.reconciliation_id
        from requested_memberships as requested
      )
    group by items.reconciliation_id
  )
  select
    requested.transaction_id,
    requested.reconciliation_id,
    reconciliations.difference_treatment,
    reconciliations.difference_treatment = 'none' and balances.balance <> 0
  from requested_memberships as requested
  join public.transaction_reconciliations as reconciliations
    on reconciliations.id = requested.reconciliation_id
    and reconciliations.user_id = requested.user_id
  join balances
    on balances.reconciliation_id = requested.reconciliation_id;
$$;

revoke all on function public.get_transaction_reconciliation_states(uuid, uuid[])
  from public, anon;
grant execute on function public.get_transaction_reconciliation_states(uuid, uuid[])
  to authenticated;

comment on function public.get_transaction_reconciliation_states(uuid, uuid[]) is
  'Read owner-scoped reconciliation membership and full-group review states through POST RPC.';
