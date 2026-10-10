# Agent Documentation Practices And Audit

Research and local documentation audit completed on 2026-10-10. These practices
apply to repository documentation; they do not change runtime architecture,
provider access, RLS policy, or publication authorization.

## External Sources

The recommendations below are adaptations for this repository, not a universal
mandatory folder standard.

- [AGENTS.md format](https://agents.md/) describes a predictable Markdown
  entry point for agents, with project context, commands, conventions, testing,
  and security. It supports nested guides where subprojects need different rules
  and treats the file as maintained documentation.
- [GitHub: effective custom instructions](https://docs.github.com/en/copilot/concepts/prompting/response-customization#writing-effective-custom-instructions)
  recommends concise, self-contained instructions covering project context,
  conventions, tools, and relevant configuration. Path-specific instructions
  keep local concerns out of repository-wide context.
- [GitHub: coding agent best practices](https://docs.github.com/en/copilot/tutorials/cloud-agent/get-the-best-results#adding-custom-instructions-to-your-repository)
  recommends clear scope, acceptance criteria, file guidance, and executable
  build/test validation. Its PR workflow is tool-specific and does not replace
  this repository's direct-to-main Git workflow.
- [Anthropic: project memory guidance](https://code.claude.com/docs/en/memory#write-effective-instructions)
  recommends concise, specific, consistent guidance and moving local rules to
  scoped files. Its file-loading behavior and size advice are Claude-specific;
  they are not claimed as AGENTS.md format requirements.

## Chosen Structure

Keep a single root `AGENTS.md` for rules needed on most tasks. It links to the
[documentation index](README.md), concrete commands, security boundaries, and
Git workflow. Keep detailed feature contracts in `docs/`, and keep historical
rationale in `decisions.md`. Use Markdown links so readers can load relevant
context without requiring every document on every task.

Add a nested `AGENTS.md` only when a directory acquires materially different
working rules. Do not create guides for every folder, duplicate the same rules
in tool-specific files, or add generic agent profiles without a demonstrated
need. Personal conversation preferences can remain in user-level instructions.

Separate current behavior, future scope, and history. Describe implemented
behavior in the present tense, label deferred entities explicitly, and mark
superseded decisions. Commands and paths must resolve to real scripts/files;
production settings require independent evidence.

Keep financial/security invariants in the root guide even when detailed
explanations live elsewhere. Instruction files guide agents; ownership checks,
RLS, server-only modules, tests, and permissions enforce the actual boundaries.

## Audit Findings And Corrections

| Previous documentation                                                              | Repository evidence                                                                 | Correction                                                                      |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Documentation-first phase and hypothetical folder tree                              | Existing private routes, integration, migrations, reports, tests                    | Root guide describes the implemented app and actual boundaries                  |
| `lib/enable-banking/` path                                                          | Provider code is in `lib/enableBanking/`                                            | Current path corrected; old ADRs remain historical                              |
| No `docs/git-workflow.md` despite user workflow reference                           | Publication rules already exist in development workflow                             | Added a linked Git guide without changing direct-to-main publication            |
| Partial migration inventories                                                       | Cooldown, lease, freshness, and later schema files exist                            | Inventories synchronized with local migration chain                             |
| Monthly reporting and reconnection described as mostly future                       | XLSX route/CLI, consent recovery, account review, label chart                       | Updated product/roadmap state and remaining limits                              |
| Savings chart described as positive-only                                            | `monthlyEvolution.ts` sums signed savings                                           | Current architecture describes net savings, consistent with ADR-046             |
| Transaction identity examples and candidate merging described as implemented design | Exact key prefixes and same-key batch upsert in source                              | Documented actual identity/persistence behavior; promotion remains deferred     |
| Elevated access described only as provider writes                                   | Category and reporting-date mutations also use elevated client                      | Documented current explicit owner checks and narrow exception                   |
| All model fields appear equally tentative                                           | Migrations contain implemented tables but no rules/manual assets/raw payload column | Distinguished actual schema from proposals                                      |
| Provider registration URLs appear as app pages                                      | No privacy/terms routes exist                                                       | Marked missing routes and external settings as unverified                       |
| Large historical templates mixed with present instructions                          | Roadmap and ADRs retain earlier feature slices                                      | Added reading/status guidance rather than treating historical notes as new work |

The audit included documentation, dependency/scripts/CI configuration, routes,
authentication and data boundaries, SQL migrations, reporting calculations,
transaction identity/upsert behavior, and relevant tests. The final source audit
uses `2f3a7bd` as its code baseline. Pre-existing export fixes were published
separately in that commit while this audit was in progress; this task changes
only documentation.

## Verification

- Node.js 24.18.0; `npm run check` passed (typecheck, lint, formatting).
- `npm run test:coverage` passed: 103 test files, 447 tests. Coverage remains
  diagnostic; passing tests do not certify untested persistence or remote RLS.
- `AGENTS.md` was checked explicitly because `.prettierignore` excludes it.
- Local Markdown links/anchors, npm script references, and the complete ordered
  inventory of 14 SQL migrations were checked against repository files.
- No local app server, live bank request, migration deployment, or linked SQL
  verification was run. Browser and production behavior remain unverified.

## Maintenance Checklist

For a behavior or workflow change:

1. Inspect the affected implementation, scripts, SQL, and tests first.
2. Update its feature contract and roadmap status in the same change.
3. Update `current-state.md` when capability, location, or a known limit changes.
4. Change `AGENTS.md` only for rules agents need routinely; link longer details.
5. Record durable architectural tradeoffs in `decisions.md`, retaining explicit
   supersession rather than erasing history. Routine status corrections do not
   require a new ADR.
6. Validate changed Markdown formatting, relative links, code paths, command
   names, and migration inventory. Never run real sync or apply migrations just
   because a command appears in a document.
7. Report verification and external-state limits accurately. Revalidate dated
   provider research before implementation.

This documentation layout is a maintainability choice. It does not justify
unrequested code scaffolding, new integration clients, or new publication steps.
