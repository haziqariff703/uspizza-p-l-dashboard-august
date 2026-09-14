import React from 'react';
import { WarningTriangle as AlertTriangle } from 'iconoir-react';
import { UserTask, ActivityEvent } from '../../types';

interface TaskSummaryBarProps {
  tasks: UserTask[];
  activities: ActivityEvent[];
  isLiveSync: boolean;
}

export const TaskSummaryBar: React.FC<TaskSummaryBarProps> = ({
  tasks,
  activities,
  isLiveSync,
}) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const inReviewTasks = tasks.filter(t => t.status === 'in_review').length;
  const flaggedTasks = tasks.filter(t => t.status === 'flagged').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;

  const overallProgress = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  // Calculate total checklist subtasks progress
  const allSubtasks = tasks.flatMap(t => t.checklist);
  const completedSubtasks = allSubtasks.filter(s => s.completed).length;
  const subtaskProgress = allSubtasks.length > 0 
    ? Math.round((completedSubtasks / allSubtasks.length) * 100) 
    : 0;

  const latestActivity = activities[0];

  return (
    <div className="space-y-4">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Overall Task Completion */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monthly Closing
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {overallProgress}%
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({completedTasks}/{totalTasks} tasks)
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: In Progress / In Review */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active In Flight
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {inProgressTasks + inReviewTasks}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({inReviewTasks} awaiting review)
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-600 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-sky-500"></span>
            <span>{inProgressTasks} In Progress</span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ml-1"></span>
            <span>{inReviewTasks} Review</span>
          </div>
        </div>

        {/* Card 3: Checklists Subtasks Velocity */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Checklist Steps
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-sky-700">
              {subtaskProgress}%
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({completedSubtasks}/{allSubtasks.length} steps)
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-600 font-medium">
            Step-level verification velocity
          </div>
        </div>

        {/* Card 4: Discrepancies & Flagged Audits */}
        <div className={`p-4 rounded-xl border shadow-xs transition-all ${
          flaggedTasks > 0 
            ? 'bg-rose-50/50 border-rose-200' 
            : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Flagged Items
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-700">
              {flaggedTasks}
            </span>
            <span className="text-xs font-semibold text-rose-600">
              requires reconciliation
            </span>
          </div>
          <div className="mt-2.5 text-xs text-rose-600 font-medium truncate">
            {flaggedTasks > 0 ? 'Dpulze Cyberjaya 50.2% margin' : 'All audits normal'}
          </div>
        </div>

        {/* Card 5: Real-time Velocity & Live Stream Indicator */}
        <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Real-Time Feed
            </span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xs font-bold text-slate-800 line-clamp-1">
              {latestActivity ? `${latestActivity.userName}` : 'System Initialized'}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {latestActivity ? `${latestActivity.action} ${latestActivity.outletName}` : 'Ready for inputs'}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              {latestActivity?.timestamp || 'just now'}
            </div>
          </div>
        </div>

      </div>

      {/* Real-Time Notification Banner if discrepancies exist */}
      {flaggedTasks > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Operational Alert:</strong> 1 task has an active margin discrepancy (Dpulze Cyberjaya purchases RM 75,909 vs corporate target 60.3%).
            </span>
          </div>
          <span className="font-bold text-amber-800 whitespace-nowrap ml-2">
            Audit in progress
          </span>
        </div>
      )}
    </div>
  );
};
