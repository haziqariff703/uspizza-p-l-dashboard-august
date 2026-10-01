const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.resolve(__dirname, '../datasource/SHOPEE/US_PIZZA_JULY01.xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws);

console.log('Total rows in US_PIZZA_JULY01:', rows.length);
console.log('First row status values:');
console.log({
  'Order Status': rows[0]['Order Status'],
  'Settlement Status': rows[0]['Settlement Status']
});

console.log('\nDistinct Order Statuses:', [...new Set(rows.map(r => r['Order Status']))]);
console.log('Distinct Settlement Statuses:', [...new Set(rows.map(r => r['Settlement Status']))]);

for (let i = 0; i < 5; i++) {
  const r = rows[i];
  console.log(`\n================== Order ${i + 1} ==================`);
  console.log({
    storeName: r['Store Name'],
    orderStatus: r['Order Status'],
    settlementStatus: r['Settlement Status'],
    orderAmount: r['Order Amount'],
    foodDirectDiscount: r['Food Direct Discount'],
    merchantFlashSaleSubsidy: r['Merchant Flash Sale Subsidy'],
    merchantPrepaidSubsidy: r['Merchant Prepaid Subsidy'],
    merchantItemVoucher: r['Merchant Item Voucher Subsidy'],
    totalStorePromoSubsidy: r['Total Store Promotion Subsidy'],
    merchantCommission: r['Merchant Commission'],
    taxOnCommission: r['Tax on Commission'],
    programFee: r['Program Fee'],
    taxOnProgramFee: r['Tax on Program Fee'],
    merchantServiceFee: r['Merchant Service Fee'],
    sstAmount: r['SST Amount'],
    netIncome: r['Net Income']
  });

  const gross = Number(r['Order Amount'] || 0);
  const comm = Number(r['Merchant Commission'] || 0);
  const directDisc = Number(r['Food Direct Discount'] || 0);
  const promo = Number(r['Total Store Promotion Subsidy'] || 0);
  const netIncome = Number(r['Net Income'] || 0);
  const taxComm = Number(r['Tax on Commission'] || 0);
  const progFee = Number(r['Program Fee'] || 0);
  const taxProg = Number(r['Tax on Program Fee'] || 0);

  // Let's test commission rate
  console.log('Mathematical checks:');
  console.log('  comm / gross =', (comm / gross * 100).toFixed(2) + '%');
  if (gross - promo > 0) {
    console.log('  comm / (gross - totalStorePromo) =', (comm / (gross - promo) * 100).toFixed(2) + '%');
  }
  if (gross - directDisc > 0) {
    console.log('  comm / (gross - foodDirectDiscount) =', (comm / (gross - directDisc) * 100).toFixed(2) + '%');
  }
  console.log('  taxOnCommission / commission =', (taxComm / comm * 100).toFixed(2) + '% (SST)');
  
  // Net Income check:
  // Is Net Income = (gross - promo) - comm - taxComm - progFee - taxProg?
  const calculatedNet = gross - promo - comm - taxComm - progFee - taxProg;
  console.log('  Gross - Promo - Fees =', calculatedNet.toFixed(2), 'vs Net Income =', netIncome.toFixed(2));
}
