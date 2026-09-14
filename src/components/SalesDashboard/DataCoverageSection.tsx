import React, { useState, useMemo } from 'react';
import {
  WarningCircle as AlertCircle,
  ArrowRight,
  Check,
  Clock as Clock3,
  Database,
  MailIn as Inbox,
  MinusCircle,
  Shop as Store,
  Search,
  NavArrowLeft as ChevronLeft,
  NavArrowRight as ChevronRight,
  Send as SendHorizontal,
  CheckCircle as CheckCircle2,
  Xmark as X,
} from 'iconoir-react';
import { ENTITY_TOTALS } from '../../data/outletData';
import { SectionHeading } from './SectionHeading';
import { CoverageState, OutletFinancialData } from '../../types';
import { PlatformLogo } from '../common/PlatformLogo';
import { copy } from '../../copy';

interface DataCoverageSectionProps {
  outlets: OutletFinancialData[];
  onGoToTasks: () => void;
}

type ChannelKey = keyof OutletFinancialData['channelStatus'];
const CHANNELS: ChannelKey[] = ['POS', 'Grab', 'FoodPanda', 'Shopee', 'Web', 'GRN'];

const STATE_BY_STATUS: Record<OutletFinancialData['channelStatus'][ChannelKey], CoverageState> = {
  complete: 'checked',
  in_progress: 'received',
  pending: 'missing',
  flagged: 'na',
};

const STATE_META: Record<CoverageState, { label: string; icon: typeof Check; className: string; bg: string; text: string }> = {
  checked: { label: 'Checked', icon: Check, className: 'text-emerald-700 bg-emerald-100', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' },
  received: { label: 'Received', icon: Inbox, className: 'text-sky-700 bg-sky-100', bg: 'bg-sky-50 text-sky-700 border-sky-200', text: 'text-sky-700' },
  missing: { label: 'Missing', icon: AlertCircle, className: 'text-rose-700 bg-rose-100', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' },
  na: { label: 'N/A', icon: MinusCircle, className: 'text-slate-500 bg-slate-100', bg: 'bg-slate-50 text-slate-600 border-slate-200', text: 'text-slate-500' },
};

const STATE_ORDER: CoverageState[] = ['checked', 'received', 'missing', 'na'];

export const DataCoverageSection: React.FC<DataCoverageSectionProps> = ({ outlets, onGoToTasks }) => {
  // Table search, filter, and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'has_missing' | 'complete'>('all');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [larkAlertSent, setLarkAlertSent] = useState<string | null>(null);

  const trading = outlets.filter((o) => o.status === 'active');
  const upcoming = outlets.filter((o) => o.status === 'upcoming');
  const tradingTotal = ENTITY_TOTALS.all.outletsCount;

  const coverage = CHANNELS.map((channel) => {
    const counts: Record<CoverageState, number> = { checked: 0, received: 0, missing: 0, na: 0 };
    outlets.forEach((outlet) => {
      const state: CoverageState =
        outlet.status === 'upcoming' ? 'na' : STATE_BY_STATUS[outlet.channelStatus[channel]];
      counts[state] += 1;
    });
    return { channel, counts, sampled: outlets.length };
  });

  const checkedTotal = coverage.reduce((sum, c) => sum + c.counts.checked, 0);
  const reportsTotal = coverage.reduce((sum, c) => sum + c.sampled - c.counts.na, 0);

  // Filtered outlets for the interactive table
  const filteredOutlets = useMemo(() => {
    return outlets.filter((outlet) => {
      // Search query filter
      const matchesSearch =
        outlet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        outlet.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        outlet.state.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === 'has_missing') {
        return (
          outlet.status === 'active' &&
          Object.values(outlet.channelStatus).some((s) => s === 'pending')
        );
      }
      if (statusFilter === 'complete') {
        return (
          outlet.status === 'active' &&
          Object.values(outlet.channelStatus).every((s) => s === 'complete')
        );
      }

      return true;
    });
  }, [outlets, searchTerm, statusFilter]);

  // Pagination calculation
  const totalItems = filteredOutlets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedOutlets = filteredOutlets.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleTriggerLarkReminder = (outletName: string, channelName: string) => {
    setLarkAlertSent(`Lark reminder dispatched to #${outletName} for missing ${channelName} report.`);
    setTimeout(() => setLarkAlertSent(null), 4000);
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        number={3}
        title="Data Coverage & Outlet Matrix"
        subtitle={`${tradingTotal} active trading outlets · May 2026`}
        action={
          <button
            type="button"
            onClick={onGoToTasks}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
          >
            <span>Verification tasks</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      {/* Lark Toast Notification */}
      {larkAlertSent && (
        <div className="flex items-center justify-between rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-xs font-bold text-sky-900 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-sky-600" />
            <span>{larkAlertSent}</span>
          </div>
          <button
            onClick={() => setLarkAlertSent(null)}
            aria-label="Dismiss notification"
            title="Dismiss"
            className="text-sky-700 hover:text-sky-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Per-channel report status — the original's top-line coverage strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(['POS', 'Grab', 'FoodPanda', 'Shopee', 'Web'] as const).map((channel) => {
          const missing = trading.filter((o) => o.channelStatus[channel] === 'pending').length;
          const isComplete = missing === 0;
          return (
            <div
              key={channel}
              className={`rounded-xl border p-3 ${
                isComplete ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <PlatformLogo platform={channel === 'Web' ? 'Apps' : channel} size="xs" />
                <span className="text-sm font-semibold text-slate-700">{channel}</span>
              </div>
              <div className={`mt-1 text-lg font-bold ${isComplete ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isComplete ? '✓ complete' : `${missing} missing`}
              </div>
            </div>
          );
        })}
      </div>

      {(() => {
        const incomplete = trading.filter((o) =>
          Object.values(o.channelStatus).some((s) => s === 'pending')
        ).length;
        return incomplete === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-700">
            ✓ All {trading.length} trading outlets have complete reports across every channel for May 2026.
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {incomplete} of {trading.length} trading outlets still have a channel report outstanding for May 2026.
          </div>
        );
      })()}

      {/* Channel Summary Card Grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Channel Verification Health
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                {checkedTotal}/{reportsTotal} Reconciled
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {copy.coverageAssessed}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 uppercase">Verification Rate</span>
            <p className="text-xl font-black tabular-nums text-slate-900">
              {((checkedTotal / reportsTotal) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {coverage.map(({ channel, counts, sampled }) => (
            <div key={channel} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <PlatformLogo platform={channel === 'Web' ? 'Apps' : channel} size="xs" />
                  <span className="text-xs font-bold text-slate-800">{channel}</span>
                </div>
                <span className="text-[11px] font-semibold tabular-nums text-slate-500">/{sampled}</span>
              </div>
              <ul className="mt-2 space-y-1">
                {STATE_ORDER.filter((state) => counts[state] > 0).map((state) => {
                  const meta = STATE_META[state];
                  return (
                    <li key={state} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex items-center gap-1 text-slate-600">
                        <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${meta.className}`}>
                          <meta.icon className="h-2 w-2" />
                        </span>
                        <span>{meta.label}</span>
                      </span>
                      <span className="font-bold tabular-nums text-slate-900">{counts[state]}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <span className="font-bold text-slate-700">Audit Statuses:</span>
          {STATE_ORDER.map((state) => {
            const meta = STATE_META[state];
            return (
              <span key={state} className="flex items-center gap-1.5">
                <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${meta.className}`}>
                  <meta.icon className="h-2 w-2" />
                </span>
                <strong className="text-slate-800">{meta.label}</strong>
                <span className="text-slate-500">
                  {state === 'checked' ? '(Reconciled)' : state === 'received' ? '(File in, pending audit)' : state === 'missing' ? '(Not received)' : '(Pre-opening)'}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Interactive Outlet Coverage Table with Live Search and Pagination */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Table Toolbar */}
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={copy.coverageSearchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  title="Clear search"
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Status Filter Chips */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Outlets ({outlets.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('has_missing');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  statusFilter === 'has_missing'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Missing Reports
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('complete');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  statusFilter === 'complete'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                100% Reconciled
              </button>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 font-medium">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table View (lg and up) */}
        <div className="hidden lg:block">
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 text-left">Outlet / Store</th>
                <th className="w-24 px-3 py-3 text-left">Entity</th>
                {CHANNELS.map((ch) => (
                  <th key={ch} className="w-16 px-2 py-3 text-center">
                    <span className="inline-flex items-center justify-center gap-1">
                      <PlatformLogo platform={ch === 'Web' ? 'Apps' : ch} size="xs" />
                      <span className="sr-only">{ch}</span>
                      <span aria-hidden="true" className="hidden xl:inline">{ch}</span>
                    </span>
                  </th>
                ))}
                <th className="w-28 px-4 py-3 text-right">Coverage %</th>
                <th className="w-24 px-3 py-3 text-right">Lark Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOutlets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    {copy.coverageNoMatch}
                  </td>
                </tr>
              ) : (
                paginatedOutlets.map((outlet) => {
                  const isUpcoming = outlet.status === 'upcoming';
                  const channelEntries = Object.entries(outlet.channelStatus) as [ChannelKey, OutletFinancialData['channelStatus'][ChannelKey]][];
                  const completedChannels = channelEntries.filter(([_, s]) => s === 'complete').length;
                  const totalOwed = isUpcoming ? 0 : CHANNELS.length;
                  const pct = totalOwed > 0 ? Math.round((completedChannels / totalOwed) * 100) : 100;
                  const missingChannel = channelEntries.find(([_, s]) => s === 'pending');

                  return (
                    <tr key={outlet.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Outlet Info */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-bold text-slate-900">{outlet.name}</span>
                          <span className="shrink-0 font-mono text-[11px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                            {outlet.code}
                          </span>
                          {isUpcoming && (
                            <span className="shrink-0 rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-200">
                              Upcoming
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">{outlet.state}</span>
                      </td>

                      {/* Entity */}
                      <td className="px-3 py-2.5">
                        <span className={`inline-block truncate px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          outlet.entity === 'Sabah' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {outlet.entity}
                        </span>
                      </td>

                      {/* Channel Status Columns — icon-only with title + sr-only label */}
                      {CHANNELS.map((channel) => {
                        const rawStatus = outlet.channelStatus[channel];
                        const state: CoverageState = isUpcoming ? 'na' : STATE_BY_STATUS[rawStatus];
                        const meta = STATE_META[state];
                        const Icon = meta.icon;

                        return (
                          <td key={channel} className="px-2 py-2.5 text-center">
                            <span
                              className={`inline-flex items-center justify-center rounded-md p-1 ${meta.bg}`}
                              title={`${channel}: ${meta.label}`}
                            >
                              <Icon className="h-3 w-3" aria-hidden="true" />
                              <span className="sr-only">{`${channel}: ${meta.label}`}</span>
                            </span>
                          </td>
                        );
                      })}

                      {/* Coverage Progress % */}
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {isUpcoming ? (
                          <span className="text-[11px] font-semibold text-slate-500">N/A</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 sm:block">
                              <div
                                className={`h-full rounded-full ${
                                  pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`font-black text-xs ${
                              pct === 100 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-rose-700'
                            }`}>
                              {pct}%
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Lark Action Button */}
                      <td className="px-3 py-2.5 text-right">
                        {missingChannel ? (
                          <button
                            type="button"
                            onClick={() => handleTriggerLarkReminder(outlet.name, missingChannel[0])}
                            className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 transition-colors focus-visible:ring-2 focus-visible:ring-rose-400"
                            title={`Send Lark ping for missing ${missingChannel[0]} file`}
                          >
                            <SendHorizontal className="h-2.5 w-2.5" aria-hidden="true" />
                            <span>Ping</span>
                          </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">—</span>
                          )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / tablet card view (below lg) */}
        <div className="divide-y divide-slate-100 lg:hidden">
          {paginatedOutlets.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">{copy.coverageNoMatch}</p>
          ) : (
            paginatedOutlets.map((outlet) => {
              const isUpcoming = outlet.status === 'upcoming';
              const channelEntries = Object.entries(outlet.channelStatus) as [ChannelKey, OutletFinancialData['channelStatus'][ChannelKey]][];
              const completedChannels = channelEntries.filter(([_, s]) => s === 'complete').length;
              const totalOwed = isUpcoming ? 0 : CHANNELS.length;
              const pct = totalOwed > 0 ? Math.round((completedChannels / totalOwed) * 100) : 100;
              const missingChannel = channelEntries.find(([_, s]) => s === 'pending');

              return (
                <article key={outlet.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold text-slate-900">{outlet.name}</span>
                        <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-500">
                          {outlet.code}
                        </span>
                        {isUpcoming && (
                          <span className="shrink-0 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-bold text-sky-700">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {outlet.state} · {outlet.entity}
                      </span>
                    </div>
                    {isUpcoming ? (
                      <span className="text-[11px] font-semibold text-slate-500">N/A</span>
                    ) : (
                      <span className={`shrink-0 text-xs font-black ${
                        pct === 100 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        {pct}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {CHANNELS.map((channel) => {
                      const rawStatus = outlet.channelStatus[channel];
                      const state: CoverageState = isUpcoming ? 'na' : STATE_BY_STATUS[rawStatus];
                      const meta = STATE_META[state];
                      const Icon = meta.icon;
                      return (
                        <div
                          key={channel}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-1.5"
                          title={`${channel}: ${meta.label}`}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
                            <Icon className="h-2.5 w-2.5" aria-hidden="true" />
                          </span>
                          <span className="truncate text-[11px] font-semibold text-slate-700">{channel}</span>
                          <span className="sr-only">{meta.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {missingChannel && (
                    <button
                      type="button"
                      onClick={() => handleTriggerLarkReminder(outlet.name, missingChannel[0])}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-400"
                      title={`Send Lark ping for missing ${missingChannel[0]} file`}
                    >
                      <SendHorizontal className="h-3 w-3" aria-hidden="true" />
                      <span>Ping for {missingChannel[0]}</span>
                    </button>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-800 tabular-nums">{totalItems > 0 ? startIndex + 1 : 0}</strong> to{' '}
            <strong className="text-slate-800 tabular-nums">{endIndex}</strong> of{' '}
            <strong className="text-slate-800 tabular-nums">{totalItems}</strong> outlets
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => handlePageChange(pg)}
                className={`h-7 w-7 rounded-lg text-xs font-bold transition-all ${
                  currentPage === pg
                    ? 'bg-[#C8102E] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Outlets & Technical Source Card */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-sky-200 bg-sky-50/60 p-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Store className="h-5 w-5 text-sky-700" />
            <div>
              <p className="text-sm font-bold text-sky-950">
                {upcoming.length} Upcoming Outlets — Not Yet Trading
              </p>
              <p className="text-xs text-sky-900/70">
                Excluded from the {tradingTotal} trading count, included in the {tradingTotal + upcoming.length} corporate total.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {upcoming.map((outlet) => (
              <li key={outlet.id} className="flex items-center justify-between gap-3 text-xs bg-white/80 p-2.5 rounded-lg border border-sky-100">
                <span className="font-bold text-slate-800">
                  {outlet.name} <span className="font-mono text-[11px] text-slate-500">({outlet.code})</span>
                </span>
                <span className="flex items-center gap-1.5 text-sky-800 font-semibold text-[11px]">
                  <Clock3 className="h-3.5 w-3.5" />
                  {outlet.note ?? 'Not yet open'}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-slate-600" />
            <p className="text-sm font-bold text-slate-900">Channel Naming &amp; Source Pipeline</p>
          </div>
          <dl className="mt-4 space-y-2.5 text-xs">
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
              <dt className="font-bold text-slate-800">Apps vs. Web Source Uniformity</dt>
              <dd className="mt-0.5 text-slate-500">
                The channel listed as <strong className="text-slate-700">"Web"</strong> in coverage is consolidated as <strong className="text-slate-700">"Apps"</strong> in platform fee reconciliation. {copy.coverageWebAppsNote}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
              <dt className="font-bold text-slate-800">Goods Received Notes (GRN)</dt>
              <dd className="mt-0.5 text-slate-500">
                {copy.coverageGrnNote}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
              <dt className="font-bold text-slate-800">Web (app) sales source</dt>
              <dd className="mt-0.5 text-slate-500">
                May 2026 web orders come from <span className="font-medium text-slate-700">WEB ORDER 1-31MAY.csv</span>.
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </div>
  );
};
