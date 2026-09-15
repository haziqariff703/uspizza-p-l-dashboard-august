import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle, RefreshCircle, WarningTriangle } from 'iconoir-react'
import { getSupabaseClient } from '../../lib/supabase'
import { importedOverview } from '../../data/importedOverview'
import { EMPTY_MAPPINGS, parseMappings, type OutletMappings } from '../../data/outletMaster'
import { OutletMappingPanel } from './OutletMappingPanel'
import { OverviewPage } from '../../pages/overview/OverviewPage'
import { type EntityScope } from '../../data/aggregate'
import { type ChannelFilter, type DashboardSection } from '../../types'

interface SalesDailyRow {
  sales_date: string
  outlet_name: string
  source: string
  gross_sales: number | string
  discount: number | string
  net_sales: number | string
  platform_fees: number | string
  advertising_spend: number | string
  payout: number | string
  record_count: number
  tax: number | string
  service_charge: number | string
}

interface ImportedSalesSectionProps {
  reportingMonth: string
  refreshToken: number
  entityFilter: EntityScope
  channelFilter: ChannelFilter
  section: DashboardSection
  onEntityFilterChange?: (filter: EntityScope) => void
}

const money = (value: number) => `RM ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const sourceName = (source: string) => source === 'foodpanda' ? 'FoodPanda' : source === 'pos' ? 'POS' : source.charAt(0).toUpperCase() + source.slice(1)
const PAGE_SIZE = 1000

export const ImportedSalesSection: React.FC<ImportedSalesSectionProps> = ({ reportingMonth, refreshToken, entityFilter, channelFilter, section, onEntityFilterChange }) => {
  const [rows, setRows] = useState<SalesDailyRow[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'needs-auth' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [mappings, setMappings] = useState<OutletMappings>(EMPTY_MAPPINGS)
  const [mappingKey, setMappingKey] = useState('')
  const [mappingError, setMappingError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setStatus('loading')
      try {
        const supabase = getSupabaseClient()
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError || !auth.user) {
          if (active) {
            setRows([])
            setStatus('needs-auth')
          }
          return
        }
        const key = `us-pizza-outlet-mappings-v1:${auth.user.id}`
        if (!active) return
        setMappingKey(key)
        try { setMappings(parseMappings(localStorage.getItem(key))); setMappingError('') }
        catch { setMappings(EMPTY_MAPPINGS); setMappingError('Saved outlet mappings could not be read in this browser.') }
        const importedRows: SalesDailyRow[] = []
        let from = 0
        while (true) {
          const { data, error } = await supabase
            .from('sales_daily')
            .select('sales_date, outlet_name, source, gross_sales, discount, net_sales, tax, service_charge, platform_fees, advertising_spend, payout, record_count')
            .eq('reporting_month', `${reportingMonth}-01`)
            .order('sales_date', { ascending: true })
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)
          if (error) throw error
          if (!active) return
          const page = (data ?? []) as SalesDailyRow[]
          importedRows.push(...page)
          if (page.length < PAGE_SIZE) break
          from += PAGE_SIZE
        }
        if (!active) return
        setRows(importedRows)
        setStatus(importedRows.length ? 'ready' : 'empty')
      } catch (error) {
        if (active) {
          setRows([])
          setStatus('error')
          setMessage(error instanceof Error ? error.message : 'Unable to load imported sales.')
        }
      }
    }
    void load()
    return () => { active = false }
  }, [reportingMonth, refreshToken])

  const overview = useMemo(() => importedOverview(rows, entityFilter, mappings), [rows, entityFilter, mappings])
  const saveMappings = (value: OutletMappings) => {
    try { localStorage.setItem(mappingKey, JSON.stringify(value)); setMappings(value); setMappingError('') }
    catch { setMappingError('Mapping could not be saved. Check browser storage availability and try again.') }
  }
  const period = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(`${reportingMonth}-01T00:00:00`))

  if (status === 'loading') return <MonthlyState icon={<RefreshCircle className="h-5 w-5 animate-spin" />} title="Loading imported sales" message="Checking Supabase for this reporting month." />
  if (status === 'needs-auth') return <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title="Sales dashboard is ready" message="Imported figures will load after dashboard authentication is enabled." />
  if (status === 'error') return <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title="Could not load imported sales" message={message} />
  if (status === 'empty') return <MonthlyState icon={<CheckCircle className="h-5 w-5" />} title="This month has no imported sales yet" message="Use Import Sales to add POS, Grab, FoodPanda, Shopee, or Apps reports." />

  return <section className="space-y-4">
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Imported coverage only; not a reconciled full-month corporate total. POS includes all channels, so platform reports are not added to it. Only imports accessible to your account are included.
      <p className="mt-2">POS coverage: {overview.counts.myUsPizza} MY US Pizza + {overview.counts.sabah} Sabah + {overview.posUnmapped} unresolved names = {overview.counts.all} outlet groups. Unresolved names remain in All until mapped; aliases count once per canonical outlet.</p>
    </div>
    {mappingError && <p role="alert" className="text-sm text-red-700">{mappingError}</p>}
    <OutletMappingPanel rows={rows} mappings={mappings} onSave={saveMappings} />
    {section === 'overview' ? <OverviewPage entityFilter={entityFilter} channelFilter={channelFilter} onEntityFilterChange={onEntityFilterChange} imported={overview} period={period} />
      : section === 'salesByOutlet' ? <TableCard title={`Sales by outlet · ${period}`} subtitle="Imported all-channel POS net sales before SST, grouped by canonical outlet. Unmapped source names are shown separately." rows={overview.outlets.map(o => [o.name, money(o.net)])} />
      : section === 'coverage' ? <TableCard title={`Imported coverage · ${period}`} subtitle="Record counts are source rows, not necessarily orders. File completeness and duplicate checks are pending." rows={overview.coverage.map(c => [sourceName(c.source), `${c.records.toLocaleString()} records · ${c.days} dates · ${c.outlets} outlet names`])} />
      : <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title={section === 'fees' ? 'Commission and fees unavailable' : 'Purchases and profitability unavailable'} message={section === 'fees' ? 'The imported fee and payout fields require source reconciliation. Shopee commission and bank settlement are not supplied by the order export.' : 'August purchases/GRN data is required to calculate purchases, gross profit, gross margin, and outlet P&L. Missing values cannot be treated as zero.'} />}
  </section>
}

const TableCard: React.FC<{ title: string; subtitle: string; rows: [string, string][] }> = ({ title, subtitle, rows }) => <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{subtitle}</p></div><div className="divide-y divide-slate-100">{rows.map(([name, value]) => <div key={name} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><span className="truncate font-medium text-slate-700">{name}</span><span className="shrink-0 font-bold text-slate-900">{value}</span></div>)}</div></div>
const MonthlyState: React.FC<{ icon: React.ReactNode; title: string; message: string }> = ({ icon, title, message }) => <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-xs"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-[#C8102E]">{icon}</div><h2 className="mt-4 text-lg font-black text-slate-900">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{message}</p></section>
