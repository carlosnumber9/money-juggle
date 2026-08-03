# Data Model

This document describes the initial data model for `money-juggle`.

The executable schema is defined by the local migration chain:

- `supabase/migrations/20260704143000_create_initial_schema.sql`
- `supabase/migrations/20260704170000_add_enable_banking_connection_fields.sql`
- `supabase/migrations/20260707120000_add_account_fingerprints_for_internal_transfers.sql`
- `supabase/migrations/20260709120000_seed_initial_transaction_categories.sql`
- `supabase/migrations/20260719120000_add_transaction_labels.sql`
- `supabase/migrations/20260719214000_add_shared_expense_settlement_category.sql`

The model should preserve user ownership even though the app starts as a personal project.

## Ownership Principle

Financial rows should be owned by a Supabase Auth user through `user_id`. RLS policies should enforce access by owner.

Shared reference rows, such as institutions, may be global if they do not contain user-specific financial data.

## Implemented Schema Scope

The current migrations create the smallest useful schema for PSD2 bank
connections, account data, balance snapshots, transactions, categorization, sync
observability, internal transfer matching, and the initial owner-scoped category
catalog.

Included tables:

- `profiles`
- `institutions`
- `bank_connections`
- `accounts`
- `balances`
- `transactions`
- `transaction_category_groups`
- `transaction_categories`
- `transaction_labels`
- `transaction_label_assignments`
- `sync_runs`
- `consent_events`

Deferred tables:

- `transaction_category_rules`: useful later, after manual categorization exists.
- Cobee integration tables: useful later after API access and desired
  consumption granularity are confirmed.
- `manual_assets`: useful later for Trade Republic and other non-PSD2 assets.
- Report cache or materialized report tables.
- Advanced sync scheduler metadata.

The first migration also enables RLS for every table it creates. User-owned
tables use `user_id = auth.uid()` policies. Global `institutions` rows are
readable by authenticated users only.

Financial provider-owned tables such as `bank_connections`, `accounts`,
`balances`, `transactions`, `sync_runs`, and `consent_events` expose read
policies to authenticated owners. Provider writes are performed by controlled
server-only flows that validate ownership before using elevated Supabase access.
User-managed category and label tables use owner-scoped policies. Label
assignments additionally use composite ownership foreign keys so a transaction
cannot reference another user's label.

The first manual categorization slice updates only `transactions.category_id`
through a server action. That action validates the current Supabase user and
email allowlist, verifies that any selected category belongs to the same owner,
and then updates the owner-scoped transaction row.

Detailed RLS checks with representative rows are deferred until the features
that create those rows exist. The initial migration still enables RLS from day
one so no financial table starts in a public-by-default state.

## Initial Schema Constraints

Important constraints in the first migration:

- User-owned child rows use foreign keys that include `user_id` where useful, so
  rows cannot accidentally point to another user's parent record.
- `transactions` has a unique identity on `user_id`, `account_id`, and
  `stable_import_key`.
- `transactions` also has partial unique indexes for provider transaction IDs
  when those IDs are present.
- Full IBAN values are not stored; `accounts.iban_last4` keeps only the last
  four characters.
- Account identifier fingerprints are stored as server-generated HMAC values
  when the server-only fingerprint secret is configured. They support internal
  transfer matching without storing the full IBAN.
- Amounts use `numeric(20, 6)` rather than floating point.
- Currency values are constrained to three uppercase letters.
- Category groups and categories are user-owned and unique by `user_id` and
  `slug`.
- Labels are user-owned and unique by `user_id` and a whitespace-normalized,
  case-insensitive name. A transaction may have zero or multiple labels.
- The initial category catalog is seeded for profiles that already exist when
  `20260709120000_seed_initial_transaction_categories.sql` runs. Category
  display names are Spanish; slugs remain English.
- `20260719214000_add_shared_expense_settlement_category.sql` adds
  `shared_expense_settlement` under the financial group for incoming or outgoing
  settlements that combine multiple shared expense types. A label can preserve
  the trip or event context without forcing the movement into one expense
  category.

## Entities

### `auth.users`

Purpose:

- Supabase-managed authentication users.
- This table is owned by Supabase Auth, not by application migrations.

Probable fields:

- `id`.
- `email`.
- Authentication metadata managed by Supabase.

Relationships:

- Referenced by `profiles.id`.
- Referenced by user-owned financial tables through `user_id`.

Ownership model:

- Represents the authenticated identity.

Security and RLS:

- Do not treat `auth.users` as an ordinary application table.
- Application tables should reference `auth.uid()` in RLS policies.

Source:

- Supabase Auth.

### `profiles`

Purpose:

- Stores app-specific user profile data linked to Supabase Auth.

Probable fields:

- `id`: same value as Supabase Auth user ID.
- `email`.
- `display_name`.
- `created_at`.
- `updated_at`.

Relationships:

- Owns `bank_connections`, `accounts`, `manual_assets`, and imported financial data through `user_id`.

Ownership model:

- One profile per authenticated user.

Security and RLS:

- User can read and update only their own profile.

Source:

- Supabase Auth and minimal app-managed metadata.

### `institutions`

Purpose:

- Represents banks or platforms that can be connected or tracked.

Probable fields:

- `id`.
- `provider`: for example `enable_banking` or `manual`.
- `provider_institution_id`.
- `name`.
- `country`.
- `logo_url`.
- `status`.
- `created_at`.
- `updated_at`.

Relationships:

- Referenced by `bank_connections`.

Ownership model:

- Usually global reference data, not owned by a single user.

Security and RLS:

- Can be publicly readable if it contains only non-sensitive reference data.
- Writes should be server-controlled.

Source:

- Enable Banking ASPSP list or app-managed reference data.

### `bank_connections`

Purpose:

- Tracks a user's consent-based connection to an institution.

Probable fields:

- `id`.
- `user_id`.
- `institution_id`.
- `provider`.
- `provider_requisition_id`: current first-migration name; originally chosen
  for GoCardless. It should be treated as a generic external authorization or
  session identifier until a future migration renames it.
- `provider_agreement_id`: current first-migration name; originally chosen for
  GoCardless. It may become unnecessary or be renamed once the Enable Banking
  flow is implemented.
- `provider_authorization_id`: Enable Banking authorization identifier returned
  by `POST /auth`.
- `provider_session_id`: Enable Banking session identifier returned by
  `POST /sessions`.
- `provider_state`: app-generated callback state used to verify that the
  callback belongs to a connection initiated by the same user.
- `provider_psu_id_hash`: Enable Banking hash for the app-provided PSU ID.
- `provider_metadata`: small provider-specific operational metadata for consent
  management. This should not become a raw payload dump.
- `status`: for example `created`, `linked`, `expired`, `error`, `revoked`.
- `consent_expires_at`.
- `redirect_url`.
- `last_synced_at`.
- `last_transaction_synced_at`: last successful or partially successful
  incremental transaction refresh, used for automatic freshness checks.
- `provider_rate_limited_until`: server-managed cooldown shared by balance and
  transaction synchronization after the ASPSP rejects account-data requests.
- `sync_lease_token` and `sync_lease_until`: short-lived server-managed lease
  preventing overlapping provider work for the same bank connection.
- `created_at`.
- `updated_at`.

Relationships:

- Belongs to `profiles`.
- References `institutions`.
- Has many `accounts`, `sync_runs`, and `consent_events`.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read their own connections.
- Writes should usually happen through server-side flows.
- Provider identifiers are sensitive operational data and should not be overexposed.

Source:

- Enable Banking account information authorization flows.

### `accounts`

Purpose:

- Represents linked bank accounts.

Probable fields:

- `id`.
- `user_id`.
- `bank_connection_id`.
- `provider_account_id`.
- `name`.
- `iban_last4`.
- `iban_fingerprint`: nullable server-generated HMAC fingerprint used for
  internal transfer matching.
- `currency`.
- `account_type`.
- `status`.
- `created_at`.
- `updated_at`.

Relationships:

- Belongs to `bank_connections`.
- Has many `balances` and `transactions`.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read only their own accounts.
- Avoid storing full IBAN unless there is a clear need.

Source:

- Enable Banking account details.

### `balances`

Purpose:

- Stores balance snapshots for accounts.

Probable fields:

- `id`.
- `user_id`.
- `account_id`.
- `balance_type`.
- `amount`.
- `currency`.
- `reference_date`.
- `fetched_at`.
- `created_at`.

Relationships:

- Belongs to `accounts`.
- May be associated with a `sync_run`.

Latest balance selection:

- Balance sync stores provider responses as append-only snapshots.
- The app displays the newest snapshot per account by `fetched_at`.
- When multiple balance types are fetched at the same time, display selection
  prefers booked/available balance types before informational or opening
  balances.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read only their own balance rows.
- Inserts should be server-controlled during sync.

Source:

- Enable Banking balances endpoint.

### `transactions`

Purpose:

- Stores account transaction history.
- Provides the normalized transaction rows used by reports and categorization.
- Keeps enough provider identity data to make repeated syncs idempotent.

Probable fields:

- `id`.
- `user_id`.
- `account_id`.
- `stable_import_key`.
- `identity_source`: for example `provider_internal`, `bank_transaction`, `bank_entry_reference`, `bank_end_to_end`, or `fingerprint`.
- `provider`: for example `enable_banking`.
- `provider_transaction_id`.
- `provider_internal_transaction_id`.
- `entry_reference`.
- `end_to_end_id`.
- `deduplication_fingerprint`.
- `booking_status`: for example `booked`, `pending`, or `information`.
- `booking_date`.
- `booking_datetime`.
- `value_date`.
- `value_datetime`.
- `amount`.
- `currency`.
- `description`.
- `merchant_name`.
- `counterparty_name`.
- `counterparty_account_last4`.
- `counterparty_account_fingerprint`: nullable server-generated HMAC
  fingerprint used for internal transfer matching.
- `bank_transaction_code`.
- `merchant_category_code`.
- `category_id`: nullable, because imported transactions should start uncategorized.
- `raw_data` or a limited `raw_provider_data` object, only if useful.
- `first_seen_at`.
- `last_seen_at`.
- `created_at`.
- `updated_at`.

Relationships:

- Belongs to `accounts`.
- May be linked to `transaction_categories`.
- May be associated with one or more `sync_runs` later if sync audit detail is needed.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read only their own transactions.
- Raw provider payloads may contain sensitive details; store only what is useful.
- Deduplication should use provider IDs and account context when available.
- Inserts and sync updates should usually be server-controlled.
- User-controlled updates should be limited to user-owned metadata such as categorization, notes, or review state.

Source:

- Enable Banking transactions endpoint.

#### Transaction Identity And Deduplication

Provider transaction identity is not guaranteed to be perfect. Bank data providers such as Enable Banking may expose several transaction-related identifiers, but the useful identifiers are optional and may depend on the bank:

- Provider internal transaction ID when available.
- Bank-provided transaction ID when available.
- Bank-provided entry reference when available.
- End-to-end payment identifier when available and meaningful.

The app should therefore not depend on one external field being present for every transaction.

Recommended identity design:

- Keep `id` as the internal Supabase primary key, probably a UUID.
- Use `stable_import_key` as the app's deterministic sync identity.
- Always include the internal `account_id` in the identity scope, because external transaction identifiers may only be unique within an account.
- Store every useful external identifier separately for debugging, reconciliation, and future provider changes.
- Store `identity_source` so future maintainers can understand which rule created the current `stable_import_key`.

Recommended `stable_import_key` priority:

```text
if provider_internal_transaction_id exists:
  provider_internal:{account_id}:{provider_internal_transaction_id}

else if provider_transaction_id exists:
  bank_transaction:{account_id}:{provider_transaction_id}

else if entry_reference exists:
  bank_entry_reference:{account_id}:{entry_reference}

else if end_to_end_id exists and is meaningful:
  bank_end_to_end:{account_id}:{end_to_end_id}

else:
  fingerprint:{account_id}:{deduplication_fingerprint}
```

The `deduplication_fingerprint` should be a deterministic hash of normalized fields that are likely to remain stable, for example:

- `account_id`.
- `booking_date` or `value_date`.
- Amount in minor units.
- Currency.
- Normalized description or remittance information.
- Counterparty name when available.
- Counterparty account last 4 characters when available.
- Bank transaction code or merchant category code when available.

The exact fingerprint inputs should be implemented and tested when transaction sync is built. The implementation should normalize whitespace, casing, decimal precision, and absent fields before hashing.

The first sync implementation should use an upsert-like flow:

1. Normalize the provider transaction.
2. Compute `stable_import_key`.
3. Look for an existing transaction with the same `user_id`, `account_id`, and `stable_import_key`.
4. If found, update normalized provider fields and `last_seen_at` without overwriting user-owned categorization.
5. If not found, try reconciliation against recent same-account candidates using the external IDs and fingerprint.
6. If a compatible candidate is found, update that row and improve its identity fields.
7. If no candidate is found, insert a new row.

This matters because a transaction may first appear as pending or incomplete and later appear as booked with stronger identifiers or slightly different text/date fields.

Recommended unique constraints when migrations are eventually created:

- Unique `user_id`, `account_id`, `stable_import_key`.
- Partial unique index for `user_id`, `account_id`, `provider_internal_transaction_id` when it is not null.
- Partial unique index for `user_id`, `account_id`, `provider_transaction_id` when it is not null.

Pending transactions:

- Pending transactions may change when they become booked.
- The app may store pending rows for visibility, but should treat them as provisional.
- Permanent categorization and reports should prefer booked transactions unless pending support is intentionally designed.
- If a pending row is reconciled to a booked row, user-owned metadata should be preserved where safe.

#### App-Owned Categorization

Transaction categorization is app-owned metadata, not provider-owned data.

The app should not rely on provider categories as the source of truth. Provider fields such as merchant category codes may be useful as hints, but the user should be able to define categories according to their own mental model.

Recommended approach:

- Use a separate `transaction_category_groups` table for broad reporting groups.
- Use a separate `transaction_categories` table rather than a free-text `category` column once schema work begins.
- Link each category to one category group through `group_id`.
- Link transactions with nullable `category_id`.
- Keep category groups and categories user-owned through `user_id`.
- Let imported transactions remain uncategorized until the user assigns a category or a later explicit rule applies one.
- Do not overwrite a manually assigned category during later syncs.
- Allow future rule-based suggestions without making them mandatory.
- Do not split the category model into separate income and expense trees at first. Reports can use signed transaction amounts or transaction direction, which allows reimbursements or shared payments to reduce the net total of the same category.

#### App-Owned Labels

Transaction labels are implemented app-owned metadata for ad hoc reporting
slices.
They are different from categories:

- A category answers what kind of movement it is, such as restaurant, rent, or
  salary.
- A label answers what context the movement belongs to, such as a trip, wedding,
  house project, or one-off reimbursement.

Recommended terminology:

- Use `labels` internally.
- Use `Etiquetas` as the Spanish user-visible text.
- Avoid `tags` internally unless the UI later strongly prefers that word,
  because `labels` reads more clearly in the data model beside categories.

Recommended approach:

- Keep labels optional; most transactions should remain unlabeled.
- Store labels in a separate user-owned `transaction_labels` table.
- Store assignments in a join table such as `transaction_label_assignments`.
- Do not add a single nullable `label_id` to `transactions` unless the product
  intentionally decides that each transaction can have only one label.
- Do not let provider sync overwrite label assignments.
- Let future reports filter or group by labels across categories and
  institutions.

### `transaction_category_groups`

Purpose:

- Stores broad user-defined groups for transaction categories.
- Allows reports to roll category totals up into a simpler view.

Probable fields:

- `id`.
- `user_id`.
- `name`.
- `slug`.
- `sort_order`.
- `is_archived`.
- `created_at`.
- `updated_at`.

Relationships:

- Belongs to `profiles`.
- Has many `transaction_categories`.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read and manage only their own category groups.
- Category groups are less sensitive than transactions, but still user-owned app data.

Source:

- Initial migration seed for existing profiles.
- Manual user setup or future category management UI.

### `transaction_categories`

Purpose:

- Stores user-defined categories for transaction reporting.
- Allows fast filtering, grouping, and recategorization using simple database queries.

Probable fields:

- `id`.
- `user_id`.
- `group_id`.
- `name`.
- `slug`.
- `color`.
- `icon`.
- `sort_order`.
- `is_archived`.
- `created_at`.
- `updated_at`.

Relationships:

- Belongs to `profiles`.
- Belongs to `transaction_category_groups`.
- Has many `transactions` through `transactions.category_id`.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read and manage only their own categories.
- Category queries should ensure the referenced group belongs to the same user.
- Categories are less sensitive than transactions, but still user-owned app data.

Source:

- Initial migration seed for existing profiles.
- Manual user setup or future category management UI.

### `transaction_category_rules`

Purpose:

- Stores optional user-owned rules for suggesting or applying categories.
- Helps categorize repeated merchants or descriptions quickly without requiring machine learning.

Probable fields:

- `id`.
- `user_id`.
- `category_id`.
- `match_field`: for example `description`, `counterparty_name`, `merchant_name`, or `bank_transaction_code`.
- `operator`: for example `contains`, `equals`, or `starts_with`.
- `pattern`.
- `priority`.
- `is_active`.
- `created_at`.
- `updated_at`.

Relationships:

- Belongs to `profiles`.
- References `transaction_categories`.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read and manage only their own rules.
- Rules should never grant access to transactions; they only classify rows the user already owns.

Source:

- Manual user setup or future assisted categorization.

### `transaction_labels`

Purpose:

- Stores optional user-defined labels for ad hoc transaction grouping.
- Enables reporting across existing categories, for example all movements
  related to one trip.

Implemented fields:

- `id`.
- `user_id`.
- `name`.
- `normalized_name`.
- `is_archived`.
- `created_at`.
- `updated_at`.

Relationships:

- Belongs to `profiles`.
- Has many `transactions` through `transaction_label_assignments`.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read and manage only their own labels.
- Labels may reveal sensitive plans or events and should be treated as
  user-owned financial metadata.

Source:

- Manual user setup.

### `transaction_label_assignments`

Purpose:

- Links transactions to optional labels.
- Allows a transaction to remain unlabeled or carry multiple labels.

Implemented fields:

- `transaction_id`.
- `label_id`.
- `user_id`.
- `created_at`.

Relationships:

- Belongs to `transactions`.
- Belongs to `transaction_labels`.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can manage assignments only for their own transactions and labels.
- Composite foreign keys include `user_id` so a transaction cannot be assigned
  another user's label.

Source:

- Manual user action.

### `sync_runs`

Purpose:

- Records synchronization attempts for observability and debugging.

Probable fields:

- `id`.
- `user_id`.
- `bank_connection_id`.
- `status`: for example `running`, `succeeded`, `failed`, `partial`.
- `started_at`.
- `finished_at`.
- `error_code`.
- `error_message`.
- `metadata`.

Relationships:

- Belongs to `profiles`.
- Usually belongs to `bank_connections`.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read their own sync history.
- Error messages must not contain secrets.

Source:

- App-managed sync process.

### `consent_events`

Purpose:

- Tracks important events in the PSD2 consent lifecycle.

Probable fields:

- `id`.
- `user_id`.
- `bank_connection_id`.
- `event_type`: for example `created`, `redirected`, `linked`, `expired`, `reconnected`, `revoked`, `failed`.
- `occurred_at`.
- `provider_status`.
- `message`.
- `metadata`.

Relationships:

- Belongs to `bank_connections`.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read their own consent history.
- Writes should be server-controlled.
- Metadata should not include secrets.

Source:

- App-managed events based on Enable Banking authorization states and callbacks.

### `manual_assets`

Purpose:

- Stores assets or investment values that are not available through PSD2, especially possible Trade Republic investment data.

Probable fields:

- `id`.
- `user_id`.
- `name`.
- `asset_type`: for example `brokerage`, `cash`, `investment`, `other`.
- `platform`: for example `Trade Republic`.
- `amount`.
- `currency`.
- `valuation_date`.
- `notes`.
- `created_at`.
- `updated_at`.

Relationships:

- Belongs to `profiles`.
- May later be included in reports.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read and manage only their own manual assets.
- Manual values are financial data and require RLS.

Source:

- Manual input or future safe import/integration.

### Future Cobee Integration Entities

Cobee by Pluxee should be modeled as a separate external data source from PSD2
banking. The current public API documentation centers the likely read path on
companies, employees, payroll cycles, and employee consumption reports.

Possible future entities:

- `external_connections`: provider-level connection and credential metadata,
  or a Cobee-specific equivalent if a generic table is premature.
- `cobee_companies`: company identifiers available to the authenticated Cobee
  API credentials.
- `cobee_employees`: employee identifiers needed to request the owner's
  consumption reports.
- `cobee_consumption_reports`: normalized consumption totals by payroll cycle,
  benefit category, behavior, and sum type.

Important modeling notes:

- Do not mix Cobee rows into PSD2 `bank_connections`; Cobee is not a bank
  Account Information provider.
- Store only the identifiers and normalized report data needed for the app.
- Keep Cobee credentials and JWTs out of the browser and, unless a future
  design requires persistence, out of the database.
- Treat Cobee consumption data as financial data owned by `user_id` and protect
  it with RLS.

## Data Source Summary

| Entity                          | Primary source                                      |
| ------------------------------- | --------------------------------------------------- |
| `auth.users`                    | Supabase Auth                                       |
| `profiles`                      | Supabase Auth and app metadata                      |
| `institutions`                  | Enable Banking ASPSPs or app-managed reference data |
| `bank_connections`              | Enable Banking consent and authorization flow       |
| `accounts`                      | Enable Banking account data                         |
| `balances`                      | Enable Banking balances                             |
| `transactions`                  | Enable Banking transactions                         |
| `transaction_category_groups`   | Manual user setup or app defaults                   |
| `transaction_categories`        | Manual user setup or app defaults                   |
| `transaction_category_rules`    | Manual user setup or future suggestions             |
| `transaction_labels`            | Manual user setup                                   |
| `transaction_label_assignments` | Manual user action                                  |
| `sync_runs`                     | App sync process                                    |
| `consent_events`                | App consent lifecycle tracking                      |
| `manual_assets`                 | Manual user input or future import                  |
| Future Cobee report rows        | Cobee by Pluxee Public API                          |
