-- Add fines to the existing owner-scoped financial category group.

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
  'Multas',
  'fines',
  60,
  false
from public.transaction_category_groups as category_groups
where category_groups.slug = 'financial'
on conflict (user_id, slug) do update
set
  group_id = excluded.group_id,
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_archived = false;
