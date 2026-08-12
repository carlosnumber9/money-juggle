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

- Superseded by ADR-035.

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

- The login page is publicly reachable even though the app does not expose
  sign-up.
- Authentication alone should not decide who may read owner financial data.

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

- Superseded by ADR-041 for Trade Republic current-account cash and movements.
- Still applicable to brokerage positions, crypto holdings, and portfolio
  valuation.

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
  CaixaBank, ING, and the Trade Republic current account.
- GoCardless Bank Account Data was originally selected, but new private signups
  were unavailable when the project reached provider setup.
- Enable Banking supports Account Information through PSD2/Open Banking.
- Enable Banking allows a production application restricted to the owner's own
  linked accounts, which matches the current personal-use scope.
- CaixaBank and ING appear as available ASPSPs and have been linked manually.
- Trade Republic was not available when this decision was accepted. It was
  added as a beta personal AIS integration in August 2026.

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

## ADR-018: Use A Data Source Boundary For Alternate Runtime Data

Status:

- Superseded by ADR-040.

Context:

- Enable Banking access was considered inconvenient for everyday local UI
  development.
- The UI should not know whether data came from Supabase, Enable Banking, or
  alternate local records.
- Route TSX files should stay thin and avoid embedding data collection logic.

Decision:

- Use a ports-and-adapters style data source boundary under `lib/data/`.
- Prepare route-level view props under `lib/views/`.
- Originally support an alternate server-only source backed by static local
  financial records.

Consequences:

- UI components receive props and do not call Supabase, Enable Banking, or
  internal data endpoints directly.
- Both sources were required to satisfy the same application-facing contract.
- ADR-040 later removed alternate runtime behavior while preserving the data
  source boundary.

Possible future revisit trigger:

- Superseded; see ADR-040.

## ADR-019: Keep Shared Definitions Behind A Root Definitions Entry Point

Status:

- Accepted.

Context:

- Types, view contracts, provider constants, and status-message maps were
  starting to live across several feature files.
- The project is still small, and a single definitions entry point makes
  imports easy to audit while area-specific files keep definitions navigable.

Decision:

- Keep shared TypeScript types, interfaces, domain constants, and status maps
  under the root `definitions/` directory.
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

- Accepted; the refresh-control decision is superseded by ADR-033.

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

- Authentication can fail for several operational reasons, including missing
  allowlist configuration, invalid credentials, Supabase rate limits, and
  cookie write behavior.
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
- Never log passwords, session tokens, refresh tokens, private keys,
  Supabase secret keys, or full email addresses.

Consequences:

- Login and session issues are easier to diagnose in production logs.
- Auth diagnostics remain separate from a future formal audit log.
- Future auth changes should preserve the same sanitization rules.

Possible future revisit trigger:

- If the app adds a structured audit log, centralized observability, or stricter
  privacy controls for operational logs.

## ADR-026: Treat Own-Account Transfers As Financially Neutral

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
- Classify own-account transfers from provider account fingerprints or the
  conservative paired fallback before building transaction-derived reports.
- Treat the owner-assigned `internal_transfer` category as an authoritative
  manual override when provider metadata cannot identify the movement.
- Use one shared domain rule for detected and manually categorized internal
  transfers in every current and future transaction-derived financial metric.
- Exclude internal transfers from income, spending, category, and label report
  amounts and transaction counts, as well as report currency selection.
- Keep the original transactions and amounts available for review, but exclude
  internal transfers from transaction-list income and expense filters.
- Use a conservative paired last-4 fallback for existing or incomplete rows,
  requiring opposite signed amounts, matching currency, nearby booking dates,
  different accounts, and reciprocal account suffixes.
- Load the fallback's three-day matching context around a requested reporting
  range, then return only movements inside the original range.

Consequences:

- The monthly cards better represent money entering and leaving the owner's
  financial world instead of money moving between the owner's accounts.
- Existing rows can still be classified when both sides of a transfer are
  present and contain reciprocal account suffixes.
- Transfers that cross a month or year boundary keep the same classification
  in the adjacent reports.
- Manual categorization supplies a safe owner-controlled override without
  changing provider-owned transaction fields.
- Future syncs can classify more reliably when account fingerprints are
  populated.
- False positives should be rare because weak suffix-only matching is used only
  for paired reciprocal movements.

Possible future revisit trigger:

- If the provider omits counterparty account identifiers frequently.
- If transfers need a dedicated review state beyond the existing category.
- If investment accounts introduce cash movements that need separate treatment.

## ADR-027: Seed Initial User-Owned Transaction Categories

Status:

- Accepted.

Context:

- The category and category group tables already exist and are owned by
  `user_id`.
- The first category set is a personal reporting starting point, not a global
  taxonomy for all future users.
- Category names are future user-visible app text and should be Spanish.
- Internal slugs remain English for code, queries, and migrations.

Decision:

- Seed the initial category groups and categories through a Supabase migration.
- Create the rows for profiles that already exist when the migration runs.
- Use stable English slugs and Spanish display names.
- Keep the seed limited to category metadata only; do not add category UI,
  category assignment flows, rules, or report rollups in the same step.
- Use later migrations to add, rename, or archive categories as the owner's
  personal reporting model changes.
- Categorize mixed repayments from shared-expense tools as
  `shared_expense_settlement` (`Liquidación de gastos compartidos`) under the
  financial group. Keep the trip or event context in optional labels instead of
  assigning the whole settlement to one underlying expense category.
- Add `hair_beauty` (`Peluquería y belleza`) under health and wellness.
- Keep the existing `vehicle_insurance` slug and use `Seguro de automóvil` as
  its display name so existing assignments remain valid without a duplicate
  category.

Consequences:

- The app can start from a useful category catalog before visual category
  management exists.
- Future profiles will need an explicit seed step if the app becomes multi-user.
- Used categories should usually be archived instead of deleted, because
  transactions can reference them through `transactions.category_id`.
- Shared-expense settlements remain visible as adjustments instead of being
  misreported as loans, internal transfers, or arbitrary travel expenses.

Possible future revisit trigger:

- If category defaults need to be created automatically for each new profile.
- If the app introduces shared household categories or a reusable template
  catalog.

## ADR-028: Show Transaction Categories Inline In The Review Table

Status:

- Accepted.

Context:

- The owner wants category review to happen directly where monthly transactions
  are already inspected.
- The schema already links `transactions.category_id` to user-owned
  `transaction_categories`.
- Category assignment is user-owned app metadata and should remain separate
  from provider transaction sync.

Decision:

- Show each transaction category under the transaction description in the
  monthly transaction row.
- Use a compact popover affordance with search for the category picker, styled
  with the existing shadcn/ui button and input primitives.
- Group select options by category group, using the group name as a
  non-selectable label.
- Persist category changes with a small server action.
- Use a server-only database helper with Supabase service role to update only
  `transactions.category_id`, after validating that both the transaction and
  selected category belong to the authenticated owner.
- Allow assigning `null` again through the `Sin categoría` option.

Consequences:

- The row layout can support category assignment without creating a separate
  categorization screen.
- The service role remains contained to a narrow server-only write path because
  the current transaction RLS policies are read-only.
- Provider transaction sync remains separate from user-owned category metadata.

Possible future revisit trigger:

- If category management becomes complex enough to need a dedicated screen.
- If keyboard navigation or mobile ergonomics require a different picker
  primitive.

## ADR-029: Start Reports With A Current-Year Evolution Chart

Status:

- Accepted.

Context:

- The owner wants the next roadmap slice to start monthly reports with a new
  `Evolución` section after `Transacciones`.
- The app currently syncs and stores transactions, but it does not have report
  tables, report snapshots, budgets, or month-over-month persistence.
- The first useful chart should show 12 monthly points for the current year,
  even when only the current month has data.

Decision:

- Add `Evolución` as a third private-home tab.
- Use the configured shadcn/ui chart wrapper and Recharts for the first line
  chart.
- Calculate the chart from cached transaction rows for the current year.
- Keep income and expense values as view-model output, with expenses shown as
  positive spending amounts.
- Show `Progreso anual` as the chart title and use the subtitle for total
  income and total spending in the selected currency.
- Keep permanent point markers hidden; only interactive points should appear on
  hover or tap.
- Exclude detected or manually categorized internal transfers from both lines,
  matching the monthly dashboard summary and the shared financial-neutrality
  rule.
- Do not add report persistence, report migrations, or new provider sync paths
  in this first slice.

Consequences:

- The owner gets an immediate annual trend view without broad architecture
  changes.
- Months without stored data remain visible as zero-value points.
- Future report work can add category rollups, persisted snapshots, or richer
  currency handling without changing the initial navigation concept.

Possible future revisit trigger:

- If multi-currency accounts need simultaneous chart lines or a currency
  selector.
- If reports must remain stable after transaction recategorization or provider
  data corrections.

## ADR-030: Use Labels For Optional Cross-Category Transaction Grouping

Status:

- Accepted and implemented for creation and assignment.

Context:

- Categories already describe the type of movement, such as restaurant, hotel,
  salary, or rent.
- The owner wants to group movements for contexts that cut across categories,
  such as the total cost of a trip with flights, hotels, restaurants, and local
  transport.
- Most transactions should not need this extra metadata.

Decision:

- Use `labels` as the internal concept.
- Use `Etiquetas` as the Spanish user-visible term.
- Treat labels as optional user-owned transaction metadata.
- Use a `transaction_labels` table plus a
  `transaction_label_assignments` join table over a single nullable
  `transactions.label_id` column. A transaction can carry multiple labels.
- Keep labels separate from categories and from provider-owned transaction
  data.
- Create, assign, and remove labels from transaction detail. Keep table chips
  informational and defer global management and reporting UI.
- Treat names as equal after whitespace normalization and case folding, while
  preserving the original display spelling.

Consequences:

- Reports can filter or group by a trip, event, or project without disturbing
  category totals.
- Labels require RLS and ownership checks because they can reveal sensitive
  personal context.
- Provider sync must preserve label assignments just as it preserves category
  assignments.

Possible future revisit trigger:

- If the UI proves that only one label per transaction is ever needed.
- If labels evolve into a broader budgeting, project, or reimbursement feature.

## ADR-031: Explore Cobee By Pluxee As A Separate Non-Bank Data Source

Status:

- Accepted as a roadmap concept.

Context:

- The owner uses Cobee by Pluxee for restaurant expenses through flexible
  compensation.
- Cobee publishes a public API with credential-based authentication, company
  and employee endpoints, and employee consumption reports.
- Cobee is not a PSD2 bank Account Information provider and should not be
  modeled as an Enable Banking connection.

Decision:

- Treat Cobee by Pluxee as a separate future external data source.
- Start with research and a read-only spike only after API credentials and
  allowed use are confirmed.
- Keep Cobee credentials and JWTs server-only.
- Focus the first useful scope on consumption report reads.
- Do not implement employee administration, benefit administration, or payroll
  mutation endpoints for the first Cobee slice.

Consequences:

- Cobee report data can eventually complement bank transactions without
  changing the PSD2 provider boundary.
- The data model may need Cobee-specific tables or a generic external
  connection model later, but no migration should be created before the data
  shape is validated.
- Reports should distinguish aggregate payroll-cycle consumption from
  transaction-level bank movements unless Cobee exposes purchase-level detail.

Possible future revisit trigger:

- If Cobee access is unavailable for personal use.
- If Cobee only exposes aggregates that are not useful for the owner's reports.
- If another benefit provider integration becomes a better source of the same
  data.

## ADR-032: Add Month Navigation Before Arbitrary Date Ranges

Status:

- Accepted and implemented.

Context:

- The transaction review currently focuses on the current month.
- The reporting area already has current-month summaries and visualizations,
  plus an annual evolution chart.
- The owner wants to explore older stored movements and matching charts by
  moving month by month.

Decision:

- Add explicit previous/next month navigation before building arbitrary date
  range filters.
- Treat the selected month as shared report state for transaction rows,
  monthly cashflow cards, and month-specific charts.
- Prefer URL-backed state so refresh, browser history, and shared links preserve
  the selected month.
- Keep historical sync separate from period navigation; changing the selected
  month should first explore stored data, not automatically launch broad
  provider synchronization.
- Validate `month=YYYY-MM` on the server, fall back to the current month for
  invalid or future values, and disable forward navigation at the current
  month.
- Keep the annual evolution chart on the current calendar year while the
  transaction review, cashflow cards, and category radar follow the selected
  month.

Consequences:

- The first historical exploration feature stays understandable and mobile
  friendly.
- The app can reuse month range helpers instead of introducing a full reporting
  query language.
- Empty months need clear UI states because stored data coverage may be partial.

Possible future revisit trigger:

- If the owner needs custom ranges for travel, taxes, reimbursements, or
  year-to-date reports.
- If provider sync later supports controlled historical backfill with clear
  limits and observability.

## ADR-033: Centralize Manual Refresh On The Dashboard

Status:

- Accepted.

Context:

- Balance and transaction synchronization already run automatically when the
  private home screen mounts.
- The transaction tab previously owned a transaction-only refresh control,
  while balance refresh had no manual UI.
- Historical import is now a separate dashboard action and must not run at the
  same time as routine refresh.

Decision:

- Place `Actualizar` below the bank cards beside `Importar historial`.
- Treat manual refresh as a global action that forces linked-account balance
  refresh and performs incremental transaction synchronization.
- Keep automatic refresh on private-home load, but respect the balance freshness
  window while still running incremental transaction synchronization.
- Define the incremental transaction range as the first day of the previous
  month through the current day.
- Prevent the dashboard UI from launching refresh and historical backfill
  concurrently.
- Remove synchronization controls and ownership from the transaction review
  panel.

Consequences:

- The owner has one predictable place for routine data refresh.
- The overlapping transaction window can reconcile late and provisional
  movements without repeatedly fetching the full year.
- Manual refresh may use more provider calls than automatic refresh because it
  deliberately bypasses balance freshness checks.
- Provider calls remain authenticated, allowlisted, and server-only.

Possible future revisit trigger:

- If scheduled synchronization makes manual refresh unnecessary.
- If provider rate limits require a longer transaction overlap or per-bank
  refresh controls.

## ADR-034: Use Vitest And Risk-Based Coverage

Status:

- Accepted and implemented.

Context:

- The repository had static checks but no automated test runner or CI workflow.
- Most current business behavior is implemented as TypeScript functions that
  can be tested without a browser.
- Financial identity, normalization, and synchronization behavior need stronger
  regression protection than presentation-only code.

Decision:

- Use Vitest with the V8 coverage provider for unit and focused integration
  tests.
- Run tests in Node and keep them colocated as `*.test.ts`.
- Use coverage to reveal gaps without enforcing a global percentage threshold.
- Prioritize utilities first, followed by domain summaries, financial identity,
  normalization, and server orchestration.
- Keep React component tests, browser E2E tests, and local Supabase integration
  outside the initial testing roadmap.
- Use Node.js 24 consistently for development guidance, GitHub Actions, and
  Vercel.
- Run `check` and `test:coverage` in GitHub Actions for pull requests and pushes
  to `main`; leave builds and deployments to Vercel.

Consequences:

- The initial suite stays fast and does not need external credentials or local
  services.
- GitHub CI can become a required Vercel Deployment Check before production is
  promoted.
- In-memory doubles cannot prove Supabase constraints or RLS behavior, so that
  remains a documented residual risk.
- Coverage growth is evaluated by meaningful scenarios rather than a target
  percentage.

Possible future revisit trigger:

- If UI regressions justify selective React Testing Library coverage.
- If database behavior warrants local Supabase and policy tests.
- If critical user journeys justify Playwright tests against preview
  deployments.

## ADR-035: Replace Magic Links With Owner Password Login

Status:

- Accepted and implemented.

Context:

- The installed iOS web app has cookies and storage separate from the default
  browser.
- Magic links opened from email therefore complete outside the installed web
  app and cannot reliably establish its session.
- Email OTP would require customizing the Supabase email template, which in the
  current hosted setup would add an unnecessary custom SMTP dependency.
- The app has one owner with administrative access to Supabase.

Decision:

- Authenticate the existing owner with Supabase email and password login.
- Keep public sign-up, self-service password recovery, and in-app password
  changes out of scope.
- Provision or rotate the owner password through a controlled, server-only
  Supabase admin operation.
- Keep the email allowlist before and after authentication.
- Remove the email auth callback and all magic-link request behavior.
- Refresh cookie-backed sessions in the Next.js Proxy and return the refreshed
  cookies and no-cache headers to the browser.

Consequences:

- Login completes inside the installed web app on iOS and desktop.
- The owner must use a strong, unique password stored in a password manager.
- Losing the password requires an administrative reset rather than a public
  recovery flow.
- Existing sessions do not need to be revoked when the login method changes.
- Resend, custom SMTP, and auth email templates are not required.

Possible future revisit trigger:

- If passkeys become the preferred stable authentication method.
- If the app gains additional users or needs self-service recovery.

## ADR-036: Protect Provider Synchronization Per Connection

Status:

- Accepted and implemented incrementally.

Context:

- Enable Banking can return `ASPSP_RATE_LIMIT_EXCEEDED` when the target bank
  refuses additional account-data requests.
- Balance and transaction synchronization previously retried independently,
  so a page reload could contact the same bank again immediately.

Decision:

- Persist `provider_rate_limited_until` on each bank connection.
- Apply a six-hour cooldown after an ASPSP rate limit, as recommended by Enable
  Banking for background retrieval.
- Check the cooldown before both balance and transaction requests, including
  manual and historical synchronization.
- Stop processing further accounts in a connection after the first rate-limit
  response.
- Use a single dashboard synchronization route that runs eligible balance work
  before transaction work instead of launching both resource routes in
  parallel.
- Acquire a short atomic lease per bank connection before dashboard, isolated
  resource, or historical synchronization and release only the caller's token.
- Let leases expire automatically so an interrupted server process cannot block
  later synchronization indefinitely.
- Apply a six-hour freshness window to automatic balance and incremental
  transaction refresh while allowing the manual control to bypass freshness.
- Store `last_transaction_synced_at` separately because the legacy
  `last_synced_at` value is shared with balance synchronization.
- Forward available PSU context for user-present dashboard, manual, backfill,
  and post-authorization requests only after every ASPSP-required header can be
  satisfied.
- Persist only required PSU header names in provider metadata; never persist or
  log the request's IP address, user agent, or browser header values.
- Share client-side synchronization activity through the private layout so the
  app logo can pulse throughout refresh and backfill work without replacing the
  existing button-level loading feedback.
- Keep the cooldown server-managed and scoped by both connection ID and owner.

Consequences:

- Reloads and separate synchronization routes cannot repeatedly contact a bank
  during the known cooldown.
- A past deadline remains useful operational history but no longer blocks work.
- A later synchronization-orchestration step can expose the same deadline to a
  single dashboard response.

Possible future revisit trigger:

- If an ASPSP provides a reliable `Retry-After` value that should override the
  default six-hour window.

## ADR-037: Show Only Net Spending In The Category Radar

Status:

- Accepted and implemented.

Context:

- Signed category movements can mix expenses with refunds, reimbursements, or
  other incoming amounts during the same month.
- The category radar is intended to explain where the owner incurred spending,
  not where the owner received a net benefit.
- Including every non-zero movement can produce negative category values, and
  filtering only zero-valued transactions still leaves categories whose final
  monthly net is zero.

Decision:

- Continue netting every included category from its signed monthly movements so
  refunds and reimbursements reduce the reported expense.
- Exclude detected or manually categorized internal transfers through the
  shared financial-neutrality rule, followed by the existing stable
  category-slug exclusions, before calculating reportable category totals.
- Include a category in the radar only when its final net spending is strictly
  greater than zero.
- Calculate the radar summary total and transaction count from those included
  net-spending categories so the description matches the plotted data.

Consequences:

- Categories that produce net income or break even during the selected month do
  not appear in the expense radar.
- A category with both charges and refunds still appears when the remaining net
  result is an expense.
- The chart never receives negative or zero expense points.

Possible future revisit trigger:

- If the owner wants a separate visualization for reimbursements, income by
  category, or categories that break even.

## ADR-038: Separate Bank And Reporting Transaction Dates

Status:

- Accepted and implemented.

Context:

- Enable Banking supplies `booking_date`, which must remain available as the
  provider-owned date.
- Some movements should count toward a different date in the review list and
  financial reports without changing the bank data.
- Period queries must find movements moved in from another month, so resolving
  the date only after loading rows would be incomplete.

Decision:

- Add one app-owned `reporting_date` column to transactions and backfill it from
  `booking_date`.
- Initialize new rows from the booking date and preserve every existing
  non-null reporting date during provider upserts.
- Use `reporting_date` for period selection, ordering, grouping, cashflow cards,
  and charts.
- Continue using `booking_date` for provider identity and internal-transfer
  matching.
- Let the owner edit the reporting date from the transaction detail dialog
  through an authenticated, owner-scoped server action.
- Save immediately after calendar selection and keep a cross-month movement in
  the current client-side list until reload or month navigation.

Consequences:

- Manual period corrections survive later bank synchronization.
- The original bank date remains separately available and highlighted in the
  date picker.
- A temporary open list may contain a movement whose reporting date falls
  outside its selected month, while refreshed cards and charts use the
  persisted date immediately.
- The schema does not record whether the current reporting date was explicitly
  chosen or merely initialized from the bank date.

Possible future revisit trigger:

- If date-change history, an explicit reset state, or audit metadata becomes
  useful.

## ADR-039: Reconcile Neutral Cash Flow Through Finalized Groups

Status:

- Accepted and implemented.

Context:

- Loans, reimbursements, and refunds can create bank income and expense rows
  that should not represent earned income or personal consumption.
- Related movements can span reporting periods and can retain a small signed
  difference, so an exact pair or one boolean cannot explain the treatment.
- Internal transfers already have a separate neutrality rule and must continue
  to coexist without double counting.

Decision:

- Store finalized, owner-scoped reconciliation groups and ordered transaction
  memberships. Do not persist open drafts.
- Require at least two distinct booked, same-currency, externally reportable
  movements when adding new members. Existing members remain linked if later
  provider data changes their status or transfer classification.
- Allow one transaction in at most one reconciliation and use owner-composite
  foreign keys plus RLS even though the initial deployment has one owner.
- Derive balance from current transaction amounts rather than snapshots. A
  zero-saved group that later drifts is neutralized until the owner reviews it.
- For a non-zero balance, let the owner neutralize it or report it once through
  an existing reportable category, an editable reporting date, and optional
  labels.
- Save group metadata, membership, labels, and new label names through one
  authenticated PostgreSQL function so concurrent or partial writes cannot
  leave inconsistent state.
- Build one reporting-movement source that removes internal transfers and
  reconciliation members before adding reportable reconciliation differences.
- Keep original bank transactions visible and unchanged. Expose reconciliation
  state through `Compensado`, a review dialog, atomic editing, and confirmed hard
  deletion.
- Use a centered shadcn dialog on desktop and a borderless, swipeable bottom
  sheet on narrow screens. Expose the feature for eligible authenticated owner
  transactions.

Consequences:

- Dashboard cards, charts, counts, primary currency, and direction filters share
  the same financial-neutrality result.
- A provider amount correction can alter a reportable residual without changing
  app-owned group metadata. Originally balanced groups surface a review warning
  instead of silently inventing a reporting category.
- Deleting a group restores each original transaction to reports unless it is
  still neutral because it is an internal transfer.
- Partial allocation within one transaction and persisted open drafts remain
  outside this version.

Possible future revisit trigger:

- If shared expenses require allocating only part of one bank transaction or if
  open debt tracking becomes a product goal.

## ADR-040: Use One Authenticated Banking Runtime

Status:

- Accepted and implemented.

Context:

- The application is a small personal repository with one owner and one
  deployed execution path.
- The alternate local runtime was unused and added branches across
  authentication, session refresh, provider flows, synchronization, financial
  mutations, view contracts, and UI behavior.
- Simulated successful links and writes could diverge from the authenticated,
  owner-scoped behavior that matters in production.

Decision:

- Keep one server-only `BankingDataSource` implementation backed by Supabase
  Auth, Supabase Postgres, and Enable Banking.
- Remove the runtime switch, static local financial records, authentication
  bypasses, simulated provider responses, and non-persistent mutations.
- Require local development to configure and use the same authenticated service
  paths as the deployed application.
- Preserve the application-facing data source and prepared-view boundaries so
  UI modules remain independent from provider and persistence details.
- Preserve `incremental` and `backfill` transaction synchronization modes;
  those describe synchronization scope, not alternate application runtimes.

Consequences:

- Local and deployed behavior now exercise the same authentication, allowlist,
  ownership, RLS, persistence, and provider boundaries.
- The codebase loses cross-cutting runtime branches and static financial data.
- Private local UI work now requires valid development configuration and cannot
  run as an offline financial-data simulation.
- Focused unit tests may still mock individual network or persistence boundaries,
  but the application has no alternate runtime source.

Possible future revisit trigger:

- If repeatable integration testing needs isolated fixtures, introduce them as
  explicit test-only infrastructure without adding an application runtime
  switch or authentication bypass.

## ADR-041: Use Enable Banking AIS For Trade Republic Cash Only

Status:

- Accepted and implemented.

Context:

- Enable Banking added Trade Republic as a beta personal AIS ASPSP for Spain
  and Germany in August 2026.
- The integration exposes current-account details, current and available cash
  balances, and booked cash movements.
- Brokerage positions, crypto holdings, and total portfolio valuation remain
  outside the AIS response.

Decision:

- Connect the Trade Republic current account through the existing server-only
  Enable Banking authorization, balance, transaction, and backfill flows.
- Normalize Trade Republic cash movements into the same owner-scoped
  `transactions` rows used for CaixaBank and ING.
- Display the selected latest current-account balance on the dashboard and
  label it `Efectivo`; never present it as combined Trade Republic wealth.
- Use the existing balance selection priority, which prefers `CLBD` over
  `CLAV` for balances fetched at the same time.
- Keep brokerage and crypto valuation as a separate future manual-asset or
  official-integration capability.
- Keep Trade Republic read-only. Do not add payment initiation, scraping, a
  direct integration client, or Trade Republic-specific persistence tables.

Consequences:

- Trade Republic cash movements participate in the existing transaction list,
  filters, categorization, labels, reconciliation, transfer detection, and
  reports.
- The dashboard card can show a smaller value than the total displayed by the
  Trade Republic app because securities and crypto are intentionally excluded.
- The existing ownership model and RLS boundaries require no schema migration.
- Beta provider behavior may require focused mapper adjustments after a real
  owner-authorized synchronization, but it must not create a parallel model.

Possible future revisit trigger:

- If Trade Republic or another safe official provider exposes portfolio
  positions and valuations through a supported read-only API.
