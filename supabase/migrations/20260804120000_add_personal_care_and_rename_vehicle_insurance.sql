-- Add personal care to the owner-scoped category catalog and use a more
-- specific Spanish display name for the existing vehicle insurance category.

with category_updates (group_slug, slug, name, sort_order) as (
  values
    ('health_wellness', 'hair_beauty', 'Peluquería y belleza', 40),
    ('transportation', 'vehicle_insurance', 'Seguro de automóvil', 60)
)
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
  category_updates.name,
  category_updates.slug,
  category_updates.sort_order,
  false
from public.transaction_category_groups as category_groups
join category_updates
  on category_updates.group_slug = category_groups.slug
on conflict (user_id, slug) do update
set
  group_id = excluded.group_id,
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_archived = false;
