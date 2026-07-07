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
- Server-only bank data provider calls can be implemented through Next.js server code.
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

- Superseded by ADR-016.

Context:

- CaixaBank and ING should be connected through Open Banking / PSD2 where possible.
- GoCardless Bank Account Data was initially selected because it offered read-only account, balance, and transaction access.
- When the project reached account creation, new Bank Account Data signups were disabled for private users.

Decision:

- Do not rely on GoCardless Bank Account Data for the initial implementation.
- Keep this ADR as historical context for why the provider changed.

Consequences:

- The roadmap and provider-specific documentation must move away from GoCardless terminology.
- Generic consent, account, transaction, and sync concepts remain useful.

Possible future revisit trigger:

- If GoCardless reopens private signups and offers materially better coverage, pricing, or reliability.

## ADR-006: Do Not Use Payment-Oriented Provider Drop-ins

Status:

- Accepted.

Context:

- Payment or billing oriented drop-ins do not match the app's read-only goal.
- GoCardless Drop-in and `gocardless/react-dropin` were the original examples of this risk.

Decision:

- Do not use payment, checkout, billing, mandate, or payment-initiation drop-ins from any provider.
- Use only account information capabilities.

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

- Investment data may not be available through PSD2 or Enable Banking Account Information.

Decision:

- Treat Trade Republic separately from the initial PSD2 bank connection path.

Consequences:

- Manual assets can represent investment values initially.
- The banking foundation can progress without being blocked by investment integration uncertainty.
- Any future Trade Republic integration must be evaluated separately.

Possible future revisit trigger:

- If a safe official API, reliable export, or appropriate integration path becomes available.

## ADR-009: Keep All Bank Data Provider Calls Server-Side

Status:

- Accepted.

Context:

- Bank data provider credentials, signing keys, and tokens are sensitive.

Decision:

- All bank data provider API calls must happen in server-only code.

Consequences:

- The browser never receives Enable Banking signing keys, provider tokens, Supabase service role keys, or other sensitive credentials.
- UI must call internal server endpoints or actions instead of Enable Banking directly.
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

- The app needs to store bank transactions in Supabase and sync them repeatedly from the selected bank data provider.
- The provider later changed to Enable Banking, but repeated syncs still must not create duplicate transaction rows.
- Bank data provider output can include useful provider identifiers, bank-provided transaction IDs, entry references, and end-to-end IDs.
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
- The setup should stay small and avoid becoming a parallel hand-built design system.

Decision:

- Use shadcn/ui as the component foundation.
- Use Tailwind CSS v4 with `@tailwindcss/postcss`.
- Initialize shadcn/ui with preset `b6thgHlWC`, which generated the `base-sera` style, olive base color, CSS variables, and Lucide icon configuration.
- Prefer components from `components/ui/` over custom UI primitives by default.
- Add additional shadcn/ui components from the selected preset when a feature needs them.
- Keep custom CSS limited to theme tokens, base rules, and screen-specific composition that cannot reasonably live as Tailwind utilities.

Consequences:

- Future screens can reuse a consistent component convention.
- UI components live under `components/ui/`.
- Shared class merging lives in `lib/utils.ts`.
- The project now depends on the shadcn/Tailwind styling toolchain.
- Further UI components should be added only when a feature needs them, but they should come from the selected shadcn/ui preset by default.
- Avoid recreating cards, buttons, inputs, tooltips, dialogs, or similar primitives with one-off CSS unless the exception is intentional and documented.

Possible future revisit trigger:

- If the selected preset does not fit the finance product once real private screens exist.
- If the app adopts a different design system intentionally.

## ADR-016: Use Enable Banking For Initial PSD2 Account Information

Status:

- Accepted.

Context:

- The product needs read-only account, balance, and transaction access for
  CaixaBank and ING.
- GoCardless Bank Account Data was originally selected, but new private signups
  were unavailable when the project reached provider setup.
- Enable Banking supports Account Information through PSD2/Open Banking.
- Enable Banking allows a production application restricted to the owner's own
  linked accounts, which matches the current personal-use scope.
- CaixaBank and ING appear as available ASPSPs and have been linked manually.
- Trade Republic does not appear as an available ASPSP and remains outside the
  initial PSD2 path.

Decision:

- Use Enable Banking as the primary banking data provider for the initial PSD2
  integration.
- Use only Account Information capabilities.
- Keep the app read-only with respect to banks.
- Treat the current Enable Banking application as a restricted own-accounts
  integration, not a public commercial multi-user integration.

Consequences:

- Provider-specific modules should use `enable-banking` naming.
- Server-side code must sign provider requests with the configured private key.
- The private key must remain server-only and must not be committed.
- Documentation and environment variables should use the `ENABLE_BANKING_`
  prefix.
- Consent, account, balance, transaction, and sync concepts remain provider
  neutral in the data model where possible.

Possible future revisit trigger:

- If Enable Banking stops supporting own linked accounts.
- If CaixaBank or ING coverage proves unreliable.
- If another provider offers a better free personal-use path.

## ADR-017: Use Service Role Only For Controlled Provider Writes

Status:

- Accepted.

Context:

- Financial tables expose owner-scoped read policies to authenticated users.
- Provider-owned records such as bank connections, accounts, sync runs, and
  consent events should not be writable directly from the browser.
- The Enable Banking connection flow needs server-side writes after starting
  authorization and after validating the provider callback.

Decision:

- Add a server-only Supabase elevated-access helper backed by
  `SUPABASE_SECRET_KEYS`.
- Use elevated Supabase access only in server-only provider flows where RLS
  intentionally blocks browser writes.
- Validate the authenticated user and email allowlist before starting provider
  authorization, then validate the provider callback `state` against the
  pending connection before updating user-owned financial records.
- Continue using the normal RLS-aware server client for ordinary user-facing
  reads.

Consequences:

- Browser clients cannot insert or mutate provider-owned financial rows.
- Elevated Supabase usage is easier to audit because it is isolated in
  server-only modules.
- Future sync jobs may use the same pattern, but each use must preserve
  explicit ownership checks.

Possible future revisit trigger:

- If SQL security-definer functions or tighter RLS write policies become a
  better fit for provider-controlled writes.

## ADR-018: Use A Data Source Boundary For Real And Demo Data

Status:

- Accepted.

Context:

- Enable Banking production access is limited and not convenient for everyday
  local UI development.
- The UI should not know whether data came from Supabase, Enable Banking, or
  local mocks.
- Route TSX files should stay thin and avoid embedding data collection logic.

Decision:

- Use a ports-and-adapters style data source boundary under `lib/data/`.
- Keep local mock financial data under `lib/demo/`.
- Prepare route-level view props under `lib/views/`.
- Select demo data only when `MONEY_JUGGLE_DEMO_MODE=true`, Next.js is running
  in development, and the app is not running on Vercel.
- Keep demo mode server-only; do not expose a `NEXT_PUBLIC_` demo switch.

Consequences:

- UI components receive props and do not call Supabase, Enable Banking, or
  internal data endpoints directly.
- Demo and real data must satisfy the same application-facing contract.
- Local UI work can proceed without Supabase Auth, Supabase Postgres, or Enable
  Banking credentials.
- Production remains on the real adapter and keeps the existing auth, allowlist,
  RLS, and server-only integration boundaries.

Possible future revisit trigger:

- If the app introduces additional providers or needs a richer domain service
  layer above the data source adapters.

## ADR-019: Keep Shared Definitions Behind A Root Definitions Entry Point

Status:

- Accepted.

Context:

- Types, view contracts, demo records, provider constants, and status-message
  maps were starting to live across several feature files.
- The project is still small, and a single definitions entry point makes
  imports easy to audit while area-specific files keep definitions navigable.

Decision:

- Keep shared TypeScript types, interfaces, domain constants, demo data, and
  status maps under the root `definitions/` directory.
- Group definitions by functional area and re-export them from
  `definitions/index.ts`.
- Import definitions from `@/definitions` so feature modules do not depend on
  the specific definitions file layout.
- Keep executable behavior, framework-required exports, server-only clients,
  and UI variant builders in their owning modules.

Consequences:

- Feature modules stay focused on behavior and composition.
- Shared contracts are easier to find and review.
- Definitions files must not import server-only modules or expose sensitive
  credentials.

Possible future revisit trigger:

- If a functional area becomes large enough to need its own documented public
  contract outside the shared definitions surface.

## ADR-020: Sync Balances Automatically From The Private Home Screen

Status:

- Accepted.

Context:

- Balance data should appear inside the existing institution cards without
  asking the owner to press an explicit refresh button.
- Enable Banking balance calls must remain server-only.
- The first balance feature should stay small and avoid scheduled sync until
  transaction idempotency and cron behavior are designed later.

Decision:

- Trigger balance synchronization automatically after a bank connection is
  completed.
- Also refresh linked connections through an internal
  `POST /api/sync/balances` request when the private home screen loads and the
  latest stored balance is missing or older than a short freshness window.
- Let the internal sync route read the authenticated owner's provider-managed
  connection rows with the secret-key-backed client, scoped by `user_id`,
  because the route is about to perform controlled provider writes that RLS
  blocks.
- Keep the refresh control out of the UI for now.
- Store each provider response as a new balance snapshot instead of overwriting
  previous snapshots.

Consequences:

- The private home screen can show current balances without a manual action.
- Provider calls remain behind the server-only data source and database layers.
- Repeated page loads are rate-limited by the freshness window rather than
  calling Enable Banking every time.
- Production logs expose the internal sync route and sync eligibility decision,
  making balance refresh behavior easier to diagnose.
- Future scheduled sync can reuse the same server-only synchronization logic.

Possible future revisit trigger:

- If Enable Banking rate limits require a longer freshness window.
- If the owner wants an explicit manual refresh affordance later.

## ADR-021: Keep Visual Styling Bound To The Shadcn Preset

Status:

- Accepted.

Context:

- The app uses the shadcn preset as its visual source of truth.
- Shape and color drift can appear when shared components use fixed utility
  values instead of theme-backed tokens.

Decision:

- Keep global shape controlled by the shadcn radius token.
- Use theme-backed Tailwind utilities for shared component radius and colors.
- Keep the selected sharp-corner preset represented by `--radius: 0rem`.
- Avoid hardcoded visual colors in app UI unless they are documented as a
  deliberate exception.

Consequences:

- Existing `rounded-*` utilities resolve to sharp corners through the preset
  token.
- Future preset changes can flow through shared components without rewriting
  every caller.

Possible future revisit trigger:

- If a future design pass chooses a different shadcn radius or color preset.

## ADR-022: Treat Stale Bank Authorization Attempts As Retryable

Status:

- Accepted.

Context:

- Enable Banking authorization starts by storing a `bank_connections` row with
  `status = linking` before redirecting the owner to the provider flow.
- If the provider callback never returns, the browser is closed, or the bank
  flow fails outside the callback path, that row can remain in `linking`.
- A permanently `linking` row blocks the institution card from starting a new
  connection attempt.

Decision:

- Treat a `linking` connection as stale when its `updated_at` timestamp is more
  than 15 minutes old.
- Present stale linking attempts as a recoverable UI state instead of an
  indefinite loading state.
- Allow the owner to retry the connection from that state by using the existing
  server-side Enable Banking start flow.
- Do not delete or mutate the stale attempt as part of this first recovery UI;
  keep the previous row as consent history.

Consequences:

- The owner can recover from abandoned or failed provider redirects without
  manual database changes.
- The retry still uses the existing server-only provider flow, so sensitive
  Enable Banking credentials remain off the browser.
- Stale authorization rows may remain in the database until a later cleanup or
  explicit cancellation feature is implemented.

Possible future revisit trigger:

- If stale `linking` rows become noisy enough to require automatic cleanup.
- If the owner wants an explicit cancel action or audit event for abandoned
  authorization attempts.

## ADR-023: Identify Transaction Institution By Row Color

Status:

- Accepted.

Context:

- The first transaction table needs to show current-month movements below the
  account cards.
- The owner wants a simple table and does not want a separate visible account
  column in the first version.
- Transactions still need an immediate visual cue for whether they came from
  CaixaBank or ING.

Decision:

- Store corporate bank colors as global CSS variables:
  `--bank-color-caixabank: #0c9cdb` and `--bank-color-ing: #ff6200`.
- Color each transaction row according to the source institution.
- Keep account and institution details available in prepared transaction data
  and accessible row labels, but do not show them as a dedicated column in the
  first table.

Consequences:

- The table stays compact while preserving source-bank context.
- Future filters or detail drawers can reuse the account metadata already
  prepared for each row.
- Corporate colors are a deliberate exception to the general theme-token-only
  UI rule.

Possible future revisit trigger:

- If more institutions are added and color alone stops being enough.
- If accessibility review shows that a visible institution label is needed.

## ADR-024: Treat Current-Month Transactions As Review UI, Not Reports

Status:

- Accepted.

Context:

- The private home screen now includes a transactions tab with current-month
  movements.
- The table groups rows by booking date and supports filters for institution,
  income, and spending.
- The app still does not have category assignment, monthly totals by category,
  trend calculations, or report persistence.

Decision:

- Treat the current transactions tab as a review surface over synced rows.
- Keep monthly reports as a separate future feature.
- Keep transaction filters client-side over already-authorized owner data; they
  improve review speed but are not an authorization boundary.
- Do not introduce reporting abstractions until categorization and report
  requirements are clearer.

Consequences:

- The owner can inspect recent data without waiting for the full reporting
  model.
- Future report work can build on synced transaction data without being coupled
  to the current compact table layout.
- Documentation should avoid marking monthly reports complete merely because
  current-month transactions are visible.

Possible future revisit trigger:

- If the transactions tab starts showing calculated totals, category rollups,
  or month-over-month comparisons that become report behavior.

## ADR-025: Keep Authentication Diagnostics Sanitized

Status:

- Accepted.

Context:

- Magic-link authentication can fail for several operational reasons, including
  missing allowlist configuration, Supabase rate limits, callback exchange
  errors, and cookie write behavior.
- Troubleshooting these failures needs server-side visibility.
- Auth-related logs can easily expose sensitive identifiers if they are not
  constrained.

Decision:

- Log authentication milestones from server-only code with generated auth log
  IDs.
- Mask email addresses before logging them.
- Sanitize Supabase errors to names, messages, statuses, and codes rather than
  logging raw objects.
- Log cookie diagnostics only as counts and booleans, never cookie values.
- Never log magic-link codes, session tokens, refresh tokens, private keys,
  Supabase secret keys, or full email addresses.

Consequences:

- Login and callback issues are easier to diagnose in production logs.
- Auth diagnostics remain separate from a future formal audit log.
- Future auth changes should preserve the same sanitization rules.

Possible future revisit trigger:

- If the app adds a structured audit log, centralized observability, or stricter
  privacy controls for operational logs.

## ADR-026: Exclude Own-Account Transfers From Monthly Cashflow

Status:

- Accepted.

Context:

- Monthly income and expense cards originally summed current-month transactions
  by sign only.
- Transfers between the owner's own connected accounts appear as one negative
  movement in the source account and one positive movement in the destination
  account.
- Counting those movements as spending and income overstates real cashflow.
- Full IBAN storage would make matching easier but would increase the impact of
  accidental exposure.

Decision:

- Keep full IBAN values out of the database.
- Store nullable server-generated HMAC fingerprints for own account identifiers
  and transaction counterparty identifiers when the provider sends them and the
  server-only fingerprint secret is configured.
- Classify own-account transfers before building the monthly cashflow summary.
- Exclude classified own-account transfers from monthly income and expense
  totals while keeping the original transactions available for review.
- Use a conservative paired last-4 fallback for existing or incomplete rows,
  requiring opposite signed amounts, matching currency, nearby booking dates,
  different accounts, and reciprocal account suffixes.

Consequences:

- The monthly cards better represent money entering and leaving the owner's
  financial world instead of money moving between the owner's accounts.
- Existing rows can still be classified when both sides of a transfer are
  present and contain reciprocal account suffixes.
- Future syncs can classify more reliably when account fingerprints are
  populated.
- False positives should be rare because weak suffix-only matching is used only
  for paired reciprocal movements.

Possible future revisit trigger:

- If the provider omits counterparty account identifiers frequently.
- If transfers need manual review, override, or a visible transaction label.
- If investment accounts introduce cash movements that need separate treatment.
