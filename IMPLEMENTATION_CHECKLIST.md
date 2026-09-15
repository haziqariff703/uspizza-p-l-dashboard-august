# Implementation checklist — 15 Sep 2026

## Done

### 1. Simpler wording in sections 1, 2, 3
- [x] Rewrote copy in `src/copy.ts` (overview / fees / coverage keys) into plain English
- [x] Same for inline text in the three section files — e.g. "Provisional" → "Not final",
      "Itemization" → "Listed", "Unexplained" → "Not explained"
- [x] Sections 4–7 left alone

### 2. August data — planning
- [x] Added a 6-phase implementation plan to `docs/AUGUST-DATA-CHECKLIST.md`
      (outlet master → ingestion rules → aggregation → dashboard wiring → reconciliation → test/ship)

### 3. August data — Phase 1 complete
- [x] Built `scripts/data-import/phase1_outlet_master.py`; audit output in `datasource/_audit/` (gitignored)
- [x] Hashed all 997 source files — no duplicates
- [x] **Foodpanda 877 mystery solved**: 459 xlsx (order detail) + 418 pdf-only (daily totals, no line items)
- [x] **Outlet master is stale**: 83 locations in the August data aren't in the 46-outlet list
- [x] **Bug caught**: sister brand (Manhattan FISH MARKET) was matching our outlet codes by location name alone
- [x] **Confirmed open**: Taman Connaught + Kota Damansara are trading, not "upcoming"

### 4. August data — Phase 2 in progress
- [x] Defined import rules for Grab, Foodpanda, Shopee, App and POS data
- [x] Excluded non-US Pizza brands, including Manhattan FISH MARKET, before outlet matching
- [x] Prevented POS totals and platform totals from being added together twice
- [x] Added a canonical outlet master and source-name mapping controls
- [x] Added local handling for unknown outlets and entity assignments instead of guessing
- [x] Added tests for duplicate sales, missing values, sister-brand exclusion and outlet mapping
- [x] Wired supported August POS figures into the May dashboard layout
- [ ] Finalise the authoritative August outlet/entity master for the 83 unresolved locations
- [ ] Connect the completed rules to the full Supabase document-ingestion workflow
- [ ] Confirm that all source filename, sheet and row references are retained in the local audit output

### 5. Section 3 UI polish
- [x] Switched to shared shadcn components (Button / Badge / Card / Input)
- [x] Added `src/components/ui/input.tsx` and an `info` Badge variant
- [x] "✓ complete" → friendlier status badge with a real icon
- [x] Fixed table header overlap — dropped logos for plain text, added `break-words`

### 6. Moved the 7 sections to pages — merged (PR #7)
- [x] `src/components/SalesDashboard/*Section.tsx` → `src/pages/<slug>/<Name>Page.tsx`
- [x] Renamed exports `*Section` → `*Page`
- [x] Deleted dead `GrossSalesByOutletSection.tsx`, fixed stale CLAUDE.md section 6
- [x] Shell, `SectionHeading`, modals stayed in `components/`
- [x] All 7 recorded as git renames (96–99%) so collaborators rebase cleanly
- [x] `npm run lint` + `npm run build` pass

## Open / next

- [ ] **Routing for the pages** — approach not decided yet (hash vs react-router)
- [ ] **August Phase 2 still has blockers**: finalise the outlet master for the 83 unknowns and
      connect the rules to the full Supabase ingestion workflow
- [ ] Confirm the 4 likely spelling aliases (Dpulze, Lucerne Square/Penang, Ipoh Simee)
- [ ] Still no August purchases/GRN source — purchases, GP and margin stay unavailable until found
- [ ] `datasource/sales-purchases-august.zip` (58MB) never inspected — may hold the purchases data
