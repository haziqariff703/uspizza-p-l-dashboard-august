# Grab August 2026 re-import — handoff

**Audience:** whoever has direct database access to the S&L_Dashboard test project
(`crxqjpvuuumeowkucaim`) — this session (Claude, application code only) cannot make
this change itself.

**Scope:** unblock and correct the Grab platform figures in Section 1
("Net Settlement by Platform") for August 2026.

## Summary

Grab's row in Section 1 currently shows `—` (Unavailable) for Gross sales, Net
sales and Collected sales, while Discount, Tax (SST) and Net settlement do show
numbers. This is not a display bug — it is the app correctly refusing to show
numbers derived from a known-bad stored import. The parser mapping is already
fixed in code. Re-importing the correct source file is blocked by a database-level
duplicate guard that nothing in the browser can clear. This document lays out both
issues and what needs to happen in the database.

## 1. Why Gross/Net/Collected currently read "Unavailable"

`src/data/importedOverview.ts:91-96` treats a Grab row as "legacy" (and forces
`grossMenu`/`net` to unknown) whenever `discount < 0`:

```ts
// Older Grab imports copied tax-inclusive Net Sales into both sales bases
// and retained negative promotion deductions. Do not present that copied
// number as original menu price or pre-tax net until source reconciliation.
const legacyGrab = platform === 'grab' && basisRows.some(r => r.discount !== null && Number(r.discount) < 0)
```

I checked the currently-stored August Grab import
(`datasource/_audit/section1-before-20260918.json`): **1,131 of 1,138 rows
(99.4%) have a negative `discount`**, so this flag fires for essentially the
whole platform. The stored import also only covers **37 outlets / 31 days**,
and per `SECTION_1_SST_CALCULATION_HANDOFF.md`, its daily row counts don't
reconcile ±1 against the true source workbook on 58 outlet-days. This import is
simply bad data — it needs to be replaced, not patched.

## 2. The correct source file and confirmed mapping

Source file: `datasource/GRAB Aug sales.xlsx` (30,309 raw rows, all outlets,
full August). Confirmed mapping (from `SECTION_1_SST_CALCULATION_HANDOFF.md`,
owner-approved):

| Dashboard field | Workbook field / calculation |
| --- | --- |
| Gross sales | `Amount` |
| Discount | abs(`Offer`) + abs(`Discount (Merchant-Funded)`) |
| Service charge | `Restaurant Service Charge`; blank = RM0 |
| SST | `Tax on Order Value` when present |
| Payout | `Total` |
| Fees | collected − payout |

Only rows with `Category == "Payment"` are real order settlements; `Advertisement`,
`Adjustment` and `Dine Out Discount` rows must be excluded from sales totals (they
mix into the raw `Amount` column and understate/distort gross sales if summed
blindly).

**The application parser already implements this correctly** —
`src/lib/salesImportParser.ts:373-394` filters to `Category === 'Payment'` and
computes `discount = 0 − (Offer + Discount (Merchant-Funded))`, which correctly
flips the stored-negative `Discount (Merchant-Funded)` value to a positive
discount. **No application code change is needed** for the numbers to come out
right on a fresh import.

Reference figures computed directly from the raw file (Payment rows only, whole
of August, all outlets — for cross-checking the eventual import, not something to
hand-enter anywhere):

| Metric | Value (RM) |
| --- | --- |
| Gross sales | 1,778,646.01 |
| Discount | 309,996.70 |
| Net sales | 1,468,649.31 |
| Service charge | 0.00 (column is blank for every row) |
| SST | 80,682.74 |
| Collected sales | 1,549,332.05 |
| Payout | 1,096,929.19 |
| Implied fees | 452,402.86 |

(The workbook's own `Net Sales` column sums to RM 1,549,319.05 for Payment
rows — within RM 13 of the independently-derived "Collected" figure above,
which is a strong sanity check that this mapping is correct.)

## 3. Blocker: duplicate-import guard has no release valve

`src/components/SalesDashboard/SalesImportModal.tsx:199-208`:

```ts
const { data: existingImports } = await supabase
  .from('sales_imports')
  .select('file_name, source')
  .eq('reporting_month', `${reportingMonth}-01`)
  .in('source', fileSources)
  .eq('status', 'imported')
  .limit(1)
if (existingImports?.length) {
  throw new Error(`${existingImports[0].source} data for ${monthLabel(reportingMonth)} is already available...`)
}
```

Because a `sales_imports` row already exists with `source='grab'`,
`reporting_month='2026-08-01'`, `status='imported'`, every re-import attempt is
rejected before it even looks at the new file.

Per `supabase/SIMPLE_SCHEMA.md` (applied 17 Sept, currently live on
`crxqjpvuuumeowkucaim`): *"Import statuses: draft, imported, failed. There is no
review/publication workflow."* There is no revision/replace/`supersedes_import_id`
concept in the current schema at all (that existed only in an older, now-retired
schema per `supabase/APP_CONTRACT.md`, which is explicitly marked superseded).
The application also has **no delete/retire-import UI anywhere** — confirmed by
searching the whole `src/` tree.

**Net effect:** once a `(source, reporting_month)` pair is marked `imported`,
nothing in the browser — not even an admin — can replace it. This is an
intentional guard against double-counting, not a bug, but it currently has no
release valve for correcting bad data.

## 4. What needs to happen in the database

To unblock this, someone with direct Supabase access to `crxqjpvuuumeowkucaim`
needs to retire the stale Grab August row before a new import can be attempted:

1. Identify the `sales_imports` row where `source = 'grab'` and
   `reporting_month = '2026-08-01'` and `status = 'imported'` (file name
   `Grab_Aug.xlsx`).
2. Either flip its `status` away from `'imported'` (e.g. to `'failed'`), or
   delete the row together with its child `sales_daily` rows
   (`sales_import_id = <that id>`), so the client-side duplicate check in
   `SalesImportModal.tsx` no longer finds a blocking row.
3. Confirm no other code path (RLS policy, trigger) re-derives `status='imported'`
   automatically for that row.

This is a direct mutation of shared financial data on the live test schema and is
explicitly out of scope for Claude to perform per `CLAUDE.md` ("Codex owns
migration SQL and database verification... do not apply/rewrite SQL... without
coordinating with Codex").

## 5. Separate, still-unresolved issue: outlet name matching

Independent of the above, re-importing `datasource/GRAB Aug sales.xlsx` will
still exclude daily totals for outlets whose Grab store name doesn't match the
46-outlet canonical roster (`datasource/_audit/canonical_outlets.json`). I
checked all 18 unmatched Grab names
(`datasource/_audit/outlet_alias_unmatched.json`) against the canonical roster:

- **One confirmed, low-risk alias**: `"US Pizza - Mydin USJ"` is unmatched on
  every platform except POS, where the same import batch's own row
  (`"039-US Pizza Mydin Subang Jaya"`) matches exactly to canonical outlet
  `MY-033 / Mydin Subang Jaya`. Safe to alias without further sign-off.
- **14 names genuinely absent from the roster under any spelling** — Melawati,
  Jalan Ipoh, Seksyen 13 Shah Alam, Selayang, Subang Perdana, Nusa Bestari,
  Bandar Tun Hussein Onn, Ipoh Simee, Sunshine Mall Farlim, Kota Kemuning,
  Cheng, Presint 15 Putrajaya, Prima Saujana, Lotus's Kepong — not even POS has
  them. Either the 46-outlet roster is incomplete, or these are intentionally
  excluded (franchise/non-corporate) — this needs a Finance decision, not an
  inferred mapping.
- **One ambiguous case**: `"US Pizza - Vivacity Megamall"` (Grab) vs. the
  roster's `"Vivacity Kuching"` — likely the same outlet under a different
  name, but this is the same naming inconsistency `CLAUDE.md` already flags as
  unresolved ("PL_BY_OUTLET tags Bundusan + Inanam as Sabah while INITIAL_OUTLETS
  tags Vivacity Kuching instead"). Needs confirmation, not an assumption.

The same unmatched-outlet pattern (~110 more names) exists across Shopee, Apps,
Foodpanda and POS in the same audit file — this is a roster-completeness problem
across the whole dashboard, not a Grab-specific one.

## Requested actions

1. Retire the stale `sales_imports` row for Grab August 2026 (section 4).
2. Re-import `datasource/GRAB Aug sales.xlsx` through the app's normal import
   flow once (1) is done.
3. Separately, get Finance to confirm the outlet-roster questions in section 5
   before the reimport's outlet-matching exclusions can be closed out.
