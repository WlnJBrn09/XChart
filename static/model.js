(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ChartModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const TYPES = ['bar', 'line', 'area', 'pie', 'scatter'];
  const COLORS = ['#24272d', '#57708b', '#a06e56', '#77917a', '#86729d', '#b3974d', '#5a9694', '#ba7282'];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const f = (value) => Number(value.toFixed(2));
  function blank() {
    return { type: 'bar', title: 'Quarterly results', xTitle: 'Quarter', yTitle: 'Value', legend: true, grid: true,
      labels: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: 'Series 1', color: COLORS[0], values: [25, 42, 36, 58] }] };
  }
  function normalize(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Invalid chart document');
    const labels = Array.isArray(source.labels) ? source.labels.slice(0, 500).map(x => String(x ?? '')) : [];
    const series = Array.isArray(source.series) ? source.series.slice(0, 20).map((item, index) => ({
      name: String(item?.name ?? `Series ${index + 1}`).slice(0, 80),
      color: /^#[0-9a-fA-F]{6}$/.test(item?.color || '') ? item.color : COLORS[index % COLORS.length],
      values: labels.map((_, row) => {
        const value = item?.values?.[row];
        return value === '' || value == null || !Number.isFinite(Number(value)) ? null : Number(value);
      }),
    })) : [];
    if (!labels.length || !series.length) throw new Error('Chart needs labels and at least one series');
    return { type: TYPES.includes(source.type) ? source.type : 'bar', title: String(source.title ?? '').slice(0, 150),
      xTitle: String(source.xTitle ?? '').slice(0, 80), yTitle: String(source.yTitle ?? '').slice(0, 80),
      legend: source.legend !== false, grid: source.grid !== false, labels, series };
  }
  function parseCsv(text) {
    const firstLine = text.split(/\r?\n/, 1)[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === delimiter) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); if (row.some(v => v.trim())) rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (quoted) throw new Error('Unclosed quoted CSV field');
    row.push(cell); if (row.some(v => v.trim())) rows.push(row);
    if (rows.length < 2 || rows[0].length < 2) throw new Error('CSV needs a header, labels, and values');
    const header = rows[0].slice(1, 21);
    const labels = [], series = header.map((name, index) => ({ name: name || `Series ${index + 1}`, color: COLORS[index % COLORS.length], values: [] }));
    for (const cells of rows.slice(1, 501)) {
      labels.push(cells[0] || '');
      for (let col = 0; col < series.length; col++) {
        const raw = (cells[col + 1] ?? '').trim();
        if (raw && !Number.isFinite(Number(raw))) throw new Error(`Invalid number on row ${labels.length + 1}, column ${col + 2}`);
        series[col].values.push(raw ? Number(raw) : null);
      }
    }
    return normalize({ ...blank(), title: '', labels, series });
  }
  function csvCell(value) {
    const s = String(value ?? '');
    return /[",\r\n\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function toCsv(data) {
    const d = normalize(data);
    const rows = [['Label', ...d.series.map(s => s.name)]];
    d.labels.forEach((label, i) => rows.push([label, ...d.series.map(s => s.values[i] ?? '')]));
    return rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
  function svg(data) {
    const d = normalize(data);
    const W = 960, H = 600, left = 95, right = 40, top = 85, bottom = d.legend ? 118 : 95;
    const plotW = W - left - right, plotH = H - top - bottom;
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(d.title || 'Chart')}">`, '<rect width="960" height="600" fill="#ffffff"/>'];
    if (d.title) parts.push(`<text x="480" y="42" text-anchor="middle" fill="#1d1d1f" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="600">${esc(d.title)}</text>`);
    if (d.type === 'pie') {
      const vals = d.series[0].values.map(v => Math.max(0, num(v)));
      const total = vals.reduce((a, b) => a + b, 0);
      if (total === 0) parts.push('<text x="480" y="300" text-anchor="middle" fill="#666" font-family="Arial" font-size="20">Add positive values to draw a pie</text>');
      else {
        let angle = -Math.PI / 2; const cx = 430, cy = 295, radius = 195;
        vals.forEach((value, i) => {
          if (!value) return;
          const end = angle + value / total * Math.PI * 2;
          const x1 = cx + Math.cos(angle) * radius, y1 = cy + Math.sin(angle) * radius;
          const x2 = cx + Math.cos(end) * radius, y2 = cy + Math.sin(end) * radius;
          const large = end - angle > Math.PI ? 1 : 0;
          if (value === total) parts.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${d.series[0].color}"/>`);
          else parts.push(`<path d="M ${cx} ${cy} L ${f(x1)} ${f(y1)} A ${radius} ${radius} 0 ${large} 1 ${f(x2)} ${f(y2)} Z" fill="${COLORS[i % COLORS.length]}"/>`);
          angle = end;
        });
        d.labels.slice(0, 12).forEach((label, i) => {
          parts.push(`<rect x="688" y="${112 + i * 30}" width="14" height="14" rx="2" fill="${COLORS[i % COLORS.length]}"/><text x="711" y="${124 + i * 30}" fill="#363636" font-family="Arial" font-size="15">${esc(label.slice(0, 22))}</text>`);
        });
      }
    } else {
      const all = d.series.flatMap(s => s.values).filter(v => v !== null && Number.isFinite(v));
      const low = Math.min(0, ...all), high = Math.max(0, ...all);
      const roughStep = (high - low || Math.abs(high) || 1) / 5;
      const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
      const ratio = roughStep / power;
      const tickStep = (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * power;
      const min = Math.floor(low / tickStep) * tickStep;
      let max = Math.ceil(high / tickStep) * tickStep;
      if (min === max) max = min + tickStep;
      const tickCount = Math.round((max - min) / tickStep);
      const yy = v => top + (max - v) / (max - min) * plotH;
      const zero = yy(0);
      for (let step = 0; step <= tickCount; step++) {
        const value = max - tickStep * step;
        const y = top + plotH * step / tickCount;
        if (d.grid) parts.push(`<line x1="${left}" y1="${f(y)}" x2="${left + plotW}" y2="${f(y)}" stroke="#e5e5e8"/>`);
        parts.push(`<text x="${left - 12}" y="${f(y + 5)}" text-anchor="end" fill="#666" font-family="Arial" font-size="13">${esc(Number(value.toFixed(10)))}</text>`);
      }
      parts.push(`<line x1="${left}" y1="${top}" x2="${left}" y2="${top + plotH}" stroke="#999"/><line x1="${left}" y1="${f(zero)}" x2="${left + plotW}" y2="${f(zero)}" stroke="#999"/>`);
      const n = d.labels.length, slot = plotW / Math.max(n, 1);
      d.labels.forEach((label, i) => {
        const x = left + slot * (i + .5);
        if (i % Math.max(1, Math.ceil(n / 12)) === 0) parts.push(`<text x="${f(x)}" y="${top + plotH + 22}" text-anchor="middle" fill="#555" font-family="Arial" font-size="13">${esc(label.slice(0, 13))}</text>`);
      });
      d.series.forEach((series, seriesIndex) => {
        const points = series.values.map((value, i) => value === null ? null : [left + slot * (i + .5), yy(value)]);
        if (d.type === 'bar') {
          const barW = Math.max(1, Math.min(64, slot * .74 / d.series.length));
          series.values.forEach((value, i) => {
            if (value === null) return;
            const x = left + slot * (i + .5) - barW * d.series.length / 2 + barW * seriesIndex;
            parts.push(`<rect x="${f(x)}" y="${f(Math.min(zero, yy(value)))}" width="${f(barW - 1)}" height="${f(Math.max(1, Math.abs(yy(value) - zero)))}" rx="2" fill="${series.color}"/>`);
          });
        } else if (d.type === 'scatter') {
          points.forEach(point => { if (point) parts.push(`<circle cx="${f(point[0])}" cy="${f(point[1])}" r="5" fill="${series.color}"/>`); });
        } else {
          let run = [];
          const flush = () => {
            if (!run.length) return;
            const path = run.map((p, i) => `${i ? 'L' : 'M'} ${f(p[0])} ${f(p[1])}`).join(' ');
            if (d.type === 'area') parts.push(`<path d="${path} L ${f(run[run.length - 1][0])} ${f(zero)} L ${f(run[0][0])} ${f(zero)} Z" fill="${series.color}" fill-opacity=".18"/>`);
            parts.push(`<path d="${path}" fill="none" stroke="${series.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`);
            run.forEach(p => parts.push(`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="4" fill="${series.color}"/>`));
            run = [];
          };
          points.forEach(p => { if (p) run.push(p); else flush(); }); flush();
        }
      });
      if (d.xTitle) parts.push(`<text x="480" y="${H - 43}" text-anchor="middle" fill="#444" font-family="Arial" font-size="15">${esc(d.xTitle)}</text>`);
      if (d.yTitle) parts.push(`<text x="22" y="${top + plotH / 2}" text-anchor="middle" fill="#444" font-family="Arial" font-size="15" transform="rotate(-90 22 ${f(top + plotH / 2)})">${esc(d.yTitle)}</text>`);
      if (d.legend) d.series.forEach((s, i) => {
        const x = Math.min(W - 130, left + i * 145), y = H - 22;
        parts.push(`<rect x="${x}" y="${y - 12}" width="15" height="15" rx="2" fill="${s.color}"/><text x="${x + 22}" y="${y}" fill="#444" font-family="Arial" font-size="13">${esc(s.name.slice(0, 16))}</text>`);
      });
    }
    parts.push('</svg>');
    return parts.join('');
  }
  return { TYPES, COLORS, blank, normalize, parseCsv, toCsv, svg };
});
