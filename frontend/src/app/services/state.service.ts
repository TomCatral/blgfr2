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

private lifecycle = 0;
private snapshotSequence = 0;
private lastCommittedSnapshot = 0;
private snapshotInFlight: Promise<void> | null = null;
private snapshotQueued = false;
private pendingMarkLoaded = false;
private pendingReferenceRefresh = false;
private intervals: number[] = [];

  readonly accessibleDocuments = computed<DocumentRecord[]>(() => {
    const user = this.session.currentUser();
    if (!user) return [];
    const all = this.documents();
    const permissions =
      user.permissions ||
      DEFAULT_ROLE_PERMISSIONS[user.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    if (user.role === 'SYSTEM_ADMIN' || user.divisionCode === 'ITMS' || permissions.canViewAllDocuments) {
      return all;
    }
    return all.filter((document) =>
      isDocumentParticipant(document, user, this.auditLogs()),
    );
  });

  private snapshotToken(): { lifecycle: number; userId: string | null } {
    return {
      lifecycle: this.lifecycle,
      userId: this.session.currentUser()?.id ?? null,
    };
  }

  private canCommit(token: { lifecycle: number; userId: string | null }): boolean {
    if (token.lifecycle !== this.lifecycle) return false;
    return (this.session.currentUser()?.id ?? null) === token.userId;
  }

  private async loadSnapshot(
    token: { lifecycle: number; userId: string | null },
    markLoaded: boolean,
    refreshReferenceData: boolean,
  ): Promise<void> {
    const requestId = ++this.snapshotSequence;
    // Users, divisions and envelope logs barely change. Polling them every two
    // seconds is what makes the app feel sluggish, so they are only reloaded on
    // an explicit full refresh.
    const [
      docs,
      statsData,
      logs,
      usersData,
      divisionsData,
      envelopeLogsData,
    ] = await Promise.all([
      firstValueFrom(this.api.getDocuments()).catch(() => null),
      firstValueFrom(this.api.getStats()).catch(() => null),
      firstValueFrom(this.api.getAuditLogs()).catch(() => null),
      refreshReferenceData
        ? firstValueFrom(this.api.getUsers()).catch(() => null)
        : null,
      refreshReferenceData
        ? firstValueFrom(this.api.getDivisions()).catch(() => null)
        : null,
      refreshReferenceData
        ? firstValueFrom(this.api.getEnvelopeLogs()).catch(() => null)
        : null,
    ]);

    if (
      !this.canCommit(token) ||
      requestId < this.lastCommittedSnapshot
    ) {
      return;
    }

    this.lastCommittedSnapshot = requestId;
    if (docs) this.documents.set(docs);
    if (statsData) this.stats.set(statsData);
    if (usersData) this.users.set(usersData);
    if (divisionsData) this.divisions.set(divisionsData);
    if (logs) this.auditLogs.set(logs);
    if (envelopeLogsData) this.envelopeLogs.set(envelopeLogsData);
    if (markLoaded) this.session.markDataLoaded();
  }

  private enqueueSnapshot(markLoaded: boolean, refreshReferenceData = false): Promise<void> {
    const token = this.snapshotToken();
    this.snapshotQueued = true;
    this.pendingMarkLoaded = this.pendingMarkLoaded || markLoaded;
    this.pendingReferenceRefresh = this.pendingReferenceRefresh || refreshReferenceData;

    if (!this.snapshotInFlight) {
      const runner = (async () => {
        while (this.snapshotQueued && this.canCommit(token)) {
          this.snapshotQueued = false;
          const shouldMarkLoaded = this.pendingMarkLoaded;
          const shouldRefreshReference = this.pendingReferenceRefresh;
          this.pendingMarkLoaded = false;
          this.pendingReferenceRefresh = false;
          await this.loadSnapshot(token, shouldMarkLoaded, shouldRefreshReference);
        }
        if (this.canCommit(token) && this.pendingMarkLoaded) {
          this.session.markDataLoaded();
        }
      })();
      this.snapshotInFlight = runner;
      runner.then(
        () => this.finishSnapshot(runner),
        () => this.finishSnapshot(runner),
      );
    }

    return this.snapshotInFlight;
  }

  private finishSnapshot(runner: Promise<void>): void {
    if (this.snapshotInFlight !== runner) return;
    this.snapshotInFlight = null;
    if (this.snapshotQueued) this.enqueueSnapshot(false);
  }

  async loadAll(): Promise<void> {
    try {
      await this.enqueueSnapshot(true, true);
    } catch {
      // Existing in-memory state remains usable when the API is unreachable.
    } finally {
      const token = this.snapshotToken();
      if (this.canCommit(token)) this.session.markDataLoaded();
    }
  }

  async refreshDashboard(): Promise<void> {
    try {
      await this.enqueueSnapshot(false);
    } catch {
      // A failed poll must keep the last known good snapshot.
    }
  }

  startPolling(): void {
    this.stopPolling();
    // A background tab has nobody watching it, so polling there only burns CPU
    // and keeps the API busy for the users who are actually waiting.
    const isVisible = () => document.visibilityState !== 'hidden';
    this.intervals.push(
      window.setInterval(() => {
        if (!this.session.isOnline()) {
          return;
        }
        if (!this.session.currentUser()) {
          return;
        }
        if (!isVisible()) {
          return;
        }
        void this.refreshDashboard().catch(() => undefined);
      }, 2000),
      window.setInterval(() => {
        if (!this.session.isOnline() || !this.session.currentUser() || !isVisible()) {
          return;
        }
        void this.refreshNotifications().catch(() => undefined);
      }, 2500),
    );
  }

  stopPolling(): void {
    this.lifecycle += 1;
    this.snapshotQueued = false;
    this.pendingMarkLoaded = false;
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
    const target = this.notifications().find((item) => item.id === id);
    if (target?.documentId) dismissed.add(`doc-${target.documentId}`);
    if (target?.trackingNumber) dismissed.add(`doc-${target.trackingNumber}`);
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
    const doc = this.documents().find((document) => document.id === id);
    const trackingNo = doc?.trackingNumber?.trim().toUpperCase();
    const routeNo = doc?.routeNo?.trim().toUpperCase();
    this.documents.set(this.documents().filter((document) => document.id !== id));
    this.notifications.set(
      this.notifications().filter((n) => {
        if (n.documentId === id) return false;
        const nTrack = n.trackingNumber?.trim().toUpperCase();
        if (nTrack && (nTrack === trackingNo || nTrack === routeNo)) return false;
        return true;
      }),
    );
  }

  reset(): void {
    this.stopPolling();
    this.documents.set([]);
    this.users.set([]);
    this.divisions.set([]);
    this.stats.set(emptyStats);
    this.auditLogs.set([]);
    this.envelopeLogs.set([]);
    this.notifications.set([]);
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
    const docs = this.documents();
    const logs = this.auditLogs();
    const dismissedIds = this.getDismissedNotificationIds(user.id);

    const validDocKeys = new Set(
      docs.flatMap((d) => [
        d.id?.trim().toUpperCase(),
        d.trackingNumber?.trim().toUpperCase(),
        d.routeNo?.trim().toUpperCase(),
      ]).filter(Boolean) as string[],
    );

    const validLatest = latest.filter((notification) => {
      const docId = notification.documentId?.trim().toUpperCase();
      const track = notification.trackingNumber?.trim().toUpperCase();
      if (!docId && !track) return true;
      return Boolean((docId && validDocKeys.has(docId)) || (track && validDocKeys.has(track)));
    });

    const normalized = validLatest.map((notification) => {
      const text = `${notification.title} ${notification.message}`.toUpperCase();
      const inferredStatus = text.includes('DISAPPROVED')
        ? ('DISAPPROVED' as const)
        : text.includes('APPROVED')
          ? ('APPROVED' as const)
          : undefined;
      const relatedDocument = docs.find(
        (document) =>
          document.id === notification.documentId ||
          (notification.trackingNumber &&
            (document.trackingNumber === notification.trackingNumber ||
              document.routeNo === notification.trackingNumber)),
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
                  new Date(candidate.createdAt).getTime() >=
                    new Date(route.createdAt).getTime() &&
                  candidate.id !== route.id &&
                  sameRoutingUser(
                    candidate.fromUserId,
                    candidate.fromUser,
                    user.id,
                    user.fullName,
                  ),
              );
            })
        : undefined;

      const isActionableNotification =
        notification.type === 'ACTION_REQUIRED' ||
        notification.title === 'Document Routed to You' ||
        notification.title === 'Routing Action Reminder' ||
        Boolean(notification.requiresDecision);

      return {
        ...notification,
        documentId: notification.documentId || relatedDocument?.id,
        trackingNumber:
          notification.trackingNumber ||
          relatedDocument?.routeNo ||
          relatedDocument?.trackingNumber,
        decisionStatus: notification.decisionStatus || inferredStatus,
        requiresDecision: Boolean(
          isActionableNotification && pendingAssignment && !inferredStatus,
        ),
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

    const allCandidates = [...uniqueAuditResults, ...normalized];

    const getDocKey = (item: NotificationItem): string | undefined => {
      if (item.documentId) return item.documentId;
      if (item.trackingNumber) {
        const found = docs.find(
          (d) =>
            d.trackingNumber === item.trackingNumber ||
            d.routeNo === item.trackingNumber,
        );
        return found?.id || item.trackingNumber;
      }
      return undefined;
    };

    const getPriority = (item: NotificationItem): number => {
      if (item.requiresDecision || item.title === 'Routing Action Reminder') {
        return 100;
      }
      if (
        item.decisionStatus ||
        item.title === 'This is Disapproved' ||
        item.title === 'This is Approved'
      ) {
        return 50;
      }
      if (item.type === 'URGENT' || item.type === 'ACTION_REQUIRED') {
        return 30;
      }
      return 10;
    };

    const groupedByDoc = new Map<string, NotificationItem>();
    const nonDocItems: NotificationItem[] = [];

    for (const item of allCandidates) {
      const docKey = getDocKey(item);
      if (!docKey) {
        nonDocItems.push(item);
        continue;
      }
      if (!validDocKeys.has(docKey.trim().toUpperCase())) {
        continue;
      }
      const existing = groupedByDoc.get(docKey);
      if (!existing) {
        groupedByDoc.set(docKey, item);
        continue;
      }
      const itemPriority = getPriority(item);
      const existingPriority = getPriority(existing);

      if (itemPriority > existingPriority) {
        groupedByDoc.set(docKey, item);
      } else if (itemPriority === existingPriority) {
        const itemTime = new Date(item.createdAt).getTime();
        const existingTime = new Date(existing.createdAt).getTime();
        if (itemTime > existingTime) {
          groupedByDoc.set(docKey, item);
        }
      }
    }

    const dedupedNotifications = [...groupedByDoc.values(), ...nonDocItems];

    const isDismissed = (item: NotificationItem): boolean => {
      if (dismissedIds.has(item.id)) return true;
      if (item.documentId && dismissedIds.has(`doc-${item.documentId}`)) return true;
      if (item.trackingNumber && dismissedIds.has(`doc-${item.trackingNumber}`)) return true;
      return false;
    };

    this.notifications.set(
      dedupedNotifications
        .filter((notification) => {
          if (
            isDismissed(notification) &&
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
