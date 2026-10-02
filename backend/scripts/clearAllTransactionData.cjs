const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..', '..');
const dotenvPath = path.join(projectRoot, '.env');
if (fs.existsSync(dotenvPath)) {
  require(path.join(projectRoot, 'node_modules/dotenv')).config({ path: dotenvPath });
}

const { PrismaClient } = require(path.join(projectRoot, 'node_modules/@prisma/client'));
const url = process.env.MYSQL_DATABASE_URL || 'mysql://root@127.0.0.1:3306/blgf_region2_doctrack';
const prisma = new PrismaClient({ datasourceUrl: url });

async function clearTransactionData() {
  console.log('--- Step 1: Clearing MySQL transaction data ---');
  try {
    const beforeCounts = {
      docs: await prisma.document.count(),
      routes: await prisma.documentRoute.count(),
      attachments: await prisma.documentAttachment.count(),
      auditLogs: await prisma.auditLog.count(),
      envLogs: await prisma.envelopeLog.count(),
      users: await prisma.user.count(),
      divisions: await prisma.division.count(),
      employees: await prisma.employeeProfile.count(),
    };
    console.log('Before deletion in MySQL:', beforeCounts);

    // Delete in proper order respecting foreign keys
    const delAttachments = await prisma.documentAttachment.deleteMany({});
    const delRoutes = await prisma.documentRoute.deleteMany({});
    const delDocs = await prisma.document.deleteMany({});
    const delAudit = await prisma.auditLog.deleteMany({});
    const delEnv = await prisma.envelopeLog.deleteMany({});

    console.log('Deleted from MySQL:', {
      attachments: delAttachments.count,
      routes: delRoutes.count,
      documents: delDocs.count,
      auditLogs: delAudit.count,
      envelopeLogs: delEnv.count,
    });

    const afterCounts = {
      docs: await prisma.document.count(),
      routes: await prisma.documentRoute.count(),
      attachments: await prisma.documentAttachment.count(),
      auditLogs: await prisma.auditLog.count(),
      envLogs: await prisma.envelopeLog.count(),
      users: await prisma.user.count(),
      divisions: await prisma.division.count(),
      employees: await prisma.employeeProfile.count(),
    };
    console.log('After deletion in MySQL:', afterCounts);
  } catch (err) {
    console.error('MySQL deletion error:', err);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n--- Step 2: Clearing backend/data JSON snapshots ---');
  // Clear blgf_doctrack_db.json
  const mainDbPath = path.join(projectRoot, 'backend', 'data', 'blgf_doctrack_db.json');
  if (fs.existsSync(mainDbPath)) {
    const mainDb = JSON.parse(fs.readFileSync(mainDbPath, 'utf8'));
    const prevDocs = (mainDb.documents || []).length;
    const prevAudit = (mainDb.auditLogs || []).length;
    const prevNotif = (mainDb.notifications || []).length;

    mainDb.documents = [];
    mainDb.auditLogs = [];
    mainDb.notifications = [];
    mainDb.updatedAt = new Date().toISOString();

    fs.writeFileSync(mainDbPath, JSON.stringify(mainDb, null, 2), 'utf8');
    console.log(`Updated ${mainDbPath}: cleared ${prevDocs} docs, ${prevAudit} audit logs, ${prevNotif} notifications.`);
    console.log(`Preserved: ${mainDb.users?.length || 0} users, ${mainDb.divisions?.length || 0} divisions, ${mainDb.employees?.length || 0} employees.`);
  }

  // Clear blgf_envelope_logs_db.json
  const envDbPath = path.join(projectRoot, 'backend', 'data', 'blgf_envelope_logs_db.json');
  if (fs.existsSync(envDbPath)) {
    const envDb = JSON.parse(fs.readFileSync(envDbPath, 'utf8'));
    const prevEnv = (envDb.logs || []).length;
    envDb.logs = [];
    fs.writeFileSync(envDbPath, JSON.stringify(envDb, null, 2), 'utf8');
    console.log(`Updated ${envDbPath}: cleared ${prevEnv} envelope logs.`);
  }

  console.log('\n--- Step 3: Clearing uploaded attachments storage ---');
  const attachmentsDir = path.join(projectRoot, 'backend', 'data', 'storage', 'attachments');
  if (fs.existsSync(attachmentsDir)) {
    const files = fs.readdirSync(attachmentsDir);
    let deletedFiles = 0;
    for (const file of files) {
      const filePath = path.join(attachmentsDir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        deletedFiles++;
      }
    }
    console.log(`Deleted ${deletedFiles} attachment files from storage/attachments.`);
  }

  console.log('\n--- Step 4: Triggering backend server reload ---');
  const serverPath = path.join(projectRoot, 'backend', 'server.ts');
  if (fs.existsSync(serverPath)) {
    const content = fs.readFileSync(serverPath, 'utf8');
    fs.writeFileSync(serverPath, content, 'utf8');
    console.log('Touched backend/server.ts to trigger tsx watch refresh.');
  }

  console.log('\nData cleanup completed successfully!');
}

clearTransactionData().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
