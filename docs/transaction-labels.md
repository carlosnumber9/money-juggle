# Transaction Labels

## Settings Management

The private `Configuración` tab lists active owned labels in the `Etiquetas`
card beside category rules. Each card occupies half the grid from `lg` and the
full width on smaller screens. The label table has a 420 px scrolling viewport,
a sticky header, names and removal controls.

`Crear etiqueta` opens a dialog with only a name. Clicking a label name opens an
inline input with its text selected. Blur or Enter saves and returns to text;
Escape cancels. Empty or whitespace-only edits restore the previous name without
a write. Failed saves also restore the original name and display a safe error.
Names retain capitalization, collapse whitespace and contain 1–80 characters.
The existing owner-scoped case-insensitive uniqueness constraint rejects
duplicates; labels are never merged automatically.

Deletion requires a confirmation dialog. It permanently removes the label and
its transaction and reconciliation assignments through existing foreign-key
cascades. Transactions, amounts, reconciliations and their memberships remain
unchanged. Renaming preserves the label ID and all assignments. Annual label
reports reflect the current names and assignments, so deletion removes the
label's grouping from historical reports as well. Archiving and transaction-list
label filters remain deferred.

## Data And Ownership

Settings loads labels through the authenticated `bankingDataSource` read contract,
independently of rule loading. A failed load disables only its own card. Existing
creation and assignment in transaction details remains available.

Server actions validate untrusted input and derive the owner from a verified
session and email allowlist. Management uses the authenticated Supabase client
with explicit owner filters and RLS, never elevated credentials. Create and
rename return `Result<TransactionLabelSummary>`; delete returns `Result<null>`.
Successful management writes invalidate all cached transaction months for the
current owner and refresh the private page and report data.

The additive migration
`20261011200000_allow_transaction_label_deletion.sql` adds an authenticated DELETE
policy with `user_id = auth.uid()`. It does not delete existing data or change
the schema or assignment foreign keys.

## Verification And Migration

Implementation checks passed with `npm run check` and 598 Vitest tests across
127 files. Vitest covers action authentication, input validation, persistence ownership,
duplicate handling, empty edits and independent Settings loads. PostgreSQL 17
verification applied the full migration chain to an isolated database and passed
`supabase/tests/transaction_label_management.sql`. The fixture checks label CRUD,
owner isolation, both assignment cascades and preservation of financial rows;
it rolls back all synthetic data.

Apply only this feature migration to the linked project after code checks:

```bash
npm run db:migrations
npx supabase db push --dry-run
npm run db:push
npm run db:migrations
npx supabase db query --linked --file supabase/tests/transaction_label_management.sql
```

The dry run must contain only this migration. Do not apply unrelated pending
migrations. Remote deployment status requires confirmation from the migration
inventory and rollback fixture execution, rather than local source alone.

## Local Acceptance

Open `/?tab=settings` using the existing local app workflow and verify:

- Two half-width cards on large screens; full-width cards on smaller screens.
- Create a label without assigning it, then find it in a transaction selector.
- Rename by clicking the name and leaving the input; verify the new name in
  transactions and annual label reporting.
- Clear the input or press Escape; confirm that the original name remains.
- Try a duplicate name; confirm an error and restoration of the original name.
- Cancel deletion, then delete an assigned label. Verify removal of its chips
  and report grouping while financial records and reconciliation remain intact.
- Use keyboard controls, a long name and a list that exceeds the table viewport.

Local commits remain unpublished until owner acceptance and an explicit push
request. Automated verification does not certify browser layout or interactions.
