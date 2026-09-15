# August 2026 data wiring

Branch: `feature/data-wire-in-august`

## Handoff for the next agent

This repository is a React/Vite dashboard. The user wants to replace the sales dashboard's existing May/mock financial figures with August 2026 figures from `datasource/`. A partner has set up Supabase and plans to use document-import functions plus database business logic. The ERD/database structure is still pending. Do not create migrations, tables, policies, or frontend Supabase queries until that ERD is available. The existing sales dashboard headline labels and layout should be retained, but populated from August sources.

Current Git state when this handoff was written:

- Current branch: `feature/data-wire-in-august`.
- User-owned, pre-existing unstaged edits are present in:
  - `src/components/SalesDashboard/CommissionFeesSection.tsx`
  - `src/components/SalesDashboard/DataCoverageSection.tsx`
  - `src/components/SalesDashboard/OverviewSection.tsx`
  - `src/copy.ts`
- Preserve those edits. This checklist is newly added by this data-wiring work.

### User decisions already made

- Wire the sales dashboard only. Do not change Tasks, comments, activity feed, or the outlet matrix.
- Use only supplied August sources. Ask the user if a missing metric requires another source.
- Keep the dashboard's current headline definitions, but populate them with August numbers.
- Shopee: include only outlets whose store name belongs to US Pizza. Exclude sister brands, including Manhattan FISH MARKET.
- Outlet names that cannot be mapped confidently must be listed as issues and must not be guessed or silently omitted.
- The dashboard should avoid double counting. The POS report is described as all-channel sales, so platform sales must not simply be added onto the POS total.

### Confirmed source inventory and usable fields

| Source | File(s) | What it contains | Import guidance |
| --- | --- | --- | --- |
| Grab | `datasource/GRAB Aug sales.xlsx` | 30,309 data rows. `Store Name`, `Created On`, `Type`, `Category`, `Status`, `Net Sales`, `Net MDR`, `Tax on MDR`, `Grab Fee`, advertising and adjustment fields. | Filter to US Pizza outlets and August dates. Separate order sales from ad/fee/adjustment rows by source fields. |
| Foodpanda | `datasource/FOODPANDA/*.xlsx` and PDFs | 459 Excel workbooks at hand plus 526 PDFs. Excel `Appendix A` has `Invoice Number`, `Outlet Name`, `Order Code`, `Order Date`, `Restaurant Revenue`, commissions, SST and `Payable Amount`. | Use Excel as transaction detail and PDFs as invoice/reconciliation evidence. Do not count a PDF and Excel record twice. |
| Shopee | `datasource/SHOPEE/Shopee Aug Sales.xlsx` | 17,224 data rows. `Store Name`, `Complete Time`, `Order Status`, discounts, `Transaction Amount`, and `Earnings`. | Include US Pizza only. Exclude Manhattan FISH MARKET and every other non-US Pizza brand. Do not use the July workbooks for August values. |
| App | `datasource/APPS AUG ORDER LIST.xlsx` | 6,882 data rows. `Outlet Name`, `Status`, `Grand Total (RM)`, payment status, delivery method, and `Order Date`. | Aggregate only. Source contains customer names, phones and email addresses, which must never appear in browser assets. |
| POS | `datasource/POS SALES/*.xlsx` | Five August Sales Details reports. The reports have date headings, outlet headings such as `001-US Pizza Kelana Jaya`, item rows, and outlet subtotal rows. | Track current outlet/date context while reading item rows. Sum either items or subtotals, never both. Treat as all-channel total until reconciled. |
| Control summary | `datasource/August 2026 Platform Sales Summary.xlsx` | Platform, daily, outlet, category and ad-spend summaries; Notes explains method and gaps. | Use as a reconciliation control only after applying the US Pizza-only rule and matching financial definitions. |

### Source quirks and known limitations

- The Lark-exported App, Grab, Shopee, and summary workbooks may report an incorrect worksheet dimension of `A1` in read-only readers. Open them normally or ignore the declared dimension; the data is present.
- The summary's `Customer-paid sales` is after discounts **including SST**: Grab `Net Sales`, Foodpanda `Restaurant Revenue`, Shopee `Transaction Amount`, and App `Grand Total`. The existing dashboard's `Net Sales` currently excludes SST. Do not equate these figures without an explicit conversion/definition check.
- The summary includes sister brands under host outlets. It will differ from the required US Pizza-only result. Do not force a match.
- Summary notes say Shopee commission and App payment-gateway fees are absent from the supplied exports. Treat those fees and any resulting settlement values as unavailable, not zero.
- The summary cites 877 Foodpanda invoice workbooks, while the current folder has 459 `.xlsx` workbooks with filename dates from 2026-08-01 through 2026-08-26. Full date/invoice/PDF coverage must be reviewed and reported.
- The sampled POS inventory-cost and standard-cost fields were zero. No separate August purchases/GRN source has been identified. Purchases, gross profit and gross margin cannot be presented as verified August figures from the current sources.
- Some platform outlets appear outside the HQ POS export. Preserve them in coverage/issues rather than dropping them.

### Recommended implementation sequence

1. Inspect all source files and build a deterministic outlet master plus explicit alias map. Emit an issues report for unmatched or ambiguous names.
2. Create a local import script that produces aggregate August data only. Keep raw source paths and row references in a local audit artifact; do not ship raw transactions to the browser.
3. Use null/`unavailable` for unsupported purchases, gross profit, gross margin, Shopee fees and App gateway fees. Update affected UI sections to explain the source gap.
4. Wire every sales-dashboard section that has supported August data. Update reporting text to August 2026 and maintain current layout/filter behavior.
5. Reconcile each platform's filtered aggregates to the summary where comparable; document expected differences from SST basis, brand filtering and missing fees.
6. Run `npm run lint` and `npm run build`, then review all seven sales sections in a browser.

## Agreed scope

- [x] Wire the sales dashboard only. Tasks, comments, activity and matrix are outside this change.
- [x] Preserve existing headline labels and financial definitions.
- [x] Use the supplied August sources. Do not carry forward May values.
- [x] Include US Pizza Shopee outlets only; exclude other brands.
- [x] Flag unmatched outlet names for review rather than guessing or silently excluding them.
- [x] Create the requested branch and preserve existing uncommitted changes.
- [ ] Review the partner's Supabase ERD and agree the raw-document, import, transaction, aggregate, and issue-record mappings.
- [ ] Use Supabase Storage for original documents and Postgres for extracted, clean financial records after the ERD is approved.

## Source review

- [x] Confirm Grab, App and platform summary Excel exports are present.
- [x] Confirm Shopee contains data: 17,224 data rows before filtering.
- [x] Identify incorrect worksheet dimension metadata in Lark exports. Read actual worksheet content rather than trusting the declared A1 range.
- [x] Identify POS date and outlet section headings; detail rows and subtotals must not both be summed.
- [x] Read summary methodology and limitations.
- [ ] Finish all-file inspection, source hashes, period coverage and duplicate checks.
- [ ] Review Foodpanda PDF appendices as possible sources for missing Excel detail.
- [ ] Find an August purchases/GRN source or explicitly show purchases and dependent profit figures as unavailable.

### Findings requiring care

1. The summary's Notes sheet uses customer-paid sales **including SST**, while existing dashboard net sales excludes SST. Match the actual definitions before comparing totals.
2. The summary includes sister brands under host outlets. US Pizza-only totals will legitimately differ. The summary is a comparison source, not an instruction to force matching totals.
3. The summary cites 877 Foodpanda workbooks. The current folder contains 459, with filename dates from August 1 to August 26. This is a completeness flag; document dates and PDF coverage still need checking.
4. Summary notes explicitly say Shopee commissions and App gateway fees are absent. Earnings cannot be labelled verified bank settlement; unknown fees are not zero.
5. The first POS workbook contains 50,000 item rows, with zero inventory and standard cost throughout that sample. POS inventory cost is also conceptually different from purchases/GRN. Do not use it as purchases without evidence.
6. POS totals are described as all-channel sales. Do not add platform sales to them. Any residual calculation requires matched outlets, dates and tax basis; negative residuals must be flagged, not clamped.
7. Some platform outlets are outside the POS export. Their sales must remain visible as separate coverage gaps, not silently disappear.
8. App exports contain customer contact information. Generated dashboard data should contain outlet aggregates only.

## Import and mapping

- [ ] Establish outlet master from source identifiers and names, with explicit aliases.
- [ ] Flag ambiguous outlet matches and entity assignments.
- [ ] Define per-platform date, status, reversal and cancellation treatment from source evidence.
- [ ] Exclude July Shopee files from August sales; do not infer August fee rates from July.
- [ ] Retain source filename, sheet and row references in local audit results.
- [ ] Produce deterministic August aggregates and a separate issues report.
- [ ] Distinguish missing values from genuine zero throughout calculations.

## Dashboard wiring

- [ ] Overview: August sales bases, outlet/entity totals and supported fee figures.
- [ ] Fees: known charges plus clear unavailable fields.
- [ ] Coverage: actual file/date/outlet coverage, not mock completion statuses.
- [ ] Sales by outlet: August data and appropriate platform breakdowns.
- [ ] Purchases, purchases-to-sales and P&L: supplied purchase values or explicit unavailable state.
- [ ] Navbar outlet search and entity filters use August outlets within the sales module.
- [ ] Reporting date says August 2026.
- [ ] Empty and incomplete states explain the actual source gap.
- [ ] CSV export contains displayed August data.

## Verification

- [ ] Verify source sums independently and investigate summary differences.
- [ ] Test exclusion of sister brands, duplicated subtotal rows and non-August data.
- [ ] Test unmatched outlet flags and missing-value propagation.
- [ ] Confirm outlet/entity/channel filter totals agree with displayed rows.
- [ ] Confirm no unsupported purchase, tax, fee or settlement assumptions.
- [ ] Confirm no customer contact data is emitted in aggregate assets.
- [ ] Run TypeScript checks and production build.
- [ ] Review all seven sales sections in the browser.
- [ ] Update this checklist with results and remaining issues.
- [ ] Prepare Vercel deployment only after data review.

## Implementation phases

Gates the remaining unchecked items above into build order. Each phase blocks the next.

### Phase 1 — Outlet master & alias map — DONE, see `datasource/_audit/PHASE1-FINDINGS.md`
- [x] Build outlet master + alias map from all 5 sources (Import and mapping #1) — `scripts/data-import/phase1_outlet_master.py`, outputs in `datasource/_audit/` (gitignored)
- [x] Flag ambiguous outlet/entity matches, no guessing (Import and mapping #2) — 87 distinct unmatched locations, 4 likely-alias + 83 new-outlet candidates, none auto-applied
- [x] Finish all-file inspection: hashes, period coverage, dupes (Source review) — 997 files hashed, 0 duplicate content
- [x] Review Foodpanda PDF appendices vs Excel (Source review) — 877 = 459 xlsx + 418 pdf-only (matches summary exactly); 108 invoices have both

**Blocking finding — read before Phase 2:** the 46-outlet master in `src/data/outletData.ts` is a
May snapshot and does not cover August. 83 distinct location strings across Grab/Shopee/App/
Foodpanda/**POS** have no confident match to it (e.g. Melawati, Jalan Ipoh, Seksyen 13 Shah Alam,
Vivacity Megamall, Bangi, Landmark, Kulim, Rawang, Senadin Miri Sarawak — full list in
`datasource/_audit/outlet_alias_review.json`). POS's own outlet headings already exceed the
master, so this isn't just "platform sales outside the POS export." Also confirmed a matcher bug
worth carrying into Phase 2: sister-brand rows (Manhattan FISH MARKET) matched our own outlet
codes MY-051/MY-081 by location name alone (Taman Connaught, Kota Damansara are shared host
locations) — Phase 2 must exclude by brand prefix before any location matching, never match on
location text alone.

### Phase 2 — Ingestion rules & audit trail
- [ ] Per-platform date/status/reversal/cancellation rules (Import and mapping #3)
- [ ] Exclude July Shopee files from August (Import and mapping #4)
- [ ] Retain filename/sheet/row refs in local audit output, not shipped to browser (Import and mapping #5)
- [ ] Strip customer PII from App source at aggregation, outlets only (Findings #8)

### Phase 3 — Aggregation, nulls, purchases gap
- [ ] Produce deterministic August aggregates + separate issues report (Import and mapping #6)
- [ ] Distinguish missing vs. genuine zero everywhere (Import and mapping #7)
- [ ] Confirm no August purchases/GRN source exists; mark purchases/GP/margin unavailable, not zero (Source review, Findings #5)
- [ ] Mark Shopee commission + App gateway fees unavailable, not zero (Findings #4)

### Phase 4 — Dashboard wiring
- [ ] Overview: sales bases, outlet/entity totals, supported fees (Dashboard wiring)
- [ ] Fees: known charges + explicit unavailable fields (Dashboard wiring)
- [ ] Coverage: real file/date/outlet coverage, not mock statuses (Dashboard wiring)
- [ ] Sales by outlet + platform breakdowns (Dashboard wiring)
- [ ] Purchases / purchases-to-sales / P&L: supplied values or unavailable state (Dashboard wiring)
- [ ] Navbar search/entity filters on August outlet set (Dashboard wiring)
- [ ] Reporting date → August 2026; empty states explain the real gap; CSV export matches displayed data (Dashboard wiring)

### Phase 5 — Reconciliation
- [ ] Match SST basis before comparing to summary's customer-paid sales (Findings #1)
- [ ] Expect variance vs. summary from sister-brand inclusion; don't force-match (Findings #2)
- [ ] Resolve/document 877 vs 459 Foodpanda workbook gap (Findings #3)
- [ ] POS = all-channel; no platform-on-POS double count; negative residuals flagged not clamped (Findings #6)
- [ ] Keep platform outlets outside POS export visible as coverage gaps (Findings #7)
- [ ] Verify source sums independently, investigate summary diffs (Verification)

### Phase 6 — Test, build, ship
- [ ] Test sister-brand exclusion, subtotal dedup, non-August exclusion (Verification)
- [ ] Test unmatched-outlet flags + missing-value propagation (Verification)
- [ ] Confirm filter totals agree with displayed rows (Verification)
- [ ] Confirm no unsupported purchase/tax/fee/settlement assumptions (Verification)
- [ ] Confirm no customer PII in shipped assets (Verification)
- [ ] `npm run lint` + `npm run build` (Verification)
- [ ] Review all 7 sales sections in browser (Verification)
- [ ] Update this checklist with results/remaining issues (Verification)
- [ ] Vercel deploy prep only after data review (Verification)

## Status

Requirements and preliminary source review are complete. Implementation and full reconciliation are pending. No financial data has been imported into the dashboard yet.
