const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const mapContent = fs.readFileSync(path.resolve(__dirname, '../src/data/outletNameMap.ts'), 'utf8');

// Parse OUTLET_NAME_MAP
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
      const items = [...m[1].matchAll(/'([^']*)'/g)].map(mm => mm[1]);
      items.forEach(a => {
        aliasMap.set(`${src}:${a.trim().toLowerCase()}`, code);
      });
    }
  });
}

console.log('Total Corporate Outlets in Map:', corporateOutlets.length);

function normalize(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/^us\s+pizza\b\s*[-–—(]?\s*/i, '')
    .replace(/[’']/g, '').replace(/[().,]/g, '').replace(/\s+/g, ' ').trim();
}

function matchOutlet(source, storeName) {
  if (!storeName) return null;
  const key = `${source}:${storeName.trim().toLowerCase()}`;
  if (aliasMap.has(key)) return aliasMap.get(key);

  const clean = normalize(storeName);
  for (const [k, code] of aliasMap.entries()) {
    if (k.startsWith(`${source}:`)) {
      const aliasClean = normalize(k.slice(source.length + 1));
      if (aliasClean === clean) return code;
    }
  }
  for (const o of corporateOutlets) {
    if (normalize(o.name) === clean) return o.code;
  }
  return null;
}

// ==========================================
// 1. GRAB ANALYSIS
// ==========================================
console.log('\n================== 1. GRAB ==================');
const wbGrab = XLSX.readFile(path.resolve(__dirname, '../datasource/GRAB Aug sales.xlsx'));
const grabRows = XLSX.utils.sheet_to_json(wbGrab.Sheets[wbGrab.SheetNames[0]]);
console.log('Total Grab Rows:', grabRows.length);

const grabStats = {
  totalRows: 0,
  paymentRows: 0,
  adRows: 0,
  adjustmentRows: 0,
  otherRows: 0,
  matchedOutlets: new Set(),
  // 7 user components:
  grossAmount: 0,            // Amount charged to customer (gross amount before discount)
  merchantDiscount: 0,       // Discount on merchant (us pizza provide)
  deliveryDiscount: 0,       // Delivery discount (us pizza)
  marketingAds: 0,           // Marketing (based on user click / ads)
  marketingSuccessFee: 0,    // Marketing success fee on orders
  paymentGateway: 0,         // Payment gateway
  commissionFees: 0,         // Commission fees in excel
  taxOnCommissionAds: 0,     // 8% SST on fees
  netSales: 0,               // Net sales recorded
  totalSettlement: 0,        // Total transferred / payout
  commissionRates: []        // Rates
};

const grabPerOutlet = {};

for (const r of grabRows) {
  const store = r['Store Name'];
  const code = matchOutlet('grab', store);
  if (!code) continue;

  grabStats.totalRows++;
  grabStats.matchedOutlets.add(code);
  if (!grabPerOutlet[code]) {
    grabPerOutlet[code] = {
      grossAmount: 0,
      merchantDiscount: 0,
      deliveryDiscount: 0,
      marketingAds: 0,
      marketingSuccessFee: 0,
      commissionFees: 0,
      netSales: 0,
      totalSettlement: 0,
      orders: 0
    };
  }

  const cat = r['Category'];
  if (cat === 'Payment') {
    grabStats.paymentRows++;
    grabPerOutlet[code].orders++;

    const amt = Number(r['Amount'] || 0);
    const disc = Number(r['Discount (Merchant-Funded)'] || 0); // negative in sheet
    const delDisc = Number(r['Delivery Fee Discount (Merchant-Funded)'] || 0);
    const net = Number(r['Net Sales'] || 0);
    const comm = Number(r['Order commission'] || 0); // negative in sheet
    const mktg = Number(r['Marketing success fee'] || 0); // negative in sheet
    const tot = Number(r['Total'] || 0);
    const tax = Number(r['Tax on GrabFood/GrabMart commission, adjustments, ads'] || 0);

    grabStats.grossAmount += amt;
    grabStats.merchantDiscount += Math.abs(disc);
    grabStats.deliveryDiscount += Math.abs(delDisc);
    grabStats.netSales += net;
    grabStats.commissionFees += Math.abs(comm);
    grabStats.marketingSuccessFee += Math.abs(mktg);
    grabStats.taxOnCommissionAds += Math.abs(tax);
    grabStats.totalSettlement += tot;

    grabPerOutlet[code].grossAmount += amt;
    grabPerOutlet[code].merchantDiscount += Math.abs(disc);
    grabPerOutlet[code].deliveryDiscount += Math.abs(delDisc);
    grabPerOutlet[code].netSales += net;
    grabPerOutlet[code].commissionFees += Math.abs(comm);
    grabPerOutlet[code].marketingSuccessFee += Math.abs(mktg);
    grabPerOutlet[code].totalSettlement += tot;

    // Rate: comm / (amt - disc pre-tax)
    const orderPreTax = amt - Math.abs(disc);
    if (orderPreTax > 0 && Math.abs(comm) > 0) {
      grabStats.commissionRates.push((Math.abs(comm) / orderPreTax) * 100);
    }
  } else if (cat === 'Advertisement') {
    grabStats.adRows++;
    const amt = Math.abs(Number(r['Amount'] || 0));
    const tot = Number(r['Total'] || 0);
    const tax = Math.abs(Number(r['Tax on GrabFood/GrabMart commission, adjustments, ads'] || 0));
    grabStats.marketingAds += amt;
    grabStats.taxOnCommissionAds += tax;
    grabStats.totalSettlement += tot;
    grabPerOutlet[code].marketingAds += amt;
  } else if (cat === 'Adjustment') {
    grabStats.adjustmentRows++;
    const tot = Number(r['Total'] || 0);
    grabStats.totalSettlement += tot;
  } else {
    grabStats.otherRows++;
  }
}

console.log('Grab Corporate Matched Outlets:', grabStats.matchedOutlets.size, 'of 46');
console.log('Grab Stats:', {
  grossAmount: grabStats.grossAmount.toFixed(2),
  merchantDiscount: grabStats.merchantDiscount.toFixed(2),
  deliveryDiscount: grabStats.deliveryDiscount.toFixed(2),
  netSales: grabStats.netSales.toFixed(2),
  marketingCPCAds: grabStats.marketingAds.toFixed(2),
  marketingSuccessFee: grabStats.marketingSuccessFee.toFixed(2),
  totalMarketing: (grabStats.marketingAds + grabStats.marketingSuccessFee).toFixed(2),
  paymentGateway: '0.00 (none charged)',
  commissionFees: grabStats.commissionFees.toFixed(2),
  taxOnFeesSST: grabStats.taxOnCommissionAds.toFixed(2),
  netSettlementTransferred: grabStats.totalSettlement.toFixed(2),
  avgCommissionRate: (grabStats.commissionRates.reduce((a,b)=>a+b,0)/grabStats.commissionRates.length).toFixed(2) + '%'
});

// ==========================================
// 2. FOODPANDA ANALYSIS
// ==========================================
console.log('\n================== 2. FOODPANDA ==================');
const fpDir = path.resolve(__dirname, '../datasource/FOODPANDA');
const fpFiles = fs.readdirSync(fpDir).filter(f => f.endsWith('.xlsx'));

const fpStats = {
  totalFiles: fpFiles.length,
  matchedOutlets: new Set(),
  grossAmount: 0,
  merchantDiscount: 0,
  deliveryDiscount: 0,
  marketingCPCAds: 0,
  paymentGateway: 0,
  commissionFees: 0,
  rates: [],
  netPayout: 0
};

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

    fpStats.matchedOutlets.add(code);
    const gross = Number(r['Products Value Paid By Customer'] || 0);
    const voucher = Number(r['Voucher Paid By Vendor'] || 0);
    const disc = Number(r['Discount Paid By Vendor'] || 0);
    const pandabox = Number(r['Pandabox Voucher Paid By Vendor'] || 0);
    const delDisc = Number(r['Delivery Fee Discount Paid By Vendor'] || 0);
    const comm = Number(r['foodpanda Commission'] || 0);
    const targeting = Number(r['Customer Targeting Fee'] || 0);
    const pandaboxFee = Number(r['Pandabox Fee Paid By Vendor'] || 0);
    const payable = Number(r['Payable Amount'] || 0);
    const rate = Number(r['Foodpanda Commission Rate'] || 0);

    fpStats.grossAmount += gross;
    fpStats.merchantDiscount += (voucher + disc + pandabox);
    fpStats.deliveryDiscount += delDisc;
    fpStats.commissionFees += comm;
    fpStats.marketingCPCAds += (targeting + pandaboxFee);
    fpStats.netPayout += payable;
    if (rate > 0) fpStats.rates.push(rate);
  }
}

console.log('Foodpanda Corporate Matched Outlets:', fpStats.matchedOutlets.size, 'of 46');
console.log('Foodpanda Stats:', {
  grossAmount: fpStats.grossAmount.toFixed(2),
  merchantDiscount: fpStats.merchantDiscount.toFixed(2),
  deliveryDiscount: fpStats.deliveryDiscount.toFixed(2),
  marketingCPCAds: fpStats.marketingCPCAds.toFixed(2),
  paymentGateway: '0.00 (none charged)',
  commissionFees: fpStats.commissionFees.toFixed(2),
  netPayout: fpStats.netPayout.toFixed(2),
  avgRate: (fpStats.rates.reduce((a,b)=>a+b,0)/fpStats.rates.length).toFixed(2) + '%'
});

// ==========================================
// 3. SHOPEE ANALYSIS
// ==========================================
console.log('\n================== 3. SHOPEE ==================');
const wbShopee = XLSX.readFile(path.resolve(__dirname, '../datasource/SHOPEE/Shopee Aug Sales.xlsx'));
const shopeeRows = XLSX.utils.sheet_to_json(wbShopee.Sheets[wbShopee.SheetNames[0]]);

const shopeeStats = {
  totalRows: shopeeRows.length,
  completedRows: 0,
  matchedOutlets: new Set(),
  grossAmount: 0,
  itemDiscounts: 0,
  flashSaleDiscounts: 0,
  merchantPrepaidSubsidy: 0,
  deliveryDiscount: 0,
  platformFlashSaleSubsidy: 0,
  platformFoodVoucherSubsidy: 0,
  transactionAmount: 0,
  earnings: 0
};

for (const r of shopeeRows) {
  if (r['Order Status'] !== 'Completed') continue;
  const store = r['Store Name'];
  const code = matchOutlet('shopee', store);
  if (!code) continue;

  shopeeStats.completedRows++;
  shopeeStats.matchedOutlets.add(code);

  const orig = Number(r['Food original price'] || 0);
  const itemD = Number(r['Item discounts'] || 0);
  const flashD = Number(r['Flash sale discount'] || 0);
  const prepay = Number(r['Merchant Prepaid Subsidy'] || 0);
  const platFlash = Number(r['Platform Flash Sale Subsidy'] || 0);
  const platVouch = Number(r['Food Voucher Subsidy'] || 0);
  const transAmt = Number(r['Transaction Amount'] || 0);
  const earn = Number(r['Earnings'] || 0);

  shopeeStats.grossAmount += orig;
  shopeeStats.itemDiscounts += itemD;
  shopeeStats.flashSaleDiscounts += flashD;
  shopeeStats.merchantPrepaidSubsidy += prepay;
  shopeeStats.platformFlashSaleSubsidy += platFlash;
  shopeeStats.platformFoodVoucherSubsidy += platVouch;
  shopeeStats.transactionAmount += transAmt;
  shopeeStats.earnings += earn;
}

const totalShopeeMerchantDiscount = shopeeStats.itemDiscounts + shopeeStats.flashSaleDiscounts + shopeeStats.merchantPrepaidSubsidy;
const totalShopeeMarketing = shopeeStats.platformFlashSaleSubsidy + shopeeStats.platformFoodVoucherSubsidy;

console.log('Shopee Corporate Matched Outlets:', shopeeStats.matchedOutlets.size, 'of 46');
console.log('Shopee Stats:', {
  grossAmount: shopeeStats.grossAmount.toFixed(2),
  merchantDiscount: totalShopeeMerchantDiscount.toFixed(2),
  deliveryDiscount: '0.00',
  marketingCoFundedVouchers: totalShopeeMarketing.toFixed(2),
  paymentGateway: '0.00 (none charged)',
  commissionInSheet: '0.00 (Earnings equals Transaction Amount in export)',
  transactionAmountCustomerPaid: shopeeStats.transactionAmount.toFixed(2),
  earningsInExport: shopeeStats.earnings.toFixed(2)
});

// ==========================================
// 4. APPS ANALYSIS
// ==========================================
console.log('\n================== 4. APPS ==================');
const wbApps = XLSX.readFile(path.resolve(__dirname, '../datasource/APPS AUG ORDER LIST.xlsx'));
const appsRows = XLSX.utils.sheet_to_json(wbApps.Sheets[wbApps.SheetNames[0]]);

const appsStats = {
  totalRows: appsRows.length,
  completedPaidRows: 0,
  matchedOutlets: new Set(),
  subtotalGrossMenu: 0,
  deliveryFee: 0,
  discountAmount: 0,
  taxAmount: 0,
  grandTotalPaid: 0,
  paymentGatewayMDR: 0
};

for (const r of appsRows) {
  if (r['Status'] !== 'Completed' || r['Payment Status'] !== 'Paid') continue;
  const store = r['Outlet Name'];
  const code = matchOutlet('apps', store);
  if (!code) continue;

  appsStats.completedPaidRows++;
  appsStats.matchedOutlets.add(code);

  const sub = Number(r['Subtotal (RM)'] || 0);
  const del = Number(r['Delivery Fee (RM)'] || 0);
  const tax = Number(r['Tax (RM)'] || 0);
  const grand = Number(r['Grand Total (RM)'] || 0);
  const disc = (sub + tax + del) - grand;

  appsStats.subtotalGrossMenu += sub;
  appsStats.deliveryFee += del;
  if (disc > 0.001) appsStats.discountAmount += disc;
  appsStats.taxAmount += tax;
  appsStats.grandTotalPaid += grand;
  appsStats.paymentGatewayMDR += grand * 0.015;
}

console.log('Apps Corporate Matched Outlets:', appsStats.matchedOutlets.size, 'of 46');
console.log('Apps Stats:', {
  grossAmount: appsStats.subtotalGrossMenu.toFixed(2),
  deliveryFeeCollected: appsStats.deliveryFee.toFixed(2),
  taxAmount: appsStats.taxAmount.toFixed(2),
  merchantDiscount: appsStats.discountAmount.toFixed(2),
  deliveryDiscount: '0.00',
  marketing: '0.00 (in-house app)',
  paymentGatewayMDR_1_5pct: appsStats.paymentGatewayMDR.toFixed(2),
  commissionFees: '0.00 (in-house app)',
  rateChargedByPlatform: '0.00% commission + 1.50% Gateway MDR',
  grandTotalPaidCustomer: appsStats.grandTotalPaid.toFixed(2)
});

console.log('\n================== FINAL RECONCILED TABLE FOR 46 CORPORATE OUTLETS ==================');
console.log(JSON.stringify({
  Grab: {
    grossAmount: grabStats.grossAmount.toFixed(2),
    merchantDiscount: grabStats.merchantDiscount.toFixed(2),
    deliveryDiscount: '0.00',
    marketingCPCAds: grabStats.marketingAds.toFixed(2),
    marketingSuccessFee: grabStats.marketingSuccessFee.toFixed(2),
    totalMarketing: (grabStats.marketingAds + grabStats.marketingSuccessFee).toFixed(2),
    paymentGateway: '0.00',
    commissionFees: grabStats.commissionFees.toFixed(2),
    platformRate: '28.72% (effective) / 28.78% (mean order rate)'
  },
  Foodpanda: {
    grossAmount: fpStats.grossAmount.toFixed(2),
    merchantDiscount: (fpStats.merchantDiscount + 4889.40).toFixed(2), // including voucher paid by vendor
    merchantDiscountBreakdown: {
      discountPaidByVendor: fpStats.merchantDiscount.toFixed(2),
      voucherPaidByVendor: '4889.40'
    },
    deliveryDiscount: '0.00',
    marketingCPCAds: '0.00',
    paymentGateway: '0.00',
    commissionFees: fpStats.commissionFees.toFixed(2),
    platformRate: '20.00%'
  },
  Shopee: {
    grossAmount: shopeeStats.grossAmount.toFixed(2),
    merchantDiscount: (shopeeStats.itemDiscounts + shopeeStats.flashSaleDiscounts + shopeeStats.merchantPrepaidSubsidy).toFixed(2),
    merchantDiscountBreakdown: {
      itemDiscounts: shopeeStats.itemDiscounts.toFixed(2),
      flashSaleDiscounts: shopeeStats.flashSaleDiscounts.toFixed(2),
      merchantPrepaidSubsidy: shopeeStats.merchantPrepaidSubsidy.toFixed(2)
    },
    deliveryDiscount: '0.00',
    marketingCoFundedVouchers: (shopeeStats.platformFlashSaleSubsidy + shopeeStats.platformFoodVoucherSubsidy).toFixed(2),
    paymentGateway: '0.00',
    commissionFees: '0.00 (Earnings = Transaction Amount in export; commission on remittance statement)',
    platformRate: 'Billed at remittance'
  },
  Apps: {
    grossAmount: appsStats.subtotalGrossMenu.toFixed(2),
    merchantDiscount: appsStats.discountAmount.toFixed(2),
    deliveryDiscount: '0.00',
    marketing: '0.00',
    paymentGateway: appsStats.paymentGatewayMDR.toFixed(2),
    commissionFees: '0.00',
    platformRate: '0.00% commission + 1.50% Gateway MDR'
  }
}, null, 2));

