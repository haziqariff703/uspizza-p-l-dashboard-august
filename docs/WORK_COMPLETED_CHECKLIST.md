# Work Completed Checklist

> Last updated: 2026-09-22 11:09:40 +08:00
> Companion to `docs/CALCULATION_LOGIC_IMPLEMENTATION_PLAN.md` (the calculation-logic migration).

Legend: ✅ Done · 🕓 Not yet · ❌ Cancelled

---

## ✅ Done

| # | Item | Date / Time |
|---|---|---|
| 1 | Schema — added `commission`, `payment_gateway_fee`, `adjustments`, `total_deductions` to `sales_daily` (nullable numeric(14,2)) | 2026-09-22 (applied to `S&L_Dashboard` `crxqjpvuuumeowkucaim`) |
| 2 | Parser — `MONEY_KEYS` + itemized commission/gateway/adjustments/totalDeductions; narrowed `platformFees`; §3 double-counting resolved | 2026-09-22 |
| 3 | Read model — `ImportedRow` + `MoneyKey` union include the four new fields | 2026-09-22 |
| 4 | Section 2 view-model — commission/gateway/adjustments cells + `commissionRate` (known only when numerator AND denominator known) | 2026-09-22 |
| 5 | `decimal.ts` — added `rateOf(numerator, denominator)` returning a 2-dp percentage, unknown on non-value/zero denominator | 2026-09-22 |
| 6 | Section 6 UI — `FeesSection` renders `Unavailable`/`Not supplied`, never `0.00%` | 2026-09-22 |
| 7 | Amended `docs/CALCULATION_LOGIC_IMPLEMENTATION_PLAN.md` Step 1 wording — any agent may run migration with user permission | 2026-09-22 |
| 8 | Section 4 (Sales by Outlet) — reworked live branch to consume `importedOverview.byOutlet` (exact decimal, null-safe, derived discount = gross − net) | 2026-09-22 |
| 9 | Deleted all Grab `sales_imports` + `sales_daily` rows (4 imports: 2 failed + 2 imported, 2,365 daily rows) | 2026-09-22 |
| 10 | Restored "Import Purchases / GRN" button + `GRNImportModal.tsx` (writes `grn_items`, upserts on `grn_no,item_code,branch_code`) | 2026-09-22 |
| 11 | Verification — `npm run lint` clean; `npm test` 165/165 pass | 2026-09-22 |

---

## 🕓 Not yet

| # | Item | Notes |
|---|---|---|
| 1 | Re-import Grab sheets | Old rows deleted; new parser (`PARSER_VERSION 2026-09-6`) must re-populate Grab commission/fee columns + clear the legacy-Grab guard |
| 2 | GRN import auto-resolves `outlet_id` | `GRNImportModal` writes `branch_code`/`branch_name` but does not map `outlet_id`; matching still done separately (260 MFM/sister-brand rows currently unmatched) |
| 3 | Section 4 regression test | `importedOverview.byOutlet` derivation has no dedicated unit test yet |
| 4 | Live browser acceptance | Drive the app in a browser (per CLAUDE.md release gate) |
| 5 | Supabase MCP tooling | MCP connected but exposes no SQL tools; SQL applied via `npx supabase db query --linked` instead |

---

## ❌ Cancelled

| # | Item | Notes |
|---|---|---|
| 1 | (none yet) | — |
