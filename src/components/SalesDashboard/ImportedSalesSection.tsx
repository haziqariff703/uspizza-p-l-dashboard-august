import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle, RefreshCircle, WarningTriangle } from 'iconoir-react'
import { getSupabaseClient } from '../../lib/supabase'
import { importedOverview, type ImportedRow } from '../../data/importedOverview'
import { outletProfitability, type PurchaseRow } from '../../data/importedPurchases'
import { coverageTotals, importedCoverage, COVERAGE_STATE_LABELS } from '../../data/importedCoverage'
import { EMPTY_DIRECTORY, loadOutletDirectory, type OutletDirectory } from '../../lib/outletDirectory'
import { OverviewPage } from '../../pages/overview/OverviewPage'
import { SalesByOutletPage } from '../../pages/sales-by-outlet/SalesByOutletPage'
import { PurchasesByOutletPage } from '../../pages/purchases-by-outlet/PurchasesByOutletPage'
import { PurchasesToNetSalesPage } from '../../pages/purchases-to-net-sales/PurchasesToNetSalesPage'
import { PLByOutletPage, type PLDisplayOutlet } from '../../pages/pl-by-outlet/PLByOutletPage'
import { ENTITY_NAMES, type EntityScope } from '../../data/aggregate'
import { type ChannelFilter, type DashboardSection } from '../../types'

interface ImportedSalesSectionProps {
  reportingMonth: string
  refreshToken: number
  entityFilter: EntityScope
  channelFilter: ChannelFilter
  section: DashboardSection
  onEntityFilterChange?: (filter: EntityScope) => void
}

const sourceName = (source: string) => source === 'foodpanda' ? 'FoodPanda' : source === 'pos' ? 'POS' : source.charAt(0).toUpperCase() + source.slice(1)
const PAGE_SIZE = 1000

/** The joined shapes Supabase returns for the two reads below. */
interface JoinedOutlet { name: string; code: string | null; entity: string | null }
interface JoinedSalesRow {
  sales_date: string
  gross_sales: number | string | null
  discount: number | string | null
  net_sales: number | string | null
  tax: number | string | null
  service_charge: number | string | null
  platform_fees: number | string | null
  advertising_spend: number | string | null
  payout: number | string | null
  record_count: number
  outlet_id: string
  outlets: JoinedOutlet | null
  sales_imports: { reporting_month: string; source: string } | null
}
interface JoinedPurchaseRow {
  purchase_date: string
  purchase_amount: number | string | null
  grn_number: string | null
  supplier_name: string | null
  outlet_id: string
  outlets: JoinedOutlet | null
}
interface ImportStatusRow { source: string; file_name: string; status: string; created_at: string }
/** RPC rows can contain legacy imports with a missing branch code or name. */
interface GRNOutletTotal { branch_code: string | null; branch_name: string | null; total_purchase: number | string | null }

/** Reads one table a page at a time, so a full month is never silently truncated. */
async function readAll<T>(page: (from: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as T[]
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
  }
}

export const ImportedSalesSection: React.FC<ImportedSalesSectionProps> = ({ reportingMonth, refreshToken, entityFilter, channelFilter, section, onEntityFilterChange }) => {
  const [rows, setRows] = useState<ImportedRow[]>([])
  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [imports, setImports] = useState<ImportStatusRow[]>([])
  const [directory, setDirectory] = useState<OutletDirectory>(EMPTY_DIRECTORY)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'needs-auth' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  // Imported figures are shared across every signed-in account, so the cache
  // scope is the reporting month rather than the identity that uploaded them.
  const loadedScopeRef = useRef<string | null>(null)

  const reloadDirectory = () => { void loadOutletDirectory().then(setDirectory).catch(() => setDirectory(EMPTY_DIRECTORY)) }

  useEffect(() => {
    let active = true
    const clear = () => { setRows([]); setPurchases([]); setImports([]); setDirectory(EMPTY_DIRECTORY); setRefreshError('') }

    const load = async () => {
      // A month change is known before any network call, so the previous
      // month's figures come off the screen immediately.
      if (loadedScopeRef.current && loadedScopeRef.current !== reportingMonth) {
        loadedScopeRef.current = null
        clear()
        setStatus('loading')
      }
      let supabase
      try {
        supabase = getSupabaseClient()
      } catch (caught) {
        if (active) { loadedScopeRef.current = null; clear(); setStatus('error'); setMessage(caught instanceof Error ? caught.message : 'Supabase is not configured.') }
        return
      }

      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (!active) return
      if (authError || !auth.user) {
        // Signing out drops every figure from the previous identity.
        loadedScopeRef.current = null
        clear()
        setStatus('needs-auth')
        return
      }

      const scope = reportingMonth
      const isInitialLoad = loadedScopeRef.current !== scope
      if (isInitialLoad) { clear(); setStatus('loading') } else { setIsRefreshing(true); setRefreshError('') }

      try {
        const month = `${reportingMonth}-01`
        const monthEnd = new Date(Number(reportingMonth.slice(0, 4)), Number(reportingMonth.slice(5, 7)), 0).toISOString().slice(0, 10)
        const [sales, bought, imported] = await Promise.all([
          readAll<JoinedSalesRow>(from => supabase
            .from('sales_daily')
            .select(`
              sales_date, gross_sales, discount, net_sales, tax, service_charge,
              platform_fees, advertising_spend, payout, record_count, outlet_id,
              outlets ( name, code, entity ),
              sales_imports!inner ( reporting_month, source )
            `)
            .eq('sales_imports.reporting_month', month)
            .order('sales_date', { ascending: true })
            .order('outlet_id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)),
          supabase.rpc('get_purchases_by_outlet', { p_start_date: month, p_end_date: monthEnd }).then(({ data, error }) => {
            if (error) throw new Error(error.message)
            return (data ?? []) as GRNOutletTotal[]
          }),
          // Failed and draft imports leave no sales_daily rows at all, so they
          // would otherwise vanish instead of showing as an actionable gap.
          (async () => {
            const { data, error } = await supabase.from('sales_imports')
              .select('source, file_name, status, created_at')
              .eq('reporting_month', month)
              .order('created_at', { ascending: false })
            if (error) throw new Error(error.message)
            return (data ?? []) as ImportStatusRow[]
          })(),
        ])
        if (!active) return

        setRows(sales.map(row => ({
          sales_date: row.sales_date,
          outlet_name: row.outlets?.name ?? 'Unnamed outlet',
          outlet_id: row.outlet_id,
          entity: row.outlets?.entity ?? null,
          source: row.sales_imports?.source ?? '',
          gross_sales: row.gross_sales,
          discount: row.discount,
          net_sales: row.net_sales,
          tax: row.tax,
          service_charge: row.service_charge,
          payout: row.payout,
          record_count: row.record_count,
        })))
        setPurchases(bought
          // A missing code cannot be matched to a sales outlet. Do not let a
          // malformed legacy GRN row prevent the whole imported-sales view
          // from loading.
          .filter((row): row is GRNOutletTotal & { branch_code: string } => typeof row.branch_code === 'string' && row.branch_code.length > 0)
          .map(row => ({
            purchase_date: month,
            outlet_id: row.branch_code,
            outlet_name: row.branch_name?.trim() || 'Unnamed outlet',
            entity: row.branch_code.startsWith('SB-') ? 'Sabah' : 'MY US PIZZA',
            purchase_amount: row.total_purchase,
          })))
        setImports(imported)
        setStatus(sales.length || bought.length || imported.length ? 'ready' : 'empty')
        loadedScopeRef.current = scope
        reloadDirectory()
      } catch (caught) {
        if (!active) return
        const errorMessage = caught instanceof Error ? caught.message : 'Unable to load imported sales.'
        // Stale figures survive only a refresh failure inside the same scope.
        if (loadedScopeRef.current === scope) setRefreshError(errorMessage)
        else { clear(); setStatus('error'); setMessage(errorMessage) }
      } finally {
        if (active) setIsRefreshing(false)
      }
    }
    void load()
    return () => { active = false }
  }, [reportingMonth, refreshToken])

  const overview = useMemo(() => importedOverview(rows, entityFilter), [rows, entityFilter])
  const profitability = useMemo(() => {
    const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const salesIdByName = new Map(overview.outlets.map(outlet => [key(outlet.name), outlet.id]))
    const normalizedPurchases = purchases
      .filter(row => entityFilter === 'all' || row.entity === ENTITY_NAMES[entityFilter])
      .map(row => ({ ...row, outlet_id: salesIdByName.get(key(row.outlet_name)) ?? row.outlet_id }))
    return outletProfitability(overview.outlets, normalizedPurchases)
  }, [overview.outlets, purchases, entityFilter])
  // Keep section 7 on the same detailed P&L screen for every month. The
  // selected reporting month only changes these inputs, never the layout.
  const importedPLOutlets = useMemo<PLDisplayOutlet[]>(() => {
    const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const salesIdByName = new Map(overview.outlets.map(outlet => [key(outlet.name), outlet.id]))
    const directoryById = new Map<string, OutletDirectory['outlets'][number]>(directory.outlets.map(outlet => [outlet.id, outlet]))
    const platformTotals = new Map<string, Record<string, number>>()

    for (const row of rows) {
      const outletId = row.outlet_id ?? salesIdByName.get(key(row.outlet_name))
      if (!outletId) continue
      const platform = sourceName(row.source)
      const current = platformTotals.get(outletId) ?? {}
      current[platform] = (current[platform] ?? 0) + Number(row.net_sales ?? 0)
      platformTotals.set(outletId, current)
    }

    return profitability.map(outlet => {
      const directoryOutlet = directoryById.get(outlet.id)
      const netSales = Number(outlet.net ?? 0)
      const totalPurchases = Number(outlet.purchases ?? 0)
      const grossProfit = netSales - totalPurchases
      return {
        name: outlet.name,
        code: directoryOutlet?.code ?? outlet.id,
        entity: directoryOutlet?.entity ?? (outlet.id.startsWith('SB-') ? 'Sabah' : 'MY US PIZZA'),
        netSales,
        purchases: totalPurchases,
        grossProfit,
        marginPct: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
        platforms: platformTotals.get(outlet.id) ?? {},
      }
    })
  }, [directory.outlets, overview.outlets, profitability, rows])
  // Section 3 reads what actually landed: rows per outlet and source, plus the
  // import statuses, so a failed file is a state rather than an absence.
  const coverage = useMemo(() => importedCoverage({
    directory,
    rows: rows.filter(row => entityFilter === 'all' || row.entity === ENTITY_NAMES[entityFilter]),
    automaticOutlets: true,
    failedSources: imports.filter(item => item.status === 'failed').map(item => item.source),
    purchaseOutletIds: purchases.map(row => row.outlet_id),
  }), [directory, rows, imports, purchases, entityFilter])
  const period = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(`${reportingMonth}-01T00:00:00`))

  if (status === 'loading') return <MonthlyState icon={<RefreshCircle className="h-5 w-5 animate-spin" />} title="Loading imported sales" message="Checking Supabase for this reporting month." />
  if (status === 'needs-auth') return <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title="Sign in to see imported figures" message="Sign in to view the shared dashboard data for this month." />
  if (status === 'error') return <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title="Could not load imported sales" message={message} />
  // Import analysis prepares missing P&L master records automatically.
  if (status === 'empty') return <section className="space-y-4">
    <MonthlyState icon={<CheckCircle className="h-5 w-5" />} title="This month has no imported sales yet" message="Use Import Sales to add POS, Grab, FoodPanda, Shopee, or Apps reports." />
  </section>

  return <section className="space-y-4">
    {isRefreshing && <p role="status" className="flex items-center gap-2 text-xs font-medium text-slate-500"><RefreshCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Refreshing imported sales…</p>}
    {refreshError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Could not refresh imported sales. Showing the last loaded figures. {refreshError}</p>}
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Imported coverage only; not a reconciled full-month corporate total. POS includes all channels, so platform reports are not added to it. Data imported by any signed-in user is shown here.
      <p className="mt-2">POS coverage: {overview.counts.myUsPizza} MY US Pizza + {overview.counts.sabah} Sabah = {overview.counts.all} outlets.</p>
    </div>
    {section === 'overview' ? <OverviewPage entityFilter={entityFilter} channelFilter={channelFilter} onEntityFilterChange={onEntityFilterChange} imported={overview} period={period} />
      : section === 'salesByOutlet' ? <SalesByOutletPage entityFilter={entityFilter} importedRows={rows} period={period} />
      : section === 'coverage' ? <div className="space-y-4">
          <TableCard title={`Channel coverage · ${period}`} subtitle="Outlets per state, by source. Imported means rows landed; Unavailable means no rows were imported for the outlet/source; Failed means this month's import did not finish. Nothing here claims a reconciled month." headers={['Source', 'Imported', 'Failed', 'Unavailable']} rows={coverageTotals(coverage).map(entry => [entry.source === 'grn' ? 'GRN / purchases' : sourceName(entry.source), String(entry.counts.imported), String(entry.counts.failed), String(entry.counts.unavailable)])} />
          <TableCard title={`Outlet coverage · ${period}`} subtitle="Every outlet this account owns, and what each source delivered for it. Record counts are source rows, not necessarily orders." headers={['Outlet', 'POS', 'Grab', 'FoodPanda', 'Shopee', 'Apps', 'GRN']} rows={coverage.map(outlet => [outlet.name, ...outlet.cells.map(cell => cell.state === 'imported' && cell.records ? `${COVERAGE_STATE_LABELS[cell.state]} · ${cell.records.toLocaleString()} / ${cell.days}d` : COVERAGE_STATE_LABELS[cell.state])])} />
          <TableCard title="Import status" subtitle="Every sales file uploaded for this month, most recent first. A draft or failed import contributed no figures above." headers={['File', 'Source', 'Status']} rows={imports.length ? imports.map(i => [i.file_name, sourceName(i.source), i.status]) : [['No imports yet', '—', '—']]} />
        </div>
      : section === 'purchasesByOutlet' ? <PurchasesByOutletPage entityFilter={entityFilter} importedPurchases={purchases} period={period} />
      : section === 'purchasesToNetSales' ? <PurchasesToNetSalesPage entityFilter={entityFilter} selectedMonth={reportingMonth} />
      : section === 'plByOutlet' ? <PLByOutletPage entityFilter={entityFilter} outletsOverride={importedPLOutlets} period={period} />
      : <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title="Commission and fees unavailable" message="The imported fee and payout fields require source reconciliation. Shopee commission and bank settlement are not supplied by the order export." />}
  </section>
}

const TableCard: React.FC<{ title: string; subtitle: string; headers: string[]; rows: string[][] }> = ({ title, subtitle, headers, rows }) => <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
  <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{subtitle}</p></div>
  <table className="w-full text-sm">
    <thead><tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">{headers.map((header, index) => <th key={header} className={`px-5 py-2 ${index ? 'text-right' : ''}`}>{header}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100">
      {rows.map(cells => <tr key={cells[0]}>{cells.map((cell, index) => <td key={index} className={`px-5 py-3 ${index ? 'text-right font-bold tabular-nums text-slate-900' : 'font-medium text-slate-700'}`}>{cell}</td>)}</tr>)}
    </tbody>
  </table>
</div>
const MonthlyState: React.FC<{ icon: React.ReactNode; title: string; message: string }> = ({ icon, title, message }) => <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-xs"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-[#C8102E]">{icon}</div><h2 className="mt-4 text-lg font-black text-slate-900">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{message}</p></section>
