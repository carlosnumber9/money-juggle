# GoCardless Bank Account Data

This app should use GoCardless Bank Account Data API for read-only PSD2 account data.

It must not use GoCardless Drop-in or `gocardless/react-dropin`.

## Bank Account Data vs Drop-in

GoCardless has different product areas. For this app, the relevant product is Bank Account Data: reading account information, balances, and transactions through Open Banking / PSD2 consent.

Drop-in and billing-related flows are designed for checkout, payment collection, billing requests, and mandates. They are not appropriate for a personal read-only finance dashboard.

## Why `gocardless/react-dropin` Is Not Appropriate

`gocardless/react-dropin` is intended for payment or billing user experiences. This app does not need to collect money, create mandates, or initiate payments.

Using a payment-oriented package would introduce the wrong mental model and increase the risk of accidentally implementing flows that are explicitly out of scope.

## Read-Only Scope

Allowed:

- List supported institutions.
- Create account access consent.
- Redirect the user to the bank for consent.
- Read linked accounts.
- Read account details.
- Read balances.
- Read transactions.

Not allowed:

- Payment initiation.
- Transfers.
- Mandates.
- Checkout.
- Scraping.
- Storing bank credentials.

## Conceptual Integration Flow

1. Obtain an access token from GoCardless using server-only credentials.
2. List institutions for the relevant country.
3. Create an end user agreement if required.
4. Create a requisition for the chosen institution.
5. Store the pending requisition and consent state.
6. Redirect the user to the GoCardless or bank consent URL.
7. Handle the callback after consent.
8. Fetch the requisition status server-side.
9. List linked accounts.
10. Fetch account details.
11. Fetch balances.
12. Fetch transactions.
13. Store normalized data under the authenticated user.

## What To Store

Store enough information to understand and manage consent and synchronization:

- Provider name: `gocardless`.
- GoCardless institution ID.
- Internal institution row.
- Requisition ID.
- End user agreement ID if used.
- Consent status.
- Consent expiration date.
- Linked GoCardless account IDs.
- Last successful sync time.
- Sync failures.
- Consent lifecycle events.

For transactions, store normalized fields plus identity fields that make sync idempotent:

- Internal account row.
- Provider name: `gocardless`.
- Booking status: for example `booked`, `pending`, or `information`.
- Transaction amount and currency.
- Booking date and value date when available.
- Description or remittance information.
- Counterparty or merchant fields when available.
- GoCardless `internalTransactionId` when available.
- Bank-provided `transactionId` when available.
- Bank-provided `entryReference` when available.
- `endToEndId` when available and meaningful.
- App-computed `stable_import_key`.
- App-computed `deduplication_fingerprint`.
- `identity_source`, so it is clear which identity rule was used.
- First and last time the transaction was seen by sync.

Avoid storing:

- GoCardless client secrets in the database.
- Bank credentials.
- Unnecessary raw payloads.
- Sensitive tokens unless a clear server-side design requires them.

Raw transaction payloads should be avoided by default. If a limited `raw_provider_data` field is useful for debugging, it should be intentionally scoped and should not become a dumping ground for every API response.

## Transaction Identity

Transaction sync must be idempotent. If the same bank transaction is fetched repeatedly, the app should update the existing row instead of creating a duplicate.

There is no single external transaction ID that should be assumed to exist for every transaction. GoCardless Bank Account Data can expose several useful identifiers, but they may be optional or bank-dependent:

- `internalTransactionId`: transaction identifier given by GoCardless.
- `transactionId`: transaction identifier provided by the financial institution.
- `entryReference`: reference provided by the financial institution.
- `endToEndId`: payment end-to-end identifier, often useful for transfers.

The app should therefore create its own deterministic `stable_import_key` for each normalized transaction.

Recommended identity priority:

```text
if internalTransactionId exists:
  gocardless_internal:{account_id}:{internalTransactionId}

else if transactionId exists:
  bank_transaction:{account_id}:{transactionId}

else if entryReference exists:
  bank_entry_reference:{account_id}:{entryReference}

else if endToEndId exists and is meaningful:
  bank_end_to_end:{account_id}:{endToEndId}

else:
  fingerprint:{account_id}:{deduplication_fingerprint}
```

Important rules:

- Always scope external transaction identifiers to the internal `account_id`.
- Keep the internal Supabase `transactions.id` separate from provider identifiers.
- Store the original identifiers even when `stable_import_key` is computed from another identifier.
- Store `identity_source` to make future debugging possible.
- Use a unique constraint on `user_id`, `account_id`, and `stable_import_key` when the schema is created.

## Transaction Fingerprints

`deduplication_fingerprint` is the fallback identity when no useful external identifier is available.

It should be a hash of normalized values such as:

- Internal `account_id`.
- Booking date or value date.
- Amount in minor units.
- Currency.
- Normalized description or remittance text.
- Counterparty or merchant name when available.
- Counterparty account suffix when available.
- Bank transaction code or merchant category code when available.

The fingerprint implementation should normalize whitespace, casing, decimal precision, missing fields, and date formats before hashing.

Fingerprints are useful but imperfect. They can collide in rare cases, for example two same-day card payments for the same amount and merchant. They can also change if the bank later updates the text or booking date. For that reason, fingerprints should be treated as fallback identity, not as a stronger source than provider IDs.

## Transaction Upsert And Reconciliation

Transaction persistence should follow an upsert-like flow:

1. Fetch transactions server-side from GoCardless.
2. Normalize each transaction into app fields.
3. Compute `stable_import_key`.
4. Search for an existing row with the same `user_id`, `account_id`, and `stable_import_key`.
5. If found, update provider-owned fields and `last_seen_at`.
6. Preserve user-owned fields such as `category_id`, user notes, or manual review state.
7. If no row exists by `stable_import_key`, search for recent compatible same-account candidates using stored external IDs and the fallback fingerprint.
8. If a compatible candidate exists, update that row and improve its identity fields.
9. If no compatible candidate exists, insert a new transaction.

This reconciliation step matters because a transaction may first arrive as pending or incomplete and later arrive as booked with stronger identifiers or slightly different dates/descriptions.

Pending transactions should be treated as provisional:

- They may be shown in the UI later if useful.
- They should not be the main source for permanent reports unless intentionally designed.
- Manual categories should primarily apply to booked transactions.
- If a pending row is later reconciled with a booked row, user-owned metadata should be preserved where safe.

## Consent Expiration

PSD2 consents expire. The app should make expiration visible in the data model and UI.

Future behavior should include:

- Marking connections as expired when consent is no longer valid.
- Showing a Spanish user-visible reconnection message.
- Creating a new requisition when reconnection is requested.
- Preserving historical account and transaction data unless the user intentionally removes it.

## Reconnection

Reconnection should be treated as a normal lifecycle event, not an exceptional state.

The app should:

- Keep the old connection history.
- Create a new requisition or update the existing connection according to the chosen design.
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

GoCardless credentials must live only in server-side environment variables.

Never expose:

- `GOCARDLESS_SECRET_ID`
- `GOCARDLESS_SECRET_KEY`
- Access tokens
- Refresh tokens

Any variable containing secrets must not use `NEXT_PUBLIC_`.

## Client/UI Separation

The UI may:

- Show available banks.
- Start a connection flow by calling an internal server endpoint.
- Redirect the browser to the consent URL returned by the server.
- Show connection and sync status.

The UI must not:

- Call GoCardless directly.
- Hold GoCardless credentials.
- Parse raw GoCardless payloads.
- Decide whether a user can access another user's connection.

Server-side modules should own the GoCardless client, token management, request handling, normalization, and persistence.

## Future Implementation Notes

When implementation begins, prefer small steps:

1. Add environment variable documentation.
2. Implement one server-only token request.
3. List institutions.
4. Start a requisition flow.
5. Handle callback.
6. Store linked accounts.
7. Add balances.
8. Add transactions.

Each step should be verified before moving to the next one.
