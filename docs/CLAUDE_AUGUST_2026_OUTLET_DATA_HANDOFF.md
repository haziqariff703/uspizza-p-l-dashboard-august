# Claude handoff: August 2026 dashboard data

## Goal

Wire the user-provided August 2026 sales summary and 44 outlet breakdown into [`US-Pizza-August-2026-Dashboard.html`](../US-Pizza-August-2026-Dashboard.html). The user will provide the 44 outlet data in the next chat. Use this note as the implementation brief after that data arrives.

## Current aggregate figures

Transcribed as supplied; currency is MYR (RM).

| Metric | Amount |
| --- | ---: |
| Gross sales | RM 801,306.29 |
| Net sales | RM 497,778.34 |
| SST | RM 31,776.09 |
| Discount | RM 276,762.93 |
| Commission | RM 15,434.13 |
| Net + service charge + tax | RM 529,554.43 |

The source labels commission as “COMISSION”; use the corrected display label “Commission”.

## Reconciliation to resolve

- Gross sales minus discount is RM 524,543.36, which is RM 26,765.02 above the supplied net sales. Keep both supplied values unchanged until the outlet data or user clarifies the basis; do not force a balancing adjustment.
- Net sales plus SST equals RM 529,554.43 exactly, the supplied “Net + SC + Tax” total. Preserve that supplied label and amount. Do not invent a service-charge amount or claim a separate service-charge value without source data.
- Display source totals as supplied. If the new outlet rows do not reconcile to these totals, show/report the variance for review rather than silently changing values.

## When the 44 outlet data arrives

1. Use the user-provided rows as the source of truth. Preserve outlet names/IDs as supplied and map them to the dashboard's existing outlet roster explicitly. Report missing, duplicate, or unmatched outlets; do not fuzzy-merge identities or invent values.
2. Use exact decimal arithmetic for money. Keep unknown values unknown; do not convert blanks to zero. Reconcile each provided measure's outlet sum against the aggregate figure where the measure and outlet coverage match.
3. Inspect the target HTML's embedded data and rendering code before editing. Update the underlying data and every dependent summary, chart, outlet table, filter/entity view, and displayed total together so interactions remain consistent.
4. Keep this work within the standalone August HTML. Do not change `original.html`, `docs/original-capture.html`, or the React app unless separately requested.
5. Preserve existing layout and behavior. Add clear coverage/provenance text where the 44 rows do not cover the dashboard's full roster or where a figure remains unreconciled.
6. Verify the 44 outlet rows total correctly and check the relevant dashboard sections and filters in a browser. Report the arithmetic checks and any unresolved mapping or reconciliation issues.

## Data to append after user follow-up

User supplied the following 44 outlet rows. The final row is the user's supplied grand total.

| Outlet Name | Gross Sales (RM) | Discount (RM) | Net Sales (RM) | Tax SST (RM) | Commission (RM) | Cust Paid (RM) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| US Pizza - Ayer Keroh | 18,091.89 | 6,576.42 | 11,252.60 | 718.23 | 175.06 | 11,970.83 |
| US Pizza - Banting | 11,050.47 | 3,750.95 | 6,966.48 | 444.66 | 139.94 | 7,411.14 |
| US Pizza - Batu Pahat | 10,553.01 | 3,695.88 | 6,529.18 | 416.80 | 264.27 | 6,945.98 |
| US Pizza - Batu Pahat Mall | 9,435.54 | 3,022.12 | 6,020.96 | 384.38 | 187.32 | 6,405.34 |
| US Pizza - Bukit Mertajam | 18,336.09 | 6,090.46 | 11,422.63 | 729.10 | 372.00 | 12,151.73 |
| US Pizza - Citta Mall | 11,119.46 | 3,956.50 | 6,687.63 | 426.94 | 349.57 | 7,114.57 |
| US Pizza - Dang Wangi KL | 17,308.45 | 5,891.38 | 10,794.13 | 689.03 | 338.93 | 11,483.16 |
| US Pizza - D'Pulze | 36,064.81 | 13,212.99 | 21,905.99 | 1,398.37 | 535.26 | 23,304.36 |
| US Pizza - Empire City | 9,099.98 | 3,413.59 | 5,424.64 | 346.31 | 234.30 | 5,770.95 |
| US Pizza - Gamuda Cove | 1,440.41 | 533.27 | 885.31 | 56.51 | 8.40 | 941.82 |
| US Pizza - Greenlane | 22,938.57 | 7,924.91 | 14,287.02 | 911.89 | 514.07 | 15,198.91 |
| US Pizza - Jln Ampang | 16,042.08 | 5,496.21 | 10,018.12 | 639.44 | 231.43 | 10,657.56 |
| US Pizza - Kelana Jaya | 9,013.36 | 3,265.16 | 5,490.27 | 350.55 | 213.58 | 5,840.82 |
| US Pizza - Kiara Bay | 25,502.68 | 8,705.74 | 15,999.79 | 1,021.45 | 338.10 | 17,021.24 |
| US Pizza - Kota Damansara | 9,306.42 | 2,865.07 | 5,977.33 | 381.62 | 82.40 | 6,358.95 |
| US Pizza - Kota Laksamana | 14,233.55 | 4,945.53 | 8,768.82 | 559.88 | 294.72 | 9,328.70 |
| US Pizza - Lotus Seberang Jaya | 15,639.23 | 5,485.99 | 9,590.17 | 612.16 | 405.93 | 10,202.33 |
| US Pizza - Lucerne Square Penang | 26,016.44 | 8,799.70 | 16,022.30 | 1,022.81 | 719.01 | 17,045.11 |
| US Pizza - Mount Austin | 39,018.01 | 13,597.32 | 24,382.77 | 1,556.57 | 498.73 | 25,939.34 |
| US Pizza - Mydin USJ | 6,779.17 | 2,465.73 | 4,187.44 | 267.32 | 179.10 | 4,454.76 |
| US Pizza - Pandan Indah | 36,163.50 | 13,636.25 | 21,893.52 | 1,397.61 | 359.24 | 23,291.13 |
| US Pizza - Puchong Jaya | 19,332.38 | 6,907.63 | 11,995.28 | 765.69 | 363.10 | 12,760.97 |
| US Pizza - Raja Uda | 9,968.32 | 3,419.53 | 6,155.55 | 393.01 | 305.67 | 6,548.56 |
| US Pizza - Rawang | 12,332.50 | 4,308.85 | 7,715.95 | 492.50 | 209.08 | 8,208.45 |
| US Pizza - Rosyam Mall Klang | 23,523.56 | 8,225.15 | 14,604.95 | 932.34 | 284.28 | 15,537.29 |
| US Pizza - SB Mall | 23,299.49 | 7,979.43 | 14,589.72 | 931.36 | 250.96 | 15,521.08 |
| US Pizza - Senawang | 32,552.54 | 9,819.87 | 21,264.82 | 1,357.38 | 489.79 | 22,622.20 |
| US Pizza - Sepang | 13,884.67 | 5,126.53 | 8,650.52 | 552.16 | 175.50 | 9,202.68 |
| US Pizza - Seremban 2 | 18,228.19 | 5,151.41 | 11,922.18 | 760.95 | 406.73 | 12,683.13 |
| US Pizza - Seri Kembangan | 19,110.30 | 6,881.94 | 11,742.37 | 749.58 | 263.41 | 12,491.95 |
| US Pizza - Sg Petani | 23,631.10 | 6,820.34 | 15,316.23 | 977.76 | 693.35 | 16,293.99 |
| US Pizza - SIMEE | 27,102.99 | 9,903.20 | 16,583.20 | 1,058.64 | 800.77 | 17,641.84 |
| US Pizza - Simpang Ampat | 14,258.93 | 4,344.81 | 9,073.78 | 579.28 | 455.32 | 9,653.06 |
| US Pizza - Skudai | 19,305.71 | 6,773.09 | 11,859.99 | 757.09 | 385.62 | 12,617.08 |
| US Pizza - Sri Petaling | 28,828.15 | 10,283.97 | 17,555.17 | 1,120.56 | 597.35 | 18,675.73 |
| US Pizza - SS15 | 11,223.33 | 4,155.77 | 6,788.64 | 433.46 | 213.94 | 7,222.10 |
| US Pizza - SS2 | 18,888.87 | 6,667.58 | 11,446.58 | 730.90 | 550.05 | 12,177.48 |
| US Pizza - Summerton | 21,397.78 | 7,654.78 | 12,922.93 | 825.03 | 666.30 | 13,747.96 |
| US Pizza - Taipan | 13,287.43 | 4,655.67 | 8,249.13 | 526.58 | 192.25 | 8,775.71 |
| US Pizza - Taiping | 21,064.61 | 6,713.58 | 13,493.41 | 861.37 | 492.83 | 14,354.78 |
| US Pizza - Taman Connaught | 11,664.59 | 4,112.19 | 7,201.27 | 459.61 | 201.56 | 7,660.88 |
| US Pizza - Taman Universiti | 23,341.21 | 8,036.30 | 14,555.56 | 929.12 | 364.49 | 15,484.68 |
| US Pizza - Tanjung Tokong | 11,168.55 | 3,643.69 | 6,998.38 | 446.68 | 487.94 | 7,445.06 |
| US Pizza - Vivacity Kuching | 20,757.97 | 7,846.45 | 12,585.63 | 803.41 | 142.48 | 13,389.04 |
| **Grand Total (user supplied)** | **801,306.29** | **276,762.93** | **497,778.34** | **31,776.09** | **15,434.13** | **529,554.43** |

The table contains 44 outlet rows. Retain the reconciliation checks above: the supplied outlet grand totals match the aggregate figures, while Gross Sales − Discount does not equal Net Sales. “Cust Paid” matches Net Sales + Tax SST at the supplied grand-total level; the source calls the value “Net + SC + Tax”, so do not infer a separately measured service-charge amount.
