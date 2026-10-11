// Tests for the statement parsers in index.html (the "Core" script). Made-up data only.
// Run with: node --test tests/core.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script>\s*(const Core = [\s\S]*?)<\/script>/)[1];
const mod = { exports: {} };
new Function('module', src)(mod);
const Core = mod.exports;

test('parseNum reads UK and Danish amounts', () => {
  assert.equal(Core.parseNum('1,234.56'), 1234.56);
  assert.equal(Core.parseNum('£-12.50'), -12.5);
  assert.equal(Core.parseNum('(40.00)'), -40);
  assert.equal(Core.parseNum('1.234,56'), 1234.56);
  assert.equal(Core.parseNum('-1.234,56 kr.'), -1234.56);
  assert.equal(Core.parseNum('12,5'), 12.5);
  assert.ok(Number.isNaN(Core.parseNum('abc')));
});

test('parseDate reads the formats banks use', () => {
  assert.equal(Core.parseDate('2026-10-01'), '2026-10-01');
  assert.equal(Core.parseDate('01/10/2026'), '2026-10-01');
  assert.equal(Core.parseDate('01.10.2026'), '2026-10-01');
  assert.equal(Core.parseDate('1 October 2026'), '2026-10-01');
  assert.equal(Core.parseDate('1. oktober 2026'), '2026-10-01');
  assert.equal(Core.parseDate('01-Oct-26'), '2026-10-01');
  assert.equal(Core.parseDate('31/13/2026'), null);
});

test('Chase-style CSV: title line, running balance, one closing balance per day', () => {
  const csv = [
    'Transactions for period 01/10/2026 - 03/10/2026',
    'Date,Time,Transaction Type,Transaction Description,Amount,Currency,Balance',
    '"1 October 2026",09:00,Purchase,Coffee Shop,-3.20,GBP,"1,996.80"',
    '"1 October 2026",12:00,Purchase,Builders Yard,-96.80,GBP,"1,900.00"',
    '"3 October 2026",08:00,Transfer,Trading 212,-250.00,GBP,"1,650.00"',
  ].join('\n');
  const r = Core.analyzeCSV(csv, 'statement.csv');
  assert.equal(r.bank, 'chase');
  const txns = Core.buildTxns(r.data, r.map);
  assert.equal(txns.length, 3);
  assert.deepEqual(Core.dailyClosing(txns), { '2026-10-01': 1900, '2026-10-03': 1650 });
});

test('Monzo-style CSV: no balance column, filled backwards from the typed balance', () => {
  const csv = [
    'Transaction ID,Date,Time,Type,Name,Emoji,Category,Amount,Currency',
    'tx1,02/10/2026,10:00,Card payment,Bakery,,Eating out,-4.50,GBP',
    'tx2,02/10/2026,18:00,Faster payment,Customer,,Income,200.00,GBP',
    'tx3,04/10/2026,09:00,Card payment,Fuel,,Transport,-60.00,GBP',
  ].join('\n');
  const r = Core.analyzeCSV(csv, 'monzo.csv');
  assert.equal(r.bank, 'monzo');
  const txns = Core.applyAnchor(Core.buildTxns(r.data, r.map), 500);
  assert.deepEqual(Core.dailyClosing(txns), { '2026-10-02': 560, '2026-10-04': 500 });
  assert.equal(txns[0].category, 'Eating out');
});

test('Danish-style CSV: semicolons, DD.MM.YYYY dates and 1.234,56 amounts', () => {
  const csv = [
    'Dato;Tekst;Beløb;Saldo',
    '01.10.2026;Netto;-123,45;10.000,00',
    '05.10.2026;Løn;25.000,00;35.000,00',
  ].join('\n');
  const r = Core.analyzeCSV(csv, 'konto.csv');
  assert.equal(r.bank, 'danish');
  const txns = Core.buildTxns(r.data, r.map);
  assert.deepEqual(Core.dailyClosing(txns), { '2026-10-01': 10000, '2026-10-05': 35000 });
});

test('re-importing the same rows gives the same transaction ids', () => {
  const csv = 'Date,Description,Amount,Balance\n01/10/2026,Shop,-5.00,95.00\n01/10/2026,Shop,-5.00,90.00\n';
  const a = Core.buildTxns(Core.analyzeCSV(csv, 'x.csv').data, Core.analyzeCSV(csv, 'x.csv').map);
  const b = Core.buildTxns(Core.analyzeCSV(csv, 'x.csv').data, Core.analyzeCSV(csv, 'x.csv').map);
  assert.deepEqual(a.map(t => t.id), b.map(t => t.id));
  assert.equal(new Set(a.map(t => t.id)).size, 2);
});
