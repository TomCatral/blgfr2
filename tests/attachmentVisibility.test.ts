import assert from 'node:assert/strict';
import test from 'node:test';
import { isSharedDocumentFile } from '../frontend/src/utils/attachmentVisibility.ts';
import type { DocumentAttachment, DocumentRecord, AuditLog } from '../frontend/src/types.ts';
const document = { trackingNumber: 'DOC-1', createdAt: '2026-09-08T08:00:00Z', routes: [] } as unknown as DocumentRecord;
const file = { id: 'file', fileName: 'memo.jpg', uploadDate: '2026-09-08T07:59:00Z' } as DocumentAttachment;
test('logging attachments remain shared even though their uploader is recorded', () => {
  assert.equal(isSharedDocumentFile({...file, attachmentScope:'DOCUMENT', uploadedByUserId:'creator'},document,[]),true);
});
test('recipient uploads are never shared as logging attachments', () => {
  assert.equal(isSharedDocumentFile({...file,attachmentScope:'RECIPIENT',uploadedByUserId:'recipient'},document,[]),false);
});
test('legacy files distinguish registration uploads from subsequent uploads', () => {
  assert.equal(isSharedDocumentFile(file,document,[]),true);
  assert.equal(isSharedDocumentFile({...file,uploadDate:'2026-09-08T09:00:00Z'},document,[]),false);
  assert.equal(isSharedDocumentFile(file,document,[{documentTrackingNumber:'DOC-1',action:'UPLOAD_ATTACHMENT',details:'Uploaded file attachment "memo.jpg"'} as AuditLog]),false);
});
