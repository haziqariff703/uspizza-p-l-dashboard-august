import React, { useCallback, useEffect, useState } from 'react'
import { Building, Community, WarningTriangle } from 'iconoir-react'
import {
  cancelInvitation, canManageMembers, createOrganization, inviteMember, loadRoster,
  ORG_ROLES, REQUIRED_CONTRACT_VERSION, type OrgRole, type PendingInvitation, type RosterEntry,
} from '../../lib/organization'
import { type OrganizationScope } from '../../lib/useOrganizationScope'

interface Props {
  scope: OrganizationScope
  onChange: () => void
}

export const OrganizationControl: React.FC<Props> = ({ scope, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [members, setMembers] = useState<RosterEntry[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('preparer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const membership = scope.selected
  const organizationId = membership?.organizationId ?? null

  // The roster belongs to one organization; switching must not show the previous one's.
  useEffect(() => {
    let active = true
    setMembers([])
    setInvitations([])
    if (!organizationId) return
    const load = async () => {
      try {
        const roster = await loadRoster(organizationId)
        if (!active) return
        setMembers(roster.members)
        setInvitations(roster.invitations)
        setError('')
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load the member list.')
      }
    }
    void load()
    return () => { active = false }
  }, [organizationId])

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      scope.reload()
      onChange()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That did not work. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [onChange, scope])

  if (scope.status === 'loading' || scope.status === 'signed-out' || scope.status === 'unconfigured') return null

  return <div className="relative">
    <button type="button" onClick={() => setIsOpen(open => !open)}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
      {scope.contract.compatible ? <Building className="h-3.5 w-3.5" /> : <WarningTriangle className="h-3.5 w-3.5 text-amber-600" />}
      {membership ? <span className="max-w-40 truncate">{membership.organizationName} · {membership.role}</span> : 'No organization'}
    </button>

    {isOpen && <div className="absolute right-0 z-20 mt-2 w-96 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl">
      {!scope.contract.compatible && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
        <span className="font-bold">Importing is disabled.</span> This dashboard expects database contract
        {' '}{REQUIRED_CONTRACT_VERSION}{scope.contract.version ? `, but the database reports ${scope.contract.version}` : ', which this database does not report'}.
        Apply the migrations in <span className="font-mono">supabase/README.md</span>. Figures already published stay readable.
      </p>}

      {scope.memberships.length > 1 && <label className="mb-3 block text-xs font-bold text-slate-700">Organization
        <select value={membership?.organizationId ?? ''} onChange={event => scope.select(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          {scope.memberships.map(option => <option key={option.organizationId} value={option.organizationId}>
            {option.organizationName} · {option.role}
          </option>)}
        </select>
      </label>}

      {!membership ? <>
        <p className="font-black text-slate-900">You are not in an organization yet</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Signing in does not give access to any figures. Ask an admin to invite this
          email address, or start an organization and become its admin.
        </p>
        <label className="mt-3 block text-xs font-bold text-slate-700">Organization name
          <input value={name} onChange={e => setName(e.target.value)} placeholder="US Pizza Malaysia"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#C8102E]" />
        </label>
        <button type="button" disabled={busy || !name.trim()} onClick={() => void run(() => createOrganization(name))}
          className="mt-3 w-full rounded-lg bg-[#C8102E] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
          {busy ? 'Creating…' : 'Create organization'}
        </button>
      </> : <>
        <p className="font-black text-slate-900">{membership.organizationName}</p>
        <p className="mt-0.5 text-xs text-slate-600">You are {membership.role === 'admin' ? 'an' : 'a'} {membership.role}.</p>

        <p className="mt-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <Community className="h-3.5 w-3.5" />Members
        </p>
        <ul className="mt-1.5 divide-y divide-slate-100">
          {members.map(member => <li key={member.userId} className="flex items-center justify-between gap-3 py-1.5 text-xs">
            <span className="truncate text-slate-700">{member.email}</span>
            <span className="shrink-0 font-bold text-slate-500">{member.role}</span>
          </li>)}
        </ul>

        {invitations.length > 0 && <>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Invited, not signed in yet</p>
          <ul className="mt-1.5 divide-y divide-slate-100">
            {invitations.map(invitation => <li key={invitation.id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
              <span className="truncate text-slate-700">{invitation.email} · {invitation.role}</span>
              {canManageMembers(membership.role) && <button type="button" disabled={busy}
                onClick={() => void run(() => cancelInvitation(invitation.id))}
                className="shrink-0 font-bold text-[#C8102E] hover:underline disabled:opacity-50">Cancel</button>}
            </li>)}
          </ul>
        </>}

        {canManageMembers(membership.role) && <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Invite someone</p>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@uspizza.com"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#C8102E]" />
            <select value={role} onChange={e => setRole(e.target.value as OrgRole)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
              {ORG_ROLES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            An import must be reviewed by someone who did not upload it, so a single-person
            organization cannot publish figures.
          </p>
          <button type="button" disabled={busy || !email.includes('@')}
            onClick={() => void run(() => inviteMember(membership.organizationId, email, role).then(() => setEmail('')))}
            className="mt-2 w-full rounded-lg bg-[#0B192C] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? 'Saving…' : 'Send invitation'}
          </button>
        </div>}
      </>}
      {(error || scope.error) && <p role="alert" className="mt-3 text-xs font-medium text-red-700">{error || scope.error}</p>}
    </div>}
  </div>
}
