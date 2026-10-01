const XLSX = require('xlsx');
const path = require('path');

const p = path.resolve(__dirname, '../datasource/SHOPEE/US_PIZZA_JULY02.xlsx');
const wb = XLSX.readFile(p);
console.log('Sheets:', wb.SheetNames);
const s = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(s);
console.log('Total rows:', rows.length);
console.log('Sample row 1:', rows[0]);
console.log('Sample row 2:', rows[1]);

// Check transaction types
const types = new Map();
let totalAmt = 0;
for (const r of rows) {
  const t = r['Transaction Type'] || 'Unknown';
  types.set(t, (types.get(t) || 0) + 1);
  totalAmt += Number(r['Amount'] || r['Transaction Amount'] || r['Net Amount'] || 0);
}
console.log('Transaction Types:', Object.fromEntries(types));
console.log('Total Amount:', totalAmt);
