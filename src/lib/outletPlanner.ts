import { directoryKey, type AliasSource, type DirectoryOutlet, type OutletDirectory } from './outletDirectory'
import { normalizeOutletName, similarity, type MatchCandidate, type SourceStore } from './outletMatcher'

/**
 * The pure, side-effect-free outlet mapping planner. Given the signed-in user's
 * outlet directory and the distinct source stores parsed from an import, it
 * decides — deterministically and without writing anything — which stores map
 * automatically, which need review, and which are blocked.
 *
 * The ladder is narrower than the earlier fuzzy proposal: a fuzzy similarity
 * score is a *suggestion* for a reviewer, never a financial identity decision.
 * Automatic mapping is limited to three rungs only:
 *
 *   1. an existing source-specific database alias,
 *   2. a unique normalized canonical outlet-name match, and
 *   3. an explicitly approved source-specific variant (the four Finance-approved
 *      mappings below).
 *
 * Nothing here talks to the network, and nothing here persists an alias.
 */

/**
 * The four mappings Finance explicitly approved. Each rule pins a set of source
 * spellings (per source) to one canonical outlet code. The code is a lookup key
 * into the directory, never a database foreign key: the planner resolves it to
 * the outlet's database UUID, and reports the outlet as *missing* when it has
 * not been bootstrapped yet.
 *
 * Rawang and Sepang are the two that matter most: a fuzzy matcher could land
 * "Rawang" on Senawang or "Sepang" on Ampang. These rules forbid both.
 */
export interface ApprovedVariantRule {
  /** Static lookup code from `PL_BY_OUTLET` / `INITIAL_OUTLETS`. */
  canonicalCode: string
  canonicalName: string
  /** Raw source spellings, exactly as the exports write them. */
  sourceNames: Partial<Record<AliasSource, string[]>>
}

export const APPROVED_OUTLET_VARIANTS: ApprovedVariantRule[] = [
  {
    canonicalCode: 'MY-041',
    canonicalName: 'Anggun City',
    sourceNames: {
      pos: ['US Pizza Rawang'],
      grab: ['Us Pizza - Anggun City Rawang'],
      foodpanda: ['US Pizza (Rawang)'],
      shopee: ['US Pizza - Rawang'],
      apps: ['US Pizza - Rawang Anggun City'],
    },
  },
  {
    canonicalCode: 'MY-009',
    canonicalName: 'Kota Warisan',
    sourceNames: {
      grab: ['Us Pizza - Kota Warisan Sepang'],
      foodpanda: ['US PIZZA (Sepang)'],
      shopee: ['US Pizza - Sepang'],
      apps: ['US Pizza - Sepang'],
    },
  },
  {
    canonicalCode: 'MY-051',
    canonicalName: 'Taman Connaught',
    sourceNames: {
      pos: ['US Pizza Taman Connaught'],
      grab: ['US Pizza - Taman Connaught'],
      foodpanda: ['US Pizza (Taman Connaught)'],
      shopee: ['US Pizza - Taman Connaught'],
      apps: ['US PIZZA - Taman Connaught', 'US PIZZA - Taman Connaught, Cheras'],
    },
  },
  {
    canonicalCode: 'MY-081',
    canonicalName: 'Kota Damansara',
    sourceNames: {
      grab: ['US Pizza - Kota Damansara'],
      foodpanda: ['US Pizza (Kota Damansara)'],
      shopee: ['US Pizza - Kota Damansara'],
    },
  },
]

/** Pre-normalized spellings per approved rule, indexed by `source:normalizedName`. */
interface ApprovedLookup {
  byName: Map<string, string> // source:normalizedName → canonical code
}

function buildApprovedLookup(rules: ApprovedVariantRule[]): ApprovedLookup {
  const byName = new Map<string, string>()
  for (const rule of rules) {
    for (const [source, names] of Object.entries(rule.sourceNames)) {
      for (const name of names ?? []) {
        byName.set(`${source}:${normalizeOutletName(name)}`, rule.canonicalCode)
      }
    }
  }
  return { byName }
}

const APPROVED_LOOKUP = buildApprovedLookup(APPROVED_OUTLET_VARIANTS)

/** How a store resolves. `approved-variant` is one of the four Finance-approved rules. */
export type PlanVia = 'alias' | 'canonical-name' | 'approved-variant' | null

export type PlanDecision = 'automatic' | 'review' | 'excluded' | 'invalid' | 'missing-outlet'

export interface PlannedStore {
  store: SourceStore
  decision: PlanDecision
  outlet: DirectoryOutlet | null
  via: PlanVia
  /** Ranked fuzzy suggestions for a reviewer. Empty unless `decision === 'review'`. */
  candidates: MatchCandidate[]
  reason: string
  /** Set when the approved variant/canonical name has no outlet in the directory. */
  missingCanonical?: { code: string; name: string }
}

/** A source name whose existing alias and its resolved identity disagree. */
export interface AliasConflict {
  source: AliasSource
  name: string
  /** What the stored alias says. */
  existingOutletId: string
  /** What the canonical name or an approved variant resolves to. */
  resolvedOutletId: string
}

export interface OutletPlan {
  stores: PlannedStore[]
  /** Existing DB aliases, idempotent — nothing to persist. */
  existing: PlannedStore[]
  /** New automatic mappings that need their alias persisted before import. */
  approved: PlannedStore[]
  /** Approved variants whose canonical outlet is not in the directory yet. */
  missing: PlannedStore[]
  /** Source names where the stored alias and the resolved identity disagree. */
  conflicts: AliasConflict[]
  /** Names a reviewer must decide; nothing here is written. */
  unresolved: PlannedStore[]
  excluded: PlannedStore[]
  invalid: PlannedStore[]
}

export interface PlanSummary {
  stores: number
  automatic: number
  review: number
  excluded: number
  invalid: number
  missing: number
  /** Daily totals eligible to write, and those held back. */
  eligibleRows: number
  heldRows: number
}

const SISTER_BRAND = /manhattan\s+fish\s+market/i

/** Resolve a canonical code to a directory outlet by code (case-insensitive). */
const byCode = (directory: OutletDirectory, code: string) =>
  directory.outlets.find(outlet => outlet.code?.trim().toUpperCase() === code.trim().toUpperCase())
const byNormalizedName = (directory: OutletDirectory, name: string) =>
  directory.outlets.filter(outlet => normalizeOutletName(outlet.name) === name)

/**
 * The identity a store resolves to independent of any stored alias: a unique
 * canonical name or an approved variant. Null when neither applies. This is the
 * "what the rules say" half of a conflict check.
 */
function resolveIdentity(store: SourceStore, directory: OutletDirectory): DirectoryOutlet | null {
  const normalized = normalizeOutletName(store.name)
  const byName = byNormalizedName(directory, normalized)
  if (byName.length === 1) return byName[0]
  const approvedCode = APPROVED_LOOKUP.byName.get(`${store.source}:${normalized}`)
  if (approvedCode) return byCode(directory, approvedCode) ?? null
  return null
}

export function planOutletMappings(
  stores: SourceStore[],
  directory: OutletDirectory,
): OutletPlan {
  const plan: OutletPlan = {
    stores: [], existing: [], approved: [], missing: [], conflicts: [],
    unresolved: [], excluded: [], invalid: [],
  }
  const aliasById = new Map(directory.outlets.map(outlet => [outlet.id, outlet]))

  const decide = (
    store: SourceStore,
    decision: PlanDecision,
    outlet: DirectoryOutlet | null,
    via: PlanVia,
    reason: string,
    candidates: MatchCandidate[] = [],
    missingCanonical?: { code: string; name: string },
  ): PlannedStore => ({ store, decision, outlet, via, candidates, reason, missingCanonical })

  const push = (store: PlannedStore) => {
    plan.stores.push(store)
    if (store.decision === 'automatic') {
      if (store.via === 'alias') plan.existing.push(store)
      else plan.approved.push(store)
    } else if (store.decision === 'missing-outlet') plan.missing.push(store)
    else if (store.decision === 'excluded') plan.excluded.push(store)
    else if (store.decision === 'invalid') plan.invalid.push(store)
    else plan.unresolved.push(store)
  }

  for (const store of stores) {
    if (SISTER_BRAND.test(store.name)) {
      push(decide(store, 'excluded', null, null, 'Sister brand — its sales are not ours.'))
      continue
    }
    if (!store.name.trim()) {
      push(decide(store, 'invalid', null, null, 'The file gave no outlet name for these rows.'))
      continue
    }

    // 1. An alias somebody already confirmed, for this source only.
    const key = directoryKey(store.source, store.name)
    const existingId = directory.aliases[key]
    if (existingId) {
      // A stored alias and the rules can disagree. The alias wins for mapping
      // (it was confirmed by a person), but the disagreement must not be silent.
      const identity = resolveIdentity(store, directory)
      if (identity && identity.id !== existingId) {
        plan.conflicts.push({
          source: store.source,
          name: store.name,
          existingOutletId: existingId,
          resolvedOutletId: identity.id,
        })
      }
      push(decide(store, 'automatic', aliasById.get(existingId) ?? null, 'alias', 'Already mapped for this source.'))
      continue
    }

    // 2. A unique normalized canonical outlet-name match.
    const normalized = normalizeOutletName(store.name)
    const byName = byNormalizedName(directory, normalized)
    if (byName.length === 1) {
      push(decide(store, 'automatic', byName[0], 'canonical-name', 'Same outlet name.'))
      continue
    }
    if (byName.length > 1) {
      push(decide(store, 'review', null, null, `${byName.length} outlets share this name.`,
        byName.map(outlet => ({ outlet, score: 1 }))))
      continue
    }

    // 3. An explicitly approved source-specific variant.
    const approvedCode = APPROVED_LOOKUP.byName.get(`${store.source}:${normalized}`)
    if (approvedCode) {
      const rule = APPROVED_OUTLET_VARIANTS.find(r => r.canonicalCode === approvedCode)!
      const outlet = byCode(directory, approvedCode)
      if (!outlet) {
        push(decide(store, 'missing-outlet', null, 'approved-variant',
          `Approved as ${rule.canonicalName}, but that outlet is not in this account's directory yet.`,
          [], { code: approvedCode, name: rule.canonicalName }))
        continue
      }
      push(decide(store, 'automatic', outlet, 'approved-variant',
        `Approved source variant for ${rule.canonicalName}.`))
      continue
    }

    // 4. Fuzzy similarity is a suggestion only. Nothing is auto-mapped here.
    const ranked = directory.outlets
      .map(outlet => ({ outlet, score: similarity(normalized, normalizeOutletName(outlet.name)) }))
      .sort((left, right) => right.score - left.score)
    const candidates = ranked.filter(candidate => candidate.score >= 0.85).slice(0, 5)
    const best = candidates[0]
    push(decide(store, 'review', null, null,
      best ? `Closest match is ${best.score.toFixed(2)} — needs a person to confirm.` : 'No outlet is close enough to suggest.',
      candidates))
  }

  return plan
}

export function summarizePlan(plan: OutletPlan): PlanSummary {
  const count = (decision: PlanDecision) => plan.stores.filter(store => store.decision === decision).length
  const rows = (eligible: boolean) => plan.stores
    .filter(store => (store.decision === 'automatic') === eligible)
    .reduce((total, store) => total + store.store.dailyRows, 0)
  return {
    stores: plan.stores.length,
    automatic: count('automatic'),
    review: count('review'),
    excluded: count('excluded'),
    invalid: count('invalid'),
    missing: count('missing-outlet'),
    eligibleRows: rows(true),
    heldRows: rows(false),
  }
}
