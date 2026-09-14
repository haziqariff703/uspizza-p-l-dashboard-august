import React, { useState } from 'react';
import {
  Xmark as X,
  Square,
  Plus,
  Attachment as Paperclip,
  Send,
  WarningTriangle as AlertTriangle,
  CheckCircle as CheckCircle2
} from 'iconoir-react';
import { UserTask, TaskStatus, TaskPriority, ChecklistItem } from '../../types';

interface TaskDetailModalProps {
  task: UserTask | null;
  onClose: () => void;
  onToggleChecklist: (taskId: string, checklistId: string) => void;
  onAddChecklistItem: (taskId: string, text: string) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onAddComment: (taskId: string, message: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onToggleChecklist,
  onAddChecklistItem,
  onUpdateStatus,
  onAddComment,
}) => {
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  if (!task) return null;

  const completedSteps = task.checklist.filter(c => c.completed).length;
  const totalSteps = task.checklist.length;

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    onAddChecklistItem(task.id, newChecklistText.trim());
    setNewChecklistText('');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(task.id, newCommentText.trim());
    setNewCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                {task.id}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {task.outletName}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                Channel: {task.channel}
              </span>
              <span className="text-xs text-slate-500">
                Entity: <strong>{task.entity}</strong>
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-2 leading-snug">
              {task.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close task details dialog"
            title="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          
          {/* Quick Status Bar & Assignee info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            {/* Status Selector */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Status
              </label>
              <select
                value={task.status}
                onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-rose-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">Under Review</option>
                <option value="completed">Completed</option>
                <option value="flagged">Flagged / Discrepancy</option>
              </select>
            </div>

            {/* Priority & Due Date */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Priority & Deadline
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold uppercase px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px]">
                  {task.priority}
                </span>
                <span className="text-slate-600 font-medium">
                  Due: {task.dueDate}
                </span>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Assignee
              </label>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${task.assignee.avatarBg}`}>
                  {task.assignee.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs truncate">
                    {task.assignee.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {task.assignee.role}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Description & Audit Context
            </h3>
            <p className="text-slate-700 text-xs sm:text-sm leading-relaxed bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
              {task.description}
            </p>
          </div>

          {/* Discrepancy Callout if applicable */}
          {task.discrepancyAmount !== undefined && task.discrepancyAmount > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-900 text-xs sm:text-sm">
                  Reconciliation Discrepancy: RM {task.discrepancyAmount.toLocaleString()}
                </div>
                <div className="text-xs text-rose-700 mt-0.5">
                  Requires central accounting approval and branch manager sign-off before closing May 2026.
                </div>
              </div>
            </div>
          )}

          {/* Interactive Subtask Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Verification Checklist
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  ({completedSteps}/{totalSteps} completed · {task.progress}%)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 italic">
                Click any step to toggle live
              </span>
            </div>

            {/* Checklist Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  task.progress === 100 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${task.progress}%` }}
              ></div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2">
              {task.checklist.map(item => (
                <div
                  key={item.id}
                  onClick={() => onToggleChecklist(task.id, item.id)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                    item.completed
                      ? 'bg-emerald-50/40 border-emerald-200 text-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                  }`}
                >
                  <div className="mt-0.5 text-slate-400">
                    {item.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`text-xs ${item.completed ? 'line-through text-slate-500' : 'font-medium'}`}>
                      {item.text}
                    </span>
                    {item.completedAt && (
                      <div className="text-[10px] text-emerald-700 mt-0.5">
                        Verified at {item.completedAt} by {item.completedBy || 'user'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add checklist item form */}
            <form onSubmit={handleAddChecklist} className="mt-2.5 flex gap-2">
              <input
                type="text"
                placeholder="Add another verification subtask..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Step</span>
              </button>
            </form>
          </div>

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Attached Documents & Statements
              </h3>
              <div className="flex flex-wrap gap-2">
                {task.attachments.map((file, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span>{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments & Real-Time Audit Log */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
              Audit Notes & Team Discussion
            </h3>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {task.comments.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2">
                  No notes recorded yet. Add an audit remark below.
                </div>
              ) : (
                task.comments.map(comm => (
                  <div key={comm.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-900">{comm.authorName}</span>
                      <span className="text-slate-400">{comm.timestamp}</span>
                    </div>
                    <p className="text-slate-700">{comm.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add comment input */}
            <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Write an operational note or audit finding..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Note</span>
              </button>
            </form>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Last updated: {task.updatedAt}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
