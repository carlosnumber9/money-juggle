# Category Rules

## Implementation Progress

Owned rule storage and assignment provenance are defined by
`20261011120000_add_category_rules.sql`. The migration is not yet applied.
Rule management, discovery and automatic assignment follow in later commits.

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
