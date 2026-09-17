import React, { useRef, useState } from 'react'
import { NavArrowRight, Page as FileSpreadsheet, Upload } from 'iconoir-react'
import * as XLSX from 'xlsx'
import { getSupabaseClient } from '../../lib/supabase'
import { parseSalesFile, type SalesSource } from '../../lib/salesImportParser'
import { dailyTotals, type DailyTotal } from '../../lib/salesDailyTotals'
import { validateSalesImport, type ValidationResult } from '../../lib/salesImportValidation'
import type { SourceStore } from '../../lib/outletMatcher'
import {
  summarizePlan, type OutletPlan, type PlannedStore,
} from '../../lib/outletPlanner'
import { ensurePlDirectory, planPlOutlets, mergePlDailyTotals } from '../../lib/plOutletResolver'
import {
  directoryKey, type AliasSource,
} from '../../lib/outletDirectory'

interface ImportFile {
  file: File
  source: SalesSource
  /** What the workbook's own headers look like. Shown when it disagrees with the choice above. */
  detectedSource: SalesSource
  rowCount: number
  detectedMonth: string | null
}

/** One parsed file, before anything has been written. */
interface AnalyzedFile {
  item: ImportFile
  totals: DailyTotal[]
  validation: ValidationResult
}

interface SalesImportModalProps {
  /** The dashboard's reporting month. Every import in this dialog belongs to it. */
  reportingMonth: string
  onClose: () => void
  onComplete: (message: string) => void
}

const sourceStyles: Record<SalesSource, string> = {
  POS: 'bg-slate-100 text-slate-700',
  Grab: 'bg-emerald-50 text-emerald-800',
  FoodPanda: 'bg-rose-50 text-rose-800',
  Shopee: 'bg-orange-50 text-orange-800',
  Apps: 'bg-sky-50 text-sky-800',
}

const monthLabel = (value: string) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
    new Date(`${value}-01T00:00:00`),
  )

function toMonth(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
  }
  if (typeof value === 'string') {
    const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/)
    if (match) return `${match[3]}-${match[2]}`
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  return null
}

function inspectWorkbook(file: File): Promise<Omit<ImportFile, 'source'>> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: null, raw: true })
    const firstTwoHundred = rows.slice(0, 200)
    const headerIndex = firstTwoHundred.findIndex((row) => row.includes('Invoice Number') || row.includes('Merchant Name') || row.includes('Item'))
    const header = headerIndex >= 0 ? rows[headerIndex] : []
    const hasGrabHeader = header.includes('Merchant Name') && header.includes('Net Sales')
    const hasFoodPandaHeader = header.includes('Invoice Number') && header.includes('foodpanda Commission')
    const hasShopeeHeader = header.includes('Complete Time') && header.includes('Earnings')
    const hasAppsHeader = header.includes('Order ID') && header.includes('Grand Total (RM)')
    const detectedSource: SalesSource = hasGrabHeader ? 'Grab' : hasFoodPandaHeader ? 'FoodPanda' : hasShopeeHeader ? 'Shopee' : hasAppsHeader ? 'Apps' : 'POS'
    const dateColumnName = detectedSource === 'Grab' ? 'Created On' : detectedSource === 'FoodPanda' || detectedSource === 'Apps' ? 'Order Date' : detectedSource === 'Shopee' ? 'Complete Time' : 'Group'
    const dateColumn = header.indexOf(dateColumnName)
    const firstDate = rows.slice(Math.max(headerIndex + 1, 0)).map((row) => toMonth(row[dateColumn])).find(Boolean) ?? null
    const dataRows = Math.max(0, rows.length - Math.max(headerIndex + 1, 0))

    return { file, detectedSource, rowCount: dataRows, detectedMonth: firstDate }
  })
}

// One row per outlet and day, so a month stays well inside a few batches.
const DAILY_BATCH = 500

/** Every distinct store name the parsed files mention, once per source spelling.
 *  The identity key is `directoryKey(source, name)` — the same key alias lookup,
 *  persistence and matching all use, so a store can never change identity between
 *  analysis and import. */
function collectStores(analyzed: AnalyzedFile[]): SourceStore[] {
  const stores = new Map<string, SourceStore>()
  for (const file of analyzed) {
    const source = file.item.source.toLowerCase() as AliasSource
    for (const total of file.totals) {
      const key = directoryKey(source, total.outletName)
      const existing = stores.get(key)
      if (existing) existing.dailyRows += 1
      else stores.set(key, { source, name: total.outletName, dailyRows: 1 })
    }
  }
  return [...stores.values()].sort((left, right) => left.name.localeCompare(right.name))
}

/** The one identity key used everywhere: analysis, persistence and import. */
const storeKey = (store: SourceStore) => directoryKey(store.source, store.name)

export const SalesImportModal: React.FC<SalesImportModalProps> = ({ reportingMonth, onClose, onComplete }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<ImportFile[]>([])
  const [source, setSource] = useState<SalesSource>('POS')
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [analyzed, setAnalyzed] = useState<AnalyzedFile[] | null>(null)
  const [plan, setPlan] = useState<OutletPlan | null>(null)
  const [analyzedOwner, setAnalyzedOwner] = useState<string | null>(null)


  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length) return
    setError(null)
    setAnalyzed(null)
    setPlan(null)
    try {
      const inspected = (await Promise.all(Array.from(selected).map(inspectWorkbook))).map((item) => ({ ...item, source }))
      setFiles((existing) => [...existing, ...inspected])
    } catch {
      setError('We could not read one of those files. Please choose an Excel .xlsx or .xls report.')
    }
  }

  /** Automatically prepare the P&L directory, then parse and preview the import. */
  const analyze = async () => {
    if (!files.length) return setError('Choose at least one sales report.')
    setIsBusy(true)
    setError(null)
    try {
      setProgress('Reading and validating the selected files…')
      const current = await ensurePlDirectory()
      const parsedFiles: AnalyzedFile[] = []
      for (const item of files) {
        setProgress(`Reading ${item.file.name}…`)
        try {
          const parsed = await parseSalesFile(item.file, item.source, reportingMonth)
          const totals = dailyTotals(parsed.staged)
          parsedFiles.push({ item, totals, validation: validateSalesImport(parsed, totals, item.source, reportingMonth) })
        } catch (caught) {
          // An unreadable layout is a finding about that file, not a crash.
          parsedFiles.push({
            item, totals: [],
            validation: {
              ok: false, warnings: [],
              fatal: [{ severity: 'error', code: 'unreadable_file', message: caught instanceof Error ? caught.message : 'The file could not be read.' }],
            },
          })
        }
      }
      setProgress('Matching outlets to the P&L list…')
      const usable = parsedFiles.filter(file => file.validation.ok)
      setAnalyzed(parsedFiles)
      setAnalyzedOwner(current.ownerId)
      setPlan(planPlOutlets(collectStores(usable), current))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The files could not be analysed.')
    } finally {
      setIsBusy(false)
      setProgress('')
    }
  }

  const handleImport = async () => {
    if (!analyzed || !plan) return
    // Everything the rules resolved on their own, keyed by the one identity key.
    const mapped = new Map<string, PlannedStore>(plan.stores
      .filter(store => store.decision === 'automatic' && store.outlet)
      .map(store => [storeKey(store.store), store]))
    if (!mapped.size) {
      return setError('No source store could be mapped yet, so there is nothing to import. No outlet matches the P&L list.')
    }
    if (plan.missing.length) return setError('P&L outlet records are unavailable. Read the files again to retry setup.')

    setIsBusy(true)
    setError(null)
    try {
      const supabase = getSupabaseClient()
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) {
        throw new Error('Sign in before importing. Every import belongs to the account that uploaded it.')
      }
      if (auth.user.id !== analyzedOwner) {
        setPlan(null)
        throw new Error('The signed-in account changed. Read the files again before importing.')
      }

      const outcomes: string[] = []
      let importedFiles = 0
      for (const file of analyzed) {
        const name = file.item.file.name
        if (!file.validation.ok) {
          outcomes.push(`${name}: refused — ${file.validation.fatal[0]?.message ?? 'failed validation'}`)
          continue
        }
        const source = file.item.source.toLowerCase() as AliasSource
        const matched = file.totals
          .map(total => ({ total, match: mapped.get(directoryKey(source, total.outletName)) }))
          .filter((entry): entry is { total: DailyTotal; match: PlannedStore } => Boolean(entry.match))
        const held = file.totals.length - matched.length
        const writable = mergePlDailyTotals(matched)
        if (!writable.length) {
          outcomes.push(`${name}: excluded — no store matches the P&L list.`)
          continue
        }

        const importId = crypto.randomUUID()
        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${auth.user.id}/${importId}/${safeName}`

        // 1. The import record exists FIRST, so the upload and every daily row
        //    below have an owner, and a later failure is recorded against it.
        const { error: insertError } = await supabase.from('sales_imports').insert({
          id: importId,
          created_by: auth.user.id,
          reporting_month: `${reportingMonth}-01`,
          source,
          file_name: safeName,
          status: 'draft',
        })
        if (insertError) throw new Error(`${name}: ${insertError.message}`)

        try {
          // 2. Keep the original bytes. No upsert: an import id is used once.
          setProgress(`Uploading ${name}…`)
          const { error: uploadError } = await supabase.storage.from('sales-imports').upload(storagePath, file.item.file, { upsert: false })
          if (uploadError) throw uploadError

          // Keep a durable explanation of exclusions beside the original file.
          const report = {
            version: 'pl-master-v1', reportingMonth, source, fileName: name,
            masterCodes: plan.stores.filter(row => row.outlet).map(row => row.outlet!.code),
            importedDailyTotals: writable.length,
            excludedDailyTotals: file.totals.filter(total => !mapped.has(directoryKey(source, total.outletName))),
          }
          const { error: reportError } = await supabase.storage.from('sales-imports').upload(
            `${auth.user.id}/${importId}/outlet-resolution.json`,
            new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), { upsert: false },
          )
          if (reportError) throw reportError

          // 3. Daily totals for mapped stores only, as exact decimal strings,
          //    with explicit null for anything the source did not state.
          for (let from = 0; from < writable.length; from += DAILY_BATCH) {
            const batch = writable.slice(from, from + DAILY_BATCH)
            setProgress(`Saving ${name} — ${Math.min(from + batch.length, writable.length).toLocaleString()} of ${writable.length.toLocaleString()} daily totals…`)
            const { error: dailyError } = await supabase.from('sales_daily').insert(batch.map(({ total, match }) => ({
              sales_import_id: importId,
              outlet_id: match.outlet!.id,
              sales_date: total.salesDate,
              gross_sales: total.amounts.grossSales,
              discount: total.amounts.discount,
              net_sales: total.amounts.netSales,
              tax: total.amounts.tax,
              service_charge: total.amounts.serviceCharge,
              platform_fees: total.amounts.platformFees,
              advertising_spend: total.amounts.advertisingSpend,
              payout: total.amounts.payout,
              record_count: total.recordCount,
            })))
            if (dailyError) throw dailyError
          }

          const { error: statusError } = await supabase.from('sales_imports').update({ status: 'imported' }).eq('id', importId)
          if (statusError) throw statusError
          importedFiles++
          outcomes.push(`${name}: ${writable.length.toLocaleString()} daily totals imported${held ? `, ${held.toLocaleString()} excluded (no P&L match)` : ''}.`)
        } catch (caught) {
          const detail = caught instanceof Error ? caught.message : 'Import failed.'
          // Recorded on the import rather than thrown away. Any rows already
          // written stay visible to their owner instead of disappearing.
          await supabase.from('sales_imports').update({ status: 'failed' }).eq('id', importId)
          throw new Error(`${name}: ${detail}`)
        }
      }

      if (!importedFiles) throw new Error(outcomes.join(' '))
      const summary = summarizePlan(plan)
      onComplete(
        `${summary.stores} source store${summary.stores === 1 ? '' : 's'} found · ${summary.automatic} mapped automatically`
        + ` · ${summary.excluded} excluded`
        + ` — ${monthLabel(reportingMonth)}. ${outcomes.join(' ')}` + (plan.excluded.length ? ` Excluded names: ${plan.excluded.map(row => `${row.store.name} (${row.store.source})`).join(', ')}.` : ''),
      )
      onClose()
    } catch (caught) {
      console.error('[sales-import] failed', caught)
      setError(caught instanceof Error ? caught.message : 'Import failed. Please try again.')
    } finally {
      setIsBusy(false)
      setProgress('')
    }
  }

  const summary = plan ? summarizePlan(plan) : null
  const exceptions = plan?.excluded ?? []
  const refusedFiles = analyzed?.filter(file => !file.validation.ok) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="sales-import-title">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#C8102E]">Monthly data intake</p>
          <h2 id="sales-import-title" className="mt-1 text-xl font-black text-slate-900">Import sales reports</h2>
            <p className="mt-1 text-sm text-slate-600">Choose a source, then upload its Excel files for {monthLabel(reportingMonth)}.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close import dialog">×</button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600">Outlets are matched automatically against the 44-outlet P&amp;L list. No outlet confirmation is required.</p>

          <label className="block text-sm font-bold text-slate-800">Source
            <select value={source} onChange={(event) => setSource(event.target.value as SalesSource)} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/15">
              <option value="POS">POS</option>
              <option value="Grab">Grab</option>
              <option value="FoodPanda">FoodPanda</option>
              <option value="Shopee">Shopee</option>
              <option value="Apps">Apps</option>
            </select>
          </label>

          <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-7 text-center transition-colors hover:border-[#C8102E] hover:bg-rose-50/40">
            <span className="rounded-xl bg-white p-2.5 text-[#C8102E] shadow-sm"><Upload className="h-5 w-5" /></span>
            <span className="mt-3 text-sm font-bold text-slate-800">Choose Excel reports</span>
            <span className="mt-1 text-xs text-slate-500">Source: {source}. You can select multiple .xlsx or .xls files.</span>
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={(event) => void handleFiles(event.target.files)} />

          {files.length > 0 && <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500"><span>File</span><span>Source</span><span>Rows</span></div>
            {files.map((item, index) => <div key={`${item.file.name}-${index}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold text-slate-800"><FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{item.file.name}</span></div>
                {item.detectedSource !== item.source && <p className="mt-1 pl-6 text-xs text-amber-700">Its headers look like {item.detectedSource}. It will be parsed as {item.source}.</p>}
                {item.detectedMonth && item.detectedMonth !== reportingMonth && <p className="mt-1 pl-6 text-xs text-amber-700">First date is in {monthLabel(item.detectedMonth)}; importing into {monthLabel(reportingMonth)}.</p>}
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${sourceStyles[item.source]}`}>{item.source}</span><span className="text-xs font-semibold text-slate-600">{item.rowCount.toLocaleString()}</span>
            </div>)}
          </div>}

          {summary && <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-bold text-slate-900">
              {summary.stores} source store{summary.stores === 1 ? '' : 's'} found · {summary.automatic} mapped automatically
              · {summary.excluded} excluded
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {analyzed?.length ?? 0} file{(analyzed?.length ?? 0) === 1 ? '' : 's'} read ·
              {' '}{summary.eligibleRows.toLocaleString()} daily totals ready to import ·
              {' '}{summary.heldRows.toLocaleString()} excluded from this import (no P&L match).
            </p>
          </div>}

          {refusedFiles.length > 0 && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-900">
            <p className="font-bold">{refusedFiles.length} file{refusedFiles.length === 1 ? '' : 's'} cannot be imported:</p>
            <ul className="mt-1 list-disc pl-4">
              {refusedFiles.map(file => <li key={file.item.file.name}>{file.item.file.name} — {file.validation.fatal.map(issue => issue.message).join(' ')}</li>)}
            </ul>
          </div>}

          {exceptions.length > 0 && <details open className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <summary className="cursor-pointer font-bold text-amber-900">{exceptions.length} store{exceptions.length === 1 ? '' : 's'} excluded from this import</summary>
            <p className="mt-2 text-xs text-amber-900">These names could not be uniquely matched to the P&L list. Matched outlets still import. No manual mapping is required.</p>
            <div className="mt-3 space-y-2">
              {exceptions.map(result => <div key={`${result.store.source}:${result.store.name}`} className="rounded-lg bg-white px-3 py-2">
                <p className="font-semibold text-slate-800">{result.store.name}</p>
                <p className="text-xs text-slate-500">{result.store.source} · {result.store.dailyRows} daily total{result.store.dailyRows === 1 ? '' : 's'} · {result.reason}</p>

              </div>)}
            </div>
          </details>}

          <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">The system keeps each original file and its reporting month. It will not automatically add POS and platform sales together, preventing double counting.</div>
          {progress && <p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{progress}</p>}
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
          {!plan
            ? <button type="button" disabled={isBusy || files.length === 0} onClick={() => void analyze()} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{isBusy ? 'Reading…' : 'Read and match'} <NavArrowRight className="h-4 w-4" /></button>
            : <button type="button" disabled={isBusy || summary?.automatic === 0 || (plan?.conflicts.length ?? 0) > 0 || (plan?.missing.length ?? 0) > 0} onClick={() => void handleImport()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#C8102E] px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#A60D26] disabled:cursor-not-allowed disabled:opacity-50">{isBusy ? 'Importing…' : `Import ${summary?.eligibleRows.toLocaleString() ?? 0} daily totals`} <NavArrowRight className="h-4 w-4" /></button>}
        </div>
      </div>
    </div>
  )
}
