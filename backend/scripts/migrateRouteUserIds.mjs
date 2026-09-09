import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const url = new URL('mysql://localhost');
url.hostname = process.env.MYSQL_HOST;
url.port = process.env.MYSQL_PORT || '3306';
url.username = process.env.MYSQL_USER;
url.password = process.env.MYSQL_PASSWORD;
url.pathname = `/${process.env.MYSQL_DATABASE}`;
if ((process.env.MYSQL_SSL || '').toLowerCase() === 'true') {
  url.searchParams.set('sslaccept', 'strict');
}

const prisma = new PrismaClient({ datasourceUrl: url.toString() });
try {
  const columns = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS column_count
       FROM information_schema.columns
      WHERE table_schema = ? AND table_name = 'document_routes'
        AND column_name = 'to_user_id'`,
    process.env.MYSQL_DATABASE,
  );
  if (Number(columns[0]?.column_count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE document_routes
         ADD COLUMN to_user_id VARCHAR(64) NULL AFTER to_user`,
    );
  }
  const indexes = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS index_count
       FROM information_schema.statistics
      WHERE table_schema = ? AND table_name = 'document_routes'
        AND index_name = 'idx_document_routes_to_user_id'`,
    process.env.MYSQL_DATABASE,
  );
  if (Number(indexes[0]?.index_count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE document_routes
         ADD INDEX idx_document_routes_to_user_id (to_user_id)`,
    );
  }
  const routesUpdated = await prisma.$executeRawUnsafe(
    `UPDATE document_routes r
       JOIN users u ON LOWER(TRIM(r.to_user)) = LOWER(TRIM(u.full_name))
        SET r.to_user_id = u.id
      WHERE r.to_user_id IS NULL AND r.to_user IS NOT NULL`,
  );
  const historicalRecipientAliases = [
    ['Jay ann', 'ann'],
    ['Rona asd', 'rona'],
    ['Raymond Rosete', 'mon'],
  ];
  let aliasRoutesUpdated = 0;
  for (const [oldRecipient, username] of historicalRecipientAliases) {
    aliasRoutesUpdated += await prisma.$executeRawUnsafe(
      `UPDATE document_routes r
         JOIN users u ON u.source_username = ? OR u.username = ?
          SET r.to_user_id = u.id
        WHERE r.to_user_id IS NULL AND r.to_user = ?`,
      username,
      username,
      oldRecipient,
    );
  }
  const counts = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS total,
            SUM(to_user_id IS NOT NULL) AS mapped
       FROM document_routes`,
  );
  const unmatchedRecipients = await prisma.$queryRawUnsafe(
    `SELECT to_user AS recipient, COUNT(*) AS route_count
       FROM document_routes
      WHERE to_user_id IS NULL AND to_user IS NOT NULL
        AND LENGTH(TRIM(to_user)) > 0
      GROUP BY to_user ORDER BY route_count DESC`,
  );
  console.log(
    JSON.stringify({
      routesUpdated,
      aliasRoutesUpdated,
      totalRoutes: Number(counts[0]?.total || 0),
      idMappedRoutes: Number(counts[0]?.mapped || 0),
      unmatchedRecipients: unmatchedRecipients.map((item) => ({
        recipient: item.recipient,
        routeCount: Number(item.route_count),
      })),
    }),
  );
} finally {
  await prisma.$disconnect();
}
