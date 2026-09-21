import React, { useMemo } from 'react';
import {
  WarningCircle as AlertCircle,
  Check,
  Database,
  MailIn as Inbox,
  MinusCircle,
  WarningTriangle,
  Xmark,
} from 'iconoir-react';
import { ALIAS_SOURCES } from '../../lib/outletDirectory';
import { ENTITY_NAMES } from '../../data/aggregate';
import { coverageTotals, salesCoverage, type ImportedCoverageState, type OutletCoverage } from '../../data/importedCoverage';
import {
  COVERAGE_TONES,
  CoverageMatrixLayout,
  type CoverageRowView,
  type CoverageStateMeta,
  type CoverageViewModel,
} from './CoverageMatrixLayout';

interface ImportedCoveragePageProps {
  coverage: OutletCoverage[];
  /** Every sales file recorded for this month, most recent first. */
  imports: Array<{ source: string; file_name: string; status: string; created_at: string }>;
  period: string;
}

const SOURCE_LABELS: Record<string, string> = {
  pos: 'POS', grab: 'Grab', foodpanda: 'FoodPanda', shopee: 'Shopee', apps: 'Apps', grn: 'GRN',
};

/**
 * The five states `importedCoverage` can honestly produce. `unmapped` is amber
 * rather than rose on purpose: it is a mapping decision waiting on Finance, not
 * a file someone forgot to send, and conflating the two sends people chasing
 * the wrong thing.
 */
const STATES: CoverageStateMeta[] = [
  { key: 'imported', label: 'Imported', icon: Check, ...COVERAGE_TONES.emerald, description: '(Rows landed)' },
  { key: 'missing', label: 'Missing', icon: AlertCircle, ...COVERAGE_TONES.rose, description: '(Alias exists, nothing arrived)' },
  { key: 'unmapped', label: 'Unmapped', icon: WarningTriangle, ...COVERAGE_TONES.amber, description: '(No alias links this source)' },
  { key: 'failed', label: 'Failed', icon: Xmark, ...COVERAGE_TONES.rose, description: '(Import did not finish)' },
  { key: 'unavailable', label: 'Unavailable', icon: MinusCircle, ...COVERAGE_TONES.slate, description: '(No rows imported)' },
];

/** GRN is a purchases source with no importer yet; it sits out of the sales strip. */
const SALES_SOURCES = [...ALIAS_SOURCES];

type ImportRecord = { source: string; file_name: string; status: string; created_at: string };

/**
 * One row per source, not per file. Foodpanda uploads a separate invoice
 * workbook per outlet-day, so a month can carry several hundred import
 * records; enumerating them buries the rest of the section.
 */
function filesBySource(imports: ImportRecord[]) {
  const bySource = new Map<string, ImportRecord[]>();
  for (const record of imports) {
    bySource.set(record.source, [...(bySource.get(record.source) ?? []), record]);
  }
  return [...bySource.entries()].map(([source, files]) => {
    const byStatus = new Map<string, number>();
    for (const file of files) byStatus.set(file.status, (byStatus.get(file.status) ?? 0) + 1);
    const statuses = [...byStatus.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([status, count]) => (files.length === 1 ? status : `${count} ${status}`))
      .join(', ');
    return {
      id: source,
      label: (
        <>
          {SOURCE_LABELS[source] ?? source}
          {files.length === 1 && (
            <span className="ml-1.5 font-mono text-[11px] font-normal text-slate-500">{files[0].file_name}</span>
          )}
        </>
      ),
      note: files.length === 1 ? statuses : `${files.length} files · ${statuses}`,
    };
  });
}

/**
 * Section 3 for an imported reporting month. Maps what actually landed in
 * `sales_daily` onto the same coverage view-model the May demo uses, so both
 * months render through `CoverageMatrixLayout`.
 */
export const ImportedCoveragePage: React.FC<ImportedCoveragePageProps> = ({ coverage, imports, period }) => {
  const model = useMemo<CoverageViewModel>(() => {
    const totals = coverageTotals(coverage);
    const countsFor = (source: string): Record<ImportedCoverageState, number> =>
      totals.find((entry) => entry.source === source)?.counts
      ?? { imported: 0, missing: 0, unmapped: 0, failed: 0, unavailable: 0 };

    const { salesCells, importedSalesCells, outletsWithGaps, gapsBySource, percentByOutlet } = salesCoverage(coverage);

    const rows: CoverageRowView[] = coverage.map((outlet) => {
      return {
        id: outlet.id,
        name: outlet.name,
        code: outlet.code,
        entity: outlet.entity,
        entityAccent: outlet.entity === ENTITY_NAMES.sabah,
        coveragePct: percentByOutlet.get(outlet.id) ?? 0,
        cells: Object.fromEntries(outlet.cells.map((cell) => {
          const label = STATES.find((state) => state.key === cell.state)?.label ?? cell.state;
          return [cell.source, {
            stateKey: cell.state,
            detail: cell.state === 'imported' && cell.records
              ? `${label} · ${cell.records.toLocaleString()} rows / ${cell.days}d`
              : label,
          }];
        })),
      };
    });

    return {
      subtitle: `${coverage.length} outlets · ${period}`,
      columns: [...SALES_SOURCES, 'grn'].map((source) => ({
        key: source,
        label: SOURCE_LABELS[source] ?? source,
        logo: source === 'grn' ? undefined : SOURCE_LABELS[source],
      })),
      states: STATES,
      strip: SALES_SOURCES.map((source) => {
        const gaps = gapsBySource[source];
        return {
          columnKey: source,
          isComplete: gaps === 0,
          label: gaps === 0 ? 'All in' : `${gaps} ${gaps === 1 ? 'gap' : 'gaps'}`,
        };
      }),
      notice: outletsWithGaps === 0
        ? { tone: 'positive', text: `✓ All ${coverage.length} outlets have rows from every sales source for ${period}.` }
        : {
            tone: 'warning',
            text: `${outletsWithGaps} of ${coverage.length} outlets have no rows from at least one sales source for ${period}. An outlet that does not trade on a platform will read the same way.`,
          },
      summary: {
        title: 'Source Check Status',
        caption: `Across ${coverage.length} outlets. Imported means rows landed for that outlet and source; nothing here claims a reconciled month.`,
        badgeLabel: `${importedSalesCells}/${salesCells} with data`,
        rateLabel: 'With Data',
        ratePercent: salesCells > 0 ? (importedSalesCells / salesCells) * 100 : null,
        cards: [...SALES_SOURCES, 'grn'].map((source) => ({
          columnKey: source,
          counts: countsFor(source),
          sampled: coverage.length,
        })),
      },
      searchPlaceholder: 'Search outlet by name or store code...',
      emptyMessage: 'No outlet matches this search or filter.',
      filters: [
        { key: 'all', label: `All outlets (${coverage.length})`, tone: 'neutral', predicate: () => true },
        {
          key: 'gaps',
          label: 'Has gaps',
          tone: 'negative',
          predicate: (row: CoverageRowView) => (row.coveragePct ?? 0) < 100,
        },
        {
          key: 'complete',
          label: 'All sources in',
          tone: 'positive',
          predicate: (row: CoverageRowView) => row.coveragePct === 100,
        },
      ],
      rows,
      infoPanel: imports.length
        ? {
            // Amber only when a file actually failed or is still a draft — an
            // all-imported month is not a warning.
            tone: imports.every((item) => item.status === 'imported') ? 'sky' : 'amber',
            icon: Inbox,
            title: `${imports.length} sales ${imports.length === 1 ? 'file' : 'files'} recorded for ${period}`,
            subtitle: 'A draft or failed import contributed no figures to the matrix above.',
            // Grouped by source, never one row per file: a month can hold
            // hundreds of per-invoice uploads (Foodpanda sends one xlsx per
            // outlet-day), and listing them turns this panel into the page.
            items: filesBySource(imports),
          }
        : undefined,
      explainer: {
        icon: Database,
        title: 'What these coverage states mean',
        items: [
          {
            term: 'Imported vs Unavailable',
            description: "Imported means rows for that outlet and source landed in this month's data. Unavailable means none did — which is not the same as a missing file, because not every outlet trades on every platform.",
          },
          {
            term: 'Unmapped',
            description: 'No alias links this outlet to that source, so nothing from it can arrive at all. Closing this is an outlet-mapping decision, not a chase for a file.',
          },
          {
            term: 'Failed',
            description: "That source's import for this month did not finish, so its figures are absent from every section, not only this one.",
          },
          {
            term: '"Apps" and "Web" are the same channel',
            description: 'The US Pizza app is grouped as "Apps" here and in the platform fee reconciliation. GRN covers purchases and has no importer yet, so it stays Unavailable.',
          },
        ],
      },
    };
  }, [coverage, imports, period]);

  return <CoverageMatrixLayout model={model} />;
};
