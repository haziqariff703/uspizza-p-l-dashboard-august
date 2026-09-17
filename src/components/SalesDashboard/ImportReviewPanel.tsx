import React, { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase'

interface ImportRecord {
  id: string
  file_name: string
  source: string
  status: string
  status_detail: string | null
  created_at: string
  row_count: number | null
  source_sheet: string | null
  header_row_number: number | null
  parser_version: string | null
}
interface RowSummary { skip_reason: string | null; rows: number; first_row_number: number }
interface Issue { id: string; severity: string; code: string; message: string; resolved_at: string | null }
interface Sample { source_row_number: number; raw_row_json: Record<string, unknown> }

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  validated: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  parsing: 'bg-sky-50 text-sky-800 border-sky-200',
  uploaded: 'bg-sky-50 text-sky-800 border-sky-200',
  needs_mapping: 'bg-amber-50 text-amber-900 border-amber-200',
  needs_review: 'bg-amber-50 text-amber-900 border-amber-200',
  failed: 'bg-rose-50 text-rose-800 border-rose-200',
}
const sourceName = (source: string) =>
  source === 'foodpanda' ? 'FoodPanda' : source === 'pos' ? 'POS' : source.charAt(0).toUpperCase() + source.slice(1)

export const ImportReviewPanel: React.FC<{ organizationId: string | null; reportingMonth: string; refreshToken: number }> = ({ organizationId, reportingMonth, refreshToken }) => {
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!organizationId) { setImports([]); return }
      try {
        const { data, error: queryError } = await getSupabaseClient()
          .from('sales_imports')
          .select('id, file_name, source, status, status_detail, created_at, row_count, source_sheet, header_row_number, parser_version')
          .eq('organization_id', organizationId)
          .eq('reporting_month', `${reportingMonth}-01`)
          .order('created_at', { ascending: false })
        if (queryError) throw queryError
        if (!active) return
        setImports((data ?? []) as ImportRecord[])
        setError('')
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load the import history.')
      }
    }
    void load()
    return () => { active = false }
  }, [organizationId, reportingMonth, refreshToken])

  if (!imports.length && !error) return null

  return <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
    <summary className="cursor-pointer font-semibold">Import review · {imports.length} file{imports.length === 1 ? '' : 's'} this month</summary>
    <p className="my-3 text-slate-600">
      What each uploaded file actually contained. Every source row is kept, including the ones the
      parser could not use, so a figure that is missing can be traced back to the row it came from.
    </p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="space-y-2">
      {imports.map(record => <ImportRow key={record.id} record={record} />)}
    </div>
  </details>
}

const ImportRow: React.FC<{ record: ImportRecord }> = ({ record }) => {
  const [summary, setSummary] = useState<RowSummary[] | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [samples, setSamples] = useState<Record<string, Sample[]>>({})
  const [detailError, setDetailError] = useState('')

  const loadDetail = useCallback(async () => {
    if (summary) return
    try {
      const supabase = getSupabaseClient()
      const [rows, foundIssues] = await Promise.all([
        supabase.rpc('import_row_summary', { import: record.id }),
        supabase.from('import_validation_issues')
          .select('id, severity, code, message, resolved_at')
          .eq('sales_import_id', record.id)
          .order('severity', { ascending: true }),
      ])
      if (rows.error) throw rows.error
      if (foundIssues.error) throw foundIssues.error
      setSummary((rows.data ?? []) as RowSummary[])
      setIssues((foundIssues.data ?? []) as Issue[])
      setDetailError('')
    } catch (caught) {
      setDetailError(caught instanceof Error ? caught.message : 'Could not load this import.')
    }
  }, [record.id, summary])

  const loadSample = async (reason: string | null) => {
    const key = reason ?? ''
    if (samples[key]) return
    try {
      const query = getSupabaseClient()
        .from('sales_import_rows')
        .select('source_row_number, raw_row_json')
        .eq('sales_import_id', record.id)
        .order('source_row_number', { ascending: true })
        .limit(3)
      const { data, error } = await (reason === null ? query.is('skip_reason', null) : query.eq('skip_reason', reason))
      if (error) throw error
      setSamples(current => ({ ...current, [key]: (data ?? []) as Sample[] }))
    } catch (caught) {
      setDetailError(caught instanceof Error ? caught.message : 'Could not load sample rows.')
    }
  }

  const used = summary?.find(entry => entry.skip_reason === null)
  const skipped = summary?.filter(entry => entry.skip_reason !== null) ?? []

  return <details className="rounded-lg border border-slate-200" onToggle={event => { if ((event.currentTarget as HTMLDetailsElement).open) void loadDetail() }}>
    <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2">
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[record.status] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
        {record.status.replace(/_/g, ' ')}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{record.file_name}</span>
      <span className="shrink-0 text-xs text-slate-500">
        {sourceName(record.source)} · {new Date(record.created_at).toLocaleDateString()}
      </span>
    </summary>

    <div className="space-y-3 border-t border-slate-100 px-3 py-3 text-xs">
      <p className="text-slate-500">
        {record.source_sheet ? `Sheet "${record.source_sheet}"` : 'Sheet not recorded'}
        {record.header_row_number ? ` · header on row ${record.header_row_number}` : ' · no header row (grouped report)'}
        {record.parser_version ? ` · parser ${record.parser_version}` : ' · imported before parser versions were recorded'}
      </p>

      {record.status_detail && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">{record.status_detail}</p>}
      {detailError && <p role="alert" className="text-red-700">{detailError}</p>}

      {issues.length > 0 && <ul className="space-y-1">
        {issues.map(issue => <li key={issue.id} className={`rounded-lg border px-3 py-2 ${issue.severity === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          <span className="font-bold">{issue.code}</span> · {issue.message}
          {issue.resolved_at && <span className="ml-1 font-bold text-emerald-700">(resolved)</span>}
        </li>)}
      </ul>}

      {summary === null ? <p className="text-slate-500">Loading rows…</p> : <>
        <p className="font-bold text-slate-700">
          {(used?.rows ?? 0).toLocaleString()} of {(summary.reduce((total, entry) => total + Number(entry.rows), 0)).toLocaleString()} source rows produced figures.
        </p>
        {skipped.length === 0 ? <p className="text-slate-500">Every row was used.</p> : <table className="w-full text-left">
          <thead><tr className="text-slate-500"><th className="py-1 font-semibold">Not used because</th><th className="py-1 font-semibold">Rows</th><th /></tr></thead>
          <tbody>
            {skipped.map(entry => {
              const key = entry.skip_reason ?? ''
              return <React.Fragment key={key}>
                <tr className="border-t border-slate-100 align-top">
                  <td className="py-1.5 pr-3 text-slate-700">{entry.skip_reason}</td>
                  <td className="py-1.5 pr-3 font-bold tabular-nums text-slate-900">{Number(entry.rows).toLocaleString()}</td>
                  <td className="py-1.5">
                    <button type="button" onClick={() => void loadSample(entry.skip_reason)} className="font-semibold text-[#C8102E] hover:underline">
                      {samples[key] ? `from row ${entry.first_row_number}` : 'Show rows'}
                    </button>
                  </td>
                </tr>
                {samples[key]?.map(sample => <tr key={sample.source_row_number} className="bg-slate-50">
                  <td colSpan={3} className="px-2 py-1 font-mono text-[11px] leading-5 text-slate-600">
                    Row {sample.source_row_number}: {JSON.stringify(sample.raw_row_json).slice(0, 300)}
                  </td>
                </tr>)}
              </React.Fragment>
            })}
          </tbody>
        </table>}
      </>}
    </div>
  </details>
}
