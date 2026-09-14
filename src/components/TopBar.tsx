import React from 'react';
import { Menu, Send as SendHorizontal, Plus } from 'iconoir-react';
import { ChannelFilter } from '../types';
import { PlatformLogo } from './common/PlatformLogo';

export interface TopBarProps {
  currentTab: 'tasks' | 'dashboard' | 'matrix';
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  channelFilter: ChannelFilter;
  isLiveSync: boolean;
  onToggleLiveSync: () => void;
  onOpenNewTask: () => void;
  onSimulateEvent: () => void;
  onOpenSidebar: () => void;
}

const entityLabel: Record<TopBarProps['entityFilter'], string> = {
  all: 'All 44 outlets',
  myUsPizza: 'MY US Pizza',
  sabah: 'Sabah',
};

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  entityFilter,
  channelFilter,
  isLiveSync,
  onToggleLiveSync,
  onOpenNewTask,
  onSimulateEvent,
  onOpenSidebar,
}) => {
  const channelLabel = channelFilter === 'All' ? 'All channels' : channelFilter;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:px-6">
      {/* Hamburger */}
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open navigation menu"
        title="Open menu"
        className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2 text-xs">
        <span className="hidden font-bold text-slate-900 sm:inline capitalize">{currentTab}</span>
        <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
          /
        </span>
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-slate-500">
          <PlatformLogo platform={channelFilter} size="xs" />
          <span className="truncate">{channelLabel}</span>
        </span>
        <span className="hidden text-slate-300 md:inline" aria-hidden="true">
          /
        </span>
        <span className="hidden truncate font-medium text-slate-500 md:inline">{entityLabel[entityFilter]}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Live sync */}
        <button
          type="button"
          id="toggle-live-sync-btn"
          onClick={onToggleLiveSync}
          className={`flex h-11 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-slate-400 lg:h-8 ${
            isLiveSync
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
          title={isLiveSync ? 'Live real-time sync active' : 'Click to enable real-time sync'}
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            {isLiveSync && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${isLiveSync ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </span>
          <span className="hidden whitespace-nowrap text-[11px] font-medium sm:inline">
            {isLiveSync ? 'Live Sync: ON' : 'Sync: Paused'}
          </span>
        </button>

        {/* Lark alert */}
        <button
          type="button"
          id="simulate-event-btn"
          onClick={onSimulateEvent}
          className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400 lg:h-8"
          title="Simulate Lark Webhook / Audit Alert"
        >
          <SendHorizontal className="h-3.5 w-3.5 text-[#0284C7]" aria-hidden="true" />
          <span className="hidden sm:inline">Lark Alert</span>
        </button>

        {/* New task */}
        <button
          type="button"
          id="create-task-btn"
          onClick={onOpenNewTask}
          className="flex h-11 items-center gap-1.5 rounded-lg bg-[#C8102E] px-3 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#A60D26] active:bg-[#850A1E] focus-visible:ring-2 focus-visible:ring-[#C8102E] lg:h-8"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>
    </header>
  );
};
