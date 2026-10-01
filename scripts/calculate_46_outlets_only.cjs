const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const datasourceDir = path.resolve(__dirname, '../datasource');
const outletNameMapPath = path.resolve(__dirname, '../src/data/outletNameMap.ts');

// We will load OUTLET_NAME_MAP from outletNameMap.ts
// Let's create a map of source -> alias (lowercase stripped) -> canonical outlet code
const aliasMap = new Map(); // key: `${source}:${normalizedName}` -> outletCode

// Parse OUTLET_NAME_MAP from TypeScript file
const content = fs.readFileSync(outletNameMapPath, 'utf8');

function normalize(name) {
  return String(name || '').trim().toLowerCase()
    .replace(/^us\s+pizza\b\s*[-–—(]?\s*/i, '')
    .replace(/[’']/g, '').replace(/[().,]/g, '').replace(/\s+/g, ' ').trim();
}

// Let's build the matcher using OUTLET_NAME_MAP
const outlets = [];
const outletBlocks = content.split(/code:\s*'([^']+)'/g);
for (let i = 1; i < outletBlocks.length; i += 2) {
  const code = outletBlocks[i];
  const block = outletBlocks[i + 1];
  const nameMatch = block.match(/name:\s*'([^']+)'/);
  const name = nameMatch ? nameMatch[1] : code;
  
  const outlet = { code, name, sources: {} };
  
  // sources
  const posMatches = block.match(/pos:\s*\[([^\]]+)\]/);
  if (posMatches) outlet.sources.pos = posMatches[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
  
  const grabMatches = block.match(/grab:\s*\[([^\]]+)\]/);
  if (grabMatches) outlet.sources.grab = grabMatches[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
  
  const fpMatches = block.match(/foodpanda:\s*\[([^\]]+)\]/);
  if (fpMatches) outlet.sources.foodpanda = fpMatches[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
  
  const shopeeMatches = block.match(/shopee:\s*\[([^\]]+)\]/);
  if (shopeeMatches) outlet.sources.shopee = shopeeMatches[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
  
  const appsMatches = block.match(/apps:\s*\[([^\]]+)\]/);
  if (appsMatches) outlet.sources.apps = appsMatches[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
  
  outlets.push(outlet);

  // Register in aliasMap
  for (const [src, names] of Object.entries(outlet.sources)) {
    for (const n of names) {
      aliasMap.set(`${src}:${normalize(n)}`, code);
    }
  }
  // Also register canonical name
  ['pos', 'grab', 'foodpanda', 'shopee', 'apps'].forEach(src => {
    aliasMap.set(`${src}:${normalize(name)}`, code);
  });
}

console.log(`Loaded ${outlets.length} canonical 46 corporate outlets.`);

function matchOutlet(source, storeName) {
  if (!storeName) return null;
  const key = `${source}:${normalize(storeName)}`;
  if (aliasMap.has(key)) return aliasMap.get(key);
  
  // Try fallback substring
  const norm = normalize(storeName);
  for (const o of outlets) {
    if (normalize(o.name) === norm) return o.code;
    const srcList = o.sources[source] || [];
    for (const s of srcList) {
      if (normalize(s) === norm) return o.code;
    }
  }
  return null;
}

// 1. SHOPEE 46 OUTLETS
function calcShopee46() {
  const wb = XLSX.readFile(path.join(datasourceDir, 'SHOPEE/Shopee Aug Sales.xlsx'));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  
  let gross = 0;
  let transAmt = 0;
  let earnings = 0;
  let flashSubsidy = 0;
  let voucherSubsidy = 0;
  let count = 0;
  let nonHqGross = 0;
  let nonHqCount = 0;

  for (const r of rows) {
    if (r['Order Status'] !== 'Completed') continue;
    const store = r['Store Name'];
    const matchedCode = matchOutlet('shopee', store);
    const orderGross = Number(r['Food original price'] || 0);
    const orderTrans = Number(r['Transaction Amount'] || 0);
    const orderEarn = Number(r['Earnings'] || 0);

    if (matchedCode) {
      count++;
      gross += orderGross;
      transAmt += orderTrans;
      earnings += orderEarn;
      flashSubsidy += Number(r['Platform Flash Sale Subsidy'] || 0);
      voucherSubsidy += Number(r['Food Voucher Subsidy'] || 0);
    } else {
      nonHqCount++;
      nonHqGross += orderGross;
    }
  }

  const sst = transAmt * (6 / 106);
  const net = transAmt - sst;
  const discounts = gross - net;

  console.log('\n======================================================');
  console.log('--- SHOPEE (46 CORPORATE OUTLETS ONLY) ---');
  console.log(`Matched HQ Completed Orders: ${count} (Excluded Non-HQ: ${nonHqCount} orders, RM ${nonHqGross.toFixed(2)})`);
  console.log(`1. Gross Menu Sales: RM ${gross.toFixed(2)}`);
  console.log(`2. Customer Discounts: RM ${discounts.toFixed(2)}`);
  console.log(`3. Net Sales (Pre-Tax): RM ${net.toFixed(2)}`);
  console.log(`4. Service Charge: RM 0.00`);
  console.log(`5. Tax (SST 6%): RM ${sst.toFixed(2)}`);
  console.log(`6. Collected Sales: RM ${transAmt.toFixed(2)}`);
  console.log(`7. Commission: RM 0.00`);
  console.log(`8. Advertising / Subsidies: RM ${(flashSubsidy + voucherSubsidy).toFixed(2)}`);
  console.log(`9. Platform Fees / Gateway / Adjustments: RM 0.00`);
  console.log(`10. Net Payout (Earnings): RM ${earnings.toFixed(2)}`);
  console.log(`11. % Kept: ${((earnings / gross) * 100).toFixed(2)}%`);
}

// 2. GRAB 46 OUTLETS
function calcGrab46() {
  const wb = XLSX.readFile(path.join(datasourceDir, 'GRAB Aug sales.xlsx'));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  
  let gross = 0;
  let netSales = 0;
  let tax = 0;
  let offer = 0;
  let merchDisc = 0;
  let comm = 0;
  let ads = 0;
  let grabFee = 0;
  let mdr = 0;
  let adjustments = 0;
  let payout = 0;
  let count = 0;
  let nonHqCount = 0;

  for (const r of rows) {
    const store = r['Store Name'];
    const matchedCode = matchOutlet('grab', store);
    const cat = r['Category'];
    const amt = Number(r['Amount'] || 0);
    const total = Number(r['Total'] || 0);

    if (matchedCode) {
      count++;
      if (cat === 'Payment') {
        gross += amt;
        netSales += Number(r['Net Sales'] || 0);
        tax += Number(r['Tax on Order Value'] || 0);
        offer += Number(r['Offer'] || 0);
        merchDisc += Number(r['Discount (Merchant-Funded)'] || 0);
        comm += Number(r['Order commission'] || 0) + Number(r['Delivery Commission'] || 0) + Number(r['Channel Commission'] || 0);
        grabFee += Number(r['Grab Fee'] || 0) + Number(r['Restaurant Packaging Charge'] || 0);
        mdr += Number(r['Net MDR'] || 0);
        adjustments += Number(r['Tax on GrabFood/GrabMart commission, adjustments, ads'] || 0) + Number(r['Withholding Tax'] || 0) + Number(r['Customer refund Item'] || 0);
        payout += total;
      } else if (cat === 'Advertisement') {
        ads += Math.abs(amt);
        payout += total;
      } else {
        adjustments += total;
      }
    } else {
      nonHqCount++;
    }
  }

  const discounts = offer + merchDisc;
  const totalFees = comm + ads + grabFee + Math.abs(adjustments);

  console.log('\n======================================================');
  console.log('--- GRAB (46 CORPORATE OUTLETS ONLY) ---');
  console.log(`Matched HQ Rows: ${count} (Excluded Non-HQ: ${nonHqCount} rows)`);
  console.log(`1. Gross Menu Sales: RM ${gross.toFixed(2)}`);
  console.log(`2. Customer Discounts: RM ${discounts.toFixed(2)}`);
  console.log(`3. Net Sales (Pre-Tax): RM ${netSales.toFixed(2)}`);
  console.log(`4. Service Charge: RM 0.00`);
  console.log(`5. Tax (SST 6%): RM ${tax.toFixed(2)}`);
  console.log(`6. Commission: RM ${comm.toFixed(2)} (${((comm / netSales) * 100).toFixed(2)}%)`);
  console.log(`7. Advertising Spend: RM ${ads.toFixed(2)}`);
  console.log(`8. Platform Fees: RM ${grabFee.toFixed(2)}`);
  console.log(`9. Payment Gateway (MDR): RM ${mdr.toFixed(2)}`);
  console.log(`10. Adjustments / Fee Tax: RM ${Math.abs(adjustments).toFixed(2)}`);
  console.log(`11. Total Grab Deductions: RM ${totalFees.toFixed(2)}`);
  console.log(`12. Net Payout (Total): RM ${payout.toFixed(2)}`);
}

// 3. FOODPANDA 46 OUTLETS
function calcFoodpanda46() {
  const fpDir = path.join(datasourceDir, 'FOODPANDA');
  const fpFiles = fs.readdirSync(fpDir).filter(f => f.endsWith('.xlsx'));
  
  let gross = 0;
  let revenue = 0;
  let tax = 0;
  let comm = 0;
  let sstComm = 0;
  let ads = 0;
  let payable = 0;
  let count = 0;
  let nonHqCount = 0;

  for (const file of fpFiles) {
    const wb = XLSX.readFile(path.join(fpDir, file));
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('appendix a')) || wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json(sheet);
    for (const r of rows) {
      const store = r['Outlet Name'];
      const matchedCode = matchOutlet('foodpanda', store);
      if (matchedCode) {
        count++;
        gross += Number(r['Products Value Paid By Customer'] || 0);
        revenue += Number(r['Restaurant Revenue'] || 0);
        tax += Number(r['SST On Restaurant Revenue'] || 0);
        comm += Number(r['foodpanda Commission'] || 0);
        sstComm += Number(r['SST on foodpanda commission'] || 0);
        ads += Number(r['Customer Targeting Fee'] || 0) + Number(r['Pandabox Fee Paid By Vendor'] || 0);
        payable += Number(r['Payable Amount'] || 0);
      } else {
        nonHqCount++;
      }
    }
  }

  const net = revenue - tax;
  const discounts = gross - net;
  const totalFees = comm + ads + sstComm;

  console.log('\n======================================================');
  console.log('--- FOODPANDA (46 CORPORATE OUTLETS ONLY) ---');
  console.log(`Matched HQ Orders: ${count} (Excluded Non-HQ: ${nonHqCount} orders)`);
  console.log(`1. Gross Menu Sales: RM ${gross.toFixed(2)}`);
  console.log(`2. Customer Discounts: RM ${discounts.toFixed(2)}`);
  console.log(`3. Net Sales (Pre-Tax): RM ${net.toFixed(2)}`);
  console.log(`4. Tax (SST 6%): RM ${tax.toFixed(2)}`);
  console.log(`5. Commission: RM ${comm.toFixed(2)} (${((comm / net) * 100).toFixed(2)}%)`);
  console.log(`6. Advertising: RM ${ads.toFixed(2)}`);
  console.log(`7. Fee SST (8%): RM ${sstComm.toFixed(2)}`);
  console.log(`8. Total Fees: RM ${totalFees.toFixed(2)}`);
  console.log(`9. Net Payout (Payable): RM ${payable.toFixed(2)}`);
}

// 4. APPS 46 OUTLETS
function calcApps46() {
  const wb = XLSX.readFile(path.join(datasourceDir, 'APPS AUG ORDER LIST.xlsx'));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  
  let gross = 0;
  let taxCombined = 0;
  let deliveryFee = 0;
  let grandTotal = 0;
  let count = 0;
  let nonHqCount = 0;

  for (const r of rows) {
    if (r['Status'] !== 'Completed' || r['Payment Status'] !== 'Paid') continue;
    const store = r['Outlet Name'];
    const matchedCode = matchOutlet('apps', store);
    if (matchedCode) {
      count++;
      gross += Number(r['Subtotal (RM)'] || 0);
      taxCombined += Number(r['Tax (RM)'] || 0);
      deliveryFee += Number(r['Delivery Fee (RM)'] || 0);
      grandTotal += Number(r['Grand Total (RM)'] || 0);
    } else {
      nonHqCount++;
    }
  }

  const sc = gross * 0.021; // empirical dine-in SC portion
  const sst = taxCombined - sc;
  const net = grandTotal - taxCombined - deliveryFee;

  console.log('\n======================================================');
  console.log('--- APPS (46 CORPORATE OUTLETS ONLY) ---');
  console.log(`Matched HQ Orders: ${count} (Excluded Non-HQ: ${nonHqCount} orders)`);
  console.log(`1. Gross Menu Sales: RM ${gross.toFixed(2)}`);
  console.log(`2. Collected Sales (Grand Total): RM ${grandTotal.toFixed(2)}`);
  console.log(`3. Combined Charges (SC + SST): RM ${taxCombined.toFixed(2)}`);
  console.log(`4. Delivery Fee: RM ${deliveryFee.toFixed(2)}`);
  console.log(`5. Net Sales: RM ${net.toFixed(2)}`);
}

calcShopee46();
calcGrab46();
calcFoodpanda46();
calcApps46();
