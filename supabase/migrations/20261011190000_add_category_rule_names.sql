begin;

alter table public.category_rules add column name text;

-- Preserve rule versions, activation dates and timestamps during backfill.
alter table public.category_rules disable trigger category_rules_prepare;
update public.category_rules set name = value;
alter table public.category_rules enable trigger category_rules_prepare;

alter table public.category_rules
  alter column name set not null,
  add constraint category_rules_name_check check (length(btrim(name)) between 1 and 300);

create or replace function public.prepare_category_rule() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.value := btrim(regexp_replace(lower(new.value), '\s+', ' ', 'g'));
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.id <> old.id then
      raise exception 'Rule ownership is immutable.' using errcode = '22023';
    end if;
    new.name := btrim(new.name);
    new.version := old.version + 1;
  else
    new.name := btrim(coalesce(new.name, new.value));
    new.version := 1;
  end if;
  if new.status = 'active' then
    if not exists (select 1 from public.transaction_categories c where c.id = new.category_id and c.user_id = new.user_id and not c.is_archived and c.slug <> 'internal_transfer') then
      raise exception 'Category is unavailable.' using errcode = '22023';
    end if;
    if tg_op = 'UPDATE' and
      row(new.status,new.category_id,new.account_id,new.field,new.operator,new.value,new.currency,new.direction)
      is not distinct from
      row(old.status,old.category_id,old.account_id,old.field,old.operator,old.value,old.currency,old.direction) then
      -- A display-only rename must not move the future-assignment boundary.
      new.activated_at := old.activated_at;
    else
      new.activated_at := statement_timestamp();
    end if;
  end if;
  new.updated_at := statement_timestamp();
  return new;
end $$;

commit;
