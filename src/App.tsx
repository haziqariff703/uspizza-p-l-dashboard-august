import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  KanbanBoard as Kanban,
  Table as TableIcon
} from 'iconoir-react';
import { TopBar } from './components/TopBar';
import { TaskSummaryBar } from './components/TaskTracker/TaskSummaryBar';
import { TaskKanbanView } from './components/TaskTracker/TaskKanbanView';
import { TaskTableView } from './components/TaskTracker/TaskTableView';
import { TaskDetailModal } from './components/TaskTracker/TaskDetailModal';
import { CreateTaskModal } from './components/TaskTracker/CreateTaskModal';
import { OutletCoverageMatrix } from './components/OutletMatrix/OutletCoverageMatrix';
import { SalesDashboard } from './components/SalesDashboard/SalesDashboard';
import { LiveActivityFeed } from './components/RealTimeActivity/LiveActivityFeed';

import { 
  INITIAL_TASKS, 
  INITIAL_OUTLETS, 
  INITIAL_ACTIVITIES, 
  TEAM_MEMBERS 
} from './data/outletData';
import {
  UserTask,
  TaskStatus,
  OutletFinancialData,
  ActivityEvent,
  ChannelFilter,
  DashboardSection
} from './types';

export default function App() {
  // Primary States
  const [tasks, setTasks] = useState<UserTask[]>(INITIAL_TASKS);
  const [outlets, setOutlets] = useState<OutletFinancialData[]>(INITIAL_OUTLETS);
  const [activities, setActivities] = useState<ActivityEvent[]>(INITIAL_ACTIVITIES);
  
  // Navigation & Filter States
  const [currentTab, setCurrentTab] = useState<'tasks' | 'dashboard' | 'matrix'>('dashboard');
  const [taskSubView, setTaskSubView] = useState<'kanban' | 'table'>('kanban');
  const [entityFilter, setEntityFilter] = useState<'all' | 'myUsPizza' | 'sabah'>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('All');
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>('overview');
  const [isLiveSync, setIsLiveSync] = useState<boolean>(true);
  const [selectedOutletCode, setSelectedOutletCode] = useState<string | null>(null);

  // Modals
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  // Filter tasks based on entity filter
  const filteredTasks = useMemo(() => {
    if (entityFilter === 'myUsPizza') {
      return tasks.filter(t => t.entity === 'MY US PIZZA');
    }
    if (entityFilter === 'sabah') {
      return tasks.filter(t => t.entity === 'Sabah');
    }
    return tasks;
  }, [tasks, entityFilter]);

  // Overall Task Progress %
  const overallProgress = useMemo(() => {
    if (tasks.length === 0) return 100;
    const totalProgress = tasks.reduce((sum, t) => sum + t.progress, 0);
    return Math.round(totalProgress / tasks.length);
  }, [tasks]);

  const pendingTasksCount = useMemo(() => {
    return tasks.filter(t => t.status !== 'completed').length;
  }, [tasks]);

  // Push an activity event helper
  const addActivity = useCallback((
    type: ActivityEvent['type'],
    message: string,
    userName: string = 'Current User (Finance Lead)',
    taskId?: string,
    taskTitle?: string
  ) => {
    const newEvent: ActivityEvent = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: 'Just now',
      userName,
      type,
      message,
      taskId,
      taskTitle,
    };
    setActivities(prev => [newEvent, ...prev.slice(0, 40)]);
    setLastNotification(message);

    // Clear toast notification after 4 seconds
    setTimeout(() => {
      setLastNotification(null);
    }, 4000);
  }, []);

  // Update Task Status
  const handleUpdateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const isNowCompleted = newStatus === 'completed';
        const updatedChecklist = isNowCompleted 
          ? task.checklist.map(c => ({ ...c, completed: true, completedAt: 'Just now', completedBy: 'fiqsss45' }))
          : task.checklist;

        const newProgress = isNowCompleted ? 100 : task.progress;

        // If completed, fire celebration confetti!
        if (isNowCompleted && task.status !== 'completed') {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        }

        return {
          ...task,
          status: newStatus,
          progress: newProgress,
          checklist: updatedChecklist,
          updatedAt: 'Just now',
        };
      }
      return task;
    }));

    // Update selectedTask if open in modal
    setSelectedTask(prev => {
      if (prev && prev.id === taskId) {
        return {
          ...prev,
          status: newStatus,
          progress: newStatus === 'completed' ? 100 : prev.progress,
        };
      }
      return prev;
    });

    const target = tasks.find(t => t.id === taskId);
    addActivity(
      'status_change',
      `Moved task status to "${newStatus.toUpperCase()}"`,
      'fiqsss45 (Ops Lead)',
      taskId,
      target?.title
    );
  }, [tasks, addActivity]);

  // Toggle Checklist item
  const handleToggleChecklist = useCallback((taskId: string, checklistId: string) => {
    let taskName = '';
    let updatedStepText = '';
    let isCompletedNow = false;

    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        taskName = task.title;
        const updatedChecklist = task.checklist.map(item => {
          if (item.id === checklistId) {
            isCompletedNow = !item.completed;
            updatedStepText = item.text;
            return {
              ...item,
              completed: isCompletedNow,
              completedAt: isCompletedNow ? 'Just now' : undefined,
              completedBy: isCompletedNow ? 'fiqsss45' : undefined,
            };
          }
          return item;
        });

        const completedCount = updatedChecklist.filter(c => c.completed).length;
        const newProgress = Math.round((completedCount / updatedChecklist.length) * 100);
        const newStatus: TaskStatus = newProgress === 100 ? 'completed' : task.status === 'todo' ? 'in_progress' : task.status;

        if (newProgress === 100 && task.status !== 'completed') {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        }

        const updatedTask = {
          ...task,
          checklist: updatedChecklist,
          progress: newProgress,
          status: newStatus,
          updatedAt: 'Just now',
        };

        // Sync modal view
        setSelectedTask(updatedTask);

        return updatedTask;
      }
      return task;
    }));

    addActivity(
      'checklist_step',
      `${isCompletedNow ? 'Verified' : 'Unchecked'}: "${updatedStepText}"`,
      'Sarah Tan (Central Accounts)',
      taskId,
      taskName
    );
  }, [addActivity]);

  // Add subtask checklist item
  const handleAddChecklistItem = useCallback((taskId: string, text: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newItem = {
          id: `c-${Date.now()}`,
          text,
          completed: false,
        };
        const updatedChecklist = [...task.checklist, newItem];
        const completedCount = updatedChecklist.filter(c => c.completed).length;
        const newProgress = Math.round((completedCount / updatedChecklist.length) * 100);

        const updatedTask = {
          ...task,
          checklist: updatedChecklist,
          progress: newProgress,
          updatedAt: 'Just now',
        };

        setSelectedTask(updatedTask);
        return updatedTask;
      }
      return task;
    }));

    addActivity('checklist_step', `Added checklist step: "${text}"`, 'fiqsss45', taskId);
  }, [addActivity]);

  // Add Comment / Audit Remark
  const handleAddComment = useCallback((taskId: string, message: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newComment = {
          id: `comm-${Date.now()}`,
          authorName: 'fiqsss45 (Finance Analyst)',
          message,
          timestamp: 'Just now',
        };
        const updatedTask = {
          ...task,
          comments: [...task.comments, newComment],
          updatedAt: 'Just now',
        };
        setSelectedTask(updatedTask);
        return updatedTask;
      }
      return task;
    }));

    addActivity('comment', `Audit Remark: "${message}"`, 'fiqsss45', taskId);
  }, [addActivity]);

  // Create Task
  const handleCreateTask = useCallback((newTask: UserTask) => {
    setTasks(prev => [newTask, ...prev]);
    addActivity('status_change', `Created new task: "${newTask.title}" for ${newTask.outletName}`, 'fiqsss45', newTask.id, newTask.title);
  }, [addActivity]);

  // Toggle Outlet Channel Status in Matrix
  const handleToggleOutletChannelStatus = useCallback((
    outletId: string, 
    channel: 'POS' | 'Grab' | 'FoodPanda' | 'Shopee' | 'Web' | 'GRN'
  ) => {
    const cycleMap: Record<string, 'complete' | 'in_progress' | 'flagged'> = {
      complete: 'in_progress',
      in_progress: 'flagged',
      flagged: 'complete',
      pending: 'in_progress',
    };

    let outletName = '';
    let newStatusStr = '';

    setOutlets(prev => prev.map(outlet => {
      if (outlet.id === outletId && outlet.status === 'active') {
        outletName = outlet.name;
        const current = outlet.channelStatus[channel];
        const next = cycleMap[current] || 'complete';
        newStatusStr = next;

        return {
          ...outlet,
          channelStatus: {
            ...outlet.channelStatus,
            [channel]: next,
          }
        };
      }
      return outlet;
    }));

    if (outletName) {
      addActivity(
        'checklist_step',
        `Updated ${channel} audit status for ${outletName} to [${newStatusStr.toUpperCase()}]`,
        'fiqsss45 (Branch Auditor)'
      );
    }
  }, [addActivity]);

  // Simulate Random Live Event
  const handleSimulateEvent = useCallback(() => {
    const mockEvents = [
      {
        user: 'Ahmad Fikri (Reconciliation)',
        msg: 'Imported 142 daily POS settlement slips for Dang Wangi (MY-010).',
        type: 'checklist_step' as const,
      },
      {
        user: 'Sarah Tan (Central Accounts)',
        msg: 'Uploaded FoodPanda advertising rebate DO-5519 for Mount Austin (MY-012).',
        type: 'comment' as const,
      },
      {
        user: 'Lim Wei (Finance Auditor)',
        msg: 'Cross-checked Shopee gross merchant deduction batch #MAY-31.',
        type: 'checklist_step' as const,
      },
      {
        user: 'fiqsss45 (Ops Lead)',
        msg: 'Signed off on Vivacity Kuching gross margin audit (81.1%).',
        type: 'status_change' as const,
      },
      {
        user: 'Automated POS Service',
        msg: 'Synced Dpulze Cyberjaya bank deposit slips matching May 26-31 ledger.',
        type: 'checklist_step' as const,
      },
    ];

    const randomPick = mockEvents[Math.floor(Math.random() * mockEvents.length)];
    addActivity(randomPick.type, randomPick.msg, randomPick.user);

    // Slightly advance progress on an active task
    setTasks(prev => {
      const pending = prev.filter(t => t.status === 'in_progress' || t.status === 'in_review');
      if (pending.length === 0) return prev;
      const target = pending[Math.floor(Math.random() * pending.length)];

      return prev.map(t => {
        if (t.id === target.id) {
          const nextProg = Math.min(t.progress + 15, 95);
          return {
            ...t,
            progress: nextProg,
            updatedAt: 'Just now',
          };
        }
        return t;
      });
    });
  }, [addActivity]);

  // Navbar search result → jump straight to that outlet's P&L page
  const handleJumpToOutlet = useCallback((code: string) => {
    setCurrentTab('dashboard');
    setDashboardSection('plByOutlet');
    setSelectedOutletCode(code);
  }, []);

  // Real-time interval simulation when Live Sync is enabled
  useEffect(() => {
    if (!isLiveSync) return;

    const interval = setInterval(() => {
      // 30% chance every 16 seconds to generate a live operational tick
      if (Math.random() < 0.4) {
        handleSimulateEvent();
      }
    }, 16000);

    return () => clearInterval(interval);
  }, [isLiveSync, handleSimulateEvent]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans selection:bg-rose-500 selection:text-white">
      
      {/* Real-time Toast Banner */}
      {lastNotification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs animate-in slide-in-from-bottom-5 duration-200 max-w-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <div className="flex-1 font-medium">{lastNotification}</div>
          <button onClick={() => setLastNotification(null)} className="text-slate-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Content column (navbar replaces the former sidebar entirely) */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          entityFilter={entityFilter}
          onEntityFilterChange={setEntityFilter}
          channelFilter={channelFilter}
          onChannelFilterChange={setChannelFilter}
          dashboardSection={dashboardSection}
          onDashboardSectionChange={setDashboardSection}
          pendingTasksCount={pendingTasksCount}
          overallProgress={overallProgress}
          isLiveSync={isLiveSync}
          onToggleLiveSync={() => setIsLiveSync(!isLiveSync)}
          onOpenNewTask={() => setIsCreateModalOpen(true)}
          onSimulateEvent={handleSimulateEvent}
          onJumpToOutlet={handleJumpToOutlet}
        />

        {/* App Body Content */}
        <main className="min-w-0 flex-1 space-y-6 px-5 py-6 lg:px-8">
        
        {/* VIEW 1: USER TASKS & REAL-TIME TRACKER */}
        {currentTab === 'tasks' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPI Summary Bar */}
            <TaskSummaryBar
              tasks={filteredTasks}
              activities={activities}
              onOpenNewTask={() => setIsCreateModalOpen(true)}
            />

            {/* View Switcher Bar & Live Counter */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Display Layout:</span>
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
                  <button
                    onClick={() => setTaskSubView('kanban')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${
                      taskSubView === 'kanban' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Kanban className="w-3.5 h-3.5" />
                    <span>Kanban Board</span>
                  </button>

                  <button
                    onClick={() => setTaskSubView('table')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${
                      taskSubView === 'table' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table View</span>
                  </button>
                </div>
              </div>

              {/* Status pills info */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 overflow-x-auto scrollbar-none">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  {tasks.filter(t => t.status === 'todo').length} To Do
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  {tasks.filter(t => t.status === 'in_progress').length} In Progress
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  {tasks.filter(t => t.status === 'in_review').length} Under Review
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {tasks.filter(t => t.status === 'completed').length} Completed
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  {tasks.filter(t => t.status === 'flagged').length} Discrepancies
                </span>
              </div>
            </div>

            {/* Task View (Kanban vs Table) */}
            {taskSubView === 'kanban' ? (
              <TaskKanbanView
                tasks={filteredTasks}
                onSelectTask={setSelectedTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onOpenNewTask={() => setIsCreateModalOpen(true)}
              />
            ) : (
              <TaskTableView
                tasks={filteredTasks}
                onSelectTask={setSelectedTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
              />
            )}

            {/* Live Audit Stream at Bottom */}
            <div className="pt-4">
              <LiveActivityFeed
                activities={activities}
                isLiveSync={isLiveSync}
                onSimulateEvent={handleSimulateEvent}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: SALES & PURCHASES DASHBOARD */}
        {currentTab === 'dashboard' && (
          <SalesDashboard
            entityFilter={entityFilter}
            channelFilter={channelFilter}
            section={dashboardSection}
            outlets={outlets}
            onGoToTasks={() => setCurrentTab('tasks')}
            selectedOutletCode={selectedOutletCode}
            onSelectOutlet={setSelectedOutletCode}
            onEntityFilterChange={setEntityFilter}
          />
        )}

        {/* VIEW 3: OUTLET COVERAGE MATRIX */}
        {currentTab === 'matrix' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <OutletCoverageMatrix
              outlets={outlets}
              entityFilter={entityFilter}
              onToggleOutletChannelStatus={handleToggleOutletChannelStatus}
              onOpenCreateTaskForOutlet={(outlet) => {
                setIsCreateModalOpen(true);
              }}
            />

            {/* Live Audit Stream */}
            <LiveActivityFeed
              activities={activities}
              isLiveSync={isLiveSync}
              onSimulateEvent={handleSimulateEvent}
            />
          </div>
        )}

      </main>

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
          <div className="flex flex-col items-center justify-between gap-2 px-5 sm:flex-row lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="font-extrabold text-slate-800">US PIZZA</span>
              <span>·</span>
              <span>Corporate Outlets Operations & Audit Hub</span>
              <span>·</span>
              <span>Period: May 2026</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Real-Time Engine Active · 44 Corporate Outlets · MY US PIZZA & Sabah Entities
            </div>
          </div>
        </footer>
      </div>

      {/* Task Details Modal with Real-time Checklist & Audit Chat */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onToggleChecklist={handleToggleChecklist}
        onAddChecklistItem={handleAddChecklistItem}
        onUpdateStatus={handleUpdateTaskStatus}
        onAddComment={handleAddComment}
      />

      {/* Create New Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTask={handleCreateTask}
      />

    </div>
  );
}
