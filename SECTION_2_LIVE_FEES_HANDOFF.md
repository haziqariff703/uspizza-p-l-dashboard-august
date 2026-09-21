# Section 2: live Commission & Fees handoff

**Purpose:** replace the static May-only fee page with an honest, live Section 2
for every imported reporting month. This is an implementation guide, not an
authorization to change database schema or apply SQL.

## Read first

1. `AGENTS.md`
2. `IMPLEMENTATION_CHECKLIST.md` (17 September 2026) — the simple schema
   supersedes the older organization/review/import-contract design.
3. `supabase/SIMPLE_SCHEMA.md` — current database contract.
4. `src/components/SalesDashboard/ImportedSalesSection.tsx` — the existing
   authenticated, month-scoped load and cache behavior to preserve.
5. `src/lib/salesImportParser.ts` — what each import source actually supplies.

Do **not** run historical migrations or restore the old staging/review/fee-line
tables. Do **not** change RLS, grants, or table shape as part of this task. Ask
before proposing a schema change.

## Current state and why Section 2 is missing

- `src/components/SalesDashboard/SalesDashboard.tsx` renders
  `CommissionFeesPage` only for demo month `2026-05`.
- `src/pages/fees/CommissionFeesPage.tsx` reads
  `COMMISSION_FEES_SUMMARY` and `PLATFORM_SETTLEMENTS` from
  `src/data/outletData.ts`; these are static May capture/demo figures.
- For non-May months, `ImportedSalesSection.tsx` currently renders the generic
  "Commission and fees unavailable" state for Section 2.
- The active schema has no fee-line table. It stores daily, source-level
  `platform_fees`, `advertising_spend`, and `payout` values in `sales_daily`.
  This is sufficient for a truthful *known platform costs* summary, but not the
  old five-way itemized table (commission, advertising, platform/service,
  payment gateway, adjustments) unless each category is explicitly supplied.

## Definition of done

For a non-May month with imported sales, Section 2 must:

1. Load only `sales_daily` rows whose parent `sales_imports.reporting_month`
   equals the selected month and whose import `status = 'imported'`.
2. Join the canonical outlet/entity data exactly as the live overview does.
3. Honor the existing entity and channel filters.
4. Aggregate exact decimal strings/numerics without treating `NULL` as RM0.
5. Show a useful live summary where data exists, and label every missing or
   unknowable value as **Unavailable** / **Not supplied**, not zero.
6. Keep the current static `CommissionFeesPage` for the labelled May demo only.
7. Preserve the current loading/cache rule: same-user, same-month cached figures
   may remain during refresh; changing month or signed-in account must never show
   a previous scope's figures.

## Current data contract

The active tables and source of truth are:

| Need | Table / field | Meaning | Null rule |
| --- | --- | --- | --- |
| Reporting month and source | `sales_imports.reporting_month`, `sales_imports.source`, `sales_imports.status` | Parent import controls scope | only `imported` contributes |
| Outlet / entity | `sales_daily.outlet_id` -> `outlets` | Canonical entity filter | unresolved outlet must be visibly reported |
| Platform costs | `sales_daily.platform_fees` | Known platform deductions supplied/derived by the parser | `NULL` = unknown, never zero |
| Advertising | `sales_daily.advertising_spend` | Known advertisement charge | `NULL` = unknown, never zero |
| Payout | `sales_daily.payout` | Amount the source states as payable/earnings | not automatically a bank-reconciled settlement |
| Sales basis | `gross_sales`, `discount`, `net_sales`, `tax`, `service_charge` | Context for rates/reconciliation | do not fabricate a common basis |

The available source mappings are intentionally uneven:

| Source | What can safely feed live Section 2 now | Important limitation |
| --- | --- | --- |
| Grab | `platform_fees` is parser-derived as `net_sales - payout`; advertisement lines populate `advertising_spend` | It is a known deduction total, not a verified itemized commission-only total |
| Foodpanda | `platform_fees` is commission plus SST on commission; advertising may be populated if supplied | Distinguish this from commission-only in copy |
| Shopee | No trustworthy fee/commission fields from current order export | Its `Earnings` must not be presented as a verified bank settlement or fee breakdown |
| Apps | Parser currently has no persisted platform-fee category | Delivery fee is not sufficient evidence of commission/payment-gateway fees |
| POS | No platform fee/payout in the current POS summary | POS is all-channel and must not become a fake POS platform-cost column |

## Recommended UI for live months

Build a small live-only component, for example
`src/pages/fees/ImportedCommissionFeesPage.tsx`, and render it from
`ImportedSalesSection.tsx` when `section === 'fees'`.

Use only labels supported by the data:

- **Known platform deductions**: sum of known `platform_fees` by source.
- **Known advertising spend**: sum of known `advertising_spend` by source.
- **Known total costs**: platform deductions + advertising only when both are
  known for the relevant source/set; otherwise show Unavailable for a claimed
  whole-month total and display known partial amounts separately.
- A platform matrix with rows: `Platform deductions`, `Advertising`, `Payout
  supplied`, `Known costs`, and `Coverage / data note`.
- An amber data-quality panel naming sources whose values are unknown. It should
  state that unknown amounts are excluded from *partial* subtotals and prevent
  a partial subtotal being labelled as a complete month total.

Do not ship any of these as live values without a new approved schema/source
contract: **Commission**, **payment gateway**, **adjustments/credits**, an
itemized fee list, a reconciliation gap, a commission rate, or final bank
settlement. The existing May UI may keep those labels because it is demo data;
the live page may not reuse them as if they were sourced.

## Implementation sequence

1. Extract the existing live query/normalisation from
   `ImportedSalesSection.tsx` into a shared hook or pass the already-loaded
   `rows`, `imports`, `directory`, and scope into the new component. Prefer
   reuse over a second Supabase fetch so filters, cache behavior, and error
   semantics remain identical.
2. Add a pure aggregation module, e.g.
   `src/data/importedFees.ts`. It should accept the joined daily rows plus
   entity/channel scope and return nullable amounts by `grab`, `foodpanda`,
   `shopee`, `apps`, and `pos`.
3. Use the decimal helpers in `src/lib/decimal.ts`. Do not convert to JS
   floating point until final display if that can be avoided.
4. Track **three states** per field/platform: no rows (not imported), rows with
   an unknown/null amount (unknown), and known numeric amount. A sum may be
   shown only when all contributing applicable values are known; never coerce
   null with `|| 0`, `?? 0`, or `Number(value)`.
5. Add an `ImportedCommissionFeesPage` with the recommended labels above.
   Reuse existing UI primitives, `PlatformLogo`, and `FEE_TYPE_COLORS` only
   where its semantic key remains accurate.
6. In `ImportedSalesSection.tsx`, replace the final generic fee
   `MonthlyState` branch with the live fee component. Do not affect Sections
   1, 3–7.
7. Keep `SalesDashboard.tsx` routing the May demo to `CommissionFeesPage`.

## Suggested aggregation contract

Use a shape equivalent to this (names may differ):

```ts
type KnownAmount = number | null

type LiveFeePlatform = {
  source: 'grab' | 'foodpanda' | 'shopee' | 'apps' | 'pos'
  rowCount: number
  platformFees: KnownAmount
  advertisingSpend: KnownAmount
  payout: KnownAmount
  hasUnknownPlatformFees: boolean
  hasUnknownAdvertising: boolean
  note: string
}
```

`null` must represent an unknown/unavailable aggregate. `0` may be returned
only when the source supplied a real, applicable zero and the input has rows.
An empty source is unavailable, not zero.

## Tests and browser acceptance

Add focused tests for the pure aggregator. At minimum cover:

1. A known Grab platform-fee amount and advertising amount aggregate correctly.
2. A null applicable amount makes the relevant platform total unavailable, not
   RM0.
3. No rows for Shopee/Apps/POS are unavailable, not RM0.
4. Entity filtering excludes the other entity.
5. Channel filtering returns only the selected source.
6. An unknown source makes an all-platform total unavailable; a separately
   labelled partial-known subtotal may still be shown.

Then run:

```powershell
npm run lint
npm test
npm run build
```

Browser-check an imported non-May month with a mix of Grab/Foodpanda/Shopee
data, switch entity and channel filters, change month, refresh, and sign out/in.
Confirm no May values or previous account/month values appear in live Section 2.

## Explicit non-goals

- Do not add a new imports workflow or modify `SalesImportModal.tsx`.
- Do not build an unapproved fee-line table or rerun historical migrations.
- Do not calculate fees by subtracting unrelated POS/all-channel figures.
- Do not call payout a bank settlement without an independently confirmed
  settlement source.
- Do not turn missing data into zero, hide it, or silently fall back to May demo
  values.

