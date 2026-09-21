import React, { useMemo, useState } from 'react';
import {
  WarningCircle as AlertCircle,
  ArrowRight,
  Check,
  Clock as Clock3,
  Database,
  MailIn as Inbox,
  MinusCircle,
  Shop as Store,
} from 'iconoir-react';
import { ENTITY_TOTALS } from '../../data/outletData';
import { CoverageState, OutletFinancialData } from '../../types';
import { copy } from '../../copy';
import { Button } from '../../components/ui/button';
import {
  COVERAGE_TONES,
  CoverageMatrixLayout,
  type CoverageRowView,
  type CoverageStateMeta,
  type CoverageViewModel,
} from './CoverageMatrixLayout';

interface DataCoveragePageProps {
  outlets: OutletFinancialData[];
  onGoToTasks: () => void;
}

type ChannelKey = keyof OutletFinancialData['channelStatus'];
const CHANNELS: ChannelKey[] = ['POS', 'Grab', 'FoodPanda', 'Shopee', 'Web', 'GRN'];
/** The strip is about sales channels; GRN is a purchases source and sits out. */
const STRIP_CHANNELS: ChannelKey[] = ['POS', 'Grab', 'FoodPanda', 'Shopee', 'Web'];

const STATE_BY_STATUS: Record<OutletFinancialData['channelStatus'][ChannelKey], CoverageState> = {
  complete: 'checked',
  in_progress: 'received',
  pending: 'missing',
  flagged: 'na',
};

const STATES: CoverageStateMeta[] = [
  { key: 'checked', label: 'Checked', icon: Check, ...COVERAGE_TONES.emerald, description: '(Reconciled)' },
  { key: 'received', label: 'Received', icon: Inbox, ...COVERAGE_TONES.sky, description: '(File in, not checked yet)' },
  { key: 'missing', label: 'Missing', icon: AlertCircle, ...COVERAGE_TONES.rose, description: '(Not received)' },
  { key: 'na', label: 'N/A', icon: MinusCircle, ...COVERAGE_TONES.slate, description: '(Pre-opening)' },
];

/**
 * Section 3 for the May 2026 static demo. This file owns only the mapping from
 * the demo's `channelStatus` shape onto the shared coverage view-model —
 * all markup and interaction lives in `CoverageMatrixLayout`.
 */
export const DataCoveragePage: React.FC<DataCoveragePageProps> = ({ outlets, onGoToTasks }) => {
  const [larkAlertSent, setLarkAlertSent] = useState<string | null>(null);

  const handleTriggerLarkReminder = (outletName: string, channelName: string) => {
    setLarkAlertSent(`Lark reminder dispatched to #${outletName} for missing ${channelName} report.`);
    setTimeout(() => setLarkAlertSent(null), 4000);
  };

  const model = useMemo<CoverageViewModel>(() => {
    const trading = outlets.filter((outlet) => outlet.status === 'active');
    const upcoming = outlets.filter((outlet) => outlet.status === 'upcoming');
    const tradingTotal = ENTITY_TOTALS.all.outletsCount;

    const stateOf = (outlet: OutletFinancialData, channel: ChannelKey): CoverageState =>
      outlet.status === 'upcoming' ? 'na' : STATE_BY_STATUS[outlet.channelStatus[channel]];

    const cards = CHANNELS.map((channel) => {
      const counts: Record<string, number> = { checked: 0, received: 0, missing: 0, na: 0 };
      outlets.forEach((outlet) => { counts[stateOf(outlet, channel)] += 1; });
      return { columnKey: channel, counts, sampled: outlets.length };
    });
    const checkedTotal = cards.reduce((sum, card) => sum + card.counts.checked, 0);
    const reportsTotal = cards.reduce((sum, card) => sum + card.sampled - card.counts.na, 0);

    const rows: CoverageRowView[] = outlets.map((outlet) => {
      const isUpcoming = outlet.status === 'upcoming';
      const entries = Object.entries(outlet.channelStatus) as Array<
        [ChannelKey, OutletFinancialData['channelStatus'][ChannelKey]]
      >;
      const completedChannels = entries.filter(([, status]) => status === 'complete').length;
      const missingChannel = entries.find(([, status]) => status === 'pending');
      return {
        id: outlet.id,
        name: outlet.name,
        code: outlet.code,
        entity: outlet.entity,
        entityAccent: outlet.entity === 'Sabah',
        subtitle: outlet.state,
        flag: isUpcoming ? 'Upcoming' : undefined,
        coveragePct: isUpcoming ? null : Math.round((completedChannels / CHANNELS.length) * 100),
        cells: Object.fromEntries(
          CHANNELS.map((channel) => [channel, { stateKey: stateOf(outlet, channel) }])
        ),
        action: missingChannel
          ? {
              label: 'Ping',
              title: `Send Lark ping for missing ${missingChannel[0]} file`,
              onClick: () => handleTriggerLarkReminder(outlet.name, missingChannel[0]),
            }
          : undefined,
      };
    });

    const incomplete = trading.filter((outlet) =>
      Object.values(outlet.channelStatus).some((status) => status === 'pending')
    ).length;

    return {
      subtitle: `${tradingTotal} active trading outlets · May 2026`,
      headingAction: (
        <Button variant="outline" onClick={onGoToTasks}>
          <span>Go to tasks</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      ),
      toast: larkAlertSent ? { message: larkAlertSent, onDismiss: () => setLarkAlertSent(null) } : null,
      columns: CHANNELS.map((channel) => ({
        key: channel,
        label: channel,
        logo: channel === 'Web' ? 'Apps' : channel,
      })),
      states: STATES,
      strip: STRIP_CHANNELS.map((channel) => {
        const missing = trading.filter((outlet) => outlet.channelStatus[channel] === 'pending').length;
        return {
          columnKey: channel,
          isComplete: missing === 0,
          label: missing === 0 ? 'All in' : `${missing} missing`,
        };
      }),
      notice: incomplete === 0
        ? { tone: 'positive', text: `✓ All ${trading.length} trading outlets have every channel's report in for May 2026.` }
        : { tone: 'warning', text: `${incomplete} of ${trading.length} trading outlets are still missing a channel report for May 2026.` },
      summary: {
        title: 'Channel Check Status',
        caption: copy.coverageAssessed,
        badgeLabel: `${checkedTotal}/${reportsTotal} Reconciled`,
        rateLabel: 'Check Rate',
        ratePercent: reportsTotal > 0 ? (checkedTotal / reportsTotal) * 100 : null,
        cards,
      },
      searchPlaceholder: copy.coverageSearchPlaceholder,
      emptyMessage: copy.coverageNoMatch,
      filters: [
        { key: 'all', label: `All outlets (${outlets.length})`, tone: 'neutral', predicate: () => true },
        {
          key: 'has_missing',
          label: 'Missing reports',
          tone: 'negative',
          predicate: (row: CoverageRowView) => row.flag !== 'Upcoming' && Object.values(row.cells).some((cell) => cell.stateKey === 'missing'),
        },
        {
          key: 'complete',
          label: '100% reconciled',
          tone: 'positive',
          predicate: (row: CoverageRowView) => row.flag !== 'Upcoming' && Object.values(row.cells).every((cell) => cell.stateKey === 'checked'),
        },
      ],
      rows,
      showActionColumn: true,
      infoPanel: {
        tone: 'sky',
        icon: Store,
        title: `${upcoming.length} outlets not open yet`,
        subtitle: `Not part of the ${tradingTotal} trading outlets, but counted in the ${tradingTotal + upcoming.length} total for the whole company.`,
        items: upcoming.map((outlet) => ({
          id: outlet.id,
          label: (
            <>
              {outlet.name} <span className="font-mono text-[11px] text-slate-500">({outlet.code})</span>
            </>
          ),
          note: outlet.note ?? 'Not yet open',
          noteIcon: Clock3,
        })),
      },
      explainer: {
        icon: Database,
        title: 'Channel names & where the data comes from',
        items: [
          {
            term: '"Apps" and "Web" are the same channel',
            description: (
              <>
                The channel called <strong className="text-slate-700">"Web"</strong> here is grouped as{' '}
                <strong className="text-slate-700">"Apps"</strong> in the platform fee reconciliation. {copy.coverageWebAppsNote}
              </>
            ),
          },
          { term: 'Goods Received Notes (GRN)', description: copy.coverageGrnNote },
          {
            term: 'Web (app) sales source',
            description: (
              <>
                May 2026 web orders come from <span className="font-medium text-slate-700">WEB ORDER 1-31MAY.csv</span>.
              </>
            ),
          },
        ],
      },
    };
  }, [outlets, onGoToTasks, larkAlertSent]);

  return <CoverageMatrixLayout model={model} />;
};
