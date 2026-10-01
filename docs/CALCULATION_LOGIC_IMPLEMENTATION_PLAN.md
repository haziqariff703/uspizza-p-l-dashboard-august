# Calculation Logic — Implementation Plan

Owner-specified dashboard calculation logic (confirmed 22 September 2026) and the exact
steps required to make the live app compute it. Companion to
`SECTION_2_IMPLEMENTATION_PLAN.md`, which holds the per-platform column mappings these
formulas read from.

---

## 1. The agreed formulas

### 1.1 Sales waterfall (Section 1)

| Step                       | Formula                                     |
| :------------------------- | :------------------------------------------ |
| Gross Sales                | Menu selling price                          |
| Net Sales                  | Gross Sales − Discount                      |
| Net + Service Charge       | Net Sales + Service Charge (10%)            |
| Net + Service Charge + Tax | Net Sales + Service Charge (10%) + SST (6%) |
| Gross Profit               | Net Sales − Purchases                       |
| Margin                     | Gross Profit ÷ Net Sales                    |

### 1.2 Net settlement, by platform group

**Delivery platforms — Grab, FoodPanda, Shopee** (no dine-in, so no service charge):

```
Net Settlement = Gross Sales − Discount + SST − Commission & Fees
```

**Own channels — Apps, POS** (dine-in service charge applies):

```
Net Settlement = Gross Sales − Discount + Service Charge (10%) + SST (6%) − Commission & Fees
```

### 1.3 Actual commission rate

```
Actual Commission Rate (%) = Commission ÷ Net Sales × 100
```

Net Sales here is the **pre-tax** net sales for the same platform, outlet set and date
range as the commission figure. Never a different scope.

### 1.4 Governing identities (unchanged, still binding)

Both must hold for every platform / outlet / day, and remain the acceptance test:

1. `Gross Sales − Discount = Net Sales`
2. `Net Sales + Service Charge + Tax − Fees = Payout`

---

## 2. Where the code stands today

| Piece                                             | State                             | Evidence                                                                                                |
| :------------------------------------------------ | :-------------------------------- | :------------------------------------------------------------------------------------------------------ |
| Section 1 waterfall                               | **Implemented and live**          | `src/data/importedOverview.ts` derives `netSC`, `netSCTax`, `discount`, `settlement` from the same rows |
| Service-charge split (Apps dine-in vs delivery)   | **Implemented**                   | `DERIVED_CHARGES` in `importedOverview.ts`; parser splits the app's combined charges column at 10% / 6% |
| Itemized commission **parsing**                   | **Implemented**                   | `feeLine(row, 'commission', …)` in `salesImportParser.ts` for Grab (4 columns) and FoodPanda            |
| Itemized commission **readable by the dashboard** | **MISSING** — this is the blocker | `MONEY_KEYS` (parser) and `ImportedRow` (`importedOverview.ts:7-26`) have no commission field           |
| Section 2 commission cell                         | Hard-coded unavailable            | `importedFees.ts:250` → `commission: structuralCell()`                                                  |
| Section 2 commission rate                         | Hard-coded `null`                 | `importedFees.ts:287` → `commissionRate: { value: null, state: 'none' }`                                |

**The gap in one sentence:** the parser already extracts real commission amounts into
`feeLines` on each staged row, but those fee lines are never aggregated back into the
daily read model, so the dashboard has no commission number to divide by net sales.

---

## 3. The double-counting trap — resolve this first

`salesImportParser.ts` currently sets, for Grab and Shopee:

```ts
platformFees: subtractAmounts(collected, payout); // = ALL deductions combined
```

That single figure is the **whole** deduction block (Grab August: RM 588,668.51).
`SECTION_2_IMPLEMENTATION_PLAN.md` instead defines Platform Fees as the narrow
`Grab Fee + Restaurant Packaging Charge` (RM 19,146.00), with commission, advertising and
adjustments as separate categories.

Section 2's `total` sums all five categories. If itemized commission is added while
`platform_fees` still means "collected − payout", **Grab's total fees will roughly double**.

**Decision required before any code lands:** `platform_fees` must be narrowed to the
itemized platform-fee columns only, and the combined `collected − payout` figure must
either be dropped or moved to its own clearly-named field (e.g. `total_deductions`) used
solely for the identity check in §1.4. Bump `PARSER_VERSION` when this changes.

---

## 4. Implementation order

### Step 1 — Schema (Any agent can write the SQL schema)

Any agent may run the migration SQL and grants with the user's permission first. The work to raise for:

- `sales_daily.commission` — exact decimal, nullable (null = unknown, never 0).
- `sales_daily.payment_gateway_fee`, `sales_daily.adjustments` — same treatment, so the
  five Section 2 categories can each be known independently.
- Aggregation of approved `feeLines` by `feeType` into those columns at publication time,
  so the browser continues to write no daily totals (contract `2026-09-16-v1`).

Nothing in Steps 2–5 can be verified against live data until this lands. Steps 2–4 can be
written and unit-tested against fixtures in the meantime.

### Step 2 — Parser (`src/lib/salesImportParser.ts`)

1. Add `commission`, `paymentGatewayFee`, `adjustments` to `MONEY_KEYS`.
2. Emit each as its own normalized money field, sourced from the columns already listed in
   `SOURCE_PROFILES[*].readsColumns`:
   - **Grab:** `Order commission + Step-up commission + GrabKitchen Commission + GrabKitchen Other Commission`
   - **FoodPanda:** `foodpanda Commission` (its 8% SST stays in adjustments, not commission)
   - **Shopee / Apps:** explicit unknown — no commission column exists in the order export.
     Do not write 0; Shopee's real commission lives in the remittance statement, which is
     not yet a source.
3. Narrow `platformFees` per §3.
4. Bump `PARSER_VERSION`.
5. Re-assert both identities in `salesImportParser.test.ts`.

### Step 3 — Read model (`src/data/importedOverview.ts`)

Add `commission`, `payment_gateway_fee`, `adjustments` to `ImportedRow` and to the
`MoneyKey` union so they may be summed exactly. Section 1 does not display them; it only
needs them available to Section 2, which reads the same rows.

### Step 4 — Section 2 view-model (`src/data/importedFees.ts`)

1. Replace `commission: structuralCell()` with `toCell(sumField(sourceRows, 'commission'))`.
   Same for `paymentGateway` and `adjustments`. The three-state contract is unchanged:
   no rows → `none`, rows present but value null → `unknown`, complete → `known`.
2. Compute the rate:

   ```ts
   const netSales = sumField(sourceRows, "net_sales");
   commissionRate =
     commission.state === "known" &&
     netSales.state === "known" &&
     netSales.value !== "0"
       ? { value: rateOf(commission.value, netSales.value), state: "known" }
       : {
           value: null,
           state: commission.state === "none" ? "none" : "unknown",
         };
   ```

   Rules that must hold:
   - Known **only** when both numerator and denominator are known — never a known
     commission over an assumed net sales figure.
   - Zero or absent net sales → `unknown`, never a divide-by-zero or `Infinity`.
   - The denominator is the **same `sourceRows`** already scoped by entity and channel
     filter. It must never be borrowed from another platform, period or scope.

3. Delete the stale comment at `importedFees.ts:285-286` — it says the denominator is the
   missing half; it is in fact the numerator.

### Step 5 — Decimal helper (`src/lib/decimal.ts`)

`scaleAmount` divides by a `bigint` constant, so it cannot divide one `Amount` by another.
Add:

```ts
export function rateOf(numerator: Amount, denominator: Amount): Amount;
```

Returning a percentage to 2 decimal places, `AMOUNT_UNKNOWN` when either side is not a
value or the denominator is zero. Unit-test it directly — this is the only new arithmetic.

### Step 6 — UI (`src/pages/fees/FeesSection.tsx`)

The `commissionRate` cell already renders from `FeeRate`; it will light up on its own once
the view-model supplies a value. Confirm the unavailable state still reads as
`Unavailable` / `Not supplied` rather than `0.00%`.

---

## 5. Acceptance

Run `npm run lint` and `npm test`, then drive the app in a browser.

**No figure is hard-coded as an expected result.** Every number is accepted because the
formulas in §1 produced it from the imported source rows — not because it matched a target
written here in advance. A test that asserts a memorised total still passes when the column
mapping is wrong; a test that asserts an identity does not.

| Check            | Accepted when                                                                                     |
| :--------------- | :------------------------------------------------------------------------------------------------ |
| Commission       | Equals the sum of that platform's itemized commission columns (§4 Step 2) over the scoped rows      |
| Commission rate  | Equals `Commission ÷ Net Sales × 100` over the **same** scoped rows                                 |
| Total fees       | Equals the sum of the five categories, with no category counted twice (§3)                          |
| Identity 1       | `Gross Sales − Discount = Net Sales` holds per platform / outlet / day                              |
| Identity 2       | `Net Sales + Service Charge + Tax − Fees = Payout` holds per platform / outlet / day                |
| Unknowns         | A platform with no commission source reads `Unavailable`, never `0.00%`                             |

Scope is part of correctness. A rate that is right in aggregate but built on a mismatched
denominator is still wrong — confirm the numerator and denominator cover the same platform,
outlets and dates before accepting any figure.
