import React from 'react';
import { 
  CheckSquare, 
  BarChart3, 
  Building2, 
  Plus, 
  Radio, 
  RefreshCw,
  Bell,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'tasks' | 'dashboard' | 'matrix';
  onTabChange: (tab: 'tasks' | 'dashboard' | 'matrix') => void;
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  onEntityFilterChange: (filter: 'all' | 'myUsPizza' | 'sabah') => void;
  isLiveSync: boolean;
  onToggleLiveSync: () => void;
  onOpenNewTask: () => void;
  onSimulateEvent: () => void;
  pendingTasksCount: number;
  overallProgress: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  entityFilter,
  onEntityFilterChange,
  isLiveSync,
  onToggleLiveSync,
  onOpenNewTask,
  onSimulateEvent,
  pendingTasksCount,
  overallProgress,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top corporate sub-bar matching screenshot header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Brand & Period info */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-rose-600 uppercase">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600"></span>
              US PIZZA · CORPORATE OUTLETS
            </div>
            <div className="flex items-baseline gap-3 mt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                Operations & Task Progress Tracker
              </h1>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-400">|</span>
              <span className="text-xs font-semibold text-slate-600">
                Period: <span className="font-bold text-slate-900">May 2026</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">
                44 outlets · 2 entities
              </span>
            </div>
          </div>

          {/* Right Action Controls: Live Sync Badge, New Task, User */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Live Real-Time Pulse Button */}
            <button
              id="toggle-live-sync-btn"
              onClick={onToggleLiveSync}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                isLiveSync
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={isLiveSync ? 'Live real-time updates are enabled' : 'Click to enable real-time simulation'}
            >
              <span className="relative flex h-2 w-2">
                {isLiveSync && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveSync ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              </span>
              <span className="whitespace-nowrap">
                {isLiveSync ? 'Real-Time Sync: ON' : 'Real-Time Sync: Paused'}
              </span>
            </button>

            {/* Quick Simulate Live Activity Button */}
            <button
              id="simulate-event-btn"
              onClick={onSimulateEvent}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              title="Simulate a real-time team action"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Simulate</span> Event
            </button>

            {/* Create Task Button */}
            <button
              id="create-task-btn"
              onClick={onOpenNewTask}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div 
                className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow-xs cursor-pointer"
                title="Logged in as fiqsss45@gmail.com (Operations Lead)"
              >
                FQ
              </div>
              <div className="hidden lg:block text-left leading-none">
                <p className="text-xs font-bold text-slate-800">fiqsss45</p>
                <p className="text-[10px] text-slate-500">Ops & Finance Lead</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs and Entity Filter Bar */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Main View Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              id="nav-tab-tasks"
              onClick={() => onTabChange('tasks')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                currentTab === 'tasks'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>User Tasks & Real-Time Tracker</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                currentTab === 'tasks' ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {pendingTasksCount}
              </span>
            </button>

            <button
              id="nav-tab-dashboard"
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                currentTab === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Sales & Purchases Dashboard</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                May 2026
              </span>
            </button>

            <button
              id="nav-tab-matrix"
              onClick={() => onTabChange('matrix')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                currentTab === 'matrix'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Outlet Coverage Matrix (44 Outlets)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                {overallProgress}% Complete
              </span>
            </button>
          </nav>

          {/* Entity Pills matching the screenshot exactly */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
              ENTITY
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
              <button
                id="entity-all-btn"
                onClick={() => onEntityFilterChange('all')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  entityFilter === 'all'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All outlets · 44
              </button>
              <button
                id="entity-my-btn"
                onClick={() => onEntityFilterChange('myUsPizza')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  entityFilter === 'myUsPizza'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                MY US PIZZA · 42
              </button>
              <button
                id="entity-sabah-btn"
                onClick={() => onEntityFilterChange('sabah')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  entityFilter === 'sabah'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sabah · 2
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
