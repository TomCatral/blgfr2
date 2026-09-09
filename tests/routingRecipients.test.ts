import assert from 'node:assert/strict';
import test from 'node:test';
import { findPreviousDelivery, hasCompletedPart, getPendingRecipients } from '../frontend/src/utils/routingRecipients.ts';
import type { DocumentRouteStep } from '../frontend/src/types.ts';

const delivery = { id: 'first', toUserId: 'person-1', toUser: 'Jamie Cruz', toDivision: 'AD', actionRequested: 'For review' } as DocumentRouteStep;
test('flags a previous delivery even when the recipient name changed', () => {
  assert.equal(findPreviousDelivery({ routes: [delivery] }, { id: 'person-1', fullName: 'New name' }), delivery);
});
test('does not mix up people with the same name and different IDs', () => {
  assert.equal(findPreviousDelivery({ routes: [delivery] }, { id: 'person-2', fullName: 'Jamie Cruz', divisionCode: 'AD' }), undefined);
});
test('matches legacy name-only deliveries in the same division', () => {
  const legacy = { ...delivery, toUserId: undefined };
  assert.equal(findPreviousDelivery({ routes: [legacy] }, { id: 'person-1', fullName: '  JAMIE CRUZ ', divisionCode: 'AD' }), legacy);
  assert.equal(findPreviousDelivery({ routes: [legacy] }, { fullName: 'Jamie Cruz', divisionCode: 'ORD' }), undefined);
});
test('approval and disapproval audit rows do not count as deliveries', () => {
  for (const actionRequested of ['APPROVED', 'DISAPPROVED']) {
    assert.equal(findPreviousDelivery({ routes: [{ ...delivery, actionRequested }] }, { id: 'person-1' }), undefined);
  }
});
test('only previously routed recipients are blocked in a shared dispatch', () => {
  const doc = { routes: [delivery, { ...delivery, id: 'second', toUserId: 'person-2' }] };
  assert.ok(findPreviousDelivery(doc, { id: 'person-1' }));
  assert.ok(findPreviousDelivery(doc, { id: 'person-2' }));
  assert.equal(findPreviousDelivery(doc, { id: 'person-3' }), undefined);
});
test('new documents and unnamed recipients are not false duplicates', () => {
  assert.equal(findPreviousDelivery({ routes: [] }, { id: 'person-1' }), undefined);
  assert.equal(findPreviousDelivery({ routes: [delivery] }, {}), undefined);
});

const sent = (id: string, toUserId: string) => ({ ...delivery, id, toUserId, fromUserId: 'sender', fromUser: 'Sender', createdAt: '2026-09-07T08:00:00Z' });
const done = (fromUserId: string) => ({ ...delivery, id: 'done-'+fromUserId, fromUserId, fromUser: fromUserId, toUserId: undefined, toUser: undefined, statusAfter: 'COMPLETED', createdAt: '2026-09-07T09:00:00Z' }) as DocumentRouteStep;
test('one completed recipient does not complete parallel recipients', () => {
  const doc = { routes: [sent('a','person-1'), sent('b','person-2'), done('person-1')] };
  assert.equal(hasCompletedPart(doc, {id:'person-1'}), true);
  assert.equal(hasCompletedPart(doc, {id:'person-2'}), false);
  assert.deepEqual(getPendingRecipients(doc).map(route=>route.toUserId), ['person-2']);
});
test('document can end after every recipient completes their part', () => {
  const doc = { routes: [sent('a','person-1'), sent('b','person-2'), done('person-1'), done('person-2')] };
  assert.deepEqual(getPendingRecipients(doc), []);
});
test('forwarding moves pending responsibility to the next recipient', () => {
  const forward = {...sent('c','person-3'),fromUserId:'person-1',createdAt:'2026-09-07T08:30:00Z'};
  const doc = {routes:[sent('a','person-1'),sent('b','person-2'),forward,done('person-2')]};
  assert.deepEqual(getPendingRecipients(doc).map(route=>route.toUserId),['person-3']);
  assert.equal(hasCompletedPart(doc,{id:'person-1'}),false);
});
test('an approval is not a new delivery and does not finish a required handoff', () => {
  const approval = {...done('person-1'),statusAfter:'IN_PROGRESS',actionRequested:'APPROVED',toUserId:'sender'} as DocumentRouteStep;
  assert.deepEqual(getPendingRecipients({routes:[sent('a','person-1'),approval]}).map(route=>route.toUserId),['person-1']);
});
