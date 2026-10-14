import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { UiService } from './ui.service';
import {
  AuditLog,
  DashboardStats,
  Division,
  DocumentRecord,
  NotificationItem,
  User,
} from '../types';

import { sanitizeAssetUrl } from '../utils/asset-url';

export type OfflineActionType =
  | 'CREATE_DOCUMENT'
  | 'ROUTE_DOCUMENT'
  | 'MULTI_ROUTE_DOCUMENT'
  | 'RECORD_DECISION'
  | 'SEND_REMINDER'
  | 'TRANSFER_DOCUMENT';

export interface OfflineQueueItem {
  id: string;
  type: OfflineActionType;
  payload: any;
  tempId?: string;
  createdAt: string;
  retries: number;
  lastError?: string;
}

export interface OfflineSnapshot {
  timestamp: number;
  userId: string;
  documents: DocumentRecord[];
  users: User[];
  divisions: Division[];
  stats: DashboardStats;
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  envelopeLogs: AuditLog[];
}

const QUEUE_STORAGE_KEY = 'blgf_offline_sync_queue';
const LAST_SYNC_KEY = 'blgf_offline_last_sync';
const LAST_ACTIVE_USER_KEY = 'blgf_offline_last_active_user';

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private api = inject(ApiService);
  private ui = inject(UiService);

  readonly isOnline = signal(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  readonly isSyncing = signal(false);
  readonly queue = signal<OfflineQueueItem[]>(this.readStoredQueue());
  readonly pendingCount = computed(() => this.queue().length);
  readonly lastSyncTime = signal<Date | null>(this.readLastSyncTime());
  readonly syncStatusMessage = signal<string | null>(null);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline.set(true);
        if (this.queue().length > 0) {
          void this.syncQueue();
        }
      });

      window.addEventListener('offline', () => {
        this.isOnline.set(false);
      });
    }
  }

  private readStoredQueue(): OfflineQueueItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persistQueue(items: OfflineQueueItem[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[OfflineSync] Failed to persist queue:', e);
    }
  }

  private readLastSyncTime(): Date | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(LAST_SYNC_KEY);
      return raw ? new Date(raw) : null;
    } catch {
      return null;
    }
  }

  private markSyncSuccess(): void {
    const now = new Date();
    this.lastSyncTime.set(now);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      } catch {}
    }
  }

  enqueue(item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retries'>): OfflineQueueItem {
    const fullItem: OfflineQueueItem = {
      ...item,
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      retries: 0,
    };
    const nextQueue = [...this.queue(), fullItem];
    this.queue.set(nextQueue);
    this.persistQueue(nextQueue);
    return fullItem;
  }

  clearQueue(): void {
    this.queue.set([]);
    this.persistQueue([]);
  }

  removeItem(id: string): void {
    const nextQueue = this.queue().filter((q) => q.id !== id);
    this.queue.set(nextQueue);
    this.persistQueue(nextQueue);
  }

  // ===== Snapshot caching =====

  cacheUser(user: User): void {
    if (typeof localStorage === 'undefined') return;
    try {
      if (user.avatarUrl) {
        user.avatarUrl = sanitizeAssetUrl(user.avatarUrl);
      }
      localStorage.setItem(`blgf_offline_user_${user.id}`, JSON.stringify(user));
      localStorage.setItem(LAST_ACTIVE_USER_KEY, JSON.stringify(user));
    } catch {}
  }

  getOfflineUser(userId: string): User | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`blgf_offline_user_${userId}`);
      if (raw) {
        const u = JSON.parse(raw);
        if (u.avatarUrl) u.avatarUrl = sanitizeAssetUrl(u.avatarUrl);
        return u;
      }
      const fallback = localStorage.getItem(LAST_ACTIVE_USER_KEY);
      if (fallback) {
        const parsed = JSON.parse(fallback);
        if (parsed.id === userId) {
          if (parsed.avatarUrl) parsed.avatarUrl = sanitizeAssetUrl(parsed.avatarUrl);
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  saveSnapshot(userId: string, data: Partial<OfflineSnapshot>): void {
    if (typeof localStorage === 'undefined' || !userId) return;
    try {
      const existing = this.loadSnapshot(userId) || {
        timestamp: Date.now(),
        userId,
        documents: [],
        users: [],
        divisions: [],
        stats: {
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
        },
        auditLogs: [],
        notifications: [],
        envelopeLogs: [],
      };

      const updated: OfflineSnapshot = {
        ...existing,
        ...data,
        timestamp: Date.now(),
        userId,
      };

      // To stay within localStorage quota (usually ~5MB), retain top 200 documents and top 100 logs
      if (updated.documents && updated.documents.length > 200) {
        updated.documents = updated.documents.slice(0, 200);
      }
      if (updated.auditLogs && updated.auditLogs.length > 100) {
        updated.auditLogs = updated.auditLogs.slice(0, 100);
      }
      if (updated.envelopeLogs && updated.envelopeLogs.length > 100) {
        updated.envelopeLogs = updated.envelopeLogs.slice(0, 100);
      }

      localStorage.setItem(
        `blgf_offline_snapshot_${userId}`,
        JSON.stringify(updated),
      );
    } catch (e) {
      console.warn('[OfflineSync] Failed to save snapshot:', e);
    }
  }

  loadSnapshot(userId: string): OfflineSnapshot | null {
    if (typeof localStorage === 'undefined' || !userId) return null;
    try {
      const raw = localStorage.getItem(`blgf_offline_snapshot_${userId}`);
      if (!raw) return null;
      const parsed: OfflineSnapshot = JSON.parse(raw);
      if (parsed.users) {
        parsed.users.forEach((u) => {
          if (u.avatarUrl) u.avatarUrl = sanitizeAssetUrl(u.avatarUrl);
        });
      }
      if (parsed.documents) {
        parsed.documents.forEach((d) => {
          (d.attachments || []).forEach((a) => {
            if (a.url) a.url = sanitizeAssetUrl(a.url);
          });
          (d.routes || []).forEach((r) => {
            (r.attachments || []).forEach((a) => {
              if (a.url) a.url = sanitizeAssetUrl(a.url);
            });
          });
        });
      }
      return parsed;
    } catch {
      return null;
    }
  }

  // ===== Synchronize Pending Queue =====

  async syncQueue(onDoneCallback?: () => Promise<void> | void): Promise<{ success: boolean; syncedCount: number; errors: number }> {
    if (this.isSyncing()) {
      return { success: false, syncedCount: 0, errors: 0 };
    }
    const currentQueue = [...this.queue()];
    if (currentQueue.length === 0) {
      return { success: true, syncedCount: 0, errors: 0 };
    }

    this.isSyncing.set(true);
    this.syncStatusMessage.set(`Synchronizing ${currentQueue.length} offline update(s)...`);

    let syncedCount = 0;
    let errors = 0;
    const remainingQueue: OfflineQueueItem[] = [];
    // Maps temporary IDs to real IDs generated by server
    const idMap = new Map<string, string>();

    for (const item of currentQueue) {
      try {
        switch (item.type) {
          case 'CREATE_DOCUMENT': {
            const payload = { ...item.payload };
            const created = await firstValueFrom(this.api.createDocument(payload));
            if (item.tempId && created && created.id) {
              idMap.set(item.tempId, created.id);
            }
            syncedCount++;
            break;
          }

          case 'ROUTE_DOCUMENT': {
            const payload = { ...item.payload };
            let docId = payload.documentId;
            if (idMap.has(docId)) {
              docId = idMap.get(docId)!;
              payload.documentId = docId;
            }
            await firstValueFrom(this.api.routeDocument(docId, payload));
            syncedCount++;
            break;
          }

          case 'MULTI_ROUTE_DOCUMENT': {
            const payload = { ...item.payload };
            let docId = payload.documentId;
            if (idMap.has(docId)) {
              docId = idMap.get(docId)!;
              payload.documentId = docId;
            }
            await firstValueFrom(this.api.multiRouteDocument(docId, payload));
            syncedCount++;
            break;
          }

          case 'RECORD_DECISION': {
            const payload = { ...item.payload };
            let docId = payload.documentId;
            if (idMap.has(docId)) {
              docId = idMap.get(docId)!;
            }
            await firstValueFrom(
              this.api.decideDocumentRoute(
                docId,
                payload.decision,
                payload.remarks,
                payload.actingUserId,
              ),
            );
            syncedCount++;
            break;
          }

          case 'SEND_REMINDER': {
            const payload = { ...item.payload };
            if (payload.documentId && idMap.has(payload.documentId)) {
              payload.documentId = idMap.get(payload.documentId)!;
            }
            await firstValueFrom(this.api.sendRoutingReminder(payload));
            syncedCount++;
            break;
          }

          case 'TRANSFER_DOCUMENT': {
            const payload = { ...item.payload };
            let docId = payload.documentId;
            if (idMap.has(docId)) {
              docId = idMap.get(docId)!;
            }
            await firstValueFrom(this.api.transferDocument(docId, payload));
            syncedCount++;
            break;
          }

          default:
            // Unknown action type, discard
            break;
        }
      } catch (err: any) {
        console.error('[OfflineSync] Failed to sync item:', item, err);
        errors++;
        item.retries = (item.retries || 0) + 1;
        item.lastError = err?.message || 'Sync failed';
        // Keep in queue if retry count is under 5
        if (item.retries < 5) {
          remainingQueue.push(item);
        } else {
          console.warn('[OfflineSync] Discarding item after 5 failed retries:', item);
        }
      }
    }

    this.queue.set(remainingQueue);
    this.persistQueue(remainingQueue);
    this.isSyncing.set(false);
    this.syncStatusMessage.set(null);

    if (syncedCount > 0) {
      this.markSyncSuccess();
      this.ui.showSuccess(
        `Successfully synchronized ${syncedCount} offline record${syncedCount > 1 ? 's' : ''} with the central database!`,
      );
    }

    if (errors > 0 && remainingQueue.length > 0) {
      this.ui.showError(
        `${remainingQueue.length} record(s) could not be synchronized due to a network issue. Retrying automatically.`,
      );
    }

    if (onDoneCallback) {
      try {
        await onDoneCallback();
      } catch {}
    }

    return { success: errors === 0, syncedCount, errors };
  }
}
