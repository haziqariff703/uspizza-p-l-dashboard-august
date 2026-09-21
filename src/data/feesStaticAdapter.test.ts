import assert from 'node:assert/strict'
import test from 'node:test'
import { MAY_REPORTING_MONTH, isMayMonth, mayFeesViewModel, staticCategoryTotal } from './feesStaticAdapter'
import { COMMISSION_FEES_SUMMARY } from './outletData'

test('section 2 static: May is the only month the May adapter accepts', () => {
  assert.equal(MAY_REPORTING_MONTH, '2026-05')
  assert.equal(isMayMonth('2026-05'), true)
  assert.equal(isMayMonth('2026-08'), false)
})

test('section 2 static: every demo cell is known, including explicit zeros', () => {
  const model = mayFeesViewModel()
  for (const entry of model.platforms) {
    for (const cell of Object.values(entry.cells)) {
      assert.equal(cell.state, 'known', `${entry.platform} cell should be known`)
      assert.notEqual(cell.value, null)
    }
  }
  // Apps genuinely has zero fee categories; a known zero must stay RM 0.00,
  // not become Unavailable.
  const apps = model.platforms.find(entry => entry.platform === 'Apps')!
  assert.equal(apps.cells.commission.value, '0')
  assert.equal(apps.cells.commission.state, 'known')
})

test('section 2 static: platform totals match the captured summary exactly', () => {
  const model = mayFeesViewModel()
  for (const entry of model.platforms) {
    const expected = COMMISSION_FEES_SUMMARY.platforms[entry.platform].totalFees
    assert.equal(entry.total.value, String(expected))
    assert.equal(entry.total.state, 'known')
  }
  const total = model.matrix.commission.Total.value
  assert.equal(total, String(COMMISSION_FEES_SUMMARY.platforms.Total.commission))
})

test('section 2 static: the Total column carries the captured totals verbatim', () => {
  // The capture's Total for commission (635,023) does not foot exactly from the
  // four platform columns (635,022) — a known ±1 rounding artefact of the demo
  // source. The adapter must carry the captured Total, never recompute it and
  // silently overwrite the source with a "corrected" figure.
  for (const key of ['commission', 'advertising', 'platformFees', 'paymentGateway', 'adjustments'] as const) {
    assert.equal(mayFeesViewModel().matrix[key].Total.value, String(COMMISSION_FEES_SUMMARY.platforms.Total[key]))
  }
  assert.equal(staticCategoryTotal('advertising'), String(COMMISSION_FEES_SUMMARY.platforms.Total.advertising))
  assert.equal(staticCategoryTotal('platformFees'), String(COMMISSION_FEES_SUMMARY.platforms.Total.platformFees))
  assert.equal(staticCategoryTotal('paymentGateway'), String(COMMISSION_FEES_SUMMARY.platforms.Total.paymentGateway))
  assert.equal(staticCategoryTotal('adjustments'), String(COMMISSION_FEES_SUMMARY.platforms.Total.adjustments))
})

test('section 2 static: credits stay signed and negative', () => {
  const model = mayFeesViewModel()
  const foodpanda = model.platforms.find(entry => entry.platform === 'FoodPanda')!
  assert.equal(foodpanda.cells.adjustments.value, '-27693')
  assert.equal(model.matrix.adjustments.Total.value, '-15077')
})

test('section 2 static: commission rates are present, and Apps has none', () => {
  const model = mayFeesViewModel()
  const grab = model.platforms.find(entry => entry.platform === 'Grab')!
  assert.equal(grab.commissionRate.state, 'known')
  assert.equal(grab.commissionRate.value, '29.8%')
  const apps = model.platforms.find(entry => entry.platform === 'Apps')!
  assert.equal(apps.commissionRate.state, 'none')
  assert.equal(apps.commissionRate.value, null)
})

test('section 2 static: May carries a complete, gated reconciliation', () => {
  const model = mayFeesViewModel()
  assert.equal(model.reconciliation.kind, 'open')
  if (model.reconciliation.kind === 'open') {
    assert.equal(model.reconciliation.reportedFees, String(COMMISSION_FEES_SUMMARY.totalFeesMonth))
  }
})

test('section 2 static: POS is not a fee column', () => {
  const model = mayFeesViewModel()
  assert.equal(model.platforms.some(entry => (entry.platform as string) === 'POS'), false)
})
