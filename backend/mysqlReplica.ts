import { Prisma, PrismaClient } from '@prisma/client';

export type ReplicaEntry = [key: string, value: unknown[]];

export interface MySQLReplicaStatus {
  configured: boolean;
  connected: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  recordCounts: Record<string, number>;
}

type DataRecord = Record<string, unknown>;

let client: PrismaClient | null = null;
const status: MySQLReplicaStatus = {
  configured: false,
  connected: false,
  lastSyncedAt: null,
  lastError: null,
  recordCounts: {},
};

function buildDatabaseUrl() {
  const explicitUrl = process.env.MYSQL_DATABASE_URL?.trim();
  if (explicitUrl) return explicitUrl;
  const host = process.env.MYSQL_HOST?.trim();
  const user = process.env.MYSQL_USER?.trim();
  const password = process.env.MYSQL_PASSWORD ?? '';
  const database = process.env.MYSQL_DATABASE?.trim();
  if (!host || !user || !password || !database) return '';

  const url = new URL('mysql://localhost');
  url.hostname = host;
  url.port = process.env.MYSQL_PORT?.trim() || '3306';
  url.username = user;
  url.password = password;
  url.pathname = `/${database}`;
  if (process.env.MYSQL_SSL?.trim().toLowerCase() === 'true') {
    url.searchParams.set('sslaccept', 'strict');
  }
  url.searchParams.set('connection_limit', '3');
  url.searchParams.set('connect_timeout', '10');
  return url.toString();
}

const asRecords = (value: unknown[] | undefined) =>
  (value || []).filter(
    (item): item is DataRecord => Boolean(item) && typeof item === 'object',
  );

const text = (value: unknown, fallback = '') =>
  value == null ? fallback : String(value);

const optionalText = (value: unknown) =>
  value == null || value === '' ? null : String(value);

const date = (value: unknown, fallback = new Date(0)) => {
  const parsed = new Date(text(value));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function schemaObjectExists(
  target: PrismaClient,
  objectType: 'COLUMN' | 'INDEX' | 'CONSTRAINT',
  tableName: string,
  objectName: string,
) {
  const lookup =
    objectType === 'COLUMN'
      ? ['information_schema.COLUMNS', 'COLUMN_NAME']
      : objectType === 'INDEX'
        ? ['information_schema.STATISTICS', 'INDEX_NAME']
        : ['information_schema.TABLE_CONSTRAINTS', 'CONSTRAINT_NAME'];
  const rows = await target.$queryRawUnsafe<Array<{ object_count: bigint }>>(
    `SELECT COUNT(*) AS object_count FROM ${lookup[0]}
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND ${lookup[1]} = ?`,
    tableName,
    objectName,
  );
  return Number(rows[0]?.object_count || 0) > 0;
}

async function ensureUserIdForeignKeys(target: PrismaClient) {
  const columns: Array<[string, string, string]> = [
    ['documents', 'assigned_user_id', 'VARCHAR(64) NULL AFTER `assigned_user`'],
    ['documents', 'created_by_user_id', 'VARCHAR(64) NULL AFTER `created_by`'],
    ['documents', 'sender_position', 'VARCHAR(150) NULL AFTER `sender_name`'],
    ['documents', 'sender_address', 'TEXT NULL AFTER `sender_position`'],
    ['documents', 'recipient_position', 'VARCHAR(150) NULL AFTER `recipient_name`'],
    ['documents', 'recipient_office', 'VARCHAR(255) NULL AFTER `recipient_position`'],
    ['documents', 'recipient_address', 'TEXT NULL AFTER `recipient_office`'],
    ['documents', 'route_no', 'VARCHAR(100) NULL AFTER `tracking_number`'],
    ['document_attachments', 'attachment_scope', 'VARCHAR(20) NULL AFTER `file_data`'],
    ['document_attachments', 'uploaded_by_user_id', 'VARCHAR(64) NULL AFTER `attachment_scope`'],
    ['document_attachments', 'uploaded_for_route_id', 'VARCHAR(64) NULL AFTER `uploaded_by_user_id`'],
    ['document_routes', 'from_user_id', 'VARCHAR(64) NULL AFTER `from_division`'],
    ['employee_profiles', 'user_id', 'VARCHAR(64) NULL AFTER `id`'],
    ['employee_profiles', 'folders', 'JSON NULL'],
  ];
  for (const [table, column, definition] of columns) {
    if (!(await schemaObjectExists(target, 'COLUMN', table, column))) {
      await target.$executeRawUnsafe(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
      );
    }
  }

  await target.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`directory_sections\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`label\` VARCHAR(255) NOT NULL,
      \`office_types\` JSON NOT NULL,
      \`color\` VARCHAR(50) NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  try {
    await target.$executeRawUnsafe(
      'ALTER TABLE `employee_profiles` MODIFY COLUMN `office_type` VARCHAR(50) NOT NULL DEFAULT \'BLGF\'',
    );
  } catch {
    // ignore if column type alteration fails
  }

  // Backfill legacy name-only rows once. All runtime access checks below use IDs.
  await target.$executeRawUnsafe(`
    UPDATE documents d
       SET d.assigned_user_id = COALESCE(
             d.assigned_user_id,
             (SELECT u.id FROM users u
               WHERE LOWER(TRIM(u.full_name)) = LOWER(TRIM(d.assigned_user))
               ORDER BY u.created_at ASC LIMIT 1)
           ),
           d.created_by_user_id = COALESCE(
             d.created_by_user_id,
             (SELECT u.id FROM users u
               WHERE LOWER(TRIM(u.full_name)) = LOWER(TRIM(d.created_by))
               ORDER BY u.created_at ASC LIMIT 1)
           )
     WHERE d.assigned_user_id IS NULL OR d.created_by_user_id IS NULL
  `);
  await target.$executeRawUnsafe(`
    UPDATE document_routes r
       SET r.from_user_id = COALESCE(
             r.from_user_id,
             (SELECT u.id FROM users u
               WHERE LOWER(TRIM(u.full_name)) = LOWER(TRIM(r.from_user))
               ORDER BY u.created_at ASC LIMIT 1)
           ),
           r.to_user_id = COALESCE(
             r.to_user_id,
             (SELECT u.id FROM users u
               WHERE LOWER(TRIM(u.full_name)) = LOWER(TRIM(r.to_user))
               ORDER BY u.created_at ASC LIMIT 1)
           )
     WHERE r.from_user_id IS NULL OR r.to_user_id IS NULL
  `);
  await target.$executeRawUnsafe(`
    UPDATE employee_profiles ep
    JOIN users u
      ON u.id = (
           SELECT matched_user.id FROM users matched_user
            WHERE LOWER(TRIM(matched_user.full_name)) = LOWER(TRIM(ep.full_name))
            ORDER BY matched_user.created_at ASC LIMIT 1
         )
    LEFT JOIN employee_profiles claimed
      ON claimed.user_id = u.id
    LEFT JOIN employee_profiles earlier
      ON earlier.user_id IS NULL
     AND earlier.id < ep.id
     AND LOWER(TRIM(earlier.full_name)) = LOWER(TRIM(ep.full_name))
       SET ep.user_id = u.id
     WHERE ep.user_id IS NULL
       AND claimed.id IS NULL
       AND earlier.id IS NULL
  `);
  await target.$executeRawUnsafe(`
    UPDATE employee_profiles duplicate
    JOIN employee_profiles keeper
      ON duplicate.user_id = keeper.user_id AND duplicate.id > keeper.id
       SET duplicate.user_id = NULL
     WHERE duplicate.user_id IS NOT NULL
  `);

  // Invalid legacy IDs cannot satisfy a foreign key. Preserve display snapshots
  // while clearing only the broken identifier.
  await target.$executeRawUnsafe(`
    UPDATE documents d LEFT JOIN users u ON u.id = d.assigned_user_id
       SET d.assigned_user_id = NULL
     WHERE d.assigned_user_id IS NOT NULL AND u.id IS NULL
  `);
  await target.$executeRawUnsafe(`
    UPDATE documents d LEFT JOIN users u ON u.id = d.created_by_user_id
       SET d.created_by_user_id = NULL
     WHERE d.created_by_user_id IS NOT NULL AND u.id IS NULL
  `);
  await target.$executeRawUnsafe(`
    UPDATE document_routes r LEFT JOIN users u ON u.id = r.from_user_id
       SET r.from_user_id = NULL
     WHERE r.from_user_id IS NOT NULL AND u.id IS NULL
  `);
  await target.$executeRawUnsafe(`
    UPDATE document_routes r LEFT JOIN users u ON u.id = r.to_user_id
       SET r.to_user_id = NULL
     WHERE r.to_user_id IS NOT NULL AND u.id IS NULL
  `);
  await target.$executeRawUnsafe(`
    UPDATE employee_profiles ep LEFT JOIN users u ON u.id = ep.user_id
       SET ep.user_id = NULL
     WHERE ep.user_id IS NOT NULL AND u.id IS NULL
  `);

  if (!(await schemaObjectExists(target, 'INDEX', 'employee_profiles', 'uq_employee_profiles_user_id'))) {
    await target.$executeRawUnsafe(
      'CREATE UNIQUE INDEX `uq_employee_profiles_user_id` ON `employee_profiles` (`user_id`)',
    );
  }

  const indexes: Array<[string, string, string]> = [
    ['documents', 'idx_documents_assigned_user_id', 'assigned_user_id'],
    ['documents', 'idx_documents_created_by_user_id', 'created_by_user_id'],
    ['document_routes', 'idx_document_routes_from_user_id', 'from_user_id'],
    ['document_routes', 'idx_document_routes_to_user_id', 'to_user_id'],
  ];
  for (const [table, indexName, column] of indexes) {
    if (!(await schemaObjectExists(target, 'INDEX', table, indexName))) {
      await target.$executeRawUnsafe(
        `CREATE INDEX \`${indexName}\` ON \`${table}\` (\`${column}\`)`,
      );
    }
  }

  const constraints: Array<[string, string, string]> = [
    ['documents', 'fk_documents_assigned_user', 'FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'],
    ['documents', 'fk_documents_created_by_user', 'FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'],
    ['document_routes', 'fk_document_routes_from_user', 'FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'],
    ['document_routes', 'fk_document_routes_to_user', 'FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'],
    ['employee_profiles', 'fk_employee_profiles_user', 'FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'],
  ];
  for (const [table, constraintName, definition] of constraints) {
    if (!(await schemaObjectExists(target, 'CONSTRAINT', table, constraintName))) {
      await target.$executeRawUnsafe(
        `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraintName}\` ${definition}`,
      );
    }
  }
}

export async function connectMySQLReplica() {
  const datasourceUrl = buildDatabaseUrl();
  status.configured = Boolean(datasourceUrl);
  if (!datasourceUrl) return;

  try {
    client = new PrismaClient({ datasourceUrl });
    await client.$connect();
    await ensureUserIdForeignKeys(client);
    status.connected = true;
    status.lastError = null;
    console.log('Connected to MySQL database.');
  } catch (error) {
    status.connected = false;
    status.lastError = errorMessage(error);
    console.error('MySQL connection failed:', status.lastError);
    await client?.$disconnect().catch(() => undefined);
    client = null;
  }
}

async function syncDatabase(
  targetClient: PrismaClient,
  targetStatus: MySQLReplicaStatus,
  entries: ReplicaEntry[],
  databaseLabel: string,
) {
  const state = new Map(entries);
  const divisions = asRecords(state.get('divisions'));
  const users = asRecords(state.get('users'));
  const documents = asRecords(state.get('documents'));
  const auditLogs = asRecords(state.get('audit_logs'));
  const envelopeLogs = asRecords(state.get('envelope_logs'));
  const employees = asRecords(state.get('employee_profiles'));
  const directorySections = asRecords(state.get('directory_sections'));
  const usedUsernames = new Set<string>();
  const replicaUsers = users.map((item) => {
    const sourceUsername = text(item.username);
    let username = sourceUsername;
    const normalized = username.toLowerCase();
    if (usedUsernames.has(normalized)) {
      const suffix = text(item.id)
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(-8);
      username = `${sourceUsername}_${suffix || usedUsernames.size + 1}`.slice(
        0,
        50,
      );
    }
    usedUsernames.add(username.toLowerCase());
    return { item, sourceUsername, username };
  });
  const routes = documents.flatMap((document) =>
    asRecords(document.routes as unknown[]).map(
      (route): DataRecord => ({
        ...route,
        documentId: text(route.documentId, text(document.id)),
      }),
    ),
  );
  const attachments = [...new Map(documents.flatMap((document) => [
    ...asRecords(document.attachments as unknown[]).map(
      (attachment): DataRecord => ({
        ...attachment,
        documentId: text(document.id),
      }),
    ),
    ...asRecords(document.routes as unknown[]).flatMap((route) =>
      asRecords(route.attachments as unknown[]).map((attachment): DataRecord => ({
        ...attachment,
        documentId: text(document.id),
        attachmentScope: text(attachment.attachmentScope, 'RECIPIENT'),
        uploadedByUserId: optionalText(attachment.uploadedByUserId) || optionalText(route.fromUserId),
        uploadedForRouteId: text(route.id),
      }))),
  ]).map(attachment => [text(attachment.id), attachment])).values()];

  try {
    await targetClient.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
        try {
          await tx.documentRoute.deleteMany();
          await tx.documentAttachment.deleteMany();
          await tx.document.deleteMany();
          await tx.auditLog.deleteMany();
          await tx.envelopeLog.deleteMany();
          await tx.user.deleteMany();
          await tx.division.deleteMany();
          await tx.employeeProfile.deleteMany();
          try {
            await tx.directorySection.deleteMany();
          } catch {}

          if (divisions.length) {
            await tx.division.createMany({
              data: divisions.map((item) => ({
                id: text(item.id),
                code: text(item.code),
                name: text(item.name),
                chiefName: text(item.chiefName),
                email: optionalText(item.email),
              })),
            });
          }
          if (replicaUsers.length) {
            await tx.user.createMany({
              data: replicaUsers.map(({ item, sourceUsername, username }) => ({
                id: text(item.id),
                username,
                sourceUsername,
                password: optionalText(item.password),
                temporaryPasswordExpiresAt: item.temporaryPasswordExpiresAt
                  ? date(item.temporaryPasswordExpiresAt)
                  : null,
                fullName: text(item.fullName),
                email: text(item.email),
                role: text(item.role),
                divisionCode: text(item.divisionCode),
                designation: optionalText(item.designation),
                contactNo: optionalText(item.contactNo),
                avatarUrl: optionalText(item.avatarUrl),
                permissions: item.permissions
                  ? JSON.parse(JSON.stringify(item.permissions))
                  : null,
                active: item.active !== false,
                createdAt: date(item.createdAt),
                folders: (item.folders || undefined) as
                  | Prisma.InputJsonValue
                  | undefined,
              })),
            });
          }
          if (documents.length) {
            await tx.document.createMany({
              data: documents.map((item) => ({
                id: text(item.id),
                trackingNumber: text(item.trackingNumber),
                direction: text(item.direction),
                title: text(item.title),
                subject: optionalText(item.subject),
                category: text(item.category),
                originatingOffice: text(item.originatingOffice),
                destinationOffice: text(item.destinationOffice),
                senderName: optionalText(item.senderName),
                senderPosition: optionalText(item.senderPosition),
                senderAddress: optionalText(item.senderAddress),
                recipientName: optionalText(item.recipientName),
                recipientPosition: optionalText(item.recipientPosition),
                recipientOffice: optionalText(item.recipientOffice),
                recipientAddress: optionalText(item.recipientAddress),
                routeNo: optionalText(item.routeNo) || text(item.trackingNumber),
                priority: text(item.priority, 'ROUTINE'),
                currentStatus: text(item.currentStatus, 'PENDING'),
                currentDivision: text(item.currentDivision),
                assignedUser: optionalText(item.assignedUser),
                assignedUserId: optionalText(item.assignedUserId),
                dateReceived: date(item.dateReceived),
                targetCompletionDate: item.targetCompletionDate
                  ? date(item.targetCompletionDate)
                  : null,
                completedDate: item.completedDate
                  ? date(item.completedDate)
                  : null,
                createdBy: text(item.createdBy),
                createdByUserId: optionalText(item.createdByUserId),
                createdAt: date(item.createdAt),
                updatedAt: date(item.updatedAt),
              })),
            });
          }
          if (routes.length) {
            await tx.documentRoute.createMany({
              data: routes.map((item) => ({
                id: text(item.id),
                documentId: text(item.documentId),
                stepNumber: Number(item.stepNumber) || 0,
                fromDivision: text(item.fromDivision),
                fromUserId: optionalText(item.fromUserId),
                fromUser: text(item.fromUser),
                toDivision: text(item.toDivision),
                toUser: optionalText(item.toUser),
                toUserId: optionalText(item.toUserId),
                actionRequested: text(item.actionRequested),
                remarks: optionalText(item.remarks),
                statusBefore: text(item.statusBefore),
                statusAfter: text(item.statusAfter),
                createdAt: date(item.createdAt),
              })),
            });
          }
          if (attachments.length) {
            await tx.documentAttachment.createMany({
              data: attachments.map((item) => ({
                id: text(item.id),
                documentId: text(item.documentId),
                fileName: text(item.fileName),
                fileSize: optionalText(item.fileSize),
                fileType: optionalText(item.fileType),
                uploadDate: date(item.uploadDate),
                fileData: optionalText(item.url),
                attachmentScope: optionalText(item.attachmentScope),
                uploadedByUserId: optionalText(item.uploadedByUserId),
                uploadedForRouteId: optionalText(item.uploadedForRouteId),
              })),
            });
          }
          if (auditLogs.length) {
            await tx.auditLog.createMany({
              data: auditLogs.map((item) => ({
                id: text(item.id),
                timestamp: date(item.timestamp),
                userId: text(item.userId),
                userName: text(item.userName),
                userRole: text(item.userRole),
                action: text(item.action),
                documentTrackingNumber: optionalText(
                  item.documentTrackingNumber,
                ),
                details: text(item.details),
                ipAddress: optionalText(item.ipAddress),
              })),
              skipDuplicates: true,
            });
          }
          if (envelopeLogs.length) {
            await tx.envelopeLog.createMany({
              data: envelopeLogs.map((item) => ({
                id: text(item.id),
                timestamp: date(item.timestamp),
                userId: text(item.userId),
                userName: text(item.userName),
                userRole: text(item.userRole),
                action: 'ENVELOPE_LOG',
                documentTrackingNumber: optionalText(
                  item.documentTrackingNumber,
                ),
                details: text(item.details),
                ipAddress: optionalText(item.ipAddress),
              })),
              skipDuplicates: true,
            });
          }
          if (employees.length) {
            await tx.employeeProfile.createMany({
              data: employees.map((item) => ({
                id: text(item.id),
                userId: optionalText(item.userId),
                fullName: text(item.fullName),
                position: text(item.position),
                office: text(item.office),
                officeType: text(item.officeType, 'BLGF'),
                divisionCode: optionalText(item.divisionCode),
                email: text(item.email),
                contactNo: optionalText(item.contactNo),
                address: optionalText(item.address),
                active: item.active !== false,
                folders: (item.folders || undefined) as
                  | Prisma.InputJsonValue
                  | undefined,
                createdAt: date(item.createdAt),
              })),
            });
          }
          if (directorySections.length) {
            try {
              await tx.directorySection.createMany({
                data: directorySections.map((item) => ({
                  id: text(item.id),
                  label: text(item.label),
                  officeTypes: (item.officeTypes || []) as Prisma.InputJsonValue,
                  color: optionalText(item.color),
                })),
              });
            } catch {}
          }
        } finally {
          await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
        }
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    await targetClient.$executeRawUnsafe(
      'DROP TABLE IF EXISTS app_state_replica',
    );
    targetStatus.recordCounts = {
      divisions: divisions.length,
      users: users.length,
      documents: documents.length,
      documentRoutes: routes.length,
      documentAttachments: attachments.length,
      auditLogs: auditLogs.length,
      envelopeLogs: envelopeLogs.length,
      employeeProfiles: employees.length,
      directorySections: directorySections.length,
    };
    targetStatus.lastSyncedAt = new Date().toISOString();
    targetStatus.lastError = null;
  } catch (error) {
    targetStatus.lastError = errorMessage(error);
    console.error(
      `${databaseLabel} synchronization failed:`,
      targetStatus.lastError,
    );
  }
}

export async function syncMySQLReplica(entries: ReplicaEntry[]) {
  if (client && status.connected) {
    await syncDatabase(client, status, entries, 'MySQL');
  }
}

export async function loadMySQLState(): Promise<ReplicaEntry[]> {
  if (!client || !status.connected) return [];
  const [
    divisions,
    users,
    documents,
    routes,
    attachments,
    auditLogs,
    envelopeLogs,
    employees,
    directorySections,
  ] = await Promise.all([
    client.division.findMany(),
    client.user.findMany(),
    client.document.findMany(),
    client.documentRoute.findMany(),
    client.documentAttachment.findMany(),
    client.auditLog.findMany({ orderBy: { timestamp: 'desc' } }),
    client.envelopeLog.findMany({ orderBy: { timestamp: 'desc' } }),
    client.employeeProfile.findMany(),
    client.directorySection.findMany().catch(() => []),
  ]);

  const routesByDocument = new Map<string, typeof routes>();
  for (const route of routes) {
    const list = routesByDocument.get(route.documentId) || [];
    list.push(route);
    routesByDocument.set(route.documentId, list);
  }
  const attachmentsByDocument = new Map<string, typeof attachments>();
  const attachmentsByRoute = new Map<string, typeof attachments>();
  for (const attachment of attachments) {
    const list = attachmentsByDocument.get(attachment.documentId) || [];
    list.push(attachment);
    attachmentsByDocument.set(attachment.documentId, list);
    if (attachment.uploadedForRouteId) {
      const routeFiles = attachmentsByRoute.get(attachment.uploadedForRouteId) || [];
      routeFiles.push(attachment);
      attachmentsByRoute.set(attachment.uploadedForRouteId, routeFiles);
    }
  }

  const serializedUsers = users.map(({ sourceUsername: _sourceUsername, ...user }) => ({
    ...user,
    username: user.username,
  }));
  const serializedDocuments = documents.map((document) => ({
    ...document,
    routeNo: (document as any).routeNo || document.trackingNumber,
    tags: [],
    routes: (routesByDocument.get(document.id) || []).map((route) => ({
      ...route,
      routeNo: (document as any).routeNo || document.trackingNumber,
      attachments: (attachmentsByRoute.get(route.id) || []).map(({ fileData, ...attachment }) => ({ ...attachment, url: fileData || '' })),
    })),
    attachments: (attachmentsByDocument.get(document.id) || []).map(
      ({ fileData, ...attachment }) => ({
        ...attachment,
        url: fileData || '',
      }),
    ),
  }));
  const serialize = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

  return [
    ['divisions', serialize(divisions)],
    ['users', serialize(serializedUsers)],
    ['documents', serialize(serializedDocuments)],
    ['audit_logs', serialize(auditLogs)],
    ['envelope_logs', serialize(envelopeLogs)],
    ['employee_profiles', serialize(employees)],
    ['directory_sections', serialize(directorySections)],
  ];
}

export async function loadLiveDocuments() {
  if (!client || !status.connected) return null;
  const [documents, routes, attachments] = await Promise.all([
    client.document.findMany({ orderBy: { createdAt: 'desc' } }),
    client.documentRoute.findMany({ orderBy: { createdAt: 'asc' } }),
    client.documentAttachment.findMany(),
  ]);
  const routesByDocument = new Map<string, typeof routes>();
  for (const route of routes) {
    const list = routesByDocument.get(route.documentId) || [];
    list.push(route);
    routesByDocument.set(route.documentId, list);
  }
  const attachmentsByDocument = new Map<string, typeof attachments>();
  const attachmentsByRoute = new Map<string, typeof attachments>();
  for (const attachment of attachments) {
    const list = attachmentsByDocument.get(attachment.documentId) || [];
    list.push(attachment);
    attachmentsByDocument.set(attachment.documentId, list);
    if (attachment.uploadedForRouteId) {
      const routeFiles = attachmentsByRoute.get(attachment.uploadedForRouteId) || [];
      routeFiles.push(attachment);
      attachmentsByRoute.set(attachment.uploadedForRouteId, routeFiles);
    }
  }
  return JSON.parse(
    JSON.stringify(
      documents.map((document) => {
        const docRoutes = (routesByDocument.get(document.id) || []).map((route) => ({
          ...route,
          routeNo: document.trackingNumber,
          attachments: (attachmentsByRoute.get(route.id) || []).map(({ fileData, ...attachment }) => ({ ...attachment, url: fileData || '' })),
        }));
        const completedRoute = [...docRoutes].reverse().find((r) => r.statusAfter === 'COMPLETED');
        const remarks = completedRoute?.remarks || '';
        const handoffMatch = remarks.match(/Handoff Instructions:\s*(.*)$/is);
        const finalInstructions = handoffMatch ? handoffMatch[1].trim() : (document as any).finalInstructions;

        return {
          ...document,
          finalInstructions,
          routeNo: document.trackingNumber,
          tags: [],
          routes: docRoutes,
          attachments: (attachmentsByDocument.get(document.id) || []).map(
            ({ fileData, ...attachment }) => ({
              ...attachment,
              url: fileData || '',
            }),
          ),
        };
      }),
    ),
  );
}

export function getMySQLReplicaStatus(): MySQLReplicaStatus {
  return { ...status, recordCounts: { ...status.recordCounts } };
}

export async function loadLiveUsers() {
  if (!client || !status.connected) return null;
  const users = await client.user.findMany({ orderBy: { createdAt: 'asc' } });
  return JSON.parse(
    JSON.stringify(
      users.map(({ sourceUsername: _sourceUsername, ...user }) => ({
        ...user,
        username: user.username,
      })),
    ),
  );
}

function userWriteData(item: DataRecord) {
  const sourceUsername = text(item.username).trim();
  return {
    username: sourceUsername,
    sourceUsername,
    password: optionalText(item.password),
    temporaryPasswordExpiresAt: item.temporaryPasswordExpiresAt
      ? date(item.temporaryPasswordExpiresAt)
      : null,
    fullName: text(item.fullName),
    email: text(item.email),
    role: text(item.role, 'STAFF'),
    divisionCode: text(item.divisionCode, 'AD'),
    designation: optionalText(item.designation),
    contactNo: optionalText(item.contactNo),
    avatarUrl: optionalText(item.avatarUrl),
    permissions: item.permissions
      ? JSON.parse(JSON.stringify(item.permissions))
      : null,
    active: item.active !== false,
    createdAt: date(item.createdAt, new Date()),
  };
}

async function writeUser(target: PrismaClient, user: DataRecord) {
  const id = text(user.id);
  const data = userWriteData(user);
  await target.user.upsert({
    where: { id },
    create: { id, ...data },
    update: data,
  });
}

export async function saveUserDirect(user: unknown) {
  if (!client || !status.connected) return;
  await writeUser(client, user as DataRecord);
}

export async function deleteUserDirect(userId: string) {
  if (!client || !status.connected) return;
  await client.user.deleteMany({ where: { id: userId } });
}

export async function getLiveDisplayNotifications(userId: string) {
  if (!client || !status.connected) return null;
  const rows = await client.$queryRawUnsafe<
    Array<{
      document_id: string;
      tracking_number: string;
      title: string;
      route_id: string;
      action_requested: string;
      from_user: string;
      remarks: string | null;
      created_at: Date;
    }>
  >(
    `SELECT d.id AS document_id, d.tracking_number, d.title,
            assigned.id AS route_id, assigned.action_requested, assigned.from_user,
            assigned.remarks, assigned.created_at
       FROM users u
       JOIN document_routes assigned ON (
         assigned.to_user_id = u.id
         OR (assigned.to_user_id IS NULL AND LOWER(TRIM(assigned.to_user)) = LOWER(TRIM(u.full_name)))
       )
       JOIN documents d ON d.id = assigned.document_id
      WHERE u.id = ? AND u.active = TRUE
        AND d.current_status <> 'COMPLETED'
        AND (
          (
            assigned.action_requested NOT IN ('APPROVED', 'DISAPPROVED')
            AND UPPER(COALESCE(assigned.remarks, '')) NOT LIKE '%APPROVED%'
          )
          OR assigned.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
        )
        AND assigned.created_at = (
          SELECT MAX(latest.created_at) FROM document_routes latest
           WHERE latest.document_id = assigned.document_id
             AND latest.to_user_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM document_routes acted
           WHERE acted.document_id = assigned.document_id
             AND (
               acted.from_user_id = u.id
               OR (acted.from_user_id IS NULL AND LOWER(TRIM(acted.from_user)) = LOWER(TRIM(u.full_name)))
             )
             AND acted.created_at > assigned.created_at
        )
        AND NOT EXISTS (
          SELECT 1 FROM audit_logs acted_log
           WHERE acted_log.document_tracking_number = d.tracking_number
             AND acted_log.user_id = u.id
             AND acted_log.timestamp > assigned.created_at
             AND acted_log.action IN ('ROUTE_DOC', 'TRANSFER_DOC', 'UPDATE_STATUS')
        )
      ORDER BY assigned.created_at DESC`,
    userId,
  );
  return rows.map((row) => {
    const decisionText = `${row.action_requested || ''} ${row.remarks || ''}`.toUpperCase();
    const decisionStatus = decisionText.includes('DISAPPROVED')
      ? 'DISAPPROVED' as const
      : decisionText.includes('APPROVED')
        ? 'APPROVED' as const
        : undefined;
    return ({
    id: `route-alert-${userId}-${row.route_id}`,
    userId,
    title: decisionStatus === 'APPROVED'
      ? `Approved by ${row.from_user}`
      : decisionStatus === 'DISAPPROVED'
        ? `Disapproved by ${row.from_user}`
        : 'Document Routed to You',
    message: decisionStatus === 'APPROVED'
      ? `Document ${row.tracking_number} was APPROVED by ${row.from_user} and will proceed to routing.`
      : decisionStatus === 'DISAPPROVED'
        ? `Document ${row.tracking_number} was DISAPPROVED by ${row.from_user}. Reason: ${row.remarks || 'No reason provided.'}`
        : `Document ${row.tracking_number} (${row.title}) requires your approval: ${row.action_requested || 'Appropriate Action'}.`,
    documentId: row.document_id,
    trackingNumber: row.tracking_number,
    type: 'ACTION_REQUIRED' as const,
    requiresDecision: false,
    decisionStatus,
    createdAt: row.created_at.toISOString(),
  });
  });
}

export async function updateUserPassword(
  userId: string,
  password: string,
  temporaryPasswordExpiresAt: Date | null = null,
) {
  if (!client || !status.connected) return;

  const primaryResult = await client.user.updateMany({
    where: { id: userId },
    data: { password, temporaryPasswordExpiresAt },
  });
  if (primaryResult.count !== 1) {
    throw new Error(
      'The administrator account was not found in the MySQL database.',
    );
  }

  status.lastSyncedAt = new Date().toISOString();
  status.lastError = null;
}

async function writeDocument(target: PrismaClient, item: DataRecord) {
  const documentData = {
    trackingNumber: text(item.trackingNumber),
    direction: text(item.direction),
    title: text(item.title),
    subject: optionalText(item.subject),
    category: text(item.category),
    originatingOffice: text(item.originatingOffice),
    destinationOffice: text(item.destinationOffice),
    senderName: optionalText(item.senderName),
    senderPosition: optionalText(item.senderPosition),
    recipientName: optionalText(item.recipientName),
    priority: text(item.priority, 'ROUTINE'),
    currentStatus: text(item.currentStatus, 'PENDING'),
    currentDivision: text(item.currentDivision),
    assignedUser: optionalText(item.assignedUser),
    assignedUserId: optionalText(item.assignedUserId),
    dateReceived: date(item.dateReceived),
    targetCompletionDate: item.targetCompletionDate
      ? date(item.targetCompletionDate)
      : null,
    completedDate: item.completedDate ? date(item.completedDate) : null,
    createdBy: text(item.createdBy),
    createdByUserId: optionalText(item.createdByUserId),
    createdAt: date(item.createdAt),
    updatedAt: date(item.updatedAt),
  };
  const documentId = text(item.id);
  const routes = asRecords(item.routes as unknown[]);
  const attachments = [...new Map([
    ...asRecords(item.attachments as unknown[]),
    ...routes.flatMap((route) => asRecords(route.attachments as unknown[]).map((attachment): DataRecord => ({
      ...attachment,
      attachmentScope: text(attachment.attachmentScope, 'RECIPIENT'),
      uploadedByUserId: optionalText(attachment.uploadedByUserId) || optionalText(route.fromUserId),
      uploadedForRouteId: text(route.id),
    }))),
  ].map(attachment => [text(attachment.id), attachment])).values()];
  await target.$transaction(
    async (tx) => {
      await tx.document.upsert({
        where: { id: documentId },
        create: { id: documentId, ...documentData },
        update: documentData,
      });
      await tx.documentRoute.deleteMany({ where: { documentId } });
      await tx.documentAttachment.deleteMany({ where: { documentId } });
      if (routes.length)
        await tx.documentRoute.createMany({
          data: routes.map((route) => ({
            id: text(route.id),
            documentId,
            stepNumber: Number(route.stepNumber) || 0,
            fromDivision: text(route.fromDivision),
            fromUserId: optionalText(route.fromUserId),
            fromUser: text(route.fromUser),
            toDivision: text(route.toDivision),
            toUser: optionalText(route.toUser),
            toUserId: optionalText(route.toUserId),
            actionRequested: text(route.actionRequested),
            remarks: optionalText(route.remarks),
            statusBefore: text(route.statusBefore),
            statusAfter: text(route.statusAfter),
            createdAt: date(route.createdAt),
          })),
        });
      if (attachments.length)
        await tx.documentAttachment.createMany({
          data: attachments.map((attachment) => ({
            id: text(attachment.id),
            documentId,
            fileName: text(attachment.fileName),
            fileSize: optionalText(attachment.fileSize),
            fileType: optionalText(attachment.fileType),
            uploadDate: date(attachment.uploadDate),
            fileData: optionalText(attachment.url),
            attachmentScope: optionalText(attachment.attachmentScope),
            uploadedByUserId: optionalText(attachment.uploadedByUserId),
            uploadedForRouteId: optionalText(attachment.uploadedForRouteId),
          })),
        });
    },
    { maxWait: 5_000, timeout: 15_000 },
  );
}

export async function saveDocumentDirect(document: unknown) {
  if (!client || !status.connected) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await writeDocument(client, document as DataRecord);
      return;
    } catch (err: any) {
      const isDeadlock = err?.code === 'P2034' || /deadlock|write conflict/i.test(err?.message || '');
      if (attempt === 2 || !isDeadlock) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
}

export async function deleteDocumentDirect(documentId: string) {
  if (!client || !status.connected) return;
  await client.$transaction(async (tx) => {
    await tx.documentRoute.deleteMany({ where: { documentId } });
    await tx.documentAttachment.deleteMany({ where: { documentId } });
    await tx.document.deleteMany({ where: { id: documentId } });
  });
}

export async function saveAuditLogDirect(log: unknown) {
  const item = log as DataRecord;
  const data = {
    id: text(item.id),
    timestamp: date(item.timestamp),
    userId: text(item.userId),
    userName: text(item.userName),
    userRole: text(item.userRole),
    action: text(item.action),
    documentTrackingNumber: optionalText(item.documentTrackingNumber),
    details: text(item.details),
    ipAddress: optionalText(item.ipAddress),
  };
  if (!client || !status.connected) return;
  await client.auditLog.upsert({
    where: { id: data.id },
    create: data,
    update: data,
  });
}

export async function saveEnvelopeLogDirect(log: unknown) {
  const item = log as DataRecord;
  const data = {
    id: text(item.id),
    timestamp: date(item.timestamp),
    userId: text(item.userId),
    userName: text(item.userName),
    userRole: text(item.userRole),
    action: 'ENVELOPE_LOG',
    documentTrackingNumber: optionalText(item.documentTrackingNumber),
    details: text(item.details),
    ipAddress: optionalText(item.ipAddress),
  };
  if (!client || !status.connected) return;
  await client.envelopeLog.upsert({
    where: { id: data.id },
    create: data,
    update: data,
  });
}

export async function deleteAuditLogsDirect() {
  if (!client || !status.connected) return 0;
  const result = await client.auditLog.deleteMany();
  return result.count;
}

export async function deleteEnvelopeLogsDirect() {
  if (!client || !status.connected) return 0;
  const result = await client.envelopeLog.deleteMany();
  return result.count;
}

export async function clearDataExceptUsers(includeDivisions = false) {
  const clear = async (
    target: PrismaClient,
    targetStatus: MySQLReplicaStatus,
  ) => {
    try {
      await target.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
        try {
          await tx.documentRoute.deleteMany();
          await tx.documentAttachment.deleteMany();
          await tx.document.deleteMany();
          await tx.auditLog.deleteMany();
          await tx.envelopeLog.deleteMany();
          if (includeDivisions) await tx.division.deleteMany();
        } finally {
          await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
        }
      });
    } catch (error) {
      targetStatus.lastError = errorMessage(error);
      console.error('Database clear failed:', targetStatus.lastError);
      throw error;
    }
  };

  if (client && status.connected) {
    await clear(client, status);
  }
}

export async function disconnectMySQLReplica() {
  await client?.$disconnect();
  client = null;
  status.connected = false;
}
