import type { ImportedRow } from './importedOverview'
import { ALIAS_SOURCES, type AliasSource, type DirectoryOutlet, type OutletDirectory } from '../lib/outletDirectory'

/**
 * Section 3's coverage, derived from what was actually imported rather than from
 * the static demo's channel flags.
 *
 * The five states are the only ones this schema can honestly support:
 *  - `imported`    rows exist for that outlet and source this month
 *  - `missing`     the source knows this outlet (an alias exists) but sent nothing
 *  - `unmapped`    no alias links this outlet to that source, so nothing can arrive
 *  - `failed`      this month's import for that source did not finish
 *  - `unavailable` there is no source of truth at all yet (GRN/purchases)
 *
 * There is deliberately no "reconciled": the simple schema has no expected-channel
 * calendar and no publication step, so nothing here can claim a month is complete.
 */
export type ImportedCoverageState = 'imported' | 'missing' | 'unmapped' | 'failed' | 'unavailable'

export const COVERAGE_STATE_LABELS: Record<ImportedCoverageState, string> = {
  imported: 'Imported', missing: 'Missing', unmapped: 'Unmapped', failed: 'Failed', unavailable: 'Unavailable',
}

export interface CoverageCell {
  source: AliasSource | 'grn'
  state: ImportedCoverageState
  /** Source rows behind the imported totals, and the distinct dates seen. */
  records: number
  days: number
}

export interface OutletCoverage {
  id: string
  name: string
  code: string | null
  entity: string | null
  cells: CoverageCell[]
}

export interface CoverageInput {
  /** P&L matching needs no aliases; no rows means unavailable coverage. */
  automaticOutlets?: boolean
  directory: OutletDirectory
  /** `sales_daily` rows already joined to their outlet and source. */
  rows: ImportedRow[]
  /** Sources whose import for this month ended in `failed`. */
  failedSources?: string[]
  /** Outlets with at least one imported `purchases_daily` row this month. */
  purchaseOutletIds?: string[]
}

/** Which sources each outlet has a confirmed alias for. */
function aliasedSources(directory: OutletDirectory): Map<string, Set<string>> {
  const byOutlet = new Map<string, Set<string>>()
  for (const [key, outletId] of Object.entries(directory.aliases)) {
    const source = key.split(':')[0]
    byOutlet.set(outletId, (byOutlet.get(outletId) ?? new Set()).add(source))
  }
  return byOutlet
}

export function importedCoverage({
  directory, rows, failedSources = [], purchaseOutletIds = [], automaticOutlets = false,
}: CoverageInput): OutletCoverage[] {
  const aliases = aliasedSources(directory)
  const failed = new Set(failedSources)
  const purchased = new Set(purchaseOutletIds)

  // Outlets the account owns, plus any outlet that somehow has rows without
  // being in the directory — a row is evidence, and hiding it would be worse.
  const known = new Map<string, DirectoryOutlet>(directory.outlets.map(outlet => [outlet.id, outlet]))
  for (const row of rows) {
    if (row.outlet_id && !known.has(row.outlet_id)) {
      known.set(row.outlet_id, { id: row.outlet_id, name: row.outlet_name, code: row.outlet_code, entity: row.entity ?? null })
    }
  }

  return [...known.values()].map(outlet => {
    const outletRows = rows.filter(row => row.outlet_id === outlet.id)
    const cells: CoverageCell[] = ALIAS_SOURCES.map(source => {
      const sourceRows = outletRows.filter(row => row.source === source)
      const records = sourceRows.reduce((total, row) => total + row.record_count, 0)
      const days = new Set(sourceRows.map(row => row.sales_date)).size
      // An import that failed is reported as failed even if an earlier, partial
      // one left rows behind: the month is not trustworthy for that source.
      const state: ImportedCoverageState = failed.has(source) ? 'failed'
        : sourceRows.length ? 'imported'
          : automaticOutlets ? 'unavailable'
          : aliases.get(outlet.id)?.has(source) ? 'missing'
            : 'unmapped'
      return { source, state, records, days }
    })
    cells.push({
      source: 'grn',
      // No purchases importer exists yet, so an outlet without purchase rows is
      // unavailable, not missing — nobody has been asked for the file.
      state: purchased.has(outlet.id) ? 'imported' : 'unavailable',
      records: 0, days: 0,
    })
    return { id: outlet.id, name: outlet.name, code: outlet.code, entity: outlet.entity, cells }
  }).sort((left, right) => left.name.localeCompare(right.name))
}

/**
 * Sales-source rollups for Section 3's strip, headline rate and per-outlet
 * percentage. GRN is excluded from all of them: it has no importer yet, so
 * counting it would hold every outlet permanently short of complete for a
 * reason that has nothing to do with sales coverage.
 */
export function salesCoverage(coverage: OutletCoverage[]) {
  const importedPerOutlet = coverage.map(outlet => ({
    id: outlet.id,
    imported: outlet.cells.filter(cell => cell.source !== 'grn' && cell.state === 'imported').length,
  }))
  return {
    salesCells: coverage.length * ALIAS_SOURCES.length,
    importedSalesCells: importedPerOutlet.reduce((total, outlet) => total + outlet.imported, 0),
    outletsWithGaps: importedPerOutlet.filter(outlet => outlet.imported < ALIAS_SOURCES.length).length,
    /** Outlets whose cell for that source did not land rows. */
    gapsBySource: Object.fromEntries(ALIAS_SOURCES.map(source => [
      source,
      coverage.filter(outlet => outlet.cells.find(cell => cell.source === source)?.state !== 'imported').length,
    ])) as Record<AliasSource, number>,
    percentByOutlet: new Map(importedPerOutlet.map(outlet =>
      [outlet.id, Math.round((outlet.imported / ALIAS_SOURCES.length) * 100)])),
  }
}

/** Per-state outlet counts for one source, for the coverage strip. */
export function coverageTotals(coverage: OutletCoverage[]): Array<{ source: string; counts: Record<ImportedCoverageState, number> }> {
  const sources: Array<AliasSource | 'grn'> = [...ALIAS_SOURCES, 'grn']
  return sources.map(source => {
    const counts: Record<ImportedCoverageState, number> = { imported: 0, missing: 0, unmapped: 0, failed: 0, unavailable: 0 }
    for (const outlet of coverage) {
      const cell = outlet.cells.find(item => item.source === source)
      if (cell) counts[cell.state]++
    }
    return { source, counts }
  })
}
