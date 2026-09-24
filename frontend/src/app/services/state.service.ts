import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { SessionService } from './session.service';
import {
  AuditLog,
  DashboardStats,
  Division,
  DocumentRecord,
  DocumentRouteStep,
  NotificationItem,
  User,
  DEFAULT_ROLE_PERMISSIONS,
} from '../types';
import { isDocumentParticipant } from '../utils/document-visibility';

const dismissedNotificationKey = (userId: string) =>
  `blgf_dismissed_notifications_${userId}`;

export function sameRoutingUser(
  firstId?: string,
  firstName?: string,
  secondId?: string,
  secondName?: string,
): boolean {
  return (
    Boolean(firstId && secondId && firstId === secondId) ||
    Boolean(
      firstName?.split('|')[0].trim().toLowerCase() &&
        firstName.split('|')[0].trim().toLowerCase() ===
          secondName?.split('|')[0].trim().toLowerCase(),
    )
  );
}

export function isNewRecipientAssignment(
  document: DocumentRecord,
  route: DocumentRecord['routes'][number],
): boolean {
  const assignedAt = new Date(route.createdAt).getTime();
  const wasAlreadyInvolved =
    sameRoutingUser(
      document.createdByUserId,
      document.createdBy,
      route.toUserId,
      route.toUser,
    ) ||
    (document.routes || []).some(
      (candidate) =>
        candidate.id !== route.id &&
        new Date(candidate.createdAt).getTime() < assignedAt &&
        (sameRoutingUser(
          candidate.fromUserId,
          candidate.fromUser,
          route.toUserId,
          route.toUser,
        ) ||
          sameRoutingUser(
            candidate.toUserId,
            candidate.toUser,
            route.toUserId,
            route.toUser,
          )),
    );
  return !wasAlreadyInvolved;
}

const emptyStats: DashboardStats = {
  totalIncoming: 0,
  totalOutgoing: 0,
  pendingCount: 0,
  inProgressCount: 0,
  completedCount: 0,
  urgentCount: 0,
  returnedCount: 0,
  avgTurnaroundHours: 0,
  divisionBreakdown: [],
  statusBreakdown: [],
  recentActivity: [],
};

@Injectable({ providedIn: 'root' })
export class StateService {
  private api = inject(ApiService);
  private session = inject(SessionService);

  readonly documents = signal<DocumentRecord[]>([]);
  readonly users = signal<User[]>([]);
  readonly divisions = signal<Division[]>([]);
  readonly stats = signal<DashboardStats>(emptyStats);
  readonly auditLogs = signal<AuditLog[]>([]);
  readonly envelopeLogs = signal<AuditLog[]>([]);
  readonly notifications = signal<NotificationItem[]>([]);

  private documentsRef: DocumentRecord[] = [];
  private auditLogsRef: AuditLog[] = [];
  private intervals: number[] = [];

  readonly accessibleDocuments = computed<DocumentRecord[]>(() => {
    const user = this.session.currentUser();
    if (!user) return [];
    const all = this.documents();
    const permissions =
      user.permissions ||
      DEFAULT_ROLE_PERMISSIONS[user.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    if (user.role === 'SYSTEM_ADMIN' || permissions.canViewAllDocuments) {
      return all;
    }
    return all.filter((document) =>
      isDocumentParticipant(document, user, this.auditLogs()),
    );
  });

  async loadAll(): Promise<void> {
    try {
      const [docs, statsData, usersData, divisionsData, logs, envelopeLogsData] =
        await Promise.all([
          firstValueFrom(this.api.getDocuments()).catch(() => null),
          firstValueFrom(this.api.getStats()).catch(() => null),
          firstValueFrom(this.api.getUsers()).catch(() => null),
          firstValueFrom(this.api.getDivisions()).catch(() => null),
          firstValueFrom(this.api.getAuditLogs()).catch(() => null),
          firstValueFrom(this.api.getEnvelopeLogs()).catch(() => null),
        ]);
      if (docs) this.documents.set(docs);
      if (statsData) this.stats.set(statsData);
      if (usersData) this.users.set(usersData);
      if (divisionsData) this.divisions.set(divisionsData);
      if (logs) this.auditLogs.set(logs);
      if (envelopeLogsData) this.envelopeLogs.set(envelopeLogsData);
    } catch {
      // Fall through; in-memory state remains usable.
    } finally {
      this.session.markDataLoaded();
      this.documentsRef = this.documents();
      this.auditLogsRef = this.auditLogs();
    }
  }

  async refreshDashboard(): Promise<void> {
    const [latestDocuments, latestStats, latestAuditLogs] = await Promise.all([
      firstValueFrom(this.api.getDocuments()).catch(() => null),
      firstValueFrom(this.api.getStats()).catch(() => null),
      firstValueFrom(this.api.getAuditLogs()).catch(() => null),
    ]);
    if (latestDocuments) this.documents.set(latestDocuments);
    if (latestStats) this.stats.set(latestStats);
    if (latestAuditLogs) this.auditLogs.set(latestAuditLogs);
    this.documentsRef = this.documents();
    this.auditLogsRef = this.auditLogs();
  }

  startPolling(): void {
    this.stopPolling();
    this.intervals.push(
      window.setInterval(() => void this.refreshDashboard(), 2000),
      window.setInterval(() => void this.refreshNotifications(), 2500),
    );
  }

  stopPolling(): void {
    this.intervals.forEach((id) => window.clearInterval(id));
    this.intervals = [];
  }

  getDismissedNotificationIds(userId: string): Set<string> {
    try {
      return new Set<string>(
        JSON.parse(localStorage.getItem(dismissedNotificationKey(userId)) || '[]'),
      );
    } catch {
      return new Set<string>();
    }
  }

  dismissNotification(userId: string, id: string): void {
    const dismissed = this.getDismissedNotificationIds(userId);
    dismissed.add(id);
    localStorage.setItem(dismissedNotificationKey(userId), JSON.stringify([...dismissed]));
    this.notifications.set(this.notifications().filter((item) => item.id !== id));
  }

  replaceDocument(updated: DocumentRecord): void {
    this.documents.set(
      this.documents().map((document) =>
        document.id === updated.id ? updated : document,
      ),
    );
  }

  prependDocument(created: DocumentRecord): void {
    this.documents.set([created, ...this.documents()]);
  }

  removeDocument(id: string): void {
    const current = this.documents().filter((document) => document.id !== id);
    this.documents.set(current);
    this.documentsRef = current;
  }

  async refreshNotifications(): Promise<void> {
    const user = this.session.currentUser();
    if (!user) {
      this.notifications.set([]);
      return;
    }
    const latest = await firstValueFrom(this.api.getNotifications(user.id)).catch(
      () => [],
    );
    const docs = this.documentsRef;
    const logs = this.auditLogsRef;
    const dismissedIds = this.getDismissedNotificationIds(user.id);

    const normalized = latest.map((notification) => {
      const text = `${notification.title} ${notification.message}`.toUpperCase();
      const inferredStatus = text.includes('DISAPPROVED')
        ? ('DISAPPROVED' as const)
        : text.includes('APPROVED')
          ? ('APPROVED' as const)
          : undefined;
      const relatedDocument = docs.find(
        (document) => document.id === notification.documentId,
      );
      const pendingAssignment = relatedDocument
        ? [...(relatedDocument.routes || [])]
            .reverse()
            .find((route) => {
              if (
                !sameRoutingUser(
                  route.toUserId,
                  route.toUser,
                  user.id,
                  user.fullName,
                )
              ) {
                return false;
              }
              if (/^(APPROVED|DISAPPROVED)$/i.test(route.actionRequested)) {
                return false;
              }
              if (!isNewRecipientAssignment(relatedDocument, route)) return false;
              return !(relatedDocument.routes || []).some(
                (candidate) =>
                  new Date(candidate.createdAt).getTime() >
                    new Date(route.createdAt).getTime() &&
                  sameRoutingUser(
                    candidate.fromUserId,
                    candidate.fromUser,
                    user.id,
                    user.fullName,
                  ) &&
                  /^(APPROVED|DISAPPROVED)$/i.test(candidate.actionRequested),
              );
            })
        : undefined;
      return {
        ...notification,
        decisionStatus: notification.decisionStatus || inferredStatus,
        requiresDecision: Boolean(pendingAssignment && !inferredStatus),
      };
    });

    const auditResults = docs.flatMap((document) =>
      (document.routes || []).flatMap((route) => {
        const currentUserIsRouter =
          route.fromUserId === user.id ||
          (!route.fromUserId &&
            route.fromUser?.trim().toLowerCase() ===
              user.fullName.trim().toLowerCase());
        const currentUserIsHandler =
          route.toUserId === user.id ||
          (!route.toUserId &&
            route.toUser?.trim().toLowerCase() ===
              user.fullName.trim().toLowerCase());
        if (!currentUserIsRouter && !currentUserIsHandler) return [];

        const decisionLog = logs
          .filter(
            (log) =>
              log.documentTrackingNumber === document.trackingNumber &&
              (log.userId === route.toUserId ||
                log.userName.trim().toLowerCase() ===
                  route.toUser?.trim().toLowerCase()) &&
              new Date(log.timestamp).getTime() >
                new Date(route.createdAt).getTime() &&
              /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details),
          )
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )[0];
        if (!decisionLog) return [];
        const status = decisionLog.details
          .match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1]
          .toUpperCase() as 'APPROVED' | 'DISAPPROVED';
        const reason =
          decisionLog.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1] ||
          'No reason provided.';
        const item: NotificationItem = {
          id: `audit-result-${user.id}-${decisionLog.id}`,
          userId: user.id,
          title:
            status === 'APPROVED' ? 'This is Approved' : 'This is Disapproved',
          message:
            status === 'APPROVED'
              ? `Document ${document.routeNo || document.trackingNumber} was approved by ${decisionLog.userName}.`
              : `Document ${document.routeNo || document.trackingNumber} was disapproved by ${decisionLog.userName}. Reason: ${reason}`,
          documentId: document.id,
          trackingNumber: document.routeNo || document.trackingNumber,
          type: 'INFO' as const,
          requiresDecision: false,
          decisionStatus: status,
          createdAt: decisionLog.timestamp,
        };
        return [item];
      }),
    );

    const uniqueAuditResults = [
      ...new Map(auditResults.map((item) => [item.id, item])).values(),
    ];
    const resultDocumentIds = new Set(
      uniqueAuditResults.map((item) => item.documentId),
    );
    const mergedNotifications = [
      ...uniqueAuditResults,
      ...normalized.filter(
        (item) =>
          item.title === 'Routing Action Reminder' ||
          !resultDocumentIds.has(item.documentId),
      ),
    ];

    this.notifications.set(
      mergedNotifications
        .filter((notification) => {
          if (
            dismissedIds.has(notification.id) &&
            !notification.requiresDecision
          ) {
            return false;
          }
          if (!notification.decisionStatus) return true;
          return (
            Date.now() - new Date(notification.createdAt).getTime() <
            24 * 60 * 60 * 1000
          );
        })
        .sort((first, second) => {
          const timeDifference =
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime();
          if (timeDifference !== 0) return timeDifference;
          return (
            Number(second.requiresDecision) - Number(first.requiresDecision)
          );
        }),
    );
  }

  pendingCountFor(user: User): number {
    return this.documents().filter((document) => {
      if (document.currentStatus !== 'PENDING') return false;
      if (document.assignedUserId === user.id) return true;
      const latestRouteTime = document.routes?.at(-1)?.createdAt;
      return Boolean(
        latestRouteTime &&
          document.routes
            .filter((route) => route.createdAt === latestRouteTime)
            .some((route) => route.toUserId === user.id),
      );
    }).length;
  }

  routeStepForUser(user: User, route: DocumentRouteStep): boolean {
    return sameRoutingUser(route.toUserId, route.toUser, user.id, user.fullName);
  }
}