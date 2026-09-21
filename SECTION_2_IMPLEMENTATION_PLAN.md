# Section 2 — live Commission & Fees implementation plan

## Purpose

Replace the current minimal non-May Section 2 with a source-backed, live
Commission & Fees page for imported months. This plan is based on the actual
August source workbooks under `datasource/`, not on May demo values in
`original.html`.

`original.html` and `src/data/outletData.ts` remain the visual/data reference
for the labelled **May 2026 demo only**. Never carry their fee values into a
live month.

## Read first

1. `AGENTS.md`
2. `IMPLEMENTATION_CHECKLIST.md` — the simple six-table schema is active.
3. `supabase/SIMPLE_SCHEMA.md`
4. `src/components/SalesDashboard/ImportedSalesSection.tsx`
5. `src/lib/salesImportParser.ts`
6. `SECTION_2_LIVE_FEES_HANDOFF.md`

Do not run migrations, change RLS/grants, restore historical fee-line tables,
or alter `original.html`.

## Current application path

- `SalesDashboard.tsx` routes May (`2026-05`) to the static
  `CommissionFeesPage.tsx`.
- Other months load joined `sales_daily -> sales_imports -> outlets` rows in
  `ImportedSalesSection.tsx`, scoped to selected month and
  `sales_imports.status = 'imported'`.
- Non-May Section 2 currently renders `ImportedCommissionFeesPage.tsx`, which
  only displays combined `platform_fees`, `advertising_spend`, `payout`, and
  row counts through `src/data/importedFees.ts`.
- Preserve this one existing load/cache path. Do not issue a second Supabase
  query from the fees page.

## Source-audit findings

### Grab — detailed fee source, but parser/UI currently leave detail unused

Source: `datasource/GRAB Aug sales.xlsx` (30,309 rows). The workbook has a
broken worksheet dimension, so readers must reset dimensions or use a parser
that scans the actual sheet XML.

Relevant columns include:

- identity/scope: `Created On`, `Store Name`, `Transaction ID`, `Category`,
  `Settlement ID`, `Transfer Date`
- sales/settlement: `Net Sales`, `Total`, `Amount`
- explicit fee detail: `Grab Fee`, `Net MDR`, `Tax on MDR`,
  `Marketing success fee`, `Delivery Commission`, `Channel Commission`,
  `Order commission`, `Step-up commission`, `GrabKitchen Commission`,
  `Withholding Tax`
- adjustments/marketing: `Category`, `Subcategory`, `Offer`,
  `Discount (Merchant-Funded)`, `Tax on GrabFood/GrabMart commission,
  adjustments, ads`

Observed categories: Payment (25,989 rows), Advertisement (3,401), Adjustment
(455), Dine Out Discount (3), plus 461 blank-category rows.

Implementation implication: the source can support an itemized Grab fee view
and settlement references. First define Finance-approved classification rules;
do not label the current derived `platform_fees = collected - payout` as
commission.

### FoodPanda — explicit commission, incomplete Excel coverage

459 invoice workbooks provide order-level Appendix A data. Relevant columns:

- `foodpanda Commission`
- `SST on foodpanda commission`
- `Payable Amount`
- `Already Received Amount By Vendor`
- `Customer Targeting Fee`
- `Waiting Time Fee`
- `Voucher Paid By Vendor`, `Discount Paid By Vendor`, and other subsidy fields
- `Restaurant Revenue`, `Foodpanda Commission Rate`

There are also 418 PDF-only invoices with daily/outlet totals but no Excel
order-detail. Until those PDFs are parsed through an approved process, display
FoodPanda figures as **Excel-detail coverage only**, including invoice/outlet
coverage. Do not call them complete full-month figures.

### Shopee — no fee evidence in current export

`datasource/SHOPEE/Shopee Aug Sales.xlsx` contains 17,224 completed rows.
`Transaction Amount` equals `Earnings` for every audited row. The file has
sales discounts and subsidy columns but no separate commission, merchant fee,
deduction, payout-remittance, or bank settlement amount.

Implementation implication: show fee fields as **Unavailable / not supplied**.
Do not derive or display a Shopee fee from `Transaction Amount - Earnings`, and
do not call `Earnings` a reconciled bank settlement.

### Apps — order/payment coverage only

`datasource/APPS AUG ORDER LIST.xlsx` has 6,882 rows, all with payment method
`razerpay`. It contains `Payment Status`, `Transaction ID`, `Grand Total (RM)`,
`Delivery Fee (RM)`, and `Actual Delivery Fee (RM)`, but no gateway fee amount,
payout/remittance, or settlement statement.

Implementation implication: delivery fees are not payment-gateway fees. Keep
Apps fee and payout fields unavailable until a gateway fee/remittance source is
provided.

### POS — sales-only grouped report

The POS reports contain gross, discount, net sales, tax, charge, and
profitability detail grouped by date/outlet. They have no terminal fee, payment
settlement, or stable transaction identifier.

Implementation implication: POS must remain out of platform-fee and bank
reconciliation totals.

## Data-quality blockers

- 87 raw location strings are unmatched/ambiguous against the current outlet
  master. Do not silently map or exclude them.
- Sister-brand rows appear in the delivery-platform/POS data. Exclude them by
  brand prefix before outlet matching; location-name matching alone is unsafe.
- The August source footprint exceeds the 46-outlet May master. Finance must
  approve aliases/new outlets and their entities before corporate rollups claim
  complete coverage.
- `sales_daily` supports only aggregate daily fields. It does not preserve
  Grab's individual fee columns or FoodPanda's separate fee categories.

## Delivery scope

### Phase A — improve the existing live UI without schema changes

1. Keep `ImportedCommissionFeesPage.tsx` as the non-May entry point.
2. Extend `importedFees.ts` to return a three-state result for each source and
   field:
   - no rows imported;
   - rows exist but one or more applicable values are unknown;
   - complete known aggregate.
3. Add a platform matrix with:
   - platform deductions (combined only);
   - advertising;
   - payout supplied;
   - known partial costs;
   - imported row/day/outlet coverage;
   - concise data note.
4. Keep totals honest:
   - use exact decimal helpers only;
   - `NULL` never becomes RM0;
   - a whole-platform/whole-month total is unavailable when an applicable
     contributing value is unknown;
   - separately label any partial-known subtotal as partial.
5. Add source-specific notes:
   - Grab: combined deductions available; itemization requires persisted source
     detail.
   - FoodPanda: combined deductions available only for loaded Excel-detail
     invoices; PDF-only coverage remains outside it.
   - Shopee, Apps, POS: fees/payout unavailable from current sources.

### Phase B — source-detail intake design (requires Finance and Codex approval)

Do not implement this phase by inventing columns or changing SQL independently.
Prepare the design and obtain approval first.

1. Define a canonical fee taxonomy: commission, commission tax, MDR/payment
   processing, advertising, delivery/service commission, withholding tax,
   voucher subsidy, refund/adjustment, and other.
2. Define Grab classification rules by `Category` plus explicit fee columns.
   Preserve signed adjustments and link them to transaction/settlement IDs.
3. Define FoodPanda treatment of commission, SST-on-commission, targeting fee,
   vendor subsidy, payable amount, and already-received amount.
4. Decide whether PDF-only FoodPanda invoices will be parsed as daily/outlet
   totals and how they coexist with Excel-detail invoices without duplication.
5. Obtain the missing external sources:
   - Shopee settlement/fee statement;
   - Razerpay/Apps gateway fee and remittance statement;
   - POS terminal/acquirer fee and settlement statement;
   - bank remittance statement for final reconciliation.
6. Ask Codex to approve the resulting storage/schema and migration approach
   before application implementation.

## Finance decisions required before Phase B

1. Confirm the authoritative fee/settlement report for every source.
2. Approve the fee taxonomy and whether tax on commission is displayed as its
   own line or included in platform deductions.
3. Define the reconciliation equation and its date basis for each platform.
4. Confirm how FoodPanda PDF-only invoices are ingested and deduplicated.
5. Approve outlet aliases/new outlets, entity ownership, and exclusion of
   sister brands.

## Tests and acceptance

Add pure unit tests for `importedFees.ts` covering:

- exact-decimal known sums;
- zero versus `NULL`;
- no-row versus unknown-value state;
- entity filtering;
- channel filtering;
- a partial-known subtotal that is never presented as a full total.

Browser-test a non-May month by changing entity/channel/month and signing out
then back in. Confirm that prior month/account values never appear under the
new scope. Run:

```powershell
npm run lint
npm test
npm run build
```

## Definition of done for Phase A

- Non-May Section 2 uses only live joined rows for the selected month.
- Every displayed money value is source-backed and exact-decimal aggregated.
- Every unavailable/partial value is visibly labelled.
- No May demo values, unsourced commission rates, fee categories, or
  reconciliation gaps appear in a live month.
- The UI explains why Grab/FoodPanda may be partial and why Shopee/Apps/POS
  fee figures are unavailable.
