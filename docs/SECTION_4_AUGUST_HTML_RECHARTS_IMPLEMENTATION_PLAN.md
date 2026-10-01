# Section 4 Recharts implementation plan — August standalone dashboard

## Objective and boundary

Replace the CSS bar list in Section 4 of `US-Pizza-August-2026-Dashboard.html` with an interactive Recharts chart that follows the captured system layout. The deliverable is that one self-contained HTML file. Do not change `src/**`, the Vite app, the database, imports, other dashboard sections, or `original.html`.

This document is a plan. It does not authorize guessed financial values.

## Confirmed starting point

- The HTML is an offline snapshot. `#SSR_DATA` contains pre-rendered HTML for seven sections and three entity scopes (`all`, `myUsPizza`, `sabah`). Its only JavaScript swaps section/scope HTML and wires a few unrelated controls.
- Section 4 currently renders a horizontal CSS bar per outlet. The initial view is **Gross / By platform**. It shows 46 outlet rows for All, 43 for MY US Pizza, and 3 for Sabah.
- Section 4's five metric buttons (Gross, Discount, Net, Net + SC, Net + SC + SST) and Total/By platform buttons have no event handlers. Only the initially rendered Gross values are present in its HTML. Bar labels and `title` attributes are rounded to whole RM; CSS widths are rounded percentages. Neither is a precise data source for the other views.
- The standalone HTML has no external script or stylesheet dependencies. Recharts is installed in this repository, but the HTML does not load it.
- The captured system uses a fixed-height **vertical** Recharts bar chart inside a horizontally scrollable region, with metric and view controls together above it. The current August horizontal list differs from that layout.

## Financial rule for this task

The user defines POS in Section 4 as the **cashier POS system channel**, separate from Grab, FoodPanda, Shopee, and Apps. For a given outlet and metric:

`reported total = POS + Grab + FoodPanda + Shopee + Apps`

Add each source once. Do not use the older `docs/AUGUST-DATA-CHECKLIST.md` assumption that POS is an all-channel total for this Section 4 implementation. Before publishing the rebuilt figures, check that the chosen August source rows really follow the user's separate-channel definition. Record any source conflict as a data issue; do not conceal it in the chart.

## Data preparation

1. Obtain August 2026 **outlet-level, channel-level** amounts from the verified source aggregates or underlying August imports that produced the snapshot. Use the existing outlet identity/entity mapping. Do not derive cents from rounded HTML labels or bar widths.
2. Embed only aggregate chart data in the HTML. Never embed source transactions or customer details from the Apps workbook.
3. Use one data array for all scopes. Each outlet record needs a stable outlet ID, display name, entity, and five channel records. Each channel record needs `gross`, `net`, `serviceCharge`, and `tax` as exact decimal strings or `null`. Include a source/coverage marker so missing reports are distinguishable from a genuine zero.
4. Validate source definitions before deriving each metric. Compute `discount = gross - net`, `netSc = net + serviceCharge`, and `netScTax = net + serviceCharge + tax` only when all operands are known on the same financial basis. Do not infer missing SC or SST as zero. If a source explicitly reports zero, retain zero.
5. Aggregate with integer cents or the repository's existing exact-decimal logic while preparing the data. Convert to JavaScript numbers only for Recharts rendering. Show whole RM on axes/labels, but retain cents in tooltips and reconciliation checks.
6. Confirm the outlet roster: 46 All = 43 MY US Pizza + 3 Sabah, including the two outlets whose POS report is unavailable. Preserve their other reported channels and label the total as partial when any expected channel is unavailable.
7. Reconcile the prepared Gross figures against the current Section 4 snapshot where the same financial basis applies. Reconcile Net and other metrics against their verified outlet/channel source totals. Document any discrepancy before replacing the snapshot.

### Chart data shape

```js
{
  id: 'stable-outlet-id',
  name: 'US Pizza ...',
  entity: 'MY US PIZZA', // or 'Sabah'
  channels: {
    pos:        { gross: '0.00', net: '0.00', serviceCharge: '0.00', tax: '0.00', status: 'reported' },
    grab:       { gross: null, net: null, serviceCharge: null, tax: null, status: 'unavailable' },
    foodpanda:  { /* same fields */ },
    shopee:     { /* same fields */ },
    apps:       { /* same fields */ }
  }
}
```

This is a schema example, not an outlet value. Populate it only from verified August aggregates. A missing source is `null`, never synthetic `0.00`.

## Chart and interaction design

- Keep the Section 4 heading and August period label. Put the metric controls and Total/By platform toggle in one responsive control row, as in the captured system. Retain the August-only **Discount** tab in addition to the captured system's four tabs.
- Once all five metric datasets are verified, default to **Net / Total** to match the captured system. Persist the selected metric and view in the existing `S` state when changing entity scope or leaving and returning to Section 4.
- Use a vertical `BarChart` with a category X axis for outlets and an RM Y axis. Sort by the selected metric's reported total, descending; break ties by outlet name and stable ID. Use a fixed chart height near 480 px and a width based on outlet count (roughly 46–50 px per outlet, with a viewport-width minimum). Place it in an `overflow-x-auto` wrapper and show an outlet-count scroll hint.
- **Total:** one bar per outlet, using the sum of known separate channels. **By platform:** five stacked series (Grab, FoodPanda, Shopee, Apps, POS) using the existing colours. The total bar and top of the stack must use the same amount.
- Use a shared tooltip with outlet, selected metric, each channel amount or `—`, reported total, and a clear `Partial coverage` flag where relevant. Labels and accessible text must not imply that an unavailable source is RM 0. Keep the legend in the existing channel order.
- Handle zero outlets, all-unavailable metrics, very long names, mobile horizontal scrolling, and reduced-motion settings. Provide keyboard-operable buttons with `aria-pressed` and visible focus.
- Scope filtering must operate on the single data array, not three separately maintained chart copies. Avoid changing the existing section/entity navigation behavior.

## Standalone runtime integration

1. Build a small **Section 4 chart island** using the already installed React, ReactDOM, and Recharts packages. Bundle that island into an inline script in the HTML so the file continues to open offline with no CDN or server dependency. Do not add a new package.
2. Keep the existing vanilla JavaScript shell. On `render()`, when `S.section === 'salesByOutlet'`, mount the chart island into a dedicated Section 4 container after inserting the section markup. Unmount the prior root before replacing `views.innerHTML`; this prevents stale React roots and listeners when switching section or scope.
3. Do not keep the 46 pre-rendered CSS bars beside the new chart. Replace only Section 4's bar region and control wiring. Retain the surrounding card style, type, colours, and layout shell.
4. Update Section 4 copy so it describes the separate POS channel and distinguishes a reported-channel sum from a complete five-channel total when coverage is partial.

## Implementation sequence

1. Extract/verify outlet-channel August aggregates and the five metric definitions. Produce a small reconciliation report before editing the chart.
2. Add the aggregate payload to the standalone HTML and check roster, entities, precision, and null status.
3. Replace the three Section 4 snapshot fragments with one shared mount structure and add chart state/wiring to the standalone interaction layer.
4. Inline the bundled chart island and style it to the captured system layout.
5. Verify data, interactions, visual layout, and offline operation. Keep the final diff limited to the August HTML; this plan file is the implementation handoff.

## Acceptance checks

- Directly open the HTML file offline. Section 4 renders without network requests or console errors.
- All five metrics and both views work in All, MY US Pizza, and Sabah. Scope/section changes retain chart selections and create no duplicate charts or handlers.
- All scope shows 46 outlets; entity scopes show 43 and 3. Outlet order changes with the selected metric. Horizontal scrolling reveals every outlet on narrow screens.
- For each outlet/metric, the Total bar equals the sum of its displayed known channel segments to the cent. Missing source values remain `—`; partial totals are labelled.
- Gross, Net, Discount, Net + SC, and Net + SC + SST agree with the verified August outlet/channel aggregates and source definitions. No values are reconstructed from rounded screenshot text.
- A browser pass checks desktop and mobile width, tooltips, keyboard controls, legend, labels, and both views. A static check confirms no external asset URLs or customer-level data were added.

## Data gate

The current standalone file does **not** contain the complete outlet/channel data needed for all five metrics. Finish data preparation before enabling those views. If a metric cannot be supported by verified August source data, render it unavailable with the reason; never fill it using a guessed percentage, a different month's value, or zero.
