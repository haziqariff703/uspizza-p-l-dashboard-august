import React from 'react';
import {
  GraphUp as BarChart3,
  CheckSquare,
  Building as Building2,
  Check,
  Xmark,
} from 'iconoir-react';
import { ChannelFilter, DashboardSection } from '../types';
import { UsPizzaLogo } from './common/UsPizzaLogo';
import { PlatformLogo } from './common/PlatformLogo';
import { copy } from '../copy';

const CHANNEL_OPTIONS: ChannelFilter[] = ['All', 'Grab', 'FoodPanda', 'Shopee', 'Apps', 'POS'];

const SECTION_OPTIONS: { id: DashboardSection; label: string; number: string; description: string }[] = [
  { id: 'overview', label: 'Overview', number: '1', description: copy.navDescOverview },
  { id: 'fees', label: 'Commission & Fees', number: '2', description: copy.navDescFees },
  { id: 'coverage', label: 'Data Coverage', number: '3', description: copy.navDescCoverage },
];

export interface AppSidebarProps {
  currentTab: 'tasks' | 'dashboard' | 'matrix';
  onTabChange: (tab: 'tasks' | 'dashboard' | 'matrix') => void;
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  onEntityFilterChange: (filter: 'all' | 'myUsPizza' | 'sabah') => void;
  channelFilter: ChannelFilter;
  onChannelFilterChange: (filter: ChannelFilter) => void;
  dashboardSection: DashboardSection;
  onDashboardSectionChange: (section: DashboardSection) => void;
  showDashboardControls: boolean;
  pendingTasksCount: number;
  overallProgress: number;
  /** Mobile drawer state, owned by App.tsx. */
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentTab,
  onTabChange,
  entityFilter,
  onEntityFilterChange,
  channelFilter,
  onChannelFilterChange,
  dashboardSection,
  onDashboardSectionChange,
  showDashboardControls,
  pendingTasksCount,
  overallProgress,
  sidebarOpen,
  onCloseSidebar,
}) => {
  const handleTabChange = (tab: 'tasks' | 'dashboard' | 'matrix') => {
    onTabChange(tab);
    onCloseSidebar();
  };

  const handleSectionChange = (section: DashboardSection) => {
    onDashboardSectionChange(section);
    onCloseSidebar();
  };

  return (
    <aside
      id="app-sidebar"
      aria-label="Primary navigation"
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 motion-reduce:transition-none ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      {/* Brand header */}
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <UsPizzaLogo size="sm" variant="full" />
          <button
            type="button"
            onClick={onCloseSidebar}
            aria-label="Close navigation menu"
            title="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400 lg:hidden"
          >
            <Xmark className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            May 2026 Locked
          </span>
          <span className="text-[11px] font-medium text-slate-500">{copy.navReconciled}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{copy.navOutletScope}</p>
      </div>

      {/* Scrollable nav body */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {/* Module nav */}
        <nav aria-label="Modules" className="space-y-1">
          <button
            type="button"
            id="nav-tab-dashboard"
            onClick={() => handleTabChange('dashboard')}
            aria-current={currentTab === 'dashboard' ? 'page' : undefined}
            className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 ${
              currentTab === 'dashboard'
                ? 'bg-[#0B192C] text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {currentTab === 'dashboard' && (
              <span
                className="absolute inset-y-1 left-0 w-1 rounded-r bg-[#C8102E]"
                aria-hidden="true"
              />
            )}
            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{copy.navDashboardTab}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                currentTab === 'dashboard' ? 'bg-[#C8102E] text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              Phase 1
            </span>
          </button>

          <button
            type="button"
            id="nav-tab-tasks"
            onClick={() => handleTabChange('tasks')}
            aria-current={currentTab === 'tasks' ? 'page' : undefined}
            className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 ${
              currentTab === 'tasks'
                ? 'bg-[#0B192C] text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {currentTab === 'tasks' && (
              <span
                className="absolute inset-y-1 left-0 w-1 rounded-r bg-[#C8102E]"
                aria-hidden="true"
              />
            )}
            <CheckSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{copy.navTasksTab}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                currentTab === 'tasks' ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {pendingTasksCount}
            </span>
          </button>

          <button
            type="button"
            id="nav-tab-matrix"
            onClick={() => handleTabChange('matrix')}
            aria-current={currentTab === 'matrix' ? 'page' : undefined}
            className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 ${
              currentTab === 'matrix'
                ? 'bg-[#0B192C] text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {currentTab === 'matrix' && (
              <span
                className="absolute inset-y-1 left-0 w-1 rounded-r bg-[#C8102E]"
                aria-hidden="true"
              />
            )}
            <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{copy.navMatrixTab}</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
              {overallProgress}%
            </span>
          </button>
        </nav>

        {/* Dashboard section sub-nav */}
        {currentTab === 'dashboard' && showDashboardControls && (
          <nav aria-label="Dashboard sections" className="mt-4 space-y-1 border-t border-slate-100 pt-4">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dashboard sections
            </p>
            {SECTION_OPTIONS.map((sec) => {
              const isActive = dashboardSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  id={`section-tab-${sec.id}`}
                  onClick={() => handleSectionChange(sec.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={sec.description}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 ${
                    isActive
                      ? 'bg-rose-50 text-[#C8102E]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                      isActive ? 'bg-[#C8102E] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                    aria-hidden="true"
                  >
                    {sec.number}
                  </span>
                  <span className="flex-1">{sec.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Filters */}
        {showDashboardControls && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            {/* Entity filter */}
            <div>
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Entity
              </p>
              <fieldset className="space-y-0.5">
                <legend className="sr-only">Entity filter</legend>
                {(
                  [
                    { id: 'all', label: 'All · 44', title: 'Include all 44 corporate trading outlets' },
                    { id: 'myUsPizza', label: 'MY US Pizza · 42', title: 'MY US Pizza entity outlets only' },
                    { id: 'sabah', label: 'Sabah · 2', title: 'Sabah entity outlets only' },
                  ] as const
                ).map((opt) => {
                  const isActive = entityFilter === opt.id;
                  return (
                    <label
                      key={opt.id}
                      title={opt.title}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-within:ring-2 focus-within:ring-slate-400 ${
                        isActive ? 'bg-[#C8102E]/5 text-[#C8102E]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <input
                        type="radio"
                        name="entity-filter"
                        value={opt.id}
                        checked={isActive}
                        onChange={() => onEntityFilterChange(opt.id)}
                        className="h-3.5 w-3.5 accent-[#C8102E]"
                      />
                      <span className="flex-1">{opt.label}</span>
                    </label>
                  );
                })}
              </fieldset>
            </div>

            {/* Channel filter */}
            <div>
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Channel
              </p>
              <ul role="listbox" aria-label="Channel filter" className="space-y-0.5">
                {CHANNEL_OPTIONS.map((channel) => {
                  const isActive = channel === channelFilter;
                  return (
                    <li key={channel} role="none">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => onChannelFilterChange(channel)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 ${
                          isActive ? 'bg-rose-50 text-[#C8102E]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <PlatformLogo platform={channel} size="sm" />
                        <span className="flex-1 truncate">
                          {channel === 'All' ? 'All Channels' : channel}
                        </span>
                        {isActive && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer: user */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-[#0B192C] text-[11px] font-bold text-white"
            title="Finance Lead (fiqsss45@gmail.com)"
            aria-hidden="true"
          >
            FQ
          </div>
          <div className="min-w-0 leading-none">
            <p className="truncate text-xs font-bold text-slate-800">fiqsss45</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">Finance Lead</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
