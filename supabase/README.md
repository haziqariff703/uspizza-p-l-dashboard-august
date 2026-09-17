# Supabase migration runbook

## Current database — 17 September 2026

The user authorized replacement of the full review/organization model with a simple
six-table prototype on S&L_Dashboard (`crxqjpvuuumeowkucaim`). The active public tables
are `outlets`, `outlet_aliases`, `sales_imports`, `sales_daily`, `purchases_imports`,
and `purchases_daily`. There are no `prototype_*` tables. See [SIMPLE_SCHEMA.md](SIMPLE_SCHEMA.md).

Applied migration: `migrations/20260917020153_replace_application_tables_with_simple_structure.sql`.
The removed tables were copied into private `migration_backup_20260917`, including
5 imports and 5,849 daily rows; the previous backup and Storage file bytes were retained.
Rollback-only SQL fixtures passed for sales/purchases inserts, exact money, nullable
unknown values, cross-user isolation and forbidden foreign outlet assignments.

The old application remains incompatible: it expects organization/staging/review RPCs
that have now been removed. Update the application to the simple schema before enabling
live imports. The historical run order and contract below are superseded for this project;
do not rerun those scripts or their fixture suite against the replacement schema.

## Deployment status — 16 September 2026

**APPLIED / SQL-FIXTURE-TESTED ON AUTHORIZED TEST PROJECT. Not production-ready.**

Codex owns SQL; Claude owns application integration. The user authorized
`S&L_Dashboard` (`crxqjpvuuumeowkucaim`) for testing. All seven files executed;
the corrected ordered sequence reran successfully. The final rollback-only SQL
fixture suite passed, including permissions, cross-org isolation, fee publication,
duplicate atomic rollback, unknown/zero aggregation and period closing.

Private snapshot `migration_backup_20260916` retains 5 imports, 5,849 daily rows,
6 Storage object metadata records and original policies. This is not a file-byte
backup or an automatic downgrade script. Original daily values compare unchanged;
no fixture rows remain. Legacy imports were explicitly assigned to separate test
organizations per uploader, preserving isolation, and remain non-current.

Execution found and fixed a publication fee-row alias ambiguity and an unsafe
bootstrap policy rerun; scoping now skips bootstrap policies after hardening.
Security advisors now report only disabled leaked-password protection. See
[Auth remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
Performance follow-ups: 28 unindexed FKs, 2 auth initplan warnings, 7 overlapping
permissive-policy warnings; backup tables lack PKs and new indexes show unused.
Review [database linter remediation](https://supabase.com/docs/guides/database/database-linter)
before production load; do not delete backup tables or new indexes blindly.

Still unverified: real browser/Auth/Storage HTTP, full suspended-role matrix,
successful/failed revisions and multi-session concurrency. Finance sign-off and
compatible Claude application are mandatory release gates.

The Supabase CLI is now available through the npm tool cache. Its migration-new
command generated the hardening file below; that does not mean it ran anywhere.

## Order

Use a designated scratch project first. These legacy SQL Editor files are not
yet a complete CLI migration history: **do not run db push blindly**. The new
file in migrations/ depends on all six prerequisites.

| # | File | Purpose |
| --- | --- | --- |
| 1 | sales-import-schema.sql | Transactional bootstrap; legacy policies only on an unscoped schema |
| 2 | 2026-09-nullable-sales-values.sql | Removes money NOT NULL constraints/defaults |
| 3 | 2026-09-sprint1-organizations.sql | Membership/reference tables, private privileged functions, invoker API wrappers |
| 4 | 2026-09-sprint1-scope-imports-to-org.sql | Explicit ownership backfill and import-bound file access |
| 5 | 2026-09-sprint2-import-staging.sql | Provenance, staging, issues and parser mappings |
| 6 | 2026-09-sprint3-import-review.sql | RLS-respecting source-row summary |
| 7 | migrations/20260916115247_import_safety_contract.sql | Review/publication gate, row-key ledger, fees, revisions, period locks and grants |
| 8 | seed-outlets.sql | Optional Finance-reviewed starter master; set target_org; does not overwrite existing outlets |

sales-import-auth-policy.sql is historical, superseded, and must not be run.

Rerun the entire ordered sequence in scratch tests, not just individual files.
The scoping prerequisite skips bootstrap policies when the contract exists;
nevertheless do not run historical policy scripts against a hardened project. Do not expose
scratch to users during installation/reruns.

## Existing-data ownership

Before step 4:

1. Inventory every existing import and uploader (Finance approves the list).
2. Create intended organization(s) with nominated created_by user IDs. The
   creator trigger makes only each nominated owner an admin.
3. Set backfill_assignments in step 4 to an explicit JSON array of
   `{ "import_id": "uuid", "organization_id": "uuid" }` for every legacy import.
4. Add other members separately with Finance-approved roles.

Missing assignments abort step 4 transactionally. No inferred ownership or
automatic promotion of historical uploaders. Legacy totals remain stored but
non-current/unapproved after hardening. Re-import affected months after testing;
unavailable amounts previously written as zero cannot be reconstructed reliably.
Do not delete source records/files or set legacy is_current=true to certify them.

## Application compatibility

**The current browser code is incompatible with step 7.** It uploads before
creating the import and directly inserts daily totals/updates publication status.
Those operations are intentionally blocked by the new contract.

Claude follows [APP_CONTRACT.md](APP_CONTRACT.md) and ../CLAUDE.md. Coordinate a
maintenance-window release: pause imports, back up, apply verified migrations,
release compatible app, smoke test roles/Storage/imports, then re-enable imports.
Keep the application disabled if the schema/contract is missing. Do not widen RLS
to restore old code. Do not blindly roll back to an application that bypasses review.

## Verification before release

Run tests/import_safety_contract.sql in scratch after migrations. It uses
transactional fixtures and rolls back; no pgTAP dependency. Expected: assertions
succeed and final ROLLBACK completes. This is not HTTP-auth/Storage-file-byte proof.

Additional required checks (NOT executed):

- Fresh install, full-sequence rerun, and upgrade from a legacy schema/data copy.
- Missing/invalid ownership manifest rolls back; organizations stay distinct.
- Anonymous/non-member/suspended member allow/deny matrix for all tables/RPCs.
- Real Magic Link acceptance, expired invites, and last-admin protection.
- Real Storage HTTP upload/download with a dual-org uploader.
- Incomplete staging, unresolved issues, rejected/unknown-outlet rows, malformed amounts and dates.
- Successful revision preserves old totals/events; failed revision restores old current flags/ledger/totals.
- Concurrent publication/retry and closure cannot duplicate data or modify a closed period.
- Finance control totals, real source references, and query/storage volume measurements.
- Database security/performance advisors, including private-schema exposure/grants.

Keep app_private out of Data API exposed schemas. Its privileged bodies check
identity/roles, with authenticated USAGE/EXECUTE on explicitly granted functions.
Public API entry points are SECURITY INVOKER wrappers. Never use VITE service keys.

## Volume / deferred work

Full-month staging is roughly 57k rows / 25–30 MB JSONB before indexes, audit and
fees. Measure actual growth/query time; no purge without an approved archival policy.

SQL does not decide Shopee/Grab semantics, approve the outlet master, implement
browser validation, calculate reconciled payouts, or finish live dashboard wiring.
