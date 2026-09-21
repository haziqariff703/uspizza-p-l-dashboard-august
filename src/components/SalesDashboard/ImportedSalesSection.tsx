import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle, RefreshCircle, WarningTriangle } from 'iconoir-react'
import { getSupabaseClient } from '../../lib/supabase'
import { importedOverview, type ImportedRow } from '../../data/importedOverview'
import { matchedProfitability, outletProfitability, purchaseRowFromGRN, type GRNPurchaseTotal, type PurchaseRow } from '../../data/importedPurchases'
import { importedCoverage } from '../../data/importedCoverage'
import { EMPTY_DIRECTORY, loadOutletDirectory, type OutletDirectory } from '../../lib/outletDirectory'
import { OverviewPage } from '../../pages/overview/OverviewPage'
import { SalesByOutletPage } from '../../pages/sales-by-outlet/SalesByOutletPage'
import { PurchasesByOutletPage } from '../../pages/purchases-by-outlet/PurchasesByOutletPage'
import { PurchasesToNetSalesPage } from '../../pages/purchases-to-net-sales/PurchasesToNetSalesPage'
import { PLByOutletPage, type PLDisplayOutlet } from '../../pages/pl-by-outlet/PLByOutletPage'
import { ImportedCoveragePage } from '../../pages/coverage/ImportedCoveragePage'
import { importedFeesViewModel } from '../../data/importedFees'
import { FeesSection } from '../../pages/fees/FeesSection'
import { ENTITY_NAMES, type EntityScope } from '../../data/aggregate'
import { liveOutletRoster } from '../../data/liveOutletRoster'
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
  sales_imports: { reporting_month: string; source: string; status: string } | null
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
  const [unmatchedGRN, setUnmatchedGRN] = useState<Array<{ line_count: number | string }>>([])
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
    const clear = () => { setRows([]); setPurchases([]); setUnmatchedGRN([]); setImports([]); setDirectory(EMPTY_DIRECTORY); setRefreshError('') }

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
        const monthEnd = `${reportingMonth}-${new Date(Date.UTC(Number(reportingMonth.slice(0, 4)), Number(reportingMonth.slice(5, 7)), 0)).getUTCDate()}`
        const [sales, bought, imported, unmatched] = await Promise.all([
          readAll<JoinedSalesRow>(from => supabase
            .from('sales_daily')
            .select(`
              sales_date, gross_sales, discount, net_sales, tax, service_charge,
              platform_fees, advertising_spend, payout, record_count, outlet_id,
              outlets ( name, code, entity ),
              sales_imports!inner ( reporting_month, source, status )
            `)
            .eq('sales_imports.reporting_month', month)
            .eq('sales_imports.status', 'imported')
            .order('sales_date', { ascending: true })
            .order('outlet_id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)),
          supabase.rpc('get_purchases_by_outlet', { p_start_date: month, p_end_date: monthEnd }).then(({ data, error }) => {
            if (error) throw new Error(`Could not load GRN purchases: ${error.message}`)
            return (data ?? []) as GRNPurchaseTotal[]
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
          supabase.rpc('get_unmatched_grn_branches', { p_start_date: month, p_end_date: monthEnd }).then(({ data, error }) => {
            if (error) throw new Error(`Could not check GRN mapping coverage: ${error.message}`)
            return (data ?? []) as Array<{ line_count: number | string }>
          }),
        ])
        if (!active) return

        setRows(sales.map(row => ({
          sales_date: row.sales_date,
          outlet_name: row.outlets?.name ?? 'Unnamed outlet',
          outlet_id: row.outlet_id,
          outlet_code: row.outlets?.code ?? null,
          entity: row.outlets?.entity ?? null,
          source: row.sales_imports?.source ?? '',
          gross_sales: row.gross_sales,
          discount: row.discount,
          net_sales: row.net_sales,
          tax: row.tax,
          service_charge: row.service_charge,
          platform_fees: row.platform_fees,
          advertising_spend: row.advertising_spend,
          payout: row.payout,
          record_count: row.record_count,
        })))
        setPurchases(bought.map(row => purchaseRowFromGRN(row, month)))
        setUnmatchedGRN(unmatched)
        setImports(imported)
        setStatus(sales.length || bought.length || imported.length ? 'ready' : 'empty')
        loadedScopeRef.current = scope
        reloadDirectory()
      } catch (caught) {
        if (!active) return
        // The UI only ever shows caught.message; log the full error here so a
        // real stack trace (file:line) is still visible in the console when
        // something throws with an unhelpful message, e.g. a TypeError from
        // deep inside a Supabase call.
        console.error('[ImportedSalesSection] load failed:', caught)
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
  const roster = useMemo(() => liveOutletRoster(directory.outlets), [directory.outlets])
  const scopedRoster = useMemo(() => roster.filter(outlet => entityFilter === 'all' || outlet.entity === ENTITY_NAMES[entityFilter]), [roster, entityFilter])
  const profitability = useMemo(() => {
    const scopedPurchases = purchases
      .filter(row => entityFilter === 'all' || row.entity === ENTITY_NAMES[entityFilter])
    return outletProfitability(scopedRoster.map(outlet => ({ ...outlet, net: overview.outlets.find(row => row.id === outlet.id)?.net ?? null })), scopedPurchases)
  }, [overview.outlets, scopedRoster, purchases, entityFilter])
  const overviewWithPurchases = useMemo(() => {
    const scoped = purchases.filter(row => entityFilter === 'all' || row.entity === ENTITY_NAMES[entityFilter])
    const total = scoped.length && scoped.every(row => row.purchase_amount !== null)
      ? Math.round(scoped.reduce((sum, row) => sum + Number(row.purchase_amount), 0) * 100) / 100 : null
    const { grossProfit, margin, matchedCount, excludedCount } = matchedProfitability(profitability)
    const profitabilityNote = `${matchedCount} matched POS/GRN outlets · imported sales coverage, not full-month profit. ${excludedCount} outlets excluded for missing sales or purchases.`
    const counts = { all: roster.length, myUsPizza: roster.filter(row => row.entity === ENTITY_NAMES.myUsPizza).length, sabah: roster.filter(row => row.entity === ENTITY_NAMES.sabah).length }
    return { ...overview, counts, profitabilityNote, totals: { ...overview.totals, outletCount: scopedRoster.length, purchases: total, grossProfit, margin } }
  }, [overview, profitability, purchases, entityFilter, roster, scopedRoster])
  // Keep section 7 on the same detailed P&L screen for every month. The
  // selected reporting month only changes these inputs, never the layout.
  const importedPLOutlets = useMemo<PLDisplayOutlet[]>(() => {
    const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const salesIdByName = new Map(overview.outlets.map(outlet => [key(outlet.name), outlet.id]))
    const directoryById = new Map<string, OutletDirectory['outlets'][number]>(directory.outlets.map(outlet => [outlet.id, outlet]))
    const entityById = new Map([...rows, ...purchases].map(row => [row.outlet_id, row.entity]))
    const platformTotals = new Map<string, Record<string, number>>()

    for (const row of rows) {
      const outletId = row.outlet_id ?? salesIdByName.get(key(row.outlet_name))
      if (!outletId) continue
      const platform = sourceName(row.source)
      const current = platformTotals.get(outletId) ?? {}
      current[platform] = (current[platform] ?? 0) + Number(row.net_sales ?? 0)
      platformTotals.set(outletId, current)
    }

    return profitability
      // Section 7 requires each P&L input. Omit incomplete outlets rather than
      // converting unavailable purchases or margin into a fictional zero.
      .map(outlet => {
      const directoryOutlet = directoryById.get(outlet.id)
      const netSales = outlet.net
      const totalPurchases = outlet.purchases
      const grossProfit = outlet.grossProfit
      return {
        name: outlet.name,
        code: directoryOutlet?.code ?? outlet.id,
        entity: directoryOutlet?.entity ?? entityById.get(outlet.id) ?? 'Unresolved entity',
        netSales,
        purchases: totalPurchases,
        grossProfit,
        marginPct: outlet.margin,
        platforms: platformTotals.get(outlet.id) ?? {},
      }
      })
  }, [directory.outlets, overview.outlets, profitability, rows, purchases])
  // Section 3 reads what actually landed: rows per outlet and source, plus the
  // import statuses, so a failed file is a state rather than an absence.
  const coverage = useMemo(() => importedCoverage({
    directory: { ...directory, outlets: scopedRoster },
    rows: rows.filter(row => entityFilter === 'all' || row.entity === ENTITY_NAMES[entityFilter]),
    automaticOutlets: true,
    failedSources: imports.filter(item => item.status === 'failed').map(item => item.source),
    purchaseOutletIds: purchases.map(row => row.outlet_id),
  }), [directory, scopedRoster, rows, imports, purchases, entityFilter])
  const period = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(`${reportingMonth}-01T00:00:00`))
  // Section 2 reads the same loaded rows as every other section. The live
  // adapter turns them into the shared fee view-model; a failed/draft file is
  // surfaced as a coverage state rather than silently ignored.
  const fees = useMemo(() => importedFeesViewModel(
    rows,
    channelFilter,
    entityFilter,
    period,
    overview.unmapped.length,
    imports.filter(item => item.status !== 'imported').map(item => ({ source: item.source, status: item.status })),
  ), [rows, channelFilter, entityFilter, period, overview.unmapped.length, imports])

  if (status === 'loading') return <MonthlyState icon={<RefreshCircle className="h-5 w-5 animate-spin" />} title="Loading imported sales" message="Checking Supabase for this reporting month." />
  if (status === 'needs-auth') return <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title="Sign in to see imported figures" message="Sign in to view the shared dashboard data for this month." />
  if (status === 'error') return <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title="Could not load imported sales" message={message} />
  // Import analysis prepares missing P&L master records automatically.
  if (status === 'empty') return <section className="space-y-4">
    <MonthlyState icon={<CheckCircle className="h-5 w-5" />} title="This month has no imported sales yet" message="Use Import Sales to add POS, Grab, FoodPanda, Shopee, or Apps reports." />
  </section>

  return <section className="space-y-4">
    {unmatchedGRN.length > 0 && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">GRN mapping gap: {unmatchedGRN.reduce((sum, row) => sum + Number(row.line_count), 0)} rows across {unmatchedGRN.length} branches are excluded from mapped purchase figures. Coverage is for all entities.</p>}
    {isRefreshing && <p role="status" className="flex items-center gap-2 text-xs font-medium text-slate-500"><RefreshCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Refreshing imported sales…</p>}
    {refreshError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Could not refresh imported sales. Showing the last loaded figures. {refreshError}</p>}
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Imported coverage only; not a reconciled full-month corporate total. POS includes all channels, so platform reports are not added to it. Data imported by any signed-in user is shown here.
      <p className="mt-2">Operating outlets: {roster.length}. POS coverage: {overview.counts.myUsPizza} MY US Pizza + {overview.counts.sabah} Sabah = {overview.counts.all} outlets with POS data. Platform-only outlets remain visible; missing data is —.</p>
    </div>
    {section === 'overview' ? <OverviewPage entityFilter={entityFilter} channelFilter={channelFilter} onEntityFilterChange={onEntityFilterChange} imported={overviewWithPurchases} period={period} />
      : section === 'salesByOutlet' ? <SalesByOutletPage entityFilter={entityFilter} importedRows={rows} period={period} />
      : section === 'coverage' ? <ImportedCoveragePage coverage={coverage} imports={imports} period={period} />
      : section === 'purchasesByOutlet' ? <PurchasesByOutletPage entityFilter={entityFilter} importedPurchases={purchases} period={period} />
      : section === 'purchasesToNetSales' ? <PurchasesToNetSalesPage entityFilter={entityFilter} importedRows={profitability} period={period} />
      : section === 'plByOutlet' ? <PLByOutletPage entityFilter={entityFilter} outletsOverride={importedPLOutlets} period={period} />
      : <FeesSection model={fees} channelFilter={channelFilter} />}
    {section === 'salesByOutlet' && <TableCard
      title={`Operating outlets · ${scopedRoster.length} · ${period}`}
      subtitle="Each source is shown separately. Platform amounts overlap POS and are not added together. — means no known value; not zero."
      headers={['Outlet', 'POS net', 'Grab net', 'FoodPanda net', 'Shopee net', 'Apps net', 'GRN']}
      rows={scopedRoster.map(outlet => {
        const values = importedOverview(rows.filter(row => row.outlet_id === outlet.id), 'all').totals
        const money = (value: number | null) => value === null ? '—' : `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        return [outlet.name, ...['pos', 'grab', 'foodpanda', 'shopee', 'apps'].map(source => money(values.byPlatform.find(platform => platform.platform === source)?.net ?? null)), money(profitability.find(row => row.id === outlet.id)?.purchases ?? null)]
      })}
    />}
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
