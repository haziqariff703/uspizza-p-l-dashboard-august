import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle, RefreshCircle, WarningTriangle } from 'iconoir-react'
import { getSupabaseClient } from '../../lib/supabase'

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
}

interface ImportedSalesSectionProps {
  reportingMonth: string
  refreshToken: number
}

const money = (value: number) => `RM ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const asNumber = (value: number | string) => Number(value) || 0
const sourceName = (source: string) => source === 'foodpanda' ? 'FoodPanda' : source === 'pos' ? 'POS' : source.charAt(0).toUpperCase() + source.slice(1)

export const ImportedSalesSection: React.FC<ImportedSalesSectionProps> = ({ reportingMonth, refreshToken }) => {
  const [rows, setRows] = useState<SalesDailyRow[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'needs-auth' | 'error'>('loading')
  const [message, setMessage] = useState('')

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
        const { data, error } = await supabase
          .from('sales_daily')
          .select('sales_date, outlet_name, source, gross_sales, discount, net_sales, platform_fees, advertising_spend, payout, record_count')
          .eq('reporting_month', `${reportingMonth}-01`)
          .order('sales_date', { ascending: true })
        if (error) throw error
        if (!active) return
        setRows((data ?? []) as SalesDailyRow[])
        setStatus(data?.length ? 'ready' : 'empty')
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

  const summary = useMemo(() => {
    const bySource = new Map<string, number>()
    const byOutlet = new Map<string, number>()
    const days = new Set<string>()
    let gross = 0
    let discount = 0
    let net = 0
    let fees = 0
    let ads = 0
    let payout = 0
    let records = 0
    for (const row of rows) {
      gross += asNumber(row.gross_sales)
      discount += asNumber(row.discount)
      net += asNumber(row.net_sales)
      fees += asNumber(row.platform_fees)
      ads += asNumber(row.advertising_spend)
      payout += asNumber(row.payout)
      records += row.record_count
      days.add(row.sales_date)
      bySource.set(row.source, (bySource.get(row.source) ?? 0) + asNumber(row.net_sales))
      byOutlet.set(row.outlet_name, (byOutlet.get(row.outlet_name) ?? 0) + asNumber(row.net_sales))
    }
    return { gross, discount, net, fees, ads, payout, records, days: days.size, sources: [...bySource.entries()].sort((a, b) => b[1] - a[1]), outlets: [...byOutlet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10) }
  }, [rows])

  if (status === 'loading') return <MonthlyState icon={<RefreshCircle className="h-5 w-5 animate-spin" />} title="Loading imported sales" message="Checking Supabase for this reporting month." />
  if (status === 'needs-auth') return <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title="Sales dashboard is ready" message="Imported figures will load after dashboard authentication is enabled." />
  if (status === 'error') return <MonthlyState icon={<WarningTriangle className="h-5 w-5" />} title="Could not load imported sales" message={message} />
  if (status === 'empty') return <MonthlyState icon={<CheckCircle className="h-5 w-5" />} title="This month has no imported sales yet" message="Use Import Sales to add POS, Grab, FoodPanda, Shopee, or Apps reports." />

  return <section className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Gross sales" value={money(summary.gross)} /><Metric label="Discounts" value={money(summary.discount)} /><Metric label="Net sales" value={money(summary.net)} /><Metric label="Payout received" value={money(summary.payout)} /></div><div className="grid gap-4 lg:grid-cols-2"><TableCard title="Net sales by source" subtitle={`${summary.records.toLocaleString()} source records across ${summary.days} sales days`} rows={summary.sources.map(([name, value]) => [sourceName(name), money(value)])} /><TableCard title="Top outlets by net sales" subtitle={`Platform fees ${money(summary.fees)} · ads ${money(summary.ads)}`} rows={summary.outlets.map(([name, value]) => [name, money(value)])} /></div></section>
}

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-xs"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-black tracking-tight text-slate-900">{value}</p></div>
const TableCard: React.FC<{ title: string; subtitle: string; rows: [string, string][] }> = ({ title, subtitle, rows }) => <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{subtitle}</p></div><div className="divide-y divide-slate-100">{rows.map(([name, value]) => <div key={name} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><span className="truncate font-medium text-slate-700">{name}</span><span className="shrink-0 font-bold text-slate-900">{value}</span></div>)}</div></div>
const MonthlyState: React.FC<{ icon: React.ReactNode; title: string; message: string }> = ({ icon, title, message }) => <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-xs"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-[#C8102E]">{icon}</div><h2 className="mt-4 text-lg font-black text-slate-900">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{message}</p></section>
