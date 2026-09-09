import assert from 'node:assert/strict';
import test from 'node:test';
import { documentFileType, isReplyAttachment } from '../frontend/src/utils/documentFiles.ts';

test('accepts JPEG replies and preserves their image type', () => {
  assert.equal(isReplyAttachment({ name: 'reply.jpg', type: 'image/jpeg' }), true);
  assert.equal(documentFileType({ name: 'reply.JPEG', type: '' }), 'image/jpeg');
  assert.equal(isReplyAttachment({ name: 'reply.JPEG', type: '' }), true);
});
test('continues to accept PDF and PNG replies', () => {
  assert.equal(isReplyAttachment({ name: 'reply.pdf', type: '' }), true);
  assert.equal(isReplyAttachment({ name: 'reply.png', type: 'image/png' }), true);
});
test('does not mislabel unknown files as PDF or accept unsupported replies', () => {
  assert.equal(documentFileType({ name: 'unknown.bin', type: '' }), 'application/octet-stream');
  assert.equal(isReplyAttachment({ name: 'reply.txt', type: 'text/plain' }), false);
  assert.equal(isReplyAttachment({ name: 'reply.jpg', type: 'text/plain' }), false);
});
