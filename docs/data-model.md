# Conceptual Data Model

This document proposes a conceptual data model only. It is not a migration and should not be treated as final schema design.

The model should preserve user ownership even though the app starts as a personal project.

## Ownership Principle

Financial rows should be owned by a Supabase Auth user through `user_id`. RLS policies should enforce access by owner.

Shared reference rows, such as institutions, may be global if they do not contain user-specific financial data.

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
- `provider`: for example `gocardless` or `manual`.
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

- GoCardless institution list or app-managed reference data.

### `bank_connections`

Purpose:

- Tracks a user's consent-based connection to an institution.

Probable fields:

- `id`.
- `user_id`.
- `institution_id`.
- `provider`.
- `provider_requisition_id`.
- `provider_agreement_id`.
- `status`: for example `created`, `linked`, `expired`, `error`, `revoked`.
- `consent_expires_at`.
- `redirect_url`.
- `last_synced_at`.
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

- GoCardless requisition and agreement flows.

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

- GoCardless account details.

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

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read only their own balance rows.
- Inserts should be server-controlled during sync.

Source:

- GoCardless balances endpoint.

### `transactions`

Purpose:

- Stores account transaction history.

Probable fields:

- `id`.
- `user_id`.
- `account_id`.
- `provider_transaction_id`.
- `booking_date`.
- `value_date`.
- `amount`.
- `currency`.
- `description`.
- `merchant_name`.
- `category`.
- `raw_data`.
- `created_at`.
- `updated_at`.

Relationships:

- Belongs to `accounts`.
- May be linked to categories or reports later.

Ownership model:

- Owned by the authenticated user through `user_id`.

Security and RLS:

- User can read only their own transactions.
- Raw provider payloads may contain sensitive details; store only what is useful.
- Deduplication should use provider IDs and account context when available.

Source:

- GoCardless transactions endpoint.

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

- App-managed events based on GoCardless states and callbacks.

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

## Data Source Summary

| Entity | Primary source |
| --- | --- |
| `auth.users` | Supabase Auth |
| `profiles` | Supabase Auth and app metadata |
| `institutions` | GoCardless or app-managed reference data |
| `bank_connections` | GoCardless consent and requisition flow |
| `accounts` | GoCardless account data |
| `balances` | GoCardless balances |
| `transactions` | GoCardless transactions |
| `sync_runs` | App sync process |
| `consent_events` | App consent lifecycle tracking |
| `manual_assets` | Manual user input or future import |
