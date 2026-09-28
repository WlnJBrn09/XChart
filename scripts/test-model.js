'use strict';
const assert = require('node:assert/strict');
const M = require('../static/model.js');
const chart = M.parseCsv('Label,"Series, A",Series B\r\n"North, East",12,20\r\nSouth,-3,\r\n');
assert.deepEqual(chart.labels, ['North, East', 'South']);
assert.equal(chart.series[0].name, 'Series, A');
assert.deepEqual(chart.series[1].values, [20, null]);
assert.match(M.toCsv(chart), /"North, East",12,20/);
assert.throws(() => M.parseCsv('Label,Value\nA,nope'), /Invalid number/);
chart.title = '<script>alert(1)</script>';
assert.ok(M.svg(chart).includes('&lt;script&gt;'));
assert.ok(!M.svg(chart).includes('<script>'));
for (const type of M.TYPES) { chart.type = type; assert.match(M.svg(chart), /^<svg /); }
console.log('XChart model checks passed');
