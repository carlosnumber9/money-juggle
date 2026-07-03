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

- Configure magic link login.
- Add an email allowlist.
- Create one table and one set of RLS policies.
- Fetch one GoCardless token server-side.
- List institutions.
- Start one requisition flow.

Avoid combining several architectural steps into one large change.

## Explain Before Implementing

Important changes should be explained before implementation, especially when they affect:

- Authentication.
- Authorization.
- Database schema.
- RLS.
- GoCardless integration.
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
- Integration checks for server routes.
- Manual browser testing for flows.
- SQL policy checks for RLS.
- Dry-run or sandbox checks for GoCardless where available.

If verification cannot be run, explain why.

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

Good candidates:

- Permission checks.
- Domain calculations.
- Transaction normalization.
- Deduplication.
- Date and currency handling.
- Sync state transitions.

Do not add heavy test infrastructure before it is useful.

## Clarity Over Premature Abstraction

Prefer simple, explicit code. Introduce abstractions only when they remove real duplication or clarify a stable boundary.

Avoid designing for imagined future complexity before the first useful version exists.

## Learning Notes

When a new concept appears, include a short explanation in the relevant PR summary, commit message, or documentation update.

Examples:

- What RLS protects.
- Why GoCardless calls are server-only.
- What a requisition is.
- Why Trade Republic is modeled separately.

## Future Prompts

Keep future prompts focused and incremental.

Good prompt shape:

```text
Implement magic link login with an owner email allowlist.
Before coding, explain the flow and list the files you expect to change.
```

Avoid prompts that ask for the whole app at once.

