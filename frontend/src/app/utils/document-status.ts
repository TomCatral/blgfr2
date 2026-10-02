import type { DocumentRecord, DocumentRouteStep, DocumentStatus, DivisionCode } from '../types';
import { getPendingRecipients } from './routing-recipients.ts';

export type RouteDecision = 'APPROVED' | 'DISAPPROVED' | undefined;

export function getRouteDecision(route?: DocumentRouteStep | null): RouteDecision {
  if (!route) return undefined;
  const text = `${route.actionRequested || ''} ${route.remarks || ''}`.toUpperCase();
  if (text.includes('DISAPPROVED')) return 'DISAPPROVED';
  if (text.includes('APPROVED')) return 'APPROVED';
  return undefined;
}

function isDecisionStep(route: DocumentRouteStep): boolean {
  const action = (route.actionRequested || '').trim().toUpperCase();
  if (action === 'APPROVED' || action === 'DISAPPROVED') return true;
  // Legacy rows recorded the decision only in the remarks text.
  return getRouteDecision(route) === 'DISAPPROVED';
}

// A past disapproval is only "open" while it is the decision that ended the
// trail. Once the transaction is approved again the return is cleared, otherwise
// every later step (including a recalled recipient) would look disapproved.
export function hasOpenDisapproval(
  document: Pick<DocumentRecord, 'routes'> | null | undefined,
): boolean {
  const decisions = (document?.routes || []).filter(isDecisionStep);
  return getRouteDecision(decisions[decisions.length - 1]) === 'DISAPPROVED';
}

export function isDocumentDisapproved(
  document: Pick<DocumentRecord, 'currentStatus' | 'routes'> | null | undefined,
): boolean {
  if (!document) return false;
  if (document.currentStatus !== 'RETURNED') return false;
  return hasOpenDisapproval(document);
}

// Single source of truth for the document status badge and the assigned
// handler, shared by the API and the UI so both always agree.
export function recalculateDocumentStatus<T extends Pick<DocumentRecord, 'routes'>>(
  document: T,
): DocumentRouteStep[] {
  const record = document as unknown as DocumentRecord;
  if (!document.routes || document.routes.length === 0) {
    record.currentStatus = 'NOT_YET_ROUTED';
    record.assignedUser = 'Not Yet Routed';
    record.assignedUserId = undefined;
    return [];
  }

  const pendingRecipients = getPendingRecipients(document as Pick<DocumentRecord, 'routes'>);
  const hasCompletedRoute = document.routes.some((route) => route.statusAfter === 'COMPLETED');

  let status: DocumentStatus;
  if (hasOpenDisapproval(document)) {
    status = 'RETURNED';
  } else if (pendingRecipients.length === 0 && hasCompletedRoute) {
    status = 'COMPLETED';
  } else if (document.routes.some((route) => route.statusAfter === 'IN_PROGRESS' || route.receivedAt)) {
    status = 'IN_PROGRESS';
  } else {
    status = 'PENDING';
  }

  record.currentStatus = status;

  if (pendingRecipients.length > 0) {
    record.assignedUser = pendingRecipients[0].toUser;
    record.assignedUserId = pendingRecipients[0].toUserId;
    record.currentDivision = (pendingRecipients[0].toDivision as DivisionCode) || record.currentDivision;
  } else {
    const latestNormalRoute = [...document.routes]
      .reverse()
      .find((route) => !getRouteDecision(route) && (route.toUser || route.toUserId));
    if (latestNormalRoute) {
      record.assignedUser = latestNormalRoute.toUser;
      record.assignedUserId = latestNormalRoute.toUserId;
      record.currentDivision = (latestNormalRoute.toDivision as DivisionCode) || record.currentDivision;
    } else {
      record.assignedUser = record.createdBy || 'Originating Office';
      record.assignedUserId = record.createdByUserId;
      record.currentDivision = (record.originatingOffice as DivisionCode) || record.currentDivision || 'AD';
      // Fallback only for transactions without any delivery step; a finished
      // transaction must not be reopened as pending.
      if (record.currentStatus !== 'COMPLETED') {
        record.currentStatus = 'PENDING';
      }
    }
  }
  return pendingRecipients;
}