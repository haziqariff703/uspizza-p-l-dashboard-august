import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  NavArrowDown as ChevronDown,
  Check,
  GraphUp as BarChart3,
  CheckSquare,
  Building as Building2,
  Send as SendHorizontal,
  Plus,
} from 'iconoir-react';
import { ChannelFilter, DashboardSection } from '../types';
import { UsPizzaLogo } from './common/UsPizzaLogo';
import { PlatformLogo } from './common/PlatformLogo';
import { PL_BY_OUTLET } from '../data/outletData';
import { copy } from '../copy';

const CHANNEL_OPTIONS: ChannelFilter[] = ['All', 'Grab', 'FoodPanda', 'Shopee', 'Apps', 'POS'];

const SECTION_OPTIONS: { id: DashboardSection; number: number; label: string; description: string }[] = [
  { id: 'overview', number: 1, label: 'Overview', description: copy.navDescOverview },
  { id: 'fees', number: 2, label: 'Commission & Fees', description: copy.navDescFees },
  { id: 'coverage', number: 3, label: 'Data Coverage', description: copy.navDescCoverage },
  { id: 'salesByOutlet', number: 4, label: 'Sales by Outlet', description: copy.navDescSalesByOutlet },
  { id: 'purchasesByOutlet', number: 5, label: 'Purchases by Outlet', description: copy.navDescPurchasesByOutlet },
  { id: 'grossSalesByOutlet', number: 6, label: 'Gross Sales by Outlet', description: copy.navDescGrossSalesByOutlet },
  { id: 'plByOutlet', number: 7, label: 'P&L by Outlet', description: copy.navDescPLByOutlet },
];

export interface TopBarProps {
  currentTab: 'tasks' | 'dashboard' | 'matrix';
  onTabChange: (tab: 'tasks' | 'dashboard' | 'matrix') => void;
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  onEntityFilterChange: (filter: 'all' | 'myUsPizza' | 'sabah') => void;
  channelFilter: ChannelFilter;
  onChannelFilterChange: (filter: ChannelFilter) => void;
  dashboardSection: DashboardSection;
  onDashboardSectionChange: (section: DashboardSection) => void;
  pendingTasksCount: number;
  overallProgress: number;
  isLiveSync: boolean;
  onToggleLiveSync: () => void;
  onOpenNewTask: () => void;
  onSimulateEvent: () => void;
  /** Navbar search result → jump straight to that outlet's P&L page. */
  onJumpToOutlet: (code: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onTabChange,
  entityFilter,
  onEntityFilterChange,
  channelFilter,
  onChannelFilterChange,
  dashboardSection,
  onDashboardSectionChange,
  pendingTasksCount,
  overallProgress,
  isLiveSync,
  onToggleLiveSync,
  onOpenNewTask,
  onSimulateEvent,
  onJumpToOutlet,
}) => {
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const sectionWrapRef = useRef<HTMLDivElement>(null);

  const activeSection = SECTION_OPTIONS.find((s) => s.id === dashboardSection) ?? SECTION_OPTIONS[0];
  const showDashboardControls = currentTab === 'dashboard';

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sectionWrapRef.current && !sectionWrapRef.current.contains(e.target as Node)) {
        setSectionMenuOpen(false);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return { outlets: PL_BY_OUTLET.slice(0, 4), platforms: CHANNEL_OPTIONS.slice(1) };
    return {
      outlets: PL_BY_OUTLET.filter(
        (o) => o.name.toLowerCase().includes(term) || o.code.toLowerCase().includes(term)
      ).slice(0, 6),
      platforms: CHANNEL_OPTIONS.slice(1).filter((p) => p.toLowerCase().includes(term)),
    };
  }, [searchTerm]);

  const handleJumpToOutlet = (code: string) => {
    onJumpToOutlet(code);
    setSearchOpen(false);
    setSearchTerm('');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      {/* Row 1: brand · module tabs · section dropdown · search · actions */}
      <div className="flex h-14 items-center gap-2 px-4 lg:px-6">
        <UsPizzaLogo size="sm" variant="full" className="hidden shrink-0 sm:flex" />
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C8102E] text-xs font-black text-white sm:hidden">
          US
        </span>

        <div className="hidden h-6 w-px shrink-0 bg-slate-200 lg:block" />

        {/* Module tabs (was the sidebar's top nav) */}
        <div className="hidden shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold lg:flex">
          <button
            type="button"
            id="nav-tab-dashboard"
            onClick={() => onTabChange('dashboard')}
            aria-current={currentTab === 'dashboard' ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors ${
              currentTab === 'dashboard' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{copy.navDashboardTab}</span>
          </button>
          <button
            type="button"
            id="nav-tab-tasks"
            onClick={() => onTabChange('tasks')}
            aria-current={currentTab === 'tasks' ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors ${
              currentTab === 'tasks' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{copy.navTasksTab}</span>
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-700">
              {pendingTasksCount}
            </span>
          </button>
          <button
            type="button"
            id="nav-tab-matrix"
            onClick={() => onTabChange('matrix')}
            aria-current={currentTab === 'matrix' ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors ${
              currentTab === 'matrix' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{copy.navMatrixTab}</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
              {overallProgress}%
            </span>
          </button>
        </div>

        {/* Section dropdown — only meaningful while on the Dashboard module */}
        {showDashboardControls && (
          <div className="relative shrink-0" ref={sectionWrapRef}>
            <button
              type="button"
              onClick={() => setSectionMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={sectionMenuOpen}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xs outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#C8102E] text-[9px] font-black text-white">
                {activeSection.number}
              </span>
              <span className="hidden sm:inline">{activeSection.label}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" aria-hidden="true" />
            </button>
            {sectionMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-[calc(100%+6px)] z-40 w-72 rounded-md border border-slate-200 bg-white p-1 text-sm shadow-md"
              >
                {SECTION_OPTIONS.map((opt) => {
                  const isActive = opt.id === dashboardSection;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onDashboardSectionChange(opt.id);
                        setSectionMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-[#C8102E] text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {opt.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-slate-900">{opt.label}</span>
                        <span className="block text-[11px] text-slate-400">{opt.description}</span>
                      </span>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-[#C8102E]" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Global search → jumps to P&L by Outlet */}
        <div className="relative min-w-0 flex-1" ref={searchWrapRef}>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-400 transition-colors focus-within:border-[#C8102E]/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#C8102E]/10">
            <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search outlets or platforms…"
              className="w-full min-w-0 bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
              autoComplete="off"
            />
          </div>
          {searchOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 text-xs shadow-xl">
              {searchResults.outlets.length === 0 && searchResults.platforms.length === 0 ? (
                <p className="px-2.5 py-4 text-center text-slate-500">
                  No matches for &ldquo;{searchTerm}&rdquo;.
                  <span className="mt-0.5 block text-[11px] text-slate-400">Try an outlet code (MY-0XX) or platform name.</span>
                </p>
              ) : (
                <>
                  {searchResults.outlets.length > 0 && (
                    <>
                      <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Outlets</p>
                      {searchResults.outlets.map((o) => (
                        <button
                          key={o.code}
                          type="button"
                          onClick={() => handleJumpToOutlet(o.code)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-50"
                        >
                          <span className="font-semibold text-slate-800">
                            {o.name} <span className="font-normal text-slate-400">· {o.code}</span>
                          </span>
                          <span className="tabular-nums text-[11px] text-slate-500">RM {o.netSales.toLocaleString()}</span>
                        </button>
                      ))}
                    </>
                  )}
                  {searchResults.platforms.length > 0 && (
                    <>
                      <p className="border-t border-slate-100 px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Platforms
                      </p>
                      {searchResults.platforms.map((platform) => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => {
                            onChannelFilterChange(platform);
                            onDashboardSectionChange('fees');
                            setSearchOpen(false);
                            setSearchTerm('');
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-50"
                        >
                          <PlatformLogo platform={platform} size="sm" />
                          <span className="font-semibold text-slate-800">{platform}</span>
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Live sync */}
        <button
          type="button"
          id="toggle-live-sync-btn"
          onClick={onToggleLiveSync}
          className={`hidden h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-slate-400 lg:flex ${
            isLiveSync
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
          title={isLiveSync ? 'Live real-time sync active' : 'Click to enable real-time sync'}
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            {isLiveSync && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${isLiveSync ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </span>
          <span className="whitespace-nowrap text-[11px] font-medium">{isLiveSync ? 'Live Sync: ON' : 'Sync: Paused'}</span>
        </button>

        {/* Lark alert */}
        <button
          type="button"
          id="simulate-event-btn"
          onClick={onSimulateEvent}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400 sm:flex"
          title="Simulate Lark Webhook / Audit Alert"
        >
          <SendHorizontal className="h-3.5 w-3.5 text-[#0284C7]" aria-hidden="true" />
        </button>

        {/* New task */}
        <button
          type="button"
          id="create-task-btn"
          onClick={onOpenNewTask}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#C8102E] px-3 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#A60D26] active:bg-[#850A1E] focus-visible:ring-2 focus-visible:ring-[#C8102E]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>

      {/* Row 2: entity · channel filters + module tabs on small screens */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2 lg:px-6">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold lg:hidden">
          <button type="button" onClick={() => onTabChange('dashboard')} className={`rounded-lg px-2.5 py-1.5 ${currentTab === 'dashboard' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onTabChange('tasks')} className={`rounded-lg px-2.5 py-1.5 ${currentTab === 'tasks' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
            <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onTabChange('matrix')} className={`rounded-lg px-2.5 py-1.5 ${currentTab === 'matrix' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {showDashboardControls && (
          <>
            <fieldset className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
              <legend className="sr-only">Entity filter</legend>
              {(
                [
                  { id: 'all', label: 'All · 44' },
                  { id: 'myUsPizza', label: 'MY US Pizza · 42' },
                  { id: 'sabah', label: 'Sabah · 2' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onEntityFilterChange(opt.id)}
                  className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                    entityFilter === opt.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </fieldset>

            <select
              value={channelFilter}
              onChange={(e) => onChannelFilterChange(e.target.value as ChannelFilter)}
              className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20"
            >
              {CHANNEL_OPTIONS.map((channel) => (
                <option key={channel} value={channel}>
                  {channel === 'All' ? 'All Channels' : channel}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </header>
  );
};
