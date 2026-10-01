"""Write the FoodPanda figures from All Merchant.xlsx ('FoodPanda' sheet) into the standalone HTML.

Input : .s4tmp/fp_new.json  (node --import tsx .s4tmp/fp_new.mts — the sheet's outlet pivot, each
        row mapped to an OUTLET_NAME_MAP code; three rows come back unmatched and are bridged below)
Patches US-Pizza-August-2026-Dashboard.html:
  - S4_DATA      per-outlet FoodPanda gross / net / SST (Sections 4-6 charts read it at runtime)
  - __matrix     per-outlet netSales (Grab + FoodPanda + Apps + POS) and the FoodPanda coverage flag
  - Section 1    FoodPanda column of the derivation table (all / myUsPizza / sabah)
  - Section 2    FoodPanda commission / advertising / adjustments / totals, all three scopes
  - runtime consts that hard-code FoodPanda fees and all-channel net sales

Basis (unchanged from the old figures, checked against them): net = gross - discount; SC = 0;
collected = net + SST; FoodPanda fees = commission + platform fee + adjustment per outlet; advertising
is an all-outlet total only, so it is added to the `all` scope and never to an entity scope.

Owner decisions this run: US PIZZA LANDMARK -> Tanjung Tokong (MY-025), US PIZZA (Bayan Lepas) ->
Summerton (MY-021); Taman Sri Gombak stays excluded (non-corporate); Taman Connaught (MY-051) is not in the
pivot, so its row is the owner's screenshot of the sheet's pivot line (MANUAL_ROWS below).

Not re-runnable: the old figures are located by their current value and must still be present.
"""
import json
import re
from decimal import Decimal, ROUND_HALF_UP

HTML = 'US-Pizza-August-2026-Dashboard.html'
SHEET = '.s4tmp/fp_new.json'
D = Decimal
BRIDGE = {'US PIZZA LANDMARK': 'MY-025', 'US PIZZA (Bayan Lepas)': 'MY-021'}
EXCLUDED = {'US Pizza (Taman Sri Gombak)'}
MANUAL_ROWS = {  # owner-supplied pivot row, US Pizza (Taman Connaught)
    'MY-051': {'name': 'US Pizza (Taman Connaught)', 'code': 'MY-051', 'gross': 17821.8, 'discount': 4655.23,
               'fee': 0, 'commission': 3521.23, 'sst': 936.34, 'adjustment': 122.93},
}
ADVERTISING = D('33386.91')  # header block of the FoodPanda sheet, all outlets

q2 = lambda v: D(v).quantize(D('0.01'), ROUND_HALF_UP)
rm0 = lambda v: 'RM ' + f'{D(v).quantize(D("1"), ROUND_HALF_UP):,}'
rm2 = lambda v: 'RM ' + f'{q2(v):,}'
num2 = lambda v: f'{q2(v):.2f}'


def once(text, old, new, what, count=1):
    n = text.count(old)
    if n != count:
        raise SystemExit(f'{what}: expected {count} match(es) of {old!r}, found {n}')
    return text.replace(old, new)


raw = open(HTML, encoding='utf8', newline='').read()
pat = lambda i: re.compile(r'(<script id="%s" type="application/json">)(.*?)(</script>)' % i, re.S)
ssr = json.loads(pat('SSR_DATA').search(raw).group(2))
s4 = json.loads(pat('S4_DATA').search(raw).group(2))
sheet = json.load(open(SHEET, encoding='utf8'))

# ---------------------------------------------------------------- new per-outlet figures
rows = {}
for r in sheet['rows']:
    rows[r['code']] = r
by_name = {}
for r in sheet['rows']:
    by_name[r['name']] = r
missing_bridge = set(BRIDGE) | EXCLUDED
if set(sheet['unmatched']) != missing_bridge:
    raise SystemExit(f'unmatched rows changed: {sheet["unmatched"]}')

# fp_new.json only keeps matched rows; re-read the three bridged rows from the workbook.
import openpyxl  # noqa: E402
wb = openpyxl.load_workbook('datasource/datasource-summary/All Merchant.xlsx', read_only=True, data_only=True)
pivot = list(wb['FoodPanda'].iter_rows(values_only=True))
start = next(i for i, r in enumerate(pivot) if r[0] == 'Row Labels')
for r in pivot[start + 1:]:
    if r[0] in BRIDGE:
        rows[BRIDGE[r[0]]] = {'name': r[0], 'code': BRIDGE[r[0]], 'gross': r[1], 'discount': r[2],
                              'fee': r[3], 'commission': r[4], 'sst': r[5], 'adjustment': r[6]}

rows.update(MANUAL_ROWS)
new = {}
for code, r in rows.items():
    g, disc = D(str(r['gross'])), D(str(r['discount']))
    new[code] = {
        'gross': q2(g), 'net': q2(g - disc), 'tax': q2(D(str(r['sst']))), 'disc': q2(disc),
        'comm': q2(D(str(r['commission']))), 'fee': q2(D(str(r['fee']))), 'adj': q2(D(str(r['adjustment']))),
    }

# ---------------------------------------------------------------- old (current) figures + scopes
old = {}
scope_of = {}
for o in s4['outlets']:
    f = o['channels']['foodpanda']
    old[o['code']] = {'gross': D(f['gross']), 'net': D(f['net']), 'tax': D(f['tax'])}
    scope_of[o['code']] = 'sabah' if 'SABAH' in o['entity'].upper() else 'myUsPizza'
if set(new) - set(old):
    raise SystemExit(f'sheet rows without a dashboard outlet: {set(new) - set(old)}')


def totals(table, scope):
    keys = ['gross', 'net', 'tax', 'disc', 'comm', 'fee', 'adj']
    acc = {k: D(0) for k in keys}
    for code, v in table.items():
        if scope != 'all' and scope_of[code] != scope:
            continue
        for k in keys:
            acc[k] += v.get(k, D(0))
    return acc


T_new = {s: totals(new, s) for s in ('all', 'myUsPizza', 'sabah')}
T_old = {s: totals({c: {**v, 'disc': v['gross'] - v['net']} for c, v in old.items()}, s)
         for s in ('all', 'myUsPizza', 'sabah')}
# old-figure fingerprint: proves we are replacing what the page shows
if rm0(T_old['all']['gross']) != 'RM 194,559' or rm0(T_old['sabah']['net']) != 'RM 7,837':
    raise SystemExit('old FoodPanda figures no longer match the page — already patched?')

for s in T_new:
    t = T_new[s]
    t['collected'] = t['net'] + t['tax']
    t['fees_ex_ads'] = t['comm'] + t['fee'] + t['adj']
    t['fees'] = t['fees_ex_ads'] + (ADVERTISING if s == 'all' else 0)
    t['ads'] = ADVERTISING if s == 'all' else D(0)
OLD_FP_FEES = {'all': D('55508.95'), 'myUsPizza': D('44036.63'), 'sabah': D('2170.54')}
OLD_FP_COMM = {'all': D('43447.48'), 'myUsPizza': D('41378.60'), 'sabah': D('2068.88')}
OLD_FP_ADJ = {'all': D('2759.69'), 'myUsPizza': D('2658.03'), 'sabah': D('101.66')}
OLD_FP_ADS = D('9301.78')

# ---------------------------------------------------------------- 1. S4_DATA
for o in s4['outlets']:
    code = o['code']
    if code in new:
        o['channels']['foodpanda'].update(
            {'gross': num2(new[code]['gross']), 'net': num2(new[code]['net']),
             'serviceCharge': '0.00', 'tax': num2(new[code]['tax']), 'status': 'reported'})
    else:
        raise SystemExit(f'{code} {o["name"]}: no FoodPanda figure and no rule for it')
s4['definitionNotes'] = [n for n in s4['definitionNotes'] if not n.startswith('FoodPanda advertising')]
s4['definitionNotes'].append(
    'FoodPanda outlet figures come from the All Merchant.xlsx FoodPanda sheet. US PIZZA LANDMARK is read as '
    'Tanjung Tokong and US PIZZA (Bayan Lepas) as Summerton; Taman Sri Gombak is not a corporate outlet and '
    'is excluded; Taman Connaught comes from the pivot row supplied separately.')
s4['definitionNotes'].append(
    'FoodPanda advertising is supplied only as an all-outlet summary amount; it is not allocated by outlet or entity.')

# ---------------------------------------------------------------- 2. __matrix
by_id = {m['name']: m for m in ssr['__matrix']}
s4_by_code = {o['code']: o for o in s4['outlets']}
for o in s4['outlets']:
    m = by_id.get(o['name'])
    if m is None:
        raise SystemExit(f'{o["name"]} not in __matrix')
    delta = (new[o['code']]['net'] if o['code'] in new else D(0)) - old[o['code']]['net']
    m['netSales'] = float(q2(D(str(m['netSales'])) + delta))
    m['foodpanda'] = 'imported'

# ---------------------------------------------------------------- 3. Section 1 (SSR) FoodPanda column
TD = '<td class="px-3 py-2 align-middle text-right tabular-nums text-slate-700"'
FP_COL = 2


def set_cell(frag, label, value, what):
    at = frag.index(label)
    row_end = frag.index('</tr>', at)
    pos = at
    for _ in range(FP_COL):
        pos = frag.index(TD, pos + 1)
        if pos >= row_end:
            raise SystemExit(f'{what}: row too short')
    open_end = frag.index('>', pos) + 1
    close = frag.index('</td>', open_end)
    return frag[:open_end] + value + frag[close:]


for scope in ('all', 'myUsPizza', 'sabah'):
    frag = ssr[scope]['overview']
    t = T_new[scope]
    frag = set_cell(frag, '>Gross sales</td>', rm0(t['gross']), 'gross')
    frag = set_cell(frag, 'Discount</td>', rm0(t['disc']), 'discount')
    frag = set_cell(frag, '>= Net sales</td>', rm0(t['net']), 'net')
    frag = set_cell(frag, '+ Tax (SST)</td>', rm0(t['tax']), 'sst')
    frag = set_cell(frag, '>= Collected sales</td>', rm0(t['collected']), 'collected')
    if scope == 'all':  # the other two scopes leave fees/settlement to the runtime script
        frag = set_cell(frag, '− Commission &amp; fees</td>', rm0(t['fees']), 'fees')
    ssr[scope]['overview'] = frag

# ---------------------------------------------------------------- 4. Section 2 (SSR)
def pct(a, b):
    return (a / b * 100) if b else D(0)


for scope in ('all', 'myUsPizza', 'sabah'):
    frag = ssr[scope]['fees']
    t = T_new[scope]
    ofees, ocomm, oadj = OLD_FP_FEES[scope], OLD_FP_COMM[scope], OLD_FP_ADJ[scope]
    dcomm = t['comm'] - ocomm
    dfees = t['fees'] - ofees
    dads = t['ads'] - (OLD_FP_ADS if scope == 'all' else 0)
    # card + matrix totals that include FoodPanda: shift by the FoodPanda delta
    def shift(frag, current, delta, what, count=2):
        return once(frag, rm2(current), rm2(current + delta), what, count)

    frag = once(frag, rm2(ocomm), rm2(t['comm']), f'{scope} FP commission', 2 if scope != 'all' else 1)
    frag = once(frag, rm2(oadj), rm2(t['adj']), f'{scope} FP adjustment', 2 if scope != 'all' else 1)
    frag = once(frag, rm2(ofees), rm2(t['fees']), f'{scope} FP total fees', 2)
    if scope == 'all':
        frag = shift(frag, D('464002.76'), dcomm, 'all commission total')
        frag = shift(frag, D('119029.06'), dads, 'all advertising total')
        frag = shift(frag, D('605510.61'), dfees, 'all total fees')
        frag = once(frag, rm2(OLD_FP_ADS), rm2(t['ads']), 'FP advertising', 1)
        frag = once(frag, '>24.9%<', f'>{pct(t["comm"], t["net"]):.1f}%<', 'FP rate')
        # composition bar
        shares = [t['comm'], t['ads'], D(0), t['adj']]
        total = sum(shares)
        names = ['Commission', 'Advertising', 'Platform / service fees', 'Adjustments / credits']
        old_shares = [D('43447.48'), D('9301.78'), D(0), D('2759.69')]
        old_total = sum(old_shares)
        for nm, os_, ns in zip(names, old_shares, shares):
            frag = once(frag, f'{nm} {round(os_ / old_total * 100)}%', f'{nm} {round(ns / total * 100)}%',
                        f'FP composition {nm}', 2 if nm == 'Commission' else 2)
        for os_, ns in zip(old_shares, shares):
            frag = once(frag, f'width:{os_ / old_total * 100:.6f}%', f'width:{ns / total * 100:.6f}%',
                        'FP composition width', 1)
    else:
        frag = shift(frag, {'myUsPizza': D('450339.21'), 'sabah': D('13663.55')}[scope], dcomm, f'{scope} commission')
        frag = shift(frag, {'myUsPizza': D('578200.58'), 'sabah': D('18008.25')}[scope], dfees, f'{scope} total fees')
        shares = [t['comm'], D(0), t['adj']]
        total = sum(shares)
        names = ['Commission', 'Platform / service fees', 'Adjustments / credits']
        old_shares = [ocomm, D(0), oadj]
        old_total = sum(old_shares)
        for nm, os_, ns in zip(names, old_shares, shares):
            frag = once(frag, f'{nm} {round(os_ / old_total * 100)}%', f'{nm} {round(ns / total * 100)}%',
                        f'FP composition {nm}', 2 if nm == 'Commission' or scope == 'x' else 2)
        for os_, ns in zip(old_shares, shares):
            frag = once(frag, f'width:{os_ / old_total * 100:.6f}%', f'width:{ns / total * 100:.6f}%',
                        'FP composition width', 1)
        for nm, ns in zip(names, shares):  # values already shifted above; refresh each title's share
            lo = frag.index('FoodPanda known fee composition')
            hi = frag.index('</div></div>', lo)
            seg, n = re.subn(rf'(title="{re.escape(nm)}: RM [\d,.]+ \()[\d.]+(%\)")',
                             lambda m, ns=ns: f'{m.group(1)}{ns / total * 100:.1f}{m.group(2)}', frag[lo:hi])
            if n != 1:
                raise SystemExit(f'{scope} FP composition title {nm}: found {n}')
            frag = frag[:lo] + seg + frag[hi:]
    old_adj_total = {'all': D('870.78') + oadj, 'myUsPizza': D('850.10') + oadj, 'sabah': D('20.68') + oadj}[scope]
    frag = once(frag, rm2(old_adj_total), rm2(old_adj_total - oadj + t['adj']), f'{scope} adjustments total', 1)
    ssr[scope]['fees'] = frag

# ---------------------------------------------------------------- 5. serialise + runtime constants
out = raw
dump = lambda d: json.dumps(d, ensure_ascii=False, separators=(',', ':'))
out = pat('SSR_DATA').sub(lambda m: m.group(1) + dump(ssr) + m.group(3), out, count=1)
out = pat('S4_DATA').sub(lambda m: m.group(1) + dump(s4) + m.group(3), out, count=1)

a, m_, s_ = T_new['all'], T_new['myUsPizza'], T_new['sabah']
out = once(out, "all: { Grab: 531483.61, FoodPanda: 55508.95,", f"all: {{ Grab: 531483.61, FoodPanda: {num2(a['fees'])},", 'runtime fees all')
out = once(out, "myUsPizza: { Grab: 515707.72, FoodPanda: 44036.63,", f"myUsPizza: {{ Grab: 515707.72, FoodPanda: {num2(m_['fees'])},", 'runtime fees myUs')
out = once(out, "sabah: { Grab: 15775.89, FoodPanda: 2170.54,", f"sabah: {{ Grab: 15775.89, FoodPanda: {num2(s_['fees'])},", 'runtime fees sabah')
known = {'all': D('605510.61'), 'myUsPizza': D('578200.58'), 'sabah': D('18008.25')}
out = once(out, 'all: 605510.61, myUsPizza: 578200.58, sabah: 18008.25',
           f"all: {num2(known['all'] + a['fees'] - OLD_FP_FEES['all'])}, myUsPizza: {num2(known['myUsPizza'] + m_['fees'] - OLD_FP_FEES['myUsPizza'])}, sabah: {num2(known['sabah'] + s_['fees'] - OLD_FP_FEES['sabah'])}",
           'runtime known fees')
net_old = {'all': D('5629339.00'), 'myUsPizza': D('5463595.39'), 'sabah': D('165919.99')}
net_new = {s: net_old[s] + T_new[s]['net'] - T_old[s]['net'] for s in net_old}
out = once(out, 'all: 5629339.00, myUsPizza: 5463595.39, sabah: 165919.99',
           f"all: {num2(net_new['all'])}, myUsPizza: {num2(net_new['myUsPizza'])}, sabah: {num2(net_new['sabah'])}", 'runtime NET')

open(HTML, 'w', encoding='utf8', newline='').write(out)
print(json.dumps({s: {k: str(v) for k, v in T_new[s].items()} for s in T_new}, indent=1))
print('net consts', {k: str(v) for k, v in net_new.items()})
