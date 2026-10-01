# Grab Excel Parser Specification & Calculation Formulas

This document provides the exact formulas, column mappings, filtering logic, and reconciliation equations reverse-engineered from `Grab_Summary.xlsx`. Use this specification to implement or maintain automated Excel parsers for Grab transaction summaries.

---

## 1. File Structure Overview

`Grab_Summary.xlsx` consists of two distinct sheets:

| Sheet Name | Type | Description |
| :--- | :--- | :--- |
| **`Sheet1`** | **Raw Data** | Full transaction-level export from the Grab Merchant Portal (~30,309 rows, 68 columns from `A` to `BP`). |
| **`Summary`** | **Reconciliation** | Contains Pivot Tables and Excel summary formulas that filter, aggregate, and reconcile corporate figures. |

---

## 2. Raw Data Column Mapping (`Sheet1`)

Every raw transaction row contains the following key columns used in calculations:

| Col Letter | 0-based Index | 1-based Index | Column Header Name in Grab Export | Data Type | Usage / Description |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **`C`** | 2 | 3 | `Store Name` | String | Outlet name (e.g., `US Pizza - SS2`, `Marshall's Co - SS2`). |
| **`D`** | 3 | 4 | `Store ID` | UUID String | Grab unique store identifier. |
| **`G`** | 6 | 7 | `Type` | String | Transaction type (e.g., `GrabFood`). |
| **`H`** | 7 | 8 | `Category` | String | Main transaction category: `'Payment'`, `'Adjustment'`, `'Advertisement'`, `'Dine Out Discount'`. |
| **`I`** | 8 | 9 | `Subcategory` | String | Sub-classification: `''`, `'Compensation - Orders'`, `'Deduction - Eater Compensation'`, `'Order Value'`. |
| **`J`** | 9 | 10 | `Status` | String | Settlement status (e.g., `'Transferred'`). |
| **`AD`** | 29 | 30 | `Amount` | Decimal | Menu order value (Gross Sales for Payment; Base Cost for Ads). |
| **`AE`** | 30 | 31 | `Tax on Order Value` | Decimal | 6% Sales & Service Tax (SST) charged to customer on food items. |
| **`AJ`** | 35 | 36 | `Discount (Merchant-Funded)` | Decimal | Merchant promo discount (recorded as **negative**). |
| **`AO`** | 40 | 41 | `Net Sales` *(in Grab)* | Decimal | Customer payment = `Amount + Discount + Tax on Order Value`. |
| **`AS`** | 44 | 45 | `Marketing success fee` | Decimal | Opt-in campaign/marketing fees charged by Grab (recorded as **negative**). |
| **`AV`** | 47 | 48 | `Order commission` | Decimal | Base GrabFood commission (recorded as **negative**). |
| **`AW`** | 48 | 49 | `Step-up commission` | Decimal | Tiered / Step-up commission (recorded as **negative**). |
| **`BA`** | 52 | 53 | `Total` | Decimal | Net payout per row (`Amount + Discount + Fees + Taxes`). |
| **`BF`** | 57 | 58 | `Tax on GrabFood/GrabMart commission, adjustments, ads` | Decimal | SST (6% or 8%) charged on Grab services (commission, ads, fees). |

---

## 3. Filtering & Scope Rules

A parser must apply two layers of filters before aggregating:

### A. Outlet Scope Filtering
`Sheet1` contains transactions for 66 distinct stores under the merchant account. The summary explicitly filters to **45 corporate trading outlets** and excludes 21 outlets:

1. **Excluded Virtual Brands (9 stores)**:
   - All outlets prefixed with `Marshall's Co - *`:
     - `MARSHALL's Co - Jalan SS15`
     - `Marshall's Co - Bukit Mertajam`
     - `Marshall's Co - Greenlane`
     - `Marshall's Co - Jalan Ampang Batu 4`
     - `Marshall's Co - Raja Uda`
     - `Marshall's Co - SS2`
     - `Marshall's Co - Simpang Ampat`
     - `Marshall's Co - Sri Petaling`
     - `Marshall's Co - Summerton`

2. **Excluded Franchise / Inactive / Pre-opening Outlets (12 stores)** (Listed in `Summary!A57:A69`):
   - `US Pizza - Bandar Tun Hussein Onn`
   - `US Pizza - Cheng`
   - `US Pizza - Jalan Ipoh`
   - `US Pizza - Kota Kemuning`
   - `US Pizza - Lotus's Kepong`
   - `US Pizza - Melawati`
   - `US Pizza - Presint 15 Putrajaya`
   - `US Pizza - Prima Saujana`
   - `US Pizza - Seksyen 13 Shah Alam`
   - `US Pizza - Selayang`
   - `US Pizza - Subang Perdana`
   - `US Pizza - Sunshine Mall Farlim`

3. **Included Corporate Outlets (45 stores)**:
   *Us Pizza - Anggun City Rawang, US Pizza - Ayer Keroh, US Pizza - Banting, US Pizza - Batu Pahat, US Pizza - Batu Pahat Mall, US Pizza - Bukit Mertajam, US Pizza - Bundusan, US Pizza - Citta Mall, US Pizza - Dpulze Cyberjaya Mall, US Pizza - Gamuda Cove, US Pizza - Greenlane, US Pizza - Hextar World Empire City, US Pizza - Ipoh Simee, US Pizza - Jalan Ampang, US Pizza - Jalan Dang Wangi KL, US Pizza - Jalan SS15, US Pizza - Kelana Jaya, US Pizza - Kiara Bay Kepong, US Pizza - Kota Damansara, US Pizza - Kota Laksamana, Us Pizza - Kota Warisan Sepang, US Pizza - Lotus Seberang Jaya, US Pizza - Lucerne Bayan Lepas, US Pizza - Mount Austin, US Pizza - Mydin USJ, US Pizza - Nusa Bestari, US Pizza - Pandan Indah, US Pizza - Puchong Jaya, US Pizza - Raja Uda, US Pizza - SB Mall, US Pizza - Senawang, US Pizza - Seremban 2, US Pizza - Seri Kembangan, US Pizza - Simpang Ampat, Us Pizza - Sri Petaling, US Pizza - SS2, US Pizza - St Rosyam Klang, US Pizza - Summerton Bayan Lepas, US Pizza - Sungai Petani, US Pizza - Taiping, US Pizza - Taman Connaught, US Pizza - Taman Universiti, US Pizza - The Landmark Tanjung Tokong, US Pizza - USJ Taipan, US Pizza - Vivacity Megamall.*

> **Alias Note**: In row 55 of `Summary`, `Nusa Bestari` is mapped to `Skudai` (`nusa bestari = skudai`).

---

## 4. Exact Calculation Formulas

### A. Sales & Revenue Metrics (Per Outlet & Group Total)

Filter: `Category == 'Payment'` AND `Store Name in INCLUDED_STORES`

#### 1. Gross Sales (Menu Order Value)
* **Summary Cell**: `B1` (Total) & `B9:B53` (Per outlet)
* **Excel Formula**: `=SUM(Amount)` from Column `AD`
* **Mathematical Definition**:
  $$\text{Gross Sales} = \sum \text{Amount}$$

#### 2. Merchant-Funded Discount
* **Summary Cell**: `D1` (Total) & `C9:C53` (Per outlet)
* **Excel Formula**: `=SUM(Discount (Merchant-Funded))` from Column `AJ`
* **Sign**: Negative value (e.g. `-290,861.15`).

#### 3. Sales Tax on Order (SST)
* **Summary Cell**: `B3` (Total) & `D9:D53` (Per outlet)
* **Excel Formula**: `=SUM(Tax on Order Value)` from Column `AE`
* **Sign**: Positive value (6% SST collected on taxable food sales).

#### 4. Amount Paid by Customer (Grab's "Net Sales")
* **Summary Cell**: `E9:E53` (Per outlet)
* **Raw Column**: Column `AO` (`Net Sales` in Grab report)
* **Relationship**:
  $$\text{Amount Paid by Customer} = \text{Gross Sales} + \text{Discount} + \text{Tax on Order Value}$$

#### 5. Corporate Net Sales (P&L Basis)
* **Summary Cell**: `B2` (Total) & `F9:F53` (Per outlet)
* **Excel Formula in `Summary`**:
  ```excel
  F9 = B9 + C9
  ```
  *(and `=B10+C10`, etc. Grand Total in `F54 = SUM(F9:F53)`)*
* **Mathematical Definition**:
  $$\text{Corporate Net Sales} = \text{Gross Sales} + \text{Discount (Merchant-Funded)}$$
  *(Exclusive of SST and platform fees).*

---

### B. Platform Fee & Commission Metrics

#### 1. Total Commission
* **Summary Cell**: `F1`
* **Excel Formula in `Summary`**:
  ```excel
  = Q9 + R9 + S9
  ```
* **Component Sources**:
  - `Q9` = $\sum \text{Order commission}$ (Column `AV` across included stores)
  - `R9` = $\sum \text{Step-up commission}$ (Column `AW` across included stores)
  - `S9` = $\sum \text{Tax on GrabFood commission}$ (Column `BF` for order commission transactions)
* **Mathematical Formula**:
  $$\text{Total Commission} = \text{Order Commission} + \text{Step-Up Commission} + \text{Tax on Commission}$$

#### 2. Platform / Service Fees
* **Summary Cell**: `F2`
* **Excel Formula in `Summary`**:
  ```excel
  = $P$9
  ```
* **Component Source**:
  - `P9` = $\sum \text{Marketing success fee}$ (Column `AS` across included stores)
* **Mathematical Formula**:
  $$\text{Platform Fees} = \sum \text{Marketing Success Fee}$$

#### 3. Advertisement (Grab Ads)
* **Summary Cell**: `D2`
* **Excel Formula in `Summary`**:
  ```excel
  = $K$54
  ```
* **Component Sources** (from `Summary!H8:K54` where `Category == 'Advertisement'`):
  - `I54` = $\sum \text{Amount}$ (Column `AD` where `Category == 'Advertisement'`)
  - `J54` = $\sum \text{Tax on Grab commission/ads}$ (Column `BF` where `Category == 'Advertisement'`, 8% SST)
  - `K54` = $I54 + J54$
* **Mathematical Formula**:
  $$\text{Advertisement Expense} = \text{Ad Base Amount} + \text{SST on Advertising}$$

#### 4. Adjustments
* **Summary Cell**: `D3`
* **Excel Formula in `Summary`**:
  ```excel
  = M9 + 1060
  ```
* **Component Sources**:
  - `M9` = $\sum \text{Total}$ (Column `BA`) where `Category == 'Adjustment'` AND `Subcategory == 'Deduction - Eater Compensation'`
  - `1060` = POS Integration Subsidy (Jan–June 2026 fixed credit from Grab; raw rows classified under `Category == 'Adjustment'` and `Subcategory == 'Order Value'`)
* **Mathematical Formula**:
  $$\text{Adjustments} = \text{Eater Compensation Deduction} + \text{POS Integration Subsidy (RM 1,060.00)}$$

---

## 5. Settlement Reconciliation Equation

The net settlement transferred by Grab to the bank account ties together as:

$$\begin{aligned}
\text{Net Settlement} &= \text{Amount Paid by Customer} \\
&+ \text{Commission (Order + Step-Up + Tax)} \\
&+ \text{Platform / Marketing Fees} \\
&+ \text{Advertisement (Base + Tax)} \\
&+ \text{Adjustments (Eater Comp + POS Subsidy)} \\
&+ \text{Customer Cancelled Orders Compensation}
\end{aligned}$$

---

## 6. Ground-Truth Reference Table (May 2026 Audit Figures)

Use these numbers to verify parser output against `Grab_Summary.xlsx`:

| Line Item | Reference Value (RM) | Notes |
| :--- | :---: | :--- |
| **Gross Sales** | `1,538,244.32` | Sum of Column `AD` for 45 corporate stores, `Category = 'Payment'` |
| **Merchant Discount** | `-290,861.15` | Sum of Column `AJ` for 45 corporate stores, `Category = 'Payment'` |
| **Customer Order Tax (SST)** | `74,755.53` | Sum of Column `AE` for 45 corporate stores, `Category = 'Payment'` |
| **Customer Paid (Grab Net Sales)** | `1,322,138.70` | Sum of Column `AO` (`1,538,244.32 - 290,861.15 + 74,755.53`) |
| **US Pizza Net Sales (P&L)** | `1,247,383.17` | `Gross Sales + Discount` (`1,538,244.32 - 290,861.15`) |
| **Order Commission** | `-358,212.25` | Column `AV` |
| **Step-up Commission** | `-10,327.60` | Column `AW` |
| **Tax on Commission** | `-36,581.30` | Column `BF` for commission |
| **Total Commission** | `-405,121.15` | `Order Comm + Step-Up Comm + Tax on Comm` |
| **Platform / Marketing Fee** | `-15,764.40` | Column `AS` (Marketing success fee) |
| **Ad Base Amount** | `-101,598.85` | Column `AD` where `Category = 'Advertisement'` |
| **Tax on Ads (8% SST)** | `-8,128.43` | Column `BF` where `Category = 'Advertisement'` |
| **Total Advertisement** | `-109,727.28` | Ad Base + Tax on Ads |
| **Eater Compensation** | `-1,930.78` | Column `BA` where Category = 'Adjustment', Subcat = 'Deduction - Eater Compensation' |
| **POS Subsidy** | `+1,060.00` | Subsidy credit |
| **Net Adjustment** | `-870.78` | `-1,930.78 + 1,060.00` |
| **Customer Cancelled Compensation** | `+12,411.42` | Column `BA` where Category = 'Adjustment', Subcat = 'Compensation - Orders' |

---

## 7. Sample Parser Implementation (TypeScript / Node.js)

```typescript
import Decimal from 'decimal.js';

interface GrabRawRow {
  storeName: string;
  category: string;
  subcategory: string;
  amount: string;                 // Col AD (idx 29)
  taxOnOrderValue: string;        // Col AE (idx 30)
  discountMerchantFunded: string; // Col AJ (idx 35)
  netSalesGrab: string;           // Col AO (idx 40)
  marketingSuccessFee: string;    // Col AS (idx 44)
  orderCommission: string;        // Col AV (idx 47)
  stepUpCommission: string;       // Col AW (idx 48)
  total: string;                  // Col BA (idx 52)
  taxOnCommissionAds: string;     // Col BF (idx 57)
}

const EXCLUDED_OUTLET_SUBSTRINGS = ["Marshall's Co", "MARSHALL's Co"];
const EXCLUDED_OUTLET_EXACT = new Set([
  "US Pizza - Bandar Tun Hussein Onn",
  "US Pizza - Cheng",
  "US Pizza - Jalan Ipoh",
  "US Pizza - Kota Kemuning",
  "US Pizza - Lotus's Kepong",
  "US Pizza - Melawati",
  "US Pizza - Presint 15 Putrajaya",
  "US Pizza - Prima Saujana",
  "US Pizza - Seksyen 13 Shah Alam",
  "US Pizza - Selayang",
  "US Pizza - Subang Perdana",
  "US Pizza - Sunshine Mall Farlim"
]);

export function isCorporateOutlet(storeName: string): boolean {
  if (EXCLUDED_OUTLET_SUBSTRINGS.some(s => storeName.includes(s))) return false;
  if (EXCLUDED_OUTLET_EXACT.has(storeName)) return false;
  return true;
}

export function parseGrabTotals(rows: GrabRawRow[]) {
  let grossSales = new Decimal(0);
  let discount = new Decimal(0);
  let taxSst = new Decimal(0);
  let orderCommission = new Decimal(0);
  let stepUpCommission = new Decimal(0);
  let commissionTax = new Decimal(0);
  let platformFees = new Decimal(0);
  let adsBase = new Decimal(0);
  let adsTax = new Decimal(0);
  let eaterCompensation = new Decimal(0);

  for (const row of rows) {
    if (!isCorporateOutlet(row.storeName)) continue;

    const cat = (row.category || '').trim();
    const subcat = (row.subcategory || '').trim();

    if (cat === 'Payment') {
      grossSales = grossSales.plus(new Decimal(row.amount || 0));
      discount = discount.plus(new Decimal(row.discountMerchantFunded || 0));
      taxSst = taxSst.plus(new Decimal(row.taxOnOrderValue || 0));
      
      // Commissions on orders
      orderCommission = orderCommission.plus(new Decimal(row.orderCommission || 0));
      stepUpCommission = stepUpCommission.plus(new Decimal(row.stepUpCommission || 0));
      commissionTax = commissionTax.plus(new Decimal(row.taxOnCommissionAds || 0));
      platformFees = platformFees.plus(new Decimal(row.marketingSuccessFee || 0));
    } else if (cat === 'Advertisement') {
      adsBase = adsBase.plus(new Decimal(row.amount || 0));
      adsTax = adsTax.plus(new Decimal(row.taxOnCommissionAds || 0));
    } else if (cat === 'Adjustment') {
      if (subcat === 'Deduction - Eater Compensation') {
        eaterCompensation = eaterCompensation.plus(new Decimal(row.total || 0));
      }
    }
  }

  const netSales = grossSales.plus(discount);
  const totalCommission = orderCommission.plus(stepUpCommission).plus(commissionTax);
  const totalAds = adsBase.plus(adsTax);
  const netAdjustment = eaterCompensation.plus(new Decimal(1060)); // POS Integration subsidy

  return {
    grossSales: grossSales.toFixed(2),
    discount: discount.toFixed(2),
    taxSst: taxSst.toFixed(2),
    netSales: netSales.toFixed(2),
    commission: totalCommission.toFixed(2),
    platformFees: platformFees.toFixed(2),
    advertisement: totalAds.toFixed(2),
    adjustment: netAdjustment.toFixed(2)
  };
}
```
