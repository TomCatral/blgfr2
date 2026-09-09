import type { AuditLog, DocumentRecord, User } from '../types';

const normalizeName = (value?: string) => value?.trim().toLowerCase() || '';

const matchesParticipant = (
  user: User,
  participantId?: string,
  participantName?: string,
) =>
  participantId === user.id ||
  (!participantId &&
    Boolean(normalizeName(participantName)) &&
    normalizeName(participantName) === normalizeName(user.fullName));

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
  (document.routes || []).some(
    (route) =>
      matchesParticipant(user, route.fromUserId, route.fromUser) ||
      matchesParticipant(user, route.toUserId, route.toUser),
  ) ||
  auditLogs.some(
    (log) =>
      log.documentTrackingNumber === document.trackingNumber &&
      (matchesParticipant(user, log.userId, log.userName) ||
        auditNamesRecipient(log.details, user.fullName)),
  );
