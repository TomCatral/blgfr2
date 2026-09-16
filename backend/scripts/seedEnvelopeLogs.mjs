import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const buildUrl = () => {
  const explicit = process.env.MYSQL_DATABASE_URL?.trim();
  if (explicit) return explicit;
  const host = process.env.MYSQL_HOST?.trim();
  const user = process.env.MYSQL_USER?.trim();
  const password = process.env.MYSQL_PASSWORD ?? '';
  const database = process.env.MYSQL_DATABASE?.trim();
  if (!host || !user || !password || !database) {
    console.error('MYSQL_DATABASE_URL or MYSQL_* variables are required.');
    process.exit(1);
  }
  const url = new URL('mysql://localhost');
  url.hostname = host;
  url.port = process.env.MYSQL_PORT?.trim() || '3306';
  url.username = user;
  url.password = password;
  url.pathname = `/${database}`;
  if (process.env.MYSQL_SSL?.toLowerCase() === 'true') {
    url.searchParams.set('sslaccept', 'strict');
  }
  return url.toString();
};

const now = new Date();
const hoursAgo = (hours) => new Date(now.getTime() - hours * 36e5).toISOString();
const daysAgo = (days) => hoursAgo(days * 24);

const DIVISION_SEEDS = [
  ['ITMS', 'Information Technology Management System', 'Tom Catral'],
  ['ORD', 'Office of the Regional Director', 'Attys. Julaida Caddawan-Pancho'],
  ['AD', 'Administrative Division', 'Rona Lagasca'],
  ['LAOD', 'Local Assessment Operations Division', 'Raymond C. Rosete'],
  ['LTOD', 'Local Treasury Operations Division', 'Albert Sunchez'],
  ['FD', 'Financial Division', 'Dominick Catral'],
  ['LU', 'Legal Unit', 'Estafano T. Yu'],
];

const prisma = new PrismaClient({ datasourceUrl: buildUrl() });
try {
  const [existingUsers, existingDivisions, existingEnvelopeLogs, documents] =
    await Promise.all([
      prisma.user.findMany({
        where: { active: true },
        select: { id: true, fullName: true, role: true },
      }),
      prisma.division.findMany({ select: { code: true } }),
      prisma.envelopeLog.count(),
      prisma.document.findMany({
        select: { trackingNumber: true, title: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

  const results = { divisionsAdded: 0, envelopeLogsAdded: 0 };

  for (const [code, name, chiefName] of DIVISION_SEEDS) {
    if (existingDivisions.some((division) => division.code === code)) continue;
    await prisma.division.create({
      data: { id: `div-${randomUUID()}`, code, name, chiefName },
    });
    results.divisionsAdded += 1;
  }

  if (existingEnvelopeLogs === 0) {
    if (existingUsers.length === 0) {
      console.warn('No active users in the database; skipping envelope logs.');
    } else {
      const [clerk] = existingUsers.filter(
        (user) =>
          user.role === 'RECORDS_OFFICER' ||
          user.role === 'OFFICE_CLERK' ||
          user.role === 'ADMIN_CLERK',
      );
      const [admin] = existingUsers.filter((user) =>
        ['SYSTEM_ADMIN', 'ORD'].includes(user.role),
      );
      const [staff] = existingUsers.filter((user) => user.role === 'STAFF');
      const [outgoingDoc] = documents;
      const outgoingRouteNo =
        outgoingDoc?.trackingNumber || 'BLGFR2-2026-09-OUT-01';
      const routeNumbers = [
        outgoingRouteNo,
        ...Array.from({ length: 7 }, (_, i) => {
          const month = 8 + Math.floor(i / 4);
          return `BLGF-RCO2-OUT-2026-${String(month).padStart(2, '0')}-${String(
            i + 1,
          )
            .trim()
            .padStart(3, '0')}`;
        }),
      ];

      const samples = [
        {
          userName: clerk?.fullName || admin?.fullName || 'Records Officer',
          userRole: clerk?.role || admin?.role || 'RECORDS_OFFICER',
          tracking: routeNumbers[0],
          subject: outgoingDoc?.title || 'Outgoing Document',
          recipient: 'City Treasurer, Cauayan City',
          address: 'Cauayan City, Isabela',
          at: daysAgo(2),
        },
        {
          userName: admin?.fullName || 'Administrator',
          userRole: admin?.role || 'SYSTEM_ADMIN',
          tracking: routeNumbers[1],
          subject: 'Memorandum Circular No. 001',
          recipient: 'Provincial Treasurer, Santiago City',
          address: 'Santiago City, Isabela',
          at: daysAgo(4),
        },
        {
          userName: staff?.fullName || admin?.fullName || 'Staff',
          userRole: staff?.role || 'STAFF',
          tracking: routeNumbers[2],
          subject: 'Request for Property Transfer Ownership Notification',
          recipient: 'Municipal Treasurer, Solana',
          address: 'Solana, Cagayan',
          at: daysAgo(6),
        },
        {
          userName: clerk?.fullName || 'Records Officer',
          userRole: clerk?.role || 'RECORDS_OFFICER',
          tracking: routeNumbers[3],
          subject: 'Transmittal of Financial Reports',
          recipient: 'Regional Director, BLGF RO-II',
          address: 'Carig Sur, Tuguegarao City, Cagayan',
          at: daysAgo(9),
        },
        {
          userName: admin?.fullName || 'Administrator',
          userRole: admin?.role || 'SYSTEM_ADMIN',
          tracking: routeNumbers[4],
          subject: 'Authority to Render Overtime Service',
          recipient: 'City Treasurer, Tuguegarao City',
          address: 'Tuguegarao City, Cagayan',
          at: daysAgo(12),
        },
        {
          userName: staff?.fullName || 'Staff',
          userRole: staff?.role || 'STAFF',
          tracking: routeNumbers[5],
          subject: 'Certified True Copy of Local Revenue Code',
          recipient: 'Provincial Treasurer, Cagayan',
          address: 'Tuguegarao City, Cagayan',
          at: daysAgo(15),
        },
        {
          userName: clerk?.fullName || 'Records Officer',
          userRole: clerk?.role || 'RECORDS_OFFICER',
          tracking: routeNumbers[6],
          subject: 'Update on Local Legislation Tracking',
          recipient: 'Municipal Treasurer, Ballesteros',
          address: 'Ballesteros, Cagayan',
          at: daysAgo(19),
        },
        {
          userName: admin?.fullName || 'Administrator',
          userRole: admin?.role || 'SYSTEM_ADMIN',
          tracking: routeNumbers[7],
          subject: 'Final Settlement of Real Property Tax',
          recipient: 'City Treasurer, Ilagan City',
          address: 'Ilagan City, Isabela',
          at: daysAgo(24),
        },
      ];

      for (const sample of samples) {
        const userId = existingUsers.find(
          (user) => user.fullName === sample.userName && user.role === sample.userRole,
        )?.id;
        if (!userId) continue;
        const details = [
          `Send to: ${sample.recipient}`,
          `Address: ${sample.address}`,
          `Subject: ${sample.subject}`,
          `Released by: ${sample.userName}`,
        ].join(' | ');
        await prisma.envelopeLog.create({
          data: {
            id: `envelope-log-${randomUUID()}`,
            timestamp: new Date(sample.at),
            userId,
            userName: sample.userName,
            userRole: sample.userRole,
            action: 'ENVELOPE_LOG',
            documentTrackingNumber: sample.tracking,
            details,
            ipAddress: '127.0.0.1',
          },
        });
        results.envelopeLogsAdded += 1;
      }
    }
  }

  console.log(
    JSON.stringify({
      ...results,
      envelopeLogsSkipped: existingEnvelopeLogs > 0 ? existingEnvelopeLogs : 0,
    }),
  );
} finally {
  await prisma.$disconnect();
}