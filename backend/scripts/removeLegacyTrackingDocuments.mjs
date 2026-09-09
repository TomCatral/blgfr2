import fs from 'node:fs';
import path from 'node:path';

const databasePath = path.resolve(
  process.cwd(),
  'backend',
  'data',
  'blgf_doctrack_db.json',
);
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
const legacyDocuments = (database.documents || []).filter(
  (document) => !String(document.routeNo || '').trim(),
);
const legacyDocumentIds = new Set(
  legacyDocuments.map((document) => document.id),
);
const legacyReferences = new Set(
  legacyDocuments
    .map((document) => String(document.trackingNumber || '').trim())
    .filter(Boolean),
);

database.documents = (database.documents || []).filter(
  (document) => !legacyDocumentIds.has(document.id),
);
database.notifications = (database.notifications || []).filter(
  (notification) =>
    !notification.documentId ||
    !legacyDocumentIds.has(notification.documentId),
);
database.archives = (database.archives || []).filter(
  (archive) => !legacyDocumentIds.has(archive.documentId),
);
database.auditLogs = (database.auditLogs || []).filter(
  (log) =>
    !log.documentTrackingNumber ||
    !legacyReferences.has(log.documentTrackingNumber),
);

fs.writeFileSync(databasePath, JSON.stringify(database, null, 2), 'utf8');
console.log(
  JSON.stringify({
    removedDocuments: legacyDocuments.length,
    removedDocumentIds: [...legacyDocumentIds],
    remainingDocuments: database.documents.length,
  }),
);
