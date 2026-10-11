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
