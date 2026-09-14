/**
 * Official platform brand hexes — single source for every chart, dot and rail.
 * Matches docs/original-capture.html and DESIGN.md §2.
 */
export const PLATFORM_BRAND: Record<string, string> = {
  Grab: '#00B14F',
  FoodPanda: '#D70F64',
  Shopee: '#EE4D2D',
  Apps: '#C8102E',
  POS: '#64748B',
};

/** Fee-type colors used by the commission composition bars (section 2). */
export const FEE_TYPE_COLORS = {
  commission: '#C8102E',
  advertising: '#D97706',
  platformFees: '#0F172A',
  paymentGateway: '#64748B',
  adjustments: '#CBD5E1',
} as const;

/** Sales-basis accents used by the overview metric cards (section 1). */
export const BASIS_COLORS = {
  gross: '#7C3AED',
  net: '#C8102E',
  netSc: '#0EA5E9',
  netScTax: '#0D9488',
} as const;
