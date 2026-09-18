# Section 2 — May-layout redesign and live-data logic plan

## Objective

Use the original Section 2 information architecture for **every reporting
month**, while retaining the stronger visual craft of the current May page.
The original capture is the functional requirement. The current May page is an
improvement layer, not the financial source of truth.

Kimi K3 may redesign the presentation. It must not invent figures, change fee
definitions, or substitute static May values into a live month.

## Source references

- Functional baseline: `original.html`, Section 2, **Commission & Fees
  Breakdown**.
- Current improved May implementation:
  `src/pages/fees/CommissionFeesPage.tsx`.
- Current non-May implementation:
  `src/pages/fees/ImportedCommissionFeesPage.tsx`.
- Existing live load/cache path:
  `src/components/SalesDashboard/ImportedSalesSection.tsx`.
- Existing live aggregation: `src/data/importedFees.ts`.
- Current database contract: `supabase/SIMPLE_SCHEMA.md`.

## Source-derived requirements

The visual layout is reusable, but every live value and coverage label must be
derived from the imported source data for the selected period. Do not hard-code
the August audit counts/dates into the UI; they document the required rules.

| Source | Actual source evidence | Required intake and display rule |
| --- | --- | --- |
| Grab | Ledger categories include Payment, Advertisement, Adjustment, and Dine Out Discount. The August workbook audited so far covers 1–9 August only. It has explicit commission, MDR, marketing, adjustment, settlement-ID, and transfer-date columns. | Include only the approved categories. Payment may contribute sales/combined deductions; Advertisement may contribute advertising; Adjustment stays excluded from fee totals until a signed, approved adjustment mapping is persisted. Any 1–9 August-like source is **Partial coverage**, never a full-month KPI. |
| FoodPanda | Appendix A has commission, SST on commission, payable amount, targeting fee, vouchers/discounts, and restaurant revenue. There are 459 Excel-detail invoices and 418 PDF-only invoices in the August archive. | Read Excel Appendix A only at first; it is not a full-month fee basis while PDF-only invoices are absent. `Customer Targeting Fee` cannot become Advertising until Finance confirms it represents the original advertising definition. Commission/SST-on-commission must remain distinguishable from combined deductions. |
| Shopee | The audited August export has Completed orders for 1–31 August, but `Transaction Amount` equals `Earnings` for every audited row and has no separate fee/remittance field. | Do not save or render `Transaction Amount - Earnings` as RM0 platform fees. The fee, commission, payment-gateway, adjustments, and reconciliation cells are **Unavailable / not supplied** until a Shopee settlement statement arrives. |
| Apps | The August order list has 1–31 August order coverage, but only Completed + Paid orders are applicable. It has Razerpay as a payment method, delivery fee, and actual delivery fee—not a gateway fee/remittance amount. | Filter to Completed + Paid. Do not present delivery fee or payment method as gateway fee, commission, payout, or bank settlement. All fee/reconciliation rows remain unavailable until a gateway/remittance report is imported. |
| POS | Grouped daily/outlet sales report covers 1–31 August but has no transaction identity, terminal/acquirer fee, or remittance amount. | Do not include POS in Section 2 fee totals or reconciliation. It is a sales-coverage reference only. |

### Source completeness requirements

- A platform can be labelled **Complete** only when Finance has approved the
  expected source documents, reporting date basis, canonical outlet coverage,
  and exclusion rules for that period.
- A date range reaching the last calendar day is evidence of period range, not
  by itself proof of complete outlet/document coverage.
- The live adapter must calculate and expose: imported date range, distinct
  canonical outlets, rows/documents received, unknown money fields, unmapped
  rows, sister-brand exclusions, and failed/draft imports.
- The page must show a compact platform-level coverage label. A detail tooltip
  or expandable disclosure may explain counts; the main matrix stays readable.
- If the live database does not retain the required document/coverage metadata,
  display `Coverage not verified`, not an inferred completion percentage.

## Target page structure

Keep this order for May demo and all live months:

```text
1. Section heading and period-aware subtitle
2. Three KPI cards
   - Advertising spend / month
   - Commission / month
   - Total fees / month
3. Platform tabs
   - All platforms, Grab, FoodPanda, Shopee, Apps
4. Detailed fee matrix
5. Per-platform fee-composition cards and legend
6. Source, coverage, and limitation note
7. Settlement reconciliation panel — only when its required evidence exists
```

### Original requirements to preserve

- The platform tabs and the five fee rows:
  - Commission
  - Advertising
  - Platform / service fees
  - Payment gateway
  - Adjustments / credits
  - Total fees
- Platform columns: Grab, FoodPanda, Shopee, Apps, and Total.
- A commission-rate subrow below Commission.
- Per-platform proportional fee-composition cards.
- A legend explaining fee categories and a source/limitations note.
- A platform selection intended to support per-outlet fee drill-down.

### Improvements to keep

- The current cards, responsive spacing, platform logos, sticky first table
  column, and accessible controls.
- Existing entity and channel filters.
- Exact-decimal calculations and tabular financial numbers.
- Explicit `Unavailable`, `Not supplied`, and `Partial coverage` states.
- The same account/month-aware loading and cache behaviour used by the live
  overview.

### Improvements to remove or gate

| Current feature | Decision |
| --- | --- |
| Horizontal platform-cost comparison chart | Remove. It duplicates the matrix and composition cards. |
| Always-visible reconciliation-gap card | Render only if platform statement and bank-settlement data are both available under an approved rule. |
| Hard-coded review assignment dialog | Remove until it creates a real task through the application’s Tasks workflow. |
| May-specific narrative | Replace with selected-period and source-coverage language. |

## Financial logic

### 1. One shared data path

Do not fetch a second set of live rows from the Section 2 component.
`ImportedSalesSection.tsx` remains the single authenticated fetcher of joined
sales rows, imports, and canonical outlets. It already controls month scoping,
account changes, cache invalidation, loading, refresh failures, and entity
filtering.

Pass the existing loaded rows and coverage metadata to a reusable Section 2
view-model/adapter. May supplies a static adapter; non-May supplies a live
adapter. Both render the same page structure.

### 2. Display states are financial states, not styling states

Every fee cell and KPI must carry one of these meanings:

| State | Display | Meaning |
| --- | --- | --- |
| Known value | `RM 1,234.56` | Every applicable imported input is explicitly numeric. |
| Explicit zero | `RM 0.00` | The source explicitly supplied an applicable zero. |
| Unknown | `Unavailable` | At least one applicable imported amount is `NULL`/unknown. |
| No source rows | `Not supplied` | No rows/source report exist for that source and period. |
| Partial coverage | value plus `Partial coverage` | Known value exists, but missing dates/outlets/documents mean it is not a complete month figure. |

Never use `0`, `?? 0`, or JavaScript floating point to fill an unknown value.
Use `src/lib/decimal.ts` and canonical decimal strings until final formatting.

### 3. Aggregation rules

- Filter by the selected reporting month and imported parent-import status.
- Apply the selected entity and channel filters before aggregation.
- Use only canonical mapped outlets in corporate totals.
- Do not silently map unmatched outlets or include sister-brand rows.
- Do not add POS sales to delivery-platform sales: POS is all-channel and would
  double count platform business.
- A Total column is a complete total only when every included applicable
  platform value is known and complete. Otherwise label it `Unavailable` or
  `Partial known total`, never simply `Total fees`.
- A fee-composition bar renders only for a platform with a complete known
  category total. Do not turn an unknown component into a zero-width segment.
- A parsed row that is intentionally skipped by a source rule is not a zero
  fee. Retain its reason in import diagnostics and reflect it in coverage.

### 4. Per-row rules

| Original row | Live rule today |
| --- | --- |
| Commission | Show only when an explicit, approved commission amount is stored. Grab and FoodPanda source sheets carry commission columns, but the current daily aggregate rows do not preserve them separately. |
| Commission rate | Show only when the commission numerator and its Finance-approved net-sales denominator are both known. |
| Advertising | Sum explicit `advertising_spend` values. For Grab, only Advertisement-category rows qualify. FoodPanda targeting fees require Finance classification; unknown is not zero. |
| Platform / service fees | Sum explicit `platform_fees` values, but label it combined deductions unless Finance confirms it is the original fee category. Do not populate Shopee from `Transaction Amount - Earnings`. |
| Payment gateway | Unavailable until a gateway-fee amount is imported. Apps order/payment method data is not gateway-fee evidence. |
| Adjustments / credits | Show only explicit signed adjustment/credit source values; negative credits remain negative and use the credited visual treatment. |

### 5. Platform-specific evidence

| Platform | Current permitted live display |
| --- | --- |
| Grab | Combined deductions for Payment rows and advertising for Advertisement rows when imported. The raw source has detailed fee columns, but they are not currently persisted as separate live fields. Adjustment rows require an approved signed mapping. |
| FoodPanda | Combined deductions from Restaurant Revenue less Payable Amount only for loaded Excel detail. Advertising remains unavailable until targeting/display fees are classified. The Excel-detail versus PDF-only invoice coverage must be disclosed. |
| Shopee | Fee rows and payout reconciliation unavailable. The importer must not treat the current `Transaction Amount - Earnings = 0` result as an explicit zero fee. |
| Apps | Fee rows and payout reconciliation unavailable. Delivery fee and Razerpay payment method are not gateway-fee evidence. |
| POS | Excluded from platform fee/reconciliation totals. It has no fee/settlement source in the current report. |

### 6. Reconciliation gate

Render the reconciliation panel only when all of these are true for the same
selected month, scope, and platform:

1. Finance has approved the reconciliation equation and date basis.
2. The required platform statement amounts are imported.
3. A separately sourced bank settlement/remittance amount is imported.
4. Component completeness permits a meaningful difference.

Until then, show a compact amber **Settlement reconciliation unavailable** note.
Do not calculate an open difference from unrelated sales totals or claim that a
source `payout` is bank-reconciled money.

### 7. Platform drill-down

The original requirement says that selecting a platform drills into outlet fees.
Implement the control in two stages:

- Stage A: selected tab filters/highlights the matrix and composition card.
- Stage B: add a per-outlet fee table only when each fee category can be
  sourced at outlet/day grain. Show `Unavailable` rather than a fabricated
  outlet allocation.

## Required data work before the full original matrix can be live

The current six-table schema stores only daily aggregate `platform_fees`,
`advertising_spend`, and `payout`. It cannot reconstruct the original’s full
five-category matrix for all platforms.

Before adding new persisted fee categories or a fee-line table:

1. Finance defines the canonical fee taxonomy and aggregation rules.
2. Finance confirms Grab category/column classification, including adjustments,
   commission taxes, and settlement-date versus order-date treatment.
3. Finance confirms FoodPanda treatment of commission, SST on commission,
   targeting fees, vendor subsidies, and payable amounts.
4. Decide how FoodPanda PDF-only daily invoices are ingested without
   duplicating Excel-detail invoices, including their outlet/date coverage.
5. Obtain Shopee settlement/fee, Razerpay gateway/remittance, POS acquirer,
   and bank settlement reports.
6. Codex approves any schema, migration, RLS, or intake-contract change before
   implementation.

## UI/UX scope and craft standard

### Design intent

This is a working finance surface, not a marketing page. It should feel calm,
dense, and deliberate: a Finance user can identify a material fee, its
platform, coverage state, and evidence limitation in one scan.

The Section 2 page must use the project design tokens in `DESIGN.md` and the
existing dashboard shell. The applicable typeface is **Geist**, as configured
in `src/index.css`; do not introduce Inter, IBM Plex, a display font, or a
second font family.

### Visual hierarchy

1. **Section heading**: 20–24px, bold/black, tight tracking; the subtitle is
   14px muted text. Do not use oversized hero typography.
2. **KPI cards**: the only large financial figures. Use 24–28px black,
   tabular numerals. Card labels are 11px uppercase with restrained tracking.
3. **Platform tabs**: compact 36–40px controls immediately above the matrix.
   The active state must be clear by surface/ink change, not a glow or a
   platform-colour flood.
4. **Fee matrix**: the primary working surface. It must appear above the
   composition cards, warnings, and footnotes.
5. **Composition cards**: supporting explanation only; do not compete with
   the matrix or use oversized charts.
6. **Coverage/evidence note**: concise and visually subordinate, except when
   it blocks an interpretation, in which case use the amber warning treatment.

### Colour rules

- Canvas: `#F8FAFC`; surfaces: white; borders: `#E2E8F0`; primary ink:
  `#0B192C`; muted text: `#64748B`; brand active state: `#C8102E`.
- Use platform colours only for platform logos, tab markers, table headers,
  and small composition segments. They are identifiers, not full-card
  backgrounds.
- Do not use generic purple/violet cards or gradients. Advertising is a fee
  category, not a reason to introduce a new visual theme.
- Use emerald only for a verified positive/credit value, amber for pending or
  partial evidence, and rose only for errors/missing critical input.
- Status colour never carries meaning alone: pair it with text such as
  `Partial coverage` or `Unavailable`.

### Layout and density

- Desktop content uses the dashboard’s existing max-width and a 20px vertical
  rhythm between major blocks; related controls use 8–12px gaps.
- KPI cards are a three-column grid from `sm` upward and one column on narrow
  screens. Do not create nested card grids or decorative bento layouts.
- The matrix is one bordered table surface with a 640px minimum width. Its
  fee-type column remains sticky; numeric columns are right-aligned with
  `tabular-nums`.
- Composition cards use two columns at large widths and one column below that.
  Each card contains a label, one total, and one short composition bar—no
  extra metric tiles.
- Use 10–12px radii and restrained `shadow-xs`; avoid heavy shadows, thick
  outlines, glass effects, gradients, or decorative blobs.

### Table treatment

- Preserve the original row order. Do not reorder fee rows by amount because
  Finance compares categories month to month.
- Keep the commission-rate row visually subordinate: smaller, muted, indented,
  and only rendered when the rate is valid.
- Totals get a single top divider and a quiet slate surface. A partial total
  must say `Partial known total`; it cannot look like a final corporate total.
- Numeric zero, unavailable, partial, and credit values must have visibly
  distinct text treatment while retaining the same cell alignment.
- Do not add row icons, badges in every cell, coloured heatmaps, sparklines,
  or progress rings.

### States and interactions

- Initial load: preserve the dashboard’s scoped loading behaviour; never
  replace valid same-scope figures with a full-page spinner on refresh.
- Refresh error: keep valid same-scope figures and add one compact amber
  refresh notice.
- Empty month: retain the Section 2 heading and explain that no imported fee
  source exists for the selected period; do not render zero KPI cards.
- Partial source: retain the matrix and cards, add a single platform-level
  `Partial coverage` label, and state the observed import range/count in a
  compact disclosure. Do not use a noisy alert for every unavailable cell.
- Unmapped/sister-brand source rows: exclude them from corporate totals and
  state their count in the coverage disclosure; do not hide the exclusion.
- Platform selection filters/highlights the same matrix and composition card
  set without changing the selected reporting month or entity scope.
- Tooltips are reserved for concise source/coverage definitions. Do not hide
  essential financial meaning behind hover-only affordances.
- Per-outlet drill-down remains a future, explicit disclosure below the matrix;
  it does not replace the corporate matrix.

### Responsive and accessibility requirements

- Test at 320px, 768px, and desktop widths. The page must not cause viewport
  horizontal scrolling; only the matrix may scroll horizontally inside its
  labelled container.
- All controls have keyboard focus, visible focus rings, and `aria-pressed`
  state for platform tabs.
- Text and controls meet WCAG AA contrast. Do not rely on low-contrast grey
  labels for an actionable state.
- Touch targets are at least 40px high. Platform logos are decorative when the
  adjacent text names the platform.
- Respect reduced-motion preferences. Any transition is limited to subtle
  opacity/surface changes; no animated chart entrance is required.

## Kimi K3 redesign brief

Kimi K3 owns visual/component redesign only. It should:

- Build one reusable May-style Section 2 layout for static and live adapters.
- Preserve the target page order and matrix-first finance hierarchy.
- Apply every UI/UX scope rule above using `PlatformLogo`,
  `platformColors.ts`, Geist, and the shared UI primitives.
- Design the page as a quiet, compact financial workspace—not a generic
  analytics dashboard or a marketing landing page.
- Remove the duplicate cost chart and demo-only assignment dialog.
- Keep reconciliation as a conditional panel, never a permanent fabricated
  calculation.

Kimi K3 must not:

- edit SQL, RLS, migrations, or Supabase configuration;
- alter parser money semantics;
- map unknown values to zero;
- derive Shopee/App/POS fee categories from unrelated sales fields;
- import May demo figures into live periods.

## Implementation sequence

1. Define TypeScript view-model types for fee cells, coverage, platform totals,
   and the selected tab.
2. Build a May static adapter from `COMMISSION_FEES_SUMMARY`.
3. Extend `importedFees.ts` into a pure live adapter with the financial states
   and coverage metadata above. Correct its Shopee handling so the current
   zero-difference derivation is represented as unavailable, not RM0.
4. Replace separate May/non-May layouts with one reusable Section 2 view.
5. Implement the original matrix, cards, legend, and period-aware notes.
6. Gate unsupported cells and reconciliation through the defined logic.
7. Add Stage A tab behaviour; defer Stage B outlet detail until sourced.
8. Add tests and browser acceptance before enabling the view for live imports.

## Tests and acceptance

Unit tests must prove:

- exact decimal sums;
- explicit zero is distinct from `NULL`;
- no rows is distinct from unknown fields;
- partial coverage cannot produce a completed corporate total;
- entity/channel filters are applied before totals;
- credits remain signed;
- Shopee, Apps, and POS cannot render an invented fee/payout;
- May values never appear in a non-May period.

Browser acceptance must verify:

- May retains its demo values and May label.
- A live month has the same layout but live/partial/unavailable states.
- Switching platform, entity, month, and account never leaks a prior scope.
- Matrix scroll/sticky column and cards remain usable at mobile width.
- Reconciliation is absent unless its evidence gate passes.

Run before handoff completion:

```powershell
npm run lint
npm test
npm run build
```
