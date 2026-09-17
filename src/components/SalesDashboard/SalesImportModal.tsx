import React, { useRef, useState } from 'react'
import { NavArrowRight, Page as FileSpreadsheet, Upload } from 'iconoir-react'
import * as XLSX from 'xlsx'
import { getSupabaseClient } from '../../lib/supabase'
import { MAPPING_VERSION, PARSER_VERSION, parseSalesFile, type SalesSource } from '../../lib/salesImportParser'
import { canImport, loadOpenPeriod } from '../../lib/organization'
import { CONTRACT_MISMATCH_MESSAGE, type OrganizationScope } from '../../lib/useOrganizationScope'

interface ImportFile {
  file: File
  source: SalesSource
  rowCount: number
  detectedMonth: string | null
}

interface SalesImportModalProps {
  /** The explicitly selected organization every write is scoped to. */
  scope: OrganizationScope
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

/** Identifies the exact workbook, so the same file cannot be imported twice. */
async function fileHash(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Staged rows are one per source row, so a month can be tens of thousands.
const STAGING_BATCH = 500

export const SalesImportModal: React.FC<SalesImportModalProps> = ({ scope, onClose, onComplete }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<ImportFile[]>([])
  const [reportingMonth, setReportingMonth] = useState('')
  const [source, setSource] = useState<SalesSource>('POS')
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState('')

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
    // Never fall back to the old direct-to-dashboard path when the database
    // does not speak this contract.
    if (!scope.contract.compatible) return setError(CONTRACT_MISMATCH_MESSAGE)
    const membership = scope.selected
    if (!membership) return setError('Select an organization before importing.')
    if (!canImport(membership.role)) {
      return setError(`Importing needs the preparer or admin role. Your role in ${membership.organizationName} is ${membership.role}.`)
    }

    setIsUploading(true)
    setError(null)
    try {
      const supabase = getSupabaseClient()
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) {
        throw new Error('Import will be enabled after dashboard authentication is set up.')
      }

      // An import must belong to an open period covering the whole month. The
      // database enforces this too; asking here gives a usable message instead
      // of a constraint error after the file has already been read and uploaded.
      const period = await loadOpenPeriod(membership.organizationId, reportingMonth)
      if (!period) {
        throw new Error(`${monthLabel(reportingMonth)} has no open reporting period in ${membership.organizationName}. An approver opens one before imports can be accepted.`)
      }

      for (const item of files) {
        setProgress(`Reading ${item.file.name}…`)
        const hash = await fileHash(item.file)
        const importId = crypto.randomUUID()
        const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        // The database guard requires exactly organization_id/import_id/filename.
        const storagePath = `${membership.organizationId}/${importId}/${safeName}`

        // 1. The import record exists FIRST, so the upload has an owner and any
        //    later failure is recorded against something rather than orphaned.
        const { error: insertError } = await supabase.from('sales_imports').insert({
          id: importId,
          organization_id: membership.organizationId,
          reporting_period_id: period.id,
          reporting_month: `${reportingMonth}-01`,
          source: item.source.toLowerCase(),
          file_name: item.file.name,
          storage_path: storagePath,
          file_size: item.file.size,
          row_count: 0,
          uploaded_by: auth.user.id,
          file_hash: hash,
          parser_version: PARSER_VERSION,
          mapping_version: MAPPING_VERSION,
          status: 'parsing',
        })
        if (insertError) throw new Error(`${item.file.name}: ${insertError.message}`)

        // From here a failure is recorded on the import instead of thrown away.
        const fail = async (status: 'needs_mapping' | 'failed', detail: string) => {
          await supabase.rpc('set_sales_import_status', { p_import: importId, p_status: status, p_detail: detail.slice(0, 500) })
        }

        try {
          // 2. Upload the original bytes to the exact path the import authorizes.
          setProgress(`Uploading ${item.file.name}…`)
          const { error: uploadError } = await supabase.storage.from('sales-imports').upload(storagePath, item.file, { upsert: false })
          if (uploadError) throw uploadError

          setProgress(`Parsing ${item.file.name}…`)
          let parsed
          try {
            parsed = await parseSalesFile(item.file, item.source, reportingMonth)
          } catch (caught) {
            const detail = caught instanceof Error ? caught.message : 'Parsing failed.'
            // An unreadable layout stops at needs_mapping; it is never guessed.
            await fail('needs_mapping', detail)
            throw new Error(detail)
          }

          // Only source_sheet/header_row_number may be written directly, and only
          // while the import is still parsing.
          const { error: metaError } = await supabase.from('sales_imports')
            .update({ source_sheet: parsed.sheetName, header_row_number: parsed.headerRowNumber })
            .eq('id', importId)
          if (metaError) throw metaError

          // 3. Record what is wrong with the file before any of its rows land.
          if (parsed.issues.length) {
            const { error: issueError } = await supabase.from('import_validation_issues').insert(parsed.issues.map((issue) => ({
              organization_id: membership.organizationId,
              sales_import_id: importId,
              severity: issue.severity,
              code: issue.code,
              message: issue.message,
            })))
            if (issueError) throw issueError
          }

          // 4. Stage every source row, including the ones the profile could not
          //    use. The browser writes no daily totals at all — publication does.
          for (let from = 0; from < parsed.staged.length; from += STAGING_BATCH) {
            const batch = parsed.staged.slice(from, from + STAGING_BATCH)
            setProgress(`Staging ${item.file.name} — ${Math.min(from + batch.length, parsed.staged.length).toLocaleString()} of ${parsed.staged.length.toLocaleString()} rows…`)
            const { error: stagingError } = await supabase.from('sales_import_rows').insert(batch.map((row) => ({
              organization_id: membership.organizationId,
              sales_import_id: importId,
              source_sheet: parsed.sheetName,
              source_row_number: row.sourceRowNumber,
              raw_row_json: row.raw,
              normalized_row_json: row.normalized,
              source_record_key: row.sourceRecordKey,
              // Outlet mapping is a reviewer decision; intake never guesses it.
              outlet_id: null,
              skip_reason: row.skipReason,
              status: row.normalized ? 'valid' : 'staged',
            })))
            if (stagingError) throw stagingError
          }

          // 5. Freeze intake. The database re-checks the row count and that the
          //    original file really is in Storage.
          setProgress(`Submitting ${item.file.name} for review…`)
          const { error: submitError } = await supabase.rpc('submit_sales_import', {
            p_import: importId,
            p_expected_rows: parsed.staged.length,
          })
          if (submitError) throw submitError
        } catch (caught) {
          const detail = caught instanceof Error ? caught.message : 'Import failed.'
          await fail('failed', detail)
          throw new Error(`${item.file.name}: ${detail}`)
        }
      }

      onComplete(`${files.length} sales file${files.length === 1 ? '' : 's'} submitted for review for ${monthLabel(reportingMonth)}. An independent reviewer approves the rows before any figure appears.`)
      onClose()
    } catch (caught) {
      console.error('[sales-import] failed', caught)
      setError(caught instanceof Error ? caught.message : 'Import failed. Please try again.')
    } finally {
      setIsUploading(false)
      setProgress('')
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
          {progress && <p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{progress}</p>}
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
