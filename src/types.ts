export type ChannelType = 'POS' | 'Grab' | 'FoodPanda' | 'Shopee' | 'Web' | 'All';

/**
 * Sales platforms shown in the dashboard's platform panels. Distinct from
 * ChannelType, which covers reporting channels (has Web, no Apps).
 */
export type ChannelFilter = 'All' | 'Grab' | 'FoodPanda' | 'Shopee' | 'Apps' | 'POS';

/** Each dashboard section is its own page, picked from the navbar dropdown. */
export type DashboardSection =
  | 'overview'
  | 'fees'
  | 'coverage'
  | 'salesByOutlet'
  | 'purchasesByOutlet'
  | 'grossSalesByOutlet'
  | 'plByOutlet';

/**
 * One row of the real per-outlet P&L, sourced from docs/original-capture.html
 * (the actual captured original at `/`). Deliberately smaller than
 * OutletFinancialData — only the fields verified from that capture, for all
 * 44 outlets, vs. INITIAL_OUTLETS' fuller shape which only covers 21.
 */
export interface PLOutletRow {
  name: string;
  code: string;
  entity: 'MY US PIZZA' | 'Sabah';
  netSales: number;
  purchases: number;
  grossProfit: number;
  marginPct: number;
}

/** The five sales platforms as the original dataset keys them. */
export type OriginalPlatform = 'grab' | 'foodpanda' | 'shopee' | 'apps' | 'pos';

/** The four sales bases every metric block cycles through. */
export interface OutletMetrics {
  grossMenu: number;
  net: number;
  netSC: number;
  netSCTax: number;
}

export interface OutletFees {
  commission: number;
  advertising: number;
  platformFees: number;
  gateway: number;
  adjustments: number;
}

/**
 * One outlet exactly as the original dashboard stores it (see
 * src/data/originalOutlets.ts). Overview aggregates derive from these.
 */
export interface OriginalOutlet {
  code: string;
  name: string;
  entity: string;
  metrics: OutletMetrics;
  byPlatform: Record<OriginalPlatform, OutletMetrics>;
  payout: Record<OriginalPlatform, number>;
  fees: Record<OriginalPlatform, OutletFees>;
  purchases: number;
  netAfterCommission: number;
  commission: number;
  reports: Record<string, boolean>;
  missingReports: string[];
  missingPos: boolean;
}

/**
 * Report state per outlet/channel. "Received" deliberately does not mean
 * verified — a file can arrive and still be waiting on reconciliation.
 */
export type CoverageState = 'checked' | 'received' | 'missing' | 'na';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'completed' | 'flagged';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TaskCategory = 
  | 'channel_report'      // POS, Grab, FP, Shopee, Web CSV uploads
  | 'grn_audit'           // Goods Received Note inventory audits
  | 'fee_reconciliation'  // Platform commission, Ads, CPC & chargebacks
  | 'pnl_review'          // Outlet gross profit & margin validation
  | 'bank_settlement';    // Payout matching against corporate bank accounts

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface TaskComment {
  id: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  timestamp: string;
  message: string;
}

export interface UserTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  outletId: string;
  outletName: string;
  entity: 'MY US PIZZA' | 'Sabah';
  channel: ChannelType;
  assignee: {
    id: string;
    name: string;
    role: string;
    email: string;
    avatarBg: string;
  };
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  progress: number; // 0 - 100
  checklist: ChecklistItem[];
  discrepancyAmount?: number;
  currency: string;
  attachments?: string[];
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface OutletFinancialData {
  id: string;
  code: string;
  name: string;
  entity: 'MY US PIZZA' | 'Sabah';
  status: 'active' | 'upcoming';
  note?: string;
  grossSales: number;
  discount: number;
  netSales: number;
  serviceCharge: number;
  taxSst: number;
  purchases: number; // GRN received
  grossProfit: number;
  grossMargin: number; // percentage e.g. 50.2
  netAfterCommission: number;
  platformNet: {
    Grab: number;
    FoodPanda: number;
    Shopee: number;
    Apps: number;
    POS: number;
  };
  platformGross: {
    Grab: number;
    FoodPanda: number;
    Shopee: number;
    Apps: number;
    POS: number;
  };
  platformNetSc?: {
    Grab: number;
    FoodPanda: number;
    Shopee: number;
    Apps: number;
    POS: number;
  };
  platformNetScTax?: {
    Grab: number;
    FoodPanda: number;
    Shopee: number;
    Apps: number;
    POS: number;
  };
  channelStatus: {
    POS: 'complete' | 'in_progress' | 'pending' | 'flagged';
    Grab: 'complete' | 'in_progress' | 'pending' | 'flagged';
    FoodPanda: 'complete' | 'in_progress' | 'pending' | 'flagged';
    Shopee: 'complete' | 'in_progress' | 'pending' | 'flagged';
    Web: 'complete' | 'in_progress' | 'pending' | 'flagged';
    GRN: 'complete' | 'in_progress' | 'pending' | 'flagged';
  };
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  userName: string;
  userRole?: string;
  action?: string;
  message?: string;
  taskTitle?: string;
  taskId?: string;
  outletName?: string;
  type: 'complete' | 'update' | 'flag' | 'create' | 'comment' | 'checklist_step' | 'status_change' | 'discrepancy_flag';
}
