import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  matchSourceStore, matchSourceStores, normalizeOutletName, similarity, storeIdKey, summarizeMatches,
  type SourceStore,
} from './outletMatcher'
import { directoryKey, type OutletDirectory } from './outletDirectory'

const outlet = (id: string, name: string, code = id.toUpperCase()) =>
  ({ id, name, code, entity: 'MY US PIZZA SDN BHD' })

const directory = (outlets: ReturnType<typeof outlet>[], aliases: Record<string, string> = {}): OutletDirectory =>
  ({ outlets, aliases })

const store = (source: SourceStore['source'], name: string, extra: Partial<SourceStore> = {}): SourceStore =>
  ({ source, name, dailyRows: 1, ...extra })

const GREENLANE = outlet('o1', 'Greenlane', 'MY-020')
const SS15 = outlet('o2', 'SS15', 'MY-041')
const DPULZE = outlet('o3', 'Dpulze Cyberjaya', 'MY-030')

test('normalization lowercases, strips punctuation and drops brand prefixes', () => {
  assert.equal(normalizeOutletName('  US Pizza (Pandan Indah) '), 'pandan indah')
  assert.equal(normalizeOutletName("Marshall's Co - Greenlane"), 'greenlane')
  assert.equal(normalizeOutletName('US PIZZA - SS15'), 'ss15')
})

test('known equivalent spellings collapse, and the location token always survives', () => {
  assert.equal(normalizeOutletName('US Pizza SS 15'), normalizeOutletName('US PIZZA - SS15'))
  assert.equal(normalizeOutletName("US Pizza - D'Pulze"), normalizeOutletName('US Pizza Dpulze'))
  // Nothing but the brand: stripping everything would match any outlet, so it does not.
  assert.equal(normalizeOutletName('US Pizza'), 'us pizza')
})

test('similarity is symmetric and bounded', () => {
  assert.equal(similarity('greenlane', 'greenlane'), 1)
  assert.equal(similarity('greenlane', 'ss15'), similarity('ss15', 'greenlane'))
  assert.ok(similarity('greenlane', 'greenlanes') > 0.85)
  assert.ok(similarity('greenlane', 'ss15') < 0.85)
})

test('an existing alias for the same source maps automatically', () => {
  const result = matchSourceStore(
    store('grab', "Marshall's Co - Greenlane"),
    directory([GREENLANE], { [directoryKey('grab', "Marshall's Co - Greenlane")]: 'o1' }),
  )
  assert.equal(result.decision, 'automatic')
  assert.equal(result.via, 'alias')
  assert.equal(result.outlet?.id, 'o1')
})

test('an alias recorded for one source never resolves another source', () => {
  const withGrabAlias = directory([GREENLANE, SS15], { [directoryKey('grab', 'Warung 41')]: 'o1' })
  assert.equal(matchSourceStore(store('grab', 'Warung 41'), withGrabAlias).decision, 'automatic')
  const asPos = matchSourceStore(store('pos', 'Warung 41'), withGrabAlias)
  assert.notEqual(asPos.decision, 'automatic')
  assert.equal(asPos.outlet, null)
})

test('the canonical outlet name resolves without any alias', () => {
  const result = matchSourceStore(store('pos', 'US Pizza (Greenlane)'), directory([GREENLANE, SS15]))
  assert.equal(result.decision, 'automatic')
  assert.equal(result.via, 'canonical-name')
  assert.equal(result.outlet?.id, 'o1')
})

test('an operator prefix resolves on the location only when it names one outlet', () => {
  const resolved = matchSourceStore(store('grab', "Someone Else Sdn Bhd - Greenlane"), directory([GREENLANE, SS15]))
  assert.equal(resolved.decision, 'automatic')
  assert.equal(resolved.via, 'rule')
  assert.equal(resolved.outlet?.id, 'o1')
})

test('a stable store id beats every name rule when the caller has an index', () => {
  const result = matchSourceStore(
    store('grab', 'Completely Different Wording', { externalStoreId: 'G-123' }),
    directory([GREENLANE, SS15]),
    { storeIdIndex: { [storeIdKey('grab', 'G-123')]: 'o1' } },
  )
  assert.equal(result.decision, 'automatic')
  assert.equal(result.via, 'store-id')
  assert.equal(result.outlet?.id, 'o1')
})

test('a distant name is rejected rather than offered as a candidate', () => {
  const result = matchSourceStore(store('pos', 'Kota Kinabalu Waterfront'), directory([GREENLANE, SS15]))
  assert.equal(result.decision, 'reject')
  assert.equal(result.outlet, null)
  assert.deepEqual(result.candidates, [])
})

test('a middling match goes to review with its candidates, never mapped silently', () => {
  const result = matchSourceStore(store('pos', 'Greenlan'), directory([GREENLANE, SS15]))
  assert.equal(result.decision, 'review')
  assert.equal(result.outlet, null)
  assert.equal(result.candidates[0].outlet.id, 'o1')
  assert.ok(result.candidates[0].score >= 0.85 && result.candidates[0].score < 0.96)
})

test('a near-exact fuzzy match only suggests — it never auto-maps or auto-persists', () => {
  // A close misspelling scores well, yet must still be a review suggestion, not
  // a silent financial identity decision.
  const result = matchSourceStore(store('pos', 'Greenlanes'), directory([GREENLANE, SS15]))
  assert.equal(result.decision, 'review')
  assert.equal(result.outlet, null)
  assert.ok(result.candidates[0].score >= 0.85, 'the name should score highly, yet still not auto-map')
  assert.notEqual(result.via, 'fuzzy')
})

test('Rawang never lands on Senawang, and Sepang never lands on Ampang', () => {
  const senawang = outlet('o-senawang', 'Senawang', 'MY-013')
  const ampang = outlet('o-ampang', 'Ampang', 'MY-002')
  const dir = directory([senawang, ampang])
  // Without an approved variant or alias these are review suggestions only.
  const rawang = matchSourceStore(store('pos', 'US Pizza Rawang'), dir)
  assert.notEqual(rawang.outlet?.id, 'o-senawang', 'Rawang must never map to Senawang')
  const sepang = matchSourceStore(store('foodpanda', 'US PIZZA (Sepang)'), dir)
  assert.notEqual(sepang.outlet?.id, 'o-ampang', 'Sepang must never map to Ampang')
})

test('two equally close outlets are a tie a person resolves', () => {
  const twins = directory([outlet('o1', 'Taman Desa 1'), outlet('o2', 'Taman Desa 2')])
  const result = matchSourceStore(store('pos', 'Taman Desa'), twins)
  assert.equal(result.decision, 'review')
  assert.equal(result.outlet, null)
  assert.equal(result.candidates.length, 2)
})

test('sister brands are excluded, not queued for review', () => {
  const result = matchSourceStore(store('grab', 'The Manhattan FISH MARKET - Greenlane'), directory([GREENLANE]))
  assert.equal(result.decision, 'excluded')
  assert.equal(result.outlet, null)
})

test('an empty directory rejects everything instead of inventing an outlet', () => {
  const result = matchSourceStore(store('pos', 'Greenlane'), directory([]))
  assert.equal(result.decision, 'reject')
  assert.equal(result.outlet, null)
})

test('the summary counts stores and the rows each decision keeps or holds back', () => {
  const results = matchSourceStores([
    store('pos', 'Greenlane', { dailyRows: 30 }),
    store('pos', 'US Pizza SS 15', { dailyRows: 28 }),
    store('pos', 'Greenlan', { dailyRows: 5 }),
    store('pos', 'Somewhere Unknown Entirely', { dailyRows: 3 }),
    store('pos', 'The Manhattan FISH MARKET - Greenlane', { dailyRows: 9 }),
  ], directory([GREENLANE, SS15, DPULZE]))
  const summary = summarizeMatches(results)
  assert.equal(summary.stores, 5)
  assert.equal(summary.automatic, 2)
  assert.equal(summary.review, 1)
  assert.equal(summary.rejected, 1)
  assert.equal(summary.excluded, 1)
  assert.equal(summary.mappedRows, 58)
  assert.equal(summary.heldRows, 17, 'held rows must stay visible rather than silently vanish')
})
