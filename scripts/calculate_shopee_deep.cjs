const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const shopeeDir = path.resolve(__dirname, '../datasource/SHOPEE');
const summaryPath = path.resolve(__dirname, '../datasource/August 2026 Platform Sales Summary.xlsx');

console.log('=== SHOPEE AUG SALES (Shopee Aug Sales.xlsx) ===');
const wbAug = XLSX.readFile(path.join(shopeeDir, 'Shopee Aug Sales.xlsx'));
const sheetAug = wbAug.Sheets[wbAug.SheetNames[0]];
const rowsAug = XLSX.utils.sheet_to_json(sheetAug);

let stats = {
  totalRows: rowsAug.length,
  completedRows: 0,
  cancelledRows: 0,
  otherRows: 0,
  
  // Amounts for completed rows
  foodOriginalPrice: 0,
  itemDiscounts: 0,
  flashSaleDiscount: 0,
  surchargeFee: 0,
  merchantPrepaidSubsidy: 0,
  platformFlashSaleSubsidy: 0,
  foodVoucherSubsidy: 0,
  merchantGroupOrderFrameDiscountSubsidy: 0,
  foodDirectDiscount: 0,
  transactionAmount: 0,
  earnings: 0,
  cheapMealPrice: 0
};

// Store-level map
const storeMap = new Map();

for (const r of rowsAug) {
  const status = r['Order Status'];
  if (status === 'Completed') {
    stats.completedRows++;
    const gross = Number(r['Food original price'] || 0);
    const itemDisc = Number(r['Item discounts'] || 0);
    const flashDisc = Number(r['Flash sale discount'] || 0);
    const surcharge = Number(r['Surcharge fee'] || 0);
    const merchPrepaid = Number(r['Merchant Prepaid Subsidy'] || 0);
    const platFlash = Number(r['Platform Flash Sale Subsidy'] || 0);
    const foodVoucher = Number(r['Food Voucher Subsidy'] || 0);
    const merchGroup = Number(r['Merchant Group Order Frame Discount Subsidy'] || 0);
    const foodDirect = Number(r['Food Direct Discount'] || 0);
    const transAmt = Number(r['Transaction Amount'] || 0);
    const earn = Number(r['Earnings'] || 0);
    
    stats.foodOriginalPrice += gross;
    stats.itemDiscounts += itemDisc;
    stats.flashSaleDiscount += flashDisc;
    stats.surchargeFee += surcharge;
    stats.merchantPrepaidSubsidy += merchPrepaid;
    stats.platformFlashSaleSubsidy += platFlash;
    stats.foodVoucherSubsidy += foodVoucher;
    stats.merchantGroupOrderFrameDiscountSubsidy += merchGroup;
    stats.foodDirectDiscount += foodDirect;
    stats.transactionAmount += transAmt;
    stats.earnings += earn;

    const store = r['Store Name'] || 'Unknown';
    const curr = storeMap.get(store) || { count: 0, gross: 0, transAmt: 0, earnings: 0 };
    curr.count++;
    curr.gross += gross;
    curr.transAmt += transAmt;
    curr.earnings += earn;
    storeMap.set(store, curr);
  } else if (status === 'Cancelled') {
    stats.cancelledRows++;
  } else {
    stats.otherRows++;
  }
}

console.log('Row Status Breakdown:', {
  total: stats.totalRows,
  completed: stats.completedRows,
  cancelled: stats.cancelledRows,
  other: stats.otherRows
});

console.log('\n--- All Numerical Column Sums (Completed Orders) ---');
console.log('Food original price (Gross Sales): RM', stats.foodOriginalPrice.toFixed(2));
console.log('Item discounts: RM', stats.itemDiscounts.toFixed(2));
console.log('Flash sale discount: RM', stats.flashSaleDiscount.toFixed(2));
console.log('Food Direct Discount: RM', stats.foodDirectDiscount.toFixed(2));
console.log('Merchant Prepaid Subsidy: RM', stats.merchantPrepaidSubsidy.toFixed(2));
console.log('Platform Flash Sale Subsidy: RM', stats.platformFlashSaleSubsidy.toFixed(2));
console.log('Food Voucher Subsidy: RM', stats.foodVoucherSubsidy.toFixed(2));
console.log('Merchant Group Order Frame Discount Subsidy: RM', stats.merchantGroupOrderFrameDiscountSubsidy.toFixed(2));
console.log('Surcharge fee: RM', stats.surchargeFee.toFixed(2));
console.log('Transaction Amount (Customer Paid / Collected): RM', stats.transactionAmount.toFixed(2));
console.log('Earnings (Payout in this export): RM', stats.earnings.toFixed(2));

// Section 2 Derivations:
const sstRate = 6 / 106;
const derivedSST = stats.transactionAmount * sstRate;
const derivedNetSales = stats.transactionAmount - derivedSST;
const derivedTotalDiscount = stats.foodOriginalPrice - derivedNetSales;

console.log('\n--- Section 2 Derivations for Shopee ---');
console.log('1. Gross Menu Sales: RM', stats.foodOriginalPrice.toFixed(2));
console.log('2. Customer Discounts (Gross - Net): RM', derivedTotalDiscount.toFixed(2));
console.log('3. Net Sales (Pre-Tax): RM', derivedNetSales.toFixed(2));
console.log('4. Service Charge (10%): RM 0.00 (Shopee has no service charge column)');
console.log('5. Tax (SST 6% inside transaction amount): RM', derivedSST.toFixed(2));
console.log('6. Collected Sales (Net + SST): RM', stats.transactionAmount.toFixed(2));
console.log('7. Platform Commission: RM 0.00 (Order export carries 0 commission; remittance statement required for commission)');
console.log('8. Advertising Spend: RM', (stats.platformFlashSaleSubsidy + stats.foodVoucherSubsidy).toFixed(2), '(Co-funded subsidies)');
console.log('9. Payment Gateway: RM 0.00');
console.log('10. Adjustments: RM 0.00');
console.log('11. Net Payout (Earnings): RM', stats.earnings.toFixed(2));
console.log('12. % Kept: ' + ((stats.earnings / stats.foodOriginalPrice) * 100).toFixed(2) + '% of Gross');

// Check other Shopee files (July files)
console.log('\n=== CHECKING JULY SHOPEE FILES ===');
['US_PIZZA_JULY01.xlsx', 'US_PIZZA_JULY02.xlsx'].forEach(f => {
  const p = path.join(shopeeDir, f);
  if (fs.existsSync(p)) {
    const wb = XLSX.readFile(p);
    console.log(`\nFile: ${f} | Sheets: ${wb.SheetNames}`);
    const s = wb.Sheets[wb.SheetNames[0]];
    const r = XLSX.utils.sheet_to_json(s, { header: 1 });
    console.log(`Rows: ${r.length} | Header:`, r[0].slice(0, 10));
  }
});
