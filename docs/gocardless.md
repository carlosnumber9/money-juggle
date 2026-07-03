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

Avoid storing:

- GoCardless client secrets in the database.
- Bank credentials.
- Unnecessary raw payloads.
- Sensitive tokens unless a clear server-side design requires them.

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

