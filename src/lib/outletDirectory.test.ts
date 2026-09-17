import assert from 'node:assert/strict'
import { test } from 'node:test'
import { directoryKey, resolveAlias, type OutletDirectory } from './outletDirectory'

const directory: OutletDirectory = {
  outlets: [{ id: 'outlet-1', name: 'Greenlane', code: 'MY-020', entity: 'MY US PIZZA SDN BHD' }],
  aliases: { [directoryKey('grab', "Marshall's Co - Greenlane")]: 'outlet-1' },
}

test('alias matching ignores case and repeated whitespace', () => {
  assert.equal(resolveAlias(directory, 'grab', "  MARSHALL'S CO  -  GREENLANE ")?.id, 'outlet-1')
  assert.equal(resolveAlias(directory, 'GRAB', "marshall's co - greenlane")?.id, 'outlet-1')
})

test('an alias belongs to one source only, and an unmapped name resolves to nothing', () => {
  assert.equal(resolveAlias(directory, 'pos', "Marshall's Co - Greenlane"), undefined)
  assert.equal(resolveAlias(directory, 'grab', 'Greenlane'), undefined, 'the canonical name is not an implicit alias')
  assert.equal(resolveAlias(directory, 'grab', 'US Pizza Greenlane'), undefined)
})
