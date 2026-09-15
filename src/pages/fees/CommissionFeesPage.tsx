import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle, NavArrowRight, Send, WarningTriangle, Xmark } from 'iconoir-react';
import { COMMISSION_FEES_SUMMARY, PLATFORM_SETTLEMENTS } from '../../data/outletData';
import { ChannelFilter } from '../../types';
import { FEE_TYPE_COLORS } from '../../platformColors';
import { copy } from '../../copy';
import { PlatformLogo } from '../../components/common/PlatformLogo';
import { SectionHeading } from '../../components/SalesDashboard/SectionHeading';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../../components/ui/table';

interface CommissionFeesPageProps { channelFilter: ChannelFilter; }
const PLATFORMS = ['Grab', 'FoodPanda', 'Shopee', 'Apps'] as const;
const FEE_ROWS = [{ key: 'commission', label: 'Commission' }, { key: 'advertising', label: 'Advertising' }, { key: 'platformFees', label: 'Platform / service fees' }, { key: 'paymentGateway', label: 'Payment gateway' }, { key: 'adjustments', label: 'Adjustments / credits' }] as const;
type FeePlatform = (typeof PLATFORMS)[number];
type FeeKey = (typeof FEE_ROWS)[number]['key'];
const money = (n: number) => `RM ${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const CommissionFeesPage: React.FC<CommissionFeesPageProps> = ({ channelFilter }) => {
  const { platforms, advertisingSpend, advertisingBreakdown, commissionMonth, totalFeesMonth } = COMMISSION_FEES_SUMMARY;
  const [active, setActive] = useState<FeePlatform | 'All'>('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const nonPos = PLATFORM_SETTLEMENTS.filter((p) => p.platform !== 'POS');
  const gross = nonPos.reduce((sum, p) => sum + p.grossSales, 0);
  const net = nonPos.reduce((sum, p) => sum + p.grossSales - p.discount, 0);
  const deducted = PLATFORM_SETTLEMENTS.reduce((sum, p) => sum + p.commissionFees, 0);
  const gap = totalFeesMonth - deducted;
  const selected = channelFilter !== 'All' && PLATFORMS.includes(channelFilter as FeePlatform) ? channelFilter as FeePlatform : active;
  const visible = selected === 'All' ? PLATFORMS : [selected];
  useEffect(() => {
    setActive(channelFilter !== 'All' && PLATFORMS.includes(channelFilter as FeePlatform) ? channelFilter as FeePlatform : 'All');
  }, [channelFilter]);

  const chartData = useMemo(() => PLATFORMS
    .filter((platform) => selected === 'All' || platform === selected)
    .map((platform) => ({ platform, total: platforms[platform].totalFees }))
    .sort((a, b) => b.total - a.total), [platforms, selected]);

  return <section className="space-y-5">
    <SectionHeading number={2} title="Commission & Platform Fees" subtitle="May 2026 · platform cost, effect on settlement, and reconciliation status" />
    {sent && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"><span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#C8102E]" aria-hidden="true" />Review request sent to Finance Team (fiqsss45).</span><Button variant="outline" className="min-h-8 px-2.5 py-1 text-[11px]" onClick={() => setSent(false)}>Dismiss</Button></div>}

    <div className="grid gap-3 sm:grid-cols-3">
      <MetricCard label="Total platform costs" value={money(totalFeesMonth)} detail={`${((totalFeesMonth / gross) * 100).toFixed(1)}% of non-POS gross`} tone="primary" />
      <MetricCard label="Commission" value={money(commissionMonth)} detail={`${((commissionMonth / net) * 100).toFixed(1)}% of non-POS net`} tone="brand" />
      <MetricCard label="Advertising spend" value={money(advertisingSpend)} detail={advertisingBreakdown} tone="neutral" />
    </div>

    <Card>
      <CardHeader><div><CardTitle>Platform cost comparison</CardTitle><CardDescription>Total fees from the May platform statements, ranked highest to lowest.</CardDescription></div></CardHeader>
      <CardContent>
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Platform filter"><Button className="shrink-0" variant={selected === 'All' ? 'default' : 'outline'} aria-pressed={selected === 'All'} onClick={() => setActive('All')}>All platforms</Button>{PLATFORMS.map((p) => <Button className="shrink-0" key={p} variant={selected === p ? 'default' : 'outline'} aria-pressed={selected === p} onClick={() => setActive(p)}><PlatformLogo platform={p} size="xs" />{p}</Button>)}</div>
        <FeeChart data={chartData} />
      </CardContent>
    </Card>

    <div>
      <div className="mb-3"><h3 className="text-sm font-bold text-slate-900">Platform breakdown</h3><p className="mt-0.5 text-xs text-slate-500">How each platform's total splits across fee types.</p></div>
      <div className="grid gap-3 lg:grid-cols-2">{visible.map((p) => <PlatformSummary key={p} platform={p} fees={platforms[p]} />)}</div>
    </div>

    <Card className="border-amber-200 bg-[#FFF8E8]"><CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-3"><div className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-800"><WarningTriangle className="h-5 w-5" aria-hidden="true" /></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-amber-950">Reconciliation needs review</h3><Badge variant="warning">Open difference</Badge></div><p className="mt-1 max-w-2xl text-sm leading-5 text-amber-900">{copy.feesGapIntro} {copy.feesUnexplained} <strong>{money(gap)}</strong>. {copy.feesGapOutro}</p></div></div><Button onClick={() => setDialogOpen(true)}><Send className="h-4 w-4" aria-hidden="true" />Assign review</Button></CardContent><div className="grid border-t border-amber-200 sm:grid-cols-3"><Recon label={copy.feesReportTotalLabel} value={money(totalFeesMonth)} /><Recon label={copy.feesDeductedLabel} value={money(deducted)} /><Recon label={copy.feesDifferenceLabel} value={money(gap)} emphasis /></div></Card>

    <Card><CardHeader><div><CardTitle>Detailed fee list</CardTitle><CardDescription>{copy.feesTableSubtitle}</CardDescription></div><Badge variant="outline">MYR · May 2026</Badge></CardHeader><CardContent className="pt-2"><FeeTable highlight={selected} data={platforms} /></CardContent></Card>
    <p className="text-xs leading-5 text-slate-500">{copy.feesFootnote}</p>
    {dialogOpen && <ReviewDialog gap={gap} onClose={() => setDialogOpen(false)} onSend={() => { setDialogOpen(false); setSent(true); }} />}
  </section>;
};

function MetricCard({ label, value, detail, tone, className = '' }: { label: string; value: string; detail: string; tone: 'primary' | 'brand' | 'neutral'; className?: string }) { const tones = { primary: 'border-[#E6D2B5] border-t-4 border-t-[#C8102E] bg-[#FFF8EE]', brand: 'border-slate-200 border-t-4 border-t-[#C8102E] bg-white', neutral: 'border-slate-200 border-t-4 border-t-[#D4A03A] bg-white' }; return <Card className={`${tones[tone]} ${className}`}><CardContent className="py-4"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className={`mt-2 font-black leading-none tracking-tight tabular-nums ${tone === 'primary' ? 'text-[clamp(1.65rem,3vw,2rem)] text-[#C8102E]' : 'text-[clamp(1.35rem,2.5vw,1.75rem)] text-slate-900'}`}>{value}</p><p className="mt-2 text-xs leading-4 text-slate-600">{detail}</p></CardContent></Card>; }
function Recon({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) { return <div className={`px-5 py-3 ${emphasis ? 'bg-amber-100/70' : ''}`}><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</p><p className={`mt-1 text-lg font-black tabular-nums ${emphasis ? 'text-amber-950' : 'text-slate-900'}`}>{value}</p></div>; }
function FeeChart({ data }: { data: Record<string, string | number>[] }) {
  return <div><div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><p className="text-xs font-medium text-slate-500">Total monthly platform costs (RM)</p><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Highest to lowest</p></div><div className={data.length > 1 ? 'h-[240px]' : 'h-[120px]'} role="img" aria-label="Horizontal bar chart ranking monthly platform costs from highest to lowest"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 4, right: 58, left: 6, bottom: 4 }}><CartesianGrid horizontal={false} stroke="#e2e8f0" /><XAxis type="number" tickFormatter={(v: number) => `RM ${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="platform" width={76} tick={{ fontSize: 12, fontWeight: 700, fill: '#334155' }} tickLine={false} axisLine={false} /><Tooltip formatter={(v: number) => money(v)} cursor={{ fill: '#f8fafc' }} /><Bar dataKey="total" name="Platform costs" fill="#C8102E" radius={[0, 5, 5, 0]} isAnimationActive={false}><LabelList dataKey="total" position="right" formatter={(v: number) => `${(v / 1000).toFixed(1)}k`} fill="#334155" fontSize={11} fontWeight={700} /></Bar></BarChart></ResponsiveContainer></div></div>;
}
/**
 * Every platform column stays visible so any fee line can be compared across
 * platforms in one scan; the channel filter tints its column rather than
 * hiding the rest. Rows are ordered by absolute group impact, so the biggest
 * cost driver reads first and credits fall to the bottom.
 */
function FeeTable({ highlight, data }: { highlight: FeePlatform | 'All'; data: typeof COMMISSION_FEES_SUMMARY.platforms }) {
  const rows = useMemo(
    () => [...FEE_ROWS].sort((a, b) => Math.abs(Number(data.Total[b.key])) - Math.abs(Number(data.Total[a.key]))),
    [data]
  );
  const stickyCol = 'sticky left-0 z-10';

  const amount = (value: number) => {
    if (value === 0) return <span className="text-slate-400">—</span>;
    const isCredit = value < 0;
    return (
      <span className={isCredit ? 'font-bold text-emerald-600' : undefined}>
        {isCredit ? '− ' : ''}
        {money(value)}
      </span>
    );
  };

  return (
    <Table className="min-w-[680px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={`${stickyCol} bg-white`}>Fee item</TableHead>
          {PLATFORMS.map((platform) => (
            <TableHead
              key={platform}
              className={`text-right ${highlight === platform ? 'bg-slate-50 text-slate-900' : ''}`}
            >
              {platform}
            </TableHead>
          ))}
          <TableHead className="text-right text-slate-900">Total</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((row) => (
          <React.Fragment key={row.key}>
            <TableRow>
              <TableCell className={`${stickyCol} bg-white font-semibold whitespace-nowrap text-slate-800`}>
                {row.label}
              </TableCell>
              {PLATFORMS.map((platform) => (
                <TableCell
                  key={platform}
                  className={`text-right tabular-nums text-slate-700 ${highlight === platform ? 'bg-slate-50/70' : ''}`}
                >
                  {amount(Number(data[platform][row.key]))}
                </TableCell>
              ))}
              <TableCell className="text-right font-bold tabular-nums text-slate-900">
                {amount(Number(data.Total[row.key]))}
              </TableCell>
            </TableRow>

            {/* The rate gives commission its meaning — 387k means little without 29.8% of net. */}
            {row.key === 'commission' && (
              <TableRow className="hover:bg-transparent">
                <TableCell className={`${stickyCol} bg-slate-50/60 py-1.5 pl-7 text-xs italic whitespace-nowrap text-slate-500`}>
                  ↳ rate, % of net sales
                </TableCell>
                {PLATFORMS.map((platform) => (
                  <TableCell
                    key={platform}
                    className={`py-1.5 text-right text-xs italic tabular-nums text-slate-500 ${
                      highlight === platform ? 'bg-slate-100/70' : 'bg-slate-50/60'
                    }`}
                  >
                    {data[platform].rate}
                  </TableCell>
                ))}
                <TableCell className="bg-slate-50/60 py-1.5 text-right text-xs font-semibold italic tabular-nums text-slate-600">
                  {data.Total.rate}
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>

      <TableFooter>
        <TableRow className="hover:bg-transparent">
          <TableCell className={`${stickyCol} bg-slate-50 whitespace-nowrap`}>Total platform costs</TableCell>
          {PLATFORMS.map((platform) => (
            <TableCell
              key={platform}
              className={`text-right tabular-nums ${highlight === platform ? 'bg-slate-100' : ''}`}
            >
              {money(data[platform].totalFees)}
            </TableCell>
          ))}
          <TableCell className="text-right tabular-nums text-amber-800">{money(data.Total.totalFees)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
const PlatformSummary: React.FC<{ platform: FeePlatform; fees: typeof COMMISSION_FEES_SUMMARY.platforms.Grab }> = ({ platform, fees }) => { const portions = FEE_ROWS.map((row) => ({ ...row, value: Math.abs(Number(fees[row.key])) })).filter((item) => item.value > 0); const total = portions.reduce((sum, item) => sum + item.value, 0); return <Card><CardContent className="py-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 font-bold text-slate-900"><PlatformLogo platform={platform} size="sm" />{platform}</div><Badge variant="outline">{money(fees.totalFees)} fees</Badge></div><div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">{portions.map((item) => <div key={item.key} style={{ width: `${(item.value / total) * 100}%`, background: FEE_TYPE_COLORS[item.key as FeeKey] }} title={`${item.label}: ${money(item.value)}`} />)}</div><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">{portions.map((item) => <span className="flex items-center gap-1 text-[11px] text-slate-600" key={item.key}><span className="h-2 w-2 rounded-sm" style={{ background: FEE_TYPE_COLORS[item.key as FeeKey] }} aria-hidden="true" />{item.label} {Math.round((item.value / total) * 100)}%</span>)}</div></CardContent></Card>; };
function ReviewDialog({ gap, onClose, onSend }: { gap: number; onClose: () => void; onSend: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      // Keep focus inside the dialog.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], select, textarea, input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={onClose}>
      <div ref={panelRef} className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" aria-describedby="review-dialog-description" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge variant="warning" className="mb-2">May exception</Badge>
            <h3 id="review-dialog-title" className="text-lg font-bold tracking-tight text-slate-950">Assign reconciliation review</h3>
            <p id="review-dialog-description" className="mt-1 text-sm leading-5 text-slate-600">Send this unresolved fee gap to the finance team, with the details needed to check it.</p>
          </div>
          <Button ref={closeButtonRef} variant="secondary" className="min-h-10 w-10 shrink-0 px-0" aria-label="Close review dialog" onClick={onClose}><Xmark className="h-4 w-4" aria-hidden="true" /></Button>
        </div>

        <div className="mt-5 flex items-end justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800">Open difference</p><p className="mt-1 text-2xl font-black text-amber-950 tabular-nums">{money(gap)}</p></div>
          <Badge variant="warning">Requires evidence</Badge>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-slate-800">Assign to
            <select className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
              <option>Finance Team (fiqsss45)</option><option>Platform Reconciliation Team</option><option>Sabah Operations Team</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-800">Review note
            <textarea className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C8102E]" defaultValue="Check the May fee report against bank settlements and attach the missing platform invoices." />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSend}>Send review <NavArrowRight className="h-4 w-4" aria-hidden="true" /></Button></div>
      </div>
    </div>
  );
}
