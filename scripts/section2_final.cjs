/**
 * FINAL Section 2 Calculator — Commission & Fees Breakdown
 * 46 Corporate Outlets, August 2026
 * 
 * Fee Categories:
 *   1. Commission
 *   2. Advertising
 *   3. Platform / Service Fees
 *   4. Payment Gateway
 *   5. Adjustments / Credits
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ── Build outlet alias map from OUTLET_NAME_MAP (46 corporate outlets) ──
const mapContent = fs.readFileSync(path.resolve(__dirname, '../src/data/outletNameMap.ts'), 'utf8');
const corporateOutlets = [];
const aliasMap = new Map();

const blocks = mapContent.split(/code:\s*'([^']+)'/g);
for (let i = 1; i < blocks.length; i += 2) {
  const code = blocks[i];
  const block = blocks[i + 1];
  const nameMatch = block.match(/name:\s*'([^']+)'/);
  const name = nameMatch ? nameMatch[1] : code;
  corporateOutlets.push({ code, name });

  ['pos', 'grab', 'foodpanda', 'shopee', 'apps'].forEach(src => {
    const regex = new RegExp(src + ":\\s*\\[([^\\]]+)\\]");
    const m = block.match(regex);
    if (m) {
      const items = m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      items.forEach(a => {
        aliasMap.set(`${src}:${a.trim().toLowerCase()}`, code);
      });
    }
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
    if (k.startsWith(`${source}:`)) {
      if (normalize(k.slice(source.length + 1)) === clean) return code;
    }
  }
  for (const o of corporateOutlets) {
    if (normalize(o.name) === clean) return o.code;
  }
  return null;
}

console.log(`Corporate Outlets in Map: ${corporateOutlets.length}\n`);

// ════════════════════════════════════════════════════════════════════════
// 1. GRAB
// ════════════════════════════════════════════════════════════════════════
const wbGrab = XLSX.readFile(path.resolve(__dirname, '../datasource/GRAB Aug sales.xlsx'));
const grabRows = XLSX.utils.sheet_to_json(wbGrab.Sheets[wbGrab.SheetNames[0]]);

const grab = { commission: 0, advertising: 0, platformFees: 0, paymentGateway: 0, adjustments: 0, outlets: new Set() };
// Breakdown detail
const grabDetail = { orderCommission: 0, deliveryCommission: 0, channelCommission: 0, cpcAds: 0, successFee: 0, packagingCharge: 0, grabExpressDelivery: 0, taxOnFees: 0, netSales: 0, grossAmount: 0, merchantDiscount: 0 };

for (const r of grabRows) {
  const store = r['Store Name'];
  const code = matchOutlet('grab', store);
  if (!code) continue;
  grab.outlets.add(code);

  const cat = r['Category'];

  if (cat === 'Payment') {
    // Commission: Order commission (negative in sheet)
    grabDetail.orderCommission += Math.abs(Number(r['Order commission'] || 0));
    grabDetail.deliveryCommission += Math.abs(Number(r['Delivery Commission'] || 0));
    grabDetail.channelCommission += Math.abs(Number(r['Channel Commission'] || 0));

    // Advertising: Marketing success fee on orders (negative in sheet)
    grabDetail.successFee += Math.abs(Number(r['Marketing success fee'] || 0));

    // Platform fees: Restaurant Packaging Charge + GrabExpress
    grabDetail.packagingCharge += Number(r['Restaurant Packaging Charge'] || 0);
    grabDetail.grabExpressDelivery += Number(r['GrabExpress Delivery Service Fee'] || 0);

    // Tax on fees (SST 8%)
    grabDetail.taxOnFees += Math.abs(Number(r['Tax on GrabFood/GrabMart commission, adjustments, ads'] || 0));

    // For commission rate calculation
    grabDetail.grossAmount += Number(r['Amount'] || 0);
    grabDetail.merchantDiscount += Math.abs(Number(r['Discount (Merchant-Funded)'] || 0));
    grabDetail.netSales += Number(r['Net Sales'] || 0);

  } else if (cat === 'Advertisement') {
    // CPC / Keyword / Search ads
    grabDetail.cpcAds += Math.abs(Number(r['Amount'] || 0));
    grabDetail.taxOnFees += Math.abs(Number(r['Tax on GrabFood/GrabMart commission, adjustments, ads'] || 0));

  } else if (cat === 'Adjustment') {
    // Adjustments credited (positive = credit back to merchant)
    grab.adjustments += Number(r['Total'] || 0);
  }
}

grab.commission = grabDetail.orderCommission + grabDetail.deliveryCommission + grabDetail.channelCommission;
grab.advertising = grabDetail.cpcAds + grabDetail.successFee;
grab.platformFees = grabDetail.packagingCharge + grabDetail.grabExpressDelivery;
grab.paymentGateway = 0;

// ════════════════════════════════════════════════════════════════════════
// 2. FOODPANDA
// ════════════════════════════════════════════════════════════════════════
const fpDir = path.resolve(__dirname, '../datasource/FOODPANDA');
const fpFiles = fs.readdirSync(fpDir).filter(f => f.endsWith('.xlsx'));

const fp = { commission: 0, advertising: 0, platformFees: 0, paymentGateway: 0, adjustments: 0, outlets: new Set() };
const fpDetail = { commission: 0, commissionSSTtax: 0, customerTargeting: 0, pandaboxFee: 0, grossAmount: 0, merchantDiscount: 0 };

for (const file of fpFiles) {
  const wb = XLSX.readFile(path.join(fpDir, file));
  const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('appendix a')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) continue;
  const rows = XLSX.utils.sheet_to_json(sheet);
  for (const r of rows) {
    const store = r['Outlet Name'];
    const code = matchOutlet('foodpanda', store);
    if (!code) continue;
    fp.outlets.add(code);

    fpDetail.commission += Number(r['foodpanda Commission'] || 0);
    fpDetail.commissionSSTtax += Number(r['SST on Commission'] || 0);
    fpDetail.customerTargeting += Number(r['Customer Targeting Fee'] || 0);
    fpDetail.pandaboxFee += Number(r['Pandabox Fee Paid By Vendor'] || 0);
    fpDetail.grossAmount += Number(r['Products Value Paid By Customer'] || 0);
    fpDetail.merchantDiscount += Number(r['Discount Paid By Vendor'] || 0) + Number(r['Voucher Paid By Vendor'] || 0) + Number(r['Pandabox Voucher Paid By Vendor'] || 0);
  }
}

fp.commission = fpDetail.commission;
fp.advertising = fpDetail.customerTargeting + fpDetail.pandaboxFee;
fp.platformFees = 0;
fp.paymentGateway = 0;
fp.adjustments = 0;

// ════════════════════════════════════════════════════════════════════════
// 3. SHOPEE
// ════════════════════════════════════════════════════════════════════════
const wbShopee = XLSX.readFile(path.resolve(__dirname, '../datasource/SHOPEE/Shopee Aug Sales.xlsx'));
const shopeeRows = XLSX.utils.sheet_to_json(wbShopee.Sheets[wbShopee.SheetNames[0]]);

const shopee = { commission: 0, advertising: 0, platformFees: 0, paymentGateway: 0, adjustments: 0, outlets: new Set() };
const shopeeDetail = { platformFlashSale: 0, foodVoucherSubsidy: 0, grossAmount: 0, merchantDiscount: 0, transactionAmount: 0, earnings: 0 };

for (const r of shopeeRows) {
  if (r['Order Status'] !== 'Completed') continue;
  const store = r['Store Name'];
  const code = matchOutlet('shopee', store);
  if (!code) continue;
  shopee.outlets.add(code);

  shopeeDetail.platformFlashSale += Number(r['Platform Flash Sale Subsidy'] || 0);
  shopeeDetail.foodVoucherSubsidy += Number(r['Food Voucher Subsidy'] || 0);
  shopeeDetail.grossAmount += Number(r['Food original price'] || 0);
  shopeeDetail.merchantDiscount += Number(r['Item discounts'] || 0) + Number(r['Flash sale discount'] || 0) + Number(r['Merchant Prepaid Subsidy'] || 0);
  shopeeDetail.transactionAmount += Number(r['Transaction Amount'] || 0);
  shopeeDetail.earnings += Number(r['Earnings'] || 0);
}

shopee.commission = 0; // Not in order export — billed on remittance
shopee.advertising = shopeeDetail.platformFlashSale + shopeeDetail.foodVoucherSubsidy;
shopee.platformFees = 0;
shopee.paymentGateway = 0;
shopee.adjustments = 0;

// ════════════════════════════════════════════════════════════════════════
// 4. APPS
// ════════════════════════════════════════════════════════════════════════
const wbApps = XLSX.readFile(path.resolve(__dirname, '../datasource/APPS AUG ORDER LIST.xlsx'));
const appsRows = XLSX.utils.sheet_to_json(wbApps.Sheets[wbApps.SheetNames[0]]);

const apps = { commission: 0, advertising: 0, platformFees: 0, paymentGateway: 0, adjustments: 0, outlets: new Set() };
const appsDetail = { grandTotalCollected: 0 };

for (const r of appsRows) {
  if (r['Status'] !== 'Completed' || r['Payment Status'] !== 'Paid') continue;
  const store = r['Outlet Name'];
  const code = matchOutlet('apps', store);
  if (!code) continue;
  apps.outlets.add(code);
  appsDetail.grandTotalCollected += Number(r['Grand Total (RM)'] || 0);
}

apps.commission = 0;       // In-house app, no 3rd-party commission
apps.advertising = 0;      // In-house app, no CPC ads
apps.platformFees = 0;     // No platform service fees
apps.paymentGateway = appsDetail.grandTotalCollected * 0.015; // 1.5% RazerPay MDR
apps.adjustments = 0;

// ════════════════════════════════════════════════════════════════════════
// TOTALS
// ════════════════════════════════════════════════════════════════════════
const totalCommission = grab.commission + fp.commission + shopee.commission + apps.commission;
const totalAdvertising = grab.advertising + fp.advertising + shopee.advertising + apps.advertising;
const totalPlatformFees = grab.platformFees + fp.platformFees + shopee.platformFees + apps.platformFees;
const totalPaymentGateway = grab.paymentGateway + fp.paymentGateway + shopee.paymentGateway + apps.paymentGateway;
const totalAdjustments = grab.adjustments + fp.adjustments + shopee.adjustments + apps.adjustments;

const grabTotal = grab.commission + grab.advertising + grab.platformFees + grab.paymentGateway - grab.adjustments;
const fpTotal = fp.commission + fp.advertising + fp.platformFees + fp.paymentGateway - fp.adjustments;
const shopeeTotal = shopee.commission + shopee.advertising + shopee.platformFees + shopee.paymentGateway - shopee.adjustments;
const appsTotal = apps.commission + apps.advertising + apps.platformFees + apps.paymentGateway - apps.adjustments;
const grandTotal = grabTotal + fpTotal + shopeeTotal + appsTotal;

// Commission rates
const grabNetPreTax = grabDetail.grossAmount - grabDetail.merchantDiscount;
const grabCommRate = grabNetPreTax > 0 ? (grab.commission / grabNetPreTax * 100) : 0;
const fpNetVendor = fpDetail.grossAmount - fpDetail.merchantDiscount;
const fpCommRate = fpNetVendor > 0 ? (fp.commission / fpNetVendor * 100) : 0;

// ════════════════════════════════════════════════════════════════════════
// OUTPUT
// ════════════════════════════════════════════════════════════════════════
const rm = (v) => `RM ${Math.abs(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  SECTION 2: COMMISSION & FEES BREAKDOWN — AUGUST 2026');
console.log('  46 Corporate Outlets (44 MY US Pizza + 2 Sabah)');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('OUTLETS MATCHED PER PLATFORM:');
console.log(`  Grab:      ${grab.outlets.size} of 46`);
console.log(`  FoodPanda: ${fp.outlets.size} of 46`);
console.log(`  Shopee:    ${shopee.outlets.size} of 46`);
console.log(`  Apps:      ${apps.outlets.size} of 46\n`);

console.log('───────────────────────────────────────────────────────────────');
console.log('FEE MATRIX');
console.log('───────────────────────────────────────────────────────────────');

const pad = (s, w) => String(s).padStart(w);
const W = 17;
const header = `${'Fee Type'.padEnd(25)} ${pad('Grab', W)} ${pad('FoodPanda', W)} ${pad('Shopee', W)} ${pad('Apps', W)} ${pad('TOTAL', W)}`;
console.log(header);
console.log('-'.repeat(header.length));

const row = (label, g, f, s, a, t) => `${label.padEnd(25)} ${pad(rm(g), W)} ${pad(rm(f), W)} ${pad(rm(s), W)} ${pad(rm(a), W)} ${pad(rm(t), W)}`;

console.log(row('Commission', grab.commission, fp.commission, shopee.commission, apps.commission, totalCommission));
console.log(`${'  ↳ rate (% net sales)'.padEnd(25)} ${pad(grabCommRate.toFixed(2) + '%', W)} ${pad(fpCommRate.toFixed(2) + '%', W)} ${pad('N/A (remit.)', W)} ${pad('0.00%', W)} ${pad('—', W)}`);
console.log(row('Advertising', grab.advertising, fp.advertising, shopee.advertising, apps.advertising, totalAdvertising));
console.log(row('Platform / Svc fees', grab.platformFees, fp.platformFees, shopee.platformFees, apps.platformFees, totalPlatformFees));
console.log(row('Payment gateway', grab.paymentGateway, fp.paymentGateway, shopee.paymentGateway, apps.paymentGateway, totalPaymentGateway));
console.log(`${'Adjustments / credits'.padEnd(25)} ${pad((grab.adjustments > 0 ? '− ' : '') + rm(grab.adjustments), W)} ${pad(rm(fp.adjustments), W)} ${pad(rm(shopee.adjustments), W)} ${pad(rm(apps.adjustments), W)} ${pad((totalAdjustments > 0 ? '− ' : '') + rm(totalAdjustments), W)}`);
console.log('-'.repeat(header.length));
console.log(row('TOTAL FEES', grabTotal, fpTotal, shopeeTotal, appsTotal, grandTotal));

console.log('\n───────────────────────────────────────────────────────────────');
console.log('3 KPI SUMMARY CARDS');
console.log('───────────────────────────────────────────────────────────────');
console.log(`  Advertising spend / month:  ${rm(totalAdvertising)}`);
console.log(`  Commission / month:         ${rm(totalCommission)}`);
console.log(`  Total fees / month:         ${rm(grandTotal)}`);

console.log('\n───────────────────────────────────────────────────────────────');
console.log('FORMULAS & COLUMN SOURCES');
console.log('───────────────────────────────────────────────────────────────');

console.log('\n[1] COMMISSION');
console.log(`  Grab = |Order commission| = ${rm(grabDetail.orderCommission)}`);
console.log(`    File: GRAB Aug sales.xlsx → Category='Payment' → column 'Order commission'`);
console.log(`    Delivery Commission = ${rm(grabDetail.deliveryCommission)}, Channel Commission = ${rm(grabDetail.channelCommission)}`);
console.log(`    Total Grab Commission = ${rm(grab.commission)}`);
console.log(`    Rate = ${rm(grab.commission)} / (Gross ${rm(grabDetail.grossAmount)} − Discount ${rm(grabDetail.merchantDiscount)}) = ${rm(grab.commission)} / ${rm(grabNetPreTax)} = ${grabCommRate.toFixed(2)}%`);
console.log(`  FoodPanda = Σ 'foodpanda Commission' = ${rm(fp.commission)}`);
console.log(`    File: FOODPANDA/*.xlsx → Appendix A → column 'foodpanda Commission'`);
console.log(`    Rate = ${rm(fp.commission)} / (Gross ${rm(fpDetail.grossAmount)} − Discount ${rm(fpDetail.merchantDiscount)}) = ${rm(fp.commission)} / ${rm(fpNetVendor)} = ${fpCommRate.toFixed(2)}%`);
console.log(`  Shopee = RM 0.00 (not in order export; billed on bi-weekly remittance statement)`);
console.log(`  Apps = RM 0.00 (in-house proprietary app, no 3rd-party commission)`);

console.log('\n[2] ADVERTISING');
console.log(`  Grab = CPC/Search Ads + Marketing Success Fee`);
console.log(`    CPC Ads: Σ |Amount| where Category='Advertisement' = ${rm(grabDetail.cpcAds)}`);
console.log(`    Success Fee: Σ |Marketing success fee| where Category='Payment' = ${rm(grabDetail.successFee)}`);
console.log(`    Total Grab Advertising = ${rm(grabDetail.cpcAds)} + ${rm(grabDetail.successFee)} = ${rm(grab.advertising)}`);
console.log(`  FoodPanda = Customer Targeting Fee + Pandabox Fee = ${rm(fpDetail.customerTargeting)} + ${rm(fpDetail.pandaboxFee)} = ${rm(fp.advertising)}`);
console.log(`  Shopee = Platform Flash Sale Subsidy + Food Voucher Subsidy`);
console.log(`    = ${rm(shopeeDetail.platformFlashSale)} + ${rm(shopeeDetail.foodVoucherSubsidy)} = ${rm(shopee.advertising)}`);
console.log(`  Apps = RM 0.00 (in-house app)`);

console.log('\n[3] PLATFORM / SERVICE FEES');
console.log(`  Grab = Restaurant Packaging Charge (${rm(grabDetail.packagingCharge)}) + GrabExpress (${rm(grabDetail.grabExpressDelivery)}) = ${rm(grab.platformFees)}`);
console.log(`  FoodPanda = RM 0.00`);
console.log(`  Shopee = RM 0.00`);
console.log(`  Apps = RM 0.00`);

console.log('\n[4] PAYMENT GATEWAY');
console.log(`  Grab = RM 0.00 (bundled in Grab settlement)`);
console.log(`  FoodPanda = RM 0.00 (bundled in FP settlement)`);
console.log(`  Shopee = RM 0.00 (bundled in Shopee settlement)`);
console.log(`  Apps = 1.50% RazerPay MDR × Grand Total Collected`);
console.log(`    = 1.50% × ${rm(appsDetail.grandTotalCollected)} = ${rm(apps.paymentGateway)}`);

console.log('\n[5] ADJUSTMENTS / CREDITS');
console.log(`  Grab = Σ Total where Category='Adjustment' = ${rm(grab.adjustments)} (credited back to merchant)`);
console.log(`  FoodPanda = RM 0.00`);
console.log(`  Shopee = RM 0.00`);
console.log(`  Apps = RM 0.00`);

console.log('\n[TOTAL FEES]');
console.log(`  Grab = ${rm(grab.commission)} + ${rm(grab.advertising)} + ${rm(grab.platformFees)} + ${rm(grab.paymentGateway)} − ${rm(grab.adjustments)} = ${rm(grabTotal)}`);
console.log(`  FoodPanda = ${rm(fp.commission)} + ${rm(fp.advertising)} + ${rm(fp.platformFees)} + ${rm(fp.paymentGateway)} − ${rm(fp.adjustments)} = ${rm(fpTotal)}`);
console.log(`  Shopee = ${rm(shopee.commission)} + ${rm(shopee.advertising)} + ${rm(shopee.platformFees)} + ${rm(shopee.paymentGateway)} − ${rm(shopee.adjustments)} = ${rm(shopeeTotal)}`);
console.log(`  Apps = ${rm(apps.commission)} + ${rm(apps.advertising)} + ${rm(apps.platformFees)} + ${rm(apps.paymentGateway)} − ${rm(apps.adjustments)} = ${rm(appsTotal)}`);
console.log(`  GRAND TOTAL = ${rm(grabTotal)} + ${rm(fpTotal)} + ${rm(shopeeTotal)} + ${rm(appsTotal)} = ${rm(grandTotal)}`);

console.log('\n───────────────────────────────────────────────────────────────');
console.log('TAX ON FEES (SST 8% — informational, not a separate fee row)');
console.log('───────────────────────────────────────────────────────────────');
console.log(`  Grab SST on commission/ads/adjustments = ${rm(grabDetail.taxOnFees)}`);
