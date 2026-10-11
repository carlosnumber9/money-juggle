# Documentation Index

Read [AGENTS.md](../AGENTS.md) and [development workflow](development-workflow.md)
first. Load the remaining documents according to the task; reading the entire
history is not a prerequisite for a focused change.

## Reading By Task

| Task                                | Read next                                                                                        | Executable evidence                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Setup and commands                  | [Repository README](../README.md), [Supabase](supabase.md)                                       | `package.json`, `.env.example`, `proxy.ts`                              |
| Understand implemented capabilities | [Current state](current-state.md), [Product](product.md)                                         | Routes, view builders, feature tests                                    |
| UI and data boundaries              | [Architecture](architecture.md)                                                                  | `app/`, `lib/views/`, `lib/data/`, `definitions/`                       |
| Login, secrets, ownership           | [Security](security.md), [Supabase](supabase.md)                                                 | `lib/auth/`, `lib/supabase/`, SQL policies                              |
| Bank connection, sync, reconnection | [Enable Banking](enable-banking.md), [Security](security.md)                                     | `lib/enableBanking/`, `lib/db/enableBanking*`, `app/api/`               |
| Schema or financial rules           | [Data model](data-model.md), [Security](security.md)                                             | `supabase/migrations/`, `lib/domain/`, `supabase/tests/`                |
| Excel export or report CLI          | [Monthly Excel export](monthly-excel-export.md)                                                  | `lib/reports/monthlyExport/`, `lib/db/monthlyReportData.ts`, `scripts/` |
| Portfolio PDF imports and history   | [Portfolio imports](portfolio-imports.md), [Data model](data-model.md), [Security](security.md)  | `lib/imports/tradeRepublic/`, `lib/db/portfolio/`, investment UI        |
| Plan a next feature                 | [Roadmap](feature-roadmap.md), relevant feature docs                                             | Confirm missing behavior in source before implementation                |
| Understand a past tradeoff          | Relevant entry in [decisions](decisions.md)                                                      | Follow superseding ADR references                                       |
| Research Cobee                      | [Cobee research](cobee.md)                                                                       | No implemented Cobee client or tables                                   |
| Commit and push                     | [Git workflow](git-workflow.md), [publication rules](development-workflow.md#publishing-changes) | Local `git` status, diff, branch, remote                                |
| Maintain agent documentation        | [Agent documentation](agent-documentation.md)                                                    | Source, scripts, migrations, and CI                                     |

## Category Rule Feature

See [Category rules](category-rules.md) for Settings, model packaging, matching,
ownership, migration operations and local acceptance checks.

## Document Roles

- `AGENTS.md`: short operational instructions, security invariants, commands,
  boundaries, and links. It applies to the entire repository.
- `README.md`: human-facing introduction and setup.
- `current-state.md`: source-backed capability and location map, including gaps.
- Feature documents: current behavior, contracts, and operational details.
- `feature-roadmap.md`: incremental tracker and remaining scope. Its original
  phase templates are retained as historical context, not fresh instructions.
- `decisions.md`: durable decisions and design history. Superseded decisions
  explain earlier choices; they do not override current implementation.
- `cobee.md`: dated external research, requiring revalidation before integration.
- `agent-documentation.md`: external sources, chosen documentation practices,
  audit findings, and maintenance checklist.

Commands, dependency requirements, code paths, and SQL schema must be checked
against the repository. A local migration file does not prove remote deployment;
source inspection does not prove provider availability, dashboard configuration,
backups, Vercel Deployment Checks, or browser behavior.
