/**
 * Builds the August 2026 Section 1 + Section 2 calculation workbook for the 46
 * corporate outlets. Self-contained: every column mapping is stated here, so the
 * workbook can be regenerated and audited without reading the other scripts.
 *
 *   node scripts/build_section12_workbook.cjs
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'Section1-Section2-Aug2026.xlsx');

/* ----------------------------- outlet master ----------------------------- */

const mapContent = fs.readFileSync(path.join(ROOT, 'src/data/outletNameMap.ts'), 'utf8');
const corporate = [];
const aliasMap = new Map();

const mapBody = mapContent.slice(
  mapContent.indexOf('export const OUTLET_NAME_MAP'),
  mapContent.indexOf('export const NON_HQ_SOURCE_NAMES')
);
const blocks = mapBody.split(/code:\s*'([^']+)'/g);
for (let i = 1; i < blocks.length; i += 2) {
  const code = blocks[i];
  const block = blocks[i + 1];
  const name = (block.match(/name:\s*'([^']+)'/) || [])[1] || code;
  corporate.push({ code, name });
  for (const src of ['pos', 'grab', 'foodpanda', 'shopee', 'apps']) {
    const m = block.match(new RegExp(src + ":\\s*\\[([^\\]]+)\\]"));
    if (!m) continue;
    // Extract quoted literals rather than splitting on "," — two aliases
    // legitimately contain a comma ("...Square, Penang", "...Connaught, Cheras").
    for (const mm of m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
      aliasMap.set(`${src}:${mm[1].replace(/\\'/g, "'").trim().toLowerCase()}`, code);
    }
  }
}
const nameOf = Object.fromEntries(corporate.map(o => [o.code, o.name]));

const normalize = s => String(s || '').trim().toLowerCase()
  .replace(/^\d+[a-z]*-/i, '')
  .replace(/^us\s+pizza\b\s*[-–—(]?\s*/i, '')
  .replace(/[’']/g, '').replace(/[().,]/g, '').replace(/\s+/g, ' ').trim();

function matchOutlet(source, raw) {
  if (!raw) return null;
  const direct = `${source}:${String(raw).trim().toLowerCase()}`;
  if (aliasMap.has(direct)) return aliasMap.get(direct);
  const clean = normalize(raw);
  for (const [k, code] of aliasMap) {
    if (k.startsWith(`${source}:`) && normalize(k.slice(source.length + 1)) === clean) return code;
  }
  for (const o of corporate) if (normalize(o.name) === clean) return o.code;
  return null;
}

const bucket = (store, code, fields) => {
  if (!store[code]) store[code] = Object.fromEntries(fields.map(f => [f, 0]));
  return store[code];
};
const sumRows = (store, fields) => {
  const t = Object.fromEntries(fields.map(f => [f, 0]));
  for (const o of Object.values(store)) for (const f of fields) t[f] += o[f];
  return t;
};

/* --------------------------------- POS ----------------------------------- */
/* Sales Details Report, item grain. Column indices on the header row:
   2 Gross Amount Excl. | 3 Discount | 4 Net Sales | 5 Tax | 6 Charge
   7 Gross Sales (All Incl.) | 8 Net Sales (With Charges)
   10 Inventory Cost | 11 Std. Cost | 14 Gross Profit | 16 Gross Profit (Actual) */

const POS_FIELDS = ['gross', 'discount', 'net', 'tax', 'charge', 'collected', 'invCost', 'stdCost', 'lines'];
const pos = {};
const posDir = path.join(ROOT, 'datasource/POS SALES');
for (const file of fs.readdirSync(posDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'))) {
  const wb = XLSX.readFile(path.join(posDir, file));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  let code = null;
  for (const row of rows) {
    if (!row || !row.length) continue;
    const c0 = row[0];
    if ((c0 === null || c0 === undefined || c0 === '') && row[1]) {
      if (!code) continue;
      const o = bucket(pos, code, POS_FIELDS);
      o.gross += Number(row[2] || 0);
      o.discount += Number(row[3] || 0);
      o.net += Number(row[4] || 0);
      o.tax += Number(row[5] || 0);
      o.charge += Number(row[6] || 0);
      o.collected += Number(row[7] || 0);
      o.invCost += Number(row[10] || 0);
      o.stdCost += Number(row[11] || 0);
      o.lines += 1;
      continue;
    }
    if (typeof c0 === 'string' && /^\d+[A-Za-z]*-/.test(c0.trim())) code = matchOutlet('pos', c0.trim());
  }
}
const posTotal = sumRows(pos, POS_FIELDS);

/* --------------------------------- GRAB ---------------------------------- */
/* Category=Payment and Dine Out Discount rows carry the order economics;
   Advertisement rows carry CPC ad spend; Adjustment rows are credits/debits.
   Every category contributes to the payout column ("Total").
   Commission = Order commission + Step-up commission + both GrabKitchen lines.
   Platform-fee columns (Restaurant Packaging Charge, Delivery Charge (Merchant
   Delivery), GrabExpress Delivery Service Fee) are present but 0.00 for every
   row in this export — verified, not assumed.
   Rows with no Category are cancelled orders and all carry Total = 0.00. */

const GRAB_FIELDS = ['gross', 'discount', 'net', 'commission', 'stepUp', 'successFee', 'ads', 'platformFee', 'feeTax', 'adjustments', 'refunds', 'settlement', 'orders'];
const grab = {};
const grabRows = (() => {
  const wb = XLSX.readFile(path.join(ROOT, 'datasource/GRAB Aug sales.xlsx'));
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
})();
for (const r of grabRows) {
  const code = matchOutlet('grab', r['Store Name']);
  if (!code) continue;
  const o = bucket(grab, code, GRAB_FIELDS);
  const cat = r['Category'];
  const total = Number(r['Total'] || 0);
  const feeTax = Math.abs(Number(r['Tax on GrabFood/GrabMart commission, adjustments, ads'] || 0));
  if (cat === 'Payment' || cat === 'Dine Out Discount') {
    o.orders += 1;
    o.gross += Number(r['Amount'] || 0);
    o.discount += Math.abs(Number(r['Discount (Merchant-Funded)'] || 0))
      + Math.abs(Number(r['Delivery Fee Discount (Merchant-Funded)'] || 0));
    o.net += Number(r['Net Sales'] || 0);
    o.commission += Math.abs(Number(r['Order commission'] || 0))
      + Math.abs(Number(r['GrabKitchen Commission'] || 0))
      + Math.abs(Number(r['GrabKitchen Other Commission'] || 0));
    o.stepUp += Math.abs(Number(r['Step-up commission'] || 0));
    o.successFee += Math.abs(Number(r['Marketing success fee'] || 0));
    o.platformFee += Math.abs(Number(r['Restaurant Packaging Charge'] || 0))
      + Math.abs(Number(r['Delivery Charge (Merchant Delivery)'] || 0))
      + Math.abs(Number(r['GrabExpress Delivery Service Fee'] || 0));
    o.refunds += Math.abs(Number(r['Customer refund Item'] || 0))
      + Math.abs(Number(r['Withholding Tax'] || 0));
    o.feeTax += feeTax;
    o.settlement += total;
  } else if (cat === 'Advertisement') {
    o.ads += Math.abs(Number(r['Amount'] || 0));
    o.feeTax += feeTax;
    o.settlement += total;
  } else if (cat === 'Adjustment') {
    o.adjustments += Number(r['Amount'] || 0);
    o.feeTax += feeTax;
    o.settlement += total;
  }
}
const grabTotal = sumRows(grab, GRAB_FIELDS);

/* ------------------------------ FOODPANDA -------------------------------- */
/* One invoice workbook per outlet-day; order detail lives on "Appendix A".
   Merchant discount = Discount + Voucher + Pandabox voucher, all vendor-funded. */

const FP_FIELDS = ['gross', 'discount', 'voucher', 'pandabox', 'commission', 'ads', 'platformFee', 'feeTax', 'payout', 'orders'];
const fp = {};
const fpDir = path.join(ROOT, 'datasource/FOODPANDA');
const fpXlsx = fs.readdirSync(fpDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
for (const file of fpXlsx) {
  const wb = XLSX.readFile(path.join(fpDir, file));
  const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('appendix a')) || wb.SheetNames[0];
  if (!wb.Sheets[sheetName]) continue;
  for (const r of XLSX.utils.sheet_to_json(wb.Sheets[sheetName])) {
    const code = matchOutlet('foodpanda', r['Outlet Name']);
    if (!code) continue;
    const o = bucket(fp, code, FP_FIELDS);
    o.orders += 1;
    o.gross += Number(r['Products Value Paid By Customer'] || 0);
    o.discount += Number(r['Discount Paid By Vendor'] || 0);
    o.voucher += Number(r['Voucher Paid By Vendor'] || 0);
    o.pandabox += Number(r['Pandabox Voucher Paid By Vendor'] || 0);
    o.commission += Number(r['foodpanda Commission'] || 0);
    o.ads += Number(r['Customer Targeting Fee'] || 0) + Number(r['Pandabox Fee Paid By Vendor'] || 0);
    o.platformFee += Number(r['Waiting Time Fee'] || 0);
    o.feeTax += Number(r['SST on foodpanda commission'] || 0);
    o.payout += Number(r['Payable Amount'] || 0);
  }
}
const fpTotal = sumRows(fp, FP_FIELDS);

/* -------------------------------- SHOPEE --------------------------------- */
/* Completed orders only. The order export shows no commission line — Earnings
   equals Transaction Amount; real commission sits on the remittance statement. */

const SHOPEE_FIELDS = ['gross', 'itemDisc', 'flashDisc', 'prepaid', 'platFlash', 'platVoucher', 'transaction', 'earnings', 'orders'];
const shopee = {};
{
  const wb = XLSX.readFile(path.join(ROOT, 'datasource/SHOPEE/Shopee Aug Sales.xlsx'));
  for (const r of XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])) {
    if (r['Order Status'] !== 'Completed') continue;
    const code = matchOutlet('shopee', r['Store Name']);
    if (!code) continue;
    const o = bucket(shopee, code, SHOPEE_FIELDS);
    o.orders += 1;
    o.gross += Number(r['Food original price'] || 0);
    o.itemDisc += Number(r['Item discounts'] || 0);
    o.flashDisc += Number(r['Flash sale discount'] || 0);
    o.prepaid += Number(r['Merchant Prepaid Subsidy'] || 0);
    o.platFlash += Number(r['Platform Flash Sale Subsidy'] || 0);
    o.platVoucher += Number(r['Food Voucher Subsidy'] || 0);
    o.transaction += Number(r['Transaction Amount'] || 0);
    o.earnings += Number(r['Earnings'] || 0);
  }
}
const shopeeTotal = sumRows(shopee, SHOPEE_FIELDS);

/* --------------------------------- APPS ---------------------------------- */
/* Completed + Paid only. Discount is the plug: (Subtotal + Tax + Delivery) −
   Grand Total. MDR is a 1.5% ASSUMPTION — no gateway statement in datasource. */

const APPS_MDR_RATE = 0.015;
const APPS_FIELDS = ['gross', 'delivery', 'tax', 'discount', 'grandTotal', 'mdr', 'orders'];
const apps = {};
{
  const wb = XLSX.readFile(path.join(ROOT, 'datasource/APPS AUG ORDER LIST.xlsx'));
  for (const r of XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])) {
    if (r['Status'] !== 'Completed' || r['Payment Status'] !== 'Paid') continue;
    const code = matchOutlet('apps', r['Outlet Name']);
    if (!code) continue;
    const o = bucket(apps, code, APPS_FIELDS);
    const sub = Number(r['Subtotal (RM)'] || 0);
    const del = Number(r['Delivery Fee (RM)'] || 0);
    const tax = Number(r['Tax (RM)'] || 0);
    const grand = Number(r['Grand Total (RM)'] || 0);
    const disc = (sub + tax + del) - grand;
    o.orders += 1;
    o.gross += sub;
    o.delivery += del;
    o.tax += tax;
    if (disc > 0.001) o.discount += disc;
    o.grandTotal += grand;
    o.mdr += grand * APPS_MDR_RATE;
  }
}
const appsTotal = sumRows(apps, APPS_FIELDS);

/* ------------------------------ derivations ------------------------------ */

const myPos = sumRows(Object.fromEntries(Object.entries(pos).filter(([c]) => c.startsWith('MY-'))), POS_FIELDS);
const sbPos = sumRows(Object.fromEntries(Object.entries(pos).filter(([c]) => c.startsWith('SB-'))), POS_FIELDS);

const fpDiscount = fpTotal.discount + fpTotal.voucher + fpTotal.pandabox;
const shopeeDiscount = shopeeTotal.itemDisc + shopeeTotal.flashDisc + shopeeTotal.prepaid;
const shopeeMarketing = shopeeTotal.platFlash + shopeeTotal.platVoucher;
const grabMarketing = grabTotal.ads + grabTotal.successFee;
const grabCommission = grabTotal.commission + grabTotal.stepUp;

const grabFees = grabCommission + grabMarketing + grabTotal.platformFee + grabTotal.feeTax;
const fpFees = fpTotal.commission + fpTotal.ads + fpTotal.platformFee + fpTotal.feeTax;
const totalCommission = grabCommission + fpTotal.commission;
const totalAds = grabMarketing + fpTotal.ads;
const totalPlatformFees = grabTotal.platformFee + fpTotal.platformFee;
const totalFeeTax = grabTotal.feeTax + fpTotal.feeTax;
const totalFees = grabFees + fpFees + appsTotal.mdr;

/* -------------------------------- workbook -------------------------------- */

const MONEY = '#,##0.00';
const PCT = '0.00"%"';
const wb = XLSX.utils.book_new();

function addSheet(name, aoa, opts = {}) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const range = XLSX.utils.decode_range(ws['!ref']);
  const pct = new Set((opts.pctCells || []).map(([r, c]) => `${r},${c}`));
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.t === 'n') cell.z = pct.has(`${R},${C}`) ? PCT : MONEY;
    }
  }
  ws['!cols'] = opts.cols || [{ wch: 38 }, ...Array.from({ length: range.e.c }, () => ({ wch: 16 }))];
  XLSX.utils.book_append_sheet(wb, ws, name);
}

/* README */
addSheet('README', [
  ['US Pizza Malaysia — Section 1 & Section 2 calculation, August 2026'],
  [],
  ['Scope', '46 HQ-owned corporate outlets per src/data/outletNameMap.ts. Franchise and sister-brand rows excluded.'],
  ['Period', 'August 2026 (01/08/2026 – 31/08/2026)'],
  ['Generated', new Date().toISOString().slice(0, 10)],
  ['Script', 'scripts/build_section12_workbook.cjs (regenerate with: node scripts/build_section12_workbook.cjs)'],
  [],
  ['Sources'],
  ['POS', 'datasource/POS SALES/Sales Details Report 04-Sep-2026_*.xlsx (5 files, item grain)'],
  ['Grab', 'datasource/GRAB Aug sales.xlsx'],
  ['Foodpanda', `datasource/FOODPANDA/*.xlsx (${fpXlsx.length} invoice workbooks, "Appendix A" order detail)`],
  ['Shopee', 'datasource/SHOPEE/Shopee Aug Sales.xlsx (Completed orders only)'],
  ['Apps', 'datasource/APPS AUG ORDER LIST.xlsx (Completed + Paid only)'],
  [],
  ['Method — the one rule that governs every total'],
  ['', 'POS is the all-channel record of record: it already contains the platform orders.'],
  ['', 'Grab / Foodpanda / Shopee / Apps are settlement statements for those same orders.'],
  ['', 'They are therefore NOT added to the POS total. Section 1 totals = POS. Platform'],
  ['', 'figures drive Section 2 fees and the per-platform settlement derivation.'],
  [],
  ['Known gaps — do not treat as zero without Finance confirmation'],
  ['Purchases / GP / margin', 'NOT CALCULABLE. No GRN/COGS file exists in datasource/. POS Inventory Cost and Std. Cost are 0.00 on all ' + posTotal.lines.toLocaleString() + ' item lines, so the export GP columns just echo net sales.'],
  ['Shopee commission', 'Order export has no commission line (Earnings = Transaction Amount). Real commission is on the remittance statement, which is not in datasource/.'],
  ['Apps payment gateway', `MDR shown is a ${(APPS_MDR_RATE * 100).toFixed(2)}% ASSUMPTION on grand total. No gateway statement in datasource/.`],
  ['Grab platform fees', 'Restaurant Packaging Charge, Delivery Charge (Merchant Delivery) and GrabExpress Delivery Service Fee are all 0.00 across every row — verified zero, not missing.'],
  ['Outlet coverage', 'See the Coverage sheet. An outlet absent from a platform export may be genuinely zero-order or a missing alias.'],
], { cols: [{ wch: 30 }, { wch: 110 }] });

/* S1 — sales basis */
addSheet('S1 Sales Basis', [
  ['Section 1 — Sales basis (POS, all channels, 46 corporate outlets)'],
  [],
  ['Line', 'All (46)', 'MY US Pizza', 'Sabah'],
  ['Gross sales (pre-discount, pre-tax)', posTotal.gross, myPos.gross, sbPos.gross],
  ['− Discount', posTotal.discount, myPos.discount, sbPos.discount],
  ['= Net sales', posTotal.net, myPos.net, sbPos.net],
  ['+ Service charge', posTotal.charge, myPos.charge, sbPos.charge],
  ['+ SST (6%)', posTotal.tax, myPos.tax, sbPos.tax],
  ['= Collected sales', posTotal.collected, myPos.collected, sbPos.collected],
  [],
  ['Outlets with POS activity', Object.keys(pos).length, Object.keys(pos).filter(c => c.startsWith('MY-')).length, Object.keys(pos).filter(c => c.startsWith('SB-')).length],
  ['POS item lines read', posTotal.lines, '', ''],
  [],
  ['Purchases / gross profit / gross margin'],
  ['Total purchases', 'NO DATA', '', 'No GRN/COGS source in datasource/'],
  ['Gross profit', 'NO DATA', '', 'Requires purchases'],
  ['Gross margin', 'NO DATA', '', 'Requires purchases'],
  ['POS Inventory Cost (all lines)', posTotal.invCost, '', 'Column is empty in the export'],
  ['POS Std. Cost (all lines)', posTotal.stdCost, '', 'Column is empty in the export'],
]);

/* S1 — platform derivation */
addSheet('S1 Platform Derivation', [
  ['Section 1 — Per-platform settlement derivation'],
  ['Platform rows are settlement views of orders already inside the POS total — not additive to it.'],
  [],
  ['Platform', 'Gross sales', 'Discount', 'Net sales', 'Commission', 'Ads / marketing', 'Net settlement', 'Outlets', 'Orders / rows'],
  ['POS', posTotal.gross, posTotal.discount, posTotal.net, 0, 0, posTotal.collected, Object.keys(pos).length, posTotal.lines],
  ['Grab', grabTotal.gross, grabTotal.discount, grabTotal.net, grabCommission, grabMarketing, grabTotal.settlement, Object.keys(grab).length, grabTotal.orders],
  ['Foodpanda', fpTotal.gross, fpDiscount, fpTotal.gross - fpDiscount, fpTotal.commission, fpTotal.ads, fpTotal.payout, Object.keys(fp).length, fpTotal.orders],
  ['Shopee', shopeeTotal.gross, shopeeDiscount, shopeeTotal.gross - shopeeDiscount, 0, shopeeMarketing, shopeeTotal.earnings, Object.keys(shopee).length, shopeeTotal.orders],
  ['Apps', appsTotal.gross, appsTotal.discount, appsTotal.gross - appsTotal.discount, 0, 0, appsTotal.grandTotal, Object.keys(apps).length, appsTotal.orders],
  [],
  ['Notes'],
  ['POS', 'Net settlement = collected sales. Own point of sale, no third-party deduction.'],
  ['Shopee', 'Commission 0.00 because the order export carries none — see README.'],
  ['Apps', 'Net settlement is customer grand total (includes delivery fee and tax), not a platform payout.'],
], { cols: [{ wch: 14 }, ...Array.from({ length: 8 }, () => ({ wch: 16 }))] });

/* S2 — fee matrix */
addSheet('S2 Fee Matrix', [
  ['Section 2 — Commission & fees, August 2026, 46 corporate outlets'],
  [],
  ['KPI', 'Value'],
  ['Commission / month', totalCommission],
  ['Advertising spend / month', totalAds],
  ['Total fees / month', totalFees],
  [],
  ['Fee category', 'Grab', 'Foodpanda', 'Shopee', 'Apps', 'POS', 'Total'],
  ['1. Commission', grabCommission, fpTotal.commission, 0, 0, 0, totalCommission],
  ['2. Advertising', grabMarketing, fpTotal.ads, 0, 0, 0, totalAds],
  ['3. Platform fees', grabTotal.platformFee, fpTotal.platformFee, 0, 0, 0, totalPlatformFees],
  ['4. Payment gateway (MDR)', 0, 0, 0, appsTotal.mdr, 0, appsTotal.mdr],
  ['5. SST on fees', grabTotal.feeTax, fpTotal.feeTax, 0, 0, 0, totalFeeTax],
  ['Column total', grabFees, fpFees, 0, appsTotal.mdr, 0, totalFees],
  [],
  ['Effective commission rate (% of net sales)', grabTotal.net ? (grabCommission / grabTotal.net) * 100 : 0, (fpTotal.gross - fpDiscount) ? (fpTotal.commission / (fpTotal.gross - fpDiscount)) * 100 : 0, '', '', '', ''],
  [],
  ['Commission breakdown'],
  ['Grab order commission', grabTotal.commission],
  ['Grab step-up commission', grabTotal.stepUp],
  ['Foodpanda commission', fpTotal.commission],
  [],
  ['Advertising breakdown'],
  ['Grab CPC ads', grabTotal.ads],
  ['Grab marketing success fee', grabTotal.successFee],
  ['Foodpanda targeting + pandabox fee', fpTotal.ads],
  [],
  ['Credits / refunds (not fees — shown for completeness)'],
  ['Grab adjustments (net credit to merchant)', grabTotal.adjustments],
  ['Grab customer refunds + withholding tax', grabTotal.refunds],
  [],
  ['Discount breakdown (merchant-funded, for reference — not a fee)'],
  ['Shopee item discounts', shopeeTotal.itemDisc],
  ['Shopee flash sale discounts', shopeeTotal.flashDisc],
  ['Shopee merchant prepaid subsidy', shopeeTotal.prepaid],
  ['Shopee platform-funded subsidies (flash + voucher)', shopeeMarketing],
  ['Foodpanda discount paid by vendor', fpTotal.discount],
  ['Foodpanda voucher paid by vendor', fpTotal.voucher],
  ['Foodpanda pandabox voucher paid by vendor', fpTotal.pandabox],
], { cols: [{ wch: 44 }, ...Array.from({ length: 6 }, () => ({ wch: 16 }))], pctCells: [[15, 1], [15, 2]] });

/* S2 — reconciliation */
const recon = (label, net, settlement, reported, note) => [label, net, settlement, net - settlement, reported, reported - (net - settlement), note];
addSheet('S2 Reconciliation', [
  ['Section 2 — Settlement reconciliation'],
  ['Deducted = net sales − net settlement. Gap = fees reported − deducted.'],
  [],
  ['Platform', 'Net sales', 'Net settlement', 'Deducted per settlement', 'Fees reported', 'Gap', 'Note'],
  recon('Grab', grabTotal.net, grabTotal.settlement, grabFees, 'Ads likely billed outside the settlement run'),
  recon('Foodpanda', fpTotal.gross - fpDiscount, fpTotal.payout, fpFees, 'Reconciles to within RM 41 — all fee lines accounted for'),
  recon('Shopee', shopeeTotal.gross - shopeeDiscount, shopeeTotal.earnings, 0, 'Whole gap is the missing remittance statement'),
  ['Apps', appsTotal.gross - appsTotal.discount, appsTotal.grandTotal, 'n/a', appsTotal.mdr, 'n/a', 'Payout column is customer grand total (incl. delivery + tax), not comparable'],
  [],
  ['All three gaps need Finance confirmation before publishing.'],
], { cols: [{ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 60 }] });

/* per-outlet sheets */
const outletRows = (store, fields, header, rowFor) => {
  const codes = corporate.map(o => o.code).filter(c => store[c]);
  const body = codes.map(c => [c, nameOf[c], ...rowFor(store[c])]);
  const totals = sumRows(store, fields);
  return [header, ...body, [], ['TOTAL', `${codes.length} outlets`, ...rowFor(totals)]];
};

addSheet('POS by Outlet', outletRows(pos, POS_FIELDS,
  ['Code', 'Outlet', 'Gross sales', 'Discount', 'Net sales', 'Service charge', 'SST', 'Collected sales', 'Item lines'],
  o => [o.gross, o.discount, o.net, o.charge, o.tax, o.collected, o.lines]),
  { cols: [{ wch: 9 }, { wch: 26 }, ...Array.from({ length: 7 }, () => ({ wch: 15 }))] });

addSheet('Grab by Outlet', outletRows(grab, GRAB_FIELDS,
  ['Code', 'Outlet', 'Gross', 'Discount', 'Net sales', 'Order commission', 'Step-up commission', 'CPC ads', 'Success fee', 'Platform fees', 'SST on fees', 'Adjustments', 'Net settlement', 'Orders'],
  o => [o.gross, o.discount, o.net, o.commission, o.stepUp, o.ads, o.successFee, o.platformFee, o.feeTax, o.adjustments, o.settlement, o.orders]),
  { cols: [{ wch: 9 }, { wch: 26 }, ...Array.from({ length: 12 }, () => ({ wch: 15 }))] });

addSheet('Foodpanda by Outlet', outletRows(fp, FP_FIELDS,
  ['Code', 'Outlet', 'Gross', 'Discount', 'Voucher', 'Pandabox voucher', 'Commission', 'Ads', 'Platform fees', 'SST on commission', 'Payout', 'Orders'],
  o => [o.gross, o.discount, o.voucher, o.pandabox, o.commission, o.ads, o.platformFee, o.feeTax, o.payout, o.orders]),
  { cols: [{ wch: 9 }, { wch: 26 }, ...Array.from({ length: 10 }, () => ({ wch: 15 }))] });

addSheet('Shopee by Outlet', outletRows(shopee, SHOPEE_FIELDS,
  ['Code', 'Outlet', 'Gross', 'Item discount', 'Flash discount', 'Prepaid subsidy', 'Platform flash', 'Platform voucher', 'Transaction amt', 'Earnings', 'Orders'],
  o => [o.gross, o.itemDisc, o.flashDisc, o.prepaid, o.platFlash, o.platVoucher, o.transaction, o.earnings, o.orders]),
  { cols: [{ wch: 9 }, { wch: 26 }, ...Array.from({ length: 9 }, () => ({ wch: 15 }))] });

addSheet('Apps by Outlet', outletRows(apps, APPS_FIELDS,
  ['Code', 'Outlet', 'Subtotal', 'Delivery fee', 'Tax', 'Discount', 'Grand total', 'MDR @1.5% (assumed)', 'Orders'],
  o => [o.gross, o.delivery, o.tax, o.discount, o.grandTotal, o.mdr, o.orders]),
  { cols: [{ wch: 9 }, { wch: 26 }, ...Array.from({ length: 7 }, () => ({ wch: 15 }))] });

/* coverage */
addSheet('Coverage', [
  ['Outlet coverage by source — blank means the outlet does not appear in that export'],
  ['An absence is either a genuine zero-order month or a missing alias. Confirm before treating as zero.'],
  [],
  ['Code', 'Outlet', 'POS', 'Grab', 'Foodpanda', 'Shopee', 'Apps', 'Sources present'],
  ...corporate.map(o => {
    const flags = [pos, grab, fp, shopee, apps].map(s => (s[o.code] ? 'yes' : ''));
    return [o.code, o.name, ...flags, flags.filter(Boolean).length];
  }),
  [],
  ['TOTAL', `${corporate.length} outlets`, Object.keys(pos).length, Object.keys(grab).length, Object.keys(fp).length, Object.keys(shopee).length, Object.keys(apps).length, ''],
], { cols: [{ wch: 9 }, { wch: 26 }, ...Array.from({ length: 6 }, () => ({ wch: 12 }))] });

XLSX.writeFile(wb, OUT);

console.log('Wrote', OUT);
console.log('\nSection 1 (POS, 46 corporate outlets)');
console.log('  gross     ', posTotal.gross.toFixed(2));
console.log('  discount  ', posTotal.discount.toFixed(2));
console.log('  net       ', posTotal.net.toFixed(2));
console.log('  charge    ', posTotal.charge.toFixed(2));
console.log('  tax       ', posTotal.tax.toFixed(2));
console.log('  collected ', posTotal.collected.toFixed(2));
console.log('  outlets   ', Object.keys(pos).length, '| MY', Object.keys(pos).filter(c => c.startsWith('MY-')).length, '| SB', Object.keys(pos).filter(c => c.startsWith('SB-')).length);
console.log('\nSection 2');
console.log('  commission', totalCommission.toFixed(2));
console.log('  ads       ', totalAds.toFixed(2));
console.log('  total fees', totalFees.toFixed(2));
console.log('\nPlatform settlements');
console.log('  grab      ', grabTotal.gross.toFixed(2), grabTotal.discount.toFixed(2), grabTotal.net.toFixed(2), grabTotal.commission.toFixed(2), grabMarketing.toFixed(2), grabTotal.settlement.toFixed(2));
console.log('  foodpanda ', fpTotal.gross.toFixed(2), fpDiscount.toFixed(2), fpTotal.commission.toFixed(2), fpTotal.payout.toFixed(2));
console.log('  shopee    ', shopeeTotal.gross.toFixed(2), shopeeDiscount.toFixed(2), shopeeMarketing.toFixed(2), shopeeTotal.earnings.toFixed(2));
console.log('  apps      ', appsTotal.gross.toFixed(2), appsTotal.discount.toFixed(2), appsTotal.grandTotal.toFixed(2), appsTotal.mdr.toFixed(2));
console.log('  outlets   ', 'grab', Object.keys(grab).length, '| fp', Object.keys(fp).length, '| shopee', Object.keys(shopee).length, '| apps', Object.keys(apps).length);
