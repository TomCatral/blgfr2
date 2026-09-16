import type { DocumentRecord, DocumentRouteStep } from '../types';

type Recipient = { id?: string; fullName?: string; divisionCode?: string };

// Completion belongs to the person who recorded it, never every recipient.
export function hasCompletedPart(document: Pick<DocumentRecord, 'routes'>, recipient: Recipient): boolean {
  return document.routes?.some(route => route.statusAfter === 'COMPLETED' &&
    (route.fromUserId && recipient.id ? route.fromUserId === recipient.id :
      Boolean(recipient.fullName?.trim() && route.fromUser?.trim().toLowerCase() === recipient.fullName.trim().toLowerCase() &&
        (!recipient.divisionCode || route.fromDivision === recipient.divisionCode)))) || false;
}

export function getPendingRecipients(document: Pick<DocumentRecord, 'routes'>): DocumentRouteStep[] {
  const deliveries = new Map<string, DocumentRouteStep>();
  for (const route of document.routes || []) {
    if ((!route.toUserId && !route.toUser?.trim()) || ['APPROVED', 'DISAPPROVED'].includes(route.actionRequested?.trim().toUpperCase())) continue;
    deliveries.set(route.toUserId || `${route.toDivision}:${route.toUser?.trim().toLowerCase()}`, route);
  }
  return [...deliveries.values()].filter(delivery => !(document.routes || []).some(activity => {
    const samePerson = activity.fromUserId && delivery.toUserId ? activity.fromUserId === delivery.toUserId :
      Boolean(delivery.toUser?.trim() && activity.fromUser?.trim().toLowerCase() === delivery.toUser.trim().toLowerCase() && activity.fromDivision === delivery.toDivision);
    // Forwarding hands responsibility onward; approval alone may still need a handoff.
    return activity.id !== delivery.id && samePerson && new Date(activity.createdAt).getTime() >= new Date(delivery.createdAt).getTime() &&
      (activity.statusAfter === 'COMPLETED' ||
        (!['APPROVED', 'DISAPPROVED'].includes(activity.actionRequested?.trim().toUpperCase()) && Boolean(activity.toUserId || activity.toUser?.trim())));
  }));
}

// A decision is an audit event, not a new delivery to its "to" person.
export function findPreviousDelivery(
  document: Pick<DocumentRecord, 'routes'> | null | undefined,
  recipient: Recipient,
): DocumentRouteStep | undefined {
  return document?.routes?.find(route => {
    if (['APPROVED', 'DISAPPROVED'].includes(route.actionRequested?.trim().toUpperCase())) return false;
    if (route.toUserId && recipient.id) return route.toUserId === recipient.id;
    const name = recipient.fullName?.trim().toLowerCase();
    return Boolean(name && route.toUser?.trim().toLowerCase() === name &&
      (!recipient.divisionCode || route.toDivision === recipient.divisionCode));
  });
}
