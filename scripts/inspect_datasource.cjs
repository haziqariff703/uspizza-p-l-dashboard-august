const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const datasourceDir = path.resolve(__dirname, '../datasource');

function inspectFile(filePath) {
  console.log('\n================================================================');
  console.log('FILE:', path.basename(filePath));
  console.log('FULL PATH:', filePath);
  try {
    const workbook = XLSX.readFile(filePath, { sheetRows: 15 });
    console.log('SHEETS:', workbook.SheetNames);
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n--- SHEET: [${sheetName}] ---`);
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      if (!rows || rows.length === 0) {
        console.log('  (Empty)');
        continue;
      }
      rows.slice(0, 10).forEach((r, idx) => {
        // filter out trailing nulls for cleaner output
        const nonNulls = r ? r.map((c, i) => `[Col ${i}]: ${c}`).slice(0, 12) : [];
        console.log(`  Row ${idx + 1} (${r ? r.length : 0} cols):`, JSON.stringify(nonNulls));
      });
    }
  } catch (err) {
    console.error('Error inspecting:', err.message);
  }
}

// 1. Grab
inspectFile(path.join(datasourceDir, 'GRAB Aug sales.xlsx'));

// 2. Apps
inspectFile(path.join(datasourceDir, 'APPS AUG ORDER LIST.xlsx'));

// 3. FoodPanda
const fpDir = path.join(datasourceDir, 'FOODPANDA');
if (fs.existsSync(fpDir)) {
  const fpFiles = fs.readdirSync(fpDir).filter(f => f.endsWith('.xlsx'));
  if (fpFiles.length > 0) {
    inspectFile(path.join(fpDir, fpFiles[0]));
  }
}

// 4. Shopee
const shopeeDir = path.join(datasourceDir, 'SHOPEE');
if (fs.existsSync(shopeeDir)) {
  const shopeeFiles = fs.readdirSync(shopeeDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.csv'));
  if (shopeeFiles.length > 0) {
    inspectFile(path.join(shopeeDir, shopeeFiles[0]));
  }
}

// 5. POS Sales
const posDir = path.join(datasourceDir, 'POS SALES');
if (fs.existsSync(posDir)) {
  const posFiles = fs.readdirSync(posDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'));
  if (posFiles.length > 0) {
    inspectFile(path.join(posDir, posFiles[0]));
  }
}

// 6. Summary / other files
inspectFile(path.join(datasourceDir, 'August 2026 Platform Sales Summary.xlsx'));
