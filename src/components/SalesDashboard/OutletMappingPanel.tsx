import React, { useState } from 'react'
import { ENTITY_NAMES } from '../../data/aggregate'
import { getSupabaseClient } from '../../lib/supabase'
import {
  ALIAS_SOURCES, directoryKey, resolveAlias, type AliasSource, type OutletDirectory,
} from '../../lib/outletDirectory'

interface Props {
  directory: OutletDirectory
  /** Source names an import could not resolve. Empty when nothing is pending. */
  unresolved?: Array<{ source: string; name: string }>
  /** Called after a successful write so the caller reloads the directory. */
  onChange: () => void
  defaultOpen?: boolean
}

const ENTITY_OPTIONS = Object.values(ENTITY_NAMES)

export function OutletMappingPanel({ directory, unresolved = [], onChange, defaultOpen = false }: Props) {
  const [source, setSource] = useState<AliasSource>('pos')
  const [alias, setAlias] = useState('')
  const [target, setTarget] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [entity, setEntity] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const aliasesByOutlet = new Map<string, string[]>()
  for (const [key, outletId] of Object.entries(directory.aliases)) {
    aliasesByOutlet.set(outletId, [...(aliasesByOutlet.get(outletId) ?? []), key])
  }

  const reset = () => { setAlias(''); setTarget(''); setName(''); setCode(''); setEntity(''); setError('') }

  const save = async () => {
    const trimmedAlias = alias.trim()
    if (!trimmedAlias) return setError('Enter the source outlet name exactly as the report writes it.')
    if (!target) return setError('Choose the canonical outlet this name belongs to.')
    if (directory.aliases[directoryKey(source, trimmedAlias)]) {
      return setError('This source name is already mapped. Change it in the database, or use a different name.')
    }
    setIsSaving(true)
    setError('')
    try {
      const supabase = getSupabaseClient()
      let outletId = target
      if (target === 'new') {
        if (!name.trim() || !code.trim() || !entity) {
          throw new Error('A new outlet needs an explicit name, code and entity. Nothing is assumed.')
        }
        const { data, error: outletError } = await supabase.from('outlets')
          .insert({ name: name.trim(), code: code.trim(), entity, status: 'active' })
          .select('id')
          .single()
        if (outletError) throw outletError
        outletId = (data as { id: string }).id
      }
      const { error: aliasError } = await supabase.from('outlet_aliases')
        .insert({ outlet_id: outletId, source, alias: trimmedAlias })
      if (aliasError) throw aliasError
      reset()
      onChange()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The mapping could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  return <details open={defaultOpen || unresolved.length > 0} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
    <summary className="cursor-pointer font-semibold">
      Outlet mappings · {directory.outlets.length} outlets · {unresolved.length} source names unresolved
    </summary>
    <p className="my-3 text-slate-600">
      Outlets and their source aliases are stored in Supabase, not in this browser. A source name with no alias
      is never guessed and its totals are not imported until you map it here.
    </p>

    {unresolved.length > 0 && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="font-semibold text-amber-900">These source names have no alias yet</p>
      <ul className="mt-2 space-y-1">
        {unresolved.map(item => <li key={`${item.source}:${item.name}`}>
          <button
            type="button"
            className="text-left text-amber-900 underline underline-offset-2"
            onClick={() => { setSource(item.source as AliasSource); setAlias(item.name); setError('') }}
          >{item.source} · {item.name}</button>
        </li>)}
      </ul>
    </div>}

    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1">Source
        <select aria-label="Alias source" className="w-full rounded border border-slate-300 p-2" value={source} onChange={e => setSource(e.target.value as AliasSource)}>
          {ALIAS_SOURCES.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="grid gap-1">Source outlet name
        <input aria-label="Source outlet name" className="w-full rounded border border-slate-300 p-2" value={alias} onChange={e => setAlias(e.target.value)} />
      </label>
      <label className="grid gap-1">Canonical outlet
        <select aria-label="Canonical outlet" className="w-full rounded border border-slate-300 p-2" value={target} onChange={e => { setTarget(e.target.value); setError('') }}>
          <option value="">Choose the matching outlet</option>
          {directory.outlets.map(o => <option key={o.id} value={o.id}>{o.name}{o.code ? ` · ${o.code}` : ''}</option>)}
          <option value="new">Register a new outlet…</option>
        </select>
      </label>
      {alias.trim() && <p className="self-end text-slate-600">
        Currently: {resolveAlias(directory, source, alias)?.name ?? 'Unmapped'}
      </p>}
      {target === 'new' && <>
        <label className="grid gap-1">New outlet name<input className="rounded border border-slate-300 p-2" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="grid gap-1">Outlet code<input className="rounded border border-slate-300 p-2" value={code} onChange={e => setCode(e.target.value)} /></label>
        <label className="grid gap-1">Entity
          <select className="rounded border border-slate-300 p-2" value={entity} onChange={e => setEntity(e.target.value)}>
            <option value="">Choose the legal entity</option>
            {ENTITY_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </>}
    </div>

    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
    <button type="button" disabled={isSaving || !alias.trim() || !target} onClick={() => void save()} className="mt-3 rounded bg-[#C8102E] px-4 py-2 font-semibold text-white disabled:opacity-40">
      {isSaving ? 'Saving…' : 'Save mapping'}
    </button>

    <table className="mt-4 w-full text-left text-xs">
      <thead><tr><th className="py-2">Outlet</th><th>Entity</th><th>Source aliases</th></tr></thead>
      <tbody>
        {directory.outlets.map(outlet => <tr key={outlet.id} className="border-t border-slate-100">
          <td className="py-2">{outlet.name}{outlet.code ? ` · ${outlet.code}` : ''}</td>
          <td>{outlet.entity ?? 'Unassigned'}</td>
          <td>{(aliasesByOutlet.get(outlet.id) ?? []).join(', ') || '—'}</td>
        </tr>)}
      </tbody>
    </table>
  </details>
}
