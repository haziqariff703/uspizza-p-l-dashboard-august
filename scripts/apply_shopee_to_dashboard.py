"""Write the August 2026 Shopee channel figures into the standalone HTML.

Reads the Section 4 dataset built by scripts/build_section4_august_dataset.mts
(which already has Shopee wired into SOURCE_FILES) and patches:

  - Section 1 (overview): the Shopee column of the Gross -> Collected platform
    derivation table, for the `all` and `myUsPizza` scopes (all 44 outlets
    with Shopee data are MY US PIZZA entity; `sabah`'s two outlets have none,
    so that scope is untouched).
  - Section 3 (coverage): the Shopee mini coverage tile's Imported/Unavailable
    breakdown, same two scopes.

Section 4 (salesByOutlet) and the __matrix Shopee flags are already handled by
scripts/build_section4_island.mts. Section 2 (fees) is untouched: Shopee's own
export carries no commission column (src/lib/salesImportParser.ts marks it
AMOUNT_UNKNOWN, an owner-confirmed rule), so there is no commission figure to
add without inventing one.

Cell lookup is by row label + column position, not by neighbouring cell
values, because those differ across the `all` / `myUsPizza` scope fragments.

Re-runnable only against the unpatched-for-Shopee snapshot.
"""
import json
from decimal import Decimal, ROUND_HALF_UP

DASH = '—'  # em dash, the page's placeholder for an unknown figure
HTML = 'US-Pizza-August-2026-Dashboard.html'
DATASET = '.s4tmp/section4-august-dataset.json'

D = lambda v: Decimal(str(v))


rm0 = lambda v: 'RM ' + f'{D(v).quantize(Decimal("1"), ROUND_HALF_UP):,}'
rm2 = lambda v: 'RM ' + f'{D(v).quantize(Decimal("0.01"), ROUND_HALF_UP):,}'


def replace_once(text, old, new, what):
    if text.count(old) != 1:
        raise SystemExit(f'{what}: expected exactly one match, found {text.count(old)}')
    return text.replace(old, new)


def totals(dataset, entity_filter):
    rows = [o for o in dataset['outlets']
            if o['channels']['shopee']['status'] == 'reported' and entity_filter(o['entity'])]
    gross = sum((D(r['channels']['shopee']['gross']) for r in rows), Decimal(0))
    net = sum((D(r['channels']['shopee']['net']) for r in rows), Decimal(0))
    tax = sum((D(r['channels']['shopee']['tax']) for r in rows), Decimal(0))
    sc = sum((D(r['channels']['shopee']['serviceCharge']) for r in rows), Decimal(0))
    discount = gross - net
    collected = net + sc + tax
    total_outlets = sum(1 for o in dataset['outlets'] if entity_filter(o['entity']))
    return {
        'rows': len(rows), 'total': total_outlets,
        'gross': gross, 'discount': discount, 'net': net, 'sc': sc, 'tax': tax, 'collected': collected,
    }


# Grab_Summary.xlsx 'Summary' sheet (company-wide, matches Section 2's own
# already-displayed totals exactly: COMISSION 405,121.15 + ADVERTISEMENT
# 109,727.28 + PLATFORM/SERVICE FEES 15,764.40 + ADJUSTMENT 870.78 =
# RM 531,483.61, Section 2's 'Total fees / month'). Company-wide only — no
# entity-scoped split exists for these deductions, so this is applied to the
# `all` scope only, not `myUsPizza`.
GRAB_GROSS = Decimal('1538244.32')
GRAB_NET = Decimal('1247383.17')
GRAB_TAX = Decimal('74755.53')
GRAB_FEES = Decimal('405121.15') + Decimal('109727.28') + Decimal('15764.40') + Decimal('870.78')
GRAB_COLLECTED = GRAB_NET + GRAB_TAX
GRAB_SETTLEMENT = GRAB_COLLECTED - GRAB_FEES
GRAB = {
    'collected': GRAB_COLLECTED, 'fees': GRAB_FEES, 'settlement': GRAB_SETTLEMENT,
    'kept_pct': GRAB_SETTLEMENT / GRAB_GROSS * 100,
}


TD_OPEN = '<td class="px-3 py-2 align-middle text-right tabular-nums text-slate-700"'


def nth_td(frag, row_label_html, n, td_open=TD_OPEN):
    """Byte offsets of the n-th (1-based) data <td ...>...</td> after a row's
    label cell, bounded to that row (</tr>) so a short row can't walk into
    the next one. Column order: Grab(1) FoodPanda(2) Shopee(3) Apps(4) POS(5)
    All-channel(6)."""
    label_idx = frag.index(row_label_html)
    row_end = frag.index('</tr>', label_idx)
    pos = label_idx
    for _ in range(n):
        pos = frag.index(td_open, pos + 1)
        if pos >= row_end:
            raise SystemExit(f'{row_label_html!r}: ran out of cells before column {n}')
    open_end = frag.index('>', pos) + 1
    close = frag.index('</td>', open_end)
    return open_end, close


def set_cell(frag, row_label_html, n, value_html, td_open=TD_OPEN):
    open_end, close = nth_td(frag, row_label_html, n, td_open)
    old_value = frag[open_end:close]
    if old_value != DASH:
        raise SystemExit(f'{row_label_html!r} column {n}: expected {DASH!r} placeholder, found {old_value!r}')
    return frag[:open_end] + value_html + frag[close:]


TD_TFOOT_BOLD = '<td class="px-3 py-2 align-middle text-right tabular-nums text-slate-900"'
TD_PCT_KEPT = '<td class="px-3 py-2 align-middle text-right text-xs font-semibold tabular-nums text-slate-500"'


def set_pct_kept_cell(frag, n, pct_text):
    """The '% kept' row's cells carry a title="{pct} of {gross} gross sales"
    attribute in addition to the visible text, both currently placeholders."""
    label_idx = frag.index('>% kept</td>')
    row_end = frag.index('</tr>', label_idx)
    pos = label_idx
    for _ in range(n):
        pos = frag.index(TD_PCT_KEPT, pos + 1)
        if pos >= row_end:
            raise SystemExit(f'% kept: ran out of cells before column {n}')
    title_start = frag.index('title="', pos) + len('title="')
    title_close = frag.index('"', title_start)
    old_title = frag[title_start:title_close]
    if DASH not in old_title:
        raise SystemExit(f'% kept column {n}: title already set ({old_title!r})')
    new_title = old_title.replace(DASH, pct_text, 1)
    frag = frag[:title_start] + new_title + frag[title_close:]

    open_end = frag.index('>', title_close) + 1
    close = frag.index('</td>', open_end)
    old_value = frag[open_end:close]
    if old_value != DASH:
        raise SystemExit(f'% kept column {n}: expected {DASH!r} text, found {old_value!r}')
    return frag[:open_end] + pct_text + frag[close:]


# --------------------------------------------------------------------------- overview
# Column order: Grab(1) FoodPanda(2) Shopee(3) Apps(4) POS(5) All-channel(6).
SHOPEE_COL = 3
GRAB_COL = 1


def patch_overview(frag, t):
    frag = set_cell(frag, '>Gross sales</td>', SHOPEE_COL, rm0(t['gross']))
    frag = set_cell(frag, 'Discount</td>', SHOPEE_COL, rm0(t['discount']))
    frag = set_cell(frag, '>= Net sales</td>', SHOPEE_COL, rm0(t['net']))
    frag = set_cell(frag, '+ Service charge</td>', SHOPEE_COL, rm0(t['sc']))
    frag = set_cell(frag, '+ Tax (SST)</td>', SHOPEE_COL, rm0(t['tax']))
    frag = set_cell(frag, '>= Collected sales</td>', SHOPEE_COL, rm0(t['collected']))
    return frag


def patch_grab_settlement(frag, g):
    """Grab is the one platform Section 2 already has full commission/fee
    itemization for (Grab_Summary.xlsx: COMISSION, ADVERTISEMENT,
    PLATFORM/SERVICE FEES, ADJUSTMENT -> the same RM 531,483.61 'Total fees'
    Section 2 displays). Grab's own serviceCharge is 0 (salesImportParser.ts),
    so Collected sales is computable, which makes Net settlement computable
    too -- the only column where that is true this month."""
    frag = set_cell(frag, '+ Service charge</td>', GRAB_COL, rm0(0))
    frag = set_cell(frag, '>= Collected sales</td>', GRAB_COL, rm0(g['collected']))
    frag = set_cell(frag, '− Commission &amp; fees</td>', GRAB_COL, rm0(g['fees']))
    frag = set_cell(frag, '>= Net settlement</td>', GRAB_COL, rm0(g['settlement']), td_open=TD_TFOOT_BOLD)
    pct_text = f'{g["kept_pct"]:.1f}%'
    frag = set_pct_kept_cell(frag, GRAB_COL, pct_text)
    return frag


def patch_shopee_settlement(frag, t, commission):
    """Shopee's own 'Comission' column, per explicit instruction (overrides
    the parser's earlier no-source rule)."""
    fees = commission
    settlement = t['collected'] - fees
    kept_pct = settlement / t['gross'] * 100
    frag = set_cell(frag, '− Commission &amp; fees</td>', SHOPEE_COL, rm0(fees))
    frag = set_cell(frag, '>= Net settlement</td>', SHOPEE_COL, rm0(settlement), td_open=TD_TFOOT_BOLD)
    frag = set_pct_kept_cell(frag, SHOPEE_COL, f'{kept_pct:.1f}%')
    return frag, settlement


def patch_settlement_bar(frag, g, shopee_settlement):
    """The 'Net Settlement by Platform' bar/legend/note above the table. Run
    after patch_grab_settlement already set Grab to 100%/RM value; adds
    Shopee alongside it and rebalances both to their share of the combined
    reported settlement."""
    total = g['settlement'] + shopee_settlement
    grab_pct = g['settlement'] / total * 100
    shopee_pct = shopee_settlement / total * 100
    grab_amt, shopee_amt = rm0(g['settlement']), rm0(shopee_settlement)
    frag = replace_once(
        frag,
        f'role="img" aria-label="Grab {grab_amt}, FoodPanda —, Shopee —, Apps —, POS —">'
        f'<div style="width:100%;background:#00B14F" title="Grab: {grab_amt}"'
        ' class="transition-all duration-500 motion-reduce:transition-none"></div>'
        '<div style="width:0%;background:#D70F64" title="FoodPanda: —"'
        ' class="transition-all duration-500 motion-reduce:transition-none"></div>'
        '<div style="width:0%;background:#EE4D2D" title="Shopee: —"',
        f'role="img" aria-label="Grab {grab_amt}, FoodPanda —, Shopee {shopee_amt}, Apps —, POS —">'
        f'<div style="width:{grab_pct:.4f}%;background:#00B14F" title="Grab: {grab_amt}"'
        ' class="transition-all duration-500 motion-reduce:transition-none"></div>'
        '<div style="width:0%;background:#D70F64" title="FoodPanda: —"'
        ' class="transition-all duration-500 motion-reduce:transition-none"></div>'
        f'<div style="width:{shopee_pct:.4f}%;background:#EE4D2D" title="Shopee: {shopee_amt}"',
        'settlement bar aria-label and Grab/Shopee segments')
    frag = replace_once(
        frag,
        '<span class="h-2 w-2 rounded-sm" style="background:#EE4D2D" aria-hidden="true"></span>'
        'Shopee<span class="tabular-nums">—</span>',
        '<span class="h-2 w-2 rounded-sm" style="background:#EE4D2D" aria-hidden="true"></span>'
        f'Shopee<span class="tabular-nums">{shopee_amt}</span>',
        'settlement legend Shopee value')
    frag = replace_once(
        frag,
        f'Shares are of {grab_amt} in reported settlements. FoodPanda, Shopee and Apps '
        'have no settlement source yet, so they are not in the bar.',
        f'Shares are of {rm0(total)} in reported settlements. FoodPanda and Apps '
        'have no settlement source yet, so they are not in the bar.',
        'settlement note')
    return frag


SHOPEE_COMMISSION = Decimal('15434.13')  # datasource-summary/Shopee.xlsx 'Comission' column


SHOPEE_NET_SALES = Decimal('499574.85')  # Section 1's Shopee net sales (parser-computed)
GRAB_RATE_PCT = Decimal('405121.15') / Decimal('1247383.17') * 100
SHOPEE_RATE_PCT = SHOPEE_COMMISSION / SHOPEE_NET_SALES * 100


def nth_data_td(frag, row_label_html, n, td_open):
    """n-th (1-based) data <td> after a row label, bounded to that row —
    column order Grab(1) FoodPanda(2) Shopee(3) Apps(4) Total(5)."""
    label_idx = frag.index(row_label_html)
    row_end = frag.index('</tr>', label_idx)
    pos = label_idx
    for _ in range(n):
        pos = frag.index(td_open, pos + 1)
        if pos >= row_end:
            raise SystemExit(f'{row_label_html!r}: ran out of cells before column {n}')
    open_end = frag.index('>', pos) + 1
    close = frag.index('</td>', open_end)
    return open_end, close


def patch_fees_section2(frag):
    """Section 2's summary cards and matrix Commission/Total-fees rows: add
    Shopee's commission (raw 'Comission' column total, RM 15,434.13)
    alongside Grab's, in the correct (3rd/Shopee) column — not FoodPanda's."""
    new_commission_total = Decimal('405121.15') + SHOPEE_COMMISSION
    new_fees_total = Decimal('531483.61') + SHOPEE_COMMISSION
    frag = replace_once(frag, 'Commission / month</p><p class="mt-1.5 text-2xl font-black leading-none '
                               'tracking-tight tabular-nums text-slate-900 ">RM 405,121.15</p>',
                         f'Commission / month</p><p class="mt-1.5 text-2xl font-black leading-none '
                         f'tracking-tight tabular-nums text-slate-900 ">{rm2(new_commission_total)}</p>',
                         'fees card: Commission / month')
    frag = replace_once(frag, 'Total fees / month</p><p class="mt-1.5 text-2xl font-black leading-none '
                               'tracking-tight tabular-nums text-slate-900">RM 531,483.61</p><p class="mt-1.5 '
                               'text-xs leading-4 text-slate-500">Sum of known platform totals — Grab today. '
                               'FoodPanda, Shopee and Apps remain unavailable.</p>',
                         f'Total fees / month</p><p class="mt-1.5 text-2xl font-black leading-none '
                         f'tracking-tight tabular-nums text-slate-900">{rm2(new_fees_total)}</p><p class="mt-1.5 '
                         f'text-xs leading-4 text-slate-500">Sum of known platform totals — Grab and Shopee '
                         f'today. FoodPanda and Apps remain unavailable.</p>',
                         'fees card: Total fees / month')

    dash_td = '<td class="px-3 py-2 align-middle text-right tabular-nums text-slate-700">' \
              '<span class="text-slate-400">-</span></td>'
    shopee_value = ('<td class="px-3 py-2 align-middle text-right tabular-nums text-slate-700">'
                     f'<span class="tabular-nums  ">{rm2(SHOPEE_COMMISSION)}</span></td>')
    open_end, close = nth_data_td(frag, '>Commission</td>', 2, dash_td)
    row_start = frag.rindex('<td', 0, open_end)
    frag = frag[:row_start] + shopee_value + frag[close + len('</td>'):]
    frag = replace_once(
        frag,
        '<td class="px-3 py-2 align-middle text-right font-bold tabular-nums text-slate-900">'
        '<span class="tabular-nums  ">RM 405,121.15</span></td>',
        '<td class="px-3 py-2 align-middle text-right font-bold tabular-nums text-slate-900">'
        f'<span class="tabular-nums  ">{rm2(new_commission_total)}</span></td>',
        'fees matrix: Commission row total')

    # Commission-rate sub-row (commission / net sales), Grab and Shopee only.
    rate_row = (
        '<tr class="border-b border-slate-100 transition-colors hover:bg-slate-50">'
        '<td class="px-3 py-2 align-middle sticky left-0 z-10 bg-white pl-6 text-xs italic text-slate-400 '
        'whitespace-nowrap">rate, % of net sales</td>'
        f'<td class="px-3 py-2 align-middle text-right text-xs italic tabular-nums text-slate-500">{GRAB_RATE_PCT:.1f}%</td>'
        '<td class="px-3 py-2 align-middle text-right text-xs italic text-amber-600">Unavailable</td>'
        f'<td class="px-3 py-2 align-middle text-right text-xs italic tabular-nums text-slate-500">{SHOPEE_RATE_PCT:.1f}%</td>'
        '<td class="px-3 py-2 align-middle text-right text-xs italic text-amber-600">Unavailable</td>'
        '<td class="px-3 py-2 align-middle text-right text-xs italic text-amber-600">Unavailable</td></tr>')
    commission_row_end = frag.index('</tr>', frag.index('>Commission</td>')) + len('</tr>')
    frag = frag[:commission_row_end] + rate_row + frag[commission_row_end:]

    # Total-fees row (tfoot): Shopee cell + grand total.
    total_fees_dash = '<td class="px-3 py-2 align-middle text-right tabular-nums">' \
                       '<span class="text-slate-400">-</span></td>'
    open_end2, close2 = nth_data_td(frag, 'Total fees</td>', 2, total_fees_dash)
    row_start2 = frag.rindex('<td', 0, open_end2)
    shopee_total_fees = ('<td class="px-3 py-2 align-middle text-right tabular-nums">'
                          f'<span class="tabular-nums  ">{rm2(SHOPEE_COMMISSION)}</span></td>')
    frag = frag[:row_start2] + shopee_total_fees + frag[close2 + len('</td>'):]
    frag = replace_once(
        frag,
        '<td class="px-3 py-2 align-middle text-right tabular-nums text-[#C8102E]">'
        '<span class="tabular-nums  ">RM 531,483.61</span></td>',
        '<td class="px-3 py-2 align-middle text-right tabular-nums text-[#C8102E]">'
        f'<span class="tabular-nums  ">{rm2(new_fees_total)}</span></td>',
        'fees matrix: Total fees row grand total')

    # Shopee's composition-bar card: single known category (Commission), so a
    # full 100%-width bar in its own colour, mirroring Grab's card shape.
    frag = replace_once(
        frag,
        '<div class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs"><div class="flex '
        'items-center gap-2 text-sm font-bold text-slate-900"><span class="inline-flex items-center '
        'gap-1.5 shrink-0 "><span class="h-4 w-4 [object Object] inline-flex shrink-0 items-center '
        'justify-center overflow-hidden rounded-md border border-slate-200 bg-white" title="Shopee" '
        'role="img" aria-label="Shopee">',
        '<div class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">'
        '<div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2 text-sm '
        'font-bold text-slate-900"><span class="inline-flex items-center gap-1.5 shrink-0 "><span '
        'class="h-4 w-4 [object Object] inline-flex shrink-0 items-center justify-center overflow-hidden '
        'rounded-md border border-slate-200 bg-white" title="Shopee" role="img" aria-label="Shopee">',
        'fees card: Shopee composition header open')
    frag = replace_once(
        frag,
        '</svg></span></span>Shopee</div><p class="mt-2 text-xs leading-5 text-slate-400">No composition '
        'bar — no fee data supplied for Shopee yet.</p></div>',
        f'</svg></span></span>Shopee</div><span class="text-xs font-semibold text-slate-500">'
        f'{rm2(SHOPEE_COMMISSION)} fees</span></div>'
        '<div class="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">'
        '<div style="width:100%;background:#DC2626"></div></div>'
        '<div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">'
        '<span class="flex items-center gap-1"><span class="h-2 w-2 rounded-sm" style="background:#DC2626" '
        'aria-hidden="true"></span>Commission 100%</span></div></div>',
        'fees card: Shopee composition bar body')
    return frag


# --------------------------------------------------------------------------- coverage mini tile
ICON_OK = ('<svg width="1.5em" height="1.5em" stroke-width="1.5" viewBox="0 0 24 24" fill="none" '
           'xmlns="http://www.w3.org/2000/svg" color="currentColor" class="h-2 w-2">'
           '<path d="M5 13L9 17L19 7" stroke="currentColor" stroke-linecap="round" '
           'stroke-linejoin="round"></path></svg>')
LI_OK = ('<li class="flex items-center justify-between gap-2 text-[11px]">'
         '<span class="flex items-center gap-1 text-slate-600">'
         '<span class="flex h-3.5 w-3.5 items-center justify-center rounded-full text-emerald-700 bg-emerald-100">'
         f'{ICON_OK}</span><span>Imported</span></span>'
         '<span class="font-bold tabular-nums text-slate-900">{count}</span></li>')


def patch_coverage_tile(frag, t):
    """The Shopee mini coverage tile: icon + label, '/{total}' count, then an
    Imported/Unavailable breakdown list, mirroring GRN's own tile pattern.

    The count denominator is read back from the page rather than assumed:
    the myUsPizza-scope snapshot's sibling tiles (POS, Grab, FoodPanda, Apps)
    already show '/43' for a 44-outlet scope, a pre-existing off-by-one in
    how this snapshot was originally generated, unrelated to Shopee. Since
    Shopee reaches full coverage (44/44) where the other channels still have
    real gaps, mirroring that same '43' here would show an impossible
    negative gap count, so this tile uses the correct scope total (t['total'])
    instead — deliberately diverging from the sibling tiles' pre-existing
    quirk rather than propagating it."""
    label = 'title="Shopee" role="img" aria-label="Shopee"'
    first = frag.index(label)
    icon_start = frag.index(label, first + 1)
    block_start = frag.rindex('<div class="rounded-xl border border-slate-200 bg-slate-50/50 p-3">', 0, icon_start)
    block_end = frag.index('</ul></div>', icon_start) + len('</ul></div>')
    old_block = frag[block_start:block_end]

    count_marker = '<span class="text-[11px] font-semibold tabular-nums text-slate-500">/'
    count_start = old_block.index(count_marker) + len(count_marker)
    count_end = old_block.index('</span>', count_start)
    new_block = (old_block[:count_start - len(count_marker)]
                 + f'<span class="text-[11px] font-semibold tabular-nums text-slate-500">{t["rows"]}/{t["total"]}</span>'
                 + old_block[count_end + len('</span>'):])

    old_list = ('<ul class="mt-2 space-y-1"><li class="flex items-center justify-between gap-2 text-[11px]">'
                '<span class="flex items-center gap-1 text-slate-600"><span class="flex h-3.5 w-3.5 items-center '
                'justify-center rounded-full text-slate-500 bg-slate-100"><svg width="1.5em" height="1.5em" '
                'stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" '
                'color="currentColor" class="h-2 w-2"><path d="M8 12H16" stroke="currentColor" '
                'stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 22C17.5228 22 22 17.5228 22 12C22 '
                '6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" '
                'stroke-linecap="round" stroke-linejoin="round"></path></svg></span><span>Unavailable</span></span>'
                '<span class="font-bold tabular-nums text-slate-900">')
    li_start = new_block.index(old_list)
    li_num_end = new_block.index('</span></li></ul>', li_start)
    old_full_list = new_block[li_start:li_num_end + len('</span></li></ul>')]

    missing = t['total'] - t['rows']
    items = LI_OK.format(count=t['rows'])
    if missing > 0:
        unavailable_li = old_full_list[len('<ul class="mt-2 space-y-1">'):-len('</ul>')]
        suffix = '</span></li>'
        num_pos = unavailable_li.rindex(suffix)
        tag_close = unavailable_li.rindex('>', 0, num_pos) + 1
        unavailable_li = unavailable_li[:tag_close] + str(missing) + suffix
        items += unavailable_li
    new_list = f'<ul class="mt-2 space-y-1">{items}</ul>'
    new_block = new_block.replace(old_full_list, new_list)

    return frag[:block_start] + new_block + frag[block_end:]


def patch_gaps_badge(frag, missing):
    """The colourful summary badge above the mini tiles ('N gaps') is not
    re-rendered by the client-side hydration (confirmed by inspection: the
    live 'Source Check Status' panel below it updates from __matrix, this one
    does not), so it is patched here too rather than left visibly stale."""
    label = 'title="Shopee" role="img" aria-label="Shopee"'
    idx = frag.index(label)
    window_end = frag.index('gaps</span>', idx) + len('gaps</span>')
    window = frag[idx:window_end]
    old_count = window[window.rindex('</svg>') + len('</svg>'):window.index(' gaps</span>')]
    if not old_count.isdigit():
        raise SystemExit(f'gaps badge: unexpected count text {old_count!r}')
    new_window = window.replace(f'{old_count} gaps</span>', f'{missing} gap{"" if missing == 1 else "s"}</span>')
    return frag[:idx] + new_window + frag[window_end:]


def main():
    dataset = json.load(open(DATASET, encoding='utf-8'))
    src = open(HTML, encoding='utf-8').read()
    marker = '<script id="SSR_DATA" type="application/json">'
    start = src.index(marker) + len(marker)
    end = src.index('</script>', start)
    data = json.loads(src[start:end])

    scopes = {
        'all': lambda e: True,
        'myUsPizza': lambda e: 'sabah' not in e.lower(),
    }
    for scope, entity_filter in scopes.items():
        t = totals(dataset, entity_filter)
        data[scope]['overview'] = patch_overview(data[scope]['overview'], t)
        data[scope]['coverage'] = patch_coverage_tile(data[scope]['coverage'], t)
        data[scope]['coverage'] = patch_gaps_badge(data[scope]['coverage'], t['total'] - t['rows'])
        print(f'{scope}: {t["rows"]}/{t["total"]} outlets - gross {rm0(t["gross"])}, '
              f'net {rm0(t["net"])}, SST {rm0(t["tax"])}')

    # Grab commission/settlement: company-wide only (Grab_Summary.xlsx has no
    # entity split), so this is 'all' scope only.
    data['all']['overview'] = patch_grab_settlement(data['all']['overview'], GRAB)
    data['all']['overview'] = patch_settlement_bar(data['all']['overview'], GRAB)
    print(f'all: Grab settlement RM {GRAB["settlement"]:,} ({GRAB["kept_pct"]:.1f}% kept), '
          f'fees RM {GRAB["fees"]:,}')

    payload = json.dumps(data, ensure_ascii=False).replace('</script>', '<\\/script>')
    src = src[:start] + payload + src[end:]
    open(HTML, 'w', encoding='utf-8').write(src)
    print(f'patched {HTML}')


if __name__ == '__main__':
    main()
