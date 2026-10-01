const XLSX = require('xlsx');
const path = require('path');
const datasourceDir = path.resolve(__dirname, '../datasource');

// 1. Grab
const wbGrab = XLSX.readFile(path.join(datasourceDir, 'GRAB Aug sales.xlsx'));
const grabRows = XLSX.utils.sheet_to_json(wbGrab.Sheets[wbGrab.SheetNames[0]]);

let grabFeeSum = 0;
let pkgChargeSum = 0;
let nonMemberSum = 0;
let deliveryChargeGrab = 0;
let grabExpress = 0;

for (const r of grabRows) {
  grabFeeSum += Number(r['Grab Fee'] || 0);
  pkgChargeSum += Number(r['Restaurant Packaging Charge'] || 0);
  nonMemberSum += Number(r['Non-Member Fee'] || 0);
  deliveryChargeGrab += Number(r['Delivery Charge (Grab Online Store)'] || 0);
  grabExpress += Number(r['GrabExpress Delivery Service Fee'] || 0);
}

console.log('--- GRAB SERVICE & PLATFORM FEES (All Rows) ---');
console.log('Grab Fee:', grabFeeSum);
console.log('Restaurant Packaging Charge:', pkgChargeSum);
console.log('Non-Member Fee:', nonMemberSum);
console.log('Delivery Charge (Grab Online Store):', deliveryChargeGrab);
console.log('GrabExpress Delivery Service Fee:', grabExpress);

// 2. Shopee
const wbShopee = XLSX.readFile(path.join(datasourceDir, 'SHOPEE/Shopee Aug Sales.xlsx'));
const shopeeRows = XLSX.utils.sheet_to_json(wbShopee.Sheets[wbShopee.SheetNames[0]]);
let shopeeSurcharge = 0;
for (const r of shopeeRows) {
  shopeeSurcharge += Number(r['Surcharge fee'] || 0);
}
console.log('\n--- SHOPEE (All Rows) ---');
console.log('Surcharge fee:', shopeeSurcharge);

// 3. Foodpanda
const fs = require('fs');
const fpDir = path.join(datasourceDir, 'FOODPANDA');
const fpFiles = fs.readdirSync(fpDir).filter(f => f.endsWith('.xlsx'));
let fpWaitingTime = 0;
let fpPackaging = 0;
let fpMOV = 0;
for (const f of fpFiles) {
  const wb = XLSX.readFile(path.join(fpDir, f));
  const s = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(s);
  for (const r of rows) {
    fpWaitingTime += Number(r['Waiting Time Fee'] || 0);
    fpPackaging += Number(r['Packaging Fees Paid By Customer'] || 0);
    fpMOV += Number(r['MOV Paid By Customer'] || 0);
  }
}
console.log('\n--- FOODPANDA (All Rows) ---');
console.log('Waiting Time Fee:', fpWaitingTime);
console.log('Packaging Fees Paid By Customer:', fpPackaging);
console.log('MOV Paid By Customer:', fpMOV);
