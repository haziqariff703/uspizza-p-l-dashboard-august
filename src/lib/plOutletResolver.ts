import { PL_BY_OUTLET } from '../data/outletData'
import { OUTLET_NAME_MAP } from '../data/outletNameMap'
import { ENTITY_NAMES } from '../data/aggregate'
import { normalizeOutletName, type SourceStore } from './outletMatcher'
import type { DirectoryOutlet, OutletDirectory } from './outletDirectory'
import type { OutletPlan, PlannedStore } from './outletPlanner'
import { getSupabaseClient } from './supabase'
import { addAmounts, amount, AMOUNT_UNKNOWN } from './decimal'
import { MONEY_KEYS } from './salesImportParser'
import type { DailyTotal } from './salesDailyTotals'

/**
 * Outlets that opened after the May 2026 P&L was cut. They have no May figures,
 * so Section 7's May master (PL_BY_OUTLET) does not list them and is left
 * untouched — but they trade in later months and their imported sales must
 * count. Finance owns this list: adding a code here makes that outlet's sales
 * count from whichever month its source files first carry it.
 */
const OPENED_SINCE_PL = [
  { name: 'Taman Connaught', code: 'MY-051' },
  { name: 'Kota Damansara', code: 'MY-081' },
]

// Membership, canonical names, codes and entities come from the P&L list plus
// the outlets opened since it was cut. Nothing else is one of our outlets.
export const PL_MASTER = [
  ...PL_BY_OUTLET.map(row => ({
    name: row.name, code: row.code,
    entity: row.entity === 'Sabah' ? ENTITY_NAMES.sabah : ENTITY_NAMES.myUsPizza,
    status: 'active' as const,
  })),
  ...OPENED_SINCE_PL.map(row => ({ ...row, entity: ENTITY_NAMES.myUsPizza, status: 'active' as const })),
]

export function planPlOutlets(stores: SourceStore[], directory: OutletDirectory): OutletPlan {
  const plan: OutletPlan = { stores: [], existing: [], approved: [], missing: [], conflicts: [], unresolved: [], excluded: [], invalid: [] }
  for (const store of stores) {
    const key = normalizeOutletName(store.name)
    const matches = PL_MASTER.filter(outlet =>
      key === normalizeOutletName(outlet.name) || key === normalizeOutletName(outlet.code)
      || OUTLET_NAME_MAP.some(variant => variant.code === outlet.code
        && variant.sources[store.source]?.some(name => normalizeOutletName(name) === key)))
    const master = matches.length === 1 ? matches[0] : null
    const records = master ? directory.outlets.filter(outlet => outlet.code === master.code
      && normalizeOutletName(outlet.name) === normalizeOutletName(master.name)
      && outlet.entity === master.entity) : []
    const outlet = records.length === 1 ? records[0] : null
    const result: PlannedStore = {
      store, outlet, decision: outlet ? 'automatic' : master ? 'missing-outlet' : 'excluded',
      via: outlet ? 'canonical-name' : null, candidates: [],
      reason: outlet ? `P&L outlet: ${outlet.name}.`
        : master ? `P&L outlet ${master.name} is unavailable in the database.`
          : matches.length > 1 ? 'Ambiguous P&L name; excluded.' : 'No match in the P&L outlet list; excluded.',
    }
    plan.stores.push(result)
    if (outlet) plan.approved.push(result)
    else if (master) plan.missing.push(result)
    else plan.excluded.push(result)
  }
  return plan
}

/** Create missing master records automatically; never overwrite existing financial identities. */
export async function ensurePlDirectory(): Promise<OutletDirectory & { ownerId: string }> {
  const db = getSupabaseClient()
  const { data: auth, error: authError } = await db.auth.getUser()
  if (authError || !auth.user) throw new Error('Sign in before importing.')
  const userId = auth.user.id
  const read = async () => {
    const { data, error } = await db.from('outlets').select('id, name, code, entity').eq('created_by', userId)
    if (error) throw error
    return (data ?? []) as DirectoryOutlet[]
  }
  let outlets = await read()
  const missing = PL_MASTER.filter(master => !outlets.some(row => row.code === master.code))
  if (missing.length) {
    const { error } = await db.from('outlets').upsert(missing.map(row => ({ ...row, created_by: userId })), {
      onConflict: 'created_by,code', ignoreDuplicates: true,
    })
    if (error) throw error
    outlets = await read()
  }
  const conflicting = PL_MASTER.filter(master => !outlets.some(row => row.code === master.code
    && normalizeOutletName(row.name) === normalizeOutletName(master.name) && row.entity === master.entity))
  if (conflicting.length) throw new Error(`Database outlet records differ from the P&L master: ${conflicting.map(row => row.name).join(', ')}. Import stopped.`)
  return { outlets: outlets.filter(row => PL_MASTER.some(master => master.code === row.code)), aliases: {}, ownerId: userId }
}

/** Different source spellings may resolve to the same outlet/day. Merge before INSERT. */
export function mergePlDailyTotals(entries: Array<{ total: DailyTotal; match: PlannedStore }>) {
  const groups = new Map<string, { total: DailyTotal; match: PlannedStore }>()
  for (const entry of entries) {
    const key = `${entry.match.outlet!.id}:${entry.total.salesDate}`
    const existing = groups.get(key)
    if (!existing) {
      groups.set(key, { match: entry.match, total: { ...entry.total, amounts: { ...entry.total.amounts } } })
      continue
    }
    existing.total.recordCount += entry.total.recordCount
    for (const field of MONEY_KEYS) {
      const left = existing.total.amounts[field], right = entry.total.amounts[field]
      const sum = addAmounts(left === null ? AMOUNT_UNKNOWN : amount(left), right === null ? AMOUNT_UNKNOWN : amount(right))
      existing.total.amounts[field] = sum.kind === 'value' ? sum.value : null
    }
  }
  return [...groups.values()]
}
