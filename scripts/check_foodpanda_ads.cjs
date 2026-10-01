const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const fpDir = path.resolve(__dirname, '../datasource/FOODPANDA');
const fpFiles = fs.readdirSync(fpDir).filter(f => f.endsWith('.xlsx'));

const targetRows = [];

for (const file of fpFiles) {
  const wb = XLSX.readFile(path.join(fpDir, file));
  const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('appendix a')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) continue;
  const rows = XLSX.utils.sheet_to_json(sheet);
  for (const r of rows) {
    const targeting = Number(r['Customer Targeting Fee'] || 0);
    const pandabox = Number(r['Pandabox Fee Paid By Vendor'] || 0);
    if (targeting > 0 || pandabox > 0) {
      targetRows.push({
        file,
        outlet: r['Outlet Name'],
        vendorCode: r['Vendor Code'],
        orderDate: r['Order Date'],
        targeting,
        pandabox
      });
    }
  }
}

console.log(`Found ${targetRows.length} Foodpanda orders with advertising / targeting fees.`);
targetRows.forEach(t => {
  console.log(`Outlet: "${t.outlet}" | Targeting Fee: RM ${t.targeting} | Pandabox Fee: RM ${t.pandabox} | File: ${t.file}`);
});
