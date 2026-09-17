import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  APPROVED_OUTLET_VARIANTS, planOutletMappings, summarizePlan, type ApprovedVariantRule,
} from './outletPlanner'
import { directoryKey, type OutletDirectory, type DirectoryOutlet } from './outletDirectory'
import type { SourceStore } from './outletMatcher'

const outlet = (id: string, name: string, code: string): DirectoryOutlet => ({
  id, name, code, entity: 'MY US PIZZA SDN BHD',
})
const store = (source: SourceStore['source'], name: string, dailyRows = 1): SourceStore =>
  ({ source, name, dailyRows })

/** A directory with the outlets the four approved rules depend on. */
const directory = (outlets: DirectoryOutlet[], aliases: Record<string, string> = {}): OutletDirectory =>
  ({ outlets, aliases })

const ANGGUN = outlet('o-anggun', 'Anggun City', 'MY-041')
const KOTA_WARISAN = outlet('o-kota-warisan', 'Kota Warisan', 'MY-009')
const TAMAN_CONNAUGHT = outlet('o-connaught', 'Taman Connaught', 'MY-051')
const KOTA_DAMANSARA = outlet('o-damansara', 'Kota Damansara', 'MY-081')
const SENAWANG = outlet('o-senawang', 'Senawang', 'MY-013')
const AMPANG = outlet('o-ampang', 'Ampang', 'MY-002')
const GREENLANE = outlet('o-greenlane', 'Greenlane', 'MY-020')

const FULL = directory([ANGGUN, KOTA_WARISAN, TAMAN_CONNAUGHT, KOTA_DAMANSARA, SENAWANG, AMPANG, GREENLANE])

test('Rawang maps to MY-041 Anggun City across its approved sources', () => {
  for (const source of ['pos', 'grab', 'foodpanda', 'shopee', 'apps'] as const) {
    const rule = APPROVED_OUTLET_VARIANTS.find(r => r.canonicalCode === 'MY-041')!
    for (const name of rule.sourceNames[source] ?? []) {
      const plan = planOutletMappings([store(source, name)], FULL)
      assert.equal(plan.stores[0].decision, 'automatic', `${source} ${name} should map automatically`)
      assert.equal(plan.stores[0].outlet?.code, 'MY-041', `${source} ${name} must land on MY-041`)
      assert.equal(plan.stores[0].via, 'approved-variant')
    }
  }
})

test('Rawang never maps to MY-013 Senawang, even with Senawang present', () => {
  const plan = planOutletMappings([store('pos', 'US Pizza Rawang')], FULL)
  assert.equal(plan.stores[0].outlet?.code, 'MY-041')
  assert.notEqual(plan.stores[0].outlet?.code, 'MY-013')
})

test('Sepang maps to MY-009 Kota Warisan and never to MY-002 Ampang', () => {
  for (const source of ['grab', 'foodpanda', 'shopee', 'apps'] as const) {
    const rule = APPROVED_OUTLET_VARIANTS.find(r => r.canonicalCode === 'MY-009')!
    for (const name of rule.sourceNames[source] ?? []) {
      const plan = planOutletMappings([store(source, name)], FULL)
      assert.equal(plan.stores[0].decision, 'automatic')
      assert.equal(plan.stores[0].outlet?.code, 'MY-009', `${source} ${name} must land on MY-009`)
      assert.notEqual(plan.stores[0].outlet?.code, 'MY-002')
    }
  }
})

test('Taman Connaught (incl. the Cheras variant) maps to MY-051', () => {
  const plan = planOutletMappings([store('apps', 'US PIZZA - Taman Connaught, Cheras')], FULL)
  assert.equal(plan.stores[0].decision, 'automatic')
  assert.equal(plan.stores[0].outlet?.code, 'MY-051')
})

test('Kota Damansara maps to MY-081', () => {
  const plan = planOutletMappings([store('grab', 'US Pizza - Kota Damansara')], FULL)
  assert.equal(plan.stores[0].decision, 'automatic')
  assert.equal(plan.stores[0].outlet?.code, 'MY-081')
})

test('a unique normalized canonical outlet name maps automatically without any alias', () => {
  const plan = planOutletMappings([store('pos', 'US Pizza (Greenlane)')], FULL)
  assert.equal(plan.stores[0].decision, 'automatic')
  assert.equal(plan.stores[0].via, 'canonical-name')
  assert.equal(plan.stores[0].outlet?.id, 'o-greenlane')
})

test('an existing source-specific alias maps automatically and idempotently', () => {
  const dir = directory([GREENLANE], { [directoryKey('grab', "Marshall's Co - Greenlane")]: 'o-greenlane' })
  const plan = planOutletMappings([store('grab', "Marshall's Co - Greenlane")], dir)
  assert.equal(plan.stores[0].decision, 'automatic')
  assert.equal(plan.stores[0].via, 'alias')
  assert.equal(plan.existing.length, 1)
  assert.equal(plan.approved.length, 0, 'an existing alias needs nothing persisted')
})

test('aliases never leak between sources', () => {
  const dir = directory([GREENLANE], { [directoryKey('grab', 'Warung 41')]: 'o-greenlane' })
  const asPos = planOutletMappings([store('pos', 'Warung 41')], dir)
  assert.notEqual(asPos.stores[0].decision, 'automatic')
  assert.equal(asPos.stores[0].outlet, null)
})

test('fuzzy matches only suggest — they never auto-map or persist', () => {
  const plan = planOutletMappings([store('pos', 'Greenlanes')], FULL)
  assert.equal(plan.stores[0].decision, 'review')
  assert.equal(plan.stores[0].outlet, null)
  assert.equal(plan.approved.length, 0)
  assert.ok(plan.stores[0].candidates.length > 0)
})

test('a missing canonical outlet blocks the corresponding approved alias', () => {
  // Directory has everything except Anggun City.
  const withoutAnggun = directory([KOTA_WARISAN, TAMAN_CONNAUGHT, KOTA_DAMANSARA, SENAWANG, AMPANG, GREENLANE])
  const plan = planOutletMappings([store('pos', 'US Pizza Rawang')], withoutAnggun)
  assert.equal(plan.stores[0].decision, 'missing-outlet')
  assert.equal(plan.stores[0].missingCanonical?.code, 'MY-041')
  assert.equal(plan.missing.length, 1)
})

test('a conflicting alias is surfaced, not silently accepted', () => {
  // The stored alias says Rawang → Senawang, but the approved rule says Anggun City.
  const dir = directory([ANGGUN, SENAWANG], { [directoryKey('pos', 'US Pizza Rawang')]: 'o-senawang' })
  const plan = planOutletMappings([store('pos', 'US Pizza Rawang')], dir)
  // The alias wins for mapping (a person confirmed it), but the disagreement is reported.
  assert.equal(plan.stores[0].via, 'alias')
  assert.equal(plan.conflicts.length, 1)
  assert.equal(plan.conflicts[0].existingOutletId, 'o-senawang')
  assert.equal(plan.conflicts[0].resolvedOutletId, 'o-anggun')
})

test('Lucerne and other uncertain names remain unresolved without an approved alias', () => {
  const lucerne = outlet('o-lucerne', 'Lucerne Residence Penang', 'MY-078')
  const dir = directory([lucerne, GREENLANE])
  const plan = planOutletMappings([
    store('foodpanda', 'US Pizza (Lucerne Square)'),
    store('pos', 'US Pizza Kota Masai'),
    store('apps', 'US Pizza - Lotus Ampang'),
    store('grab', 'US Pizza - Selayang'),
    store('grab', 'US Pizza - Bangi'),
  ], dir)
  for (const planned of plan.stores) {
    assert.equal(planned.decision, 'review', `${planned.store.name} must stay unresolved`)
    assert.equal(planned.outlet, null)
  }
})

test('unknown names stay visible for review, not silently excluded', () => {
  const plan = planOutletMappings([store('pos', 'Some Brand New Outlet')], FULL)
  assert.equal(plan.stores[0].decision, 'review')
  assert.equal(plan.unresolved.length, 1)
  assert.equal(plan.excluded.length, 0)
})

test('sister brands are excluded, not queued for review', () => {
  const plan = planOutletMappings([store('grab', 'The Manhattan FISH MARKET - Greenlane')], FULL)
  assert.equal(plan.stores[0].decision, 'excluded')
  assert.equal(plan.excluded.length, 1)
})

test('held-back rows are absent from eligible totals', () => {
  const plan = planOutletMappings([
    store('pos', 'US Pizza Rawang', 30),           // automatic
    store('pos', 'Greenlanes', 5),                 // review
    store('pos', 'The Manhattan FISH MARKET', 9),  // excluded
    store('pos', '', 3),                           // invalid
  ], FULL)
  const summary = summarizePlan(plan)
  assert.equal(summary.eligibleRows, 30)
  assert.equal(summary.heldRows, 17)
})

test('the summary separates every count the UI must show', () => {
  const plan = planOutletMappings([
    store('pos', 'US Pizza Rawang'),
    store('pos', 'Greenlanes'),
    store('pos', 'The Manhattan FISH MARKET'),
    store('pos', ''),
    store('grab', 'US Pizza - Kota Damansara'),
  ], FULL)
  const summary = summarizePlan(plan)
  assert.equal(summary.stores, 5)
  assert.equal(summary.automatic, 2)
  assert.equal(summary.review, 1)
  assert.equal(summary.excluded, 1)
  assert.equal(summary.invalid, 1)
  assert.equal(summary.missing, 0)
})

test('the approved variant table pins the four Finance-approved mappings', () => {
  const codes = APPROVED_OUTLET_VARIANTS.map(rule => rule.canonicalCode).sort()
  assert.deepEqual(codes, ['MY-009', 'MY-041', 'MY-051', 'MY-081'])
  const byCode = new Map<ApprovedVariantRule['canonicalCode'], ApprovedVariantRule>(
    APPROVED_OUTLET_VARIANTS.map(rule => [rule.canonicalCode, rule]),
  )
  assert.equal(byCode.get('MY-041')?.canonicalName, 'Anggun City')
  assert.equal(byCode.get('MY-009')?.canonicalName, 'Kota Warisan')
  assert.equal(byCode.get('MY-051')?.canonicalName, 'Taman Connaught')
  assert.equal(byCode.get('MY-081')?.canonicalName, 'Kota Damansara')
})
