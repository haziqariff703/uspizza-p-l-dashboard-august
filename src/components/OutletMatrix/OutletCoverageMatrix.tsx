import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Search, 
  Plus, 
  FileText,
  TrendingUp,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { OutletFinancialData } from '../../types';

interface OutletCoverageMatrixProps {
  outlets: OutletFinancialData[];
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  onToggleOutletChannelStatus: (outletId: string, channel: 'POS' | 'Grab' | 'FoodPanda' | 'Shopee' | 'Web' | 'GRN') => void;
  onOpenCreateTaskForOutlet: (outlet: OutletFinancialData) => void;
}

export const OutletCoverageMatrix: React.FC<OutletCoverageMatrixProps> = ({
  outlets,
  entityFilter,
  onToggleOutletChannelStatus,
  onOpenCreateTaskForOutlet,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'needs_attention' | 'completed'>('all');

  const filteredOutlets = outlets.filter(outlet => {
    // Entity filter
    if (entityFilter === 'myUsPizza' && outlet.entity !== 'MY US PIZZA') return false;
    if (entityFilter === 'sabah' && outlet.entity !== 'Sabah') return false;

    // Search term
    const matchesSearch = 
      outlet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      outlet.code.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Filter mode
    const isUpcoming = outlet.status === 'upcoming';
    if (isUpcoming && filterMode !== 'all') return false;

    const channels = Object.values(outlet.channelStatus);
    const hasIssues = channels.some(s => s === 'in_progress' || s === 'flagged' || s === 'pending');
    
    if (filterMode === 'needs_attention') return hasIssues;
    if (filterMode === 'completed') return !hasIssues;

    return true;
  });

  const tradingOutlets = outlets.filter(o => o.status === 'active');
  const upcomingOutlets = outlets.filter(o => o.status === 'upcoming');

  // Calculate coverage stats
  const totalSlots = tradingOutlets.length * 6; // 5 platforms + 1 GRN
  const completedSlots = tradingOutlets.reduce((acc, outlet) => {
    return acc + Object.values(outlet.channelStatus).filter(s => s === 'complete').length;
  }, 0);
  const coveragePct = Math.round((completedSlots / totalSlots) * 100);

  const getStatusBadge = (status: 'complete' | 'in_progress' | 'pending' | 'flagged') => {
    switch (status) {
      case 'complete':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Complete
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      case 'flagged':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" /> Flagged
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Instructions */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Data Coverage & Outlet Audit Matrix
                </h2>
                <p className="text-xs text-slate-500">
                  Tracks whether every trading outlet has all 5 channel reports + GRN verification for May 2026.
                </p>
              </div>
            </div>
          </div>

          {/* Overall Matrix Stats */}
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Outlets</div>
              <div className="text-base font-extrabold text-slate-900">
                {tradingOutlets.length} trading · {upcomingOutlets.length} upcoming
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Verification Rate</div>
              <div className="text-base font-extrabold text-emerald-600">
                {coveragePct}% Verified
              </div>
            </div>
          </div>
        </div>

        {/* 5 Channel Badges exactly matching screenshot 4 */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {['POS', 'Grab', 'FoodPanda', 'Shopee', 'Web'].map((chan) => (
            <div key={chan} className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">{chan}</div>
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                  ✓ complete
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            </div>
          ))}
        </div>

        {/* Upcoming Outlets notice banner */}
        <div className="mt-3 p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900">
          <div className="font-bold uppercase tracking-wider text-[10px] text-sky-600 mb-1">
            Upcoming Outlets — Not Yet Trading (No Data Expected)
          </div>
          <div className="space-y-1">
            <div>
              <strong>Taman Connaught</strong> <span className="text-slate-500">MY-051</span> — Under renovation — grand launch soon
            </div>
            <div>
              <strong>Kota Damansara</strong> <span className="text-slate-500">MY-081</span> — Not yet open
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter outlet by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs border border-slate-200">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                filterMode === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              All ({filteredOutlets.length})
            </button>
            <button
              onClick={() => setFilterMode('needs_attention')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                filterMode === 'needs_attention' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Needs Action
            </button>
            <button
              onClick={() => setFilterMode('completed')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                filterMode === 'completed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              100% Ready
            </button>
          </div>
        </div>
      </div>

      {/* Outlet Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Outlet Name & Entity</th>
                <th className="py-3 px-3 text-center">POS</th>
                <th className="py-3 px-3 text-center">Grab</th>
                <th className="py-3 px-3 text-center">FoodPanda</th>
                <th className="py-3 px-3 text-center">Shopee</th>
                <th className="py-3 px-3 text-center">Web App</th>
                <th className="py-3 px-3 text-center">GRN Purchases</th>
                <th className="py-3 px-3 text-right">Net Sales</th>
                <th className="py-3 px-3 text-right">Margin</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOutlets.map((outlet, index) => {
                const isUpcoming = outlet.status === 'upcoming';

                return (
                  <tr 
                    key={outlet.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isUpcoming ? 'bg-slate-50/50 opacity-70' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-slate-400 font-semibold">
                      {index + 1}
                    </td>

                    {/* Outlet Name & Code */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{outlet.name}</span>
                        {outlet.grossMargin > 80 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                            Top Margin
                          </span>
                        )}
                        {outlet.grossMargin > 0 && outlet.grossMargin <= 50.2 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-extrabold">
                            Margin Alert
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="font-mono">{outlet.code}</span>
                        <span>·</span>
                        <span>{outlet.entity}</span>
                        {outlet.note && (
                          <span className="text-sky-600 italic">({outlet.note})</span>
                        )}
                      </div>
                    </td>

                    {/* 5 Channels + GRN (Clickable to toggle real-time status!) */}
                    {(['POS', 'Grab', 'FoodPanda', 'Shopee', 'Web', 'GRN'] as const).map(chan => {
                      if (isUpcoming) {
                        return (
                          <td key={chan} className="py-3 px-3 text-center text-slate-400 text-[10px] italic">
                            N/A
                          </td>
                        );
                      }

                      const status = outlet.channelStatus[chan];
                      return (
                        <td 
                          key={chan} 
                          className="py-3 px-3 text-center cursor-pointer hover:opacity-80"
                          title={`Click to cycle status for ${chan}`}
                          onClick={() => onToggleOutletChannelStatus(outlet.id, chan)}
                        >
                          {getStatusBadge(status)}
                        </td>
                      );
                    })}

                    {/* Net Sales */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {isUpcoming ? '—' : `RM ${outlet.netSales.toLocaleString()}`}
                    </td>

                    {/* Gross Margin */}
                    <td className="py-3 px-3 text-right font-bold">
                      {isUpcoming ? (
                        '—'
                      ) : (
                        <span className={outlet.grossMargin >= 60 ? 'text-emerald-600' : outlet.grossMargin >= 52 ? 'text-blue-600' : 'text-amber-600'}>
                          {outlet.grossMargin}%
                        </span>
                      )}
                    </td>

                    {/* Action: Add Task */}
                    <td className="py-3 px-4 text-right">
                      {!isUpcoming && (
                        <button
                          onClick={() => onOpenCreateTaskForOutlet(outlet)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-md text-[11px] font-semibold transition-colors"
                          title="Assign task for this outlet"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Task</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
