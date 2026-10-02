export type IdRecord = { id?: string | null };

const reservedSequences = new Map<string, number>();

export function nextReadableId(prefix: string, records: IdRecord[], width = 4): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  let highest = reservedSequences.get(prefix.toUpperCase()) || 0;
  for (const record of records) {
    const match = String(record.id || '').match(pattern);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  const next = highest + 1;
  reservedSequences.set(prefix.toUpperCase(), next);
  return `${prefix}-${String(next).padStart(width, '0')}`;
}
