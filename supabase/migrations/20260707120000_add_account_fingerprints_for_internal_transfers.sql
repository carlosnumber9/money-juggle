alter table public.accounts
  add column iban_fingerprint text;

alter table public.transactions
  add column counterparty_account_fingerprint text;

alter table public.accounts
  add constraint accounts_iban_fingerprint_check check (
    iban_fingerprint is null
    or iban_fingerprint ~ '^[a-f0-9]{64}$'
  );

alter table public.transactions
  add constraint transactions_counterparty_account_fingerprint_check check (
    counterparty_account_fingerprint is null
    or counterparty_account_fingerprint ~ '^[a-f0-9]{64}$'
  );

create index accounts_user_iban_fingerprint_idx
  on public.accounts (user_id, iban_fingerprint)
  where iban_fingerprint is not null;

create index transactions_user_counterparty_account_fingerprint_idx
  on public.transactions (user_id, counterparty_account_fingerprint)
  where counterparty_account_fingerprint is not null;

comment on column public.accounts.iban_fingerprint is
  'Server-generated HMAC fingerprint of the account identifier for internal transfer matching. The full IBAN is not stored.';

comment on column public.transactions.counterparty_account_fingerprint is
  'Server-generated HMAC fingerprint of the counterparty account identifier for internal transfer matching. The full counterparty IBAN is not stored.';
