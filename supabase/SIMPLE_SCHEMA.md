# Simple dashboard database — 17 September 2026

Applied to the authorized testing project S&L_Dashboard (`crxqjpvuuumeowkucaim`).
Exactly six application tables remain in `public`:

| Table | Fields and purpose |
| --- | --- |
| outlets | `id`, `name`, `code`, `entity`, `status`, `created_by`, `created_at`; one canonical outlet per uploader/code |
| outlet_aliases | `id`, `outlet_id`, `source`, `alias`, `created_by`, `created_at`; source names linked to an uploader-owned outlet |
| sales_imports | `id`, `reporting_month`, `source`, `file_name`, `status`, `created_by`, `created_at`; uploaded sales-file metadata |
| sales_daily | `id`, `sales_import_id`, `outlet_id`, `sales_date`, financial amounts, `record_count`, `created_at`; one daily total per import/outlet/date |
| purchases_imports | `id`, `reporting_month`, `file_name`, `status`, `created_by`, `created_at`; purchases-file metadata |
| purchases_daily | `id`, `purchases_import_id`, `outlet_id`, `purchase_date`, `purchase_amount`, `grn_number`, `supplier_name`, `created_at`; daily/GRN purchase totals |

Sales financial fields: `gross_sales`, `discount`, `net_sales`, `tax`,
`service_charge`, `platform_fees`, `advertising_spend`, `payout`. They are nullable
exact `numeric(14,2)` values; NULL means unknown, never assume RM0.
Purchase amounts are exact `numeric(14,2)` values and required for a stored purchase row.
Missing purchase coverage must remain unavailable in reporting.

Sources: `pos`, `grab`, `foodpanda`, `shopee`, `apps`.
Import statuses: `draft`, `imported`, `failed`. There is no review/publication workflow.
Both imports use a first-of-month `reporting_month` date.
Source and reporting month for totals are obtained from their parent import.
Purchase rows with NULL GRN are one daily total per import/outlet/date;
rows with GRN numbers are distinguished by that number.

## Access and files

Supabase Auth remains. Dashboard data is shared between all authenticated accounts:
any signed-in user can read outlets, mappings, import metadata and daily figures.
RLS still lets only the original uploader manage its own outlets/imports; child
records require ownership of both the referenced import and outlet. No anonymous
table access is granted. No service keys belong in the browser.

Private Storage buckets: `sales-imports` and `purchases-imports`.
Upload new files at `<signed-in user UUID>/<import UUID>/<filename>` without upsert.
Storage read/insert policies check the user UUID prefix. Original source files stay
private to their uploader; only the processed dashboard data is shared.
Application code must handle partial imports and errors; the schema does not enforce
the previous publication transaction, period locks or business-key deduplication.

## Replacement and verification

`20260917020153_replace_application_tables_with_simple_structure.sql` retired the
15 old application tables, renamed the six simple tables, removed obsolete RPCs,
and replaced organization-dependent Storage policies. It used explicit DROP targets
without CASCADE so an unexpected dependency would abort the transaction.

Private `migration_backup_20260917` retains snapshots of the removed tables,
Storage metadata, policies and function definitions, including 5 imports and 5,849
daily rows. Existing `migration_backup_20260916` and source file bytes remain.
These snapshots are not a full automatic restore script. No legacy figures were
silently marked approved or transferred into the simple tables; they start empty.

Rollback-only SQL fixtures passed for inserts through all six tables, exact decimal
subtraction, nullable unknown tax, cross-user read isolation, foreign outlet insert
rejection, and anonymous grants. The security advisor reported only the pre-existing
Auth leaked-password warning. Browser integration is still outstanding.

The old SQL files and migration history are historical. Do not rerun the old
organization/bootstrap/contract scripts against this schema. The current app still
queries the retired organization/staging model and must be adapted before live intake.
