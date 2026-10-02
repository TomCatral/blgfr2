import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasOpenDisapproval,
  isDocumentDisapproved,
  recalculateDocumentStatus,
} from '../frontend/src/app/utils/document-status.ts';
import type { DocumentRecord, DocumentRouteStep } from '../frontend/src/app/types.ts';

const route = (over: Partial<DocumentRouteStep> & { id: string }): DocumentRouteStep =>
  ({
    documentId: 'doc-1',
    stepNumber: 1,
    fromDivision: 'AD',
    fromUserId: 'user-sender',
    fromUser: 'Jay ann M. Mangoba',
    toDivision: 'LU',
    toUserId: 'user-handler',
    toUser: 'Raymond C. Rosete',
    actionRequested: 'Appropriate Action',
    remarks: '',
    statusBefore: 'PENDING',
    statusAfter: 'IN_PROGRESS',
    createdAt: '2026-10-01T05:36:48.000Z',
    ...over,
  }) as DocumentRouteStep;

const decision = (action: 'APPROVED' | 'DISAPPROVED', at: string, fromUserId = 'user-handler') =>
  route({
    id: `route-decision-${action}-${at}`,
    fromUserId,
    fromUser: fromUserId === 'user-handler' ? 'Raymond C. Rosete' : 'Rona Lagasca',
    toUserId: 'user-sender',
    toUser: 'Jay ann M. Mangoba',
    actionRequested: action,
    statusAfter: action === 'DISAPPROVED' ? 'RETURNED' : 'IN_PROGRESS',
    createdAt: at,
  });

const doc = (routes: DocumentRouteStep[], over: Partial<DocumentRecord> = {}): DocumentRecord =>
  ({
    id: 'doc-1',
    trackingNumber: 'BLGFR2-2026-10-IN-01',
    routeNo: 'BLGFR2-2026-10-IN-01',
    createdBy: 'Jay ann M. Mangoba',
    createdByUserId: 'user-sender',
    originatingOffice: 'AD',
    currentDivision: 'LU',
    currentStatus: 'IN_PROGRESS',
    routes,
    ...over,
  }) as unknown as DocumentRecord;

test('an open disapproval keeps the document returned', () => {
  const document = doc(
    [route({ id: 'step-1' }), decision('DISAPPROVED', '2026-10-01T05:56:32.000Z')],
    { currentStatus: 'RETURNED' },
  );
  assert.equal(hasOpenDisapproval(document), true);
  assert.equal(isDocumentDisapproved(document), true);
});

test('re-approving clears the return so the document is routable again', () => {
  const document = doc(
    [
      route({ id: 'step-1' }),
      decision('DISAPPROVED', '2026-10-01T05:56:32.000Z'),
      decision('APPROVED', '2026-10-01T05:57:18.000Z'),
    ],
    { currentStatus: 'RETURNED' },
  );
  assert.equal(hasOpenDisapproval(document), false);
  assert.equal(isDocumentDisapproved(document), false);
});

test('recalling a recipient no longer revives an already cleared return', () => {
  const document = doc(
    [
      route({ id: 'step-1', toUserId: 'user-handler', toUser: 'Raymond C. Rosete' }),
      decision('DISAPPROVED', '2026-10-01T06:07:13.000Z'),
      decision('APPROVED', '2026-10-01T07:27:55.000Z'),
    ],
    { currentStatus: 'RETURNED' },
  );
  recalculateDocumentStatus(document);
  assert.equal(document.currentStatus, 'IN_PROGRESS');
  assert.equal(document.assignedUserId, 'user-handler');
});

test('a real return survives a recalculation', () => {
  const document = doc([route({ id: 'step-1' }), decision('DISAPPROVED', '2026-10-01T06:07:13.000Z')]);
  recalculateDocumentStatus(document);
  assert.equal(document.currentStatus, 'RETURNED');
});

test('recalculation still completes a transaction when every recipient is done', () => {
  const document = doc(
    [
      route({ id: 'step-1', statusAfter: 'COMPLETED', fromUser: 'Raymond C. Rosete', fromUserId: 'user-handler', toUser: '', toUserId: '' }),
    ],
    { currentStatus: 'IN_PROGRESS' },
  );
  recalculateDocumentStatus(document);
  assert.equal(document.currentStatus, 'COMPLETED');
});

test('document without routes recalculates to NOT_YET_ROUTED', () => {
  const document = doc([], { currentStatus: 'PENDING' });
  recalculateDocumentStatus(document);
  assert.equal(document.currentStatus, 'NOT_YET_ROUTED');
  assert.equal(document.assignedUser, 'Not Yet Routed');
  assert.equal(document.assignedUserId, undefined);
});