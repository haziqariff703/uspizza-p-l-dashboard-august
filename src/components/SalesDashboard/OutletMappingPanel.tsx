import React, { useState } from 'react'
import { ENTITY_NAMES } from '../../data/aggregate'
import { aliasKey, OUTLET_MASTER, outletNameKey, resolveOutlet, type OutletMappings } from '../../data/outletMaster'

interface Props {
  rows: Array<{ source: string; outlet_name: string }>
  mappings: OutletMappings
  onSave: (value: OutletMappings) => void
}

export function OutletMappingPanel({ rows, mappings, onSave }: Props) {
  const [selection, setSelection] = useState('')
  const [target, setTarget] = useState('')
  const [name, setName] = useState('')
  const [entity, setEntity] = useState<string>(ENTITY_NAMES.myUsPizza)
  const [error, setError] = useState('')
  const master = [...OUTLET_MASTER, ...mappings.outlets].sort((a, b) => a.name.localeCompare(b.name))
  const names = [...new Map(rows.filter(r => /^us pizza\b/i.test(r.outlet_name.trim())).map(r => [aliasKey(r.source, r.outlet_name), r])).entries()]
    .sort((a, b) => a[1].outlet_name.localeCompare(b[1].outlet_name))
  const unresolved = names.filter(([, r]) => !resolveOutlet(r.source, r.outlet_name, mappings))
  const selected = names.find(([key]) => key === selection)?.[1]
  const save = () => {
    if (!selected || !target) return
    let id = target
    let outlets = mappings.outlets
    if (target === 'new') {
      if (!name.trim()) { setError('Enter the canonical outlet name.'); return }
      if (master.some(o => outletNameKey(o.name) === outletNameKey(name))) { setError('This name already exists. Select that outlet from the list.'); return }
      id = `local-${crypto.randomUUID()}`
      outlets = [...outlets, { id, name: name.trim(), entity }]
    }
    onSave({ outlets, aliases: { ...mappings.aliases, [selection]: id } })
    setTarget(''); setSelection(''); setName(''); setError('')
  }
  return <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
    <summary className="cursor-pointer font-semibold">Outlet mappings · {unresolved.length} source names unresolved</summary>
    <p className="my-3 text-slate-600">Map each source name to a fixed outlet and entity. Mappings are saved for your account in this browser and apply to imported months here. The master starts with May’s 44 trading and 2 upcoming outlets.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1">Imported name
        <select aria-label="Imported outlet name" className="w-full rounded border border-slate-300 p-2" value={selection} onChange={e => { setSelection(e.target.value); setTarget(''); setError('') }}>
          <option value="">Choose a source name</option>
          {names.map(([key, r]) => <option key={key} value={key}>{resolveOutlet(r.source, r.outlet_name, mappings) ? 'Mapped' : 'Unmapped'} · {r.source} · {r.outlet_name}</option>)}
        </select>
      </label>
      <label className="grid gap-1">Canonical outlet
        <select aria-label="Canonical outlet" className="w-full rounded border border-slate-300 p-2" value={target} onChange={e => setTarget(e.target.value)}>
          <option value="">Choose the matching outlet</option>
          {master.map(o => <option key={o.id} value={o.id}>{o.name} · {o.entity}</option>)}
          <option value="new">Register a new outlet…</option>
        </select>
      </label>
      {target === 'new' && <>
        <label className="grid gap-1">New canonical name<input className="rounded border border-slate-300 p-2" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="grid gap-1">Entity<select className="rounded border border-slate-300 p-2" value={entity} onChange={e => setEntity(e.target.value)}>{Object.values(ENTITY_NAMES).map(value => <option key={value}>{value}</option>)}</select></label>
      </>}
    </div>
    {selected && <p className="mt-2 text-slate-600">Current: {resolveOutlet(selected.source, selected.outlet_name, mappings)?.name ?? 'Unmapped'}</p>}
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
    <button type="button" disabled={!selection || !target} onClick={save} className="mt-3 rounded bg-[#C8102E] px-4 py-2 font-semibold text-white disabled:opacity-40">Save mapping</button>
    <table className="mt-4 w-full text-left text-xs"><thead><tr><th className="py-2">Source name</th><th>Canonical outlet</th><th>Entity</th></tr></thead><tbody>
      {names.map(([key, r]) => { const outlet = resolveOutlet(r.source, r.outlet_name, mappings); return <tr key={key} className="border-t border-slate-100"><td className="py-2">{r.source} · {r.outlet_name}</td><td>{outlet?.name ?? 'Unmapped'}</td><td>{outlet?.entity ?? 'Unassigned'}</td></tr> })}
    </tbody></table>
  </details>
}
