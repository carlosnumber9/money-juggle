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
