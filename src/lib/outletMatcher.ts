import { isSisterBrand, outletNameKey } from '../data/outletMaster'
import { directoryKey, type AliasSource, type DirectoryOutlet, type OutletDirectory } from './outletDirectory'

/**
 * Deterministic outlet matching. Nothing here talks to the network, nothing here
 * is random, and nothing here asks a model what an outlet is: the same file and
 * the same directory always produce the same decisions, so a reviewer can argue
 * with a specific rule rather than with a black box.
 */

/** Brand and operating-company prefixes that carry no location. Stripped only
 *  when something is left afterwards — the location token never goes. */
const BRAND_PREFIXES = [/^us\s*pizza\b/, /^marshalls?\s+co\b/]

/** Spellings the sources genuinely disagree on. Deterministic and listed, not inferred. */
const EQUIVALENT_SPELLINGS: Array<[RegExp, string]> = [
  [/\bss\s+(\d+)\b/g, 'ss$1'],   // "SS 15" and "SS15" are one place
  [/\bd\s+pulze\b/g, 'dpulze'],  // "D'Pulze", "D Pulze", "Dpulze"
]

/**
 * Lowercases, drops punctuation and brackets, collapses whitespace, removes a
 * leading brand/operator prefix and settles the known spelling variants.
 * Never removes the location token: if a rule would empty the name, it is skipped.
 */
export function normalizeOutletName(name: string): string {
  // outletNameKey already lowercases, trims, drops a leading "US Pizza" and
  // strips apostrophes and ().,  — but a name that is *only* the brand would
  // come back empty, and an empty key fuzzy-matches everything, so keep the
  // raw name in that case.
  let key = outletNameKey(name) || name.trim().toLowerCase()
  for (const prefix of BRAND_PREFIXES) {
    const stripped = key.replace(prefix, '').replace(/^\s*[-–—:|]\s*/, '').trim()
    if (stripped) key = stripped
  }
  key = key.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
  for (const [pattern, replacement] of EQUIVALENT_SPELLINGS) key = key.replace(pattern, replacement)
  return key
}

/** The trailing half of "Operating Company - Location", when there is one. Read
 *  off the raw name, because normalization flattens the separator away. */
const afterSeparator = (name: string) => name.match(/^.+?\s[-–—]\s(.+)$/)?.[1]?.trim()

const bigrams = (value: string) => {
  const letters = value.replace(/\s+/g, '')
  const counts = new Map<string, number>()
  for (let index = 0; index < letters.length - 1; index++) {
    const gram = letters.slice(index, index + 2)
    counts.set(gram, (counts.get(gram) ?? 0) + 1)
  }
  return counts
}

/** Sørensen–Dice bigram similarity, 0…1. Symmetric, deterministic, no dependency. */
export function similarity(left: string, right: string): number {
  if (left === right) return left ? 1 : 0
  const a = bigrams(left)
  const b = bigrams(right)
  let shared = 0
  let total = 0
  for (const [gram, count] of a) {
    shared += Math.min(count, b.get(gram) ?? 0)
    total += count
  }
  for (const count of b.values()) total += count
  return total ? (2 * shared) / total : 0
}

/** Below this, the name is rejected rather than offered as a candidate. */
export const REVIEW_SCORE = 0.85
/** Two candidates this close together are a tie, so a person decides. */
const TIE_GAP = 0.02

/** One distinct store name found in a source file. */
export interface SourceStore {
  source: AliasSource
  /** Exactly as the file wrote it — this is what gets persisted as the alias. */
  name: string
  /**
   * Grab and Shopee export a stable store id. The simple schema has nowhere to
   * keep it yet (see the `source_outlet_identifiers` follow-up in the Phase 2
   * handoff), so it is matched against whatever index the caller supplies and
   * is otherwise carried, unused, rather than thrown away.
   */
  externalStoreId?: string | null
  /** How many daily totals this store accounts for, for the import summary. */
  dailyRows: number
}

export type MatchDecision = 'automatic' | 'review' | 'reject' | 'excluded'
export type MatchVia = 'store-id' | 'alias' | 'canonical-name' | 'rule' | 'fuzzy'

export interface MatchCandidate {
  outlet: DirectoryOutlet
  score: number
}

export interface MatchResult {
  store: SourceStore
  decision: MatchDecision
  outlet: DirectoryOutlet | null
  via: MatchVia | null
  /** Ranked alternatives for a reviewer. Empty for an automatic or excluded store. */
  candidates: MatchCandidate[]
  reason: string
}

export interface MatchOptions {
  /** `source:externalStoreId` → outlet id. Empty until Codex adds the table. */
  storeIdIndex?: Record<string, string>
}

export const storeIdKey = (source: string, externalStoreId: string) =>
  `${source.trim().toLowerCase()}:${externalStoreId.trim().toLowerCase()}`

/**
 * Walks the ladder in the handoff's order and stops at the first rung that
 * answers. A rung that cannot answer uniquely hands the store to a person
 * instead of picking for them.
 */
export function matchSourceStore(
  store: SourceStore,
  directory: OutletDirectory,
  options: MatchOptions = {},
): MatchResult {
  const decide = (
    decision: MatchDecision,
    outlet: DirectoryOutlet | null,
    via: MatchVia | null,
    reason: string,
    candidates: MatchCandidate[] = [],
  ): MatchResult => ({ store, decision, outlet, via, candidates, reason })

  const byId = (id: string | undefined) => directory.outlets.find(outlet => outlet.id === id)

  if (isSisterBrand(store.name)) {
    return decide('excluded', null, null, 'Sister brand — its sales are not ours.')
  }
  if (!store.name.trim()) {
    return decide('reject', null, null, 'The file gave no outlet name for these rows.')
  }

  // 1. A stable store id the source itself issued beats every name rule.
  if (store.externalStoreId) {
    const matched = byId(options.storeIdIndex?.[storeIdKey(store.source, store.externalStoreId)])
    if (matched) return decide('automatic', matched, 'store-id', `Store ID ${store.externalStoreId}.`)
  }

  // 2. An alias somebody already confirmed, for this source only.
  const exactAlias = byId(directory.aliases[directoryKey(store.source, store.name)])
  if (exactAlias) return decide('automatic', exactAlias, 'alias', 'Already mapped for this source.')

  const normalized = normalizeOutletName(store.name)
  const aliasIndex = new Map<string, Set<string>>()
  for (const [key, outletId] of Object.entries(directory.aliases)) {
    const [aliasSource, ...rest] = key.split(':')
    if (aliasSource !== store.source) continue
    const aliasKey = normalizeOutletName(rest.join(':'))
    if (!aliasKey) continue
    aliasIndex.set(aliasKey, (aliasIndex.get(aliasKey) ?? new Set()).add(outletId))
  }
  const normalizedAlias = aliasIndex.get(normalized)
  if (normalizedAlias?.size === 1) {
    const matched = byId([...normalizedAlias][0])
    if (matched) return decide('automatic', matched, 'alias', 'Matches a confirmed alias for this source.')
  }

  // 3. The canonical outlet name itself.
  const byName = directory.outlets.filter(outlet => normalizeOutletName(outlet.name) === normalized)
  if (byName.length === 1) return decide('automatic', byName[0], 'canonical-name', 'Same outlet name.')
  if (byName.length > 1) {
    return decide('review', null, null, `${byName.length} outlets share this name.`,
      byName.map(outlet => ({ outlet, score: 1 })))
  }

  // 4. Deterministic naming rule: "Operating Company - Location" resolves on the
  //    location alone, and only when that names exactly one outlet.
  const tail = afterSeparator(store.name)
  if (tail) {
    const tailKey = normalizeOutletName(tail)
    const byTail = directory.outlets.filter(outlet => normalizeOutletName(outlet.name) === tailKey)
    if (byTail.length === 1) return decide('automatic', byTail[0], 'rule', `Resolved on "${tail}" after the operator prefix.`)
  }

  // 5. Fuzzy similarity only ever suggests a candidate. A close score is not a
  //    financial identity decision: the store goes to review, and the reviewer
  //    maps it (or not) explicitly. Nothing here auto-persists an alias.
  const ranked = directory.outlets
    .map(outlet => ({ outlet, score: similarity(normalized, normalizeOutletName(outlet.name)) }))
    .sort((left, right) => right.score - left.score)
  const best = ranked[0]
  if (!best || best.score < REVIEW_SCORE) {
    return decide('reject', null, null,
      best ? `No outlet is close enough (best ${best.score.toFixed(2)}).` : 'No outlets exist to match against.')
  }
  const isTie = ranked.length > 1 && best.score - ranked[1].score < TIE_GAP
  return decide('review', null, null,
    isTie ? 'Two outlets match about equally well.' : `Best match is only ${best.score.toFixed(2)} — confirm it yourself.`,
    ranked.filter(candidate => candidate.score >= REVIEW_SCORE).slice(0, 5))
}

export const matchSourceStores = (
  stores: SourceStore[],
  directory: OutletDirectory,
  options: MatchOptions = {},
): MatchResult[] => stores.map(store => matchSourceStore(store, directory, options))

/** The counts behind "66 source stores found · 61 mapped automatically · …". */
export interface MatchSummary {
  stores: number
  automatic: number
  review: number
  rejected: number
  excluded: number
  /** Daily totals that will be written, and those held back. */
  mappedRows: number
  heldRows: number
}

export function summarizeMatches(results: MatchResult[]): MatchSummary {
  const count = (decision: MatchDecision) => results.filter(result => result.decision === decision).length
  const rows = (keep: boolean) => results
    .filter(result => (result.decision === 'automatic') === keep)
    .reduce((total, result) => total + result.store.dailyRows, 0)
  return {
    stores: results.length,
    automatic: count('automatic'),
    review: count('review'),
    rejected: count('reject'),
    excluded: count('excluded'),
    mappedRows: rows(true),
    heldRows: rows(false),
  }
}
