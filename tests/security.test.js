'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const start = html.indexOf('// Security helpers:');
const end = html.indexOf('function snap(){', start);
assert.ok(start >= 0 && end > start, 'security helper block is present');
const board = Array.from({ length: 40 }, () => ({ t: 'R' }));
const context = { S: board, document: { createElement() { return {}; } } };
vm.runInNewContext(html.slice(start, end) + '\n;globalThis.security = { escText, safePlayerName, validSnap };', context);
const security = context.security;
function validFixture() {
  return {
    c: 0, r: 0, b: 0, d: [1, 6], rn: 1, rt: '', bz: 0, mv: -1,
    meta: [['Player 1', '🎩', '#fff', 'm', 'peer1'], ['Player 2', '✈️', '#000', 'r', 'peer2']],
    p: [[0, 2500, 0, 0, 0], [1, 2500, 0, 0, 0]],
    o: 'x'.repeat(40), h: '0'.repeat(40), mm: '0'.repeat(40),
    lg: ['Start'], pot: 0, au: 0, md: null
  };
}

test('HTML text escaping blocks tag and attribute injection', () => {
  const out = security.escText('<img src=x onerror=alert(1)> "x"');
  assert.equal(out, '&lt;img src=x onerror=alert(1)&gt; &quot;x&quot;');
  assert.ok(!out.includes('<img'));
});

test('player-name escaping is idempotent for lobby round trips', () => {
  const first = security.safePlayerName('<script>alert(1)</script>');
  const second = security.safePlayerName(first);
  assert.equal(first, second);
  assert.ok(!first.includes('<script'));
});

test('valid multiplayer snapshot passes validation', () => {
  assert.equal(security.validSnap(validFixture()), true);
});

test('malformed snapshots are rejected before apply', () => {
  const badOwner = validFixture(); badOwner.o = '9' + badOwner.o.slice(1);
  assert.equal(context.validSnap(badOwner), false);
  const badPos = validFixture(); badPos.p[0][0] = 999;
  assert.equal(context.validSnap(badPos), false);
  const badCash = validFixture(); badCash.p[0][1] = Infinity;
  assert.equal(context.validSnap(badCash), false);
  const badDice = validFixture(); badDice.d = [1, 99];
  assert.equal(context.validSnap(badDice), false);
  const badModal = validFixture(); badModal.md = { h: 'x'.repeat(7000), w: 0, b: [] };
  assert.equal(context.validSnap(badModal), false);
});

test('apply validates snapshots and sanitizes remote modal HTML', () => {
  assert.match(html, /function apply\(s\)\{if\(!validSnap\(s\)\)/);
  assert.match(html, /h:cleanModalHTML\(s\.md\.h\)/);
  assert.match(html, /b:s\.md\.b\.map\(x=>\[escText\(x\[0\]\)/);
});

test('Firebase emit reports failed writes without retrying automatically', () => {
  assert.match(html, /שליחת פעולה נכשלה \(אין ניסיון חוזר אוטומטי\)/);
  assert.match(html, /\.catch\(e=>\{LE=/);
});

test('room join code is validated as nine decimal digits', () => {
  assert.match(html, /if\(!\/\^\[0-9\]\{9\}\$\/\.test\(c\)\)/);
  assert.match(html, /maxlength=9/);
});

test('embedded JavaScript parses without syntax errors', () => {
  const blocks = [...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)].map(x => x[1]).filter(x => x.trim());
  assert.ok(blocks.length > 0, 'inline scripts are found');
  for (const block of blocks) new vm.Script(block);
});
