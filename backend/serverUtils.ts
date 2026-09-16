import { randomUUID } from 'node:crypto';
import { AuditLog, NotificationItem } from '../frontend/src/app/types';
import { saveDatabaseToFile as sdtf } from './server.js';

export function addAuditLog(
  auditLogsState: AuditLog[],
  log: Omit<AuditLog, 'id' | 'timestamp'>,
  queueSync = true,
) {
  const newLog: AuditLog = {
    id: `log-${randomUUID()}`,
    timestamp: new Date().toISOString(),
    ...log,
  };
  auditLogsState.unshift(newLog);
  sdtf(queueSync);
  return newLog;
}

export function createNotification(
  notif: Omit<NotificationItem, 'id' | 'createdAt'>,
) {
  return {
    id: `notif-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...notif,
  };
}

export function saveDatabaseToFile(queueSync = true) {
  sdtf(queueSync);
}

export {
  markLatestRouteAsProcessed,
  flushDatabaseSync,
} from './server.js';

export type ServerUtilDeps = {
  getUsersState: () => any[];
};
