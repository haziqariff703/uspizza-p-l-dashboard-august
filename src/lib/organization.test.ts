import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canImport, canManageMembers, ORG_ROLES } from './organization'

// Pins the role table in IMPLEMENTATION_GUIDE.md. The database enforces this
// too; this catches the app offering an action the database would then refuse.
test('only a preparer or admin may import, and only an admin may manage members', () => {
  assert.deepEqual(ORG_ROLES.filter(canImport), ['preparer', 'admin'])
  assert.deepEqual(ORG_ROLES.filter(canManageMembers), ['admin'])
  // A signed-in user with no membership has no role and no permissions.
  assert.equal(canImport(undefined), false)
  assert.equal(canManageMembers(undefined), false)
})
