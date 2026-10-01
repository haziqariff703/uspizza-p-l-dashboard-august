const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const mapContent = fs.readFileSync(path.resolve(__dirname, '../src/data/outletNameMap.ts'), 'utf8');

const corporateOutlets = [];
const aliasMap = new Map();

const blocks = mapContent.split(/code:\s*'([^']+)'/g);
for (let i = 1; i < blocks.length; i += 2) {
  const code = blocks[i];
  const block = blocks[i + 1];
  const nameMatch = block.match(/name:\s*'([^']+)'/);
  const name = nameMatch ? nameMatch[1] : code;
  corporateOutlets.push({ code, name });
  const m = block.match(/pos:\s*\[([^\]]+)\]/);
  if (m) {
    const items = [...m[1].matchAll(/'([^']*)'/g)].map(mm => mm[1]);
    items.forEach(a => aliasMap.set(a.trim().toLowerCase(), code));
  }
}

console.log('Corporate outlets:', corporateOutlets.length, '| POS aliases:', aliasMap.size);

function normalize(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/^\d+[a-z]*-/i, '')
    .replace(/[’']/g, '').replace(/[().,]/g, '').replace(/\s+/g, ' ').trim();
}

function matchOutlet(rawHeader) {
  const cleanedFull = rawHeader.replace(/^\d+[a-zA-Z]*-/, '').trim().toLowerCase();
  if (aliasMap.has(cleanedFull)) return aliasMap.get(cleanedFull);
  const norm = normalize(rawHeader);
  for (const [alias, code] of aliasMap.entries()) {
    if (normalize(alias) === norm) return code;
  }
  return null;
}

const posDir = path.resolve(__dirname, '../datasource/POS SALES');
const files = fs.readdirSync(posDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

const perOutlet = {};
const unmatchedOutlets = new Set();
let totalItemRows = 0;
let matchedItemRows = 0;

for (const file of files) {
  console.log('Reading', file);
  const wb = XLSX.readFile(path.join(posDir, file));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let currentCode = null;
  let currentRaw = null;

  for (const row of rows) {
    if (!row || row.length === 0) continue;
    const col0 = row[0];
    // Item data row: col0 is null/empty, col1 has "SKU-Name"
    if ((col0 === null || col0 === undefined || col0 === '') && row[1]) {
      if (!currentCode) continue;
      totalItemRows++;
      const grossAmountExcl = Number(row[2] || 0); // Gross Amount Excl. (pre-discount, pre-tax)
      const netSalesWithCharges = Number(row[8] || 0); // Net Sales (With Charges)
      const netSales = Number(row[4] || 0); // Net Sales
      const invCost = Number(row[10] || 0); // Inventory Cost
      const stdCost = Number(row[11] || 0); // Std. Cost
      const grossProfit = Number(row[14] || 0); // Gross Profit (Std cost basis)
      const grossProfitActual = Number(row[16] || 0); // Gross Profit (Actual / inv cost basis)
      const grossSalesInclusive = Number(row[7] || 0); // Gross Sales (All Incl.)
      const discount = Number(row[3] || 0);
      const tax = Number(row[5] || 0);
      const charge = Number(row[6] || 0);

      matchedItemRows++;
      if (!perOutlet[currentCode]) {
        perOutlet[currentCode] = {
          grossAmountExcl: 0, netSales: 0, netSalesWithCharges: 0, grossSalesInclusive: 0,
          discount: 0, tax: 0, charge: 0,
          invCost: 0, stdCost: 0, grossProfit: 0, grossProfitActual: 0,
        };
      }
      const o = perOutlet[currentCode];
      o.grossAmountExcl += grossAmountExcl;
      o.netSales += netSales;
      o.netSalesWithCharges += netSalesWithCharges;
      o.grossSalesInclusive += grossSalesInclusive;
      o.discount += discount;
      o.tax += tax;
      o.charge += charge;
      o.invCost += invCost;
      o.stdCost += stdCost;
      o.grossProfit += grossProfit;
      o.grossProfitActual += grossProfitActual;
      continue;
    }

    // Header rows: either date "01/08/2026 " or outlet "001-US Pizza Kelana Jaya"
    if (typeof col0 === 'string') {
      const isDate = /^\d{2}\/\d{2}\/\d{4}/.test(col0.trim());
      if (isDate) continue;
      const isOutletHeader = /^\d+[A-Za-z]*-/.test(col0.trim());
      if (isOutletHeader) {
        currentRaw = col0.trim();
        currentCode = matchOutlet(currentRaw);
        if (!currentCode) unmatchedOutlets.add(currentRaw);
      }
    }
  }
}

console.log('\nTotal item rows:', totalItemRows, 'Matched:', matchedItemRows);
console.log('Matched outlets:', Object.keys(perOutlet).length, 'of 46');
console.log('Unmatched outlet headers:', [...unmatchedOutlets]);

let totals = {
  grossAmountExcl: 0, netSales: 0, netSalesWithCharges: 0, grossSalesInclusive: 0,
  discount: 0, tax: 0, charge: 0,
  invCost: 0, stdCost: 0, grossProfit: 0, grossProfitActual: 0,
};
for (const code of Object.keys(perOutlet)) {
  const o = perOutlet[code];
  for (const k of Object.keys(totals)) totals[k] += o[k];
}

console.log('\n=== POS TOTALS (46-outlet corporate scope) ===');
for (const [k, v] of Object.entries(totals)) {
  console.log(k, '=', v.toFixed(2));
}

fs.writeFileSync(
  path.resolve(__dirname, '../datasource/_audit/pos_per_outlet_august.json'),
  JSON.stringify({ perOutlet, totals, unmatchedOutlets: [...unmatchedOutlets] }, null, 2)
);
console.log('\nWrote datasource/_audit/pos_per_outlet_august.json');
