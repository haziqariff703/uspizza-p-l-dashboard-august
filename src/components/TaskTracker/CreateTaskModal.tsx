import React, { useState } from 'react';
import { Xmark as X, Trash as Trash2 } from 'iconoir-react';
import { UserTask, TaskCategory, TaskPriority, ChannelType } from '../../types';
import { INITIAL_OUTLETS, TEAM_MEMBERS } from '../../data/outletData';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (task: UserTask) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreateTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outletId, setOutletId] = useState('MY-030');
  const [category, setCategory] = useState<TaskCategory>('channel_report');
  const [channel, setChannel] = useState<ChannelType>('Grab');
  const [assigneeId, setAssigneeId] = useState(TEAM_MEMBERS[0].id);
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState('2026-05-31');
  const [discrepancy, setDiscrepancy] = useState<string>('');
  
  const [checklistItems, setChecklistItems] = useState<string[]>([
    'Verify raw source CSV report from merchant portal',
    'Cross-check net transaction batch against POS ledger',
    'Submit sign-off to Central Finance',
  ]);
  const [newChecklistStep, setNewChecklistStep] = useState('');

  if (!isOpen) return null;

  const handleAddStep = () => {
    if (!newChecklistStep.trim()) return;
    setChecklistItems([...checklistItems, newChecklistStep.trim()]);
    setNewChecklistStep('');
  };

  const handleRemoveStep = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedOutlet = INITIAL_OUTLETS.find(o => o.id === outletId) || {
      id: 'ALL_OUTLETS',
      name: 'All 44 Outlets',
      entity: 'MY US PIZZA',
    };

    const selectedAssignee = TEAM_MEMBERS.find(m => m.id === assigneeId) || TEAM_MEMBERS[0];

    const newTask: UserTask = {
      id: `TASK-${Math.floor(100 + Math.random() * 900)}`,
      title: title.trim(),
      description: description.trim() || 'Verify channel report and operational transactions.',
      category,
      outletId: selectedOutlet.id,
      outletName: selectedOutlet.name,
      entity: selectedOutlet.entity as 'MY US PIZZA' | 'Sabah',
      channel,
      assignee: selectedAssignee,
      status: 'todo',
      priority,
      dueDate,
      progress: 0,
      checklist: checklistItems.map((text, idx) => ({
        id: `c-${Date.now()}-${idx}`,
        text,
        completed: false,
      })),
      discrepancyAmount: discrepancy ? parseFloat(discrepancy) : undefined,
      currency: 'MYR',
      attachments: [],
      comments: [],
      createdAt: '2026-05-31',
      updatedAt: 'Just now',
    };

    onCreateTask(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Create New Operational Task
            </h2>
            <p className="text-xs text-slate-500">
              Assign outlet verification, reconciliation, or audit tasks
            </p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close create task dialog"
            title="Close"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs sm:text-sm">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Audit Grab Merchant Deduction for Mount Austin"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Outlet & Channel row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Outlet
              </label>
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL_OUTLETS">All 44 Outlets (Corporate Scope)</option>
                {INITIAL_OUTLETS.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code} - {o.entity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Channel / Platform
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as ChannelType)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                <option value="Grab">Grab</option>
                <option value="FoodPanda">FoodPanda</option>
                <option value="Shopee">Shopee</option>
                <option value="Web">Web (Apps)</option>
                <option value="POS">POS</option>
                <option value="All">All Channels</option>
              </select>
            </div>
          </div>

          {/* Category & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Task Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                <option value="channel_report">Channel Report Ingestion</option>
                <option value="grn_audit">GRN Purchases Audit</option>
                <option value="fee_reconciliation">Platform Fees & Advertising</option>
                <option value="pnl_review">Outlet P&L & Margin Sign-off</option>
                <option value="bank_settlement">Bank Settlement Matching</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                {TEAM_MEMBERS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority & Deadline & Discrepancy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Discrepancy (RM)
              </label>
              <input
                type="number"
                placeholder="Optional RM"
                value={discrepancy}
                onChange={(e) => setDiscrepancy(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description & Context
            </label>
            <textarea
              rows={2}
              placeholder="Provide instructions, ledger references, or dispute details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Checklist Items */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Checklist Steps (Tracks Real-Time Progress)
            </label>
            <div className="space-y-1.5 mb-2">
              {checklistItems.map((step, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add subtask step..."
                value={newChecklistStep}
                onChange={(e) => setNewChecklistStep(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="button"
                onClick={handleAddStep}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Add
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
