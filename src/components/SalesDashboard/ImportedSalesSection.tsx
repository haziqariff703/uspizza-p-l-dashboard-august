import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle, RefreshCircle, WarningTriangle } from 'iconoir-react'
import { getSupabaseClient } from '../../lib/supabase'
import { importedOverview, type ImportedRow } from '../../data/importedOverview'
import { outletProfitability, type PurchaseRow } from '../../data/importedPurchases'
import { OutletMappingPanel } from './OutletMappingPanel'
import { EMPTY_DIRECTORY, loadOutletDirectory, type OutletDirectory } from '../../lib/outletDirectory'
import { OverviewPage } from '../../pages/overview/OverviewPage'
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

const money = (value: number | null) => value === null ? 'Unavailable' : `RM ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const percent = (value: number | null) => value === null ? 'Unavailable' : `${value.toFixed(1)}%`
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
  const [directory, setDirectory] = useState<OutletDirectory>(EMPTY_DIRECTORY)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'needs-auth' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  // Figures are cached per signed-in user + month. A change of either is a
  // different scope that must load its own data, never reuse another's.
  const loadedScopeRef = useRef<string | null>(null)

  const reloadDirectory = () => { void loadOutletDirectory().then(setDirectory).catch(() => setDirectory(EMPTY_DIRECTORY)) }

  useEffect(() => {
    let active = true
    const clear = () => { setRows([]); setPurchases([]); setDirectory(EMPTY_DIRECTORY); setRefreshError('') }

    const load = async () => {
      // A month change is known before any network call, so the previous
      // month's figures come off the screen immediately.
      if (loadedScopeRef.current && !loadedScopeRef.current.endsWith(`|${reportingMonth}`)) {
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

      const scope = `${auth.user.id}|${reportingMonth}`
      const isInitialLoad = loadedScopeRef.current !== scope
      if (isInitialLoad) { clear(); setStatus('loading') } else { setIsRefreshing(true); setRefreshError('') }

      try {
        const month = `${reportingMonth}-01`
        const [sales, bought] = await Promise.all([
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
          readAll<JoinedPurchaseRow>(from => supabase
            .from('purchases_daily')
            .select(`
              purchase_date, purchase_amount, grn_number, supplier_name, outlet_id,
              outlets ( name, code, entity ),
              purchases_imports!inner ( reporting_month )
            `)
            .eq('purchases_imports.reporting_month', month)
            .order('purchase_date', { ascending: true })
            .order('outlet_id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)),
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
        setPurchases(bought.map(row => ({
          purchase_date: row.purchase_date,
          outlet_id: row.outlet_id,
          outlet_name: row.outlets?.name ?? 'Unnamed outlet',
          entity: row.outlets?.entity ?? null,
          purchase_amount: row.purchase_amount,
        })))
        setStatus(sales.length || bought.length ? 'ready' : 'empty')
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
  const profitability = useMemo(() => outletProfitability(
    overview.outlets,
    purchases.filter(row => entityFilter === 'all' || row.entity === ENTITY_NAMES[entityFilter]),
  ), [overview.outlets, purchases, entityFilter])
  const period = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(`${reportingMonth}-01T00:00:00`))

  if (status === 'loading') return <MonthlyState icon={<RefreshCircle className="h-5 w-5 animate-spin" />} title="Loading imported sales" message="Checking Supabase for this reporting month." />
  if (status === 'needs-auth') return <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title="Sign in to see imported figures" message="Imported sales belong to the account that uploaded them. Sign in with that account to load this month." />
  if (status === 'error') return <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title="Could not load imported sales" message={message} />
  if (status === 'empty') return <MonthlyState icon={<CheckCircle className="h-5 w-5" />} title="This month has no imported sales yet" message="Use Import Sales to add POS, Grab, FoodPanda, Shopee, or Apps reports." />

  return <section className="space-y-4">
    {isRefreshing && <p role="status" className="flex items-center gap-2 text-xs font-medium text-slate-500"><RefreshCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Refreshing imported sales…</p>}
    {refreshError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Could not refresh imported sales. Showing the last loaded figures. {refreshError}</p>}
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Imported coverage only; not a reconciled full-month corporate total. POS includes all channels, so platform reports are not added to it. Only imports belonging to your account are included.
      <p className="mt-2">POS coverage: {overview.counts.myUsPizza} MY US Pizza + {overview.counts.sabah} Sabah = {overview.counts.all} outlets.</p>
    </div>
    <OutletMappingPanel directory={directory} onChange={reloadDirectory} />
    {section === 'overview' ? <OverviewPage entityFilter={entityFilter} channelFilter={channelFilter} onEntityFilterChange={onEntityFilterChange} imported={overview} period={period} />
      : section === 'salesByOutlet' ? <TableCard title={`Sales by outlet · ${period}`} subtitle="Imported all-channel POS net sales before SST, by canonical outlet." headers={['Outlet', 'Net sales']} rows={overview.outlets.map(o => [o.name, money(o.net)])} />
      : section === 'coverage' ? <TableCard title={`Imported coverage · ${period}`} subtitle="Record counts are source rows, not necessarily orders. File completeness and duplicate checks are pending." headers={['Source', 'Coverage']} rows={overview.coverage.map(c => [sourceName(c.source), `${c.records.toLocaleString()} records · ${c.days} dates · ${c.outlets} outlets`])} />
      : section === 'purchasesByOutlet' ? <TableCard title={`Purchases by outlet · ${period}`} subtitle="Imported GRN purchase totals. An outlet with no imported purchases stays unavailable; it is not RM 0." headers={['Outlet', 'Purchases']} rows={profitability.map(o => [o.name, money(o.purchases)])} />
      : section === 'purchasesToNetSales' ? <TableCard title={`Purchases to net sales · ${period}`} subtitle="Both figures must be imported before a ratio exists." headers={['Outlet', 'Net sales', 'Purchases', 'Purchases % of net']} rows={profitability.map(o => [o.name, money(o.net), money(o.purchases), o.margin === null ? 'Unavailable' : percent(100 - o.margin)])} />
      : section === 'plByOutlet' ? <TableCard title={`P&L by outlet · ${period}`} subtitle="Gross profit is net sales minus purchases. Neither is assumed when a source did not supply it." headers={['Outlet', 'Net sales', 'Purchases', 'Gross profit', 'Margin']} rows={profitability.map(o => [o.name, money(o.net), money(o.purchases), money(o.grossProfit), percent(o.margin)])} />
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
