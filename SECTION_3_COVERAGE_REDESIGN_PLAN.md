# Section 3 — Data Coverage redesign/improvement plan

**Status — 21 September 2026: layout parity is built and verified.**
`CoverageMatrixLayout` now backs both months; `DataCoveragePage` renders
identically to before; `ImportedCoveragePage` replaces the three plain
`TableCard`s. `npm run lint` and all 157 tests pass. The one deferred item is
the import-exclusion panel — see "Remaining work" at the bottom for why.

**Audience:** implementation handoff (DeepSeek or Claude).
**Scope:** Section 3 (`coverage`) only. Give every reporting month — May demo
and every imported month — the **same page layout**: one shared, data-shape-
agnostic component, fed by two thin adapters. Do not touch Sections 1, 2,
4–7, SQL, migrations, or RLS.

**Design authority:** `DESIGN.md` at the project root is the token source.
Every color, weight, spacing and icon rule below cites an existing `DESIGN.md`
rule instead of inventing a new one.

## The actual goal

Right now there are two unrelated Section 3s wearing different clothes:

- May 2026: `src/pages/coverage/DataCoveragePage.tsx` — top strip, "Channel
  Check Status" card grid, searchable/filterable/paginated outlet table with
  icon+color state badges, a bottom two-column footer (upcoming outlets +
  explainer card).
- Every imported month: two bare `TableCard`s inline in
  `src/components/SalesDashboard/ImportedSalesSection.tsx:290-292` — plain
  text cells, no search, no filter, no pagination, no footer.

**The fix is not to decorate the second one. It's to delete it and render
imported months through the same layout the May page already uses**, with the
data-shape differences absorbed by an adapter, not by a second hand-rolled UI.
One layout implementation, two small adapters that build its input.

## Anti-slop constraints

Per `DESIGN.md` §3 and `/impeccable`'s core principles:

1. **One layout, not two.** The single biggest anti-slop rule for this plan:
   do not write a second search/filter/pagination/table implementation. If the
   imported-month table needs something the shared layout doesn't support yet,
   extend the shared layout's props — never fork it.
2. **No new color tokens.** Brand red `#C8102E`, corporate navy `#0B192C`,
   amber `#F59E0B`/`#D97706`, canvas `#F8FAFC`, card white, hairline
   `#E2E8F0`, muted `#64748B`, and the existing semantic mapping (emerald =
   reconciled/positive, amber = pending/warning, rose = missing/negative, sky
   = informational). No purple/violet.
3. **Icons on controls and state badges only**, never decoration.
   `iconoir-react`, 14–16px, 1.5px stroke.
4. **Every visual slot must be backed by real data for that mode.** The
   layout has an "info panel" slot (May: upcoming outlets). The imported
   adapter reuses that exact slot for a *different, real* fact — outlets
   excluded from this month's import — never a placeholder or a fake "all
   clear" state to fill the slot.
5. **An unused optional slot renders absent, not faked.** Imported months have
   no live outreach action (no real Lark wiring). The table's action column is
   an optional prop; the imported adapter omits it rather than rendering a
   button that does nothing.
6. **Responsive from the shared layout down.** Desktop table / mobile card
   split, `overflow-x: auto` on the table container — built once, inherited by
   both adapters.

## Architecture: shared layout + two adapters

```
src/pages/coverage/
  CoverageMatrixLayout.tsx   ← NEW. All markup, all interaction state
                               (search, filter, pagination, desktop/mobile
                               split). Knows nothing about where data came
                               from. Pure props in, JSX out.
  DataCoveragePage.tsx       ← THINS OUT. Builds a CoverageViewModel from
                               OutletFinancialData[] + ENTITY_TOTALS (May
                               demo only). Supplies the Lark-ping handler.
  ImportedCoveragePage.tsx   ← NEW. Builds the same CoverageViewModel from
                               OutletCoverage[] (importedCoverage.ts) + the
                               import-exclusion report. No ping handler.
```

`ImportedSalesSection.tsx` renders `<ImportedCoveragePage />` for the
`coverage` section instead of its current inline `TableCard` pair.

### The shared view-model (spec, not final TS)

```ts
interface CoverageViewModel {
  heading: { subtitle: string }               // e.g. "44 active trading outlets · May 2026"
                                                //      "42 outlets with data · August 2026"
  columns: Array<{ key: string; label: string; logo?: PlatformKey }>
  // One state-meta set per mode — the layout renders whatever it's given,
  // it does not hardcode four states or five.
  states: Array<{ key: string; label: string; icon: Icon; badgeClass: string; description: string }>
  topStrip: Array<{ columnKey: string; isComplete: boolean; detail: string }>   // "All in" / "3 missing"
  cardGrid: Array<{ columnKey: string; counts: Record<string, number>; sampled: number }>
  checkRate: { numeratorLabel: string; numerator: number; denominator: number }
  filters: Array<{ key: string; label: string; predicate: (row: CoverageRow) => boolean }>
  rows: CoverageRow[]
  infoPanel: { icon: Icon; tone: 'sky' | 'amber'; title: string; subtitle: string; items: Array<{ label: string; note: string }> }
  explainer: Array<{ term: string; description: React.ReactNode }>
}

interface CoverageRow {
  id: string; name: string; code: string | null; entity: string | null
  badge: boolean            // May's "Upcoming" pill equivalent — generic "flag" pill
  cells: Record<string, { stateKey: string; detail: string }>   // one per column
  coveragePct: number | null
  action?: { label: string; onClick: () => void }               // omitted by imported adapter
}
```

This is intentionally the *existing* May page's data, renamed to be generic —
`DataCoveragePage.tsx` should barely need to change its JSX, only how it
gets its numbers.

## Mapping decisions (imported adapter)

| May concept | Imported equivalent |
| --- | --- |
| 5 channels: POS, Grab, FoodPanda, Shopee, Web | 5 sources: pos, grab, foodpanda, shopee, apps (GRN stays a 6th column, same as May) |
| 4 states: checked / received / missing / na | 5 states: imported / missing / unmapped / failed / unavailable — **do not force these into May's 4 states.** `unmapped` (no alias exists — a mapping decision gap) must be visually distinct from `missing` (aliased, report just hasn't arrived) so a reader never conflates the two. Pass a 5-entry `states` array; the layout doesn't care how many there are. |
| Top strip "All in / N missing" | Same math, source-scoped: "All in" when a source has zero `missing`+`unmapped`+`failed` outlets; otherwise "N gaps" (deliberately not just "N missing" — a gap here can be a mapping problem, not only an unreceived file) |
| Check Rate = checked / (total − na) | imported / (total − unavailable). `unavailable` (GRN: no importer exists yet) is excluded from the denominator the same way May excludes pre-opening outlets — it's not yet a fair question to ask of that row. |
| Filter chips: All / Missing reports / 100% reconciled | All / Has gaps / Fully imported — "has gaps" spans missing+unmapped+failed, matching the top-strip language |
| Action column: "Ping" button | **Omitted.** No real Lark integration for imported months (see non-goals). The column simply doesn't render — this is constraint 5, not a downgrade to hide. |
| Bottom-left "Upcoming outlets" panel | **"Outlets excluded from this import"** — sourced from the `outlet-resolution.json` exclusion reports already written per import (`SalesImportModal.tsx:256-267`, currently never read back anywhere). Same card shape, `tone: 'amber'` instead of `sky` (this is a warning needing a decision, not a neutral fact like "not open yet"). This is the one piece of genuinely new data plumbing in this plan — see step 2 below. |
| Bottom-right explainer card | Content specific to the live schema: what "Unmapped" vs "Missing" means, that Apps/Web are one channel, and a pointer to the exclusion panel above. Same `dl` shape, different copy. |

## Files touched

| File | Work |
| --- | --- |
| `src/pages/coverage/CoverageMatrixLayout.tsx` (new) | All of Section 3's markup and interaction, driven entirely by `CoverageViewModel`. Imports no data module. Exports `COVERAGE_TONES`. |
| `src/pages/coverage/DataCoveragePage.tsx` | Reduced to the May adapter: builds the view-model from `OutletFinancialData[]`/`ENTITY_TOTALS` and owns the Lark-toast handler. |
| `src/pages/coverage/ImportedCoveragePage.tsx` (new) | The imported-month adapter: `OutletCoverage[]` + coverage totals + import records → the same view-model. |
| `src/data/importedCoverage.ts` | Added `code` to `OutletCoverage` (so imported rows show store codes like May does) and `salesCoverage()`, the GRN-excluded rollup behind the strip, headline rate and per-outlet percentage. |
| `src/components/SalesDashboard/ImportedSalesSection.tsx` | `coverage` branch renders `<ImportedCoveragePage />` instead of three `TableCard`s. The GRN-gap banner above it is untouched. |
| `src/data/importedCoverage.test.ts` | Four cases added: code passthrough, GRN excluded from the rollup, a fully-covered outlet not counted as a gap, and a failed source counting as a gap despite having rows. |
| `.gitignore` | `coverage/` → `/coverage/`; see "Incidental fix" below. |

Not touched, deliberately: `outletMatcher.ts` and the alias table —
outlet-roster decisions are a separate, Finance-owned track (see
`GRAB_AUGUST_REIMPORT_HANDOFF.md` §5). This page only displays the
consequences of that gap.

## What was built

### 1. `CoverageMatrixLayout` extracted from the May page — done

All markup and interaction state (search, filter, page size, current page,
desktop-table/mobile-card split) moved out of `DataCoveragePage.tsx` into
`src/pages/coverage/CoverageMatrixLayout.tsx`, driven by `CoverageViewModel`.
It also exports `COVERAGE_TONES`, the shared five-tone palette, so neither
adapter can drift into its own colours.

Two fidelity details worth knowing:

- The strip's Check/Alert icon is derived inside the layout from
  `isComplete`, not passed in — it was never independent of that flag.
- `showActionColumn` is an explicit prop rather than inferred from whether any
  row has an action. Inferring it would silently drop the column in a month
  where every outlet happens to be complete, changing the table's shape for a
  reason that has nothing to do with the design.

`DataCoveragePage.tsx` is now purely the May adapter. Verified in the browser:
same subtitle, same `126/126 Reconciled`, same `100.0%` check rate, same six
cards, same four-state key, Action column present, `Showing 1 to 10 of 23`,
both footer panels, and search still narrows correctly.

### 2. `ImportedCoveragePage` built — done

`src/pages/coverage/ImportedCoveragePage.tsx` maps `OutletCoverage[]`, the
coverage totals and the month's import records onto the same view-model, and
`ImportedSalesSection.tsx`'s `coverage` branch now renders it in place of the
three `TableCard`s. The numeric rollups live in `salesCoverage()` in
`importedCoverage.ts` — pure, GRN-excluded, and unit-tested — rather than
inside the component.

Verified against fixture data covering all five states: the strip reports
per-source gaps, the card grid breaks every state out, `Unmapped` renders
amber and visually distinct from rose `Missing`, `Unavailable` stays neutral
slate, no Action column renders, the info panel turns amber only when a file
actually failed, and the `All sources in` filter correctly isolates the one
fully-covered outlet.

**Import records are grouped by source, never listed per file.** Foodpanda
uploads one invoice workbook per outlet-day, so a real month carries several
hundred `sales_imports` rows — enumerating them made the page an endless
scroll and buried the matrix above it. `filesBySource()` collapses them to one
row per source (`FoodPanda — 459 files · 443 imported, 16 failed`), naming the
file only where a source has exactly one. Verified with a 462-record, 44-outlet
fixture: the footer panel renders 4 rows, the matrix paginates at 10, and the
page stands at 1,915px against May's 1,768px — the same shape, not a longer one.

### 3. Incidental fix: `.gitignore` was swallowing this directory

`.gitignore` line 4 was an unanchored `coverage/`, which matches **any**
directory of that name at any depth — including `src/pages/coverage/`. The
existing `DataCoveragePage.tsx` survived only because it was already tracked;
both new files were invisible to git and would never have been committed.
Changed to `/coverage/` so it means the root-level test-coverage output it was
always intended to mean. Worth knowing: `build/` and `dist/` carry the same
latent problem, left alone as they are not currently biting anything.

## Remaining work

### The import-exclusion panel (deferred, deliberately)

The original intent was for the footer-left slot to list outlet names dropped
at import time. It is deferred because of a constraint worth stating plainly:
per `supabase/SIMPLE_SCHEMA.md`, Storage policies check the user-UUID path
prefix, so `outlet-resolution.json` is readable **only by the account that
uploaded that import**. A straightforward implementation would therefore show
"no exclusions" to everyone else — which is exactly the false all-clear this
plan's anti-slop constraint 4 forbids.

Doing it properly means three distinguishable outcomes, not two: exclusions
found, genuinely none, and *report not readable by this account*. That is a
real piece of design work rather than a bolt-on, so it gets its own pass.

In the meantime the footer-left slot carries the month's import records (file
name, source, status) — real, shared-readable, already loaded, and it
preserves the information the removed "Import status" `TableCard` used to
show, so nothing regressed to make room for it.

### Search / filter at scale

Already inherited from the shared layout, so nothing to build. Worth
re-checking once a live month first exceeds ~40 outlet rows.

## Explicit non-goals

- No real Lark outreach integration for imported months — the action column
  is simply omitted there, per constraint 5. Wiring live messaging is a
  separate, larger piece of work with its own review.
- No new composite "coverage health score." The five imported states are the
  only ones the schema can honestly support (`importedCoverage.ts:8-16`); the
  Check Rate is a plain ratio of two existing counts, not a new metric.
- No changes to `outletMatcher.ts`, the alias table, or which outlets count as
  canonical — that's `GRAB_AUGUST_REIMPORT_HANDOFF.md`'s track, and this
  plan's exclusion panel only *displays* the consequences of that gap, it
  doesn't try to close it.
