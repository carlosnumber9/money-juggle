-- Seed the initial owner-scoped transaction category catalog.
-- The categories are created for profiles that already exist when this
-- migration runs. Future profiles can be seeded by a later explicit migration.

with seed_groups (slug, name, sort_order) as (
  values
    ('income', 'Ingresos', 10),
    ('housing_utilities', 'Vivienda y suministros', 20),
    ('groceries_household', 'Compra y hogar', 30),
    ('food_drink', 'Restauración', 40),
    ('transportation', 'Transporte', 50),
    ('health_wellness', 'Salud y bienestar', 60),
    ('shopping', 'Compras', 70),
    ('subscriptions_services', 'Suscripciones y servicios', 80),
    ('leisure_travel', 'Ocio y viajes', 90),
    ('family_personal', 'Familia y personal', 100),
    ('financial', 'Finanzas', 110),
    ('transfers_savings', 'Transferencias y ahorro', 120),
    ('uncategorized', 'Sin categorizar', 130)
),
target_profiles as (
  select id as user_id
  from public.profiles
),
upserted_groups as (
  insert into public.transaction_category_groups (
    user_id,
    name,
    slug,
    sort_order,
    is_archived
  )
  select
    target_profiles.user_id,
    seed_groups.name,
    seed_groups.slug,
    seed_groups.sort_order,
    false
  from target_profiles
  cross join seed_groups
  on conflict (user_id, slug) do update
  set
    name = excluded.name,
    sort_order = excluded.sort_order,
    is_archived = false
  returning id, user_id, slug
),
seed_categories (group_slug, slug, name, sort_order) as (
  values
    ('income', 'salary', 'Nómina', 10),
    ('income', 'freelance_income', 'Ingresos freelance', 20),
    ('income', 'dividends', 'Dividendos', 30),
    ('income', 'gifts_received', 'Regalos recibidos', 40),
    ('housing_utilities', 'rent', 'Alquiler', 10),
    ('housing_utilities', 'mortgage', 'Hipoteca', 20),
    ('housing_utilities', 'community_fees', 'Comunidad', 30),
    ('housing_utilities', 'electricity', 'Luz', 40),
    ('housing_utilities', 'gas', 'Gas', 50),
    ('housing_utilities', 'water', 'Agua', 60),
    ('housing_utilities', 'internet_mobile', 'Internet y móvil', 70),
    ('housing_utilities', 'home_insurance', 'Seguro de hogar', 80),
    ('housing_utilities', 'home_repairs', 'Reparaciones del hogar', 90),
    ('groceries_household', 'groceries', 'Supermercado', 10),
    ('food_drink', 'restaurants_bars', 'Restaurantes y bares', 10),
    ('food_drink', 'takeaway_delivery', 'Comida a domicilio', 20),
    ('transportation', 'public_transport', 'Transporte público', 10),
    ('transportation', 'fuel', 'Combustible', 20),
    ('transportation', 'parking_tolls', 'Parking y peajes', 30),
    ('transportation', 'taxi_rideshare', 'Taxi y VTC', 40),
    ('transportation', 'vehicle_maintenance', 'Mantenimiento vehículo', 50),
    ('transportation', 'vehicle_insurance', 'Seguro vehículo', 60),
    ('health_wellness', 'medical', 'Médico', 10),
    ('health_wellness', 'pharmacy', 'Farmacia', 20),
    ('health_wellness', 'gym_sports', 'Gimnasio y deporte', 30),
    ('shopping', 'clothing', 'Ropa', 10),
    ('shopping', 'electronics', 'Electrónica', 20),
    ('shopping', 'home_goods', 'Artículos del hogar', 30),
    ('shopping', 'gifts', 'Regalos', 40),
    ('subscriptions_services', 'streaming', 'Streaming', 10),
    ('subscriptions_services', 'software_apps', 'Software y apps', 20),
    ('subscriptions_services', 'cloud_services', 'Servicios cloud', 30),
    ('leisure_travel', 'entertainment', 'Ocio', 10),
    ('leisure_travel', 'books_culture', 'Libros y cultura', 20),
    ('leisure_travel', 'hotels', 'Hoteles', 30),
    ('leisure_travel', 'flights', 'Vuelos', 40),
    ('family_personal', 'donations', 'Donaciones', 10),
    ('financial', 'bank_fees', 'Comisiones bancarias', 10),
    ('financial', 'loan_payment', 'Préstamos', 20),
    ('financial', 'cash_withdrawal', 'Retirada de efectivo', 30),
    ('financial', 'taxes', 'Impuestos', 40),
    ('transfers_savings', 'internal_transfer', 'Transferencia interna', 10),
    ('transfers_savings', 'savings_transfer', 'Ahorro', 20),
    ('transfers_savings', 'investment_transfer', 'Inversión', 30),
    ('uncategorized', 'uncategorized', 'Sin categorizar', 10)
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
  target_profiles.user_id,
  upserted_groups.id,
  seed_categories.name,
  seed_categories.slug,
  seed_categories.sort_order,
  false
from target_profiles
join seed_categories on true
join upserted_groups
  on upserted_groups.user_id = target_profiles.user_id
  and upserted_groups.slug = seed_categories.group_slug
on conflict (user_id, slug) do update
set
  group_id = excluded.group_id,
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_archived = false;
