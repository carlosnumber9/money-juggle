# Trade Republic Portfolio Imports

## Supported Capability

The owner can import the Spanish Trade Republic **Extracto del patrimonio neto**
PDF in EUR, review and correct its financial data, and confirm one portfolio
snapshot per report date. This supplements Enable Banking AIS, which still
supplies only current-account cash and movements. It does not add a brokerage
API, trading, scraping, OCR, or a Hugging Face dependency.

The Dashboard shows `Efectivo` on the left from Enable Banking and `Inversiones`
on the right from the latest confirmed portfolio report date. Each value has
its own reference date. Imported investment data remains visible without an
active bank connection. Missing imports and failed reads are explicit states,
not zero balances. Trade Republic's Beta badge and the redundant account rows
on all three bank cards are removed; provider metadata remains intact.

The `Inversiones` home tab lists the latest positions by descending valuation,
with product name, ISIN, units and EUR value. The positions panel occupies half
of the layout on large screens and the full width on small screens. Its chart
shows all confirmed report dates with separate PDF cash and investment series.
Straight segments connect observed points; no daily observations are inferred.
A single report is displayed as points. The existing Evolution savings chart
continues to represent categorized movements rather than this cash balance.

## Upload And Review

1. Open `/investments/import` from the Inversiones tab and choose one PDF.
2. `POST /api/investments/imports/preview` sends the raw PDF body, limited to
   4 MiB. The endpoint validates session, allowlist, same-origin requests and
   PDF content type before extraction. Streamed requests are bounded even
   without a content-length header.
3. Server-only PDF.js reads selectable text and coordinates, reconstructing
   columns, multiline names, merged quantity/name text and repeated page
   headers. Limits are 20 pages, 500 positions, 100,000 text items and a
   15-second processing deadline. Unsupported, scanned, protected and corrupt
   files have Spanish error messages. No document text is logged.
4. A temporary owner-scoped draft holds only financial extraction data, its
   SHA-256 fingerprint and parser version. The file bytes are discarded. The
   review page loads the draft through the existing application data source.
5. The owner can edit report date, cash, product name, ISIN, units, unit price,
   quote date and valuation, or add/remove rows. The page shows recalculated
   totals, source totals, source discrepancies and a correction notice.
6. Confirmation validates again on the server and redirects to
   `/?tab=investments`. Changing the report date requires another review. A
   same-date replacement requires an explicit checkbox; concurrent changes
   refresh the revision and require confirmation again.

Drafts expire after 24 hours and expired drafts are deleted when that owner
starts a new import. This is opportunistic cleanup, not a scheduled deletion
job. A consumed draft supports idempotent confirmation retries while valid.
Correcting a confirmed photo uses another import for the same report date.
Discarding the source PDF means a later parser upgrade requires re-uploading it
to extract the document again.

## Financial Rules And Ownership

- Dates use the report date for history and retain each position's separate
  quote date. Upload order never determines the latest portfolio.
- Declared position valuations are authoritative. Rounded quote prices are
  not multiplied to replace the reported value. Investment totals use exact
  six-decimal arithmetic; PostgreSQL stores `numeric(20,6)`.
- Positions have unique ISINs within a snapshot. Values, quantities and prices
  are nonnegative; cash may be signed. Quote dates cannot follow the report
  date. Invalid values or totals beyond numeric capacity cannot be confirmed.
- `portfolio_snapshots`, `portfolio_positions` and `portfolio_import_drafts`
  have `user_id`, RLS and composite owner foreign keys. The confirmation RPC
  uses `SECURITY INVOKER`, derives the owner from `auth.uid()`, locks the draft
  and serializes imports for the owner/date before checking the expected
  revision. It replaces the complete position set atomically.
- Authenticated read views preserve underlying RLS and return decimals as text
  to avoid JSON-number precision loss. History reads paginate in batches of 500.
  Only chart preparation converts amounts to display numbers.
- Confirmed snapshots retain the original financial extraction and corrected
  fields, source fingerprint and parser version. No original PDF, full text,
  customer name, address or account identifier is persisted by extraction.
- Imports do not write bank balances, movements, categories or reconciliations,
  and do not contribute again to existing cashflow or Excel reports.

## Responsive Navigation

Below 768 px, four labeled tabs become accessible icon-only controls using
28 px Lucide icons and transparent 44 px hit areas. There is no visible
container or underline. Desktop retains text tabs and their underline.

Mouse proximity scales content from 1 to 1.18 using a two-dimensional cosine
falloff, extending 16 px beyond each fixed tab area. A requestAnimationFrame
loop smooths the scale without moving layout or hit areas. Touch input,
reduced-motion preferences, navigation, cancellation and window exit reset or
disable magnification. Labels, keyboard navigation and focus remain available.
The custom proximity controller augments existing Base UI tabs; it does not
introduce another component library.

## Deployment And Verification

The local migration chain adds:

- [`20261010120000_add_portfolio_snapshots.sql`](../supabase/migrations/20261010120000_add_portfolio_snapshots.sql).
- [`20261010123000_add_portfolio_read_views.sql`](../supabase/migrations/20261010123000_add_portfolio_read_views.sql).

Review and apply pending migrations using the [Supabase workflow](supabase.md#migration-workflow)
before using imports in the deployed application. Local migration files do not
prove remote deployment. No new environment variables or storage bucket are
required. PDF.js remains external to the server bundle; Next.js explicitly
traces its worker and native canvas dependencies for Vercel.

Tests cover extraction, exact decimals, owner boundaries, review conflicts,
replacement, pagination and pointer behavior. The
[SQL verification](../supabase/tests/portfolio_imports.sql) uses rollback fixtures
and was executed against isolated PostgreSQL during implementation. The real
owner-provided PDF was read locally without persisting or committing it.
Production build and its isolated traced PDF runtime were checked. No local
app server, live bank sync or remote migration execution was used; browser
appearance and production RLS still need separate operational verification.

## Limits

This version supports one Trade Republic portfolio per owner, the attached
Spanish report format, and EUR valuations. It stores observations, not purchase
cost, net contributions, profits, trades or complete past history. General
manual assets, crypto imports, additional brokers and other report languages
remain deferred.
