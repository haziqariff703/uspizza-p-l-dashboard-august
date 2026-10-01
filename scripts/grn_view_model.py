"""Build the August 2026 Total GRN purchase view model for the standalone HTML.

Source of truth: datasource/Total_GRN_Report.xlsx. Sum every non-cancelled line
from the MY US PIZZA and SABAH sheets, then reconcile each branch and the total
to the workbook's Total GRN sheet. This includes rejected-quality lines. Outlets
are resolved through the reviewed crosswalk in datasource/Outlet Mapping.xlsx,
column `GRN name` -> `POS` code, never by fuzzy name. Amounts use exact decimals
and round to sen at the outlet grain.
"""
import json, re
from decimal import Decimal, ROUND_HALF_UP
import openpyxl

GRN_XLSX = 'datasource/Total_GRN_Report.xlsx'
MAP_XLSX = 'datasource/Outlet Mapping.xlsx'
HTML = 'US-Pizza-August-2026-Dashboard.html'

# The three MFM branch codes are Manhattan Fish Market outlets sharing our
# locations. They are a separate entity and are never merged into MY-025/051/081.
MFM_CODES = ('MY-025A', 'MY-051A', 'MY-081A')
ENTITY_OVERRIDES = {'060': 'MY US PIZZA'}

sen = lambda d: d.quantize(Decimal('0.01'), ROUND_HALF_UP)


def read_grn():
    workbook = openpyxl.load_workbook(GRN_XLSX, data_only=True)
    branches, lines, groups = {}, 0, set()
    total = Decimal(0)
    for sheet_name in ('MY US PIZZA', 'SABAH'):
        ws = workbook[sheet_name]
        title = ws.cell(1, 1).value or ''
        if '01/08/2026' not in title or '31/08/2026' not in title:
            raise SystemExit(f'unexpected reporting period in {sheet_name}: {title!r}')
        head = {ws.cell(2, c).value: c for c in range(1, ws.max_column + 1)}
        for col in ('Branch Code', 'Branch Name', 'PO Unit Price', 'Quantity', 'GRN No',
                    'Is GRN Cancelled', 'Product Quality'):
            if col not in head:
                raise SystemExit(f'{sheet_name} is missing GRN column {col!r}')
        for r in range(3, ws.max_row + 1):
            code = ws.cell(r, head['Branch Code']).value
            if code is None:
                continue
            if ws.cell(r, head['Is GRN Cancelled']).value != 'NO':
                raise SystemExit(f'{sheet_name} row {r} is cancelled; Total GRN assumes none')
            price, qty = ws.cell(r, head['PO Unit Price']).value, ws.cell(r, head['Quantity']).value
            if price is None or qty is None:
                raise SystemExit(f'{sheet_name} row {r} has a blank price or quantity')
            amount = Decimal(str(price)) * Decimal(str(qty))
            grn_no = ws.cell(r, head['GRN No']).value
            b = branches.setdefault(code, {
                'name': (ws.cell(r, head['Branch Name']).value or '').strip(),
                'amount': Decimal(0), 'lines': 0, 'grns': set(), 'rejected': Decimal(0),
            })
            b['amount'] += amount
            b['lines'] += 1
            b['grns'].add(grn_no)
            if ws.cell(r, head['Product Quality']).value == 'REJECTED':
                b['rejected'] += amount
            groups.add((code, ws.cell(r, head['GRN Date']).value, grn_no))
            total += amount
            lines += 1
    return branches, lines, len(groups), total


def read_crosswalk():
    """GRN branch name -> POS outlet code, from the reviewed mapping sheet."""
    ws = openpyxl.load_workbook(MAP_XLSX, data_only=True)['Sheet1']
    cross = {}
    for r in range(3, ws.max_row + 1):
        grn_name = ws.cell(r, 1).value
        if not grn_name or str(grn_name).strip() == 'Excluded:':
            continue
        pos = ws.cell(r, 3).value
        code = str(pos).split('-', 1)[0].strip() if pos else None
        cross[str(grn_name).strip()] = code
    return cross


def read_total_sheet():
    ws = openpyxl.load_workbook(GRN_XLSX, data_only=True)['Total GRN']
    if ws.cell(2, 1).value != 'Branch Name' or 'Total GRN' not in str(ws.cell(2, 2).value):
        raise SystemExit('Total GRN sheet has unexpected headers')
    total = Decimal(str(ws.cell(2, 4).value))
    branches = {}
    for r in range(3, ws.max_row + 1):
        name, amount = ws.cell(r, 1).value, ws.cell(r, 2).value
        if name is not None:
            if amount is None:
                raise SystemExit(f'Total GRN sheet has a blank amount for {name!r}')
            branches[str(name).strip()] = sen(Decimal(str(amount)))
    return branches, sen(total)


def read_matrix():
    src = open(HTML, encoding='utf-8').read()
    data = json.loads(re.search(
        r'<script id="SSR_DATA" type="application/json">(.*?)</script>', src, re.S).group(1))
    matrix = data['__matrix']
    for outlet in matrix:
        if outlet['id'] in ENTITY_OVERRIDES:
            outlet['entity'] = ENTITY_OVERRIDES[outlet['id']]
    return matrix


# Outlets the mapping sheet carries with no POS code. Matched by outlet identity,
# not by a guessed code: the matrix keeps these two on a slug id.
BY_NAME = {'Kota Damansara': 'uspizzakotadamansara', 'Anggun City': 'uspizzaangguncityrawang'}


def build():
    branches, lines, groups, total = read_grn()
    total_sheet, total_sheet_total = read_total_sheet()
    cross, matrix = read_crosswalk(), read_matrix()
    by_id = {o['id']: o for o in matrix}
    by_code = {o['code']: o for o in matrix if o['code']}

    outlets, unmapped = {}, []
    for code, b in branches.items():
        if code in MFM_CODES:
            unmapped.append({'code': code, 'name': b['name'], 'amount': float(sen(b['amount'])),
                             'reason': 'Manhattan Fish Market — separate entity'})
            continue
        target = BY_NAME.get(b['name']) or cross.get(b['name'])
        outlet = by_id.get(target) or by_code.get(target)
        if outlet is None:
            raise SystemExit(f'branch {code} {b["name"]!r} has no reviewed outlet mapping')
        if outlet['id'] in outlets:
            raise SystemExit(f'two GRN branches resolve to outlet {outlet["id"]}')
        outlets[outlet['id']] = {
            'id': outlet['id'], 'name': outlet['name'], 'entity': outlet['entity'],
            'branchCode': code, 'branchName': b['name'],
            'amount': float(sen(b['amount'])), 'lines': b['lines'], 'grns': len(b['grns']),
            'rejected': float(sen(b['rejected'])), 'netSales': outlet['netSales'],
        }

    detail_by_name = {b['name']: sen(b['amount']) for code, b in branches.items() if code not in MFM_CODES}
    if detail_by_name.keys() != total_sheet.keys():
        raise SystemExit('branch names in Total GRN do not match the detailed report sheets')
    mismatches = [name for name, amount in detail_by_name.items() if amount != total_sheet[name]]
    if mismatches:
        raise SystemExit(f'Total GRN branch totals disagree with detailed sheets: {mismatches}')
    dashboard_total = sen(sum(detail_by_name.values(), Decimal(0)))
    if dashboard_total != total_sheet_total:
        raise SystemExit(f'Total GRN control mismatch: detail {dashboard_total} vs sheet {total_sheet_total}')

    missing = [o['id'] for o in matrix if o['id'] not in outlets]
    workbook_mapped_total = sen(total - sum((b['amount'] for code, b in branches.items()
                                             if code in MFM_CODES), Decimal(0)))
    return {
        'source': GRN_XLSX, 'basis': 'Total GRN — every non-cancelled line, rejected quality included',
        'period': 'August 2026',
        'controls': {'lines': lines, 'grnGroups': groups, 'branchCodes': len(branches),
                     'sourceTotal': float(sen(total)),
                     'totalSheetTotal': float(total_sheet_total),
                     'workbookMappedTotal': float(workbook_mapped_total),
                     'mappedTotal': float(sen(sum(Decimal(str(o['amount'])) for o in outlets.values()))),
                     'externalTotal': float(sen(sum(Decimal(str(u['amount'])) for u in unmapped)))},
        'entityCounts': {entity: sum(o['entity'] == entity for o in matrix)
                         for entity in ('MY US PIZZA', 'Sabah')},
        'outlets': outlets, 'unmapped': unmapped, 'outletsWithoutGRN': missing,
    }


if __name__ == '__main__':
    print(json.dumps(build(), indent=1))
