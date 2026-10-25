import test from 'node:test';
import assert from 'node:assert/strict';
import { transition, allowedActions, canSell, canChat, isPublic, defaultCaps } from '../src/lib/state.js';
import { html } from '../src/lib/html.js';

test('happy path and needs-documents loop', () => {
  assert.equal(transition('pending', 'approve'), 'approved');
  const nd = transition('pending', 'request_documents');
  assert.equal(nd, 'needs_documents');
  assert.equal(transition(nd, 'resubmit'), 'pending');
});
test('rejected can resubmit; approved can only be suspended', () => {
  assert.equal(transition('rejected', 'resubmit'), 'pending');
  assert.deepEqual(allowedActions('approved'), ['suspend']);
  assert.equal(transition('suspended', 'reinstate'), 'approved');
});
test('illegal transitions throw', () => {
  assert.throws(() => transition('pending', 'suspend'));
  assert.throws(() => transition('rejected', 'approve'));
  assert.throws(() => transition('approved', 'approve'));
});
test('nothing is public or postable until approved', () => {
  for (const status of ['pending', 'needs_documents', 'rejected', 'suspended']) {
    const b = { status, can_sell: 1 };
    assert.equal(isPublic(b), false); assert.equal(canSell(b), false); assert.equal(canChat(b), false);
  }
  assert.equal(canSell({ status: 'approved', can_sell: 1 }), true);
  assert.equal(canSell({ status: 'approved', can_sell: 0 }), false);
});
test('role defaults follow the supply chain', () => {
  assert.deepEqual(defaultCaps('manufacturer'), { can_sell: 1, can_buy: 0 });
  assert.deepEqual(defaultCaps('wholesaler'), { can_sell: 0, can_buy: 1 });
});
test('html template escapes user input', () => {
  assert.equal(String(html`<p>${'<script>x</script>'}</p>`), '<p>&lt;script&gt;x&lt;/script&gt;</p>');
  assert.equal(String(html`<ul>${['a', 'b'].map((x) => html`<li>${x}</li>`)}</ul>`), '<ul><li>a</li><li>b</li></ul>');
});
