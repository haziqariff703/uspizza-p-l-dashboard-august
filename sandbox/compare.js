// Section 4 outlet comparison — click outlets in the chart to pin up to 4 cards side by side.
// Dev prototype: loaded by sandbox/august-compare.html only.
(() => {
  const MAX = 4;
  const PLATFORMS = [['grab', 'Grab', '#00B14F'], ['foodpanda', 'FoodPanda', '#D70F64'], ['shopee', 'Shopee', '#EE4D2D'], ['apps', 'Apps', '#C8102E'], ['pos', 'POS', '#64748B']];
  const BASIS = { Gross: 'gross', Discount: 'discount', Net: 'net', 'Net + SC': 'netSc', 'Net + SC + SST': 'netScSst' };
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const strip = s => s.replace(/^US Pizza\s+/i, '');
  const fmt = n => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  let outlets = [];
  try { outlets = JSON.parse(document.getElementById('S4_DATA').textContent).outlets; } catch (e) { return; }

  const style = el('style');
  style.textContent = `
    #s4chart [aria-live="polite"] { display: none !important; }
    #s4chart .recharts-yAxis text { cursor: pointer; }
    .cmp-panel { border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; padding: 14px 16px; }
    .cmp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .cmp-title { font-size: 12px; font-weight: 700; color: #0f172a; }
    .cmp-sub { font-size: 11px; color: #64748b; font-weight: 400; margin-left: 6px; }
    .cmp-clear { font-size: 12px; font-weight: 600; color: #64748b; background: none; border: 0; cursor: pointer; }
    .cmp-clear:hover { color: #0f172a; }
    .cmp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }
    .cmp-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; font-size: 12px; position: relative; }
    .cmp-card h4 { margin: 0 22px 2px 0; font-size: 13px; font-weight: 700; color: #0f172a; }
    .cmp-meta { font-size: 11px; color: #64748b; margin-bottom: 8px; }
    .cmp-x { position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; border: 0; border-radius: 6px; background: none; color: #94a3b8; cursor: pointer; font-size: 14px; line-height: 1; }
    .cmp-x:hover { background: #f1f5f9; color: #0f172a; }
    .cmp-row { display: grid; grid-template-columns: 78px 1fr auto; align-items: center; gap: 8px; padding: 3px 0; }
    .cmp-lab { display: flex; align-items: center; gap: 6px; color: #334155; }
    .cmp-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    .cmp-track { height: 6px; border-radius: 3px; background: #f1f5f9; overflow: hidden; }
    .cmp-fill { height: 100%; border-radius: 3px; }
    .cmp-val { font-variant-numeric: tabular-nums; font-weight: 500; color: #0f172a; text-align: right; }
    .cmp-val.best { font-weight: 700; color: #047857; }
    .cmp-row.missing .cmp-val { color: #94a3b8; font-weight: 400; }
    .cmp-total { display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 6px; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }
    .cmp-diff { font-size: 11px; text-align: right; color: #64748b; margin-top: 2px; font-variant-numeric: tabular-nums; }
    .cmp-note { font-size: 11px; color: #b45309; margin-top: 4px; }
    .cmp-remark { margin: 12px 0 0; padding-top: 10px; border-top: 1px solid #f1f5f9; font-size: 11px; line-height: 1.5; color: #64748b; }
    .cmp-hint { font-size: 12px; color: #64748b; }
  `;
  document.head.append(style);

  const selected = [];
  let panel = null;

  const basis = () => {
    const c = document.getElementById('s4chart');
    const btn = c && [...c.querySelectorAll('button')].find(b => BASIS[b.textContent.trim()] && b.getAttribute('aria-pressed') === 'true');
    return btn ? btn.textContent.trim() : 'Net';
  };

  const valueFor = (outlet, key, mode) => {
    const ch = outlet.channels?.[key];
    if (!ch || ch.status === 'missing' || ch.net == null) return null;
    const g = Number(ch.gross), n = Number(ch.net), sc = Number(ch.serviceCharge || 0), tax = Number(ch.tax || 0);
    if (mode === 'gross') return g;
    if (mode === 'discount') return g - n;
    if (mode === 'netSc') return n + sc;
    if (mode === 'netScSst') return n + sc + tax;
    return n;
  };

  const outletForTick = text => {
    const exact = outlets.filter(o => norm(strip(o.name)) === norm(text) || norm(o.name) === norm(text));
    if (exact.length === 1) return exact[0];
    const loose = outlets.filter(o => norm(o.name).includes(norm(text)));
    return loose.length === 1 ? loose[0] : (exact[0] || loose[0] || null);
  };

  // Chart rows in DOM order: y-axis ticks, each with the centre y used to match a clicked bar.
  const rows = chart => [...chart.querySelectorAll('.recharts-yAxis text')].map(t => ({ y: Number(t.getAttribute('y')), text: [...t.querySelectorAll('tspan')].map(s => s.textContent).join('') || t.textContent }));
  const rowAt = (chart, y) => rows(chart).reduce((best, r) => (!best || Math.abs(r.y - y) < Math.abs(best.y - y) ? r : best), null);

  function toggle(outlet) {
    const i = selected.indexOf(outlet.id);
    if (i >= 0) selected.splice(i, 1);
    else { if (selected.length >= MAX) selected.shift(); selected.push(outlet.id); }
    paint();
  }

  function onClick(event) {
    const chart = document.getElementById('s4chart');
    if (!chart) return;
    const rect = event.target.closest('.recharts-bar-rectangle');
    const tick = event.target.closest('.recharts-yAxis text, .recharts-yAxis tspan');
    let outlet = null;
    if (rect) {
      const p = rect.querySelector('path'); const y = Number(p?.getAttribute('y')) + Number(p?.getAttribute('height')) / 2;
      outlet = outletForTick(rowAt(chart, y)?.text || '');
    } else if (tick) {
      outlet = outletForTick((tick.closest('text')?.textContent || '').trim());
    }
    if (outlet) toggle(outlet);
  }

  function card(outlet, mode, data, index) {
    const c = el('div', 'cmp-card');
    c.append(el('h4', null, outlet.name), el('div', 'cmp-meta', `${outlet.code} · ${outlet.entity} · ${data.label}`));
    const x = el('button', 'cmp-x', '×'); x.type = 'button'; x.setAttribute('aria-label', `Remove ${outlet.name}`);
    x.addEventListener('click', () => toggle(outlet)); c.append(x);
    let total = 0; const missing = [];
    PLATFORMS.forEach(([key, label, color]) => {
      const v = data.values[outlet.id][key];
      const row = el('div', 'cmp-row' + (v === null ? ' missing' : ''));
      const lab = el('span', 'cmp-lab'); const dot = el('span', 'cmp-dot'); dot.style.background = color; lab.append(dot, label);
      const track = el('div', 'cmp-track');
      if (v !== null) { const f = el('div', 'cmp-fill'); const max = data.max[key]; f.style.width = `${max ? Math.max(0, v / max * 100) : 0}%`; f.style.background = color; track.append(f); total += v; } else missing.push(label);
      const best = v !== null && data.count > 1 && v === data.max[key] && v > 0;
      row.append(lab, track, el('span', 'cmp-val' + (best ? ' best' : ''), v === null ? 'Not reported' : fmt(v)));
      c.append(row);
    });
    const tot = el('div', 'cmp-total'); tot.append(el('span', null, 'Total'), el('span', null, fmt(total))); c.append(tot);
    if (index > 0) {
      const diff = total - data.firstTotal; const pct = data.firstTotal ? diff / data.firstTotal * 100 : 0;
      c.append(el('div', 'cmp-diff', `${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff))} (${diff >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%) vs ${data.firstName}`));
    }
    if (missing.length) c.append(el('div', 'cmp-note', `${missing.join(', ')} not reported — total excludes unknown channels.`));
    return c;
  }

  function paint() {
    obs.disconnect();
    try { draw(); } finally { obs.observe(document.getElementById('views'), OBS); }
  }

  function draw() {
    const chart = document.getElementById('s4chart');
    if (!chart) return;
    const anchorRow = chart.querySelector('input[placeholder="Search outlet"]')?.parentElement;
    if (!anchorRow) return;
    if (!panel) panel = el('section', 'cmp-panel');
    if (panel.previousElementSibling !== anchorRow) anchorRow.insertAdjacentElement('afterend', panel);

    const modeLabel = basis(); const mode = BASIS[modeLabel];
    const picked = selected.map(id => outlets.find(o => o.id === id)).filter(Boolean);
    panel.replaceChildren();
    const head = el('div', 'cmp-head');
    const title = el('div', 'cmp-title', picked.length ? `Comparing ${picked.length} outlet${picked.length === 1 ? '' : 's'}` : 'Compare outlets');
    title.append(el('span', 'cmp-sub', picked.length ? `${modeLabel} · pick up to ${MAX}` : `click bars or names in the chart, up to ${MAX}`));
    head.append(title);
    if (picked.length) { const b = el('button', 'cmp-clear', 'Clear all'); b.type = 'button'; b.addEventListener('click', () => { selected.length = 0; paint(); }); head.append(b); }
    panel.append(head);

    if (picked.length) {
      const values = {}; const max = {};
      picked.forEach(o => { values[o.id] = {}; PLATFORMS.forEach(([k]) => { const v = valueFor(o, k, mode); values[o.id][k] = v; if (v !== null) max[k] = Math.max(max[k] ?? 0, v); }); });
      const sum = o => PLATFORMS.reduce((s, [k]) => s + (values[o.id][k] ?? 0), 0);
      const data = { label: modeLabel, values, max, count: picked.length, firstTotal: sum(picked[0]), firstName: picked[0].name.replace(/^US Pizza\s+/i, '') };
      const grid = el('div', 'cmp-grid');
      picked.forEach((o, i) => grid.append(card(o, mode, data, i)));
      panel.append(grid);
    } else {
      panel.append(el('div', 'cmp-hint', 'No outlets selected yet.'));
    }

    panel.append(el('p', 'cmp-remark', 'How to compare: click a bar or an outlet name in the chart to pin it (up to 4; a fifth replaces the oldest). Click again or use × to remove. Cards follow the selected basis (Gross, Discount, Net, Net + SC, Net + SC + SST). The green value marks the highest outlet per platform, and the difference is measured against the first pinned outlet. “Not reported” means no source data yet, not zero, so totals exclude those channels.'));

    // Emphasise selected bars, soften the rest.
    const chosen = new Set(picked.map(o => o.id)); const ticks = rows(chart);
    chart.querySelectorAll('.recharts-bar-rectangle path').forEach(p => {
      const y = Number(p.getAttribute('y')) + Number(p.getAttribute('height')) / 2;
      const r = ticks.reduce((best, t) => (!best || Math.abs(t.y - y) < Math.abs(best.y - y) ? t : best), null);
      const o = r && outletForTick(r.text);
      const op = !chosen.size || (o && chosen.has(o.id)) ? '1' : '0.3';
      if (p.style.opacity !== op) p.style.opacity = op;
    });
  }

  const OBS = { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed'] };
  const obs = new MutationObserver(() => schedule());
  let queued = false;
  const schedule = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; paint(); }); };
  document.addEventListener('click', event => { if (event.target.closest('#s4chart')) { onClick(event); schedule(); } }, true);
  obs.observe(document.getElementById('views'), OBS);
  schedule();
})();
