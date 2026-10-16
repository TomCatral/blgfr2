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

test('SYSTEM_ADMIN, ITMS, and ORD can track all documents without participating', () => {
  const routed = {
    ...document,
    routes: [{ fromUserId: 'sender', toUserId: 'recipient' }],
  } as DocumentRecord;
  const sysAdmin = { id: 'admin-1', role: 'SYSTEM_ADMIN' } as User;
  const itmsUser = { id: 'itms-1', role: 'STAFF', divisionCode: 'ITMS' } as User;
  const ordUser = { id: 'ord-1', role: 'ORD' } as User;
  const privileged = { id: 'staff-1', role: 'STAFF', permissions: { canViewAllDocuments: true } } as unknown as User;
  const withAllRoutes = { id: 'staff-2', role: 'STAFF', permissions: { canViewAllRoutes: true } } as unknown as User;
  const withoutAllRoutes = { id: 'staff-3', role: 'STAFF', permissions: { canViewAllRoutes: false } } as unknown as User;
  assert.equal(isDocumentParticipant(routed, sysAdmin), true);
  assert.equal(isDocumentParticipant(routed, itmsUser), true);
  assert.equal(isDocumentParticipant(routed, ordUser), true);
  assert.equal(isDocumentParticipant(routed, privileged), true);
  assert.equal(isDocumentParticipant(routed, withAllRoutes), true);
  assert.equal(isDocumentParticipant(routed, withoutAllRoutes), false);
});

test('removed recipient cannot track document even if lingering prior route exists', () => {
  const routedWithLingeringRoute = {
    ...document,
    routes: [
      {
        id: 'RTE-1',
        fromUserId: 'sender',
        toUserId: 'other-user',
        createdAt: '2026-10-16T01:00:00.000Z',
      },
      {
        id: 'RTE-2',
        fromUserId: user.id,
        fromUser: user.fullName,
        toUserId: 'sender',
        createdAt: '2026-10-16T01:10:00.000Z',
      },
    ],
  } as unknown as DocumentRecord;
  const auditLogs = [
    {
      documentTrackingNumber: document.trackingNumber,
      userId: 'admin-1',
      userName: 'Admin',
      timestamp: '2026-10-16T01:30:00.000Z',
      details: 'Removed recipient Juan Router (LU) from transaction by Admin. Reason: Routing mistake / recalled',
    },
  ] as any[];
  assert.equal(isDocumentParticipant(routedWithLingeringRoute, user, auditLogs), false);
});

test('removed recipient regains tracking if re-routed after the removal timestamp', () => {
  const reRoutedDocument = {
    ...document,
    routes: [
      {
        id: 'RTE-1',
        fromUserId: 'sender',
        toUserId: 'other-user',
        createdAt: '2026-10-16T01:00:00.000Z',
      },
      {
        id: 'RTE-3',
        fromUserId: 'sender',
        toUserId: user.id,
        toUser: user.fullName,
        createdAt: '2026-10-16T02:00:00.000Z', // After removal at 01:30
      },
    ],
  } as unknown as DocumentRecord;
  const auditLogs = [
    {
      documentTrackingNumber: document.trackingNumber,
      userId: 'admin-1',
      userName: 'Admin',
      timestamp: '2026-10-16T01:30:00.000Z',
      details: 'Removed recipient Juan Router (LU) from transaction by Admin. Reason: Routing mistake / recalled',
    },
  ] as any[];
  assert.equal(isDocumentParticipant(reRoutedDocument, user, auditLogs), true);
});


