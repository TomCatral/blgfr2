import type { AuditLog, DocumentAttachment, DocumentRecord } from '../types';

export function isSharedDocumentFile(file: DocumentAttachment, document: DocumentRecord, logs: AuditLog[]): boolean {
  if (file.attachmentScope) return file.attachmentScope === 'DOCUMENT';
  if (file.uploadedByUserId) return false;
  if (document.routes?.some(route => route.attachments?.some(item => item.id === file.id))) return false;
  if (logs.some(log => [document.trackingNumber, document.routeNo].includes(log.documentTrackingNumber) &&
    log.action === 'UPLOAD_ATTACHMENT' && log.details.includes(`"${file.fileName}"`))) return false;
  // Legacy creation uploads precede registration. Later uploads are not shared.
  return new Date(file.uploadDate).getTime() <= new Date(document.createdAt).getTime();
}
