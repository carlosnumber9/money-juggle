# Repository Agent Guide

This repository is the foundation for a personal finance application named `money-juggle`.

The current phase is documentation-first. Do not generate the full application, broad scaffolding, large feature sets, database migrations, API routes, React components, or integration clients unless the user explicitly asks for that next step.

## Repository Instructions Take Precedence

- Before acting, read this guide and the repository documentation relevant to
  the requested workflow.
- Repository-specific instructions and the user's explicit request take
  precedence over generic agent conventions, skills, templates, GitHub
  workflows, or personal defaults whenever they are compatible with
  higher-priority platform instructions.
- Never replace a documented repository workflow with a generic one. Do not
  invent branches, pull requests, tools, or publication steps that the user did
  not request.
- If a generic skill or tool recommends a different workflow, follow the
  repository workflow instead. If the conflict cannot be resolved safely, stop
  and ask the user before changing repository state.
- Before any commit or push, re-read the publication rules in
  `docs/development-workflow.md` and follow them exactly.

## Product Goal

`money-juggle` will help the owner review their financial situation from mobile and desktop without manually exporting bank statements.

The app should connect to banks through Open Banking / PSD2, read account data, balances, and transactions, and build personal financial reports over time.

Initial target institutions and platforms:

- CaixaBank
- ING
- Trade Republic

CaixaBank, ING, and the Trade Republic current account should use Enable Banking
Account Information through Open Banking / PSD2. Trade Republic brokerage
positions, crypto assets, and portfolio valuation remain a special case because
they are not available through the current PSD2 path and may require manual
input, a separate integration, or a future solution.

## Language Rules

- Conversation with the user may be in Spanish.
- Repository documentation must be written in English.
- Future code, comments, technical names, folders, files, functions, variables, types, and database entities must be written in English.
- User-visible text inside the app must be written in Spanish.

## Chosen Stack

- Next.js with App Router
- TypeScript
- React
- Vercel
- Supabase Auth
- Email and password login
- Supabase Postgres
- Supabase Row Level Security
- Enable Banking Account Information API
- Next.js Route Handlers for server-side logic
- Private environment variables in Vercel
- Possible Vercel Cron for periodic synchronization

Conceptual architecture:

```text
Browser / mobile
  -> Next.js on Vercel
  -> Supabase Auth
  -> Supabase Postgres
  -> Enable Banking Account Information API
```

## Non-Negotiable Security Rules

- The app is read-only with respect to banks.
- Never initiate payments.
- Never create transfers.
- Never collect money.
- Never create mandates.
- Never use payment initiation flows.
- Never scrape online banking.
- Never store bank login credentials.
- Never expose Enable Banking signing keys or provider tokens to the browser.
- All Enable Banking calls must happen on the server.
- The frontend must never receive `ENABLE_BANKING_PRIVATE_KEY`, provider tokens, service role keys, or other sensitive credentials.
- Supabase RLS must be enabled for tables containing financial data.
- Even though this is a personal app, model ownership as if multiple users may exist later.
- Password login must be restricted to the owner email or an explicit allowlist.
- Avoid overusing the Supabase service role. Use it only in server-only contexts where RLS bypass is intentionally required.

## What Not To Build Without Confirmation

Do not create these without explicit user approval:

- Full application pages
- React component libraries
- API routes
- Supabase migrations
- Environment files
- Project configuration files
- Database clients
- Enable Banking clients
- Payment flows
- Scraping tools
- Large architectural rewrites
- Broad abstractions that are not needed for the current feature

When a requested change would affect architecture, persistence, authentication, or external integrations, explain the change before implementing it.

## Incremental Feature Workflow

For each future feature:

1. Explain the feature and the concept being introduced.
2. Propose the smallest useful scope.
3. List the files that will likely change.
4. Mention security, data ownership, and RLS implications.
5. Ask for confirmation before broad architectural changes.
6. Implement the smallest reviewable slice.
7. Verify the behavior with tests, type checks, or manual steps as appropriate.
8. Summarize what changed and what the user learned.
9. Update documentation or `docs/decisions.md` when a durable decision is made.

## Suggested Future Repository Structure

Do not create these folders until they are needed. This is only a convention guide.

```text
app/
  (public)/
  (private)/
  api/
components/
lib/
  auth/
  db/
  domain/
  enable-banking/
  supabase/
docs/
supabase/
  migrations/
tests/
```

Suggested responsibilities:

- `app/`: routes, layouts, and route handlers.
- `components/`: reusable UI components.
- `lib/auth/`: authentication helpers and allowlist checks.
- `lib/db/`: database access helpers.
- `lib/domain/`: business rules independent from framework details.
- `lib/enable-banking/`: server-only Enable Banking integration code.
- `lib/supabase/`: Supabase browser/server client setup.
- `supabase/migrations/`: database migrations when schema work begins.
- `tests/`: focused tests for domain rules and integration boundaries.

## Supabase Rules

- Treat RLS as mandatory, not optional.
- Every financial table should include a clear `user_id` ownership column unless there is a strong documented reason not to.
- Policies should make the ownership model explicit.
- The anon key may be exposed to the browser, but it must rely on RLS.
- The service role key must remain server-only and should be used sparingly.
- Prefer SSR-compatible Supabase patterns when implementing Next.js authentication.
- Restrict login to the owner email or an explicit allowlist.
- Keep schema changes small and documented.

## Enable Banking Rules

- Use Enable Banking Account Information for PSD2 account information.
- Use only Account Information. Do not implement Enable Banking payment initiation or any other money-moving capability.
- Keep all Enable Banking credentials, signing keys, and provider tokens server-only.
- Store consent state clearly: institution/ASPSP, authorization flow, linked accounts, expiration, status, and relevant events.
- Handle consent expiration and reconnection explicitly.
- Sync failures should be recorded and visible enough to debug.
- Separate UI from integration logic. UI starts flows; server-side code talks to Enable Banking.

## Feature Acceptance Criteria

A feature is acceptable when:

- It solves one small, clearly stated user problem.
- The implementation is understandable and reviewable.
- Server-only data stays server-only.
- RLS and ownership implications are handled or documented.
- The user-visible app text is Spanish.
- Internal names and code are English.
- Verification steps were run or clearly explained if not run.
- Relevant documentation was updated when behavior or architecture changed.
- The implementation avoids unrelated refactors.

## Development Style

Build in small, didactic steps. Prefer clear, explicit code over premature abstractions. Add tests when they clarify behavior, protect financial logic, or reduce regression risk. Keep explanations practical and focused on what the user is learning.

Never generate large parts of the app without the user's confirmation. Explain important changes before implementing them.

## Local App Startup Rule

Do not start the local Next.js app for testing or verification unless the user's prompt explicitly asks for a local app run or browser-based local testing.

Prefer non-server verification such as type checks, linting, formatting checks, unit tests, or focused code inspection. If a change would normally benefit from running the app locally, explain that this was intentionally skipped because local app startup was not requested.
