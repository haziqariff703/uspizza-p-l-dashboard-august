import React, { useRef, useState } from 'react'
import { Xmark, Upload } from 'iconoir-react'
import { getSupabaseClient } from '../../lib/supabase'

type GrnItem = { grn_no: string; grn_date: string; branch_code: string; branch_name: string; item_code: string | null; item_description: string | null; po_unit_price: number; quantity: number; is_grn_cancelled: string }
const text = (value: unknown) => String(value ?? '').trim()
const numeric = (value: unknown) => Number(String(value ?? 0).replace(/,/g, '')) || 0
const isoDate = (value: unknown) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const match = text(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null
}

export const GRNImportModal: React.FC<{ onClose: () => void; onComplete: (message: string) => void }> = ({ onClose, onComplete }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const importFile = async (file: File) => {
    setError(''); setProgress('Reading Excel file…')
    try {
      const XLSX = await import('xlsx')
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const sheet = book.Sheets[book.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true })
      const headerIndex = rows.findIndex(row => row.map(text).includes('GRN Date') && row.map(text).includes('Branch Code'))
      if (headerIndex < 0) throw new Error('Could not find the GRN Date and Branch Code headers.')
      const columns = new Map(rows[headerIndex].map((name, index) => [text(name), index]))
      const field = (row: unknown[], name: string) => row[columns.get(name) ?? -1]
      const items: GrnItem[] = rows.slice(headerIndex + 1).flatMap(row => {
        const grn_date = isoDate(field(row, 'GRN Date')); const grn_no = text(field(row, 'GRN No')); const branch_code = text(field(row, 'Branch Code'))
        if (!grn_date || !grn_no || !branch_code) return []
        return [{ grn_date, grn_no, branch_code, branch_name: text(field(row, 'Branch Name')), item_code: text(field(row, 'Item Code')) || null, item_description: text(field(row, 'Item Description')) || null, po_unit_price: numeric(field(row, 'PO Unit Price')), quantity: numeric(field(row, 'Quantity')), is_grn_cancelled: text(field(row, 'Is GRN Cancelled')) || 'NO' }]
      })
      if (!items.length) throw new Error('No valid GRN rows found.')
      // Postgres cannot upsert two copies of the same unique key in one request.
      // Preserve the workbook's price × quantity total by consolidating duplicate
      // GRN/item lines to a quantity-weighted unit price before batching.
      const merged = new Map<string, GrnItem>()
      for (const item of items) {
        const key = `${item.grn_no}\u0000${item.item_code ?? ''}\u0000${item.branch_code}`
        const existing = merged.get(key)
        if (!existing) { merged.set(key, item); continue }
        const quantity = existing.quantity + item.quantity
        const amount = existing.po_unit_price * existing.quantity + item.po_unit_price * item.quantity
        existing.quantity = quantity
        existing.po_unit_price = quantity === 0 ? 0 : amount / quantity
      }
      const upsertItems = [...merged.values()]
      const supabase = getSupabaseClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Sign in before importing GRN purchases.')
      for (let index = 0; index < upsertItems.length; index += 500) {
        setProgress(`Uploading ${Math.min(index + 500, upsertItems.length).toLocaleString()} of ${upsertItems.length.toLocaleString()} rows…`)
        const { error: upsertError } = await supabase.from('grn_items').upsert(upsertItems.slice(index, index + 500), { onConflict: 'grn_no,item_code,branch_code' })
        if (upsertError) throw new Error(upsertError.message)
      }
      onComplete(`Imported ${items.length.toLocaleString()} GRN lines as ${upsertItems.length.toLocaleString()} unique items from ${file.name}.`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to import this GRN file.') }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black text-slate-900">Import Purchases / GRN</h2><p className="mt-1 text-sm text-slate-500">Upload a GRN Summary Excel file. Existing GRN item rows are updated safely.</p></div><button onClick={onClose} className="text-slate-500"><Xmark className="h-5 w-5" /></button></div><input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file) }} /><button disabled={Boolean(progress)} onClick={() => inputRef.current?.click()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-600 bg-white px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60"><Upload className="h-4 w-4" />{progress || 'Choose GRN Excel file'}</button>{error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}</div></div>
}
