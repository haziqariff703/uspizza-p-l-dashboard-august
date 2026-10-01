const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const datasourceDir = path.resolve(__dirname, '../datasource');
const outletNameMapPath = path.resolve(__dirname, '../src/data/outletNameMap.ts');

const content = fs.readFileSync(outletNameMapPath, 'utf8');

function normalize(name) {
  return String(name || '').trim().toLowerCase()
    .replace(/^us\s+pizza\b\s*[-–—(]?\s*/i, '')
    .replace(/[’']/g, '').replace(/[().,]/g, '').replace(/\s+/g, ' ').trim();
}

const aliasMap = new Map();
const outlets = [];
const outletBlocks = content.split(/code:\s*'([^']+)'/g);
for (let i = 1; i < outletBlocks.length; i += 2) {
  const code = outletBlocks[i];
  const block = outletBlocks[i + 1];
  const nameMatch = block.match(/name:\s*'([^']+)'/);
  const name = nameMatch ? nameMatch[1] : code;
  const outlet = { code, name, sources: {} };
  
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
  for (const [src, names] of Object.entries(outlet.sources)) {
    for (const n of names) aliasMap.set(`${src}:${normalize(n)}`, code);
  }
  ['pos', 'grab', 'foodpanda', 'shopee', 'apps'].forEach(src => aliasMap.set(`${src}:${normalize(name)}`, code));
}

function matchOutlet(source, storeName) {
  if (!storeName) return null;
  const key = `${source}:${normalize(storeName)}`;
  if (aliasMap.has(key)) return aliasMap.get(key);
  const norm = normalize(storeName);
  for (const o of outlets) {
    if (normalize(o.name) === norm) return o.code;
    for (const s of (o.sources[source] || [])) {
      if (normalize(s) === norm) return o.code;
    }
  }
  return null;
}

console.log('Calculating User-Defined 7 Components for 46 Corporate Outlets (August 2026):');

// 1. GRAB
const wbGrab = XLSX.readFile(path.join(datasourceDir, 'GRAB Aug sales.xlsx'));
const grabRows = XLSX.utils.sheet_to_json(wbGrab.Sheets[wbGrab.SheetNames[0]]);

let grab = {
  grossChargedToCustomer: 0,
  merchantDiscount: 0,
  deliveryDiscountMerchant: 0,
  marketingCPCAds: 0,
  commissionFees: 0,
  rates: []
};

for (const r of grabRows) {
  const store = r['Store Name'];
  if (!matchOutlet('grab', store)) continue;
  const cat = r['Category'];
  
  if (cat === 'Payment') {
    grab.grossChargedToCustomer += Number(r['Amount'] || 0);
    grab.merchantDiscount += Number(r['Offer'] || 0) + Number(r['Discount (Merchant-Funded)'] || 0);
    grab.deliveryDiscountMerchant += Number(r['Delivery Fee Discount (Merchant-Funded)'] || 0);
    grab.commissionFees += Number(r['Order commission'] || 0) + Number(r['Delivery Commission'] || 0) + Number(r['Channel Commission'] || 0);
    if (r['Order Commission (%)']) grab.rates.push(Number(r['Order Commission (%)']));
  } else if (cat === 'Advertisement') {
    // CPC / Keyword / Search user-click marketing
    grab.marketingCPCAds += Math.abs(Number(r['Amount'] || 0));
  }
}

// 2. FOODPANDA
const fpDir = path.join(datasourceDir, 'FOODPANDA');
const fpFiles = fs.readdirSync(fpDir).filter(f => f.endsWith('.xlsx'));

let fp = {
  grossChargedToCustomer: 0,
  merchantDiscount: 0,
  deliveryDiscountMerchant: 0,
  marketingCPCAds: 0,
  commissionFees: 0,
  rates: []
};

for (const file of fpFiles) {
  const wb = XLSX.readFile(path.join(fpDir, file));
  const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('appendix a')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) continue;
  const rows = XLSX.utils.sheet_to_json(sheet);
  for (const r of rows) {
    const store = r['Outlet Name'];
    if (!matchOutlet('foodpanda', store)) continue;
    fp.grossChargedToCustomer += Number(r['Products Value Paid By Customer'] || 0);
    fp.merchantDiscount += Number(r['Voucher Paid By Vendor'] || 0) + Number(r['Discount Paid By Vendor'] || 0) + Number(r['Pandabox Voucher Paid By Vendor'] || 0);
    fp.deliveryDiscountMerchant += Number(r['Delivery Fee Discount Paid By Vendor'] || 0);
    fp.marketingCPCAds += Number(r['Customer Targeting Fee'] || 0) + Number(r['Pandabox Fee Paid By Vendor'] || 0);
    fp.commissionFees += Number(r['foodpanda Commission'] || 0);
    if (r['Foodpanda Commission Rate']) fp.rates.push(Number(r['Foodpanda Commission Rate']));
  }
}

// 3. SHOPEE
const wbShopee = XLSX.readFile(path.join(datasourceDir, 'SHOPEE/Shopee Aug Sales.xlsx'));
const shopeeRows = XLSX.utils.sheet_to_json(wbShopee.Sheets[wbShopee.SheetNames[0]]);

let shopee = {
  grossChargedToCustomer: 0,
  merchantDiscount: 0,
  deliveryDiscountMerchant: 0,
  marketingCPCAds: 0,
  commissionFees: 0,
  rates: []
};

for (const r of shopeeRows) {
  if (r['Order Status'] !== 'Completed') continue;
  const store = r['Store Name'];
  if (!matchOutlet('shopee', store)) continue;
  shopee.grossChargedToCustomer += Number(r['Food original price'] || 0);
  shopee.merchantDiscount += Number(r['Item discounts'] || 0) + Number(r['Flash sale discount'] || 0) + Number(r['Merchant Prepaid Subsidy'] || 0);
  shopee.marketingCPCAds += Number(r['Platform Flash Sale Subsidy'] || 0) + Number(r['Food Voucher Subsidy'] || 0);
}

// 4. APPS
const wbApps = XLSX.readFile(path.join(datasourceDir, 'APPS AUG ORDER LIST.xlsx'));
const appsRows = XLSX.utils.sheet_to_json(wbApps.Sheets[wbApps.SheetNames[0]]);

let apps = {
  grossChargedToCustomer: 0,
  merchantDiscount: 0,
  deliveryDiscountMerchant: 0,
  marketingCPCAds: 0,
  paymentGatewayMDR: 0,
  commissionFees: 0,
  rates: []
};

for (const r of appsRows) {
  if (r['Status'] !== 'Completed' || r['Payment Status'] !== 'Paid') continue;
  const store = r['Outlet Name'];
  if (!matchOutlet('apps', store)) continue;
  const gross = Number(r['Subtotal (RM)'] || 0);
  const grandTotal = Number(r['Grand Total (RM)'] || 0);
  const delivery = Number(r['Delivery Fee (RM)'] || 0);
  
  apps.grossChargedToCustomer += gross;
  apps.paymentGatewayMDR += grandTotal * 0.015; // 1.5% RazerPay gateway
}

console.log('\n--- GRAB ---');
console.log(grab);

console.log('\n--- FOODPANDA ---');
console.log(fp);

console.log('\n--- SHOPEE ---');
console.log(shopee);

console.log('\n--- APPS ---');
console.log(apps);
