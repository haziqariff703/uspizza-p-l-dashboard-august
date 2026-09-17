# Automatic P&L outlet resolution — 17 September 2026

The user selected `PL_BY_OUTLET` as the sole outlet authority and removed the requirement for manual outlet confirmation.

## Changed workflow

Before: choose files → read/match → set up missing outlets and manually resolve exceptions → import.

Now: choose source/files → Read and match → inspect counts → Import daily totals.

Reading automatically creates any missing database records for the 44 P&L outlets. No outlet setup, mapping form or confirmation is shown. The preview is informational. The Import button remains the action that saves financial rows.

Matching accepts canonical P&L names/codes after normalization and the existing `outletNameMap.ts` source spelling variants, restricted to codes present in P&L. It does not use fuzzy assignment or saved manual database aliases. The database still supplies real UUIDs. Duplicate spellings for an outlet/date merge with exact decimal arithmetic; an unknown amount remains unknown.

Unmatched/ambiguous names are excluded and listed with their daily-total counts before import and named in the completion message. Each imported file has an `outlet-resolution.json` sidecar in private sales-imports Storage, alongside its original workbook, containing excluded daily totals. Files with no eligible totals remain excluded in the preview; they are not uploaded or marked imported. Invalid files still fail validation.

The P&L list has 44 trading outlets, so Taman Connaught and Kota Damansara (pre-opening records outside this list) are excluded. The source spelling table is deterministic; a new spelling not represented by normalization or the table remains excluded. No prompt asks the operator to map it.

Manual setup/mapping panels have also been removed from the imported dashboard. Coverage without imported rows now reads Unavailable rather than asking for an alias.

## How to test

1. Run `npm run dev`, sign in and select August 2026. Open Import Sales.
2. Choose the matching source and its August workbook; click Read and match. Verify there is no outlet setup or mapping form. On a fresh account the 44 database outlets are created automatically.
3. Check Greenlane / US Pizza (Greenlane), canonical codes and existing vendor variants resolve automatically. Unknown names and the two pre-opening outlets appear only in the exclusion report.
4. Import once into a test account. Check the completion message, sales totals and private Storage original/report pair. Excluded rows must not appear in sales_daily.
5. A workbook containing two Greenlane spellings on the same day must create one database daily row with combined exact money and counts. Unknown monetary fields must remain null.
6. Reopen and analyze a report: no outlet confirmation appears and no duplicate master outlets are created. Do not repeat the financial import merely to test matching: cross-import deduplication is outside this change.
7. Change accounts after analysis; importing must refuse the stale plan and require reading the files again.

Automated checks: `npm run lint`, `npm test`, `npm run build`. Read-only source replay: `node --import tsx scripts/verify-pl-resolution.ts` (requires the local datasource workbooks).

## Boundaries

No SQL migration, grant change, production deployment or modification of historical financial rows is included. Existing conflicting database names/entities for a P&L code cause an explicit setup error; existing financial identities are not overwritten. The active schema is the six-table prototype, not the retired review/publication contract.

Browser verification covered the August import dialog without mapping controls and the signed-out state. Authenticated database/Storage import acceptance remains unverified because the browser session is signed out. Build warnings concern bundle size and mixed static/dynamic XLSX imports.

## Verification findings

TypeScript passed, all 127 tests passed, and the production build passed. Seven new checks cover P&L-only resolution and coverage, including all 44 names/codes, known source spellings, ignored manual aliases, excluded unknown/pre-opening names, missing database identities, and merged exact daily amounts.

Release verification: the isolated release built on the latest main also passed TypeScript, all 99 tests present in that checkout, and the production build. The count is lower because unrelated unfinished fees/purchases work and its tests were deliberately left in the original workspace.

Read-only replay used one local workbook per source. These are distinct source-name counts, not corporate outlet coverage or reconciled monthly totals:

| Source | Matched names | Excluded names | Parser validation |
| --- | ---: | ---: | --- |
| POS | 43 | 23 | Passed |
| Grab | 44 | 22 | Passed |
| Shopee | 40 | 7 | Passed |
| Apps | 40 | 35 | Passed |
| FoodPanda sample | — | — | Rejected: expected Order Date / Outlet Name header not found |

Exclusion means no deterministic P&L match, not proof of franchise ownership. For example, `US Pizza EG Mall Inanam Sabah` is absent from the existing POS spelling rules despite Inanam being in P&L. New or incomplete source spellings remain visible exclusions and require a code-level rule update if they should count; the operator is never asked to confirm them during import. FoodPanda's sampled invoice layout needs a separate parser profile; changing outlet matching cannot make an unsupported workbook layout parse.
