# Claude application contract — tested SQL handoff

**Superseded for S&L_Dashboard on 17 September 2026 by the user-authorized six-table
schema replacement. See [SIMPLE_SCHEMA.md](SIMPLE_SCHEMA.md).** The organization,
staging, review/publication tables and RPCs described below no longer exist in the
active database. This document is historical; the app still needs integration with
the replacement schema.

**Applied and SQL-fixture-tested on authorized S&L_Dashboard; not browser/production verified.** Codex owns SQL;
Claude owns application integration. Read README.md and checklist section 11 first.
Do not apply/change SQL or weaken policies without coordinating with Codex.

## Identity / organization

- Explicit selected organization, with organization_id filters on every financial,
  mapping, review and history query. The first membership is not a tenant selector.
- Check every RPC error (including invitation acceptance) and active membership.
- Clear data, mappings, review samples and caches on sign-out, account/org changes
  or revoked membership. Ignore late responses from the previous identity/scope.
- Retain stale figures only on transient refresh failures for the SAME authorized
  user/org/month; never display old month figures under a new month heading.
- Move canonical outlets and aliases to Supabase. Export old localStorage mappings
  for Finance review; do not silently mark them confirmed or use local IDs in FKs.

## Intake order

Before enabling intake, call sales_import_contract_version() as the authenticated
user and require `2026-09-16-v1`. Missing/error/different version means read-only
intake-disabled state; do not fall back to the unsafe direct-daily import flow.

1. Detect a supported source/profile and selected reporting month. Find actual sheet/header.
2. Generate import id with crypto.randomUUID() and a safe filename.
3. INSERT sales_imports FIRST: id, organization_id, reporting_period_id,
   reporting_month (YYYY-MM-01), lowercase source, file_name, storage_path,
   file_size, initial row_count, uploaded_by, lowercase SHA-256 file_hash,
   parser_version, mapping_version, status parsing.
4. Upload to bucket sales-imports at organization_id/import_id/filename, no upsert.
   The owning import authorizes that EXACT path. Recorded legacy paths remain readable.
5. Deterministic parsing: record unresolved issues, then stage every source row in
   bounded batches, including skipped rows. No daily totals are written by the browser.
6. Direct metadata UPDATE is limited to source_sheet/header_row_number while parsing.
7. submit_sales_import(expected count) requires complete staging and the original
   Storage object, then freezes intake at needs_review.
8. On failure call set_sales_import_status(failed/needs_mapping, reason). Partial
   staging stays auditable/invisible; retry failed staging in a NEW import record.

Do not directly write status/current/revision/approval, daily totals, fee details,
source ledger or audit events. "Submitted for review" is not "Published".

Exact bytes are indexed by organization/month/source/hash/parser-version/mapping-version
except failed/rejected imports. New parser versions permit reprocessing, but source
key overlaps still block publication without an explicit replacement. Align/remove
the old hash-only browser precheck; the database decides racing duplicates.

## Staged row schema

Existing columns plus outlet_id and source_record_key:

```ts
{
  organization_id: selectedOrganizationId,
  sales_import_id: importId,
  source_sheet: sheetName,
  source_row_number: 42, // positive, 1-based
  raw_row_json: originalCellsByHeader,
  outlet_id: confirmedOutletId ?? null,
  source_record_key: stableBusinessKey ?? null,
  normalized_row_json: {
    salesDate: '2026-08-01', source: 'shopee',
    grossSales: '123.45', netSales: null, tax: null,
    payout: '100.00', feeLines: []
  },
  skip_reason: null, status: 'valid'
}
```

Excluded/non-financial rows retain raw data, SQL NULL normalized data, and a skip
reason. Reviewer documents their rejection. Do not auto-approve/reject at intake.

- Monetary keys: grossSales, discount, netSales, tax, serviceCharge, platformFees,
  advertisingSpend, payout. Use exact decimal arithmetic and canonical decimal
  strings (no RM/commas), not Number/floating-point totals.
- Explicit null = applicable but unknown. Omitted key = this row has no contribution
  to that field, e.g. advertisement row is not order revenue. Unknown applicable
  components MUST be explicit null or the aggregate can become falsely partial.
- Preserve signed credits/adjustments; remove Math.max(0, ...) clipping where it
  would hide valid negative source values.
- Stable source business keys are scoped to outlet/platform. Use source transaction
  identity plus record type if multiple events share an order ID. Filename/hash/
  sheet row number are NOT sufficient. Document/test POS identity semantics;
  do not invent receipt IDs where grouped POS reports have none.
- Raw provenance, normalized money and keys become immutable. Correct parsing
  with a new import/revision, not in-place editing of raw/normalized rows.
- feeLines: [{ feeType, amount, taxAmount, sourceLabel }]. Types: commission,
  payment_processing, delivery, service, marketing, voucher_subsidy,
  refund_adjustment, tax, other, unclassified. Preserve unknown amounts as null.
  Do not flatten itemization or double-count tax/commission in payout math.

## Public RPCs

| Function | Parameters | Capability |
| --- | --- | --- |
| sales_import_contract_version | none | Authenticated schema compatibility check; returns 2026-09-16-v1 |
| set_sales_import_status | p_import uuid, p_status text, p_detail text/null | Owner preparer/admin: parsing, needs_mapping, failed before review |
| submit_sales_import | p_import uuid, p_expected_rows integer | Owner preparer/admin: complete staging -> needs_review |
| review_sales_import_rows | p_import uuid, p_rows uuid[], p_decision text, p_outlet uuid/null, p_note text | Independent reviewer/approver/admin: 1–500 rows, approved/rejected with note |
| resolve_sales_import_issue | p_issue uuid, p_note text | Independent reviewer/approver/admin: resolution actor/time/note |
| reject_sales_import | p_import uuid, p_note text | Independent reviewer/approver/admin: reject whole needs_review import |
| publish_sales_import | p_import uuid | Independent approver/admin: atomic validated publication |
| set_reporting_period_status | p_period uuid, p_status text, p_note text | Approver/admin: open/under_review/closed; only admin reopens closed |

Independent means NOT original uploader, including admins. Reviewer can also be
publisher if their role permits; a further three-person separation is not enforced.
Row review returns changed count. Publication returns
{ importId, status, revision, dailyRows }. Other RPCs return void.

Review UI: inspect exceptions, approve/reject bounded row groups, confirm canonical
outlets, resolve issues with notes, reject whole imports, then allow explicit publication.
Every source row and issue requires a deliberate decision. No auto-acknowledgment.
Malformed values/dates, duplicates and unknown identities still fail SQL publication
even after an issue note; notes cannot waive those invariants.

## Publication / revisions / reading

Publication serializes per organization, checks open whole-month period, counts,
independent decisions, issue resolutions, canonical outlets, dates, numeric values
and source-key overlaps. Ledger/totals/fees/current flags/approval/events share a
transaction. Retry of CURRENT published import returns existing result even after closure.

- Set supersedes_import_id at NEW import creation for explicit replacement. Target
  must be current published and match organization/month/source. Old totals/events
  remain stored; current flags switch atomically. No inference from similar names.
- Legacy figures are retained but non-current/unapproved. Re-import; do not target
  a non-current legacy import as the first supersedes_import_id.
- RLS exposes sales_daily/sales_fee_lines only for current published imports. Still
  filter selected organization in queries and group by canonical outlet_id/entity.
- Import/staging/audit history stays readable within its organization.
- Period boundaries are immutable/non-overlapping. State changes use RPC, never
  table UPDATE. Pending imports must be resolved/rejected/failed before closure.

## Claude delivery / acceptance

1. Tenant selection/filtering and identity/month-aware caches.
2. Import-first Storage, strict decimals, stable business keys, actionable validations.
3. Shared outlet/alias mapping, independent review and publication UI.
4. All-month live Overview, Finance-defined itemized fee/payout reconciliation and
   expected outlet/day/channel coverage. May samples move to separate labelled demo.
5. Revisions/history, exports and CI. AI remains deferred.

Run lint/tests/build and add source-key, monetary-null, cache-scope, review and RPC
failure tests. Verify the real browser/Auth/Storage/review/publication path on a
designated scratch project against Finance control fixtures. SQL fixtures alone
do not prove the network flow. Keep deployment blocked while SQL/Finance checks
are missing. Coordinate evolving contract signatures with Codex.
