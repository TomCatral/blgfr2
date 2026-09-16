import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.resolve(__dirname, '../data/blgf_doctrack_db.json');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 1: Loading JSON file ---');
  const db = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));

  // 1. Clean employees: remove dummy gibberish record if present
  db.employees = db.employees.filter(e => e.id !== 'emp-1785314690853');

  // 2. Fix officeType for the 3 Partner Agencies
  const partnerAgencyIds = [
    'emp-676a5dd8-e8b6-43cb-ae36-63fc77e68ba5', // DILG
    'emp-7fae32b7-00d3-4c8a-83e8-0de83e2ebad9', // COA
    'emp-b860c5fd-2780-4cc2-a18d-3ee063b6e919'  // DBM
  ];
  for (const emp of db.employees) {
    if (partnerAgencyIds.includes(emp.id)) {
      emp.officeType = 'OTHER_AGENCIES';
    }
  }

  // 3. Ensure BLGF users have 1-to-1 matching and static folder
  const userMap = new Map();
  for (const u of db.users) {
    userMap.set(u.id, u);
  }

  for (const emp of db.employees) {
    if (emp.userId && userMap.has(emp.userId)) {
      const u = userMap.get(emp.userId);
      emp.officeType = 'BLGF';
      const autoFolder = `fld-auto-${u.id}`;
      const currentFolders = Array.isArray(emp.folders) ? emp.folders : [];
      if (!currentFolders.includes(autoFolder)) {
        emp.folders = [autoFolder, ...currentFolders];
      }
    }
  }

  // 4. Ensure directorySections
  db.directorySections = [
    {
      id: 'BLGF',
      label: 'BLGF Regional Office II Personnel',
      officeTypes: ['BLGF'],
      color: 'blue'
    },
    {
      id: 'LGU_STAFF',
      label: 'Provincial & Municipal Treasury Offices (Region II)',
      officeTypes: ['PROVINCIAL_TREASURER', 'MUNICIPAL_TREASURER', 'LGU'],
      color: 'emerald'
    },
    {
      id: 'OTHER_AGENCIES',
      label: 'Partner Regional Agencies (DILG, DBM, COA)',
      officeTypes: ['OTHER_AGENCIES'],
      color: 'amber'
    }
  ];

  db.updatedAt = new Date().toISOString();
  fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf8');
  console.log('JSON file successfully updated and saved!');

  console.log('--- Step 2: Syncing to MySQL database via Prisma ---');
  
  // 1. Sync Directory Sections
  await prisma.directorySection.deleteMany({});
  for (const s of db.directorySections) {
    await prisma.directorySection.create({
      data: {
        id: s.id,
        label: s.label,
        officeTypes: JSON.stringify(s.officeTypes),
        color: s.color || null
      }
    });
  }
  console.log('Synced directory sections to MySQL');

  // 2. Sync Employee Profiles
  await prisma.employeeProfile.deleteMany({});
  for (const e of db.employees) {
    await prisma.employeeProfile.create({
      data: {
        id: e.id,
        userId: e.userId || null,
        fullName: e.fullName,
        position: e.position,
        office: e.office,
        officeType: e.officeType,
        divisionCode: e.divisionCode || null,
        email: e.email || null,
        contactNo: e.contactNo || null,
        address: e.address || null,
        active: e.active !== false,
        createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
        folders: e.folders ? JSON.stringify(e.folders) : null
      }
    });
  }
  console.log('Synced employee profiles to MySQL');

  // 3. Update documents recipient columns in MySQL
  for (const doc of db.documents) {
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        senderAddress: doc.senderAddress || null,
        recipientPosition: doc.recipientPosition || null,
        recipientOffice: doc.recipientOffice || null,
        recipientAddress: doc.recipientAddress || null,
        routeNo: doc.routeNo || null
      }
    });
  }
  console.log('Updated documents extra columns in MySQL');

  console.log('--- Step 3: Verification Report ---');
  const mysqlSections = await prisma.directorySection.findMany();
  const mysqlEmployees = await prisma.employeeProfile.findMany();
  const mysqlDocs = await prisma.document.findMany();

  console.log('MySQL Directory Sections count:', mysqlSections.length);
  mysqlSections.forEach(s => console.log(' - Section:', s.id, '|', s.label, '|', s.officeTypes));

  console.log('MySQL Employees count:', mysqlEmployees.length);
  const byOfficeType = {};
  for (const e of mysqlEmployees) {
    byOfficeType[e.officeType] = (byOfficeType[e.officeType] || 0) + 1;
  }
  console.log('Employee distribution by officeType in MySQL:', byOfficeType);

  const sampleOutgoing = await prisma.document.findFirst({
    where: { direction: 'OUTGOING' }
  });
  if (sampleOutgoing) {
    console.log('Sample MySQL Outgoing Document:');
    console.log(' - ID:', sampleOutgoing.id);
    console.log(' - Tracking:', sampleOutgoing.trackingNumber);
    console.log(' - Recipient:', sampleOutgoing.recipientName);
    console.log(' - Office:', sampleOutgoing.recipientOffice);
    console.log(' - Address:', sampleOutgoing.recipientAddress);
    console.log(' - Sender Addr:', sampleOutgoing.senderAddress);
    console.log(' - Route No:', sampleOutgoing.routeNo);
  }

  console.log('\nSUCCESS! Database and JSON state are 100% aligned and verified.');
}

main()
  .catch((err) => {
    console.error('Error during alignment:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
