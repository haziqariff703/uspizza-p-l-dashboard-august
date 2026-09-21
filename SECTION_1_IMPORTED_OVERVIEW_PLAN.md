# Section 1 — imported-data implementation plan

**Audience:** DeepSeek implementation handoff  
**Scope:** Section 1 (Overview) only. Replace the current partial imported-data path with a reliable view of the active simple Supabase schema. Do not change SQL, RLS, migrations, Storage policies, or the May 2026 demo.

## Outcome

For every non-demo reporting month, Section 1 must render only data derived from that month’s successful imported daily sales data. It must support the All / MY US Pizza / Sabah entity scopes, preserve `NULL` as unavailable, and never combine POS all-channel figures with channel reports.

May 2026 remains the existing explicitly labelled static demo. The live path applies to June–December 2026 (and future months added to the selector).

## Current database contract (17 September 2026)

Read these before editing:

1. `IMPLEMENTATION_CHECKLIST.md`, especially application work item 4.
2. `supabase/SIMPLE_SCHEMA.md`.
3. `AGENTS.md`.

The active tables are `outlets`, `outlet_aliases`, `sales_imports`, `sales_daily`, `purchases_imports`, and `purchases_daily`.

For this task, the relevant relationships are:

```
sales_imports (reporting_month, source, status)
       1 ──────── * sales_daily (sales_import_id, outlet_id, sales_date, money fields)
outlets (id, name, code, entity, status)
       1 ──────── * sales_daily
```

- Filter the parent import by `reporting_month = YYYY-MM-01`.
- Only `sales_imports.status = 'imported'` contributes figures. Draft and failed imports can be shown as an informational coverage/status state, but must not contribute money or outlet counts.
- Sources are `pos`, `grab`, `foodpanda`, `shopee`, and `apps`.
- Money columns are nullable exact numerics: `gross_sales`, `discount`, `net_sales`, `tax`, `service_charge`, `platform_fees`, `advertising_spend`, `payout`. `NULL` means unknown, never RM0.
- `sales_daily` has no `reporting_month`, `organization_id`, `is_current`, or publication fields. Month and source come from `sales_imports`.
- Read access is shared by authenticated users. Clear in-memory data on sign-out or account change so an unauthenticated state never retains figures.

## Important accounting rules

1. **POS is the corporate all-channel basis.** Section 1 headline sales metrics (`gross`, `discount`, `net`, `service charge`, `tax`) must be calculated from `pos` rows only. Do not add Grab, FoodPanda, Shopee, or Apps rows to POS: that double counts orders.
2. **Platform reports are supplementary.** They may populate a platform column only when their field has an unambiguous source meaning. Do not invent a POS-only platform split from all-channel POS data.
3. **Unknown propagates.** If any included row for a metric is `NULL`, the aggregate for that metric is `null` / “Unavailable”; do not coerce it to zero.
4. **No invented settlement or fees.** Derive a platform settlement only from known `payout`; derive `commissionAndFees` only when both the appropriate collected basis and payout are known. `platform_fees` and `advertising_spend` are not a validated substitute for complete settlement reconciliation.
5. **Entity scope comes from `outlets.entity`.** Use canonical joined outlets. Do not reintroduce localStorage mappings or guessed entity membership.
6. **Outlets without a canonical join remain visible as a data-quality gap.** Do not silently drop or classify them. This should be exceptional because `sales_daily.outlet_id` is required; handle a missing joined record defensively.

## Files to change

| File | Required work |
| --- | --- |
| `src/components/SalesDashboard/ImportedSalesSection.tsx` | Make the live Section 1 query explicitly filter imported parent records, include all fields needed for aggregation, and pass a complete import-derived model to `OverviewPage`. Preserve paging, cancellation guards, same-month stale-data behavior, and the sign-in gate. |
| `src/data/importedOverview.ts` | Define the imported row/model types and aggregate live rows exactly according to the rules above. Use the joined outlet identity/entity; remove dependency on legacy local outlet mapping fallback for live rows. |
| `src/pages/overview/OverviewPage.tsx` | Consume the imported model without falling back to May sample figures for a live month. Ensure unavailable values are rendered safely and every label says imported coverage where appropriate. |
| `src/data/importedOverview.test.ts` | Update/add focused aggregation and rendering tests for the new contract. |

Avoid unrelated changes to Sections 2–7, `original.html`, migrations, and the old organization/review code unless a compile error requires removing an obsolete import.

## Implementation steps

### 1. Make the live query authoritative

In `ImportedSalesSection.tsx`:

- Query `sales_daily` joined with `sales_imports!inner` and `outlets`.
- Select every Section 1 input: `gross_sales`, `discount`, `net_sales`, `tax`, `service_charge`, `platform_fees`, `advertising_spend`, `payout`, `record_count`, `sales_date`, `outlet_id`, `outlets(name, code, entity)`, and `sales_imports(reporting_month, source, status)`.
- Filter to the selected first-of-month date and `sales_imports.status = 'imported'`.
- Retain the existing `readAll` pagination; do not cap a month at the first 1,000 rows.
- Keep a separate import-status query for draft/failed visibility. Those records must not be fed to `importedOverview`.
- Do not query retired columns/tables or call review/publication RPCs.

### 2. Build a dedicated overview model

Adjust `ImportedRow` to carry all selected money fields and canonical outlet identity. Keep input money as `string | number | null`, converting only at the aggregation boundary.

Have `importedOverview(rows, entityScope)` return:

- `totals`: all headline and derivation fields expected by `OverviewPage`.
- `counts`: unique canonical POS outlet counts for `all`, `myUsPizza`, and `sabah`.
- `byPlatform`: all five platform entries, with `null` for unavailable/unsupported values rather than placeholder zeroes.
- `unmapped` / data-quality information suitable for the existing imported-coverage notice.

The aggregation must use exact-decimal-safe arithmetic where practical. The database returns `numeric` as strings; do not use floating-point accumulation for money if `src/lib/decimal.ts` already provides suitable helpers. Round only at the display boundary or to the database two-decimal precision.

### 3. Apply scope and aggregation rules

For a requested scope:

- Start with rows joined to canonical outlets whose entity belongs to that scope. `all` includes all canonical entities.
- Headline totals are over scoped `pos` rows only.
- `outletCount` is the unique `outlet_id` count over scoped `pos` rows.
- Calculate the relationships only when the underlying values are known:
  - `netSC = net + serviceCharge`
  - `netSCTax = netSC + tax`
  - `grossProfit`, `margin`, purchases, and net-after-commission remain unavailable in Section 1 until their sources are deliberately wired; never borrow the May demo values.
- For each non-POS platform, aggregate only rows whose `sales_imports.source` equals that platform. Populate a field only if its semantic meaning is confirmed by that source profile. Shopee Earnings, for example, must not be represented as bank settlement without confirmation.
- The POS platform column remains unavailable for platform-only fields because POS rows are all-channel. The matrix’s all-channel total should use headline POS totals and be labelled accordingly.

### 4. Make the presentation unambiguously live

In `OverviewPage.tsx`:

- When `imported` is provided, never call `aggregate(scopeOutlets(...))` for an entity card, tooltip, badge, total, or matrix fallback.
- Keep existing May rendering intact when `imported` is absent.
- Show “Unavailable” for unknown values; ensure charts do not calculate `NaN`, `Infinity`, or a percentage from unknown/zero denominators.
- Keep the existing statement that imported POS is all-channel and platform data is incomplete, updating it only if needed to match the final model.
- Preserve the entity toggle; counts and values must change together when scope changes.

### 5. Cache/loading behavior

Keep the current behavior, correcting it if the refactor regresses it:

- On a selected-month change, clear the previous month’s figures before the next load begins.
- On sign-out/account change, clear rows, import status, directory, and any derived model immediately; reject late responses from the old session.
- On a refresh failure for the same authenticated month, retain same-scope figures and show the small refresh error.
- On an initial load/new month/auth transition, do not show figures from another scope/month/account under the new heading.

## Acceptance tests

Add or update automated tests proving:

1. Imported POS rows calculate headline gross, discount, net, service charge, tax, `netSC`, and `netSCTax`.
2. Platform rows do not inflate headline POS totals.
3. An unknown money value makes the affected aggregate unavailable rather than RM0.
4. Entity scopes use canonical `outlets.entity` and POS outlet counts are unique by `outlet_id`.
5. Imported platform fields remain unavailable where settlement/semantics are not supported.
6. A live Section 1 render contains the selected live month and contains neither May demo figures nor `NaN`/`Infinity`.
7. A draft/failed import is excluded from monetary figures.

Run all checks before handoff:

```powershell
npm run lint
npm test
npm run build
```

Then manually verify in the browser while signed in:

1. Import a small POS file for a non-May month and confirm Section 1 figures match the stored `sales_daily` rows.
2. Change entity scope and reporting month; confirm prior figures disappear before the next month loads.
3. Sign out and confirm no imported values remain visible.
4. Add a failed/draft import and confirm it appears only as status/coverage, not in sales totals.

## Definition of done

Section 1 for non-May months is fully derived from `sales_imports` + `sales_daily` + `outlets` under the simple schema; it handles unknowns honestly, avoids POS/platform double counting, respects entity scope, and passes lint, tests, build, and the browser checks above. May remains a clearly separate static demo.
