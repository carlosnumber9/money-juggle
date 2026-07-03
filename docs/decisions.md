# Architecture Decision Record

This file records durable decisions that future sessions should preserve unless the user explicitly revisits them.

## ADR-001: Use Next.js Instead Of Vite Plus A Separate Backend

Status:

- Accepted.

Context:

- The app needs React UI, server-side integration logic, authentication boundaries, and Vercel deployment.

Decision:

- Use Next.js with App Router.

Consequences:

- Frontend and server-side route logic can live in one project.
- Server-only GoCardless calls can be implemented through Next.js server code.
- The project fits Vercel deployment naturally.

Possible future revisit trigger:

- If the app needs a dedicated long-running backend, background workers, or non-Vercel infrastructure.

## ADR-002: Use Supabase Instead Of Local SQLite

Status:

- Accepted.

Context:

- The app needs authentication, hosted Postgres, RLS, and deployment-friendly persistence.

Decision:

- Use Supabase Auth and Supabase Postgres.

Consequences:

- RLS can protect financial data at the database layer.
- The app can grow from personal use toward multi-user ownership if needed.
- Local-only simplicity is traded for hosted service setup.

Possible future revisit trigger:

- If the app becomes fully offline-first or must avoid hosted infrastructure.

## ADR-003: Use Magic Link Initially

Status:

- Accepted.

Context:

- The app is personal and should start with simple authentication.

Decision:

- Use Supabase email magic link login.

Consequences:

- Login is easy to implement and use.
- Email account security becomes critical.
- MFA or passkeys may be needed later.

Possible future revisit trigger:

- If stronger authentication is required or the app expands beyond personal use.

## ADR-004: Restrict Login With Owner Email Or Explicit Allowlist

Status:

- Accepted.

Context:

- Magic link auth alone could allow unintended users to create sessions.

Decision:

- Restrict app access to the owner email or an explicit allowlist.

Consequences:

- The app remains private even if the login page is reachable.
- The authorization check must happen server-side.

Possible future revisit trigger:

- If real multi-user support is intentionally designed.

## ADR-005: Use GoCardless Bank Account Data

Status:

- Accepted.

Context:

- CaixaBank and ING should be connected through Open Banking / PSD2 where possible.

Decision:

- Use GoCardless Bank Account Data API for read-only account, balance, and transaction access.

Consequences:

- The app can avoid routine manual bank statement exports.
- Consent state and expiration must be modeled.
- External API failures and coverage limitations must be handled.

Possible future revisit trigger:

- If another Open Banking provider offers materially better coverage, pricing, or reliability.

## ADR-006: Do Not Use GoCardless Drop-in

Status:

- Accepted.

Context:

- Drop-in and `gocardless/react-dropin` are payment or billing oriented and do not match the app's read-only goal.

Decision:

- Do not use GoCardless Drop-in or `gocardless/react-dropin`.

Consequences:

- The integration remains focused on account data.
- The risk of accidentally introducing payment or mandate flows is reduced.

Possible future revisit trigger:

- None expected for this product direction.

## ADR-007: Do Not Implement Payments

Status:

- Accepted.

Context:

- The product is a personal read-only finance dashboard.

Decision:

- Do not implement payment initiation, transfers, checkout, mandates, or collections.

Consequences:

- The security and compliance scope stays narrower.
- The UI and data model should avoid payment concepts.

Possible future revisit trigger:

- Only if the user explicitly changes the product goal after understanding the security and compliance implications.

## ADR-008: Treat Trade Republic As A Special Case

Status:

- Accepted.

Context:

- Investment data may not be available through PSD2 or GoCardless Bank Account Data.

Decision:

- Treat Trade Republic separately from the initial PSD2 bank connection path.

Consequences:

- Manual assets can represent investment values initially.
- The banking foundation can progress without being blocked by investment integration uncertainty.
- Any future Trade Republic integration must be evaluated separately.

Possible future revisit trigger:

- If a safe official API, reliable export, or appropriate integration path becomes available.

## ADR-009: Keep All GoCardless Calls Server-Side

Status:

- Accepted.

Context:

- GoCardless credentials and tokens are sensitive.

Decision:

- All GoCardless API calls must happen in server-only code.

Consequences:

- The browser never receives GoCardless secrets.
- UI must call internal server endpoints or actions instead of GoCardless directly.
- Server-side modules need clear boundaries.

Possible future revisit trigger:

- None expected.

## ADR-010: Documentation And Internal Code In English

Status:

- Accepted.

Context:

- The user will usually converse in Spanish, but wants repository artifacts to remain in English.

Decision:

- Repository documentation, code, comments, technical names, database entities, and internal concepts must be in English.

Consequences:

- Future agents should write repo artifacts in English even when the conversation is Spanish.
- Technical consistency is easier to maintain.

Possible future revisit trigger:

- If the user explicitly changes the language convention.

## ADR-011: User-Visible App Text In Spanish

Status:

- Accepted.

Context:

- The app is personal and should be comfortable for the user.

Decision:

- User-visible app text should be written in Spanish.

Consequences:

- UI copy is Spanish.
- Internal names remain English.
- Future implementation should avoid mixing internal naming with visible labels.

Possible future revisit trigger:

- If the app targets another audience.

## ADR-012: Build Incrementally Instead Of Generating The Whole App

Status:

- Accepted.

Context:

- The user wants to learn and build the app feature by feature.

Decision:

- Build in small, explained, reviewable steps.

Consequences:

- Future sessions should explain concepts before implementation.
- Large app generation requires explicit confirmation.
- Documentation and decisions should evolve with the app.

Possible future revisit trigger:

- If the user explicitly requests a larger implementation batch.

## ADR-013: Use Stable Import Keys For Transaction Sync

Status:

- Accepted.

Context:

- The app needs to store bank transactions in Supabase and sync them repeatedly from GoCardless Bank Account Data.
- Repeated syncs should not create duplicate transaction rows.
- GoCardless transaction output can include useful identifiers such as `internalTransactionId`, bank-provided `transactionId`, `entryReference`, and `endToEndId`.
- These identifiers are useful but should be treated as optional and bank-dependent.
- A transaction may first appear as pending or incomplete and later appear as booked with stronger identifiers or slightly changed fields.

Decision:

- Keep `transactions.id` as an internal Supabase primary key.
- Add a deterministic `stable_import_key` for sync identity.
- Always scope transaction identity to the internal `account_id`.
- Store useful external identifiers separately for debugging and reconciliation.
- Compute `stable_import_key` using this priority:

```text
if provider_internal_transaction_id exists:
  gocardless_internal:{account_id}:{provider_internal_transaction_id}

else if provider_transaction_id exists:
  bank_transaction:{account_id}:{provider_transaction_id}

else if entry_reference exists:
  bank_entry_reference:{account_id}:{entry_reference}

else if end_to_end_id exists and is meaningful:
  bank_end_to_end:{account_id}:{end_to_end_id}

else:
  fingerprint:{account_id}:{deduplication_fingerprint}
```

- Store `identity_source` so future maintainers can understand which identity rule was used.
- Use an app-computed `deduplication_fingerprint` only as a fallback when stronger identifiers are unavailable.
- Before inserting a new transaction, attempt reconciliation against recent same-account candidates if the stable key does not match.

Consequences:

- Re-running the same transaction sync should update existing rows instead of creating duplicates.
- The app is not locked to one provider-specific ID field.
- Sync logic is slightly more complex, but safer for real bank behavior.
- Pending transactions can be stored, but should be treated as provisional.
- Transaction sync tests should cover repeated sync, provider ID matching, fallback fingerprint matching, and preservation of user-owned fields.

Possible future revisit trigger:

- If real CaixaBank or ING data proves one provider identifier is always stable enough to simplify the strategy.
- If a future Open Banking provider has stronger transaction identity guarantees.

## ADR-014: Treat Transaction Categorization As App-Owned Metadata

Status:

- Accepted.

Context:

- The owner wants to categorize bank transactions according to their own financial review habits.
- Provider data may include hints such as merchant category codes, but those hints should not define the owner's reporting model.
- Categorization should be fast to query from Supabase and should survive future transaction syncs.

Decision:

- Model transaction categories as user-owned app data.
- Link transactions to categories with `category_id` when schema work begins.
- Do not store the user's final category as provider-owned data.
- Do not overwrite manual category assignments during provider sync.
- Allow future rule-based categorization as a small, optional layer after manual categorization exists.

Consequences:

- Reports can group transactions by the owner's chosen categories.
- The app can use provider hints later without making them authoritative.
- RLS must protect both transactions and categories by owner.
- User-visible category names should be Spanish; internal table and column names remain English.

Possible future revisit trigger:

- If category sharing, household budgeting, or multi-user collaboration is intentionally designed later.

## ADR-015: Use shadcn/ui With The Selected Preset For The UI Foundation

Status:

- Accepted.

Context:

- The app needs a quick, consistent UI foundation before building authentication and private screens.
- The user selected the visual preset through shadcn tooling and provided the preset ID `b6thgHlWC`.
- The setup should stay small and avoid becoming a full design system or dashboard implementation.

Decision:

- Use shadcn/ui as the component foundation.
- Use Tailwind CSS v4 with `@tailwindcss/postcss`.
- Initialize shadcn/ui with preset `b6thgHlWC`, which generated the `base-sera` style, olive base color, CSS variables, and Lucide icon configuration.
- Start with only minimal reusable UI components: `button` and `card`.

Consequences:

- Future screens can reuse a consistent component convention.
- UI components live under `components/ui/`.
- Shared class merging lives in `lib/utils.ts`.
- The project now depends on the shadcn/Tailwind styling toolchain.
- Further UI components should be added only when a feature needs them.

Possible future revisit trigger:

- If the selected preset does not fit the finance product once real private screens exist.
- If the app adopts a different design system intentionally.
