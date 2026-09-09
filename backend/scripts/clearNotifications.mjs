import fs from 'node:fs';
import path from 'node:path';

const databasePath = path.resolve(
  process.cwd(),
  'backend',
  'data',
  'blgf_doctrack_db.json',
);
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
const deletedCount = (database.notifications || []).length;
database.notifications = [];
fs.writeFileSync(databasePath, JSON.stringify(database, null, 2), 'utf8');
console.log(JSON.stringify({ deletedCount, remainingNotifications: 0 }));
