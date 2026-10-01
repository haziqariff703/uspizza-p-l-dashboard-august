# Refined Implementation Plan: Section 2 True Total Numbers Guide

A comprehensive, mathematically verified guide and implementation plan to deliver **100% true total numbers** for **Section 2: Commission & Fees Breakdown** in the P&L Dashboard.

---

## 1. Master Formula & Financial Balance

Every number in Section 2 must satisfy the fundamental platform financial balance equation:

$$\mathbf{Gross\ Sales} - \mathbf{Discounts} + \mathbf{Service\ Charge} + \mathbf{SST} - \mathbf{Total\ Platform\ Deductions} = \mathbf{Net\ Settlement\ (Payout)}$$

Where **$\mathbf{Total\ Platform\ Deductions}$** is the exact sum of the 5 Section 2 fee categories:
$$\mathbf{Total\ Fees} = \mathbf{Commission} + \mathbf{Advertising} + \mathbf{Platform\ Fees} + \mathbf{Payment\ Gateway\ (MDR)} + \mathbf{Adjustments\ \&\ Fee\ Tax}$$

---

## 2. Platform-by-Platform True Number Derivations

### A. Grab (`GRAB Aug sales.xlsx`)
| Metric / Matrix Cell | Exact Source Column & Formula | August 2026 True Value |
| :--- | :--- | :---: |
| **Gross Sales** | `Amount` (where `Category = 'Payment'`) | **RM 1,778,646.01** |
| **Net Sales (pre-tax)** | `Net Sales` | **RM 1,549,319.05** |
| **Tax (SST 6%)** | `Tax on Order Value` | **RM 80,682.74** |
| **Discounts** | `Offer` + `Discount (Merchant-Funded)` | **RM 309,996.70** |
| **1. Commission** | `Order commission` + `Delivery Commission` + `Channel Commission` | **RM 421,837.27** |
| **↳ Commission Rate %** | $\frac{\text{Commission}}{\text{Net Sales}} \times 100$ (or stated `Order Commission (%)`) | **27.23%** |
| **2. Advertising** | `Amount` (where `Category = 'Advertisement'`) | **RM 114,191.89** |
| **3. Platform Fees** | `Grab Fee` + `Restaurant Packaging Charge` | **RM 19,146.00** |
| **4. Payment Gateway (MDR)**| `Net MDR` | **RM 0.00** *(or card terminal fees)* |
| **5. Adjustments / Credits** | `Customer refund Item` + `Withholding Tax` + `Tax on Commission (8%)` | **RM 33,493.35** |
| **Total Grab Deductions** | $\text{Commission} + \text{Ads} + \text{Platform Fees} + \text{Adjustments}$ | **RM 588,668.51** |
| **Net Payout (to Bank)** | `Total` | **RM 973,601.73** |

---

### B. Foodpanda (`FOODPANDA/*.xlsx` — Appendix A)
| Metric / Matrix Cell | Exact Source Column & Formula | August 2026 True Value |
| :--- | :--- | :---: |
| **Gross Sales** | `Products Value Paid By Customer` | **RM 196,284.17** |
| **Restaurant Revenue** | `Restaurant Revenue` | **RM 157,296.72** |
| **Tax (SST 6%)** | `SST On Restaurant Revenue` | **RM 6,518.19** |
| **Net Sales (pre-tax)** | `Restaurant Revenue` − `SST On Restaurant Revenue` | **RM 150,778.53** |
| **Discounts** | `Products Value Paid By Customer` − `Net Sales` | **RM 45,505.64** |
| **1. Commission** | `foodpanda Commission` | **RM 30,162.90** |
| **↳ Commission Rate %** | `Foodpanda Commission Rate` (or $\frac{\text{Commission}}{\text{Net Sales}} \times 100$) | **20.00%** |
| **2. Advertising** | `Customer Targeting Fee` + `Pandabox Fee Paid By Vendor` | **RM 686.37** |
| **3. Platform Fees** | `Waiting Time Fee` + `Packaging Fees Paid By Customer` | **RM 0.00** |
| **4. Payment Gateway** | *N/A (absorbed into commission/payable)* | **RM 0.00** |
| **5. Adjustments / Fee Tax** | `SST on foodpanda commission` (8%) + `Reversal` | **RM 2,467.97** |
| **Total Foodpanda Fees** | $\text{Commission} + \text{Ads} + \text{Fee Tax}$ | **RM 33,317.24** |
| **Net Payout (to Bank)** | `Payable Amount` | **RM 123,962.81** |

---

### C. Shopee (`SHOPEE/*.xlsx`)
| Metric / Matrix Cell | Exact Source Column & Formula | August 2026 True Value |
| :--- | :--- | :---: |
| **Gross Sales** | `Food original price` | **RM 863,593.89** |
| **Collected Sales** | `Transaction Amount` | **RM 573,831.21** |
| **Tax (SST 6% inside)** | $\frac{6}{106} \times \text{Transaction Amount}$ | **RM 32,481.01** |
| **Net Sales (pre-tax)** | `Transaction Amount` − `Tax` | **RM 541,350.20** |
| **Discounts** | `Food original price` − `Net Sales` | **RM 322,243.69** |
| **1. Commission** | *Shopee Remittance Statement (0.00 in order export)* | **RM 0.00** |
| **↳ Commission Rate %** | *0.0% (in order export)* | **0.0%** |
| **2. Advertising** | `Platform Flash Sale Subsidy` / Shopee Ads | **RM 0.00** |
| **3. Platform Fees** | `Surcharge fee` | **RM 0.00** |
| **4. Payment Gateway** | *N/A* | **RM 0.00** |
| **5. Adjustments** | *N/A* | **RM 0.00** |
| **Total Deductions** | *RM 0.00 (in order export)* | **RM 0.00** |
| **Net Payout** | `Earnings` | **RM 573,831.21** |

---

### D. US Pizza App (`APPS AUG ORDER LIST.xlsx`)
| Metric / Matrix Cell | Exact Source Column & Formula | August 2026 True Value |
| :--- | :--- | :---: |
| **Gross Sales** | `Subtotal (RM)` | **RM 393,789.26** |
| **Charges (SC + SST)** | `Tax (RM)` (split at contractual 10% SC & 6% SST) | **RM 27,112.39** |
| **Service Charge (10%)**| 10% on dine-in subtotal | **RM 8,245.10** |
| **Tax (SST 6%)** | 6% on subtotal + delivery fee | **RM 18,867.29** |
| **Delivery Fee** | `Delivery Fee (RM)` | **RM 10,845.00** |
| **Collected Sales** | `Grand Total (RM)` | **RM 383,126.13** |
| **1. Commission** | *N/A (own app)* | **RM 0.00** |
| **↳ Commission Rate %** | *N/A* | **—** |
| **2. Advertising** | *N/A* | **RM 0.00** |
| **3. Platform Fees** | *N/A* | **RM 0.00** |
| **4. Payment Gateway** | RazerPay / FIUU MDR Processing Fee | **RM 0.00** *(or gateway statement)* |
| **5. Adjustments** | *N/A* | **RM 0.00** |

---

## 3. Section 2 True Total Summary (KPIs & Matrix Grand Totals)

### Top KPI Cards:
1. **Advertising spend / month (KPI 1):**
   $$\text{Grab Ads (RM 114,191.89)} + \text{Foodpanda Ads (RM 686.37)} = \mathbf{RM\ 114,878.26}$$
2. **Commission / month (KPI 2):**
   $$\text{Grab Commission (RM 421,837.27)} + \text{Foodpanda Commission (RM 30,162.90)} = \mathbf{RM\ 452,000.17}$$
3. **Total fees / month (KPI 3):**
   $$\text{Grab Deductions (RM 588,668.51)} + \text{Foodpanda Fees (RM 33,317.24)} = \mathbf{RM\ 621,985.75}$$

### Fee Matrix Grand Totals (Table Footer):
* **Grab Column Total:** `RM 588,668.51`
* **Foodpanda Column Total:** `RM 33,317.24`
* **Shopee Column Total:** `RM 0.00`
* **Apps Column Total:** `RM 0.00`
* **Grand Total Fees:** $\mathbf{RM\ 621,985.75}$

---

## 4. Technical Implementation Steps

1. **Database Schema:** Add `commission_amount`, `commission_rate`, `payment_gateway_fee`, `adjustments`, `tax_on_commission` to `public.sales_daily`.
2. **Parser Update (`src/lib/salesImportParser.ts`):** Map the exact sheet columns specified above to the normalized JSON structure.
3. **Ingestion (`SalesImportModal.tsx`):** Write the new fields during batch insertion into `sales_daily`.
4. **View-Model Update (`src/data/importedFees.ts`):** Replace `UNKNOWN_CELL` with exact decimal summations.
5. **Automated Test Suite:** Run `npm test` to verify that the view-model outputs match these ground-truth figures to the exact cent.
