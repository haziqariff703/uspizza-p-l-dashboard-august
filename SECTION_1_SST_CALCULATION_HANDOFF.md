# Section 1 — platform settlement calculation handoff

**Audience:** Claude implementation handoff  
**Scope:** August 2026 Section 1, `NET SETTLEMENT BY PLATFORM` only.

## Confirmed business decision

The owner has confirmed that missing SST must be calculated at **6%**. Do not leave a platform tax cell unavailable merely because its source workbook has no separate SST column.

Keep a distinction between:

- **Reported** — taken directly from an uploaded workbook.
- **Calculated (6% SST)** — derived by the rules below.
- **Unavailable** — only when a required settlement/payout input does not exist.

Do not edit `original.html` or `docs/original-capture.html`. They are reference captures, not source code.

## Original-dashboard calculation model

The original capture aggregates four sales bases and derives differences:

```text
discount = grossMenu - net
serviceCharge = netSC - net
tax = netSCTax - netSC
commissionAndFees = netSCTax - settlement
```

For the rebuilt platform model, use this equivalent sequence:

```text
netSales = grossSales - discount
netSC = netSales + serviceCharge
collected = netSC + tax
commissionAndFees = collected - payout
```

When the chosen taxable amount is **tax-inclusive**:

```text
tax = taxableInclusiveAmount * 6 / 106
preTaxAmount = taxableInclusiveAmount - tax
```

When it is **tax-exclusive**:

```text
tax = taxableExclusiveAmount * 6 / 100
```

Round monetary values only at the final two-decimal display/database boundary; use `src/lib/decimal.ts` for arithmetic.

## Platform mappings and required assumptions

### Grab

Workbook: `datasource/GRAB Aug sales.xlsx`.

| Dashboard field | Workbook field / calculation |
| --- | --- |
| Gross sales | `Amount` |
| Discount | absolute value of `Offer` + `Discount (Merchant-Funded)` |
| Service charge | `Restaurant Service Charge`; blank cell means RM0 |
| SST | `Tax on Order Value` when present; otherwise calculate 6% from the agreed taxable basis |
| Payout | `Total` |
| Fees | `collected - payout` |

The existing August Grab import does not reconcile day-for-day to this workbook. Do **not** patch selected old rows. Rebuild/re-import the complete Grab August daily data with the corrected mapping, validate month/outlet totals, then use the rebuilt import.

### Foodpanda

Source files: `datasource/FOODPANDA/`.

| Dashboard field | Workbook field / calculation |
| --- | --- |
| Gross sales | `Products Value Paid By Customer` |
| Net sales | `Restaurant Revenue - SST` |
| Discount | `gross sales - net sales` (this is the complete customer reduction, including promotions not separately itemised) |
| Service charge | RM0 unless an explicit service-charge column is present |
| SST | `SST On Restaurant Revenue` when present; otherwise calculate 6% from the confirmed taxable basis |
| Payout | `Payable Amount` |
| Fees | `collected - payout` |

Do not use SST on Foodpanda commission as customer SST.

### Shopee

Workbook: `datasource/SHOPEE/Shopee Aug Sales.xlsx`.

| Dashboard field | Workbook field / calculation |
| --- | --- |
| Gross sales | `Food original price` |
| Discount | `Item discounts + Flash sale discount + Merchant Prepaid Subsidy + Food Voucher Subsidy + Merchant Group Order Frame Discount Subsidy + Food Direct Discount - Platform Flash Sale Subsidy` |
| Service charge | RM0 unless explicitly supplied |
| Taxable amount | `Transaction Amount` — treat as the confirmed tax-inclusive transaction basis for this implementation |
| SST | `Transaction Amount * 6 / 106` |
| Net sales | `Transaction Amount - SST` |
| Payout | `Earnings` |
| Fees | `collected - payout` |

Only completed orders count. Preserve a source audit field/note that Shopee SST is calculated at 6%, not supplied by Shopee.

### Apps

Workbook: `datasource/APPS AUG ORDER LIST.xlsx`.

This sheet must be imported through the normal Sales Import workflow before Section 1 can show Apps figures.

| Dashboard field | Workbook field / calculation |
| --- | --- |
| Gross sales | `Subtotal (RM)` |
| Taxable inclusive amount | `Grand Total (RM) - Delivery Fee (RM)` |
| SST | taxable inclusive amount `* 6 / 106`, unless an explicit tax field is present |
| Net sales | taxable inclusive amount `- SST` |
| Discount | `gross sales - net sales` |
| Service charge | RM0 unless explicitly supplied |
| Payout | Must come from a settlement/bank-payout report; do not use order `Grand Total` as bank settlement |
| Fees | `collected - payout`, only after payout exists |

Apps settlement and fees should remain unavailable until a payout source is supplied. Gross, discount, tax and net can still be shown after the workbook import.

### POS

Keep POS workbook values as reported: its existing fields already include gross sales, discount, net sales, service charge and tax. POS is **all-channel** and must remain in the `ALL-CHANNEL POS` column, not be presented as a POS-only delivery-platform split.

## Implementation requirements

1. Update `src/lib/salesImportParser.ts` mappings for the source fields above. Keep raw source data and parser issues; never silently turn a missing header into zero.
2. Reprocess/import August sources through the normal import path. Do not directly write invented daily totals or modify `original.html`.
3. In `src/data/importedOverview.ts`, calculate the original dashboard derivation sequence from the stored daily values. A calculated SST is a known value, not `null`.
4. In `src/pages/overview/OverviewPage.tsx`, label platform rows/footnotes with `Calculated at 6% SST` where an estimate was used. Do not make a combined settlement bar unavailable simply because Apps has no payout; show shares of known settlements and label the partial coverage.
5. Preserve null/`Unavailable` for missing payout, unknown taxable basis, and unsupported POS-only splits.
6. Keep May 2026 static demo data untouched.

## Reconciliation and acceptance criteria

For every platform/outlet/day, verify:

```text
gross - discount = net
net + serviceCharge + tax - fees = payout
```

Where the workbook contains a directly reported SST, it must take precedence over the 6% calculated amount.

Before handoff, run:

```powershell
npm run lint
npm test
npm run build
```

Then browser-check August Section 1:

- Grab, Foodpanda and Shopee show calculated/reported values without unjustified unavailable cells.
- Apps shows sales values after import, but payout/fees remain unavailable until a settlement source exists.
- The All-channel POS column still matches its POS source totals.
- Every calculated SST is visibly documented as 6% calculated SST.
