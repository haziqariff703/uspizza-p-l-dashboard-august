import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from './supabase'
import {
  loadContractVersion, loadMemberships, readSelectedOrganization, writeSelectedOrganization,
  REQUIRED_CONTRACT_VERSION, type Membership,
} from './organization'

export interface OrganizationScope {
  status: 'loading' | 'unconfigured' | 'signed-out' | 'no-organization' | 'ready' | 'error'
  /** Null version means the check failed or the function is absent. */
  contract: { version: string | null; compatible: boolean }
  memberships: Membership[]
  /** The one organization every query in the app is filtered by. */
  selected: Membership | null
  userId: string | null
  error: string
  select: (organizationId: string) => void
  reload: () => void
}

/**
 * Owns identity for the dashboard: who is signed in, which organization they
 * have selected, and whether the database speaks the contract this build
 * implements.
 *
 * Callers key their own caches on `scopeKey(scope, month)` so that figures
 * belonging to one organization, account or month can never be shown under
 * another heading — the contract is explicit that stale data may only survive a
 * transient refresh failure within the *same* user, organization and month.
 */
export function useOrganizationScope(sessionToken: number): OrganizationScope {
  const [status, setStatus] = useState<OrganizationScope['status']>('loading')
  const [contract, setContract] = useState<OrganizationScope['contract']>({ version: null, compatible: false })
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  // Guards against a slow response from a previous identity overwriting a newer one.
  const requestRef = useRef(0)

  useEffect(() => {
    const request = ++requestRef.current
    const stale = () => request !== requestRef.current

    const load = async () => {
      let supabase
      try {
        supabase = getSupabaseClient()
      } catch {
        if (!stale()) { setStatus('unconfigured'); setMemberships([]); setSelectedId(null); setUserId(null) }
        return
      }
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (stale()) return
        if (!auth.user) {
          // Signing out must drop every figure and mapping from the previous identity.
          setStatus('signed-out'); setMemberships([]); setSelectedId(null); setUserId(null); setContract({ version: null, compatible: false })
          return
        }
        setUserId(auth.user.id)

        const version = await loadContractVersion()
        if (stale()) return
        setContract(version)

        const found = await loadMemberships()
        if (stale()) return
        setMemberships(found)
        if (!found.length) { setSelectedId(null); setStatus('no-organization'); return }

        const remembered = readSelectedOrganization(auth.user.id)
        const chosen = found.find(m => m.organizationId === remembered) ?? found[0]
        setSelectedId(chosen.organizationId)
        setStatus('ready')
        setError('')
      } catch (caught) {
        if (stale()) return
        setStatus('error')
        setError(caught instanceof Error ? caught.message : 'Could not confirm your organization membership.')
      }
    }
    void load()
    return () => { requestRef.current++ }
  }, [sessionToken, reloadToken])

  const select = useCallback((organizationId: string) => {
    setSelectedId(organizationId)
    if (userId) writeSelectedOrganization(userId, organizationId)
  }, [userId])

  return {
    status,
    contract,
    memberships,
    selected: memberships.find(m => m.organizationId === selectedId) ?? null,
    userId,
    error,
    select,
    reload: () => setReloadToken(token => token + 1),
  }
}

/**
 * Identity for a cache entry. Any change to user, organization or month is a
 * different scope and must load its own data rather than reusing another's.
 */
export const scopeKey = (scope: OrganizationScope, reportingMonth: string) =>
  `${scope.userId ?? 'anonymous'}|${scope.selected?.organizationId ?? 'none'}|${reportingMonth}`

export const CONTRACT_MISMATCH_MESSAGE =
  `This dashboard expects database contract ${REQUIRED_CONTRACT_VERSION}. Importing is disabled until `
  + 'the Supabase migrations in supabase/README.md have been applied, because the older import path '
  + 'wrote daily totals straight to the dashboard without review.'
