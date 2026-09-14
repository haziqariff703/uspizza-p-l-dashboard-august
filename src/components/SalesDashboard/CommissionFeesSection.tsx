import React, { useState } from 'react';
import {
  WarningTriangle as AlertTriangle,
  Send as SendHorizontal,
  CheckCircle as CheckCircle2,
  Xmark as X
} from 'iconoir-react';
import { COMMISSION_FEES_SUMMARY, PLATFORM_SETTLEMENTS } from '../../data/outletData';
import { SectionHeading } from './SectionHeading';
import { ChannelFilter } from '../../types';
import { PlatformLogo } from '../common/PlatformLogo';
import { copy } from '../../copy';
import { FEE_TYPE_COLORS, PLATFORM_BRAND } from '../../platformColors';

interface CommissionFeesSectionProps {
  channelFilter: ChannelFilter;
}

const FEE_COMPOSITION: { key: 'commission' | 'advertising' | 'platformFees' | 'paymentGateway' | 'adjustments'; label: string }[] = [
  { key: 'commission', label: 'Commission' },
  { key: 'advertising', label: 'Advertising' },
  { key: 'platformFees', label: 'Platform / service fees' },
  { key: 'paymentGateway', label: 'Payment gateway' },
  { key: 'adjustments', label: 'Adjustments / credits' },
];

const money = (n: number) => `RM ${Math.abs(n).toLocaleString()}`;

const FEE_PLATFORMS = ['Grab', 'FoodPanda', 'Shopee', 'Apps'] as const;

const FEE_ROWS: { key: keyof (typeof COMMISSION_FEES_SUMMARY)['platforms']['Grab']; label: string }[] = [
  { key: 'commission', label: 'Commission' },
  { key: 'advertising', label: 'Advertising' },
  { key: 'platformFees', label: 'Platform / Service fees' },
  { key: 'paymentGateway', label: 'Payment gateway' },
  { key: 'adjustments', label: 'Adjustments / Credits' },
];

export const CommissionFeesSection: React.FC<CommissionFeesSectionProps> = ({ channelFilter }) => {
  const { platforms, advertisingSpend, advertisingBreakdown, commissionMonth, totalFeesMonth } =
    COMMISSION_FEES_SUMMARY;

  const [isLarkModalOpen, setIsLarkModalOpen] = useState(false);
  const [larkNote, setLarkNote] = useState('Reconciliation difference RM 158,143 identified between May fee reports and bank settlements. Awaiting platform transaction-level breakdown.');
  const [assignedOwner, setAssignedOwner] = useState('Finance Team (fiqsss45)');
  const [larkSuccessToast, setLarkSuccessToast] = useState(false);

  // Both headline percentages exclude POS, which carries no platform fees.
  const nonPos = PLATFORM_SETTLEMENTS.filter((p) => p.platform !== 'POS');
  const nonPosGross = nonPos.reduce((sum, p) => sum + p.grossSales, 0);
  const nonPosNet = nonPos.reduce((sum, p) => sum + p.grossSales - p.discount, 0);
  const feesOfGrossPct = ((totalFeesMonth / nonPosGross) * 100).toFixed(1);
  const commissionOfNetPct = ((commissionMonth / nonPosNet) * 100).toFixed(1);

  // Two sources describe "platform costs" differently
  const settlementDeducted = PLATFORM_SETTLEMENTS.reduce((sum, p) => sum + p.commissionFees, 0);
  const reconciliationGap = totalFeesMonth - settlementDeducted;

  const visiblePlatforms = FEE_PLATFORMS.filter((p) => channelFilter === 'All' || p === channelFilter);
  const showTotalColumn = channelFilter === 'All';

  const handleSendLarkAlert = () => {
    setIsLarkModalOpen(false);
    setLarkSuccessToast(true);
    setTimeout(() => setLarkSuccessToast(false), 4000);
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        number={2}
        title="Commission & Platform Fees"
        subtitle={`${money(totalFeesMonth)} total platform costs for May 2026 · with reconciliation gap`}
      />

      {/* Success Toast */}
      {larkSuccessToast && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Lark Webhook Dispatched: Notification sent to #{assignedOwner} with audit link and notes.</span>
          </div>
          <button
            onClick={() => setLarkSuccessToast(false)}
            aria-label="Dismiss notification"
            title="Dismiss"
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Metric Cards - Clean Swiss style (No generic purple) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Advertising Card */}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-end">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              Grab &amp; FoodPanda Ads
            </span>
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Advertising Spend</p>
          <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-slate-900">{money(advertisingSpend)}</p>
          <p className="mt-1 text-xs text-slate-500">{advertisingBreakdown}</p>
        </article>

        {/* Commission Card */}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-end">
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-[#C8102E] border border-rose-200">
              Effective Rate: {commissionOfNetPct}%
            </span>
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Commission / Month</p>
          <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-slate-900">{money(commissionMonth)}</p>
          <p className="mt-1 text-xs text-slate-500">
            <strong className="text-slate-700">{commissionOfNetPct}%</strong> of non-POS net sales ({money(nonPosNet)}), including Apps
          </p>
        </article>

        {/* Total Fees Card */}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-end">
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
              {feesOfGrossPct}% of Gross
            </span>
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Total Platform Fees</p>
          <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-amber-700">{money(totalFeesMonth)}</p>
          <p className="mt-1 text-xs text-slate-500">
            <strong className="text-slate-700">{feesOfGrossPct}%</strong> of non-POS gross sales ({money(nonPosGross)})
          </p>
        </article>
      </div>

      {/* Fees vs Settlement: Active Reconciliation Gap Banner with Lark Trigger */}
      <article className="rounded-xl border border-amber-300 bg-amber-50/70 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-950">
                  Platform Fee Report vs. Settlement Deductions Gap
                </h3>
                <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-[10px] font-black uppercase text-amber-900">
                  Requires Review
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-900/90 leading-relaxed max-w-3xl">
                {copy.feesGapIntro} {copy.feesUnexplained} <strong className="tabular-nums font-black text-amber-950">{money(reconciliationGap)}</strong>. {copy.feesGapOutro}
              </p>

              <dl className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-lg border border-amber-200 bg-white p-2.5">
                  <dt className="text-[11px] font-medium text-slate-500">{copy.feesReportTotalLabel}</dt>
                  <dd className="mt-0.5 font-bold tabular-nums text-slate-900">{money(totalFeesMonth)}</dd>
                </div>
                <div className="rounded-lg border border-amber-200 bg-white p-2.5">
                  <dt className="text-[11px] font-medium text-slate-500">{copy.feesDeductedLabel}</dt>
                  <dd className="mt-0.5 font-bold tabular-nums text-slate-900">{money(settlementDeducted)}</dd>
                </div>
                <div className="rounded-lg border border-amber-300 bg-amber-100/50 p-2.5">
                  <dt className="text-[11px] font-bold text-amber-900">{copy.feesDifferenceLabel}</dt>
                  <dd className="mt-0.5 font-black tabular-nums text-amber-900">{money(reconciliationGap)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Action Button: Lark Review & Follow-up */}
          <div className="flex sm:flex-col shrink-0 gap-2 items-end justify-end">
            <button
              id="open-lark-review-btn"
              type="button"
              onClick={() => setIsLarkModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs"
            >
              <SendHorizontal className="h-3.5 w-3.5" />
              <span>Assign Lark Review</span>
            </button>
            <span className="text-[10px] text-amber-800 font-medium hidden sm:block text-right">
              Bot webhook alerts team
            </span>
          </div>
        </div>
      </article>

      {/* Platform Fees Itemized Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {copy.feesTableTitle}
            </h4>
            <p className="text-[11px] text-slate-500">
              {copy.feesTableSubtitle}
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500">Currency: MYR (RM)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 text-left">Fee Item</th>
                {visiblePlatforms.map((platform) => (
                  <th key={platform} className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <PlatformLogo platform={platform} size="xs" />
                      <span>{platform}</span>
                    </span>
                  </th>
                ))}
                {showTotalColumn && <th className="px-4 py-3 text-right text-slate-900 font-black">Consolidated Total</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FEE_ROWS.map((row) => (
                <React.Fragment key={row.key}>
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{row.label}</td>
                    {visiblePlatforms.map((platform) => {
                      const value = platforms[platform][row.key] as number;
                      const isCredit = row.key === 'adjustments' && value < 0;
                      return (
                        <td
                          key={platform}
                          className={`px-4 py-2.5 text-right tabular-nums ${
                            isCredit ? 'font-bold text-emerald-600' : 'text-slate-700 font-medium'
                          }`}
                        >
                          {value === 0 ? '—' : `${isCredit ? '− ' : ''}${money(value)}`}
                        </td>
                      );
                    })}
                    {showTotalColumn && (
                      <td
                        className={`px-4 py-2.5 text-right font-bold tabular-nums ${
                          row.key === 'adjustments' && (platforms.Total[row.key] as number) < 0
                            ? 'text-emerald-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {(platforms.Total[row.key] as number) < 0 ? '− ' : ''}
                        {money(platforms.Total[row.key] as number)}
                      </td>
                    )}
                  </tr>

                  {/* Commission rate sub-row */}
                  {row.key === 'commission' && (
                    <tr className="text-[11px] italic bg-slate-50/40 text-slate-500">
                      <td className="px-4 pb-2 pt-0.5 pl-7 text-slate-500">↳ Effective commission rate (% of net sales)</td>
                      {visiblePlatforms.map((platform) => (
                        <td key={platform} className="px-4 pb-2 pt-0.5 text-right tabular-nums font-semibold text-slate-600">
                          {platforms[platform].rate}
                        </td>
                      ))}
                      {showTotalColumn && (
                        <td className="px-4 pb-2 pt-0.5 text-right tabular-nums font-bold text-slate-800">
                          {platforms.Total.rate}
                        </td>
                      )}
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-black text-slate-900">
                <td className="px-4 py-3 uppercase text-xs tracking-wider">Total Platform Deductions</td>
                {visiblePlatforms.map((platform) => (
                  <td key={platform} className="px-4 py-3 text-right tabular-nums font-black">
                    {money(platforms[platform].totalFees)}
                  </td>
                ))}
                {showTotalColumn && (
                  <td className="px-4 py-3 text-right tabular-nums font-black text-amber-700 text-sm">
                    {money(platforms.Total.totalFees)}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Fee composition per platform — what each platform's total is made of */}
      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">Fee composition per platform</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEE_PLATFORMS.map((platform) => {
            const fees = platforms[platform];
            const segments = FEE_COMPOSITION.map((row) => ({
              ...row,
              value: Math.abs(fees[row.key] as number),
            })).filter((seg) => seg.value > 0);
            const segmentTotal = segments.reduce((sum, seg) => sum + seg.value, 0);

            return (
              <article key={platform} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: PLATFORM_BRAND[platform] }}
                      aria-hidden="true"
                    />
                    {platform}
                  </span>
                  <span className="tabular-nums text-slate-500">{money(fees.totalFees)} fees</span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  {segments.map((seg) => (
                    <div
                      key={seg.key}
                      style={{
                        width: `${(seg.value / segmentTotal) * 100}%`,
                        background: FEE_TYPE_COLORS[seg.key],
                      }}
                      title={`${seg.label}: ${money(seg.value)}`}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          {FEE_COMPOSITION.map((row) => (
            <span key={row.key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: FEE_TYPE_COLORS[row.key] }}
                aria-hidden="true"
              />
              {row.label}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        {copy.feesFootnote}
      </p>

      {/* Lark Review Modal */}
      {isLarkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assign Lark Audit Review</h3>
                <p className="text-[11px] text-slate-500">Dispatches webhook alert to Lark group</p>
              </div>
              <button
                onClick={() => setIsLarkModalOpen(false)}
                aria-label="Close Lark review dialog"
                title="Close"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700">Flagged Issue</label>
                <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
                  <span className="font-black">RM 158,143</span> Platform Fee Reconciliation Gap (May 2026)
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700">Assignee</label>
                <select
                  value={assignedOwner}
                  onChange={(e) => setAssignedOwner(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800"
                >
                  <option value="Finance Lead (fiqsss45)">fiqsss45 (Finance Lead)</option>
                  <option value="Sabah Operations Team">Sabah Operations Team</option>
                  <option value="Platform Reconciliation Team">Platform Reconciliation Specialist</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700">Audit Notes &amp; Action Required</label>
                <textarea
                  rows={3}
                  value={larkNote}
                  onChange={(e) => setLarkNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsLarkModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendLarkAlert}
                className="flex items-center gap-1.5 rounded-lg bg-[#0284C7] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#0369A1] shadow-xs"
              >
                <SendHorizontal className="h-3.5 w-3.5" />
                <span>Send Lark Webhook Alert</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
