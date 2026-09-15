export type SalesSource = 'POS' | 'Grab' | 'FoodPanda' | 'Shopee' | 'Apps'

export interface SalesDailyDraft {
  salesDate: string
  outletName: string
  source: SalesSource
  grossSales: number
  discount: number
  netSales: number
  tax: number
  serviceCharge: number
  platformFees: number
  advertisingSpend: number
  payout: number
  recordCount: number
}

const number = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0

  const trimmed = value.trim()
  const isAccountingNegative = trimmed.startsWith('(') && trimmed.endsWith(')')
  const normalized = trimmed
    .replace(/^RM\s*/i, '')
    .replace(/[(),\s]/g, '')
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return 0
  return isAccountingNegative ? -parsed : parsed
}

const isoLocalDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`

function isoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return isoLocalDate(value)
  if (typeof value !== 'string') return null
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`
  const namedMonthMatch = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/)
  if (namedMonthMatch) {
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
      .indexOf(namedMonthMatch[2].toLowerCase()) + 1
    if (month > 0) return `${namedMonthMatch[3]}-${String(month).padStart(2, '0')}-${namedMonthMatch[1].padStart(2, '0')}`
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : isoLocalDate(parsed)
}

function add(rows: Map<string, SalesDailyDraft>, item: Omit<SalesDailyDraft, 'grossSales' | 'discount' | 'netSales' | 'tax' | 'serviceCharge' | 'platformFees' | 'advertisingSpend' | 'payout' | 'recordCount'> & Partial<SalesDailyDraft>) {
  const key = `${item.salesDate}|${item.outletName}|${item.source}`
  const current = rows.get(key) ?? { ...item, grossSales: 0, discount: 0, netSales: 0, tax: 0, serviceCharge: 0, platformFees: 0, advertisingSpend: 0, payout: 0, recordCount: 0 } as SalesDailyDraft
  for (const field of ['grossSales', 'discount', 'netSales', 'tax', 'serviceCharge', 'platformFees', 'advertisingSpend', 'payout'] as const) current[field] += number(item[field])
  current.recordCount += 1
  rows.set(key, current)
}

export async function parseSalesFile(file: File, source: SalesSource): Promise<SalesDailyDraft[]> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: null, raw: true })
  const totals = new Map<string, SalesDailyDraft>()

  if (source === 'POS') {
    let date: string | null = null
    let outlet: string | null = null
    for (const row of rows.slice(6)) {
      const group = row[0]
      if (isoDate(group)) { date = isoDate(group); continue }
      if (typeof group === 'string' && /^\w+-/.test(group)) { outlet = group.replace(/^\w+-/, '').trim(); continue }
      if (date && outlet && typeof row[1] === 'string') add(totals, { salesDate: date, outletName: outlet, source, grossSales: number(row[2]), discount: number(row[3]), netSales: number(row[4]), tax: number(row[5]), serviceCharge: number(row[6]) })
    }
  } else {
    const header = rows[0].map(String)
    const at = (name: string) => header.indexOf(name)
    for (const row of rows.slice(1)) {
      const dateColumn = source === 'Grab' ? 'Created On' : source === 'Shopee' ? 'Complete Time' : 'Order Date'
      const outletColumn = source === 'FoodPanda' || source === 'Apps' ? 'Outlet Name' : 'Store Name'
      const date = isoDate(row[at(dateColumn)])
      const outlet = row[at(outletColumn)]
      if (!date || typeof outlet !== 'string') continue
      if (source === 'Grab') {
        const category = row[at('Category')]
        if (category === 'Payment') add(totals, { salesDate: date, outletName: outlet, source, grossSales: number(row[at('Net Sales')]), discount: number(row[at('Offer')]) + number(row[at('Discount (Merchant-Funded)')]), netSales: number(row[at('Net Sales')]), tax: number(row[at('Tax on Order Value')]), payout: number(row[at('Total')]), platformFees: Math.max(0, number(row[at('Net Sales')]) - number(row[at('Total')])) })
        if (category === 'Advertisement') add(totals, { salesDate: date, outletName: outlet, source, advertisingSpend: Math.abs(number(row[at('Amount')])) })
      } else if (source === 'Shopee') {
        if (row[at('Order Status')] !== 'Completed' || !outlet.toLowerCase().includes('us pizza')) continue
        const grossSales = number(row[at('Food original price')])
        const earnings = number(row[at('Earnings')])
        add(totals, {
          salesDate: date,
          outletName: outlet,
          source,
          grossSales,
          discount: Math.max(0, grossSales - earnings),
          netSales: earnings,
          payout: earnings,
        })
      } else if (source === 'Apps') {
        if (row[at('Status')] !== 'Completed' || row[at('Payment Status')] !== 'Paid' || !outlet.toLowerCase().includes('us pizza')) continue
        const grossSales = number(row[at('Subtotal (RM)')])
        const tax = number(row[at('Tax (RM)')])
        const deliveryFee = number(row[at('Delivery Fee (RM)')])
        const payout = number(row[at('Grand Total (RM)')])
        const netSales = Math.max(0, payout - tax - deliveryFee)
        add(totals, {
          salesDate: date,
          outletName: outlet,
          source,
          grossSales,
          discount: Math.max(0, grossSales - netSales),
          netSales,
          tax,
          serviceCharge: deliveryFee,
          payout,
        })
      } else add(totals, { salesDate: date, outletName: outlet, source, grossSales: number(row[at('Products Value Paid By Customer')]), discount: number(row[at('Voucher Paid By Vendor')]) + number(row[at('Discount Paid By Vendor')]), netSales: number(row[at('Restaurant Revenue')]), platformFees: number(row[at('foodpanda Commission')]) + number(row[at('SST on foodpanda commission')]), payout: number(row[at('Payable Amount')]) })
    }
  }
  return [...totals.values()]
}
