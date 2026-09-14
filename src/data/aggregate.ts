import { OriginalOutlet, OriginalPlatform } from '../types';
import { ORIGINAL_OUTLETS } from './originalOutlets';

/**
 * Reimplementation of the original dashboard's aggregation (function `R` in
 * public/_next/static/chunks/0dxqdjmr89kaj.js). Every figure is summed over the
 * outlets currently in scope, then the deltas are derived — so an entity filter
 * yields real service-charge, tax and commission numbers, not blanks.
 *
 * Proven identities from that source:
 *   discount      = grossMenu − net
 *   serviceCharge = netSC     − net
 *   tax           = netSCTax  − netSC
 *   commission    = net       − netAfterCommission
 *   grossProfit   = net       − purchases
 *   margin        = net > 0 ? grossProfit / net * 100 : 0
 *   settlement[p] = Σ payout[p]
 *   keptPct[p]    = grossMenu[p] > 0 ? settlement[p] / grossMenu[p] * 100 : 0
 *   fees[p]       = netSCTax[p] − settlement[p]   (what the platform withheld)
 */

export const PLATFORMS: OriginalPlatform[] = ['grab', 'foodpanda', 'shopee', 'apps', 'pos'];

export const PLATFORM_LABELS: Record<OriginalPlatform, string> = {
  grab: 'Grab',
  foodpanda: 'FoodPanda',
  shopee: 'Shopee',
  apps: 'Apps',
  pos: 'POS',
};

export interface PlatformAggregate {
  platform: OriginalPlatform;
  label: string;
  grossMenu: number;
  net: number;
  netSC: number;
  netSCTax: number;
  /** Sum of payout — what actually reached the bank. */
  settlement: number;
  discount: number;
  serviceCharge: number;
  tax: number;
  /** netSCTax − settlement: commission plus every other platform deduction. */
  commissionAndFees: number;
  keptPct: number;
}

export interface OverviewAggregate {
  outletCount: number;
  grossMenu: number;
  net: number;
  netSC: number;
  netSCTax: number;
  discount: number;
  serviceCharge: number;
  tax: number;
  purchases: number;
  netAfterCommission: number;
  commission: number;
  grossProfit: number;
  margin: number;
  byPlatform: PlatformAggregate[];
}

/** Entity scope keys used by the navbar filter, mapped to the dataset's legal names. */
export const ENTITY_NAMES = {
  myUsPizza: 'MY US PIZZA SDN BHD',
  sabah: 'MY US PIZZA (SABAH) SDN BHD',
} as const;

export type EntityScope = 'all' | keyof typeof ENTITY_NAMES;

export const scopeOutlets = (scope: EntityScope, outlets = ORIGINAL_OUTLETS): OriginalOutlet[] =>
  scope === 'all' ? outlets : outlets.filter((o) => o.entity === ENTITY_NAMES[scope]);

export function aggregate(outlets: OriginalOutlet[]): OverviewAggregate {
  const zero = { grossMenu: 0, net: 0, netSC: 0, netSCTax: 0 };

  const platformTotals: Record<OriginalPlatform, typeof zero & { settlement: number }> = {
    grab: { ...zero, settlement: 0 },
    foodpanda: { ...zero, settlement: 0 },
    shopee: { ...zero, settlement: 0 },
    apps: { ...zero, settlement: 0 },
    pos: { ...zero, settlement: 0 },
  };

  let grossMenu = 0;
  let net = 0;
  let netSC = 0;
  let netSCTax = 0;
  let purchases = 0;
  let netAfterCommission = 0;

  for (const outlet of outlets) {
    grossMenu += outlet.metrics.grossMenu;
    net += outlet.metrics.net;
    netSC += outlet.metrics.netSC;
    netSCTax += outlet.metrics.netSCTax;
    purchases += outlet.purchases;
    netAfterCommission += outlet.netAfterCommission;

    for (const platform of PLATFORMS) {
      const slice = outlet.byPlatform[platform];
      const totals = platformTotals[platform];
      totals.grossMenu += slice.grossMenu;
      totals.net += slice.net;
      totals.netSC += slice.netSC;
      totals.netSCTax += slice.netSCTax;
      totals.settlement += outlet.payout[platform];
    }
  }

  const grossProfit = net - purchases;

  return {
    outletCount: outlets.length,
    grossMenu,
    net,
    netSC,
    netSCTax,
    discount: grossMenu - net,
    serviceCharge: netSC - net,
    tax: netSCTax - netSC,
    purchases,
    netAfterCommission,
    commission: net - netAfterCommission,
    grossProfit,
    margin: net > 0 ? (grossProfit / net) * 100 : 0,
    byPlatform: PLATFORMS.map((platform) => {
      const t = platformTotals[platform];
      return {
        platform,
        label: PLATFORM_LABELS[platform],
        grossMenu: t.grossMenu,
        net: t.net,
        netSC: t.netSC,
        netSCTax: t.netSCTax,
        settlement: t.settlement,
        discount: t.grossMenu - t.net,
        serviceCharge: t.netSC - t.net,
        tax: t.netSCTax - t.netSC,
        commissionAndFees: t.netSCTax - t.settlement,
        keptPct: t.grossMenu > 0 ? (t.settlement / t.grossMenu) * 100 : 0,
      };
    }),
  };
}

/** Outlet counts per scope, for the entity toggle. */
export const scopeCounts = {
  all: ORIGINAL_OUTLETS.length,
  myUsPizza: scopeOutlets('myUsPizza').length,
  sabah: scopeOutlets('sabah').length,
} as const;
