-- Add a category for settlements that combine multiple shared expense types,
-- such as incoming or outgoing Tricount balance payments.

insert into public.transaction_categories (
  user_id,
  group_id,
  name,
  slug,
  sort_order,
  is_archived
)
select
  category_groups.user_id,
  category_groups.id,
  'Liquidación de gastos compartidos',
  'shared_expense_settlement',
  50,
  false
from public.transaction_category_groups as category_groups
where category_groups.slug = 'financial'
on conflict (user_id, slug) do update
set
  group_id = excluded.group_id,
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_archived = false;
