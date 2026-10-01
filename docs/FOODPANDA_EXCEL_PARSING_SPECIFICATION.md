# Foodpanda Excel Parser Specification & Calculation Formulas

This document provides the complete formulas, column mappings, tax rate rules (6% vs. 8% SST), and reconciliation equations for parsing Foodpanda data sources.

---

## 1. Overview of Foodpanda Data Sources

Foodpanda data comes from two primary sources, each serving a distinct layer of reconciliation:

| Source File | Level | Purpose | Corresponds to Grab |
| :--- | :--- | :--- | :--- |
| **`FOODPANDA_COMPILED.xlsx`** | **Order / Basket Level** | Merged daily/weekly merchant portal statements (`Appendix A`, `B`, `C`). Contains line-by-line customer orders, item values, and vendor vouchers. | `Sheet1` in `Grab_Summary.xlsx` |
| **`Foodpanda_Invoice_Report.xlsx`** | **Tax & Invoice Level** | Compiled audit master parsed from official Delivery Hero / Foodpanda tax e-invoices (526 invoices). Contains official self-billed tax breakdowns. | `Summary` in `Grab_Summary.xlsx` |

---

## 2. SST Rules: The Two Distinct Tax Rates

Under Malaysian Sales & Service Tax law (effective 1 March 2024), Foodpanda applies **two different tax rates**:

| Category | Tax Rate | Legal Basis | Applied To |
| :--- | :---: | :--- | :--- |
| **Food & Beverage (F&B)** | **6%** | Service Tax Act Group B (Exempt from 8% hike) | Customer food orders, restaurant sales revenue |
| **Platform Services & Advertising** | **8%** | Service Tax Act Group I (Digital & Agency Services) | Commissions, CPC/Keyword Ads, Pandabox fees, platform fees |

---

## 3. Raw Data Column Mappings

### A. Statement Level: `FOODPANDA_COMPILED.xlsx` (`Appendix A`)

| Col | 0-idx | Header Name | Type | Formula Usage / Description |
| :---: | :---: | :--- | :--- | :--- |
| **`D`** | 3 | `Outlet Name` | String | Outlet name (e.g., `US Pizza (Pandan Indah)`). |
| **`L`** | 11 | `Products Value Paid By Customer` | Decimal | **Gross Sales** before merchant discounts and taxes. |
| **`P`** | 15 | `Voucher Paid By Vendor` | Decimal | Merchant-funded voucher discount. |
| **`Q`** | 16 | `Discount Paid By Vendor` | Decimal | Direct merchant promotional discount. |
| **`R`** | 17 | `Pandabox Voucher Paid By Vendor` | Decimal | Subsidized Pandabox deal discount. |
| **`V`** | 21 | `Delivery Fee Discount Paid By Vendor`| Decimal | Vendor-subsidized delivery promo. |
| **`W`** | 22 | `Restaurant Revenue` | Decimal | Amount paid by customer after merchant discounts (inclusive of 6% SST). |
| **`Y`** | 24 | `foodpanda Commission Base` | Decimal | **Corporate Net Sales**: `Restaurant Revenue ÷ 1.06` (exclusive of 6% SST). |
| **`Z`** | 25 | `foodpanda Commission` | Decimal | Order commission before tax (`Commission Base × Commission Rate`). |
| **`AA`**| 26 | `SST on foodpanda commission` | Decimal | **8% Service Tax** on commission (`Commission × 8%`). |
| **`AC`**| 28 | `Payable Amount` | Decimal | Net payout for this order line (`Restaurant Revenue - Commission - SST`). |
| **`AE`**| 30 | `SST On Restaurant Revenue` | Decimal | **6% SST** collected on food sales (`Commission Base × 6%`). |

### B. Statement Level: `FOODPANDA_COMPILED.xlsx` (`Appendix B - Additional Charges`)

| Col | 0-idx | Header Name | Type | Description |
| :---: | :---: | :--- | :--- | :--- |
| **`D`** | 3 | `Category` | String | Charge category (`Keywords`, `Premium Placement (CPC)`, `Display Ads`, `Platform Fee`, `Cancellation orders`). |
| **`G`** | 6 | `Subject to VAT rate` | String | Tax rate indicator (e.g. `8%`). |
| **`J`** | 9 | `Net Total` | Decimal | Base charge amount before SST. |

---

### C. Accounting Level: `Foodpanda_Invoice_Report.xlsx` (`Invoice Master`)

| Col | 0-idx | Group | Header Name | Type | Formula Usage / Description |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **`D`** | 3 | Details | `Outlet Name` | String | Outlet name as printed on e-invoice. |
| **`P`** | 15 | Count | `Total Orders` | Integer | Total completed orders on this invoice. |
| **`W`** | 22 | Revenue | `Total Revenue (RM)` | Decimal | Gross customer payment received by Foodpanda (inclusive of 6% SST). |
| **`AA`**| 26 | Charges | `Commission Base (RM)` | Decimal | Commissionable amount before tax. |
| **`AB`**| 27 | Charges | `Commission SST (RM)` | Decimal | **8% SST** on commission (`Col AA × 8%`). |
| **`AC`**| 28 | Charges | `Wastage Commission Base (RM)`| Decimal | Commission charged on cancelled/wasted orders. |
| **`AD`**| 29 | Charges | `Wastage Commission SST (RM)` | Decimal | **8% SST** on wastage commission. |
| **`AE`**| 30 | Charges | `Fees & Adj (SST) Base (RM)` | Decimal | Advertising spend and taxable adjustments (pre-tax). |
| **`AF`**| 31 | Charges | `Fees & Adj (SST) SST (RM)` | Decimal | **8% SST** on advertising & taxable fees (`Col AE × 8%`). |
| **`AG`**| 32 | Charges | `Fees & Adj (Non-SST) Base (RM)`| Decimal | Non-taxable invoice adjustments (negative = deductions). |
| **`AI`**| 34 | Charges | `Pandabox Fee Base (RM)` | Decimal | Pandabox campaign participation fee. |
| **`AJ`**| 35 | Charges | `Pandabox Fee SST (RM)` | Decimal | **8% SST** on Pandabox fee (`Col AI × 8%`). |
| **`AK`**| 36 | Charges | `Targeted Cust. Fee Base (RM)` | Decimal | Targeted customer campaign fee. |
| **`AL`**| 37 | Charges | `Targeted Cust. Fee SST (RM)` | Decimal | **8% SST** on targeted customer fee. |
| **`AM`**| 38 | Charges | `Waiting Time Fee Base (RM)` | Decimal | Rider waiting time charges. |
| **`AO`**| 40 | Charges | `Total Excl. Tax (RM)` | Decimal | Total platform charges before SST. |
| **`AP`**| 41 | Charges | `Total SST (RM)` | Decimal | **Total 8% SST** charged on all Foodpanda services. |
| **`AQ`**| 42 | Charges | `Total Incl. Tax [c] (RM)` | Decimal | Total platform deductions: `Col AO + Col AP`. |
| **`AR`**| 43 | Sales | `Sales Value Excl. SST (RM)` | Decimal | **Corporate Net Sales (P&L Basis)**. |
| **`AS`**| 44 | Sales | `Sales SST 6% (RM)` | Decimal | **Customer Sales Tax (6% SST)**. |
| **`AT`**| 45 | Sales | `Sales Incl. SST (RM)` | Decimal | Total Self-Billed Sales: `Col AR + Col AS` (equals Col `W`). |
| **`AU`**| 46 | Payout | `Today's Earnings [a-c] (RM)` | Decimal | **Net Settlement**: `Total Revenue (Col W) - Total Charges (Col AQ)`. |
| **`AV`**| 47 | Payout | `Outstanding Prev. [f] (RM)` | Decimal | Unsettled carry-forward balance from prior invoices. |
| **`AW`**| 48 | Payout | `Total Payable [f]+[a-c] (RM)`| Decimal | Actual bank disbursement amount. |

---

## 4. Exact Calculation Formulas (Relating to Grab)

### 1. Gross Sales
* **Grab Equivalent**: `Amount` (Col `AD`)
* **From `FOODPANDA_COMPILED.xlsx` (`Appendix A`)**:
  $$\text{Gross Sales} = \sum \text{Products Value Paid By Customer (Col L)}$$
* **From `Foodpanda_Invoice_Report.xlsx` (`Invoice Master`)**:
  $$\text{Gross Sales} = \text{Sales Value Excl. SST (Col AR)} + \text{Total Merchant Discounts}$$

---

### 2. Merchant-Funded Discount
* **Grab Equivalent**: `Discount (Merchant-Funded)` (Col `AJ`, negative value)
* **From `FOODPANDA_COMPILED.xlsx` (`Appendix A`)**:
  $$\begin{aligned}
  \text{Total Discount} = -\sum \Big(&\text{Voucher (Col P)} + \text{Discount (Col Q)} \\
  + &\text{Pandabox Voucher (Col R)} + \text{Delivery Discount (Col V)}\Big)
  \end{aligned}$$

---

### 3. Corporate Net Sales (P&L Basis, Excl. SST)
* **Grab Equivalent**: `Gross Sales + Discount` (`F9 = B9 + C9`)
* **From `FOODPANDA_COMPILED.xlsx` (`Appendix A`)**:
  $$\text{Corporate Net Sales} = \sum \text{foodpanda Commission Base (Col Y)}$$
  $$\text{or } \sum \frac{\text{Restaurant Revenue (Col W)}}{1.06}$$
* **From `Foodpanda_Invoice_Report.xlsx` (`Invoice Master`)**:
  $$\text{Corporate Net Sales} = \sum \text{Sales Value Excl. SST (Col AR)}$$

---

### 4. Sales Tax SST on Customer Orders (6%)
* **Grab Equivalent**: `Tax on Order Value` (Col `AE`, 6% SST)
* **From `FOODPANDA_COMPILED.xlsx` (`Appendix A`)**:
  $$\text{Sales Tax SST} = \sum \text{SST On Restaurant Revenue (Col AE)}$$
* **From `Foodpanda_Invoice_Report.xlsx` (`Invoice Master`)**:
  $$\text{Sales Tax SST} = \sum \text{Sales SST 6\% (Col AS)}$$
  $$\text{Equation: } \text{Sales Value Excl. SST (Col AR)} \times \mathbf{6\%} = \text{Col AS}$$

---

### 5. Amount Paid by Customer (Total Sales Value Incl. SST)
* **Grab Equivalent**: `amount paid by cust` (Grab `Net Sales` Col `AO` = Gross + Discount + SST)
* **From `FOODPANDA_COMPILED.xlsx` (`Appendix A`)**:
  $$\text{Amount Paid by Customer} = \sum \text{Restaurant Revenue (Col W)}$$
* **From `Foodpanda_Invoice_Report.xlsx` (`Invoice Master`)**:
  $$\text{Amount Paid by Customer} = \sum \text{Total Revenue (Col W)} = \sum \text{Sales Incl. SST (Col AT)}$$

---

### 6. Platform Commission (Incl. 8% SST)
* **Grab Equivalent**: `Order Commission` + `Step-up Commission` + `Tax on Commission` (`Q9 + R9 + S9`)
* **From `FOODPANDA_COMPILED.xlsx` (`Appendix A`)**:
  $$\text{Commission} = -\sum \Big(\text{foodpanda Commission (Col Z)} + \text{SST on Commission (Col AA)}\Big)$$
* **From `Foodpanda_Invoice_Report.xlsx` (`Invoice Master`)**:
  $$\begin{aligned}
  \text{Commission} = -\sum \Big(&\text{Commission Base (Col AA)} + \text{Commission SST 8\% (Col AB)} \\
  + &\text{Wastage Commission Base (Col AC)} + \text{Wastage SST 8\% (Col AD)}\Big)
  \end{aligned}$$

---

### 7. Advertising (Ads)
* **Grab Equivalent**: `Ad Amount` + `Tax on Ads (8%)` (`Summary!$K$54`)
* **From `FOODPANDA_COMPILED.xlsx` (`Appendix B`)**:
  $$\text{Ad Spend} = -\sum \Big(\text{Keywords} + \text{Premium Placement (CPC)} + \text{Display Ads}\Big) \times \mathbf{1.08}$$
* **From `Foodpanda_Invoice_Report.xlsx` (`Invoice Master`)**:
  $$\text{Ad Spend} = -\sum \Big(\text{Fees \& Adj (SST) Base (Col AE)} + \text{Fees \& Adj SST 8\% (Col AF)}\Big)$$

---

### 8. Platform & Service Fees
* **Grab Equivalent**: `Marketing success fee` (Col `AS` / `$P$9`)
* **From `Foodpanda_Invoice_Report.xlsx` (`Invoice Master`)**:
  $$\begin{aligned}
  \text{Platform Fees} = -\sum \Big(&\text{Pandabox Fee (Base Col AI + SST Col AJ)} \\
  + &\text{Targeted Customer Fee (Base Col AK + SST Col AL)} \\
  + &\text{Waiting Time Fee (Base Col AM + SST Col AN)}\Big)
  \end{aligned}$$

---

### 9. Adjustments
* **Grab Equivalent**: `Eater Compensation` + `POS Subsidy` (`M9 + 1060`)
* **From `FOODPANDA_COMPILED.xlsx` (`Appendix B`)**:
  $$\text{Adjustments} = \sum \text{Cancellation orders \& adjustment invoice}$$
* **From `Foodpanda_Invoice_Report.xlsx` (`Invoice Master`)**:
  $$\text{Adjustments} = \sum \text{Fees \& Adj (Non-SST) Base (Col AG)}$$

---

### 10. Net Earnings / Settlement Payout
* **Grab Equivalent**: Bank Transfer (`Total` Col `BA`)
* **From `Foodpanda_Invoice_Report.xlsx` (`Invoice Master`)**:
  $$\begin{aligned}
  \text{Today's Earnings [a - c]} &= \text{Total Revenue (Col W)} - \text{Total Charges Incl. Tax (Col AQ)} \\
  \text{Total Payable} &= \text{Today's Earnings} + \text{Outstanding Previous Invoices (Col AV)}
  \end{aligned}$$

---

## 5. Audit Benchmark Figures (August 2026 Dataset)

Use these exact figures to verify your parser against `Foodpanda_Invoice_Report.xlsx`:

| Line Item | Column | Value (RM) | Notes |
| :--- | :---: | :---: | :--- |
| **Total Invoices Parsed** | - | `526` | 86 distinct outlet names |
| **Total Orders** | Col `P` | `3,656` | Completed orders |
| **Total Revenue (Sales Incl. SST)** | Col `W` / `AT` | `170,159.02` | Customer payment collected |
| **Sales Value Excl. SST (P&L Net Sales)** | Col `AR` | `159,562.21` | Base food revenue |
| **Customer Sales Tax (6% SST)** | Col `AS` | `6,511.88` | Food tax |
| **Commission Base** | Col `AA` | `31,964.07` | Pre-tax commission |
| **Commission SST (8%)** | Col `AB` | `2,557.10` | 8% tax on commission |
| **Wastage Commission Base** | Col `AC` | `686.67` | Pre-tax wastage fee |
| **Wastage Commission SST (8%)** | Col `AD` | `54.99` | 8% tax on wastage |
| **Ads & Other Fees (SST Base)** | Col `AE` | `15,572.70` | CPC ads, keywords, display ads |
| **Ads & Other Fees SST (8%)** | Col `AF` | `1,245.95` | 8% tax on ads |
| **Fees & Adjustments (Non-SST)** | Col `AG` | `-7,252.34` | Deductions & manual adjustments |
| **Total Charges Excl. Tax** | Col `AO` | `42,101.67` | Foodpanda fees before tax |
| **Total SST on Charges (8%)** | Col `AP` | `3,948.22` | Sum of all 8% service taxes |
| **Total Charges Incl. Tax [c]** | Col `AQ` | `46,049.89` | Full platform deductions |
| **Net Earnings [a - c]** | Col `AU` | `124,109.13` | `170,159.02 - 46,049.89` |

---

## 6. Sample TypeScript Parser Implementation

```typescript
import Decimal from 'decimal.js';

export interface FoodpandaInvoiceRow {
  outletName: string;
  totalRevenue: string;           // Col W (idx 22)
  commissionBase: string;         // Col AA (idx 26)
  commissionSst: string;          // Col AB (idx 27, 8%)
  wastageBase: string;            // Col AC (idx 28)
  wastageSst: string;             // Col AD (idx 29, 8%)
  feesAdjSstBase: string;         // Col AE (idx 30) - Ads & taxable fees
  feesAdjSstTax: string;          // Col AF (idx 31, 8%)
  feesAdjNonSstBase: string;      // Col AG (idx 32) - Non-taxable adjustments
  pandaboxBase: string;           // Col AI (idx 34)
  pandaboxSst: string;            // Col AJ (idx 35, 8%)
  targetedCustBase: string;       // Col AK (idx 36)
  targetedCustSst: string;        // Col AL (idx 37, 8%)
  salesValueExclSst: string;      // Col AR (idx 43) - P&L Net Sales
  salesSst6Pct: string;           // Col AS (idx 44, 6%)
  salesInclSst: string;           // Col AT (idx 45)
  todaysEarnings: string;         // Col AU (idx 46)
}

export function parseFoodpandaInvoiceTotals(rows: FoodpandaInvoiceRow[]) {
  let netSalesPnl = new Decimal(0);      // Sales Excl SST (6%)
  let foodSst = new Decimal(0);          // 6% Tax on Food
  let totalRevenue = new Decimal(0);     // Sales Incl SST (amount customer paid)
  let orderCommission = new Decimal(0);  // Commission + 8% SST
  let wastageCommission = new Decimal(0);// Wastage + 8% SST
  let advertisingSpend = new Decimal(0); // Ads Base + 8% SST
  let platformFees = new Decimal(0);     // Pandabox + Targeted + 8% SST
  let adjustments = new Decimal(0);      // Non-SST adjustments
  let netEarnings = new Decimal(0);      // Payout

  for (const r of rows) {
    // 1. Food Sales (Subject to 6% SST)
    netSalesPnl = netSalesPnl.plus(new Decimal(r.salesValueExclSst || 0));
    foodSst = foodSst.plus(new Decimal(r.salesSst6Pct || 0));
    totalRevenue = totalRevenue.plus(new Decimal(r.totalRevenue || 0));

    // 2. Commission (Subject to 8% SST)
    const commBase = new Decimal(r.commissionBase || 0);
    const commTax = new Decimal(r.commissionSst || 0);
    orderCommission = orderCommission.plus(commBase).plus(commTax);

    const wstBase = new Decimal(r.wastageBase || 0);
    const wstTax = new Decimal(r.wastageSst || 0);
    wastageCommission = wastageCommission.plus(wstBase).plus(wstTax);

    // 3. Advertising & Taxable Fees (Subject to 8% SST)
    const adBase = new Decimal(r.feesAdjSstBase || 0);
    const adTax = new Decimal(r.feesAdjSstTax || 0);
    advertisingSpend = advertisingSpend.plus(adBase).plus(adTax);

    // 4. Platform Campaign Fees (Subject to 8% SST)
    const pbBase = new Decimal(r.pandaboxBase || 0);
    const pbTax = new Decimal(r.pandaboxSst || 0);
    const tcBase = new Decimal(r.targetedCustBase || 0);
    const tcTax = new Decimal(r.targetedCustSst || 0);
    platformFees = platformFees.plus(pbBase).plus(pbTax).plus(tcBase).plus(tcTax);

    // 5. Non-SST Adjustments
    adjustments = adjustments.plus(new Decimal(r.feesAdjNonSstBase || 0));

    // 6. Net Earnings (Disbursement)
    netEarnings = netEarnings.plus(new Decimal(r.todaysEarnings || 0));
  }

  const totalCommission = orderCommission.plus(wastageCommission);

  return {
    netSalesPnl: netSalesPnl.toFixed(2),
    foodSst6Pct: foodSst.toFixed(2),
    totalRevenueCustomerPaid: totalRevenue.toFixed(2),
    commissionWithSst8Pct: totalCommission.negated().toFixed(2),
    advertisingWithSst8Pct: advertisingSpend.negated().toFixed(2),
    platformFeesWithSst8Pct: platformFees.negated().toFixed(2),
    adjustments: adjustments.toFixed(2),
    netEarnings: netEarnings.toFixed(2)
  };
}
```
