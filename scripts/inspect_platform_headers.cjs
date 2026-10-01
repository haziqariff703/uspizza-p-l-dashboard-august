const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const datasourceDir = path.resolve(__dirname, '../datasource');

function inspectPlatformFile(label, filePath) {
  console.log(`\n======================================================`);
  console.log(`PLATFORM: ${label}`);
  console.log(`FILE: ${path.basename(filePath)}`);
  const workbook = XLSX.readFile(filePath, { sheetRows: 25 });
  console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    console.log(`\n--- Sheet: [${sheetName}] (Total preview rows: ${rows.length}) ---`);
    rows.slice(0, 15).forEach((r, idx) => {
      // Find non-null values
      const cols = r.map((c, i) => c !== null && c !== undefined && c !== '' ? `[Col ${i}]: "${c}"` : null).filter(Boolean);
      if (cols.length > 0) {
        console.log(`  Row ${idx + 1}: ${cols.slice(0, 15).join(' | ')}`);
      }
    });
  }
}

// 1. Grab
inspectPlatformFile('GRAB', path.join(datasourceDir, 'GRAB Aug sales.xlsx'));

// 2. Apps
inspectPlatformFile('APPS', path.join(datasourceDir, 'APPS AUG ORDER LIST.xlsx'));

// 3. Foodpanda
const fpDir = path.join(datasourceDir, 'FOODPANDA');
const fpFile = fs.readdirSync(fpDir).find(f => f.endsWith('.xlsx'));
if (fpFile) inspectPlatformFile('FOODPANDA', path.join(fpDir, fpFile));

// 4. Shopee
const shopeeDir = path.join(datasourceDir, 'SHOPEE');
const shopeeFile = fs.readdirSync(shopeeDir).find(f => f.endsWith('.xlsx') || f.endsWith('.csv'));
if (shopeeFile) inspectPlatformFile('SHOPEE', path.join(shopeeDir, shopeeFile));

// 5. POS
const posDir = path.join(datasourceDir, 'POS SALES');
const posFile = fs.readdirSync(posDir).find(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'));
if (posFile) inspectPlatformFile('POS', path.join(posDir, posFile));
