import assert from 'node:assert/strict';
import test from 'node:test';
import { isRoutingPopupSnoozed, routingPopupSnoozeKey, ROUTING_POPUP_SNOOZE_MS } from '../frontend/src/utils/routingPopupSnooze.ts';

test('closing suppresses the same popup for a full 24 hours', () => {
  const closedAt = 1_000_000;
  assert.equal(isRoutingPopupSnoozed(closedAt, closedAt + 10_000), true);
  assert.equal(isRoutingPopupSnoozed(closedAt, closedAt + ROUTING_POPUP_SNOOZE_MS - 1), true);
  assert.equal(isRoutingPopupSnoozed(closedAt, closedAt + ROUTING_POPUP_SNOOZE_MS), false);
});
test('missing or invalid saved timestamps do not suppress notifications', () => {
  for (const value of [undefined, null, NaN, Infinity, 0]) assert.equal(isRoutingPopupSnoozed(value), false);
});
test('snooze storage is isolated by account and routing assignment', () => {
  assert.notEqual(routingPopupSnoozeKey('one', 'route'), routingPopupSnoozeKey('two', 'route'));
  assert.notEqual(routingPopupSnoozeKey('one', 'route'), routingPopupSnoozeKey('one', 'new-route'));
});
test('saved timestamp survives serialization for reloads', () => {
  const now = Date.now();
  assert.equal(isRoutingPopupSnoozed(Number(String(now)), now + 1000), true);
});
