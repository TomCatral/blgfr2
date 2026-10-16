import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const root = process.cwd();
const dataDir = path.join(root, 'backend', 'data');
const dbFile = path.join(dataDir, 'blgf_doctrack_db.json');
const envelopeFile = path.join(dataDir, 'blgf_envelope_logs_db.json');

const removeChildren = (directory) => {
  if (!fs.existsSync(directory)) return 0;
  let removed = 0;
  for (const entry of fs.readdirSync(directory)) {
    fs.rmSync(path.join(directory, entry), { recursive: true, force: true });
    removed += 1;
  }
  return removed;
};

const snapshot = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
snapshot.updatedAt = new Date().toISOString();
snapshot.users = (snapshot.users || []).map((user) => ({ ...user, avatarUrl: '' }));
snapshot.documents = [];
snapshot.auditLogs = [];
snapshot.notifications = [];
snapshot.employees = [];
snapshot.systemSettings = {
  ...(snapshot.systemSettings || {}),
  login_background_url: null,
  explicitRemoved: true,
};
fs.writeFileSync(dbFile, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
fs.writeFileSync(envelopeFile, '[]\n', 'utf8');

for (const file of fs.readdirSync(dataDir)) {
  if (file.endsWith('.bak')) fs.rmSync(path.join(dataDir, file), { force: true });
}

const removedStorageEntries = removeChildren(path.join(dataDir, 'storage'));
const removedRecordEntries = removeChildren(path.join(root, 'backend', 'records-management'));

let mysqlCleaned = false;
const prisma = new PrismaClient();
try {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of [
    'document_attachments',
    'document_routes',
    'documents',
    'audit_logs',
    'envelope_logs',
    'employee_profiles',
  ]) {
    await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
  }
  await prisma.$executeRawUnsafe('UPDATE `users` SET `avatar_url` = NULL');
  try {
    await prisma.$executeRawUnsafe("UPDATE `system_settings` SET `setting_value` = NULL WHERE `setting_key` = 'login_background_url'");
  } catch {
    // Older installs keep this setting only in the JSON recovery snapshot.
  }
  mysqlCleaned = true;
} catch (error) {
  console.warn(`MYSQL_PENDING: ${error.message.split('\n').at(-1)}`);
} finally {
  try { await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
  await prisma.$disconnect();
}

console.log(JSON.stringify({
  usersPreserved: snapshot.users.length,
  mysqlCleaned,
  removedStorageEntries,
  removedRecordEntries,
}));
