import React from 'react';
import { ActivityEvent } from '../../types';

interface LiveActivityFeedProps {
  activities: ActivityEvent[];
  isLiveSync: boolean;
  onSimulateEvent: () => void;
  onClearActivities?: () => void;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  activities,
  isLiveSync,
  onSimulateEvent,
}) => {
  const getEventDotColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'complete':
      case 'checklist_step':
        return 'bg-emerald-500';
      case 'update':
      case 'status_change':
        return 'bg-sky-500';
      case 'comment':
        return 'bg-sky-500';
      case 'flag':
      case 'discrepancy_flag':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isLiveSync && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLiveSync ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Real-Time Audit Stream
          </h3>
          <span className="text-[10px] font-semibold text-slate-400">
            ({activities.length} events)
          </span>
        </div>

        {/* Simulate Event Button */}
        <button
          onClick={onSimulateEvent}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition-all border border-rose-200"
          title="Simulate random live user action or audit sync"
        >
          <span>Simulate Live Event</span>
        </button>
      </div>

      {/* Activity List */}
      <div className="p-3 space-y-2 max-h-72 overflow-y-auto divide-y divide-slate-100">
        {activities.map(evt => (
          <div key={evt.id} className="pt-2 first:pt-0 flex items-start gap-2.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full shrink-0 mt-1 ${getEventDotColor(evt.type)}`}
              aria-hidden="true"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-900 truncate">
                  {evt.userName}
                </span>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {evt.timestamp}
                </span>
              </div>

              <div className="text-slate-600 mt-0.5 leading-snug">
                {evt.message || evt.action}
              </div>

              {evt.taskTitle && (
                <div className="text-[10px] text-rose-700 font-medium truncate mt-0.5">
                  ↳ {evt.taskTitle}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
