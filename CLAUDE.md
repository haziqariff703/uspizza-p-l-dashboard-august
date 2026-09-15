# CLAUDE.md — agent guide

US Pizza Malaysia corporate P&L dashboard. Finance/ops reconciliation for 46 corporate outlets (44 trading + 2 pre-opening), period May 2026.

## Two apps live in this repo — do not confuse them

| Path | What it is | Served at | Touchable? |
|---|---|---|---|
| `src/**` + `index.html` | The React/Vite app. **This is the code you edit, and the site root.** | `/` | **Yes** |
| `original.html` (160KB, one line) | Compiled capture of the deployed original Next.js dashboard. Not source. | `/original.html` | **No.** Reference only. |
| `docs/original-capture.html` | Byte-identical archive of the above. The source of truth for "what the original shows". | — | **No.** Read to port data/layout. |
| `public/_next/**` | The capture's compiled JS/CSS/fonts. Also where Geist woff2 lives. | static | No (except reading font paths) |

`npm run build` emits both entries (`vite.config.ts` → `rollupOptions.input`): `dist/index.html` (React app) and `dist/original.html` (capture). Deployments ship the React dashboard at the root.

## Commands

```bash
npm run dev      # vite, 127.0.0.1:3000 (strict port). App at /, capture at /original.html
npm run lint     # tsc --noEmit — run before declaring done
npm run build    # vite build → dist/index.html (app) + dist/original.html (capture)
```

## The 7 sections

The original has seven numbered sections; the rebuild mirrors them via `DashboardSection` in `src/types.ts`, switched from the navbar dropdown and rendered by `SalesDashboard.tsx`.

**The sections live in `src/pages/`, one folder each — they are pages, not components.** Everything they
import (the shell, `SectionHeading`, `ui/*`, `common/*`) stays in `src/components/`.

| # | `DashboardSection` id | File |
|---|---|---|
| 1 | `overview` | `src/pages/overview/OverviewPage.tsx` — entity split, 4 sales-basis metrics, purchases/GP/margin, per-platform net settlement derivation |
| 2 | `fees` | `src/pages/fees/CommissionFeesPage.tsx` — commission, advertising, platform fees, reconciliation gap |
| 3 | `coverage` | `src/pages/coverage/DataCoveragePage.tsx` — per-channel report status, upcoming outlets |
| 4 | `salesByOutlet` | `src/pages/sales-by-outlet/SalesByOutletPage.tsx` |
| 5 | `purchasesByOutlet` | `src/pages/purchases-by-outlet/PurchasesByOutletPage.tsx` |
| 6 | `purchasesToNetSales` | `src/pages/purchases-to-net-sales/PurchasesToNetSalesPage.tsx` |
| 7 | `plByOutlet` | `src/pages/pl-by-outlet/PLByOutletPage.tsx` |

A page sits two folders below `src/`, exactly like the old `components/SalesDashboard/` location, so
`../../data/*`, `../../types`, `../../copy` etc. resolve unchanged; reach shared UI via
`../../components/ui/*`.

`src/components/SalesDashboard/` keeps the non-section files: `SalesDashboard.tsx` (the shell that
switches pages and owns the reporting-month selector), `SectionHeading.tsx` (shared by pages 2 and 3),
plus `SalesImportModal.tsx`, `ImportedSalesSection.tsx` and `AuthControl.tsx`. Sections only render when
the reporting month is May 2026; other months show `ImportedSalesSection` instead.

Two extra modules exist outside the dashboard (`currentTab` in `App.tsx`): Tasks (kanban/table + modals) and Full Matrix View. Leave them alone unless asked.

## Layout shell

`TopBar.tsx` is the whole navigation — there is no sidebar (`AppSidebar.tsx` was deleted). It owns: brand, module tabs, the 7-section dropdown, outlet/platform search (jumps to section 7), entity + channel filters, live sync, Lark alert, new task. Preserve this shell when editing sections.

## Data

`src/data/outletData.ts` — all figures. No API, no fetch.

- `ENTITY_TOTALS` — group totals, plus `myUsPizza` (42 outlets) / `sabah` (2)
- `PLATFORM_SETTLEMENTS` — per-platform gross → discount → SC → SST → fees → net settlement
- `COMMISSION_FEES_SUMMARY` — fee itemization per platform + totals
- `INITIAL_OUTLETS` — 21 active + 2 upcoming, full `OutletFinancialData` shape (platform splits, channel status)
- `PL_BY_OUTLET` — all 44 trading outlets, but only name/code/entity/net/purchases/GP/margin (transcribed from the capture)
- `PLATFORM_DETAIL_BY_OUTLET` — platform splits for 13 outlets

Known inconsistencies, **intentionally retained** (see `ORIGINAL-BASELINE.md`): 46 vs 44 outlet counts; `PL_BY_OUTLET` tags Bundusan + Inanam as Sabah (matches the capture) while `INITIAL_OUTLETS` tags Vivacity Kuching instead. Don't silently reconcile them.

## Conventions

- **Never invent figures.** If data is missing for some outlets, render what exists and label the gap in the UI (amber note), as sections 4 and 6 do.
- Brand palette in `DESIGN.md`: red `#C8102E`, navy `#0B192C`, canvas `#F8FAFC`, hairline `#E2E8F0`, muted `#64748B`.
- Platform colors come from `src/platformColors.ts` — one source, don't redeclare per component. Grab `#00B14F`, FoodPanda `#D70F64`, Shopee `#EE4D2D`, Apps `#6366F1`, POS `#64748B`.
- Semantic: emerald = reconciled/positive, amber = pending/warning, rose = missing/negative, sky = informational.
- Icons: `iconoir-react` only, 14–16px, 1.5px stroke, on controls only — not decorating every value. Platform marks go through `PlatformLogo`.
- Type: Geist, self-hosted via `@font-face` in `src/index.css` pointing at `public/_next/static/media/*.woff2`. Financial figures use `tabular-nums`.
- Copy lives in `src/copy.ts`. Short, active voice; keep domain terms (GRN, Lark, Ping, Reconciliation).
- Charts: `recharts`. Vertical-layout bar lists for per-outlet ranking; give the wrapper an explicit pixel height or `ResponsiveContainer` measures to zero.
- Tailwind v4 via `@tailwindcss/vite` — no config file, theme tokens live in `src/index.css` `@theme`.

## Gotchas

- Windows + `&` in the repo path: npm scripts invoke `node ./node_modules/vite/bin/vite.js` directly. Keep it that way.
- `recharts` bars can render mid-measurement when you click through sections fast in automation. Wait a beat before screenshotting; it is not a bug.
- No test suite. Verification = `npm run lint` + drive the app in a browser.
