"""Write the August 2026 Total GRN purchase figures into the standalone HTML.

Reads the view model built by scripts/grn_view_model.py and rewrites the
SSR_DATA fragments for sections 1, 3, 5, 6 and 7 plus the `__matrix` GRN flags,
for all three entity scopes, so every scope tells the same story. Re-runnable
only against the unpatched snapshot: it edits the checked-in fragments in place,
so re-run it from a clean copy of the HTML.
"""
import json, re, sys
from decimal import Decimal, ROUND_HALF_UP

sys.path.insert(0, 'scripts')
from grn_view_model import build, HTML

DASH = '—'
D = lambda v: Decimal(str(v))


def group(d: Decimal) -> str:
    """Match the page's existing JS number formatting: grouped, up to 2 dp."""
    text = f'{d:,.2f}'
    if '.' in text:
        text = text.rstrip('0').rstrip('.')
    return text or '0'


def money(text: str, negative: bool) -> str:
    """The page writes a loss as a minus sign in front of the currency."""
    return ('− ' if negative else '') + 'RM ' + text


rm0 = lambda v: money(f'{abs(D(v)).quantize(Decimal("1"), ROUND_HALF_UP):,}', D(v) < 0)
rm2 = lambda v: money(group(abs(D(v))), D(v) < 0)
pct = lambda v: ('−' if v < 0 else '') + f'{abs(v):.1f}%'

SCOPES = {
    'all': lambda o: True,
    'myUsPizza': lambda o: 'sabah' not in o['entity'].lower(),
    'sabah': lambda o: 'sabah' in o['entity'].lower(),
}


def scope_rows(vm, matrix, scope):
    """Outlets in scope, each with its GRN amount (None when the file has no rows)."""
    rows = []
    for outlet in matrix:
        if not SCOPES[scope](outlet):
            continue
        grn = vm['outlets'].get(outlet['id'])
        rows.append({
            'id': outlet['id'], 'name': outlet['name'], 'netSales': D(outlet['netSales']),
            'purchases': D(grn['amount']) if grn else None,
            'lines': grn['lines'] if grn else 0, 'grns': grn['grns'] if grn else 0,
        })
    return rows


def totals(rows):
    matched = [r for r in rows if r['purchases'] is not None]
    purchases = sum((r['purchases'] for r in matched), Decimal(0))
    net = sum((r['netSales'] for r in matched), Decimal(0))
    profit = net - purchases
    margin = float(profit / net * 100) if net else None
    return matched, purchases, net, profit, margin


def replace_once(text, old, new, what):
    if text.count(old) != 1:
        raise SystemExit(f'{what}: expected exactly one match, found {text.count(old)}')
    return text.replace(old, new)


# --------------------------------------------------------------------------- 1
def patch_overview(frag, rows, vm):
    matched, purchases, net, profit, margin = totals(rows)
    n, total = len(matched), len(rows)
    frag = replace_once(
        frag,
        f'border-slate-200 bg-slate-50 text-slate-700">{DASH} gross margin</span>',
        f'border-emerald-200 bg-emerald-50 text-emerald-700">{pct(margin)} gross margin</span>',
        'overview margin badge')
    frag = replace_once(
        frag,
        f'border-slate-200 bg-slate-50 text-slate-700">GP {DASH}</span>',
        f'border-emerald-200 bg-emerald-50 text-emerald-700">GP {rm0(profit)}</span>',
        'overview GP badge')
    frag = replace_once(
        frag,
        f'<dd class="mt-1 text-xl font-bold tabular-nums text-slate-900">{DASH}</dd>'
        f'<dd class="mt-0.5 text-xs text-slate-400">Mapped GRN coverage</dd>',
        f'<dd class="mt-1 text-xl font-bold tabular-nums text-slate-900">{rm0(purchases)}</dd>'
        f'<dd class="mt-0.5 text-xs text-slate-400">Total GRN · {n} of {total} outlets mapped</dd>',
        'overview total purchases')
    frag = replace_once(
        frag,
        f'<dd class="mt-1 text-xl font-bold tabular-nums text-emerald-600">{DASH}</dd>'
        f'<dd class="mt-0.5 text-xs text-slate-400">Matched outlets: POS net − GRN</dd>',
        f'<dd class="mt-1 text-xl font-bold tabular-nums text-emerald-600">{rm0(profit)}</dd>'
        f'<dd class="mt-0.5 text-xs text-slate-400">Matched outlets: POS net − GRN</dd>',
        'overview gross profit')
    frag = replace_once(
        frag,
        f'<dd class="mt-1 text-xl font-bold tabular-nums text-emerald-600">{DASH}</dd>'
        f'<dd class="mt-0.5 text-xs text-slate-400">of matched-outlet POS net sales</dd>',
        f'<dd class="mt-1 text-xl font-bold tabular-nums text-emerald-600">{pct(margin)}</dd>'
        f'<dd class="mt-0.5 text-xs text-slate-400">of matched-outlet POS net sales '
        f'({rm0(net)})</dd>',
        'overview gross margin')
    external = rm2(vm['controls']['externalTotal'])
    note = (f'{n} matched POS/GRN outlets · imported sales coverage, not full-month profit. '
            f'{total - n} outlet{"" if total - n == 1 else "s"} excluded for missing sales or '
            f'purchases. Goods received at PO price on the Total GRN basis — every '
            f'non-cancelled line, rejected quality included; this is not invoiced purchases or '
            f'accounting COGS. {external} of goods on the three MFM branch codes belongs to '
            f'Manhattan Fish Market, a separate entity, and is not in this figure.')
    frag = replace_once(
        frag,
        f'<p class="mt-3 text-xs text-amber-600">0 matched POS/GRN outlets · imported sales '
        f'coverage, not full-month profit. {total} outlets excluded for missing sales or '
        f'purchases.</p>',
        f'<p class="mt-3 text-xs text-amber-600">{note}</p>',
        'overview profitability note')
    return frag


# --------------------------------------------------------------------------- 3
ICON_OK = ('<svg width="1.5em" height="1.5em" stroke-width="1.5" viewBox="0 0 24 24" fill="none" '
           'xmlns="http://www.w3.org/2000/svg" color="currentColor" class="{cls}">'
           '<path d="M5 13L9 17L19 7" stroke="currentColor" stroke-linecap="round" '
           'stroke-linejoin="round"></path></svg>')
ICON_NO = ('<svg width="1.5em" height="1.5em" stroke-width="1.5" viewBox="0 0 24 24" fill="none" '
           'xmlns="http://www.w3.org/2000/svg" color="currentColor" class="{cls}">'
           '<path d="M8 12H16" stroke="currentColor" stroke-linecap="round" '
           'stroke-linejoin="round"></path><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 '
           '17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" '
           'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></svg>')
LI = ('<li class="flex items-center justify-between gap-2 text-[11px]">'
      '<span class="flex items-center gap-1 text-slate-600">'
      '<span class="flex h-3.5 w-3.5 items-center justify-center rounded-full {dot}">{icon}</span>'
      '<span>{label}</span></span>'
      '<span class="font-bold tabular-nums text-slate-900">{count}</span></li>')


def grn_tile(imported, total):
    items = ''
    if imported:
        items += LI.format(dot='text-emerald-700 bg-emerald-100', icon=ICON_OK.format(cls='h-2 w-2'),
                           label='Imported', count=imported)
    if total - imported:
        items += LI.format(dot='text-slate-500 bg-slate-100', icon=ICON_NO.format(cls='h-2 w-2'),
                           label='Unavailable', count=total - imported)
    return ('<div class="rounded-xl border border-slate-200 bg-slate-50/50 p-3">'
            '<div class="flex items-center justify-between"><div class="flex items-center gap-1.5">'
            '<span class="text-xs font-bold text-slate-800">GRN</span></div>'
            f'<span class="text-[11px] font-semibold tabular-nums text-slate-500">'
            f'{imported}/{total}</span>'
            f'</div><ul class="mt-2 space-y-1">{items}</ul></div>')


TD_GRN_NO = ('<td class="px-2 py-2.5 text-center"><span class="inline-flex items-center '
             'justify-center rounded-md p-1 bg-slate-50 text-slate-600 border-slate-200" '
             'title="GRN: Unavailable">' + ICON_NO.format(cls='h-3 w-3') +
             '<span class="sr-only">GRN: Unavailable</span></span></td>')
MOB_GRN_NO = ('<div class="flex items-center gap-1.5 rounded-lg border border-slate-100 '
              'bg-slate-50/60 px-2 py-1.5" title="GRN: Unavailable">'
              '<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full '
              'text-slate-500 bg-slate-100">' + ICON_NO.format(cls='h-2.5 w-2.5') + '</span>'
              '<span class="truncate text-[11px] font-semibold text-slate-700">GRN</span>'
              '<span class="sr-only">Unavailable</span></div>')
GUARD = '@@GRN-CELL-DONE@@'


def td_grn_ok(title):
    return ('<td class="px-2 py-2.5 text-center"><span class="inline-flex items-center '
            'justify-center rounded-md p-1 bg-emerald-50 text-emerald-700 border-emerald-200" '
            f'title="{title}">' + ICON_OK.format(cls='h-3 w-3') +
            f'<span class="sr-only">{title}</span></span></td>')


def mob_grn_ok(title):
    return ('<div class="flex items-center gap-1.5 rounded-lg border border-slate-100 '
            f'bg-slate-50/60 px-2 py-1.5" title="{title}">'
            '<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full '
            'text-emerald-700 bg-emerald-100">' + ICON_OK.format(cls='h-2.5 w-2.5') + '</span>'
            '<span class="truncate text-[11px] font-semibold text-slate-700">GRN</span>'
            '<span class="sr-only">Imported</span></div>')


def patch_coverage(frag, rows):
    """GRN is a purchase source: it fills its own column and tile, and never
    moves the five-source sales denominator the rest of section 3 reports on."""
    matched = [r for r in rows if r['purchases'] is not None]
    tile = re.search(r'<div class="rounded-xl border border-slate-200 bg-slate-50/50 p-3">'
                     r'<div class="flex items-center justify-between"><div class="flex '
                     r'items-center gap-1\.5"><span class="text-xs font-bold text-slate-800">GRN'
                     r'</span>.*?</ul></div>', frag, re.S)
    if not tile:
        raise SystemExit('coverage: GRN tile not found')
    frag = frag.replace(tile.group(0), grn_tile(len(matched), len(rows)))

    # The pre-rendered first page of the table, and of the mobile list, in the
    # same alphabetical order the interaction layer repaints them in.
    page = sorted(rows, key=lambda r: r['name'])[:10]
    for template_no, ok in ((TD_GRN_NO, td_grn_ok), (MOB_GRN_NO, mob_grn_ok)):
        for row in page:
            index = frag.find(template_no)
            if index < 0:
                raise SystemExit('coverage: ran out of GRN cells to fill')
            if row['purchases'] is None:
                cell = template_no.replace('GRN: Unavailable', GUARD)
            else:
                cell = ok(f'GRN: Imported · {row["lines"]:,} lines / {row["grns"]} GRNs '
                          f'· {rm2(row["purchases"])}')
            frag = frag[:index] + cell + frag[index + len(template_no):]
    return frag.replace(GUARD, 'GRN: Unavailable')


# --------------------------------------------------------------------------- 5/6
def bar_row(rank, name, value_label, width, colour, sub):
    return ('<li class="flex items-center gap-2.5">'
            f'<span class="w-7 shrink-0 text-right text-[11px] font-bold tabular-nums '
            f'text-slate-400">{rank}</span>'
            f'<span class="w-36 shrink-0 truncate text-xs font-semibold text-slate-700" '
            f'title="{name}">{name}</span>'
            '<span class="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/70">'
            f'<span class="block h-full rounded-full" style="width:{width:.4f}%;background:{colour}">'
            '</span></span>'
            f'<span class="w-28 shrink-0 text-right text-xs font-bold tabular-nums '
            f'text-slate-800">{value_label}</span>'
            f'<span class="hidden w-24 shrink-0 text-right text-[11px] tabular-nums '
            f'text-slate-400 sm:block">{sub}</span></li>')


def section5(rows, vm, scope_label):
    matched, purchases, _net, _profit, _margin = totals(rows)
    ranked = sorted(matched, key=lambda r: r['purchases'], reverse=True)
    top = max((r['purchases'] for r in ranked), default=Decimal(1)) or Decimal(1)
    bars = ''.join(
        bar_row(i, r['name'], rm2(r['purchases']), float(r['purchases'] / top * 100), '#0284C7',
                f'{r["grns"]} GRNs')
        for i, r in enumerate(ranked, 1))
    missing = [r['name'] for r in rows if r['purchases'] is None]
    gap = ''
    if missing:
        gap = ('<p class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] '
               f'font-medium text-amber-800">No GRN rows in this file for {", ".join(missing)}. '
               'Unavailable, not RM 0.</p>')
    return (
        '<div class="relative space-y-5 rounded-2xl border border-slate-200 bg-white p-5 '
        'shadow-2xs sm:p-6"><div class="flex items-center gap-2.5">'
        '<span class="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs '
        'font-bold text-white shadow-2xs">5</span><div>'
        '<h2 class="text-lg font-extrabold tracking-tight text-slate-900">Purchases by Outlet</h2>'
        f'<p class="text-xs text-slate-500">Imported GRN purchases · August 2026 · '
        f'{rm2(purchases)} total</p></div></div>'
        '<div class="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">'
        f'<ol class="space-y-2">{bars}</ol></div>'
        f'{gap}'
        f'<p class="text-center text-[11px] text-slate-400">{len(ranked)} of {len(rows)} '
        f'{scope_label} outlets, ranked high → low</p>'
        '<p class="rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">Total GRN basis: '
        'every non-cancelled line in the August GRN summary, at PO unit price × quantity, '
        'including the 296 rejected-quality lines worth RM 29,850.82 group-wide. Goods received, '
        'not invoiced purchases or COGS. The workbook totals '
        f'{rm2(vm["controls"]["sourceTotal"])} across {vm["controls"]["branchCodes"]} branch codes; '
        f'{rm2(vm["controls"]["mappedTotal"])} maps to the 46 dashboard outlets; '
        f'{rm2(vm["controls"]["externalTotal"])} on the three MFM branch codes is Manhattan Fish '
        'Market, a separate entity, and is excluded here rather than merged into the similarly '
        'numbered US Pizza outlets.</p></div>')


def section6(rows):
    usable = [r for r in rows if r['purchases'] is not None and r['netSales']]
    rates = sorted(((r, float(r['purchases'] / r['netSales'] * 100)) for r in usable),
                   key=lambda pair: pair[1], reverse=True)
    top = max((v for _, v in rates), default=1.0) or 1.0
    bars = ''.join(
        bar_row(i, r['name'], pct(v), v / top * 100,
                '#DC2626' if v >= 100 else '#F59E0B' if v >= 40 else '#14B8A6', rm2(r['purchases']))
        for i, (r, v) in enumerate(rates, 1))
    skipped = [r['name'] for r in rows if r['purchases'] is None or not r['netSales']]
    gap = ''
    if skipped:
        gap = ('<p class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] '
               f'font-medium text-amber-800">No ratio for {", ".join(skipped)}: the GRN file has '
               'no rows for them, so the numerator is unknown.</p>')
    return (
        '<div class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">'
        '<div class="flex items-center gap-2.5"><span class="flex h-6 w-6 items-center '
        'justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs">6</span>'
        '<div><h2 class="text-lg font-extrabold tracking-tight text-slate-900">'
        'Purchases-to-Net Sales</h2><p class="text-xs text-slate-500">Imported purchases ÷ net '
        'sales · August 2026 · lower is more efficient</p></div></div>'
        '<div class="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">'
        f'<ol class="space-y-2">{bars}</ol></div>'
        f'{gap}'
        '<div class="grid gap-3 text-xs sm:grid-cols-2">'
        '<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">'
        '<span class="font-bold">Lower %:</span> more cost-efficient purchasing.</div>'
        '<div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">'
        '<span class="font-bold">Higher %:</span> requires review of purchasing and inventory '
        'levels.</div></div>'
        '<p class="rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">Goods received in '
        'August ÷ August net sales. A month of stock build need not match a month of selling, '
        'so a ratio above 100% marks an outlet that received far more than it sold — a new or '
        'restocking outlet, not by itself a loss.</p></div>')


# --------------------------------------------------------------------------- 7
PL_ROW = ('<tr class="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50 ">'
          '<td class="px-3 py-2 tabular-nums text-slate-400">{rank}</td>'
          '<td class="px-3 py-2 font-medium text-slate-800">{name}</td>'
          '<td class="px-3 py-2 text-right tabular-nums text-slate-700">{net}</td>'
          '<td class="px-3 py-2 text-right tabular-nums {pcls}">{purchases}</td>'
          '<td class="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{profit}</td>'
          '<td class="px-3 py-2 text-right font-semibold tabular-nums" '
          'style="color:{mcol}">{margin}</td></tr>')


def patch_pl(frag, rows):
    matched, purchases, net, profit, margin = totals(rows)
    known = sorted((r for r in rows if r['purchases'] is not None),
                   key=lambda r: r['netSales'] - r['purchases'], reverse=True)
    unknown = sorted((r for r in rows if r['purchases'] is None), key=lambda r: r['name'])
    body = ''
    for i, row in enumerate(known + unknown, 1):
        if row['purchases'] is None:
            body += PL_ROW.format(rank=i, name=row['name'], net=rm2(row['netSales']),
                                  pcls='text-slate-500', purchases=DASH, profit=DASH,
                                  mcol='#64748B', margin=DASH)
            continue
        gross = row['netSales'] - row['purchases']
        rate = float(gross / row['netSales'] * 100) if row['netSales'] else None
        body += PL_ROW.format(
            rank=i, name=row['name'], net=rm2(row['netSales']), pcls='text-slate-700',
            purchases=rm2(row['purchases']), profit=rm2(gross),
            mcol='#059669' if gross >= 0 else '#DC2626',
            margin=pct(rate) if rate is not None else DASH)
    start, end = frag.index('<tbody>') + len('<tbody>'), frag.index('</tbody>')
    frag = frag[:start] + body + frag[end:]

    frag = replace_once(
        frag,
        f'<td class="px-3 py-2.5 text-slate-900">Matched total · 0 / {len(rows)} outlets</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-slate-900">{DASH}</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-slate-700">{DASH}</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-slate-900">{DASH}</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-emerald-600">{DASH}</td>',
        f'<td class="px-3 py-2.5 text-slate-900">Matched total · {len(matched)} / {len(rows)} '
        f'outlets</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-slate-900">{rm2(net)}</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-slate-700">{rm2(purchases)}</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-slate-900">{rm2(profit)}</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-emerald-600">{pct(margin)}</td>',
        'section 7 table total')

    frag = replace_once(
        frag,
        f'>Outlets · 0 matched of {len(rows)}</div>'
        f'<div class="flex justify-between py-1"><span class="text-slate-600">Net Sales</span>'
        f'<span class="font-semibold tabular-nums text-slate-900">{DASH}</span></div>'
        f'<div class="flex justify-between py-1 text-slate-500"><span>Purchases</span>'
        f'<span class="tabular-nums">− {DASH}</span></div>'
        f'<div class="flex justify-between border-t border-slate-200 pt-2">'
        f'<span class="font-bold text-slate-900">Gross Profit</span>'
        f'<span class="font-bold tabular-nums text-emerald-600">{DASH} · {DASH}</span></div>',
        f'>Outlets · {len(matched)} matched of {len(rows)}</div>'
        f'<div class="flex justify-between py-1"><span class="text-slate-600">Net Sales (matched)'
        f'</span><span class="font-semibold tabular-nums text-slate-900">{rm2(net)}</span></div>'
        f'<div class="flex justify-between py-1 text-slate-500"><span>Purchases (GRN)</span>'
        f'<span class="tabular-nums">− {rm2(purchases)}</span></div>'
        f'<div class="flex justify-between border-t border-slate-200 pt-2">'
        f'<span class="font-bold text-slate-900">Gross Profit</span>'
        f'<span class="font-bold tabular-nums text-emerald-600">{rm2(profit)} · '
        f'{pct(margin)}</span></div>',
        'section 7 summary')

    # The detail card, which this snapshot pins to one outlet.
    shown = re.search(r'<h3 class="text-lg font-bold text-slate-900">(.*?)</h3>', frag).group(1)
    row = next(r for r in rows if r['name'] == shown)
    if row['purchases'] is not None:
        gross = row['netSales'] - row['purchases']
        rate = float(gross / row['netSales'] * 100) if row['netSales'] else 0.0
        colour = '#059669' if gross >= 0 else '#DC2626'
        frag = replace_once(
            frag,
            '<div class="text-xs uppercase tracking-wide text-slate-400">Gross margin</div>'
            f'<div class="text-2xl font-bold tabular-nums" style="color:#64748B">{DASH}</div>',
            '<div class="text-xs uppercase tracking-wide text-slate-400">Gross margin</div>'
            f'<div class="text-2xl font-bold tabular-nums" style="color:{colour}">{pct(rate)}</div>',
            'section 7 card margin')
        frag = replace_once(
            frag,
            '<div class="flex justify-between text-slate-500"><span>Less: Purchases (GRN)</span>'
            f'<span class="tabular-nums">{DASH}</span></div>',
            '<div class="flex justify-between text-slate-500"><span>Less: Purchases (GRN)</span>'
            f'<span class="tabular-nums">{rm2(row["purchases"])}</span></div>',
            'section 7 card purchases')
        frag = replace_once(
            frag,
            '<span class="font-bold text-slate-900">Gross Profit</span>'
            f'<span class="font-bold tabular-nums" style="color:#64748B">{DASH}</span>',
            '<span class="font-bold text-slate-900">Gross Profit</span>'
            f'<span class="font-bold tabular-nums" style="color:{colour}">{rm2(gross)}</span>',
            'section 7 card profit')
    return frag


# The Full Matrix tab's margin column, which had nothing to divide until GRN
# purchases landed. Written as a JS template-literal fragment, like its siblings.
MATRIX_MARGIN_OLD = (
    '<td class="py-3 px-4 text-right text-slate-400 italic text-[11px]">—</td>')
MATRIX_MARGIN_NEW = (
    '<td class="py-3 px-4 text-right font-bold tabular-nums '
    '${o.purchases == null ? &QUOTtext-slate-400 italic text-[11px]&QUOT '
    ': o.netSales - o.purchases >= 0 ? &QUOTtext-emerald-600&QUOT : &QUOTtext-rose-600&QUOT}">'
    '${o.purchases == null || !o.netSales ? &QUOT—&QUOT '
    ': ((o.netSales - o.purchases) / o.netSales * 100).toFixed(1) + &QUOT%&QUOT}</td>'
).replace('&QUOT', chr(39))


# ---------------------------------------------------------------------------
def refresh_overview(frag, rows, vm):
    matched, purchases, net, profit, margin = totals(rows)
    count, total = len(matched), len(rows)

    # Entity buttons are embedded in each scope fragment. Keep outlet counts
    # aligned with the shared matrix classification.
    my_count = vm['entityCounts']['MY US PIZZA']
    sabah_count = vm['entityCounts']['Sabah']
    dot = chr(183)
    for label, old, new in (('MY US Pizza', 43, my_count), ('Sabah', 3, sabah_count)):
        frag = frag.replace(f'title="{old} operating outlets"',
                            f'title="{new} operating outlets"')
        frag = frag.replace(f'{label} {dot} {old}</button>',
                            f'{label} {dot} {new}</button>')

    frag = re.sub(r'>[-−0-9.,]+% gross margin</span>', f'>{pct(margin)} gross margin</span>', frag, count=1)
    frag = re.sub(r'>GP [-−]?RM [0-9,.]+</span>', f'>GP {rm0(profit)}</span>', frag, count=1)

    purchase_card = (
        '<div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Purchases</dt>'
        f'<dd class="mt-1 text-xl font-bold tabular-nums text-slate-900">{rm2(purchases)}</dd>'
        f'<dd class="mt-0.5 text-xs text-slate-400">Total GRN · {count} of {total} outlets mapped</dd></div>')
    profit_card = (
        '<div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Gross Profit</dt>'
        f'<dd class="mt-1 text-xl font-bold tabular-nums text-emerald-600">{rm0(profit)}</dd>'
        '<dd class="mt-0.5 text-xs text-slate-400">All outlets: POS net − Total GRN</dd></div>')
    margin_card = (
        '<div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Gross Margin</dt>'
        f'<dd class="mt-1 text-xl font-bold tabular-nums text-emerald-600">{pct(margin)}</dd>'
        f'<dd class="mt-0.5 text-xs text-slate-400">of matched-outlet POS net sales ({rm0(net)})</dd></div>')
    for label, replacement in [('Total Purchases', purchase_card), ('Gross Profit', profit_card), ('Gross Margin', margin_card)]:
        pattern = rf'<div><dt class="[^"]*">{re.escape(label)}</dt>.*?</div>'
        frag, count_replaced = re.subn(pattern, replacement, frag, count=1, flags=re.S)
        if count_replaced != 1:
            raise SystemExit(f'overview: could not refresh {label} card')

    external = rm2(vm['controls']['externalTotal'])
    note = (
        f'{count} outlets with purchase totals · imported sales coverage, not full-month profit. '
        'The report includes both the MY US PIZZA and SABAH purchase sheets. '
        'Goods received at PO price on the Total GRN basis, including '
        'rejected-quality lines; this is not invoiced purchases or accounting COGS. '
        f'{external} on three MFM branch codes belongs to Manhattan Fish Market and is excluded.')
    frag = re.sub(r'<p class="mt-3 text-xs text-amber-600">.*?</p>',
                  f'<p class="mt-3 text-xs text-amber-600">{note}</p>', frag, count=1, flags=re.S)
    return frag


def refresh_coverage(frag, rows):
    tile = re.search(r'<div class="rounded-xl border border-slate-200 bg-slate-50/50 p-3">'
                     r'<div class="flex items-center justify-between"><div class="flex '
                     r'items-center gap-1\.5"><span class="text-xs font-bold text-slate-800">GRN'
                     r'</span>.*?</ul></div>', frag, re.S)
    if not tile:
        raise SystemExit('coverage: GRN tile not found')
    matched = [r for r in rows if r['purchases'] is not None]
    frag = frag.replace(tile.group(0), grn_tile(len(matched), len(rows)))
    frag = frag.replace('GRN covers purchases and has no importer yet, so it stays Unavailable.',
                        'GRN totals are mapped for all outlets; Bundusan and EG Mall Inanam use user-supplied totals.')
    frag = frag.replace('GRN totals are mapped for all outlets; Bundusan and EG Mall Inanam use user-supplied totals.',
                        'GRN totals are mapped for all 46 outlets from the MY US PIZZA and SABAH report sheets.')
    return frag


def refresh_pl(frag, rows):
    matched, purchases, net, profit, margin = totals(rows)
    known = sorted((r for r in rows if r['purchases'] is not None),
                   key=lambda r: r['netSales'] - r['purchases'], reverse=True)
    unknown = sorted((r for r in rows if r['purchases'] is None), key=lambda r: r['name'])
    body = ''
    for i, row in enumerate(known + unknown, 1):
        if row['purchases'] is None:
            body += PL_ROW.format(rank=i, name=row['name'], net=rm2(row['netSales']),
                                  pcls='text-slate-500', purchases=DASH, profit=DASH,
                                  mcol='#64748B', margin=DASH)
            continue
        gross = row['netSales'] - row['purchases']
        rate = float(gross / row['netSales'] * 100) if row['netSales'] else None
        body += PL_ROW.format(rank=i, name=row['name'], net=rm2(row['netSales']),
                              pcls='text-slate-700', purchases=rm2(row['purchases']),
                              profit=rm2(gross), mcol='#059669' if gross >= 0 else '#DC2626',
                              margin=pct(rate) if rate is not None else DASH)
    frag, n = re.subn(r'(<tbody>).*?(</tbody>)', rf'\1{body}\2', frag, count=1, flags=re.S)
    if n != 1:
        raise SystemExit('section 7: table body not found')

    tfoot = (
        '<tfoot><tr class="border-t-2 border-slate-200 bg-slate-50 font-bold">'
        '<td class="px-3 py-2.5"></td>'
        f'<td class="px-3 py-2.5 text-slate-900">Matched total · {len(matched)} / {len(rows)} outlets</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-slate-900">{rm2(net)}</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-slate-700">{rm2(purchases)}</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-slate-900">{rm2(profit)}</td>'
        f'<td class="px-3 py-2.5 text-right tabular-nums text-emerald-600">{pct(margin)}</td>'
        '</tr></tfoot>')
    frag, n = re.subn(r'<tfoot>.*?</tfoot>', tfoot, frag, count=1, flags=re.S)
    if n != 1:
        raise SystemExit('section 7: table total not found')

    summary = (
        f'<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Outlets · {len(matched)} matched of {len(rows)}</div>'
        f'<div class="flex justify-between py-1"><span class="text-slate-600">Net Sales (matched)</span><span class="font-semibold tabular-nums text-slate-900">{rm2(net)}</span></div>'
        f'<div class="flex justify-between py-1 text-slate-500"><span>Purchases (GRN)</span><span class="tabular-nums">− {rm2(purchases)}</span></div>'
        f'<div class="flex justify-between border-t border-slate-200 pt-2"><span class="font-bold text-slate-900">Gross Profit</span><span class="font-bold tabular-nums text-emerald-600">{rm2(profit)} · {pct(margin)}</span></div>')
    frag, n = re.subn(r'<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Outlets · .*?</div></div></div>',
                      summary + '</div></div>', frag, count=1, flags=re.S)
    if n != 1:
        raise SystemExit('section 7: summary card not found')

    shown = re.search(r'<h3 class="text-lg font-bold text-slate-900">(.*?)</h3>', frag).group(1)
    row = next((r for r in rows if r['name'] == shown), None)
    if row and row['purchases'] is not None:
        gross = row['netSales'] - row['purchases']
        rate = float(gross / row['netSales'] * 100) if row['netSales'] else 0.0
        colour = '#059669' if gross >= 0 else '#DC2626'
        frag = re.sub(r'(<div class="text-xs uppercase tracking-wide text-slate-400">Gross margin</div><div class="text-2xl font-bold tabular-nums" style="color:)[^"]+(">).*?(</div>)',
                      rf'\g<1>{colour}\g<2>{pct(rate)}\g<3>', frag, count=1)
        frag = re.sub(r'(<span>Less: Purchases \(GRN\)</span><span class="tabular-nums">).*?(</span>)',
                      rf'\g<1>{rm2(row["purchases"])}\g<2>', frag, count=1)
        frag = re.sub(r'(<span class="font-bold text-slate-900">Gross Profit</span><span class="font-bold tabular-nums" style="color:)[^"]+(">).*?(</span>)',
                      rf'\g<1>{colour}\g<2>{rm2(gross)}\g<3>', frag, count=1)
    frag = frag.replace('Source: imported sales and GRN · August 2026',
                        'Source: imported sales, GRN and supplied purchase totals · August 2026')
    return frag


def main():
    vm = build()
    src = open(HTML, encoding='utf-8').read()
    block = re.search(r'(<script id="SSR_DATA" type="application/json">)(.*?)(</script>)', src, re.S)
    data = json.loads(block.group(2))
    matrix = data['__matrix']

    for outlet in matrix:
        grn = vm['outlets'].get(outlet['id'])
        if grn:
            outlet['entity'] = grn['entity']
        outlet['grn'] = 'imported' if grn else 'unavailable'
        outlet['purchases'] = grn['amount'] if grn else None
        outlet['purchaseSource'] = 'workbook' if grn else None

    labels = {'all': 'corporate', 'myUsPizza': 'MY US Pizza', 'sabah': 'Sabah'}
    for scope in SCOPES:
        rows = scope_rows(vm, matrix, scope)
        frag = data[scope]
        frag['overview'] = refresh_overview(frag['overview'], rows, vm)
        frag['coverage'] = refresh_coverage(frag['coverage'], rows)
        frag['purchasesByOutlet'] = section5(rows, vm, labels[scope])
        frag['purchasesToNetSales'] = section6(rows)
        frag['plByOutlet'] = refresh_pl(frag['plByOutlet'], rows)

    payload = json.dumps(data, ensure_ascii=False).replace('</script>', '<\\/script>')
    src = src[:block.start(2)] + payload + src[block.end(2):]

    # The interactive section 4 renderer has a separate channel-level outlet
    # source. Keep its legal entity consistent with the shared outlet matrix.
    kuching = re.compile(r'(\{"id":"060","code":"MY-076","name":"US Pizza Kuching Viva City",'
                         r'"entity":")(?:Sabah|MY US PIZZA)("[,]"channels":\{)')
    src, updated = kuching.subn(r'\g<1>MY US PIZZA\g<2>', src, count=1)
    if updated != 1:
        raise SystemExit(f'coverage entity source: expected one Kuching row, found {updated}')

    have = sum(1 for o in matrix if o['grn'] != 'unavailable')
    src, chip_count = re.subn(
        r"\$\{chip\('GRN', \d+, (?:false|true)\)\}",
        f"${{chip('GRN', {have}, true)}}", src, count=1)
    if chip_count != 1:
        raise SystemExit(f'matrix GRN chip: expected one match, found {chip_count}')
    if MATRIX_MARGIN_OLD in src:
        src = replace_once(src, MATRIX_MARGIN_OLD, MATRIX_MARGIN_NEW, 'matrix margin column')
    src = src.replace('GRN purchases are imported for 44 of 46 outlets;',
                      f'GRN purchase totals are available for {have} of {len(matrix)} outlets;')

    open(HTML, 'w', encoding='utf-8').write(src)
    print(f'patched {HTML}: {have} outlets with purchase totals, '
          f'{rm2(vm["controls"]["mappedTotal"])} mapped, '
          f'{rm2(vm["controls"]["externalTotal"])} external MFM, '
          f'{rm2(vm["controls"]["sourceTotal"])} source total')


if __name__ == '__main__':
    main()
