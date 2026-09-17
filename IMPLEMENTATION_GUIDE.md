# P&L Dashboard Prototype Guide

## Purpose

Build a working prototype for US Pizza Malaysia’s corporate P&L dashboard. The prototype imports sales and purchases files, maps source outlet names to canonical outlets, and shows sales, purchases, gross profit and margin by outlet and reporting month.

The active Supabase test database uses six tables only. The previous organization, review, approval, staging and audit model has been removed. Read `supabase/SIMPLE_SCHEMA.md` before changing database-backed application code.

## Principles

1. Keep every amount as an exact decimal string while importing. Do not use JavaScript floating-point arithmetic for money.
2. A missing applicable value is `null`, not RM0.
3. Use the 44-outlet `PL_BY_OUTLET` list as the import authority. Resolve names/codes and existing source spelling variants automatically. Exclude unmatched/ambiguous names with a visible report; no manual outlet confirmation or creation step.
4. Dashboard data is shared across signed-in users. The uploader retains management rights, while everyone authenticated can view the processed figures.
5. May remains labelled static demo data. Imported months read Supabase data.
6. Keep original source files in private Storage. Upload paths are `<user-id>/<import-id>/<filename>` without upsert.

## Active data model

| Table | Use |
| --- | --- |
| `outlets` | Official outlet name, code, entity and operating status. |
| `outlet_aliases` | Source-platform outlet spelling mapped to an outlet. |
| `sales_imports` | Sales file month, source, filename and status. |
| `sales_daily` | Daily sales totals by source import and outlet. |
| `purchases_imports` | Purchases/GRN file month, filename and status. |
| `purchases_daily` | Daily purchase totals by import and outlet. |

Sales sources are `pos`, `grab`, `foodpanda`, `shopee` and `apps`. Import statuses are `draft`, `imported` and `failed`. There are no reporting periods, organizations, reviewer roles, approvals, publication flags, row staging records or review RPCs.

## Sales import flow

1. Require a signed-in user and selected reporting month.
2. Detect the source parser profile and inspect the file’s sheet/header layout.
3. Create a `sales_imports` record with status `draft`.
4. Upload the source file to the private `sales-imports` bucket.
5. Parse daily totals using `src/lib/salesImportParser.ts` and retain null values from unsupported source fields.
6. Automatically create missing P&L master database records, then resolve each source name against that master. Stored manual aliases do not override it. Merge source-name variants for the same outlet/date before saving. Save `outlet-resolution.json` beside each imported original file to record excluded daily totals.
7. Insert the totals into `sales_daily` and change the import status to `imported`.
8. Set status to `failed` and show an actionable message if the upload, parse or database write fails.

The browser may write `sales_daily` in this prototype. Do not add the retired contract RPCs or staging tables back into this flow.

## Purchases import flow

1. Create `purchases_imports` for the selected reporting month.
2. Upload the GRN/purchases source file to `purchases-imports`.
3. Resolve each purchase to a canonical outlet.
4. Insert `purchases_daily` records with date, amount and available GRN/supplier fields.
5. Leave an outlet’s purchases unavailable if there is no source data. Do not create RM0 records just to complete a table.

## Dashboard rules

For an imported month, query `sales_daily` joined to `sales_imports` and `outlets`. Filter the parent sales import by `reporting_month`. Query purchases through `purchases_daily` joined to `purchases_imports` and `outlets` in the same way.

```text
Gross profit = Net sales − Purchases
Gross margin % = Gross profit ÷ Net sales × 100
```

Only calculate gross profit and margin where the month has purchases data. Sales figures remain visible when purchases are missing, with an unavailable state for P&L fields.

POS may represent all channels while platform reports can represent overlapping orders. Do not add POS and delivery-platform sales together until Finance confirms the channel ownership rule.

## Delivery order

| Step | Deliverable |
| --- | --- |
| 1 | Remove organization scope, organization controls and import review UI. |
| 2 | Rewrite sales import to write `sales_imports` and `sales_daily`; use private Storage paths. |
| 3 | Replace local outlet mappings with `outlets` and `outlet_aliases`. |
| 4 | Rewrite imported-sales reads for the new joins and user/month cache scope. |
| 5 | Add purchases import and live purchases/GP/margin views. |
| 6 | Verify all seven dashboard sections with an authenticated browser session. |

## Known source limits

- Shopee exports do not provide SST/service charge. Keep these values null.
- Do not infer Shopee discount from original price minus earnings.
- The POS grouped report lacks a stable transaction identity. This does not block the prototype, because it stores daily totals rather than a publication ledger.
- Many August source outlet names still need an approved code/entity. Keep unresolved names visible.
- Purchases/GRN source coverage is incomplete, so GP and margin can be unavailable.

## Out of scope for the prototype

- Organizations, invitations, roles and tenant selection.
- Reporting-period locks, approval, publication, revisions and audit events.
- Staging rows, validation-issue tables and source-record deduplication ledger.
- Itemized fee-line table and automated payout reconciliation.
- AI mapping or approval assistance.

These may be designed again later as a separate production phase; do not restore their former tables or RPCs as part of prototype work.
