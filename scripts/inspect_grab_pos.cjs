const XLSX = require('xlsx');
const path = require('path');
const datasourceDir = path.resolve(__dirname, '../datasource');

function inspectGrab() {
  const wb = XLSX.readFile(path.join(datasourceDir, 'GRAB Aug sales.xlsx'), { sheetRows: 5 });
  console.log('Grab Sheets:', wb.SheetNames);
  for (const s of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: null });
    console.log(`Sheet: ${s}`);
    console.log('Header Row (Row 1):', rows[0]);
    console.log('Sample Row 2:', rows[1]);
  }
}

function inspectPOS() {
  const posDir = path.join(datasourceDir, 'POS SALES');
  const wb = XLSX.readFile(path.join(posDir, 'Sales Details Report 04-Sep-2026_1 (1).xlsx'), { sheetRows: 15 });
  const s = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: null });
  console.log('\nPOS Row 6 (Header):', rows[5]);
  console.log('POS Row 9 (Sample Item):', rows[8]);
}

inspectGrab();
inspectPOS();
