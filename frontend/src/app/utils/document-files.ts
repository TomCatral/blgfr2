export function documentFileType(file: { name: string; type: string }): string {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' } as Record<string, string>)[extension || ''] || 'application/octet-stream';
}

export function isReplyAttachment(file: { name: string; type: string }): boolean {
  return ['application/pdf', 'image/jpeg', 'image/png'].includes(documentFileType(file));
}
