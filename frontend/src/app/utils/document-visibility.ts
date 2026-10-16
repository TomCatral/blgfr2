import type { AuditLog, DocumentRecord, User } from '../types';

const normalizeName = (value?: string) => value?.trim().toLowerCase().replace(/\s+/g, ' ') || '';

const matchesParticipant = (
  user: User,
  participantId?: string,
  participantName?: string,
) => {
  if (!user) return false;
  const targetId = normalizeName(participantId);
  const targetName = normalizeName(participantName);
  const userId = normalizeName(user.id);
  const userName = normalizeName(user.username);
  const userFullName = normalizeName(user.fullName);

  // An explicit ID is authoritative: a matching display name must not grant
  // access to a record that belongs to a different user.
  if (targetId) {
    return targetId === userId || targetId === userName;
  }
  if (targetName && (targetName === userFullName || targetName === userName)) {
    return true;
  }
  return false;
};

// Compiled once per name: this runs for every document on every poll, so
// rebuilding the pattern each time was a measurable cost.
const recipientPatterns = new Map<string, RegExp>();

const auditNamesRecipient = (details: string, fullName: string) => {
  if (!fullName) return false;
  let pattern = recipientPatterns.get(fullName);
  if (!pattern) {
    pattern = new RegExp(
      `\\bTo:\\s*${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*\\||$)`,
      'i',
    );
    recipientPatterns.set(fullName, pattern);
  }
  return pattern.test(details);
};

/** A document is private to users who created, received, or routed it. */
export const isDocumentParticipant = (
  document: DocumentRecord,
  user: User,
  auditLogs: AuditLog[] = [],
): boolean => {
  if (!user || !document) return false;
  if (
    user.role === 'SYSTEM_ADMIN' ||
    user.divisionCode === 'ITMS' ||
    user.role === 'ORD' ||
    user.permissions?.canViewAllDocuments
  ) {
    return true;
  }

  // Creator or originating sender is always a participant
  if (
    matchesParticipant(user, document.createdByUserId, document.createdBy) ||
    matchesParticipant(user, undefined, document.senderName)
  ) {
    return true;
  }

  const normFullName = normalizeName(user.fullName);
  const normUsername = normalizeName(user.username);
  const nameWithoutMiddle = normFullName.replace(/\s+[a-z]\.?\s+/i, ' ');

  // Check if this recipient was removed or recalled from the transaction
  const removalLogs = auditLogs.filter((log) => {
    const isThisDoc =
      log.documentTrackingNumber === document.trackingNumber ||
      (Boolean(document.routeNo) && log.documentTrackingNumber === document.routeNo) ||
      (Boolean(document.id) && log.documentTrackingNumber === document.id);
    if (!isThisDoc) return false;
    const details = (log.details || '').toLowerCase();
    if (!details.includes('removed recipient')) return false;
    return (
      (Boolean(normFullName) && details.includes(normFullName)) ||
      (Boolean(normUsername) && details.includes(normUsername)) ||
      (Boolean(nameWithoutMiddle) && nameWithoutMiddle !== normFullName && details.includes(nameWithoutMiddle))
    );
  });

  if (removalLogs.length > 0) {
    const latestRemovalTime = removalLogs.reduce((max, log) => {
      const t = new Date(log.timestamp).getTime();
      return t > max ? t : max;
    }, 0);

    // If the user was removed, they only have access if they were explicitly
    // re-routed TO or routed FROM in a subsequent step created strictly AFTER the removal.
    const hasSubsequentActiveRoute = (document.routes || []).some((route) => {
      const isUser =
        matchesParticipant(user, route.fromUserId, route.fromUser) ||
        matchesParticipant(user, route.toUserId, route.toUser);
      if (!isUser) return false;
      const routeTime = new Date(route.createdAt).getTime();
      return routeTime > latestRemovalTime;
    });

    if (!hasSubsequentActiveRoute) {
      return false;
    }
  }

  const hasActiveRoute = (document.routes || []).some(
    (route) =>
      matchesParticipant(user, route.fromUserId, route.fromUser) ||
      matchesParticipant(user, route.toUserId, route.toUser),
  );

  if (hasActiveRoute) {
    return true;
  }

  if (matchesParticipant(user, document.assignedUserId, document.assignedUser)) {
    return true;
  }

  if (matchesParticipant(user, undefined, document.recipientName)) {
    return true;
  }

  // Only check audit trail for participation if routes array is empty (legacy data recovery),
  // and the user was not removed.
  if (!document.routes || document.routes.length === 0) {
    return auditLogs.some(
      (log) =>
        (log.documentTrackingNumber === document.trackingNumber ||
          (Boolean(document.routeNo) && log.documentTrackingNumber === document.routeNo)) &&
        (matchesParticipant(user, log.userId, log.userName) ||
          auditNamesRecipient(log.details, user.fullName)),
    );
  }

  return false;
};
