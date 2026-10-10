# Repository Agent Guide

`money-juggle` is an implemented private personal finance app, developed in
small, reviewable slices. It uses Next.js App Router, TypeScript, React,
Supabase Auth/Postgres with RLS, and server-only Enable Banking Account
Information. Vercel is the deployment target. Do not treat this repository as a
documentation-only scaffold or generate the whole app again.

## Start Here

1. Read this guide, [development workflow](docs/development-workflow.md), and
   the documents relevant to the task using the [documentation index](docs/README.md).
2. Check `git status` and inspect the existing implementation before editing.
   Preserve unrelated work; do not include it in commits without authorization.
3. Use [current state](docs/current-state.md) for implemented capabilities and
   code locations, [roadmap](docs/feature-roadmap.md) for remaining work, and
   [decisions](docs/decisions.md) for rationale and superseded history.
4. Treat source files, `package.json`, and SQL migrations as executable evidence.
   If they disagree with docs, report the discrepancy and update the relevant
   docs within the requested scope. Do not silently change product behavior to
   match an obsolete proposal.

These instructions apply throughout the repository. Read any more specific
`AGENTS.md` before editing files in its directory. Follow applicable platform
instructions and explicit user requests; repository workflows take precedence
over generic skills and publication defaults when compatible with them.

## Scope And Language

- Build one small feature at a time. Explain the feature, likely files, and
  security/ownership implications before important implementation changes.
- Broad architectural changes require explicit user confirmation. Do not create
  unrequested pages, API routes, migrations, environment/configuration files,
  integration clients, component libraries, or broad abstractions.
- Existing features may be maintained within the user's requested scope.
  A roadmap item or historical proposal is not permission to implement it.
- Conversation may be in Spanish. Persisted documentation, code, comments,
  technical names, and commit messages must be in English. App-visible text
  must be in Spanish.

## Security Invariants

- Bank access is read-only Account Information. Never initiate payments,
  transfers, collections, mandates, trading, or online banking scraping.
  Never store bank login credentials.
- All Enable Banking calls, RSA signing keys, JWTs, provider session identifiers,
  and Supabase elevated keys stay server-only. Never expose secrets through
  `NEXT_PUBLIC_`, browser props, logs, or raw error payloads.
- Require a validated Supabase user and the owner email allowlist at private
  boundaries. `ALLOWED_EMAILS` is preferred; `OWNER_EMAIL` is supported for
  compatibility. Never add local authentication bypasses.
- Financial tables require explicit ownership and RLS. Use `user_id` for owned
  rows; `profiles.id` is the owner's auth ID. Composite ownership foreign keys
  protect relationships. Authenticated users may read global institutions.
- Ordinary financial reads and exports use authenticated RLS-aware clients.
  Elevated provider writes and existing category/reporting-date mutations must
  validate ownership explicitly. Never make the service role the default client.
- The bank callback validates its state against an authenticated-start pending
  connection and uses its stored owner; it can complete without browser auth
  cookies. Do not weaken this boundary or require cookies that break bank returns.
- Preserve app-owned categories, labels, reporting dates, and reconciliation
  metadata during provider sync. Keep original bank dates separate from
  reporting dates. Do not merge currencies or infer complete historical coverage.
- Keep full IBANs out of persistence. Use masked suffixes and server-generated
  HMAC fingerprints. Do not commit secrets or generated financial workbooks.
- Trade Republic AIS covers current-account cash and movements. Brokerage,
  crypto, portfolio valuation, and Cobee integration remain deferred.

## Code Boundaries

| Location                     | Responsibility                                                 |
| ---------------------------- | -------------------------------------------------------------- |
| `app/`                       | Thin routes, layouts, server actions, and feature UI           |
| `components/ui/`             | Existing shadcn/Base UI primitives                             |
| `definitions/`               | Shared contracts re-exported from `@/definitions`              |
| `lib/views/`                 | Prepare route and panel view props                             |
| `lib/data/`                  | Single authenticated application-facing banking data source    |
| `lib/db/`                    | Persistence, normalization, and provider sync orchestration    |
| `lib/domain/`                | Framework-independent financial rules                          |
| `lib/enableBanking/`         | Server-only provider client, signing, display metadata         |
| `lib/supabase/`              | Authenticated clients, session refresh, narrow elevated client |
| `lib/reports/monthlyExport/` | Aggregate workbook calculation and serialization               |
| `scripts/`                   | Monthly report CLI using authenticated saved-data reads        |
| `supabase/migrations/`       | Executable schema, ownership constraints, and RLS              |
| `supabase/tests/`            | Explicit SQL verification with rollback fixtures               |

Use the actual camelCase `lib/enableBanking/` path. Prefer existing shadcn/ui
components and theme tokens. Keep provider/database details out of UI. Extract
nontrivial formatting, filtering, grouping, and chart preparation into colocated
`.ts` files; reusable financial rules belong in `lib/domain/`. Avoid unrelated
refactors and helpers for trivial expressions.

## Commands And Verification

Use Node.js 24.x and npm; the declared package manager is npm 10.8.2. Install
locked dependencies with `npm ci` when needed. See `package.json` for scripts.

```bash
npm run check
npm run test
npm run test:coverage
```

`check` runs typecheck, lint, and format checks; it does not run tests or a build.
Use targeted Vitest tests during iteration, then relevant static checks and tests
before publication. For documentation-only changes, check formatting, local
links/paths, commands, and consistency with source; do not add tests that merely
repeat prose. Format only intended files, not the whole worktree.

Tests are colocated `*.test.ts`, use Node by default, and mock provider/database
boundaries. Pass explicit dates and never use production credentials or live
bank calls. Coverage is diagnostic, without a global percentage threshold.

Do not start `npm run dev`, `npm run start`, or another local app server for
verification unless the user explicitly requests a local run or browser testing.
Report skipped browser checks when relevant. `npm run build` is an optional
non-server build check. Do not apply migrations or run real bank synchronization
as incidental verification; use the documented operational workflow when requested.

## Git And Completion

- Before every commit or push, re-read the publication rules in
  [development workflow](docs/development-workflow.md#publishing-changes) and
  [Git workflow](docs/git-workflow.md).
- Ordinary commit/push uses only local `git`, the configured SSH remote, and
  direct publication to `main`. Stage intended files explicitly, synchronize
  safely, and run `git push origin main`. Never force-push.
- Do not use `gh`, GitHub plugins/connectors, or pull request workflows unless
  the user explicitly requests a GitHub or pull request workflow. Commit and
  push does not authorize a branch, fork, PR, or merge commit.
- Use `<type>: <Capitalized simple-past message>`, for example
  `docs: Updated agent guidance and implementation status`.
- Complete with a concise summary of changes, verification, and material limits.
  Update feature docs and roadmap when behavior changes. Record durable
  architectural decisions in `docs/decisions.md`, preserving superseded history.
