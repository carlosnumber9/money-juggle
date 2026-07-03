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

