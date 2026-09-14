import React from 'react';
import {
  NavArrowRight as ChevronRight,
  Attachment as Paperclip,
  ChatBubble as MessageSquare
} from 'iconoir-react';
import { UserTask, TaskStatus } from '../../types';

interface TaskKanbanViewProps {
  tasks: UserTask[];
  onSelectTask: (task: UserTask) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
}

const COLUMNS: { status: TaskStatus; label: string; dotColor: string; bgHeader: string }[] = [
  { status: 'todo', label: 'To Do', dotColor: 'bg-slate-400', bgHeader: 'bg-slate-50 border-slate-200' },
  { status: 'in_progress', label: 'In Progress', dotColor: 'bg-sky-500', bgHeader: 'bg-sky-50/50 border-sky-200' },
  { status: 'in_review', label: 'Under Review', dotColor: 'bg-amber-500', bgHeader: 'bg-amber-50/50 border-amber-200' },
  { status: 'completed', label: 'Completed', dotColor: 'bg-emerald-500', bgHeader: 'bg-emerald-50/50 border-emerald-200' },
  { status: 'flagged', label: 'Discrepancy / Flagged', dotColor: 'bg-rose-500', bgHeader: 'bg-rose-50/50 border-rose-200' },
];

const PRIORITY_STYLES = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-sky-50 text-sky-700 border-sky-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

const CATEGORY_NAMES: Record<string, string> = {
  channel_report: 'Channel Report',
  grn_audit: 'GRN Purchases',
  fee_reconciliation: 'Platform Fees & Ads',
  pnl_review: 'P&L / Margin',
  bank_settlement: 'Bank Settlement',
};

const CHANNEL_COLORS: Record<string, string> = {
  Grab: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FoodPanda: 'bg-pink-50 text-pink-700 border-pink-200',
  Shopee: 'bg-orange-50 text-orange-700 border-orange-200',
  Web: 'bg-sky-50 text-sky-700 border-sky-200',
  POS: 'bg-slate-100 text-slate-700 border-slate-200',
  All: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const TaskKanbanView: React.FC<TaskKanbanViewProps> = ({
  tasks,
  onSelectTask,
  onUpdateTaskStatus,
}) => {
  const getNextStatus = (current: TaskStatus): TaskStatus | null => {
    switch (current) {
      case 'todo': return 'in_progress';
      case 'in_progress': return 'in_review';
      case 'in_review': return 'completed';
      case 'flagged': return 'in_progress';
      default: return null;
    }
  };

  const getPrevStatus = (current: TaskStatus): TaskStatus | null => {
    switch (current) {
      case 'in_progress': return 'todo';
      case 'in_review': return 'in_progress';
      case 'completed': return 'in_review';
      case 'flagged': return 'in_progress';
      default: return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status);

        return (
          <div 
            key={col.status}
            className="flex flex-col rounded-xl bg-slate-100/70 border border-slate-200/80 min-w-[270px] max-h-[calc(100vh-260px)]"
          >
            {/* Column Header */}
            <div className={`p-3 rounded-t-xl border-b flex items-center justify-between font-bold text-xs ${col.bgHeader}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`}></span>
                <span className="text-slate-800">{col.label}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700 text-[11px] font-extrabold shadow-2xs">
                {colTasks.length}
              </span>
            </div>

            {/* Column Body - Task Cards */}
            <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
              {colTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No tasks here
                </div>
              ) : (
                colTasks.map(task => {
                  const completedChecklistCount = task.checklist.filter(c => c.completed).length;
                  const totalChecklist = task.checklist.length;
                  const nextStatus = getNextStatus(task.status);
                  const prevStatus = getPrevStatus(task.status);

                  return (
                    <div
                      key={task.id}
                      className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer group"
                      onClick={() => onSelectTask(task)}
                    >
                      {/* Top Badges: Priority & Category */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border uppercase ${PRIORITY_STYLES[task.priority]}`}>
                          {task.priority}
                        </span>

                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm border ${CHANNEL_COLORS[task.channel] || 'bg-slate-100'}`}>
                          {task.channel}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-2 leading-snug">
                        {task.title}
                      </h4>

                      {/* Outlet & Category */}
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                          {task.outletName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {CATEGORY_NAMES[task.category] || task.category}
                        </span>
                      </div>

                      {/* Subtask checklist progress */}
                      {totalChecklist > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                            <span>Checklist ({completedChecklistCount}/{totalChecklist})</span>
                            <span className="font-bold text-slate-700">{task.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                task.progress === 100 
                                  ? 'bg-emerald-500' 
                                  : task.progress > 50 
                                  ? 'bg-sky-500' 
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Discrepancy highlight if flagged */}
                      {task.discrepancyAmount !== undefined && task.discrepancyAmount > 0 && (
                        <div className="mt-2 px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-center justify-between">
                          <span>Discrepancy</span>
                          <span>RM {task.discrepancyAmount.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Footer: Assignee, Due date, Attachments, Quick Move */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        {/* Assignee Avatar */}
                        <div className="flex items-center gap-1.5" title={`${task.assignee.name} (${task.assignee.role})`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${task.assignee.avatarBg}`}>
                            {task.assignee.name.charAt(0)}
                          </div>
                          <span className="text-[11px] font-medium text-slate-600 truncate max-w-[85px]">
                            {task.assignee.name.split(' ')[0]}
                          </span>
                        </div>

                        {/* Right icons: Comments/Attachments and quick advance */}
                        <div className="flex items-center gap-1.5 text-slate-400">
                          {task.attachments && task.attachments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-500" title={`${task.attachments.length} attachments`}>
                              <Paperclip className="w-3 h-3" />
                              {task.attachments.length}
                            </span>
                          )}
                          {task.comments && task.comments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-500" title={`${task.comments.length} comments`}>
                              <MessageSquare className="w-3 h-3" />
                              {task.comments.length}
                            </span>
                          )}

                          {/* Quick advance status button */}
                          {nextStatus && (
                            <button
                              title={`Advance to ${nextStatus.replace('_', ' ')}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateTaskStatus(task.id, nextStatus);
                              }}
                              className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors ml-1"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
