# AGENTS.md — agent guide

US Pizza Malaysia corporate P&L dashboard. Finance/ops reconciliation for 46 corporate outlets (44 trading + 2 pre-opening), period May 2026.

## AI team architecture

Use these roles when assigning work or coordinating agent sessions:

- **ChatGPT Plus + Codex — planner / architect.** Own scope and requirements, research, system/database architecture, GitHub/Supabase/Vercel workflows, and review of Claude's implementation. Codex owns migration SQL and database verification for this project. Use XLSX/data reasoning when useful.
- **Claude Pro + Claude Code — main developer.** Own primary application implementation, complex debugging, refactoring, SQL/business-logic proposals, difficult calculations, and codebase understanding. Coordinate SQL changes with Codex; do not independently apply migrations or change database security.
- **OpenCode + GLM — low-cost worker.** Use for bounded boilerplate, repetitive coding, CRUD, simple components/APIs, tests, documentation, and backup implementation work when conserving premium usage.

Keep ownership explicit for each task. Planner/architect defines and reviews; main developer implements; low-cost worker handles bounded tasks. SQL and database release gates below remain authoritative. All agents must follow this file and the contract documents; `CLAUDE.md` was consolidated here and removed.

## Mandatory SQL / application handoff — 16 September 2026

**Codex owns migration SQL and database verification. Claude Code is the main application
developer; Codex plans and reviews application changes. Do not apply/rewrite SQL or
loosen grants/RLS to restore old code without coordinating with Codex.** Read in order:

1. IMPLEMENTATION_CHECKLIST.md section 11 (supersedes historical sprint notes).
2. supabase/README.md (migration order, ownership manifest and release gates).
3. supabase/APP_CONTRACT.md (exact payload/RPC contract and implementation order).
4. IMPLEMENTATION_GUIDE.md (business goals, not proof of deployed functionality).

SQL hardening is **applied and SQL-fixture-tested on the user-authorized testing
project S&L_Dashboard (`crxqjpvuuumeowkucaim`)**. All seven files executed and reran;
the final fixture suite passed after runtime/advisor fixes. This is NOT production
or browser acceptance. The old import flow is now incompatible: implement the
APP_CONTRACT before enabling imports. Contract version: `2026-09-16-v1`.

The 5 existing imports and 5,849 daily rows remain stored, backed up privately in
`migration_backup_20260916`, but are non-current/unapproved and intentionally hidden
from published figures. Two separate test organizations preserve uploader isolation.
Do not mark legacy data current; re-import through review/approval. Configure open
periods, canonical outlets and independent reviewer/approver accounts for acceptance.

**Intake is now implemented against contract `2026-09-16-v1`** — see checklist section 12.
`useOrganizationScope` owns tenant selection and cache identity; `SalesImportModal` follows the
contract order (import record, then upload, then issues, then staging, then `submit_sales_import`)
and writes no daily totals. Money is exact decimal strings via `src/lib/decimal.ts`. Still
outstanding from the list below: the review/publication UI, database-backed outlet aliases, live
all-month figures, fees/reconciliation, revisions/history, exports and CI.

Codex's next requirements:

- Explicit organization selection and organization_id filters on ALL queries.
- Clear figures/caches on sign-out, account/org changes or lost membership; discard
  late responses. Keep stale figures only on ordinary refresh failure in the SAME
  authorized user/org/month. No previous month data under a new heading.
- Loading UX: keep same-scope cached figures when revisiting a section. Use initial
  loading only when no authorized cache exists; ordinary/manual refresh shows a
  small refresh indicator without replacing figures. Org/month/account changes
  must load their own data, never reuse another scope to avoid a loading message.
- Create import FIRST with client UUID, open period and organization_id/import_id/filename
  path; THEN upload without upsert. Exact decimals, stable source BUSINESS keys,
  complete raw-row staging and explicit null for unknown applicable amounts.
- No browser INSERT to sales_daily/fees/ledger/audit; no direct published/current/
  approval fields. Use submit_sales_import after complete staging.
- Independent reviewer RPC actions: approve/reject row groups, assign outlets,
  resolve issues with notes, reject whole imports. Only independent approver/admin
  calls publish_sales_import. No uploader self-review/publication, even if admin.
- Period changes use set_reporting_period_status, not table UPDATE.
- Move outlet/alias authority from localStorage to Supabase; Finance approves entity
  mappings, money definitions and exclusion rules. Do not silently confirm local IDs.
- Wire all months to current approved data; separate labelled May/demo samples.
  Itemized fees, reconciliation and expected coverage need confirmed semantics.
- Handle RPC errors/retries; submitted is not published. Explicit supersedes_import_id
  revisions preserve history. Add unit/CI checks and real scratch browser acceptance.
- Defer AI. Do not commit unrelated dirty-worktree changes or edit original capture.

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
npm test         # node --test via tsx — import parser + overview aggregation
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
plus `SalesImportModal.tsx`, `ImportedSalesSection.tsx` and `AuthControl.tsx`. May uses
static demo pages. Other months use ImportedSalesSection with a live shared Overview
and basic sales/coverage lists; fees and authoritative coverage remain incomplete.

Two extra modules exist outside the dashboard (`currentTab` in `App.tsx`): Tasks (kanban/table + modals) and Full Matrix View. Leave them alone unless asked.

## Layout shell

`TopBar.tsx` is the whole navigation — there is no sidebar (`AppSidebar.tsx` was deleted). It owns: brand, module tabs, the 7-section dropdown, outlet/platform search (jumps to section 7), entity + channel filters, live sync, Lark alert, new task. Preserve this shell when editing sections.

## Data

`src/data/outletData.ts` — static May/demo figures. Live imported data is fetched
in ImportedSalesSection.tsx and aggregated by src/data/importedOverview.ts.

- `ENTITY_TOTALS` — group totals, plus `myUsPizza` (42 outlets) / `sabah` (2)
- `PLATFORM_SETTLEMENTS` — per-platform gross → discount → SC → SST → fees → net settlement
- `COMMISSION_FEES_SUMMARY` — fee itemization per platform + totals
- `INITIAL_OUTLETS` — 21 active + 2 upcoming, full `OutletFinancialData` shape (platform splits, channel status)
- `PL_BY_OUTLET` — all 44 trading outlets, but only name/code/entity/net/purchases/GP/margin (transcribed from the capture)
- `PLATFORM_DETAIL_BY_OUTLET` — platform splits for 13 outlets

Known original-capture inconsistencies, **intentionally retained in demo mode**:
46 vs 44 outlet counts; PL_BY_OUTLET tags Bundusan + Inanam as Sabah while
INITIAL_OUTLETS tags Vivacity Kuching instead. Finance owns the production master.

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
- Verification = `npm run lint` + `npm test` + drive the app in a browser. Tests cover the import
  parser and the imported-sales aggregation only (`src/**/*.test.ts`); the May sections have none.
