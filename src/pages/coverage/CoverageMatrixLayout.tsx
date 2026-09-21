import React, { useMemo, useState } from 'react';
import {
  WarningCircle as AlertCircle,
  Check,
  NavArrowLeft as ChevronLeft,
  NavArrowRight as ChevronRight,
  Search,
  Send as SendHorizontal,
  CheckCircle as CheckCircle2,
  Xmark as X,
} from 'iconoir-react';
import { SectionHeading } from '../../components/SalesDashboard/SectionHeading';
import { PlatformLogo } from '../../components/common/PlatformLogo';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

/**
 * Section 3's one layout. Every reporting month — the May demo and every
 * imported month — renders through this component, so there is a single
 * implementation of the coverage strip, the per-source card grid, the
 * searchable/paginated outlet matrix and the footer panels.
 *
 * It is purely presentational: it knows nothing about where a state came from,
 * how many states exist, or whether an outlet is "upcoming" or "excluded". The
 * caller supplies a `CoverageViewModel` and the layout renders it.
 */

type IconComponent = React.ComponentType<{ className?: string }>;

export interface CoverageStateMeta {
  key: string;
  label: string;
  icon: IconComponent;
  /** Round chip behind the icon, e.g. `text-emerald-700 bg-emerald-100`. */
  chipClass: string;
  /** Bordered badge used inside a matrix cell. */
  cellClass: string;
  /** Legend parenthetical, e.g. "(Reconciled)". */
  description: string;
}

export interface CoverageColumn {
  key: string;
  label: string;
  /** `PlatformLogo` key. Columns without a brand mark omit this. */
  logo?: string;
}

export interface CoverageRowView {
  id: string;
  name: string;
  code: string | null;
  entity: string | null;
  /** Emphasised entity pill — the May page highlights Sabah this way. */
  entityAccent?: boolean;
  /** Small muted line under the outlet name. */
  subtitle?: string;
  /** Pill beside the outlet name, e.g. "Upcoming". */
  flag?: string;
  /** `null` renders "N/A" — the question does not apply to this row. */
  coveragePct: number | null;
  /** One entry per column key; a missing entry renders nothing. */
  cells: Record<string, { stateKey: string; detail?: string }>;
  action?: { label: string; title: string; onClick: () => void };
}

export interface CoverageFilter {
  key: string;
  label: string;
  tone: 'neutral' | 'negative' | 'positive';
  predicate: (row: CoverageRowView) => boolean;
}

export interface CoverageViewModel {
  subtitle: string;
  headingAction?: React.ReactNode;
  /** Dismissible confirmation strip, owned by the caller. */
  toast?: { message: string; onDismiss: () => void } | null;
  columns: CoverageColumn[];
  states: CoverageStateMeta[];
  /** Coarse per-source pass/fail row above the fold. */
  strip: Array<{ columnKey: string; isComplete: boolean; label: string }>;
  /** One-line verdict under the strip. */
  notice?: { tone: 'positive' | 'warning'; text: string };
  summary: {
    title: string;
    caption: string;
    badgeLabel: string;
    rateLabel: string;
    /** Already a percentage; `null` when the ratio has no honest denominator. */
    ratePercent: number | null;
    cards: Array<{ columnKey: string; counts: Record<string, number>; sampled: number }>;
  };
  searchPlaceholder: string;
  emptyMessage: string;
  filters: CoverageFilter[];
  rows: CoverageRowView[];
  /**
   * Whether the matrix reserves an action column. Explicit rather than inferred
   * from the rows, so a month where every outlet happens to be complete keeps
   * the same table shape as one where some are not.
   */
  showActionColumn?: boolean;
  /** Footer left panel: May lists upcoming outlets, imported months list exclusions. */
  infoPanel?: {
    tone: 'sky' | 'amber';
    icon: IconComponent;
    title: string;
    subtitle: string;
    items: Array<{ id: string; label: React.ReactNode; note: string; noteIcon?: IconComponent }>;
  };
  /** Footer right panel: definitions specific to this month's data model. */
  explainer?: {
    icon: IconComponent;
    title: string;
    items: Array<{ term: string; description: React.ReactNode }>;
  };
}

/**
 * The only tones Section 3 uses, per `DESIGN.md`'s semantic mapping: emerald =
 * reconciled, sky = informational, amber = pending/needs a decision, rose =
 * missing/negative, slate = not yet a fair question to ask. Shared so the demo
 * and imported adapters cannot drift into two different palettes.
 */
export const COVERAGE_TONES = {
  emerald: { chipClass: 'text-emerald-700 bg-emerald-100', cellClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  sky: { chipClass: 'text-sky-700 bg-sky-100', cellClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  amber: { chipClass: 'text-amber-700 bg-amber-100', cellClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  rose: { chipClass: 'text-rose-700 bg-rose-100', cellClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  slate: { chipClass: 'text-slate-500 bg-slate-100', cellClass: 'bg-slate-50 text-slate-600 border-slate-200' },
} as const;

const PANEL_TONE = {
  sky: {
    card: 'border-sky-200 bg-sky-50/60',
    icon: 'text-sky-700',
    title: 'text-sky-950',
    subtitle: 'text-sky-900/70',
    item: 'border-sky-100',
    note: 'text-sky-800',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50/60',
    icon: 'text-amber-700',
    title: 'text-amber-950',
    subtitle: 'text-amber-900/70',
    item: 'border-amber-100',
    note: 'text-amber-800',
  },
} as const;

const FILTER_TONE = {
  neutral: 'bg-white text-slate-900 shadow-xs',
  negative: 'bg-rose-600 text-white shadow-xs hover:bg-rose-600',
  positive: 'bg-emerald-700 text-white shadow-xs hover:bg-emerald-700',
} as const;

export const CoverageMatrixLayout: React.FC<{ model: CoverageViewModel }> = ({ model }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState(model.filters[0]?.key ?? 'all');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const stateByKey = useMemo(
    () => new Map(model.states.map((state) => [state.key, state])),
    [model.states]
  );
  const columnLabel = useMemo(
    () => new Map(model.columns.map((column) => [column.key, column.label])),
    [model.columns]
  );

  const filteredRows = useMemo(() => {
    const needle = searchTerm.toLowerCase();
    const filter = model.filters.find((option) => option.key === activeFilter);
    return model.rows.filter((row) => {
      const matchesSearch =
        row.name.toLowerCase().includes(needle) ||
        (row.code ?? '').toLowerCase().includes(needle) ||
        (row.subtitle ?? '').toLowerCase().includes(needle);
      if (!matchesSearch) return false;
      return filter ? filter.predicate(row) : true;
    });
  }, [model.rows, model.filters, searchTerm, activeFilter]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedRows = filteredRows.slice(startIndex, endIndex);
  const hasAction = model.showActionColumn ?? false;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const stateBadge = (row: CoverageRowView, columnKey: string) => {
    const cell = row.cells[columnKey];
    const meta = cell ? stateByKey.get(cell.stateKey) : undefined;
    if (!meta) return null;
    return { meta, title: `${columnLabel.get(columnKey) ?? columnKey}: ${cell?.detail ?? meta.label}` };
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        number={3}
        title="Data Coverage & Outlet Matrix"
        subtitle={model.subtitle}
        action={model.headingAction}
      />

      {model.toast && (
        <div className="flex items-center justify-between rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-xs font-bold text-sky-900 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-sky-600" />
            <span>{model.toast.message}</span>
          </div>
          <Button
            variant="secondary"
            onClick={model.toast.onDismiss}
            aria-label="Dismiss notification"
            title="Dismiss"
            className="min-h-0 rounded-full bg-transparent p-1 text-sky-700 shadow-none hover:bg-sky-100 hover:text-sky-900"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Per-source pass/fail strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {model.strip.map((item) => {
          const column = model.columns.find((entry) => entry.key === item.columnKey);
          if (!column) return null;
          return (
            <div
              key={item.columnKey}
              className={`rounded-xl border p-3 ${
                item.isComplete ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {column.logo && <PlatformLogo platform={column.logo} size="xs" />}
                <span className="text-sm font-semibold text-slate-700">{column.label}</span>
              </div>
              <Badge variant={item.isComplete ? 'positive' : 'negative'} className="mt-2 gap-1 text-sm">
                {item.isComplete
                  ? <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  : <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                {item.label}
              </Badge>
            </div>
          );
        })}
      </div>

      {model.notice && (
        <div
          className={
            model.notice.tone === 'positive'
              ? 'rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-700'
              : 'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800'
          }
        >
          {model.notice.text}
        </div>
      )}

      {/* Per-source state breakdown */}
      <Card>
        <CardContent className="py-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {model.summary.title}
                </span>
                <Badge variant="positive" className="text-[10px]">
                  {model.summary.badgeLabel}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">{model.summary.caption}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase">{model.summary.rateLabel}</span>
              <p className="text-xl font-black tabular-nums text-slate-900">
                {model.summary.ratePercent === null ? '—' : `${model.summary.ratePercent.toFixed(1)}%`}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {model.summary.cards.map((card) => {
              const column = model.columns.find((entry) => entry.key === card.columnKey);
              if (!column) return null;
              return (
                <div key={card.columnKey} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {column.logo && <PlatformLogo platform={column.logo} size="xs" />}
                      <span className="text-xs font-bold text-slate-800">{column.label}</span>
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums text-slate-500">/{card.sampled}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {model.states
                      .filter((state) => (card.counts[state.key] ?? 0) > 0)
                      .map((state) => (
                        <li key={state.key} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="flex items-center gap-1 text-slate-600">
                            <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${state.chipClass}`}>
                              <state.icon className="h-2 w-2" />
                            </span>
                            <span>{state.label}</span>
                          </span>
                          <span className="font-bold tabular-nums text-slate-900">{card.counts[state.key]}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <span className="font-bold text-slate-700">Status key:</span>
            {model.states.map((state) => (
              <span key={state.key} className="flex items-center gap-1.5">
                <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${state.chipClass}`}>
                  <state.icon className="h-2 w-2" />
                </span>
                <strong className="text-slate-800">{state.label}</strong>
                <span className="text-slate-500">{state.description}</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Outlet matrix */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder={model.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-8"
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
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
              {model.filters.map((filter) => (
                <Button
                  key={filter.key}
                  variant="outline"
                  onClick={() => {
                    setActiveFilter(filter.key);
                    setCurrentPage(1);
                  }}
                  className={`min-h-0 rounded-md border-0 px-2.5 py-1 shadow-none ${
                    activeFilter === filter.key
                      ? FILTER_TONE[filter.tone]
                      : 'bg-transparent text-slate-600 hover:bg-transparent hover:text-slate-900'
                  }`}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

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

        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 text-left">Outlet</th>
                <th className="w-24 px-3 py-3 text-left">Entity</th>
                {model.columns.map((column) => (
                  <th key={column.key} className="w-16 px-1 py-3 text-center break-words">
                    {column.label}
                  </th>
                ))}
                <th className="w-28 px-4 py-3 text-right">Coverage</th>
                {hasAction && <th className="w-24 px-3 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={model.columns.length + (hasAction ? 4 : 3)} className="py-8 text-center text-slate-500">
                    {model.emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-bold text-slate-900">{row.name}</span>
                        {row.code && (
                          <span className="shrink-0 font-mono text-[11px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                            {row.code}
                          </span>
                        )}
                        {row.flag && (
                          <Badge variant="info" className="shrink-0 rounded px-1.5 py-0.5 text-[11px]">
                            {row.flag}
                          </Badge>
                        )}
                      </div>
                      {row.subtitle && <span className="text-[11px] text-slate-500">{row.subtitle}</span>}
                    </td>

                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block truncate px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.entityAccent
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.entity ?? '—'}
                      </span>
                    </td>

                    {model.columns.map((column) => {
                      const badge = stateBadge(row, column.key);
                      return (
                        <td key={column.key} className="px-2 py-2.5 text-center">
                          {badge && (
                            <span
                              className={`inline-flex items-center justify-center rounded-md p-1 ${badge.meta.cellClass}`}
                              title={badge.title}
                            >
                              <badge.meta.icon className="h-3 w-3" />
                              <span className="sr-only">{badge.title}</span>
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.coveragePct === null ? (
                        <span className="text-[11px] font-semibold text-slate-500">N/A</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 sm:block">
                            <div
                              className={`h-full rounded-full ${
                                row.coveragePct === 100
                                  ? 'bg-emerald-500'
                                  : row.coveragePct >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                              }`}
                              style={{ width: `${row.coveragePct}%` }}
                            />
                          </div>
                          <span
                            className={`font-black text-xs ${
                              row.coveragePct === 100
                                ? 'text-emerald-700'
                                : row.coveragePct >= 50
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                            }`}
                          >
                            {row.coveragePct}%
                          </span>
                        </div>
                      )}
                    </td>

                    {hasAction && (
                      <td className="px-3 py-2.5 text-right">
                        {row.action ? (
                          <Button
                            variant="outline"
                            onClick={row.action.onClick}
                            className="min-h-0 rounded-md border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700 shadow-none hover:bg-rose-100"
                            title={row.action.title}
                          >
                            <SendHorizontal className="h-2.5 w-2.5" aria-hidden="true" />
                            <span>{row.action.label}</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / tablet cards */}
        <div className="divide-y divide-slate-100 lg:hidden">
          {paginatedRows.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">{model.emptyMessage}</p>
          ) : (
            paginatedRows.map((row) => (
              <article key={row.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-900">{row.name}</span>
                      {row.code && (
                        <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-500">
                          {row.code}
                        </span>
                      )}
                      {row.flag && (
                        <Badge variant="info" className="shrink-0 rounded px-1.5 py-0.5 text-[11px]">
                          {row.flag}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {[row.subtitle, row.entity].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  {row.coveragePct === null ? (
                    <span className="text-[11px] font-semibold text-slate-500">N/A</span>
                  ) : (
                    <span
                      className={`shrink-0 text-xs font-black ${
                        row.coveragePct === 100
                          ? 'text-emerald-700'
                          : row.coveragePct >= 50
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {row.coveragePct}%
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {model.columns.map((column) => {
                    const badge = stateBadge(row, column.key);
                    if (!badge) return null;
                    return (
                      <div
                        key={column.key}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-1.5"
                        title={badge.title}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${badge.meta.chipClass}`}>
                          <badge.meta.icon className="h-2.5 w-2.5" />
                        </span>
                        <span className="truncate text-[11px] font-semibold text-slate-700">{column.label}</span>
                        <span className="sr-only">{badge.meta.label}</span>
                      </div>
                    );
                  })}
                </div>

                {row.action && (
                  <Button
                    variant="outline"
                    onClick={row.action.onClick}
                    className="min-h-0 rounded-md border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700 shadow-none hover:bg-rose-100"
                    title={row.action.title}
                  >
                    <SendHorizontal className="h-3 w-3" aria-hidden="true" />
                    <span>{row.action.label}</span>
                  </Button>
                )}
              </article>
            ))
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-800 tabular-nums">{totalItems > 0 ? startIndex + 1 : 0}</strong> to{' '}
            <strong className="text-slate-800 tabular-nums">{endIndex}</strong> of{' '}
            <strong className="text-slate-800 tabular-nums">{totalItems}</strong> outlets
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="min-h-0 px-2.5 py-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <Button
                key={pg}
                variant={currentPage === pg ? 'default' : 'outline'}
                onClick={() => handlePageChange(pg)}
                className={`min-h-0 h-7 w-7 px-0 ${currentPage === pg ? 'bg-[#C8102E] hover:bg-[#C8102E]' : ''}`}
              >
                {pg}
              </Button>
            ))}

            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="min-h-0 px-2.5 py-1"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Footer panels */}
      {(model.infoPanel || model.explainer) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {model.infoPanel && (
            <Card className={PANEL_TONE[model.infoPanel.tone].card}>
              <CardContent className="py-5">
                <div className="flex items-center gap-2.5">
                  <model.infoPanel.icon className={`h-5 w-5 ${PANEL_TONE[model.infoPanel.tone].icon}`} />
                  <div>
                    <p className={`text-sm font-bold ${PANEL_TONE[model.infoPanel.tone].title}`}>
                      {model.infoPanel.title}
                    </p>
                    <p className={`text-xs ${PANEL_TONE[model.infoPanel.tone].subtitle}`}>
                      {model.infoPanel.subtitle}
                    </p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {model.infoPanel.items.map((item) => {
                    const NoteIcon = item.noteIcon;
                    return (
                      <li
                        key={item.id}
                        className={`flex items-center justify-between gap-3 text-xs bg-white/80 p-2.5 rounded-lg border ${PANEL_TONE[model.infoPanel!.tone].item}`}
                      >
                        <span className="font-bold text-slate-800">{item.label}</span>
                        <span className={`flex items-center gap-1.5 font-semibold text-[11px] ${PANEL_TONE[model.infoPanel!.tone].note}`}>
                          {NoteIcon && <NoteIcon className="h-3.5 w-3.5" />}
                          {item.note}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          {model.explainer && (
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-2.5">
                  <model.explainer.icon className="h-5 w-5 text-slate-600" />
                  <p className="text-sm font-bold text-slate-900">{model.explainer.title}</p>
                </div>
                <dl className="mt-4 space-y-2.5 text-xs">
                  {model.explainer.items.map((item) => (
                    <div key={item.term} className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                      <dt className="font-bold text-slate-800">{item.term}</dt>
                      <dd className="mt-0.5 text-slate-500">{item.description}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
