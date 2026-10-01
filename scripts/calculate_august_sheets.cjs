const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const datasourceDir = path.resolve(__dirname, '../datasource');

function round(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// 1. Calculate GRAB
function calculateGrab() {
  const filePath = path.join(datasourceDir, 'GRAB Aug sales.xlsx');
  console.log('\n--- CALCULATING GRAB (GRAB Aug sales.xlsx) ---');
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  let grossSales = 0;
  let netSales = 0;
  let tax = 0;
  let serviceCharge = 0;
  let offer = 0;
  let merchantDiscount = 0;
  let orderCommission = 0;
  let deliveryCommission = 0;
  let channelCommission = 0;
  let netMdr = 0;
  let taxCommission = 0;
  let ads = 0;
  let payout = 0;
  let adjustments = 0;
  
  let paymentRows = 0;
  let adRows = 0;
  let otherRows = 0;

  for (const r of rows) {
    const cat = r['Category'];
    const amount = Number(r['Amount'] || 0);
    const total = Number(r['Total'] || 0);

    if (cat === 'Payment') {
      paymentRows++;
      grossSales += amount;
      netSales += Number(r['Net Sales'] || 0);
      tax += Number(r['Tax on Order Value'] || 0);
      serviceCharge += Number(r['Restaurant Service Charge'] || 0);
      offer += Number(r['Offer'] || 0);
      merchantDiscount += Number(r['Discount (Merchant-Funded)'] || 0);
      orderCommission += Number(r['Order commission'] || 0);
      deliveryCommission += Number(r['Delivery Commission'] || 0);
      channelCommission += Number(r['Channel Commission'] || 0);
      netMdr += Number(r['Net MDR'] || 0);
      taxCommission += Number(r['Tax on GrabFood/GrabMart commission, adjustments, ads'] || 0);
      payout += total;
    } else if (cat === 'Advertisement') {
      adRows++;
      ads += Math.abs(amount);
      payout += total;
    } else {
      otherRows++;
      adjustments += total;
    }
  }

  const totalCommission = orderCommission + deliveryCommission + channelCommission;
  const totalDiscounts = offer + merchantDiscount;
  const totalFees = totalCommission + netMdr + Math.abs(taxCommission);

  console.log(`Rows: ${rows.length} (Payment: ${paymentRows}, Ads: ${adRows}, Other: ${otherRows})`);
  console.log(`Gross Sales (Amount): RM ${grossSales.toLocaleString()}`);
  console.log(`Net Sales: RM ${netSales.toLocaleString()}`);
  console.log(`Tax (SST): RM ${tax.toLocaleString()}`);
  console.log(`Discounts (Offer + Merchant): RM ${totalDiscounts.toLocaleString()}`);
  console.log(`Commission (Order + Delivery + Channel): RM ${totalCommission.toLocaleString()}`);
  console.log(`Net MDR (Payment Gateway): RM ${netMdr.toLocaleString()}`);
  console.log(`Tax on Commission: RM ${Math.abs(taxCommission).toLocaleString()}`);
  console.log(`Advertising Spend: RM ${ads.toLocaleString()}`);
  console.log(`Payout (Total): RM ${payout.toLocaleString()}`);
  
  return {
    platform: 'Grab',
    grossSales,
    netSales,
    tax,
    discounts: totalDiscounts,
    commission: totalCommission,
    advertising: ads,
    paymentGateway: netMdr,
    taxOnCommission: Math.abs(taxCommission),
    payout
  };
}

// 2. Calculate APPS
function calculateApps() {
  const filePath = path.join(datasourceDir, 'APPS AUG ORDER LIST.xlsx');
  console.log('\n--- CALCULATING APPS (APPS AUG ORDER LIST.xlsx) ---');
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  let subtotal = 0;
  let taxCombined = 0;
  let deliveryFee = 0;
  let grandTotal = 0;
  let completedCount = 0;

  for (const r of rows) {
    if (r['Status'] === 'Completed' && r['Payment Status'] === 'Paid') {
      completedCount++;
      subtotal += Number(r['Subtotal (RM)'] || 0);
      taxCombined += Number(r['Tax (RM)'] || 0);
      deliveryFee += Number(r['Delivery Fee (RM)'] || 0);
      grandTotal += Number(r['Grand Total (RM)'] || 0);
    }
  }

  console.log(`Completed & Paid Orders: ${completedCount}`);
  console.log(`Subtotal (Gross): RM ${subtotal.toLocaleString()}`);
  console.log(`Tax Combined (10% SC + 6% SST): RM ${taxCombined.toLocaleString()}`);
  console.log(`Delivery Fee: RM ${deliveryFee.toLocaleString()}`);
  console.log(`Grand Total (Collected): RM ${grandTotal.toLocaleString()}`);

  return {
    platform: 'Apps',
    grossSales: subtotal,
    taxCombined,
    deliveryFee,
    collected: grandTotal
  };
}

// 3. Calculate SHOPEE
function calculateShopee() {
  const shopeeDir = path.join(datasourceDir, 'SHOPEE');
  const shopeeFiles = fs.readdirSync(shopeeDir).filter(f => f.endsWith('.xlsx'));
  console.log('\n--- CALCULATING SHOPEE (SHOPEE) ---');
  let gross = 0;
  let transactionAmount = 0;
  let earnings = 0;
  let count = 0;

  for (const file of shopeeFiles) {
    const wb = XLSX.readFile(path.join(shopeeDir, file));
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    for (const r of rows) {
      if (r['Order Status'] === 'Completed') {
        count++;
        gross += Number(r['Food original price'] || 0);
        transactionAmount += Number(r['Transaction Amount'] || 0);
        earnings += Number(r['Earnings'] || 0);
      }
    }
  }

  const sst6pct = transactionAmount * (6 / 106);
  const netSales = transactionAmount - sst6pct;
  const discounts = gross - netSales;

  console.log(`Completed Orders: ${count}`);
  console.log(`Gross Sales (Food original price): RM ${gross.toLocaleString()}`);
  console.log(`Transaction Amount (Collected): RM ${transactionAmount.toLocaleString()}`);
  console.log(`Derived SST (6% inside Transaction Amount): RM ${sst6pct.toLocaleString()}`);
  console.log(`Derived Net Sales: RM ${netSales.toLocaleString()}`);
  console.log(`Discounts: RM ${discounts.toLocaleString()}`);
  console.log(`Earnings (Payout): RM ${earnings.toLocaleString()}`);

  return {
    platform: 'Shopee',
    grossSales: gross,
    collected: transactionAmount,
    tax: sst6pct,
    netSales,
    discounts,
    earnings
  };
}

// 4. Calculate FOODPANDA
function calculateFoodpanda() {
  const fpDir = path.join(datasourceDir, 'FOODPANDA');
  const fpFiles = fs.readdirSync(fpDir).filter(f => f.endsWith('.xlsx'));
  console.log('\n--- CALCULATING FOODPANDA (FOODPANDA) ---');
  console.log(`Total Foodpanda xlsx files found: ${fpFiles.length}`);

  let customerPaid = 0;
  let restaurantRevenue = 0;
  let sstRevenue = 0;
  let commission = 0;
  let sstCommission = 0;
  let targetingFee = 0;
  let pandaboxFee = 0;
  let payable = 0;
  let totalOrders = 0;

  for (const file of fpFiles) {
    const wb = XLSX.readFile(path.join(fpDir, file));
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('appendix a')) || wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json(sheet);
    for (const r of rows) {
      totalOrders++;
      customerPaid += Number(r['Products Value Paid By Customer'] || 0);
      restaurantRevenue += Number(r['Restaurant Revenue'] || 0);
      sstRevenue += Number(r['SST On Restaurant Revenue'] || 0);
      commission += Number(r['foodpanda Commission'] || 0);
      sstCommission += Number(r['SST on foodpanda commission'] || 0);
      targetingFee += Number(r['Customer Targeting Fee'] || 0);
      pandaboxFee += Number(r['Pandabox Fee Paid By Vendor'] || 0);
      payable += Number(r['Payable Amount'] || 0);
    }
  }

  const netSales = restaurantRevenue - sstRevenue;
  const discounts = customerPaid - netSales;
  const ads = targetingFee + pandaboxFee;

  console.log(`Total Orders Processed: ${totalOrders}`);
  console.log(`Gross Sales (Products Value Paid By Customer): RM ${customerPaid.toLocaleString()}`);
  console.log(`Restaurant Revenue: RM ${restaurantRevenue.toLocaleString()}`);
  console.log(`Net Sales (Revenue - SST): RM ${netSales.toLocaleString()}`);
  console.log(`SST On Food: RM ${sstRevenue.toLocaleString()}`);
  console.log(`Discounts: RM ${discounts.toLocaleString()}`);
  console.log(`Commission (foodpanda Commission): RM ${commission.toLocaleString()}`);
  console.log(`SST on Commission (8% fee tax): RM ${sstCommission.toLocaleString()}`);
  console.log(`Ads (Customer Targeting + Pandabox): RM ${ads.toLocaleString()}`);
  console.log(`Payable Amount (Payout): RM ${payable.toLocaleString()}`);

  return {
    platform: 'Foodpanda',
    grossSales: customerPaid,
    netSales,
    tax: sstRevenue,
    discounts,
    commission,
    taxOnCommission: sstCommission,
    advertising: ads,
    payout: payable
  };
}

calculateGrab();
calculateApps();
calculateShopee();
calculateFoodpanda();
