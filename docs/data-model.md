# Data Model

This document describes the implemented local schema and explicitly deferred
entities for `money-juggle`. SQL migrations are authoritative for exact columns,
constraints, grants, and policies.

The executable schema is defined by the ordered local migration chain below.
Remote deployment must be checked separately through the migration workflow.

- [`20260704143000_create_initial_schema.sql`](../supabase/migrations/20260704143000_create_initial_schema.sql)
- [`20260704170000_add_enable_banking_connection_fields.sql`](../supabase/migrations/20260704170000_add_enable_banking_connection_fields.sql)
- [`20260707120000_add_account_fingerprints_for_internal_transfers.sql`](../supabase/migrations/20260707120000_add_account_fingerprints_for_internal_transfers.sql)
- [`20260709120000_seed_initial_transaction_categories.sql`](../supabase/migrations/20260709120000_seed_initial_transaction_categories.sql)
- [`20260719120000_add_transaction_labels.sql`](../supabase/migrations/20260719120000_add_transaction_labels.sql)
- [`20260719214000_add_shared_expense_settlement_category.sql`](../supabase/migrations/20260719214000_add_shared_expense_settlement_category.sql)
- [`20260803183000_add_provider_rate_limit_cooldown.sql`](../supabase/migrations/20260803183000_add_provider_rate_limit_cooldown.sql)
- [`20260803190000_add_connection_sync_lease.sql`](../supabase/migrations/20260803190000_add_connection_sync_lease.sql)
- [`20260803193000_add_transaction_sync_freshness.sql`](../supabase/migrations/20260803193000_add_transaction_sync_freshness.sql)
- [`20260804120000_add_personal_care_and_rename_vehicle_insurance.sql`](../supabase/migrations/20260804120000_add_personal_care_and_rename_vehicle_insurance.sql)
- [`20260809120000_add_transaction_reporting_date.sql`](../supabase/migrations/20260809120000_add_transaction_reporting_date.sql)
- [`20260810120000_add_transaction_reconciliations.sql`](../supabase/migrations/20260810120000_add_transaction_reconciliations.sql)
- [`20261004211500_add_fines_category.sql`](../supabase/migrations/20261004211500_add_fines_category.sql)
- [`20261005013000_add_reconciliation_state_rpc.sql`](../supabase/migrations/20261005013000_add_reconciliation_state_rpc.sql)
- [`20261010120000_add_portfolio_snapshots.sql`](../supabase/migrations/20261010120000_add_portfolio_snapshots.sql)
- [`20261010123000_add_portfolio_read_views.sql`](../supabase/migrations/20261010123000_add_portfolio_read_views.sql)
- [`20261011120000_add_category_rules.sql`](../supabase/migrations/20261011120000_add_category_rules.sql)
- [`20261011190000_add_category_rule_names.sql`](../supabase/migrations/20261011190000_add_category_rule_names.sql)
- [`20261011200000_allow_transaction_label_deletion.sql`](../supabase/migrations/20261011200000_allow_transaction_label_deletion.sql)

The model should preserve user ownership even though the app starts as a personal project.

## Ownership Principle

Financial rows should be owned by a Supabase Auth user through `user_id`. RLS policies should enforce access by owner.

Shared reference rows, such as institutions, may be global if they do not contain user-specific financial data.

## Implemented Schema Scope

The current migrations create the smallest useful schema for PSD2 bank
connections, account data, balance snapshots, transactions, categorization, sync
observability, internal transfer matching, and the initial owner-scoped category
catalog.

### Transaction Reconciliations

`transaction_reconciliations` stores finalized, owner-controlled groups of bank
transactions whose principal cash flow should be financially neutral. It stores
the reason, optional note, currency, and the treatment of any current signed
difference. A reportable difference also references one owner category and one
reporting date.

`transaction_reconciliation_items` stores ordered group membership. A unique
transaction constraint prevents one bank transaction from belonging to two
reconciliations. Composite owner foreign keys prevent cross-user relationships,
and deleting a reconciliation cascades through memberships while deleting a
referenced bank transaction remains restricted.

`transaction_reconciliation_label_assignments` links optional owner labels to a
reportable reconciliation difference. Labels themselves remain reusable after a
reconciliation is deleted.

All three tables enable RLS and permit authenticated CRUD only when `user_id`
matches `auth.uid()`. `save_transaction_reconciliation` locks selected
transactions and atomically validates and writes the complete group. The
function recalculates the live signed balance and rejects a stale expected
balance, duplicate membership, mixed currencies, or invalid adjustment data.

No amount snapshot is stored. Provider synchronization may update a booked
transaction amount, and the reconciliation balance then changes with it. A
group originally saved at zero becomes review-required if its live balance
drifts. Reportable differences change contribution automatically; neutralized
differences remain excluded.

`get_transaction_reconciliation_states` reads membership and review state through
a POST RPC, carrying transaction IDs in the JSON body instead of a large GET
filter. It uses `SECURITY INVOKER`, existing RLS, and an explicit owner check
against `auth.uid()`. Only authenticated users may execute it. PostgreSQL sums
all members of each requested group, including transactions outside the report
period, with exact numeric arithmetic. The application reads ordered pages of
500 states so the API row limit cannot silently omit reconciled transactions.

### Portfolio Snapshots And Import Drafts

`portfolio_snapshots` stores one EUR Trade Republic snapshot per owner and report
date, with cash, summed investment valuation, revision, source fingerprint,
parser version and original financial extraction. `portfolio_positions` stores
ISIN, product name, fractional units, price, quote date and declared valuation.
`portfolio_import_drafts` stores financial previews for 24 hours and records the
confirmed snapshot for idempotent retries. No original PDF or customer/account
identifier is persisted.

All three tables have `user_id` RLS; position and draft relationships use
composite owner foreign keys. `confirm_portfolio_import` runs as security
invoker, validates financial values, locks the draft and owner/date, checks the
expected revision and atomically inserts or replaces all positions. Repeat
confirmations return the same snapshot; replacements require acknowledgement.

`portfolio_snapshot_values` and `portfolio_position_values` are authenticated
security-invoker read views. They retain base-table RLS and cast numeric fields
to text for exact JSON reads. Values use `numeric(20,6)` and report dates remain
separate from quote dates. History reads paginate in batches of 500. See
[Portfolio imports](portfolio-imports.md) and
[SQL verification](../supabase/tests/portfolio_imports.sql).

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
- `transaction_reconciliations`
- `transaction_reconciliation_items`
- `transaction_reconciliation_label_assignments`
- `portfolio_snapshots`
- `portfolio_positions`
- `portfolio_import_drafts`
- `sync_runs`
- `consent_events`

Deferred tables:

- `transaction_category_rules`: useful later, after manual categorization exists.
- Cobee integration tables: useful later after API access and desired
  consumption granularity are confirmed.
- `manual_assets`: deferred general manual assets and crypto. Reviewed Trade
  Republic brokerage imports use portfolio tables instead.
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

The reconciliation-state RPC has a focused rollback-fixture SQL check in
`supabase/tests/transaction_reconciliation_states.sql`. Broader deployed RLS
verification remains an operational task; mocked application tests do not prove
remote policy deployment. The initial migration enables RLS from day one.

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
- `20260804120000_add_personal_care_and_rename_vehicle_insurance.sql` adds
  `hair_beauty` under health and wellness and changes the existing
  `vehicle_insurance` display name to `Seguro de automóvil` without changing
  its stable slug or existing transaction assignments.

## Entities

### `auth.users`

Purpose:

- Supabase-managed authentication users.
- This table is owned by Supabase Auth, not by application migrations.

Implemented fields:

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

Implemented fields:

- `id`: same value as Supabase Auth user ID.
- `email`.
- `display_name`.
- `created_at`.
- `updated_at`.

Relationships:

- Owns bank connections, accounts, and imported financial data through `user_id`.
- The deferred manual asset model would use the same ownership.

Ownership model:

- One profile per authenticated user.

Security and RLS:

- User can read and update only their own profile.

Source:

- Supabase Auth and minimal app-managed metadata.

### `institutions`

Purpose:

- Represents banks or platforms that can be connected or tracked.

Implemented fields:

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

- Readable by authenticated users; anonymous read is not granted.
- Writes should be server-controlled.

Source:

- Enable Banking ASPSP list or app-managed reference data.

### `bank_connections`

Purpose:

- Tracks a user's consent-based connection to an institution.

Implemented fields:

- `id`.
- `user_id`.
- `institution_id`.
- `provider`.
- `provider_requisition_id`: current first-migration name; originally chosen
  for GoCardless. It should be treated as a generic external authorization or
  session identifier until a future migration renames it.
- `provider_agreement_id`: current first-migration name; originally chosen for
  GoCardless. It is retained as a legacy nullable field; the
  current flow uses explicit Enable Banking authorization/session columns.
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
- `last_transaction_synced_at`: last fully successful
  transaction refresh used for automatic freshness checks. Historical migration
  backfill included partial runs; current incomplete runs do not advance it.
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

Implemented fields:

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

Implemented fields:

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
- No direct `sync_run` foreign key exists; sync observability is connection-scoped.

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

Implemented fields:

- `id`.
- `user_id`.
- `account_id`.
- `stable_import_key`.
- `identity_source`: `provider_internal_transaction_id`,
  `provider_transaction_id`, `entry_reference`, `end_to_end_id`, or
  `deduplication_fingerprint`.
- `provider`: for example `enable_banking`.
- `provider_transaction_id`.
- `provider_internal_transaction_id`.
- `entry_reference`.
- `end_to_end_id`.
- `deduplication_fingerprint`.
- `booking_status`: for example `booked`, `pending`, or `information`.
- `booking_date`.
- `reporting_date`: app-owned date used for review and reporting. It starts as
  the provider booking date and can later be edited by the owner.
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
- No raw payload column is implemented. Persist normalized provider fields only.
- Deduplication should use provider IDs and account context when available.
- Inserts and sync updates should usually be server-controlled.
- Current user-controlled transaction-column updates are limited to
  `category_id` and `reporting_date`; labels and reconciliations use separate tables.

Source:

- Enable Banking transactions endpoint.

#### Transaction Identity And Deduplication

Provider transaction identity is not guaranteed to be perfect. Bank data providers such as Enable Banking may expose several transaction-related identifiers, but the useful identifiers are optional and may depend on the bank:

- Provider internal transaction ID when available.
- Bank-provided transaction ID when available.
- Bank-provided entry reference when available.
- End-to-end payment identifier when available and meaningful.

The app should therefore not depend on one external field being present for every transaction.

Implemented identity design:

- Keep `id` as the internal Supabase primary key, a UUID.
- Use `stable_import_key` as the app's deterministic sync identity.
- Always include the internal `account_id` in the identity scope, because external transaction identifiers may only be unique within an account.
- Store every useful external identifier separately for debugging, reconciliation, and future provider changes.
- Store `identity_source` so future maintainers can understand which rule created the current `stable_import_key`.

Implemented `stable_import_key` priority:

```text
if provider_internal_transaction_id exists:
  provider_internal:{account_id}:{provider_internal_transaction_id}

else if provider_transaction_id exists:
  provider_transaction:{account_id}:{provider_transaction_id}

else if entry_reference exists:
  entry_reference:{account_id}:{entry_reference}

else if end_to_end_id exists and is meaningful:
  end_to_end:{account_id}:{end_to_end_id}

else:
  fingerprint:{account_id}:{deduplication_fingerprint}
```

The fallback fingerprint is a SHA-256 hash over account ID, separate booking
and value dates, signed amount text, currency, normalized
description, counterparty and merchant names, account suffix, bank transaction
code, and merchant category code. Amount signing/whitespace are normalized,
but equivalent decimal representations are not canonicalized before hashing. See
`lib/db/enableBankingTransactions/transactionIdentity.ts` and `rowIdentity.ts`.

Current persistence:

1. Normalize provider fields and compute the stable key and fingerprint.
2. Deduplicate the incoming batch by owner, account, and stable key.
3. Read matching stored keys in batches of 100, scoped to the owner.
4. Upsert on `user_id,account_id,stable_import_key`, preserving `first_seen_at`,
   non-null `reporting_date`, and user metadata omitted from the payload.
5. Advance `last_seen_at` to the fetch timestamp.

No cross-key candidate reconciliation or identity promotion is implemented.
A pending-to-booked identity change may fail a partial unique index or produce
another row when all usable identity inputs change. This provider-import issue
is separate from owner-created financial reconciliation groups.

Implemented constraints:

- Unique `user_id`, `account_id`, `stable_import_key`.
- Partial unique indexes for non-null provider internal and transaction IDs,
  scoped to owner and account.

Pending transactions remain provisional. Sync can store them; current dashboard
aggregations do not impose a booked-only filter. Excel explicitly includes only
booked rows, and reconciliation candidates require booked same-currency rows.
Do not claim automatic pending-to-booked merging or complete historical coverage.

#### App-Owned Reporting Date

`booking_date` remains provider-owned and records the date returned by Enable
Banking. `reporting_date` is the app-owned date used to select, order, and group
transactions and to calculate monthly and annual reports.

Implemented behavior:

- Initialize `reporting_date` from `booking_date` for existing and newly
  imported rows.
- Preserve a non-null `reporting_date` during later provider synchronization,
  even if provider-owned fields are refreshed.
- Fill a still-null `reporting_date` if a later provider response supplies a
  previously missing booking date.
- Keep internal-transfer matching based on `booking_date`, because changing a
  reporting period should not change whether a movement is financially neutral.
- Update `reporting_date` only through an authenticated, owner-scoped server
  mutation. Existing transaction read RLS remains unchanged.

#### App-Owned Categorization

Transaction categorization is app-owned metadata, not provider-owned data.

The app should not rely on provider categories as the source of truth. Provider fields such as merchant category codes may be useful as hints, but the user should be able to define categories according to their own mental model.

Recommended approach:

- Use a separate `transaction_category_groups` table for broad reporting groups.
- Use the implemented `transaction_categories` table instead of free-text categories.
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

Implemented fields:

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

Implemented fields:

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

Status: deferred; no table or feature exists in the migration chain.

Purpose:

- Stores optional user-owned rules for suggesting or applying categories.
- Helps categorize repeated merchants or descriptions quickly without requiring machine learning.

Proposed fields (not implemented):

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
- Settings permits standalone creation, renaming with the same ID and confirmed
  permanent deletion. Owner DELETE RLS and existing foreign-key cascades remove
  transaction and reconciliation assignments without deleting financial rows.
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

Implemented fields:

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

Implemented fields:

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

Status: deferred general-purpose proposal; this table is not in the migration
chain. Reviewed Trade Republic PDF snapshots use `portfolio_snapshots` and
`portfolio_positions` instead.

Purpose:

- Stores assets or investment values that are not available through PSD2,
  especially Trade Republic brokerage positions, crypto holdings, and portfolio
  valuations. Trade Republic current-account cash belongs in the standard
  Enable Banking account and balance tables instead.

Proposed fields (not implemented):

- `id`.
- `user_id`.
- `name`.
- `asset_type`: for example `brokerage`, `crypto`, `investment`, `other`.
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
| `transaction_category_rules`    | Deferred: manual setup or future suggestions        |
| `transaction_labels`            | Manual user setup                                   |
| `transaction_label_assignments` | Manual user action                                  |
| `sync_runs`                     | App sync process                                    |
| `consent_events`                | App consent lifecycle tracking                      |
| `portfolio_snapshots`           | Reviewed portfolio PDF import                       |
| `portfolio_positions`           | Reviewed portfolio PDF positions                    |
| `portfolio_import_drafts`       | Temporary financial extraction                      |
| `manual_assets`                 | Deferred: manual input or future import             |
| Future Cobee report rows        | Cobee by Pluxee Public API                          |

## Category Rules And Assignment Provenance

`category_rules` owns confirmed rules and proposals through `user_id`, with
composite owner foreign keys to category and optional account, owner RLS,
versioned edits and soft deletion. Its required `name` is a separate trimmed
display label, preserving capitalization and limited to 300 characters. Existing
rows and unnamed new inserts default to their condition text. Name backfill
preserves existing versions, timestamps and activation dates. The preparation
trigger normalizes conditions, validates active categories and advances
activation time when active matching conditions change or a rule is activated.
Name-only edits advance the version without moving the activation boundary.
Proposal fingerprints prevent duplicate detection, including dismissed rows.

Transactions retain `category_source`, rule ID/version and a conflict flag.
Manual category removal is an explicit manual origin. Existing categorized rows
are conservatively marked manual; no category is changed. Provider payloads
omit these columns. The service-only security-invoker assignment RPC checks
connection ownership, serializes rule/category edits and transaction writes,
rechecks eligibility and neutral movements, and preserves existing categories.
See [Category rules](category-rules.md) for semantics and rollback verification.
