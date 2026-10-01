const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const datasourceDir = path.resolve(__dirname, '../datasource');
const outletMasterPath = path.resolve(__dirname, '../src/data/outletMaster.ts');

// Read outlet master to identify sister brands and canonical outlets
const masterContent = fs.readFileSync(outletMasterPath, 'utf8');

function inspectStoresInFile(label, filePath, storeColName, amountColName, statusColName, completedVal) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  const stores = new Map();
  let totalRows = 0;
  let sisterBrandRows = 0;
  let totalAmount = 0;
  let usPizzaAmount = 0;
  let sisterBrandAmount = 0;

  for (const r of rows) {
    if (statusColName && r[statusColName] !== completedVal) continue;
    totalRows++;
    const store = (r[storeColName] || 'Unknown').trim();
    const amt = Number(r[amountColName] || 0);
    totalAmount += amt;

    const isSister = store.toLowerCase().includes('manhattan') || store.toLowerCase().includes('marshall');
    if (isSister) {
      sisterBrandRows++;
      sisterBrandAmount += amt;
    } else {
      usPizzaAmount += amt;
    }

    const curr = stores.get(store) || { count: 0, sum: 0, isSister };
    curr.count++;
    curr.sum += amt;
    stores.set(store, curr);
  }

  console.log(`\n======================================================`);
  console.log(`PLATFORM: ${label}`);
  console.log(`Total Unique Stores Found: ${stores.size}`);
  console.log(`Total Gross Amount: RM ${totalAmount.toFixed(2)}`);
  console.log(`US Pizza Corporate Amount: RM ${usPizzaAmount.toFixed(2)}`);
  console.log(`Sister Brands (e.g. Manhattan/Marshall's) Excluded: RM ${sisterBrandAmount.toFixed(2)} (${sisterBrandRows} rows)`);
  
  console.log('\nSample Stores Found:');
  const storeList = [...stores.entries()].sort((a,b) => b[1].sum - a[1].sum);
  storeList.slice(0, 15).forEach(([name, data], idx) => {
    console.log(`  ${idx + 1}. [${data.isSister ? 'SISTER BRAND' : 'US PIZZA'}] ${name}: RM ${data.sum.toFixed(2)} (${data.count} txns)`);
  });

  // Check Sabah stores
  const sabahStores = storeList.filter(([name]) => 
    name.toLowerCase().includes('bundusan') || 
    name.toLowerCase().includes('inanam') || 
    name.toLowerCase().includes('sabah') ||
    name.toLowerCase().includes('kuching') ||
    name.toLowerCase().includes('viva')
  );
  console.log('\nSabah / East Malaysia Stores Found in this file:');
  sabahStores.forEach(([name, data]) => {
    console.log(`  • ${name}: RM ${data.sum.toFixed(2)} (${data.count} txns)`);
  });
}

// 1. Shopee
inspectStoresInFile('SHOPEE', path.join(datasourceDir, 'SHOPEE/Shopee Aug Sales.xlsx'), 'Store Name', 'Food original price', 'Order Status', 'Completed');

// 2. Grab
inspectStoresInFile('GRAB', path.join(datasourceDir, 'GRAB Aug sales.xlsx'), 'Store Name', 'Amount', 'Category', 'Payment');

// 3. Apps
inspectStoresInFile('APPS', path.join(datasourceDir, 'APPS AUG ORDER LIST.xlsx'), 'Outlet Name', 'Subtotal (RM)', 'Payment Status', 'Paid');
