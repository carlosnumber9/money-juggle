alter table public.transactions
add column reporting_date date;

update public.transactions
set reporting_date = booking_date
where reporting_date is null;

create index transactions_user_id_reporting_date_idx
  on public.transactions (user_id, reporting_date desc);
