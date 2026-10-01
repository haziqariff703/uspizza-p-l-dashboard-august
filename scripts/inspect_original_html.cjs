const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../src/data/originalOutlets.ts'), 'utf8');
const jsonMatch = content.match(/ORIGINAL_OUTLETS: OriginalOutlet\[\] = (\[[\s\S]*?\]);/);

if (!jsonMatch) {
  console.log('Could not find ORIGINAL_OUTLETS in originalOutlets.ts');
  process.exit(1);
}

const ORIGINAL_OUTLETS = JSON.parse(jsonMatch[1]);
console.log('Successfully loaded ORIGINAL_OUTLETS:', ORIGINAL_OUTLETS.length);

// Sample first outlet
console.log('\nSample Outlet 1 (Dpulze Cyberjaya):');
console.log(JSON.stringify(ORIGINAL_OUTLETS[0], null, 2));

// Aggregate Section 1 (Overview) for May 2026 across all 44 outlets
const platforms = ['grab', 'foodpanda', 'shopee', 'apps', 'pos'];
const platformTotals = {};
platforms.forEach(p => {
  platformTotals[p] = {
    grossMenu: 0,
    net: 0,
    netSC: 0,
    netSCTax: 0,
    settlement: 0,
    discount: 0,
    serviceCharge: 0,
    tax: 0,
    commissionAndFees: 0
  };
});

for (const o of ORIGINAL_OUTLETS) {
  for (const p of platforms) {
    const platData = o.byPlatform[p];
    if (platData) {
      platformTotals[p].grossMenu += platData.grossMenu;
      platformTotals[p].net += platData.net;
      platformTotals[p].netSC += platData.netSC;
      platformTotals[p].netSCTax += platData.netSCTax;
    }
    if (o.payout && o.payout[p] !== undefined) {
      platformTotals[p].settlement += o.payout[p];
    }
  }
}

for (const p of platforms) {
  const d = platformTotals[p];
  d.discount = d.grossMenu - d.net;
  d.serviceCharge = d.netSC - d.net;
  d.tax = d.netSCTax - d.netSC;
  d.commissionAndFees = d.netSCTax - d.settlement;
}

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('  ORIGINAL.HTML SECTION 1 (OVERVIEW) RECONSTRUCTION — MAY 2026');
console.log('═══════════════════════════════════════════════════════════════════════');

const rm = (v) => `RM ${Math.round(v).toLocaleString('en-MY')}`;
const pad = (s, w) => String(s).padStart(w);
const W = 14;

console.log(`${''.padEnd(22)} ${platforms.map(p => pad(p.toUpperCase(), W)).join(' ')}`);
console.log('─'.repeat(22 + (W + 1) * platforms.length));
console.log(`${'Gross sales'.padEnd(22)} ${platforms.map(p => pad(rm(platformTotals[p].grossMenu), W)).join(' ')}`);
console.log(`${'− Discount'.padEnd(22)} ${platforms.map(p => pad(rm(platformTotals[p].discount), W)).join(' ')}`);
console.log(`${'= Net sales'.padEnd(22)} ${platforms.map(p => pad(rm(platformTotals[p].net), W)).join(' ')}`);
console.log(`${'+ Service charge'.padEnd(22)} ${platforms.map(p => pad(rm(platformTotals[p].serviceCharge), W)).join(' ')}`);
console.log(`${'+ Tax (SST)'.padEnd(22)} ${platforms.map(p => pad(rm(platformTotals[p].tax), W)).join(' ')}`);
console.log(`${'= Collected sales'.padEnd(22)} ${platforms.map(p => pad(rm(platformTotals[p].netSCTax), W)).join(' ')}`);
console.log(`${'− Commission & fees'.padEnd(22)} ${platforms.map(p => pad(rm(platformTotals[p].commissionAndFees), W)).join(' ')}`);
console.log('─'.repeat(22 + (W + 1) * platforms.length));
console.log(`${'= Net settlement'.padEnd(22)} ${platforms.map(p => pad(rm(platformTotals[p].settlement), W)).join(' ')}`);
console.log(`${'Kept %'.padEnd(22)} ${platforms.map(p => pad((platformTotals[p].settlement / platformTotals[p].grossMenu * 100).toFixed(0) + '%', W)).join(' ')}`);

// Now aggregate Section 2 (Fees) across all 44 outlets
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('  ORIGINAL.HTML SECTION 2 (FEES) BREAKDOWN — MAY 2026');
console.log('═══════════════════════════════════════════════════════════════════════');

const feeCategories = ['commission', 'advertising', 'platformFees', 'gateway', 'adjustments'];
const feeSums = {};
feeCategories.forEach(cat => {
  feeSums[cat] = {};
  platforms.forEach(p => { feeSums[cat][p] = 0; });
});

for (const o of ORIGINAL_OUTLETS) {
  for (const p of platforms) {
    const f = o.fees && o.fees[p];
    if (f) {
      feeCategories.forEach(cat => {
        feeSums[cat][p] += Number(f[cat] || 0);
      });
    }
  }
}

console.log(`${'Fee Type'.padEnd(22)} ${platforms.map(p => pad(p.toUpperCase(), W)).join(' ')} ${pad('TOTAL', W)}`);
console.log('─'.repeat(22 + (W + 1) * (platforms.length + 1)));

feeCategories.forEach(cat => {
  const rowTot = platforms.reduce((s, p) => s + feeSums[cat][p], 0);
  console.log(`${cat.padEnd(22)} ${platforms.map(p => pad(rm(feeSums[cat][p]), W)).join(' ')} ${pad(rm(rowTot), W)}`);
});

const totalPerPlat = platforms.map(p => feeCategories.reduce((s, cat) => s + feeSums[cat][p], 0));
const grandFeeTot = totalPerPlat.reduce((s, v) => s + v, 0);
console.log('─'.repeat(22 + (W + 1) * (platforms.length + 1)));
console.log(`${'TOTAL FEES'.padEnd(22)} ${totalPerPlat.map(v => pad(rm(v), W)).join(' ')} ${pad(rm(grandFeeTot), W)}`);
