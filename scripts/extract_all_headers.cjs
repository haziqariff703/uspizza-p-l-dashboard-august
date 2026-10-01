const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const datasourceDir = path.resolve(__dirname, '../datasource');

function getAllHeaders(filePath) {
  const wb = XLSX.readFile(filePath, { sheetRows: 30 });
  const result = {};
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    // find header row: row with most non-null strings
    let bestHeader = [];
    let bestIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const r = rows[i] || [];
      const stringCount = r.filter(c => typeof c === 'string' && c.trim().length > 0).length;
      if (stringCount > bestHeader.length) {
        bestHeader = r;
        bestIndex = i;
      }
    }
    result[name] = {
      headerRowIndex: bestIndex + 1,
      headers: bestHeader.map((h, i) => ({ colIndex: i, name: h })),
      sampleRow: rows[bestIndex + 1] || []
    };
  }
  return result;
}

console.log('=== GRAB ===');
console.log(JSON.stringify(getAllHeaders(path.join(datasourceDir, 'GRAB Aug sales.xlsx')), null, 2));

console.log('\n=== APPS ===');
console.log(JSON.stringify(getAllHeaders(path.join(datasourceDir, 'APPS AUG ORDER LIST.xlsx')), null, 2));

console.log('\n=== FOODPANDA ===');
const fpDir = path.join(datasourceDir, 'FOODPANDA');
const fpFile = fs.readdirSync(fpDir).find(f => f.endsWith('.xlsx'));
console.log('Foodpanda file:', fpFile);
console.log(JSON.stringify(getAllHeaders(path.join(fpDir, fpFile)), null, 2));

console.log('\n=== SHOPEE ===');
const shopeeDir = path.join(datasourceDir, 'SHOPEE');
const shopeeFile = fs.readdirSync(shopeeDir).find(f => f.endsWith('.xlsx') || f.endsWith('.csv'));
console.log('Shopee file:', shopeeFile);
console.log(JSON.stringify(getAllHeaders(path.join(shopeeDir, shopeeFile)), null, 2));

console.log('\n=== POS ===');
const posDir = path.join(datasourceDir, 'POS SALES');
const posFile = fs.readdirSync(posDir).find(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'));
console.log('POS file:', posFile);
console.log(JSON.stringify(getAllHeaders(path.join(posDir, posFile)), null, 2));
