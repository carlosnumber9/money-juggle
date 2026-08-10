# Development Workflow

This repository should grow one small feature at a time.

The goal is not only to build a useful app, but also to keep each step understandable.

## Working Style

For each feature:

1. Explain the feature and why it exists.
2. Explain the concept being introduced.
3. Propose the files that would change.
4. Identify security, RLS, and ownership implications.
5. Implement the smallest useful version.
6. Verify the change.
7. Summarize what changed.
8. Update documentation or decisions when needed.

## Small Features First

Prefer small slices such as:

- Configure email and password login.
- Add an email allowlist.
- Create one table and one set of RLS policies.
- Make one signed Enable Banking API request server-side.
- List ASPSPs for Spain.
- Start one account information authorization flow.
- Add one private UI view over already-prepared data.
- Add one focused transaction review interaction, such as filtering the current
  month by institution or direction.

Avoid combining several architectural steps into one large change.

## Local Development Data

Local development uses the same Supabase Auth, Supabase Postgres, and Enable
Banking paths as the deployed application. Configure real development
credentials in ignored local environment files. Do not add authentication
bypasses or parallel local data runtimes.

UI components and route TSX files should receive prepared view props from
`lib/views/`. Data access should remain behind the single application-facing
contract in `lib/data/`, so provider and persistence details stay out of UI
code.

## Explain Before Implementing

Important changes should be explained before implementation, especially when they affect:

- Authentication.
- Authorization.
- Database schema.
- RLS.
- Enable Banking integration.
- Environment variables.
- Deployment.
- Scheduled sync.

Broad architectural changes require explicit user confirmation.

## Proposed Files

Before implementation, list likely files to create or edit. This helps keep the scope reviewable.

The list does not need to be perfect, but it should make the intended change visible.

## Verification

Use verification appropriate to the feature:

- Type checks for TypeScript changes.
- Unit tests for domain logic.
- Focused UI or pure function tests for client-side filters and formatting when
  the behavior becomes complex enough to regress.
- Integration checks for server routes.
- Manual browser testing for flows only when the user's prompt explicitly asks
  for a local app run or browser-based local testing.
- SQL policy checks for RLS.
- Dry-run, sandbox, or restricted own-account checks for Enable Banking where available.

Do not start the local Next.js app for tests or verification unless the user's
prompt specifically requests it. If a change would normally benefit from local
browser verification, document that the local app was intentionally not started
and use the smallest suitable non-server checks instead.

If verification cannot be run, explain why.

## Commit Messages

Use a lowercase Git Flow-style type prefix followed by a concise message that
starts with a capitalized verb in the simple past:

```text
<type>: <Capitalized simple-past message>
```

Choose the type that best describes the change, such as `feat`, `fix`, `docs`,
`refactor`, or `test`.

Examples:

- `feat: Added new transaction modal`
- `fix: Prevented duplicate imports`
- `docs: Documented commit message convention`

## Publishing Changes

The repository's normal publication flow is direct to `main`.

- When the user asks to commit, push, publish, or upload changes to `origin`,
  interpret that request as: stage only the intended files, create the commit
  on `main`, and run `git push origin main`.
- Before changing Git state, confirm that the worktree contains only the
  intended scope, switch to `main` if needed, and safely synchronize with
  `origin/main`.
- Use `git` directly for this workflow. Do not inspect or use the GitHub CLI
  (`gh`), a GitHub publishing skill, or another generic publication workflow.
- Do not create a branch, fork, pull request, or merge commit unless the user
  explicitly requests that exact action in the current task.
- Never force-push `main`. If `origin/main` has diverged or cannot be updated
  safely, stop and explain the conflict instead of choosing a different
  workflow independently.
- These repository rules override generic branch, pull-request, and GitHub CLI
  conventions. Re-read this section before every commit or push.
- Use standard local `git` commands with the configured SSH remote for fetch,
  pull, and push operations. SSH access is the source of truth for Git
  transport; do not require the GitHub CLI for authentication or publication.

## Documentation And Decisions

Update documentation when:

- A durable architecture choice is made.
- A security rule changes.
- A new integration boundary is introduced.
- A data model concept becomes real.
- The roadmap changes meaningfully.

Use `docs/decisions.md` for decisions that future sessions should remember.

## Tests

Add tests when they reduce risk or clarify behavior.

Vitest is the unit and integration test runner. Tests use the Node environment
by default and should be colocated with the implementation as `*.test.ts`.
Keep tests deterministic by passing explicit dates and by mocking network,
Supabase, and provider boundaries. Tests must never contact the real Enable
Banking API or use production credentials.

Available commands:

```text
npm run test
npm run test:watch
npm run test:coverage
```

Coverage uses V8 and is a diagnostic tool. Do not optimize for a global
percentage. Prioritize meaningful positive, negative, boundary, and failure
scenarios for financial and authorization rules. Do not add broad snapshots or
tests that only restate third-party library behavior.

Good candidates:

- Permission checks.
- Domain calculations.
- Transaction normalization.
- Deduplication.
- Date and currency handling.
- Sync state transitions.

Do not add heavy test infrastructure before it is useful.

GitHub Actions runs static checks and coverage for pull requests and pushes to
`main`. Vercel remains responsible for preview and production builds. Production
promotion should require the GitHub `Quality` check through Vercel Deployment
Checks once the project setting is enabled.

## Clarity Over Premature Abstraction

Prefer simple, explicit code. Introduce abstractions only when they remove real duplication or clarify a stable boundary.

Avoid designing for imagined future complexity before the first useful version exists.

## UI Changes

Use the configured shadcn/ui preset as the default UI path.

- Prefer existing components in `components/ui/` before creating custom UI.
- Add needed shadcn/ui components from the selected preset instead of hand-rolling common primitives.
- Keep `app/globals.css` for imports, theme tokens, and base rules.
- Use Tailwind utilities for page composition instead of building many named global CSS classes.
- Document any custom UI exception when shadcn/ui cannot reasonably cover the interaction.

Keep route and component TSX files focused on composition, interaction, and
rendering:

- Extract named formatting, grouping, sorting, filtering, and chart-data
  preparation into colocated `.ts` modules when the logic can be tested or
  understood independently from JSX.
- Keep feature-specific helpers beside the feature. Move them to `lib/domain/`
  only when they express reusable business rules rather than presentation
  details.
- Small JSX branches and trivial one-use expressions may stay in the component;
  do not create a helper file for every expression.
- Prefer descriptive module names such as `formatters.ts`,
  `transactionDateGroups.ts`, or `annualLabelExpensesChart.ts` over a generic
  `utils.ts`.

## Learning Notes

When a new concept appears, include a short explanation in the relevant PR summary, commit message, or documentation update.

Examples:

- What RLS protects.
- Why Enable Banking calls are server-only.
- What an ASPSP and account information authorization flow are.
- Why Trade Republic is modeled separately.

## Future Prompts

Keep future prompts focused and incremental.

Good prompt shape:

```text
Implement email and password login with an owner email allowlist.
Before coding, explain the flow and list the files you expect to change.
```

Avoid prompts that ask for the whole app at once.
