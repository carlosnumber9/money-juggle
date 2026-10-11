# Category Rules

## Implemented Behavior

The private `Configuración` tab manages manual rules and MiniLM proposals.
Confirming a proposal enables future deterministic assignment during bank sync.
Detection does not create active rules automatically and does not recategorize
historical movements. All accounts are included unless a rule restricts one.
Periodicity discovers proposals; active rules do not impose a calendar.

Schema is defined in `20261011120000_add_category_rules.sql`. Remote application
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
420 px table viewport has a sticky header, vertical scrolling and horizontal
scrolling on narrow devices. Proposals and rules share the table. Editing,
confirmation and conflict review use dialogs within the same feature.

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

Implementation checks passed: `npm run check`, 558 Vitest tests across 122 files,
and a production build. PostgreSQL 17 with synthetic auth roles applied the full
migration chain and passed the rollback fixtures in
`supabase/tests/category_rules.sql`. Fixtures cover owner isolation, composite
category ownership, origin constraints, service-only RPC permission, manual
priority, historical/pending/currency exclusion, neutral movements, conflicting
rules, idempotence and pause behavior. These are synthetic checks, not live bank
synchronization.

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

The dry run must contain only the category-rules migration. Do not apply other
pending migrations as part of this feature. The SQL verification wraps synthetic
fixtures in a transaction and rolls them back. It does not recategorize existing
transactions. Record the actual application result in the handoff.

## Local Acceptance Checks

After applying the migration, use the existing local-run workflow. Model assets
are already prepared on the implementation workstation; a fresh checkout needs
`npm run models:prepare` before detection. Open `/?tab=settings` and verify:

- One half-width card from `lg`, full width on mobile, fixed 420 px table
  viewport, sticky header, and internal scrolling.
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
