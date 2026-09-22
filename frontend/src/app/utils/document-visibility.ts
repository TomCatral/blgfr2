import type { AuditLog, DocumentRecord, User } from '../types';

const normalizeName = (value?: string) => value?.trim().toLowerCase() || '';

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

  if (targetId && (targetId === userId || targetId === userName)) {
    return true;
  }
  if (targetName && (targetName === userFullName || targetName === userName)) {
    return true;
  }
  return false;
};

const auditNamesRecipient = (details: string, fullName: string) =>
  new RegExp(
    `\\bTo:\\s*${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*\\||$)`,
    'i',
  ).test(details);

/** A document is private to users who created, received, or routed it. */
export const isDocumentParticipant = (
  document: DocumentRecord,
  user: User,
  auditLogs: AuditLog[] = [],
) =>
  matchesParticipant(user, document.assignedUserId, document.assignedUser) ||
  matchesParticipant(user, document.createdByUserId, document.createdBy) ||
  matchesParticipant(user, undefined, document.recipientName) ||
  matchesParticipant(user, undefined, document.senderName) ||
  (document.routes || []).some(
    (route) =>
      matchesParticipant(user, route.fromUserId, route.fromUser) ||
      matchesParticipant(user, route.toUserId, route.toUser),
  ) ||
  auditLogs.some(
    (log) =>
      (log.documentTrackingNumber === document.trackingNumber ||
        (Boolean(document.routeNo) && log.documentTrackingNumber === document.routeNo)) &&
      (matchesParticipant(user, log.userId, log.userName) ||
        auditNamesRecipient(log.details, user.fullName)),
  );

