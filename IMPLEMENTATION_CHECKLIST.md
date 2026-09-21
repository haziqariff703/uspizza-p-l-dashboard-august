# Prototype implementation checklist — 17 September 2026

## Database status

- [x] Replaced the old public application schema on S&L_Dashboard with six simple tables: `outlets`, `outlet_aliases`, `sales_imports`, `sales_daily`, `purchases_imports`, and `purchases_daily`.
- [x] Removed the organization, review, staging, approval, audit and fee-detail tables from `public`, including their RPCs and Storage policies.
- [x] Removed all `prototype_*` table names.
- [x] Enabled RLS on all six active tables. Each signed-in user can access only their own outlets/imports and related daily rows.
- [x] Created private `sales-imports` and `purchases-imports` Storage buckets/policies.
- [x] Preserved the removed records in private `migration_backup_20260917`: 5 imports and 5,849 daily sales rows. The backup is for recovery only and is not dashboard data.
- [x] Ran rollback-only SQL fixtures for six-table inserts, exact money, nullable unknowns, cross-user isolation, foreign-outlet rejection and anonymous access.

Read `supabase/SIMPLE_SCHEMA.md` for the schema contract. Do not run the historical SQL files or call the old review/publication RPCs against the active database.

## Application work

### 1. Remove retired organization/review code

- [ ] Delete `src/lib/organization.ts` and `src/lib/organization.test.ts`.
- [ ] Delete `src/lib/useOrganizationScope.ts`.
- [ ] Delete `src/components/SalesDashboard/OrganizationControl.tsx`.
- [ ] Delete `src/components/SalesDashboard/ImportReviewPanel.tsx`.
- [ ] Remove their imports, props and UI from `SalesDashboard.tsx`.
- [ ] Keep Supabase authentication. Clear imported-data cache when account changes or signs out.

### 2. Rewrite sales import

- [ ] Rewrite `SalesImportModal.tsx` to create `sales_imports`, upload to `sales-imports`, then insert parsed totals into `sales_daily`.
- [ ] Remove calls to `sales_import_contract_version`, `set_sales_import_status`, `submit_sales_import`, review/publication RPCs, `reporting_periods`, `sales_import_rows`, `import_validation_issues` and `import_column_mappings`.
- [ ] Preserve deterministic parser profiles and `src/lib/decimal.ts` exact decimal strings.
- [ ] Store unavailable applicable monetary values as null.
- [ ] Display unresolved outlet names for mapping; never silently omit them.

### 3. Move mapping to the simple database

- [ ] Rewrite `OutletMappingPanel.tsx` to use `outlets` and `outlet_aliases`.
- [ ] Remove mapping decisions stored in browser localStorage.
- [ ] Require a user choice before creating a new outlet code/entity.

### 4. Rewrite live sales views

- [x] Update `ImportedSalesSection.tsx` to join `sales_daily`, `sales_imports` and `outlets`.
- [x] Filter the parent import by reporting month; do not query removed `organization_id`, `is_current` or `sales_daily.reporting_month` columns.
- [x] Keep same-user/same-month refresh behaviour; never show old figures under another month or another signed-in account.
- [x] Remove the review panel from imported pages.

### 5. Add purchases

- [ ] Create a purchases import UI using `purchases_imports` and `purchases_daily`.
- [ ] Query purchases joined to `purchases_imports` and `outlets` by reporting month.
- [ ] Wire sections 5–7 to live purchases, gross profit and margin.
- [ ] Render missing purchases as unavailable, not RM0.

### 6. Verify

- [ ] Run `npm run lint`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Browser-test signed-in sales import, alias creation, monthly filtering and sign-out cache clearing.
- [ ] Browser-test second-user isolation.
- [ ] Browser-test purchases import and gross-profit calculation once a GRN source is available.

## Retired work — do not restore

- Organization membership, invitations and role controls.
- Reporting periods and their status events.
- Staged import rows, validation issues and column mappings.
- Independent review, approval, publishing and revision RPCs.
- Published source-record ledger, fee lines and import/period audit events.
- The old `2026-09-16-v1` application contract and its import safety fixtures.

## Data notes

- The static May dashboard remains a labelled demo.
- August source parsing work remains useful: brand denylist, guarded operator-prefix handling, null propagation and no invented Shopee discount/SST.
- POS and platform totals may overlap; do not combine them without Finance’s channel rule.
- August outlet mappings and purchases coverage remain incomplete.
