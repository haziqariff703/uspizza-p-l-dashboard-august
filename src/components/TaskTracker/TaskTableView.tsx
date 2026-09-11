import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { UserTask, TaskStatus, TaskPriority, ChannelType } from '../../types';

interface TaskTableViewProps {
  tasks: UserTask[];
  onSelectTask: (task: UserTask) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
}

const STATUS_LABELS: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  todo: { label: 'To Do', bg: 'bg-slate-100', text: 'text-slate-700' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-800' },
  in_review: { label: 'Under Review', bg: 'bg-amber-100', text: 'text-amber-800' },
  completed: { label: 'Completed', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  flagged: { label: 'Discrepancy', bg: 'bg-rose-100', text: 'text-rose-800' },
};

const PRIORITY_BADGES: Record<TaskPriority, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  tasks,
  onSelectTask,
  onUpdateTaskStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchSearch = 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.outletName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.assignee.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchChannel = channelFilter === 'all' || task.channel === channelFilter;
      const matchPriority = priorityFilter === 'all' || task.priority === priorityFilter;

      return matchSearch && matchStatus && matchChannel && matchPriority;
    });
  }, [tasks, searchTerm, statusFilter, channelFilter, priorityFilter]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Search & Filter Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search task by title, outlet, ID or assignee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">Under Review</option>
            <option value="completed">Completed</option>
            <option value="flagged">Flagged / Discrepancy</option>
          </select>

          {/* Channel filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="all">All Channels</option>
            <option value="Grab">Grab</option>
            <option value="FoodPanda">FoodPanda</option>
            <option value="Shopee">Shopee</option>
            <option value="Web">Web (Apps)</option>
            <option value="POS">POS</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <span className="text-xs text-slate-500 font-medium pl-1">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Task Details</th>
              <th className="py-3 px-3">Outlet / Scope</th>
              <th className="py-3 px-3">Channel</th>
              <th className="py-3 px-3">Assignee</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Progress</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Due Date</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                  No tasks matched your search or filters.
                </td>
              </tr>
            ) : (
              filteredTasks.map(task => {
                const statusMeta = STATUS_LABELS[task.status];
                const completedSteps = task.checklist.filter(c => c.completed).length;

                return (
                  <tr 
                    key={task.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectTask(task)}
                  >
                    {/* Task Title & ID */}
                    <td className="py-3 px-4 max-w-xs sm:max-w-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400">
                        <span>{task.id}</span>
                        {task.discrepancyAmount !== undefined && task.discrepancyAmount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-sans font-bold">
                            Discrepancy: RM {task.discrepancyAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-1 mt-0.5">
                        {task.title}
                      </div>
                    </td>

                    {/* Outlet & Entity */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{task.outletName}</div>
                      <div className="text-[10px] text-slate-400">{task.entity}</div>
                    </td>

                    {/* Channel */}
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-50 text-slate-700 border-slate-200">
                        {task.channel}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${task.assignee.avatarBg}`}>
                          {task.assignee.name.charAt(0)}
                        </div>
                        <span className="text-slate-700 font-medium truncate max-w-[90px]">
                          {task.assignee.name.split(' ')[0]}
                        </span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${PRIORITY_BADGES[task.priority]}`}>
                        {task.priority}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="py-3 px-3 min-w-[110px]">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-semibold text-slate-600">{task.progress}%</span>
                        <span className="text-slate-400">({completedSteps}/{task.checklist.length})</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            task.progress === 100 
                              ? 'bg-emerald-500' 
                              : task.progress > 50 
                              ? 'bg-blue-500' 
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={task.status}
                        onChange={(e) => onUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-md border-0 cursor-pointer ${statusMeta.bg} ${statusMeta.text} focus:ring-1 focus:ring-slate-300`}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="in_review">Under Review</option>
                        <option value="completed">Completed</option>
                        <option value="flagged">Flagged</option>
                      </select>
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {task.dueDate}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectTask(task)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 text-[11px] font-medium"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
