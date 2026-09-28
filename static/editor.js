(() => {
  'use strict';
  const M = window.ChartModel;
  const $ = (id) => document.getElementById(id);
  let data = M.blank();
  let changed = () => {};
  const undo = [], redo = [];
  function checkpoint() { undo.push(JSON.stringify(data)); if (undo.length > 80) undo.shift(); redo.length = 0; }
  function notify() { changed(); renderPreview(); }
  function renderPreview() {
    $('chart-preview').innerHTML = M.svg(data);
    document.querySelectorAll('[data-chart-type]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chartType === data.type)));
  }
  function makeInput(value, type, key, row, col) {
    const input = document.createElement('input');
    input.type = type;
    input.value = value ?? '';
    input.dataset.key = key;
    if (row !== undefined) input.dataset.row = row;
    if (col !== undefined) input.dataset.col = col;
    if (type === 'number') { input.step = 'any'; input.setAttribute('aria-label', `Value row ${row + 1} series ${col + 1}`); }
    return input;
  }
  function renderTable() {
    const grid = $('data-grid');
    const wrap = document.createElement('div'); wrap.className = 'data-table-wrap';
    const table = document.createElement('table'); table.className = 'data-table';
    const head = document.createElement('thead'); const hr = document.createElement('tr');
    const first = document.createElement('th'); first.textContent = 'Label'; hr.append(first);
    data.series.forEach((series, col) => {
      const th = document.createElement('th');
      th.append(makeInput(series.name, 'text', 'series-name', undefined, col), makeInput(series.color, 'color', 'series-color', undefined, col));
      const remove = document.createElement('button'); remove.className = 'remove-small'; remove.type = 'button'; remove.textContent = '×'; remove.title = 'Remove series'; remove.dataset.removeSeries = col; th.append(remove); hr.append(th);
    });
    const actions = document.createElement('th'); actions.textContent = ''; hr.append(actions); head.append(hr); table.append(head);
    const body = document.createElement('tbody');
    data.labels.forEach((label, row) => {
      const tr = document.createElement('tr'); const labelCell = document.createElement('td'); labelCell.append(makeInput(label, 'text', 'label', row)); tr.append(labelCell);
      data.series.forEach((series, col) => { const cell = document.createElement('td'); cell.append(makeInput(series.values[row], 'number', 'value', row, col)); tr.append(cell); });
      const action = document.createElement('td'); const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-small'; remove.textContent = '×'; remove.title = 'Remove row'; remove.dataset.removeRow = row; action.append(remove); tr.append(action); body.append(tr);
    });
    table.append(body); wrap.append(table); grid.replaceChildren(wrap);
  }
  function render() {
    $('chart-title').value = data.title; $('x-title').value = data.xTitle; $('y-title').value = data.yTitle;
    $('show-legend').checked = data.legend; $('show-grid').checked = data.grid;
    renderTable(); renderPreview();
  }
  function load(value) { data = M.normalize(value); undo.length = 0; redo.length = 0; render(); }
  function blank() { data = M.blank(); undo.length = 0; redo.length = 0; render(); }
  function init(onChange) {
    changed = onChange;
    for (const id of ['chart-title', 'x-title', 'y-title', 'show-legend', 'show-grid']) {
      const element = $(id);
      element.addEventListener('focus', checkpoint);
      element.addEventListener('input', () => {
        if (id === 'chart-title') data.title = element.value;
        if (id === 'x-title') data.xTitle = element.value;
        if (id === 'y-title') data.yTitle = element.value;
        if (id === 'show-legend') data.legend = element.checked;
        if (id === 'show-grid') data.grid = element.checked;
        notify();
      });
    }
    $('data-grid').addEventListener('focusin', (event) => { if (event.target.matches('input')) checkpoint(); });
    $('data-grid').addEventListener('input', (event) => {
      const input = event.target; const row = Number(input.dataset.row), col = Number(input.dataset.col);
      if (input.dataset.key === 'label') data.labels[row] = input.value;
      if (input.dataset.key === 'value') data.series[col].values[row] = input.value === '' ? null : Number(input.value);
      if (input.dataset.key === 'series-name') data.series[col].name = input.value;
      if (input.dataset.key === 'series-color') data.series[col].color = input.value;
      notify();
    });
    $('data-grid').addEventListener('click', (event) => {
      const button = event.target.closest('button'); if (!button) return;
      if (button.dataset.removeRow !== undefined) {
        if (data.labels.length <= 1) return;
        checkpoint(); const row = Number(button.dataset.removeRow); data.labels.splice(row, 1); data.series.forEach(s => s.values.splice(row, 1)); render(); changed();
      }
      if (button.dataset.removeSeries !== undefined) {
        if (data.series.length <= 1) return;
        checkpoint(); data.series.splice(Number(button.dataset.removeSeries), 1); render(); changed();
      }
    });
    $('add-row').addEventListener('click', () => { if (data.labels.length >= 500) return; checkpoint(); data.labels.push(`Row ${data.labels.length + 1}`); data.series.forEach(s => s.values.push(null)); render(); changed(); });
    $('add-series').addEventListener('click', () => { if (data.series.length >= 20) return; checkpoint(); data.series.push({ name: `Series ${data.series.length + 1}`, color: M.COLORS[data.series.length % M.COLORS.length], values: data.labels.map(() => null) }); render(); changed(); });
    document.querySelectorAll('[data-chart-type]').forEach(button => button.addEventListener('click', () => { checkpoint(); data.type = button.dataset.chartType; renderPreview(); changed(); }));
    $('undo-btn').addEventListener('click', undoAction); $('redo-btn').addEventListener('click', redoAction);
    window.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.target.matches('input,textarea,[contenteditable]')) { event.preventDefault(); undoAction(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y' && !event.target.matches('input,textarea,[contenteditable]')) { event.preventDefault(); redoAction(); }
    });
  }
  function undoAction() { if (!undo.length) return; redo.push(JSON.stringify(data)); data = JSON.parse(undo.pop()); render(); changed(); }
  function redoAction() { if (!redo.length) return; undo.push(JSON.stringify(data)); data = JSON.parse(redo.pop()); render(); changed(); }
  function importFile(name, content) {
    if (/\.json$/i.test(name)) { const source = JSON.parse(content); load(source.content || source); }
    else if (/\.(csv|tsv)$/i.test(name)) load(M.parseCsv(content));
    else throw new Error('Open a CSV, TSV, or XChart JSON file');
    return { title: name.replace(/\.[^.]+$/, '') };
  }
  function toPng(svg) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1200;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png');
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG could not be rasterized')); };
      image.src = url;
    });
  }
  async function exportFile(format, title) {
    if (format === 'svg') return { data: M.svg(data), mime: 'image/svg+xml', filename: `${title}.svg` };
    if (format === 'png') return { data: await toPng(M.svg(data)), mime: 'image/png', filename: `${title}.png` };
    if (format === 'csv') return { data: M.toCsv(data), mime: 'text/csv;charset=utf-8', filename: `${title}.csv` };
    if (format === 'json') return { data: JSON.stringify(data, null, 2), mime: 'application/json', filename: `${title}.json` };
    throw new Error('Unsupported chart export');
  }
  window.XEditor = { init, blank, load, snapshot: () => structuredClone(data), importFile, export: exportFile };
})();
