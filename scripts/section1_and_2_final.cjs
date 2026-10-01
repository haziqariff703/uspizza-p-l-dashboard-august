/**
 * Section 1 (Overview) + Section 2 (Commission & Fees) — FINAL
 * 46 Corporate Outlets, August 2026
 *
 * Section 1 matrix:
 *   Gross Sales → − Discount → = Net Sales → + Service Charge → + Tax (SST)
 *   → = Collected Sales → − Commission & Fees → = Net Settlement
 *
 * Section 2 matrix:
 *   Commission | Advertising | Platform/Svc fees | Payment Gateway | Adjustments
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ── Build outlet alias map ──
const mapContent = fs.readFileSync(path.resolve(__dirname, '../src/data/outletNameMap.ts'), 'utf8');
const corporateOutlets = [];
const aliasMap = new Map();
const blocks = mapContent.split(/code:\s*'([^']+)'/g);
for (let i = 1; i < blocks.length; i += 2) {
  const code = blocks[i];
  const block = blocks[i + 1];
  const name = (block.match(/name:\s*'([^']+)'/) || [])[1] || code;
  corporateOutlets.push({ code, name });
  ['pos', 'grab', 'foodpanda', 'shopee', 'apps'].forEach(src => {
    const m = block.match(new RegExp(src + ":\\s*\\[([^\\]]+)\\]"));
    if (m) m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).forEach(a =>
      aliasMap.set(`${src}:${a.trim().toLowerCase()}`, code));
  });
}

function normalize(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/^us\s+pizza\b\s*[-–—(]?\s*/i, '')
    .replace(/['']/g, '').replace(/[().,]/g, '').replace(/\s+/g, ' ').trim();
}
function matchOutlet(source, storeName) {
  if (!storeName) return null;
  const key = `${source}:${storeName.trim().toLowerCase()}`;
  if (aliasMap.has(key)) return aliasMap.get(key);
  const clean = normalize(storeName);
  for (const [k, code] of aliasMap.entries()) {
    if (k.startsWith(`${source}:`) && normalize(k.slice(source.length + 1)) === clean) return code;
  }
  for (const o of corporateOutlets) { if (normalize(o.name) === clean) return o.code; }
  return null;
}

// ═══════════════════════════ GRAB ═══════════════════════════
const grabRows = XLSX.utils.sheet_to_json(XLSX.readFile(path.resolve(__dirname, '../datasource/GRAB Aug sales.xlsx')).Sheets['Sheet1'] || Object.values(XLSX.readFile(path.resolve(__dirname, '../datasource/GRAB Aug sales.xlsx')).Sheets)[0]);
const G = { outlets: new Set(), gross: 0, disc: 0, net: 0, tax: 0, sc: 0, collected: 0, commission: 0, adsCPC: 0, adsSuccessFee: 0, platformFees: 0, gateway: 0, adj: 0, taxOnFees: 0, payout: 0 };
for (const r of grabRows) {
  const code = matchOutlet('grab', r['Store Name']);
  if (!code) continue;
  G.outlets.add(code);
  if (r.Category === 'Payment') {
    G.gross += Number(r['Amount'] || 0);
    G.disc += Math.abs(Number(r['Discount (Merchant-Funded)'] || 0));
    G.net += Number(r['Net Sales'] || 0);
    G.tax += Number(r['Tax on Order Value'] || 0);
    G.commission += Math.abs(Number(r['Order commission'] || 0));
    G.adsSuccessFee += Math.abs(Number(r['Marketing success fee'] || 0));
    G.platformFees += Number(r['Restaurant Packaging Charge'] || 0) + Number(r['GrabExpress Delivery Service Fee'] || 0);
    G.payout += Number(r['Total'] || 0);
    G.taxOnFees += Math.abs(Number(r['Tax on GrabFood/GrabMart commission, adjustments, ads'] || 0));
  } else if (r.Category === 'Advertisement') {
    G.adsCPC += Math.abs(Number(r['Amount'] || 0));
    G.taxOnFees += Math.abs(Number(r['Tax on GrabFood/GrabMart commission, adjustments, ads'] || 0));
    G.payout += Number(r['Total'] || 0);
  } else if (r.Category === 'Adjustment') {
    G.adj += Number(r['Total'] || 0);
    G.payout += Number(r['Total'] || 0);
  }
}
G.collected = G.net + G.tax;
G.ads = G.adsCPC + G.adsSuccessFee;
G.totalFees = G.commission + G.ads + G.platformFees + G.gateway - G.adj;
G.settlement = G.payout;

// ═══════════════════════════ FOODPANDA ═══════════════════════════
const fpDir = path.resolve(__dirname, '../datasource/FOODPANDA');
const fpFiles = fs.readdirSync(fpDir).filter(f => f.endsWith('.xlsx'));
const F = { outlets: new Set(), gross: 0, disc: 0, net: 0, tax: 0, sc: 0, collected: 0, commission: 0, ads: 0, platformFees: 0, gateway: 0, adj: 0, totalFees: 0, settlement: 0 };
for (const file of fpFiles) {
  const wb = XLSX.readFile(path.join(fpDir, file));
  const sheet = wb.Sheets[wb.SheetNames.find(n => n.toLowerCase().includes('appendix a')) || wb.SheetNames[0]];
  if (!sheet) continue;
  for (const r of XLSX.utils.sheet_to_json(sheet)) {
    const code = matchOutlet('foodpanda', r['Outlet Name']);
    if (!code) continue;
    F.outlets.add(code);
    F.gross += Number(r['Products Value Paid By Customer'] || 0);
    F.disc += Number(r['Discount Paid By Vendor'] || 0) + Number(r['Voucher Paid By Vendor'] || 0) + Number(r['Pandabox Voucher Paid By Vendor'] || 0);
    F.commission += Number(r['foodpanda Commission'] || 0);
    F.ads += Number(r['Customer Targeting Fee'] || 0) + Number(r['Pandabox Fee Paid By Vendor'] || 0);
    F.settlement += Number(r['Payable Amount'] || 0);
    F.tax += Number(r['SST on Commission'] || 0);
  }
}
F.net = F.gross - F.disc;
F.collected = F.gross; // FP "Products Value Paid By Customer" is what the customer paid (incl SST)
F.totalFees = F.commission + F.ads + F.platformFees + F.gateway - F.adj;

// ═══════════════════════════ SHOPEE ═══════════════════════════
const shopeeRows = XLSX.utils.sheet_to_json(XLSX.readFile(path.resolve(__dirname, '../datasource/SHOPEE/Shopee Aug Sales.xlsx')).Sheets[XLSX.readFile(path.resolve(__dirname, '../datasource/SHOPEE/Shopee Aug Sales.xlsx')).SheetNames[0]]);
const S = { outlets: new Set(), gross: 0, disc: 0, net: 0, tax: 0, sc: 0, collected: 0, commission: 0, ads: 0, platformFees: 0, gateway: 0, adj: 0, totalFees: 0, settlement: 0, flashSale: 0, foodVoucher: 0 };
for (const r of shopeeRows) {
  if (r['Order Status'] !== 'Completed') continue;
  const code = matchOutlet('shopee', r['Store Name']);
  if (!code) continue;
  S.outlets.add(code);
  S.gross += Number(r['Food original price'] || 0);
  S.disc += Number(r['Item discounts'] || 0) + Number(r['Flash sale discount'] || 0) + Number(r['Merchant Prepaid Subsidy'] || 0);
  S.flashSale += Number(r['Platform Flash Sale Subsidy'] || 0);
  S.foodVoucher += Number(r['Food Voucher Subsidy'] || 0);
  S.settlement += Number(r['Transaction Amount'] || 0); // Earnings = Transaction Amount
}
S.net = S.gross - S.disc;
S.tax = S.settlement / 1.06 * 0.06; // SST 6% inside
S.collected = S.settlement;
S.ads = S.flashSale + S.foodVoucher;
S.totalFees = S.commission + S.ads + S.platformFees + S.gateway - S.adj;

// ═══════════════════════════ APPS ═══════════════════════════
const appsRows = XLSX.utils.sheet_to_json(XLSX.readFile(path.resolve(__dirname, '../datasource/APPS AUG ORDER LIST.xlsx')).Sheets[XLSX.readFile(path.resolve(__dirname, '../datasource/APPS AUG ORDER LIST.xlsx')).SheetNames[0]]);
const A = { outlets: new Set(), gross: 0, disc: 0, net: 0, tax: 0, sc: 0, collected: 0, commission: 0, ads: 0, platformFees: 0, gateway: 0, adj: 0, totalFees: 0, settlement: 0, delivery: 0, grandTotal: 0 };
for (const r of appsRows) {
  if (r['Status'] !== 'Completed' || r['Payment Status'] !== 'Paid') continue;
  const code = matchOutlet('apps', r['Outlet Name']);
  if (!code) continue;
  A.outlets.add(code);
  const sub = Number(r['Subtotal (RM)'] || 0);
  const del = Number(r['Delivery Fee (RM)'] || 0);
  const tax = Number(r['Tax (RM)'] || 0);
  const grand = Number(r['Grand Total (RM)'] || 0);
  A.gross += sub;
  A.delivery += del;
  A.tax += tax;
  A.grandTotal += grand;
  A.disc += Math.max(0, (sub + del + tax) - grand);
}
A.net = A.gross - A.disc;
A.collected = A.grandTotal;
A.gateway = A.grandTotal * 0.015;
A.settlement = A.grandTotal - A.gateway;
A.totalFees = A.commission + A.ads + A.platformFees + A.gateway - A.adj;

// ═══════════════════════════ POS ═══════════════════════════
const posDir = path.resolve(__dirname, '../datasource/POS SALES');
const posFiles = fs.readdirSync(posDir).filter(f => f.endsWith('.xlsx'));
const P = { outlets: new Set(), gross: 0, disc: 0, net: 0, tax: 0, sc: 0, collected: 0, commission: 0, ads: 0, platformFees: 0, gateway: 0, adj: 0, totalFees: 0, settlement: 0, netWithCharges: 0 };
for (const file of posFiles) {
  const wb = XLSX.readFile(path.join(posDir, file));
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  let headerIdx = -1;
  for (let i = 0; i < 20; i++) { if (rawRows[i] && rawRows[i][0] === 'Group') { headerIdx = i; break; } }
  if (headerIdx < 0) continue;
  const headers = rawRows[headerIdx];
  const col = {}; headers.forEach((h, i) => col[h] = i);
  let currentOutlet = null;
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || !row.length) continue;
    const first = String(row[0] || '').trim();
    if (first.match(/^\d{3}[A-Z]?-/) && !row[1]) {
      currentOutlet = matchOutlet('pos', first);
      continue;
    }
    if (row[1] && currentOutlet && typeof row[col['Net Sales']] === 'number') {
      P.outlets.add(currentOutlet);
      P.gross += Number(row[col['Gross Amount Excl.']] || 0);
      P.disc += Number(row[col['Discount']] || 0);
      P.net += Number(row[col['Net Sales']] || 0);
      P.tax += Number(row[col['Tax']] || 0);
      P.sc += Number(row[col['Charge']] || 0);
      P.netWithCharges += Number(row[col['Net Sales (With Charges)']] || 0);
    }
  }
}
P.collected = P.net + P.sc + P.tax;
P.settlement = P.collected; // POS goes directly to the business, no platform deduction

// ═══════════════════════════ OUTPUT ═══════════════════════════
const rm = (v) => v === null ? '—' : `RM ${Math.abs(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v) => v === null ? '—' : `${v.toFixed(2)}%`;
const pad = (s, w) => String(s).padStart(w);
const W = 18;

const platforms = [
  { name: 'Grab', d: G },
  { name: 'FoodPanda', d: F },
  { name: 'Shopee', d: S },
  { name: 'Apps', d: A },
  { name: 'POS', d: P },
];

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('  SECTION 1: OVERVIEW — AUGUST 2026 (46 Corporate Outlets)');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

console.log('OUTLETS MATCHED:');
platforms.forEach(p => console.log(`  ${p.name.padEnd(12)} ${p.d.outlets.size} / 46`));

const hdr1 = `${''.padEnd(28)} ${platforms.map(p => pad(p.name, W)).join(' ')}`;
console.log('\n' + hdr1);
console.log('─'.repeat(hdr1.length));

const row1 = (label, pick) => `${label.padEnd(28)} ${platforms.map(p => pad(rm(pick(p.d)), W)).join(' ')}`;

console.log(row1('Gross sales', d => d.gross));
console.log(row1('− Discount', d => d.disc));
console.log(row1('= Net sales', d => d.net));
console.log(row1('+ Service charge', d => d.sc));
console.log(row1('+ Tax (SST)', d => d.tax));
console.log(row1('= Collected sales', d => d.collected));
console.log(row1('− Commission & fees', d => d.totalFees));
console.log('─'.repeat(hdr1.length));
console.log(row1('= Net settlement', d => d.settlement));

// Kept %
const keptRow = `${'  Kept %'.padEnd(28)} ${platforms.map(p => {
  const k = p.d.gross > 0 ? (p.d.settlement / p.d.gross * 100) : null;
  return pad(pct(k), W);
}).join(' ')}`;
console.log(keptRow);

console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
console.log('  SECTION 2: COMMISSION & FEES BREAKDOWN — AUGUST 2026 (46 Corporate Outlets)');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

const hdr2 = `${'Fee Type'.padEnd(28)} ${platforms.map(p => pad(p.name, W)).join(' ')} ${pad('TOTAL', W)}`;
console.log(hdr2);
console.log('─'.repeat(hdr2.length));

const totalComm = platforms.reduce((s, p) => s + p.d.commission, 0);
const totalAds = platforms.reduce((s, p) => s + p.d.ads, 0);
const totalPF = platforms.reduce((s, p) => s + p.d.platformFees, 0);
const totalGW = platforms.reduce((s, p) => s + p.d.gateway, 0);
const totalAdj = platforms.reduce((s, p) => s + p.d.adj, 0);
const totalAll = platforms.reduce((s, p) => s + p.d.totalFees, 0);

const row2 = (label, pick, total) => `${label.padEnd(28)} ${platforms.map(p => pad(rm(pick(p.d)), W)).join(' ')} ${pad(rm(total), W)}`;

console.log(row2('Commission', d => d.commission, totalComm));

// Commission rates
const grabRate = G.net > 0 ? (G.commission / (G.gross - G.disc) * 100) : 0;
const fpRate = F.net > 0 ? (F.commission / F.net * 100) : 0;
const rateValues = { Grab: grabRate, FoodPanda: fpRate, Shopee: null, Apps: 0, POS: null };
const rateRow = `${'  ↳ rate (% net sales)'.padEnd(28)} ${platforms.map(p => {
  const v = rateValues[p.name];
  return pad(v === null ? 'N/A' : pct(v), W);
}).join(' ')} ${pad('—', W)}`;
console.log(rateRow);

console.log(row2('Advertising', d => d.ads, totalAds));
console.log(row2('Platform / Svc fees', d => d.platformFees, totalPF));
console.log(row2('Payment gateway', d => d.gateway, totalGW));

// Adjustments (credits are shown negative)
const adjRow = `${'Adjustments / credits'.padEnd(28)} ${platforms.map(p => {
  const v = p.d.adj;
  return pad(v > 0 ? '− ' + rm(v) : rm(v), W);
}).join(' ')} ${pad(totalAdj > 0 ? '− ' + rm(totalAdj) : rm(totalAdj), W)}`;
console.log(adjRow);

console.log('─'.repeat(hdr2.length));
console.log(row2('TOTAL FEES', d => d.totalFees, totalAll));

console.log('\n───────────────────────────────────────────────────────────────');
console.log('3 KPI SUMMARY CARDS');
console.log('───────────────────────────────────────────────────────────────');
console.log(`  Advertising spend / month:  ${rm(totalAds)}`);
console.log(`  Commission / month:         ${rm(totalComm)}`);
console.log(`  Total fees / month:         ${rm(totalAll)}`);

console.log('\n───────────────────────────────────────────────────────────────');
console.log('FORMULAS');
console.log('───────────────────────────────────────────────────────────────');
console.log('\n── SECTION 1 ──');
console.log(`Gross Sales:       Grab=Amount | FP=Products Value Paid By Customer | Shopee=Food original price | Apps=Subtotal (RM) | POS=Gross Amount Excl.`);
console.log(`Discount:          Grab=|Discount (Merchant-Funded)| | FP=Discount+Voucher Paid By Vendor | Shopee=Item disc+Flash disc+Merchant Prepaid | Apps=(Sub+Del+Tax)−Grand | POS=Discount col`);
console.log(`Net Sales:         Gross − Discount`);
console.log(`Service Charge:    POS=Charge col | Others=RM 0.00`);
console.log(`Tax (SST):         Grab=Tax on Order Value (6%) | FP=SST on Commission (8%) | Shopee=6% inside Transaction Amt | Apps=Tax (RM) | POS=Tax col`);
console.log(`Collected:         Net Sales + Service Charge + Tax`);
console.log(`Commission&Fees:   From Section 2 Total Fees row`);
console.log(`Net Settlement:    Grab=Σ Total col | FP=Σ Payable Amount | Shopee=Σ Transaction Amount | Apps=Grand Total−1.5% MDR | POS=Collected (no deduction)`);

console.log('\n── SECTION 2 ──');
console.log(`Commission:        Grab=Σ|Order commission| (${rm(G.commission)}) | FP=Σ foodpanda Commission (${rm(F.commission)}) | Shopee=RM 0 (remittance) | Apps=RM 0 (in-house) | POS=RM 0`);
console.log(`  Grab Rate:       ${rm(G.commission)} / (${rm(G.gross)} − ${rm(G.disc)}) = ${rm(G.commission)} / ${rm(G.gross - G.disc)} = ${grabRate.toFixed(2)}%`);
console.log(`  FP Rate:         ${rm(F.commission)} / ${rm(F.net)} = ${fpRate.toFixed(2)}%`);
console.log(`Advertising:       Grab CPC Ads=${rm(G.adsCPC)} + Success Fee=${rm(G.adsSuccessFee)} = ${rm(G.ads)} | Shopee Flash=${rm(S.flashSale)} + Voucher=${rm(S.foodVoucher)} = ${rm(S.ads)}`);
console.log(`Platform Fees:     All RM 0.00`);
console.log(`Payment Gateway:   Apps only: 1.50% × ${rm(A.grandTotal)} = ${rm(A.gateway)}`);
console.log(`Adjustments:       Grab=Σ Total where Category='Adjustment' = ${rm(G.adj)} (credit back)`);
console.log(`Total Fees:        Commission + Ads + Platform + Gateway − Adjustments`);
