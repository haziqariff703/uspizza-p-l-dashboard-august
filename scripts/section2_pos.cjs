/**
 * POS Sales Calculator for 46 Corporate Outlets — August 2026
 * 
 * POS has NO fee columns (no commission, ads, gateway, adjustments).
 * It is a sales-coverage reference only. This script calculates the
 * sales figures from the POS Sales Details Report files.
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ── Build outlet alias map from OUTLET_NAME_MAP (46 corporate outlets) ──
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

  const posMatch = block.match(/pos:\s*\[([^\]]+)\]/);
  if (posMatch) {
    posMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).forEach(a => {
      aliasMap.set(a.trim().toLowerCase(), code);
    });
  }
}

// POS outlet codes from the filter line: 001 -> MY-001 etc.
// The POS file uses "001-US Pizza Kelana Jaya" format for outlet headers
function matchPosOutlet(outletLine) {
  if (!outletLine) return null;
  const line = outletLine.trim();
  // Try exact match on the POS alias map
  const lower = line.toLowerCase();
  if (aliasMap.has(lower)) return aliasMap.get(lower);
  // Try extracting just the name part after the code prefix
  const dashIdx = line.indexOf('-');
  if (dashIdx > 0) {
    const name = line.slice(dashIdx + 1).trim().toLowerCase();
    if (aliasMap.has(name)) return aliasMap.get(name);
    // Try matching against outlet names
    for (const o of corporateOutlets) {
      if (o.name.toLowerCase() === name) return o.code;
      // Also try the full POS source name
      const posNames = [];
      const block = blocks[corporateOutlets.indexOf(o) * 2 + 2];
      if (block) {
        const m = block.match(/pos:\s*\[([^\]]+)\]/);
        if (m) {
          m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).forEach(a => posNames.push(a.toLowerCase()));
        }
      }
      if (posNames.some(n => n === lower || n === name)) return o.code;
    }
  }
  return null;
}

console.log(`Corporate Outlets in Map: ${corporateOutlets.length}\n`);

// ── Read all POS files ──
const posDir = path.resolve(__dirname, '../datasource/POS SALES');
const posFiles = fs.readdirSync(posDir).filter(f => f.endsWith('.xlsx'));

const posStats = {
  outlets: new Set(),
  unmatchedOutlets: new Set(),
  grossAmountExcl: 0,
  discount: 0,
  netSales: 0,
  tax: 0,
  charge: 0,  // service charge
  grossSalesAllIncl: 0,
  netSalesWithCharges: 0,
  itemQuantity: 0,
};

let totalRows = 0;

for (const file of posFiles) {
  console.log(`Reading: ${file}`);
  const wb = XLSX.readFile(path.join(posDir, file));
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  
  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, rawRows.length); i++) {
    if (rawRows[i] && rawRows[i][0] === 'Group') {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) { console.log('  No header found, skipping'); continue; }
  
  const headers = rawRows[headerIdx];
  const colIdx = {};
  headers.forEach((h, i) => { colIdx[h] = i; });
  
  let currentOutlet = null;
  let currentDate = null;
  
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;
    
    const firstCell = String(row[0] || '').trim();
    
    // Date line: "01/08/2026"
    if (/^\d{2}\/\d{2}\/\d{4}\s*$/.test(firstCell)) {
      currentDate = firstCell.trim();
      continue;
    }
    
    // Outlet header line: "001-US Pizza Kelana Jaya"
    if (firstCell && !row[1] && !firstCell.startsWith('Grand Total') && !firstCell.startsWith('Sub Total') && !/^\d{2}\/\d{2}\/\d{4}/.test(firstCell)) {
      // Could be an outlet header or a subtotal
      if (firstCell.match(/^\d{3}[A-Z]?-/)) {
        currentOutlet = matchPosOutlet(firstCell);
        if (!currentOutlet) {
          posStats.unmatchedOutlets.add(firstCell);
        }
        continue;
      }
    }
    
    // Item data row: has Item in col 1 and numeric values
    if (row[1] && currentOutlet && typeof row[colIdx['Net Sales']] === 'number') {
      totalRows++;
      posStats.outlets.add(currentOutlet);
      posStats.grossAmountExcl += Number(row[colIdx['Gross Amount Excl.']] || 0);
      posStats.discount += Number(row[colIdx['Discount']] || 0);
      posStats.netSales += Number(row[colIdx['Net Sales']] || 0);
      posStats.tax += Number(row[colIdx['Tax']] || 0);
      posStats.charge += Number(row[colIdx['Charge']] || 0);
      posStats.grossSalesAllIncl += Number(row[colIdx['Gross Sales (All Incl.)']] || 0);
      posStats.netSalesWithCharges += Number(row[colIdx['Net Sales (With Charges)']] || 0);
      posStats.itemQuantity += Number(row[colIdx['Item Quantity']] || 0);
    }
  }
}

const rm = (v) => `RM ${Math.abs(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  POS SALES — AUGUST 2026 (46 Corporate Outlets)');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(`Matched Corporate Outlets: ${posStats.outlets.size} of 46`);
console.log(`Total Item Rows: ${totalRows.toLocaleString()}`);
console.log(`Unmatched Outlets: ${posStats.unmatchedOutlets.size}`);
if (posStats.unmatchedOutlets.size > 0) {
  console.log('  Unmatched list:', [...posStats.unmatchedOutlets].join(', '));
}

console.log('\n───────────────────────────────────────────────────────────────');
console.log('POS SALES FIGURES');
console.log('───────────────────────────────────────────────────────────────');
console.log(`  Gross Amount (Excl. Tax):    ${rm(posStats.grossAmountExcl)}`);
console.log(`    File: POS SALES/*.xlsx`);
console.log(`    Formula: Σ 'Gross Amount Excl.' for all item rows in 46 corporate outlets`);
console.log(`  Discount:                    ${rm(posStats.discount)}`);
console.log(`    Formula: Σ 'Discount' column`);
console.log(`  Net Sales:                   ${rm(posStats.netSales)}`);
console.log(`    Formula: Σ 'Net Sales' = Gross Amount Excl. − Discount`);
console.log(`  Tax (SST 6%):                ${rm(posStats.tax)}`);
console.log(`    Formula: Σ 'Tax' column`);
console.log(`  Service Charge:              ${rm(posStats.charge)}`);
console.log(`    Formula: Σ 'Charge' column`);
console.log(`  Gross Sales (All Incl.):     ${rm(posStats.grossSalesAllIncl)}`);
console.log(`    Formula: Σ 'Gross Sales (All Incl.)' = Net Sales + Tax + Charge`);
console.log(`  Net Sales (With Charges):    ${rm(posStats.netSalesWithCharges)}`);
console.log(`    Formula: Σ 'Net Sales (With Charges)' = Net Sales + Charge`);
console.log(`  Item Quantity:               ${posStats.itemQuantity.toLocaleString()}`);

console.log('\n───────────────────────────────────────────────────────────────');
console.log('POS FEE CATEGORIES (Section 2)');
console.log('───────────────────────────────────────────────────────────────');
console.log(`  Commission:            RM 0.00  (POS is not a 3rd-party platform)`);
console.log(`  Advertising:           RM 0.00  (no marketing/ads in POS)`);
console.log(`  Platform / Svc fees:   RM 0.00  (no platform service fees)`);
console.log(`  Payment gateway:       RM 0.00  (no separate gateway fee in POS export)`);
console.log(`  Adjustments / credits: RM 0.00  (no adjustment rows in POS)`);
console.log(`  TOTAL FEES:            RM 0.00`);
console.log(`\n  ⚠ POS is a sales-coverage reference only.`);
console.log(`    It records what was sold through ALL channels (dine-in, takeaway,`);
console.log(`    delivery platforms). Platform sales overlap POS and are NOT additive.`);
console.log(`    POS fees are excluded from Section 2 totals.`);
