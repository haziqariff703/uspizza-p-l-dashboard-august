import { getSupabaseClient } from './supabase'

/** Roles from IMPLEMENTATION_GUIDE.md, least to most privileged. */
export const ORG_ROLES = ['viewer', 'preparer', 'reviewer', 'approver', 'admin'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

/**
 * The schema contract this build is written against, from
 * `supabase/APP_CONTRACT.md`. Intake stays disabled unless the database agrees,
 * because the older flow it would otherwise fall back to writes daily totals
 * directly and bypasses review.
 */
export const REQUIRED_CONTRACT_VERSION = '2026-09-16-v1'

export interface Membership { organizationId: string; organizationName: string; role: OrgRole }
export interface RosterEntry { userId: string; email: string; role: OrgRole; status: string }
export interface PendingInvitation { id: string; email: string; role: OrgRole; expiresAt: string }
export interface ReportingPeriod { id: string; startDate: string; endDate: string; status: string }

export const canImport = (role?: OrgRole) => role === 'preparer' || role === 'admin'
export const canManageMembers = (role?: OrgRole) => role === 'admin'
/** Reviewing and publishing also require not being the uploader; the database enforces that. */
export const canReview = (role?: OrgRole) => role === 'reviewer' || role === 'approver' || role === 'admin'
export const canPublish = (role?: OrgRole) => role === 'approver' || role === 'admin'

/**
 * Whether this database speaks the contract this build implements. Any error,
 * missing function or different version means read-only: never fall back to the
 * unsafe direct-to-`sales_daily` import path.
 */
export async function loadContractVersion(): Promise<{ version: string | null; compatible: boolean }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('sales_import_contract_version')
    if (error) throw error
    const version = typeof data === 'string' ? data : null
    return { version, compatible: version === REQUIRED_CONTRACT_VERSION }
  } catch {
    return { version: null, compatible: false }
  }
}

/**
 * Every organization this user is active in. The caller selects one explicitly —
 * the first membership is not a tenant selector, and every financial query is
 * filtered by the selected organization_id.
 */
export async function loadMemberships(): Promise<Membership[]> {
  const supabase = getSupabaseClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return []

  // An invitation becomes a membership the first time that person signs in.
  const { error: acceptError } = await supabase.rpc('accept_pending_invitations')
  if (acceptError) throw acceptError

  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name)')
    .eq('user_id', auth.user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  if (error) throw error

  return (data ?? []).flatMap((row: { role: OrgRole; organizations: unknown }) => {
    // PostgREST returns an embedded row as an object, or an array on some versions.
    const organization = (Array.isArray(row.organizations) ? row.organizations[0] : row.organizations) as
      { id: string; name: string } | null
    return organization ? [{ organizationId: organization.id, organizationName: organization.name, role: row.role }] : []
  })
}

export async function createOrganization(name: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('create_organization', { org_name: name })
  if (error) throw error
}

/**
 * The open period that covers the whole reporting month. An import cannot be
 * created without one — the database checks the same thing — so the UI asks an
 * approver to open the period rather than failing at upload time.
 */
export async function loadOpenPeriod(organizationId: string, reportingMonth: string): Promise<ReportingPeriod | null> {
  const monthStart = `${reportingMonth}-01`
  const start = new Date(`${monthStart}T00:00:00`)
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  const monthEndIso = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`

  const { data, error } = await getSupabaseClient()
    .from('reporting_periods')
    .select('id, start_date, end_date, status')
    .eq('organization_id', organizationId)
    .eq('status', 'open')
    .lte('start_date', monthStart)
    .gte('end_date', monthEndIso)
    .order('start_date', { ascending: true })
    .limit(1)
  if (error) throw error

  const row = data?.[0] as { id: string; start_date: string; end_date: string; status: string } | undefined
  return row ? { id: row.id, startDate: row.start_date, endDate: row.end_date, status: row.status } : null
}

export async function loadRoster(organizationId: string) {
  const supabase = getSupabaseClient()
  const [roster, invitations] = await Promise.all([
    supabase.rpc('organization_roster', { org: organizationId }),
    supabase
      .from('organization_invitations')
      .select('id, email, role, expires_at')
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .order('created_at', { ascending: true }),
  ])
  if (roster.error) throw roster.error
  if (invitations.error) throw invitations.error
  return {
    members: ((roster.data ?? []) as Array<Record<string, string>>).map(m => ({
      userId: m.user_id, email: m.email, role: m.role as OrgRole, status: m.status,
    })) satisfies RosterEntry[],
    invitations: ((invitations.data ?? []) as Array<Record<string, string>>).map(i => ({
      id: i.id, email: i.email, role: i.role as OrgRole, expiresAt: i.expires_at,
    })) satisfies PendingInvitation[],
  }
}

export async function inviteMember(organizationId: string, email: string, role: OrgRole) {
  const { error } = await getSupabaseClient()
    .from('organization_invitations')
    .insert({ organization_id: organizationId, email: email.trim().toLowerCase(), role })
  if (error) throw error
}

export async function cancelInvitation(id: string) {
  const { error } = await getSupabaseClient().from('organization_invitations').delete().eq('id', id)
  if (error) throw error
}

const SELECTED_ORG_KEY = 'us-pizza-selected-organization-v1'

/** Remembered per signed-in user, so one person's choice never leaks to another. */
export const readSelectedOrganization = (userId: string): string | null => {
  try { return localStorage.getItem(`${SELECTED_ORG_KEY}:${userId}`) } catch { return null }
}
export const writeSelectedOrganization = (userId: string, organizationId: string) => {
  try { localStorage.setItem(`${SELECTED_ORG_KEY}:${userId}`, organizationId) } catch { /* private window */ }
}
