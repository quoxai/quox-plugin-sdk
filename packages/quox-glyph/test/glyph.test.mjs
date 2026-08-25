import { test } from 'node:test';
import assert from 'node:assert/strict';
import { line, meter, celebrate, receipt, events, setColor, BUDGETS } from '../index.js';

// Plain-mode contract: the exact bytes a captured (non-tty) consumer receives.
setColor(false);

test('grammar line with result, duration, status', () => {
  assert.equal(
    line('repobrain', 'query "x"', { result: '4 hits', ms: 210, status: 'ok' }),
    '🧠 REPOBRAIN │ query "x" │ 4 hits · 210ms ✔'
  );
});

test('unknown surface falls back to Ⓠ NAME', () => {
  assert.equal(line('mytool', 'sync'), 'Ⓠ MYTOOL │ sync');
});

test('verb and result truncate to budget', () => {
  const out = line('quox', 'v'.repeat(99), { result: 'r'.repeat(99) });
  assert.ok([...out].length <= BUDGETS.LINE_MAX + 10); // separators + name overhead
  assert.match(out, /…/);
});

test('meter renders counts and pct forms', () => {
  assert.equal(meter(5, 8), '▰▰▰▰▰▱▱▱ 5/8');
  assert.equal(meter(63), '▰▰▰▰▰▱▱▱ 63%');
  assert.equal(meter(0, 0), '▱▱▱▱▱▱▱▱ 0/0');
});

test('celebrate degrades to plain text', () => {
  assert.equal(celebrate('DONE'), 'DONE');
});

test('receipt truncates hash to 12', () => {
  assert.equal(receipt('9f3a12ab99ffe210', '14:02Z'), '⛓ ward:9f3a12ab99ff · witnessed 14:02Z');
});

test('lifecycle events render the contract shapes', () => {
  assert.equal(events.created('quoxplan', 'stream', 'X-1'), '🧭 QUOXPLAN │ stream created │ X-1 ✔');
  assert.equal(events.assigned('quox', 'slot-3', 'GLYPH session'), 'Ⓠ QUOX │ slot-3 assigned │ GLYPH session ◐');
  assert.equal(events.failed('quoxbuild', 'dashboard', 'exit 1'), '🔨 QUOXBUILD │ dashboard failed │ exit 1 ✖');
  assert.equal(events.progressed('quoxplan', 'phase 5 ticked', 'X-1', 5, 8),
    '🧭 QUOXPLAN │ phase 5 ticked │ X-1 ▰▰▰▰▰▱▱▱ 5/8');
});
