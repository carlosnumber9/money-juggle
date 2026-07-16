# Enable Banking

This app should use Enable Banking as the primary Open Banking / PSD2 provider
for read-only bank account data.

GoCardless Bank Account Data was initially considered, but new private signups
were not available when the project reached the banking-provider step. Enable
Banking supports the project's immediate personal-use path because it allows a
restricted production application to link the owner's own accounts.

## Current Provider Decision

Status:

- Enable Banking application created.
- Environment: production.
- Service: Account Information.
- Application mode: restricted to own linked accounts.
- CaixaBank and ING appear as available ASPSPs and have been linked manually in
  the Enable Banking portal.
- Trade Republic does not appear as an available ASPSP and remains outside the
  initial PSD2 banking path.

Registered application URLs:

```text
Application URL:
https://money-juggle.vercel.app/

Redirect URL:
https://money-juggle.vercel.app/api/bank-connections/enable-banking/callback

Privacy policy URL:
https://money-juggle.vercel.app/privacy

Terms of service URL:
https://money-juggle.vercel.app/terms
```

The privacy and terms routes should exist before relying on the production
registration. They can start as short static pages because the first app version
is personal and read-only.

## Read-Only Scope

Allowed:

- List supported ASPSPs for relevant countries.
- Start an account information authorization flow.
- Redirect the owner to the bank for consent.
- Read linked accounts.
- Read account details.
- Read balances.
- Read transactions.
- Refresh data for previously linked own accounts while consent remains valid.

Not allowed:

- Payment initiation.
- Transfers.
- Mandates.
- Checkout.
- Scraping.
- Storing bank credentials.
- Exposing provider credentials or signing keys to the browser.

Enable Banking also offers payment-related capabilities, but this app must only
use Account Information.

## Important Concepts

### ASPSP

An ASPSP is an Account Servicing Payment Service Provider. In practice, for this
app, it usually means the bank or financial institution that holds the account,
such as CaixaBank or ING.

The app's `institutions` table can store Enable Banking ASPSP references as
provider-specific institution identifiers.

### Application Certificate

Enable Banking uses an RSA private key and public certificate for authorizing API
requests. The private key signs JWTs from the server. Enable Banking stores the
public certificate and uses it to verify that requests come from the registered
application.

The public certificate is safe to provide to Enable Banking. The private key is
a secret and must remain server-only.

The local generated files currently live under:

```text
.secrets/enable-banking/private.key
.secrets/enable-banking/public.crt
```

`.secrets/` is ignored by Git. Do not commit the private key.

### Own Linked Accounts

The current Enable Banking application is not a public multi-user integration.
It is a production application restricted to accounts that the owner explicitly
links through the Enable Banking portal or flow.

This fits the initial `money-juggle` scope:

- The app is personal.
- The owner is the only intended user.
- CaixaBank and ING can be linked without requesting general commercial
  availability.
- The app should still model ownership with `user_id` so it can grow safely.

## Conceptual Integration Flow

1. The owner signs in to `money-juggle`.
2. The app offers a bank connection flow for supported ASPSPs.
3. Server-only code creates or starts an Enable Banking authorization flow.
4. The browser is redirected to the authorization URL.
5. The owner completes consent with the bank.
6. Enable Banking redirects back to the registered callback URL.
7. Server-only code validates the callback and stores consent state.
8. Server-only code lists linked accounts.
9. Server-only code fetches account details, balances, and transactions.
10. The app stores normalized data under the authenticated user.

Implementation details may differ once the first API spike is built. Keep the
first technical slice narrow: authenticate server-side and fetch a harmless
resource before starting a full app UI flow.

## Implemented Connection Flow

The first connection flow now uses these Enable Banking Account Information
endpoints:

- `GET /aspsps` to list Spanish personal ASPSPs for the `AIS` service.
- `POST /auth` to start authorization for a selected ASPSP.
- `POST /sessions` from the callback handler to exchange the returned `code`
  for an authorized session and account list.

Implemented app routes:

- `GET /api/bank-connections/enable-banking/aspsps`
- `POST /api/bank-connections/enable-banking/start`
- `GET /api/bank-connections/enable-banking/callback`

The callback route is:

```text
https://money-juggle.vercel.app/api/bank-connections/enable-banking/callback
```

The start route requests only Account Information access:

- `balances: true`
- `transactions: true`
- `psu_type: personal`
- `language: es`

The app passes the Supabase user ID as `psu_id` instead of an email address.
Enable Banking stores only its derived `psu_id_hash`, which the app keeps for
operational consent tracking.

The start handler requires:

- An authenticated Supabase user.
- A server-side email allowlist match.

The callback handler requires a returned `state` matching a pending connection
that was created by the authenticated, allowlisted start handler. The callback
uses that pending connection's stored `user_id` so the bank redirect can
complete even if the browser does not present a fresh Supabase session on the
return request.

The app stores account metadata returned by the authorized session, including
Enable Banking account `uid`, display name, currency, account type, and only
the last four IBAN characters when available.

Balances are synchronized automatically by server-only code after a connection
is completed and through an internal `POST /api/sync/balances` request when the
private home screen detects missing or stale balance snapshots. The same route
accepts an authenticated `force=true` request from the dashboard's manual
refresh control so every linked connection can request a fresh balance.

Transactions are synchronized by server-only code through
`POST /api/sync/transactions`. Incremental synchronization fetches from the
first day of the previous month through the current day for each linked Enable
Banking account. The overlap allows late or provisional transactions to be
updated without reloading the full history. The route normalizes rows into the
app's `transactions` table and keeps the private views responsive by showing
cached Supabase rows while the refresh runs.

Transaction retrieval follows Enable Banking continuation keys until every
page for the requested period has been processed. Every follow-up request keeps
the original date parameters and adds only the provider continuation key. A
repeated continuation key aborts the sync instead of allowing an unbounded
request loop.

Normalized transaction rows are deduplicated by their owner-scoped stable
identity and persisted in bounded batches. Each batch preserves the original
`first_seen_at`, advances `last_seen_at`, and omits user-owned fields such as
`category_id` from the provider upsert payload.

The server-side transaction sync accepts an explicit date range and mode.
Incremental syncs use Enable Banking's `default` transaction strategy for
recent updates. Historical backfills use `longest`, which asks the provider for
the longest available history at or after the requested lower boundary. Sync
runs retain their mode, requested range, account count, transaction count, and
any account-level failures after completion.

The owner-only `POST /api/sync/transactions/backfill` route requests the current
calendar year through the current day. It skips bank connections that already
have a successful transaction backfill run. Failed and partial connection runs
remain eligible for an idempotent retry. The route is server-only, requires an
authenticated allowlisted user, and does not expose provider responses or
credentials to the browser.

The private dashboard shows an `Importar historial` button below the bank cards
only when at least one linked connection has accounts and no successful
transaction backfill. The button reports progress and retry state through its
label, refreshes the private view from Supabase after the request, and
disappears once every eligible connection has completed its initial backfill.

The same dashboard control area exposes `Actualizar`. On initial page load it
automatically runs incremental transaction sync together with freshness-limited
balance sync. A manual click forces balance refresh and runs the same overlapping
incremental transaction range. The buttons share an operation state so refresh
and historical backfill cannot be launched concurrently from the UI.

The private `Transacciones` tab presents cached rows for the month selected in
the URL as a review surface: transactions are grouped by booking date, marked
with the source bank logo or fallback, and can be filtered by institution or by
income/spending direction. Its month controls query Supabase only and do not
change the provider sync boundary; Enable Banking requests still only happen in
server-side synchronization code.

## What To Store

Store enough information to understand and manage consent and synchronization:

- Provider name: `enable_banking`.
- Enable Banking ASPSP identifier.
- Internal institution row.
- External authorization or session identifier if provided by the API.
- Consent status.
- Consent expiration date if provided.
- Linked Enable Banking account identifiers.
- Last successful sync time.
- Sync failures.
- Consent lifecycle events.

For transactions, store normalized fields plus identity fields that make sync
idempotent:

- Internal account row.
- Provider name: `enable_banking`.
- Booking status: for example `booked`, `pending`, or `information`.
- Transaction amount and currency.
- Booking date and value date when available.
- Description or remittance information.
- Counterparty or merchant fields when available.
- Provider transaction ID when available.
- Provider internal transaction ID if available.
- Bank-provided references when available.
- App-computed `stable_import_key`.
- App-computed `deduplication_fingerprint`.
- `identity_source`, so it is clear which identity rule was used.
- First and last time the transaction was seen by sync.

Avoid storing:

- Enable Banking private keys in the database.
- Bank credentials.
- Unnecessary raw payloads.
- Sensitive tokens unless a clear server-side design requires them.

Raw transaction payloads should be avoided by default. If a limited
`raw_provider_data` field is useful for debugging, it should be intentionally
scoped and should not become a dumping ground for every API response.

## Transaction Identity

Transaction sync must be idempotent. If the same bank transaction is fetched
repeatedly, the app should update the existing row instead of creating a
duplicate.

There is no single external transaction ID that should be assumed to exist for
every transaction across all providers and banks. Provider IDs and bank-provided
references are useful but may be optional or bank-dependent.

Recommended identity priority:

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

Important rules:

- Always scope external transaction identifiers to the internal `account_id`.
- Keep the internal Supabase `transactions.id` separate from provider
  identifiers.
- Store the original identifiers even when `stable_import_key` is computed from
  another identifier.
- Store `identity_source` to make future debugging possible.
- Use a unique constraint on `user_id`, `account_id`, and `stable_import_key`.

## Transaction Fingerprints

`deduplication_fingerprint` is the fallback identity when no useful external
identifier is available.

It should be a hash of normalized values such as:

- Internal `account_id`.
- Booking date or value date.
- Amount in minor units.
- Currency.
- Normalized description or remittance text.
- Counterparty or merchant name when available.
- Counterparty account suffix when available.
- Bank transaction code or merchant category code when available.

The fingerprint implementation should normalize whitespace, casing, decimal
precision, missing fields, and date formats before hashing.

Fingerprints are useful but imperfect. They can collide in rare cases, for
example two same-day card payments for the same amount and merchant. They can
also change if the bank later updates text or dates. For that reason,
fingerprints should be treated as fallback identity, not as a stronger source
than provider IDs.

## Transaction Upsert And Reconciliation

Transaction persistence should follow an upsert-like flow:

1. Fetch transactions server-side from Enable Banking.
2. Normalize each transaction into app fields.
3. Compute `stable_import_key`.
4. Search for an existing row with the same `user_id`, `account_id`, and
   `stable_import_key`.
5. If found, update provider-owned fields and `last_seen_at`.
6. Preserve user-owned fields such as `category_id`, user notes, or manual
   review state.
7. If no row exists by `stable_import_key`, search for recent compatible
   same-account candidates using stored external IDs and the fallback
   fingerprint.
8. If a compatible candidate exists, update that row and improve its identity
   fields.
9. If no compatible candidate exists, insert a new transaction.

This reconciliation step matters because a transaction may first arrive as
pending or incomplete and later arrive as booked with stronger identifiers or
slightly different dates/descriptions.

Pending transactions should be treated as provisional:

- They may be shown in the UI later if useful.
- They should not be the main source for permanent reports unless intentionally
  designed.
- Manual categories should primarily apply to booked transactions.
- If a pending row is later reconciled with a booked row, user-owned metadata
  should be preserved where safe.

## Consent Expiration

PSD2 consents expire. The app should make expiration visible in the data model
and UI.

Future behavior should include:

- Marking connections as expired when consent is no longer valid.
- Showing a Spanish user-visible reconnection message.
- Starting a fresh authorization flow when reconnection is requested.
- Preserving historical account and transaction data unless the owner
  intentionally removes it.

## Reconnection

Reconnection should be treated as a normal lifecycle event, not an exceptional
state.

The app should:

- Keep the old connection history.
- Start a new authorization flow or update the existing connection according to
  the chosen design.
- Record a `consent_events` row.
- Resume sync only after consent is valid again.

## Synchronization Errors

Sync errors should be recorded in `sync_runs`.

Useful fields:

- Status.
- Error code.
- Sanitized error message.
- Start and finish times.
- Connection or account affected.
- Retry eligibility.

Do not store secrets or full sensitive API responses in error logs.

## Secret Handling

Enable Banking credentials and signing material must live only in server-side
environment variables or local ignored secret files.

Never expose:

- `ENABLE_BANKING_APPLICATION_ID` if it is not needed by client code.
- `ENABLE_BANKING_PRIVATE_KEY`.
- Provider access tokens or authorization tokens.
- Supabase service role keys.

Any variable containing secrets must not use `NEXT_PUBLIC_`.

Current implementation variables:

- `ENABLE_BANKING_APPLICATION_ID`: registered Enable Banking application key ID.
- `ENABLE_BANKING_PRIVATE_KEY`: RSA private key PEM. In hosted environments this
  can contain escaped newlines (`\n`), which the server normalizes before
  signing.
- `ENABLE_BANKING_PRIVATE_KEY_PATH`: optional local-only path to an ignored PEM
  file, such as `.secrets/enable-banking/private.key`.
- `ENABLE_BANKING_API_BASE_URL`: optional override. Defaults to
  `https://api.enablebanking.com`.

## First Signed API Call

The first implemented API call is intentionally narrow:

```text
GET https://api.enablebanking.com/application
```

The server signs a JWT with the registered application ID as the `kid` and sends
it in the `Authorization: Bearer <JWT>` header. Enable Banking responds with
metadata for the application associated with the JWT key ID.

This verifies:

- The private key can sign requests from server-only code.
- Enable Banking accepts the JWT.
- The application ID and private key match the registered application.

This verification route itself does not verify:

- CaixaBank or ING account consent.
- Linked accounts.
- Balances.
- Transactions.
- Any stored bank connection state.

Those capabilities are implemented through the dedicated bank connection,
balance sync, and transaction sync routes described above.

The internal verification route is:

```text
GET /api/integrations/enable-banking/application
```

It requires an authenticated Supabase session and an allowed email. It returns
only safe application metadata and sanitized errors. It must not return signed
JWTs, private keys, provider credentials, or raw Enable Banking error payloads.

## Client/UI Separation

The UI may:

- Show available banks.
- Start a connection flow by calling an internal server endpoint.
- Redirect the browser to the consent URL returned by the server.
- Show connection and sync status.

The UI must not:

- Call Enable Banking directly.
- Hold Enable Banking credentials or signing keys.
- Parse raw Enable Banking payloads.
- Decide whether a user can access another user's connection.

Server-side modules should own the Enable Banking client, request signing,
request handling, normalization, and persistence.

## Remaining Implementation Notes

The initial Enable Banking path has now progressed through signed requests,
ASPSP listing, account information authorization, callback handling, account
storage, balance sync, and overlapping incremental transaction sync. Future work should
still prefer small steps:

1. Add focused tests for transaction identity and sync idempotency.
2. Improve reconnection flows for expired or failed consents.
3. Add scheduled sync only after manual and authenticated sync behavior is well
   understood.
4. Keep all provider calls server-only and Account Information only.

Each step should be verified before moving to the next one.
