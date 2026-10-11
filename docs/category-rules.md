# Category Rules

## Implemented Behavior

The private `Configuración` tab manages manual rules and MiniLM proposals.
Confirming a proposal enables future deterministic assignment during bank sync.
Detection does not create active rules automatically and does not recategorize
historical movements. All accounts are included unless a rule restricts one.
Periodicity discovers proposals; active rules do not impose a calendar.

Schema is defined in `20261011120000_add_category_rules.sql` and
`20261011190000_add_category_rule_names.sql`. Remote application
is verified separately through the migration workflow below; local files and
commits alone do not establish deployment status.

## Ownership And History

Authenticated rule reads and writes use RLS and composite category/account owner
foreign keys. Rules are soft deleted so earlier assignment attribution survives.
Existing non-null categories are marked manual without changing categories.
A manual category removal will be recorded as manual, protecting it from rules.
Provider payloads must omit all app-owned category provenance fields.

## Deterministic Matching

Only booked, newly observed movements with bank dates on or after activation
are eligible. The matcher compares normalized text, currency, direction and an
optional account. Different-category overlaps require review; equal-category
overlaps attribute the oldest active rule. No model runs during matching.
Manual assignments, including clearing a category, take priority permanently.

## Settings

The private Settings tab loads only rule data and catalogs. One card occupies
one of two columns from `lg`, matching the half-width Evolution charts. The
420 px table viewport has a sticky header and internal scrolling. Proposals and
rules share the compact table, which shows only a status icon, the editable
display name and removal. Clicking a row or activating its name with the
keyboard opens the detail/edit dialog; category, account and matching conditions
appear there. Status icons directly toggle active/paused rules, while proposal
icons open review before confirmation. Active/paused status and removal clicks do
not open the row editor. Confirmation and conflict review use dialogs within the
same feature. Status and removal icons are 24 px inside 44 px controls.

Names preserve user capitalization and are trimmed, required and limited to
300 characters. Existing rules and detected proposals default to their former
condition-text title. New manual rules initially use their condition text until
the name is customized. Renaming changes neither matching conditions nor the
activation boundary, while still advancing the optimistic edit version.

## Server Model Discovery

`npm run models:prepare` fetches checksum-verified artifacts from a fixed Hugging
Face revision into ignored `.server-models/`. The build runs preparation
automatically. Run it once before local development. Transformers.js 3.8.1 uses
q8 CPU inference; browsers receive neither artifacts nor inference dependencies.
Runtime downloads and filesystem caches are disabled. The dedicated Node route
has a 120-second limit; computation uses a 110-second budget. Reads use bank
dates, RLS and pagination over the last twelve months, capped at 5,000 rows and
2,000 unique texts. Coverage and truncation are shown explicitly.

Candidates require three distinct months, a stable editable text condition and
manually categorized evidence. Cosine similarity of 0.90 only discovers groups.
Conflicting categories require an explicit category choice. Confirming a proposal
activates deterministic matching. Proposal fingerprints suppress identical
rediscovery, including dismissed proposals. No inference service is contacted
with transaction data. Hosting quotas and deployed Linux behavior remain
independent operational checks.

## Synchronization

After owned provider persistence, a narrow service-role helper loads owned
active rules and pending uncategorized rows. The shared pure matcher selects
candidates; a service-role-only security-invoker RPC locks rules/categories and
transactions and rechecks current ownership, manual metadata, eligibility and
all matching rules before writing. The RPC also excludes reconciliation members
and internal transfer fingerprints/pairs. This preserves callback operation
without browser cookies. Ordinary reads and rule management remain authenticated
and RLS-aware. Automatic assignment failures are sanitized and deferred without
changing the bank synchronization result.

Candidate reads use batches of 500 with keyset pagination. Repeated syncs
retry eligible unassigned rows. Category origins appear in transaction review.
Paused, edited and deleted rules affect only future assignments; historical
categories and provenance are retained. No model participates in this path.

## Verification And Migration Workflow

Initial implementation checks passed: `npm run check`, 558 Vitest tests across 122 files,
and a production build. PostgreSQL 17 with synthetic auth roles applied the full
migration chain and passed the rollback fixtures in
`supabase/tests/category_rules.sql`. Fixtures cover owner isolation, composite
category ownership, origin constraints, service-only RPC permission, manual
priority, historical/pending/currency exclusion, neutral movements, conflicting
rules, idempotence and pause behavior. These are synthetic checks, not live bank
synchronization.

The compact named-rule update passed `npm run check` and 565 Vitest tests across
124 files. Isolated PostgreSQL 17 verification applied the complete migration
chain and proved that name backfill preserves all existing rule metadata. Both
rollback suites passed, including name constraints, direct status toggles and
activation preservation during renaming.

The name migration is applied on the implementation linked Supabase project.
The remote migration inventory and the rolled-back name fixtures both confirmed
successful application.

A local q8 smoke check produced normalized 384-dimensional embeddings from
synthetic descriptions. The macOS build traced all four model artifacts
(129.12 MiB) exclusively into discovery, with no model in browser bundles or
other route traces. Its trace total was 175.34 MiB, excluding platform packages
installed only on Linux. The earlier Linux dependency fixture measured 192.8
MiB; an actual Vercel invocation and quota availability remain unverified.
No development or production app server was started for verification.

Apply only this feature migration to the existing linked project:

```bash
npm run db:migrations
npx supabase db push --dry-run
npm run db:push
npm run db:migrations
npx supabase db query --linked --file supabase/tests/category_rules.sql
```

The initial category-rules migration is already applied on the implementation
project. When applying the compact list change elsewhere, the dry run must contain only
`20261011190000_add_category_rule_names.sql`. Do not apply other pending migrations
as part of this feature. After application, also run
`npx supabase db query --linked --file supabase/tests/category_rule_names.sql`
to verify names, optimistic versions and activation behavior. The SQL verification wraps synthetic
fixtures in a transaction and rolls them back. It does not recategorize existing
transactions. Record the actual application result in the handoff.

## Local Acceptance Checks

After applying the migration, use the existing local-run workflow. Model assets
are already prepared on the implementation workstation; a fresh checkout needs
`npm run models:prepare` before detection. Open `/?tab=settings` and verify:

- One half-width card from `lg`, full width on mobile, fixed 420 px table
  viewport, sticky header, and internal scrolling.
- Only status, name and removal appear in each row. Row clicks open details;
  name activation also works with the keyboard. Pause/reactivation and removal
  stay independent of the row click.
- Existing rule names match their previous titles. Rename a rule in its dialog
  and confirm that category, account and conditions remain unchanged.
- Create, edit, pause, reactivate and delete a manual rule; earlier categories
  remain unchanged.
- Detect patterns, inspect coverage/examples/conflicting categories, and confirm
  a proposal once. Dismissal prevents identical proposals from returning.
- Future eligible movements are categorized by an active rule after normal
  authorized synchronization. Manual categorization or manual removal takes
  precedence. No historical backfill is categorized.
- Review conflicting movements in the Settings dialog and assign their category
  manually. Model failure leaves rule management available.

Local commits remain unpublished until the owner finishes local acceptance and
explicitly requests push. Browser behavior and Linux deployment require their
own checks; a build does not certify them.
