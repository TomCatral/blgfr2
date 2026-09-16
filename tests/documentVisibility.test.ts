import assert from 'node:assert/strict';
import test from 'node:test';
import { isDocumentParticipant } from '../frontend/src/app/utils/document-visibility.ts';
import type { DocumentRecord, User } from '../frontend/src/app/types.ts';

const user = { id: 'router-1', fullName: 'Juan Router' } as User;
const document = {
  trackingNumber: 'DOC-1',
  routes: [],
} as unknown as DocumentRecord;

test('router can track a document through a route sender ID', () => {
  const routed = { ...document, routes: [{ fromUserId: user.id, fromUser: user.fullName }] } as DocumentRecord;
  assert.equal(isDocumentParticipant(routed, user), true);
});

test('legacy route sender name grants access only when its ID is absent', () => {
  const legacy = { ...document, routes: [{ fromUser: '  JUAN ROUTER ' }] } as DocumentRecord;
  const ownedBySomeoneElse = {
    ...document,
    routes: [{ fromUserId: 'different-user', fromUser: user.fullName }],
  } as DocumentRecord;
  assert.equal(isDocumentParticipant(legacy, user), true);
  assert.equal(isDocumentParticipant(ownedBySomeoneElse, user), false);
});

test('uninvolved user cannot track the document', () => {
  const routed = {
    ...document,
    routes: [{ fromUserId: 'sender', toUserId: 'recipient' }],
  } as DocumentRecord;
  assert.equal(isDocumentParticipant(routed, user), false);
});
