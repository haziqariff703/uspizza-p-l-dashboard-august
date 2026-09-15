import React, { useRef, useState } from 'react'
import { NavArrowRight, Page as FileSpreadsheet, Upload } from 'iconoir-react'
import * as XLSX from 'xlsx'
import { getSupabaseClient } from '../../lib/supabase'
import { parseSalesFile, type SalesSource } from '../../lib/salesImportParser'

interface ImportFile {
  file: File
  source: SalesSource
  rowCount: number
  detectedMonth: string | null
}

interface SalesImportModalProps {
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

function inspectWorkbook(file: File): Promise<ImportFile> {
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
    const source: SalesSource = hasGrabHeader ? 'Grab' : hasFoodPandaHeader ? 'FoodPanda' : hasShopeeHeader ? 'Shopee' : hasAppsHeader ? 'Apps' : 'POS'
    const dateColumnName = source === 'Grab' ? 'Created On' : source === 'FoodPanda' || source === 'Apps' ? 'Order Date' : source === 'Shopee' ? 'Complete Time' : 'Group'
    const dateColumn = header.indexOf(dateColumnName)
    const firstDate = rows.slice(Math.max(headerIndex + 1, 0)).map((row) => toMonth(row[dateColumn])).find(Boolean) ?? null
    const dataRows = Math.max(0, rows.length - Math.max(headerIndex + 1, 0))

    return { file, source, rowCount: dataRows, detectedMonth: firstDate }
  })
}

export const SalesImportModal: React.FC<SalesImportModalProps> = ({ onClose, onComplete }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<ImportFile[]>([])
  const [reportingMonth, setReportingMonth] = useState('')
  const [source, setSource] = useState<SalesSource>('POS')
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length) return
    setError(null)
    try {
      const inspected = (await Promise.all(Array.from(selected).map(inspectWorkbook))).map((item) => ({ ...item, source }))
      setFiles((existing) => [...existing, ...inspected])
      const firstMonth = inspected.find((item) => item.detectedMonth)?.detectedMonth
      if (!reportingMonth && firstMonth) setReportingMonth(firstMonth)
    } catch {
      setError('We could not read one of those files. Please choose an Excel .xlsx or .xls report.')
    }
  }

  const handleImport = async () => {
    if (!reportingMonth) return setError('Choose the reporting month before importing.')
    if (!files.length) return setError('Choose at least one sales report.')

    setIsUploading(true)
    setError(null)
    try {
      const supabase = getSupabaseClient()
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) {
        throw new Error('Import will be enabled after dashboard authentication is set up.')
      }

      for (const item of files) {
        console.info('[sales-import] starting file', { source: item.source, size: item.file.size })
        const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${auth.user.id}/${reportingMonth}/${item.source.toLowerCase()}/${Date.now()}-${safeName}`
        const { error: uploadError } = await supabase.storage.from('sales-imports').upload(storagePath, item.file, { upsert: false })
        if (uploadError) throw uploadError
        console.info('[sales-import] storage upload complete', { source: item.source })

        const { data: importRecord, error: insertError } = await supabase.from('sales_imports').insert({
          reporting_month: `${reportingMonth}-01`,
          source: item.source.toLowerCase(),
          file_name: item.file.name,
          storage_path: storagePath,
          file_size: item.file.size,
          row_count: item.rowCount,
          uploaded_by: auth.user.id,
        }).select('id').single()
        if (insertError) throw insertError
        if (!importRecord) throw new Error('Supabase did not return the saved import record.')
        console.info('[sales-import] metadata saved', { source: item.source })

        const dailyRows = await parseSalesFile(item.file, item.source)
        console.info('[sales-import] parsing complete', { source: item.source, dailyRows: dailyRows.length })
        if (dailyRows.length) {
          const { error: dailyError } = await supabase.from('sales_daily').insert(dailyRows.map((row) => ({
            import_id: importRecord.id,
            reporting_month: `${reportingMonth}-01`,
            sales_date: row.salesDate,
            outlet_name: row.outletName,
            source: row.source.toLowerCase(),
            gross_sales: row.grossSales,
            discount: row.discount,
            net_sales: row.netSales,
            tax: row.tax,
            service_charge: row.serviceCharge,
            platform_fees: row.platformFees,
            advertising_spend: row.advertisingSpend,
            payout: row.payout,
            record_count: row.recordCount,
          })))
          if (dailyError) throw dailyError
          console.info('[sales-import] daily rows saved', { source: item.source, dailyRows: dailyRows.length })
        }
      }

      onComplete(`${files.length} sales file${files.length === 1 ? '' : 's'} saved for ${monthLabel(reportingMonth)}.`)
      onClose()
    } catch (caught) {
      console.error('[sales-import] failed', caught)
      setError(caught instanceof Error ? caught.message : 'Import failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="sales-import-title">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#C8102E]">Monthly data intake</p>
          <h2 id="sales-import-title" className="mt-1 text-xl font-black text-slate-900">Import sales reports</h2>
            <p className="mt-1 text-sm text-slate-600">Choose a source, then upload its Excel files for one reporting month.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close import dialog">×</button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-800">Reporting month
              <input type="month" value={reportingMonth} onChange={(event) => setReportingMonth(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/15" />
            </label>
            <label className="block text-sm font-bold text-slate-800">Source
              <select value={source} onChange={(event) => setSource(event.target.value as SalesSource)} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/15">
                <option value="POS">POS</option>
                <option value="Grab">Grab</option>
                <option value="FoodPanda">FoodPanda</option>
                <option value="Shopee">Shopee</option>
                <option value="Apps">Apps</option>
              </select>
            </label>
          </div>

          <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-7 text-center transition-colors hover:border-[#C8102E] hover:bg-rose-50/40">
            <span className="rounded-xl bg-white p-2.5 text-[#C8102E] shadow-sm"><Upload className="h-5 w-5" /></span>
            <span className="mt-3 text-sm font-bold text-slate-800">Choose Excel reports</span>
            <span className="mt-1 text-xs text-slate-500">Source: {source}. You can select multiple .xlsx or .xls files.</span>
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={(event) => void handleFiles(event.target.files)} />

          {files.length > 0 && <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500"><span>File</span><span>Source</span><span>Rows</span></div>
            {files.map((item, index) => <div key={`${item.file.name}-${index}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm">
              <div className="min-w-0"><div className="flex items-center gap-2 font-semibold text-slate-800"><FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{item.file.name}</span></div>{item.detectedMonth && <p className="mt-1 pl-6 text-xs text-slate-500">Detected: {monthLabel(item.detectedMonth)}</p>}</div>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${sourceStyles[item.source]}`}>{item.source}</span><span className="text-xs font-semibold text-slate-600">{item.rowCount.toLocaleString()}</span>
            </div>)}
          </div>}

          <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">The system keeps each original file and its reporting month. It will not automatically add POS and platform sales together, preventing double counting.</div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
          <button type="button" disabled={isUploading || files.length === 0} onClick={() => void handleImport()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#C8102E] px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#A60D26] disabled:cursor-not-allowed disabled:opacity-50">{isUploading ? 'Importing…' : 'Import to Supabase'} <NavArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  )
}
