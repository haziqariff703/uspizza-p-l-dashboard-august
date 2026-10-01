const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const shopeeDir = path.resolve(__dirname, '../datasource/SHOPEE');
const files = fs.readdirSync(shopeeDir).filter(f => !f.startsWith('~$') && (f.endsWith('.xlsx') || f.endsWith('.csv')));

console.log('Shopee files found:', files);

for (const file of files) {
  const filePath = path.join(shopeeDir, file);
  console.log('\n======================================================');
  console.log(`FILE: ${file}`);
  try {
    const wb = XLSX.readFile(filePath);
    console.log('Sheets:', wb.SheetNames);
    for (const sheetName of wb.SheetNames) {
      console.log(`\n--- Sheet: [${sheetName}] ---`);
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      console.log(`Total rows: ${rows.length}`);
      if (rows.length > 0) {
        console.log('Header / Row 1:', rows[0].slice(0, 15));
        if (rows.length > 1) console.log('Sample Row 2:', rows[1].slice(0, 15));
      }
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
}
