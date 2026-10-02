import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {
  connectMySQLReplica,
  disconnectMySQLReplica,
  getMySQLReplicaStatus,
  loadMySQLState,
  syncMySQLReplica,
} from '../mysqlReplica.ts';
import { recalculateDocumentStatus } from '../../frontend/src/app/utils/document-status.ts';

dotenv.config({ quiet: true });

const root = process.cwd();
const dbPath = path.join(root, 'backend', 'data', 'blgf_doctrack_db.json');
const envelopePath = path.join(root, 'backend', 'data', 'blgf_envelope_logs_db.json');
const local = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const localEnvelope = fs.existsSync(envelopePath)
  ? JSON.parse(fs.readFileSync(envelopePath, 'utf8'))
  : { logs: [] };

await connectMySQLReplica();
let state = new Map();
if (getMySQLReplicaStatus().connected) {
  state = new Map(await loadMySQLState());
}

const db = {
  ...local,
  divisions: state.get('divisions') || local.divisions || [],
  users: state.get('users') || local.users || [],
  documents: state.get('documents') || local.documents || [],
  auditLogs: state.get('audit_logs') || local.auditLogs || [],
  notifications: state.get('notifications') || local.notifications || [],
  employees: state.get('employee_profiles') || local.employees || [],
  directorySections: state.get('directory_sections') || local.directorySections || [],
};
const envelopeLogs = state.get('envelope_logs') || localEnvelope.logs || [];

const makeMap = (records, prefix) => {
  const map = new Map();
  records.forEach((record, index) => map.set(record.id, `${prefix}-${String(index + 1).padStart(4, '0')}`));
  return map;
};
const replace = (map, value) => (value && map.has(value) ? map.get(value) : value);

const divisionIds = makeMap(db.divisions, 'DIV');
const userIds = makeMap(db.users, 'USR');
const documentIds = makeMap(db.documents, 'DOC');
const routeRecords = db.documents.flatMap((document) => document.routes || []);
const routeIds = makeMap(routeRecords, 'RTE');
const attachmentRecords = db.documents.flatMap((document) => [
  ...(document.attachments || []),
  ...(document.routes || []).flatMap((route) => route.attachments || []),
]);
const attachmentIds = makeMap(attachmentRecords, 'ATT');
const auditIds = makeMap(db.auditLogs, 'LOG');
const envelopeIds = makeMap(envelopeLogs, 'ENV');
const employeeIds = makeMap(db.employees, 'EMP');
const notificationIds = makeMap(db.notifications, 'NTF');
const sectionIds = makeMap(db.directorySections, 'DIR');

db.divisions.forEach((record) => { record.id = replace(divisionIds, record.id); });
db.users.forEach((record) => { record.id = replace(userIds, record.id); });
db.documents.forEach((document) => {
  document.id = replace(documentIds, document.id);
  document.assignedUserId = replace(userIds, document.assignedUserId);
  document.createdByUserId = replace(userIds, document.createdByUserId);
  for (const route of document.routes || []) {
    route.id = replace(routeIds, route.id);
    route.documentId = document.id;
    route.fromUserId = replace(userIds, route.fromUserId);
    route.toUserId = replace(userIds, route.toUserId);
    for (const attachment of route.attachments || []) {
      attachment.id = replace(attachmentIds, attachment.id);
      attachment.documentId = document.id;
      attachment.uploadedByUserId = replace(userIds, attachment.uploadedByUserId);
      attachment.uploadedForRouteId = route.id;
    }
  }
  for (const attachment of document.attachments || []) {
    attachment.id = replace(attachmentIds, attachment.id);
    attachment.documentId = document.id;
    attachment.uploadedByUserId = replace(userIds, attachment.uploadedByUserId);
    attachment.uploadedForRouteId = replace(routeIds, attachment.uploadedForRouteId);
    if (attachment.uploadedForRouteId && ![...routeIds.values()].includes(attachment.uploadedForRouteId)) {
      delete attachment.uploadedForRouteId;
    }
  }
});
db.auditLogs.forEach((record) => {
  record.id = replace(auditIds, record.id);
  record.userId = replace(userIds, record.userId);
});
envelopeLogs.forEach((record) => {
  record.id = replace(envelopeIds, record.id);
  record.userId = replace(userIds, record.userId);
});
db.employees.forEach((record) => {
  record.id = replace(employeeIds, record.id);
  record.userId = replace(userIds, record.userId);
});
db.notifications = db.notifications
  .filter((record) => !record.userId || [...userIds.values()].includes(replace(userIds, record.userId)))
  .filter((record) => !record.documentId || [...documentIds.values()].includes(replace(documentIds, record.documentId)))
  .map((record) => ({
    ...record,
    id: replace(notificationIds, record.id),
    userId: replace(userIds, record.userId),
    documentId: replace(documentIds, record.documentId),
  }));
db.directorySections.forEach((record) => { record.id = replace(sectionIds, record.id); });
db.documents.forEach((document) => recalculateDocumentStatus(document));
db.idSchemaVersion = 1;
db.updatedAt = new Date().toISOString();

if (!fs.existsSync(`${dbPath}.before-readable-ids.bak`)) {
  fs.copyFileSync(dbPath, `${dbPath}.before-readable-ids.bak`);
}
if (fs.existsSync(envelopePath) && !fs.existsSync(`${envelopePath}.before-readable-ids.bak`)) {
  fs.copyFileSync(envelopePath, `${envelopePath}.before-readable-ids.bak`);
}
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
fs.writeFileSync(envelopePath, JSON.stringify({ updatedAt: db.updatedAt, logs: envelopeLogs }, null, 2));

if (getMySQLReplicaStatus().connected) {
  await syncMySQLReplica([
    ['divisions', db.divisions],
    ['users', db.users],
    ['documents', db.documents],
    ['audit_logs', db.auditLogs],
    ['envelope_logs', envelopeLogs],
    ['notifications', db.notifications],
    ['employee_profiles', db.employees],
    ['directory_sections', db.directorySections],
  ]);
}

console.log(JSON.stringify({
  mysqlSynchronized: getMySQLReplicaStatus().connected,
  counts: {
    divisions: db.divisions.length,
    users: db.users.length,
    documents: db.documents.length,
    routes: routeRecords.length,
    attachments: attachmentRecords.length,
    auditLogs: db.auditLogs.length,
    envelopeLogs: envelopeLogs.length,
    employees: db.employees.length,
    notifications: db.notifications.length,
  },
  backups: [`${dbPath}.before-readable-ids.bak`, `${envelopePath}.before-readable-ids.bak`],
}, null, 2));

await disconnectMySQLReplica();
