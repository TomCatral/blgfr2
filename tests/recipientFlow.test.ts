import assert from 'node:assert/strict';
import test from 'node:test';
import { getUserRecipientFlow } from '../frontend/src/app/utils/recipient-flow.ts';
import type { DocumentRouteStep } from '../frontend/src/app/types.ts';

const routes = [
  { id: 'mine', toUserId: 'user-1', toUser: 'Jamie', fromUserId: 'sender' },
  { id: 'other', toUserId: 'user-2', toUser: 'Jamie', fromUserId: 'user-1' },
  { id: 'legacy', toUser: 'Jamie' },
] as DocumentRouteStep[];

test('own received route includes the subsequent reroute as a sub-flow', () => {
  assert.deepEqual(getUserRecipientFlow(routes, 'user-1').map(route => route.id), ['mine', 'other']);
});
test('outgoing routes are visible to the user who routed them', () => {
  assert.deepEqual(getUserRecipientFlow(routes, 'sender').map(route => route.id), ['mine', 'other']);
  assert.deepEqual(getUserRecipientFlow(routes, ''), []);
});

test('all direct recipients and their onward branches are visible to the router', () => {
  const sharedDispatch = [
    { id: 'first', fromUserId: 'router', toUserId: 'person-1' },
    { id: 'second', fromUserId: 'router', toUserId: 'person-2' },
    { id: 'forwarded', fromUserId: 'person-1', toUserId: 'person-3' },
    { id: 'unrelated', fromUserId: 'outsider', toUserId: 'person-4' },
  ] as DocumentRouteStep[];
  assert.deepEqual(
    getUserRecipientFlow(sharedDispatch, 'router').map(route => route.id),
    ['first', 'second', 'forwarded'],
  );
});

test('legacy outgoing route is matched by name only when sender ID is absent', () => {
  const legacy = [
    { id: 'legacy', fromUser: 'Juan Router', toUserId: 'person-1' },
    { id: 'owned', fromUserId: 'other', fromUser: 'Juan Router', toUserId: 'person-2' },
  ] as DocumentRouteStep[];
  assert.deepEqual(
    getUserRecipientFlow(legacy, 'router', 'Juan Router').map(route => route.id),
    ['legacy'],
  );
});
test('changing the signed-in account changes its visible recipient flow', () => {
  assert.deepEqual(getUserRecipientFlow(routes, 'user-2').map(route => route.id), ['other']);
});

test('follows onward reroutes without including unrelated parallel recipients', () => {
  const branch = [routes[0],
    { id: 'parallel', toUserId: 'unrelated', fromUserId: 'sender' },
    routes[1],
    { id: 'onward', toUserId: 'user-3', fromUserId: 'user-2' },
    { id: 'private-branch', toUserId: 'user-4', fromUserId: 'unrelated' },
  ] as DocumentRouteStep[];
  assert.deepEqual(getUserRecipientFlow(branch, 'user-1').map(route => route.id), ['mine', 'other', 'onward']);
});

test('an unrelated newer assignment does not inherit an earlier visible branch', () => {
  const branch = [...routes.slice(0, 2),
    { id: 'new-assignment', toUserId: 'user-2', fromUserId: 'unrelated' },
    { id: 'new-forward', toUserId: 'user-3', fromUserId: 'user-2' },
  ] as DocumentRouteStep[];
  assert.deepEqual(getUserRecipientFlow(branch, 'user-1').map(route => route.id), ['mine', 'other']);
});
