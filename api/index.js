// backend/server.ts
import express3 from "express";
import { randomUUID as randomUUID4 } from "node:crypto";
import path from "path";
import fs from "fs";
import os from "os";

// backend/users.ts
import express from "express";
import { randomUUID as randomUUID2 } from "node:crypto";

// backend/serverUtils.ts
import { randomUUID } from "node:crypto";
function addAuditLog(auditLogsState2, log, queueSync = true) {
  const newLog = {
    id: `log-${randomUUID()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...log
  };
  auditLogsState2.unshift(newLog);
  saveDatabaseToFile(queueSync);
  return newLog;
}
function createNotification(notif) {
  return {
    id: `notif-${randomUUID()}`,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...notif
  };
}
function saveDatabaseToFile2(queueSync = true) {
  saveDatabaseToFile(queueSync);
}

// backend/mysqlReplica.ts
import { PrismaClient } from "@prisma/client";
var client = null;
var status = {
  configured: false,
  connected: false,
  lastSyncedAt: null,
  lastError: null,
  recordCounts: {}
};
function buildDatabaseUrl() {
  const explicitUrl = process.env.MYSQL_DATABASE_URL?.trim();
  if (explicitUrl) return explicitUrl;
  const host = process.env.MYSQL_HOST?.trim();
  const user = process.env.MYSQL_USER?.trim();
  const password = process.env.MYSQL_PASSWORD ?? "";
  const database = process.env.MYSQL_DATABASE?.trim();
  if (!host || !user || !password || !database) return "";
  const url = new URL("mysql://localhost");
  url.hostname = host;
  url.port = process.env.MYSQL_PORT?.trim() || "3306";
  url.username = user;
  url.password = password;
  url.pathname = `/${database}`;
  if (process.env.MYSQL_SSL?.trim().toLowerCase() === "true") {
    url.searchParams.set("sslaccept", "strict");
  }
  url.searchParams.set("connection_limit", "3");
  url.searchParams.set("connect_timeout", "10");
  return url.toString();
}
var asRecords = (value) => (value || []).filter(
  (item) => Boolean(item) && typeof item === "object"
);
var text = (value, fallback = "") => value == null ? fallback : String(value);
var optionalText = (value) => value == null || value === "" ? null : String(value);
var date = (value, fallback = /* @__PURE__ */ new Date(0)) => {
  const parsed = new Date(text(value));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
async function schemaObjectExists(target, objectType, tableName, objectName) {
  const lookup = objectType === "COLUMN" ? ["information_schema.COLUMNS", "COLUMN_NAME"] : objectType === "INDEX" ? ["information_schema.STATISTICS", "INDEX_NAME"] : ["information_schema.TABLE_CONSTRAINTS", "CONSTRAINT_NAME"];
  const rows = await target.$queryRawUnsafe(
    `SELECT COUNT(*) AS object_count FROM ${lookup[0]}
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND ${lookup[1]} = ?`,
    tableName,
    objectName
  );
  return Number(rows[0]?.object_count || 0) > 0;
}
async function ensureUserIdForeignKeys(target) {
  const columns = [
    ["documents", "assigned_user_id", "VARCHAR(64) NULL AFTER `assigned_user`"],
    ["documents", "created_by_user_id", "VARCHAR(64) NULL AFTER `created_by`"],
    ["documents", "sender_position", "VARCHAR(150) NULL AFTER `sender_name`"],
    ["documents", "sender_address", "TEXT NULL AFTER `sender_position`"],
    ["documents", "recipient_position", "VARCHAR(150) NULL AFTER `recipient_name`"],
    ["documents", "recipient_office", "VARCHAR(255) NULL AFTER `recipient_position`"],
    ["documents", "recipient_address", "TEXT NULL AFTER `recipient_office`"],
    ["documents", "route_no", "VARCHAR(100) NULL AFTER `tracking_number`"],
    ["document_attachments", "attachment_scope", "VARCHAR(20) NULL AFTER `file_data`"],
    ["document_attachments", "uploaded_by_user_id", "VARCHAR(64) NULL AFTER `attachment_scope`"],
    ["document_attachments", "uploaded_for_route_id", "VARCHAR(64) NULL AFTER `uploaded_by_user_id`"],
    ["document_routes", "from_user_id", "VARCHAR(64) NULL AFTER `from_division`"],
    ["employee_profiles", "user_id", "VARCHAR(64) NULL AFTER `id`"],
    ["employee_profiles", "folders", "JSON NULL"]
  ];
  for (const [table, column, definition] of columns) {
    if (!await schemaObjectExists(target, "COLUMN", table, column)) {
      await target.$executeRawUnsafe(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
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
      "ALTER TABLE `employee_profiles` MODIFY COLUMN `office_type` VARCHAR(50) NOT NULL DEFAULT 'BLGF'"
    );
  } catch {
  }
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
  if (!await schemaObjectExists(target, "INDEX", "employee_profiles", "uq_employee_profiles_user_id")) {
    await target.$executeRawUnsafe(
      "CREATE UNIQUE INDEX `uq_employee_profiles_user_id` ON `employee_profiles` (`user_id`)"
    );
  }
  const indexes = [
    ["documents", "idx_documents_assigned_user_id", "assigned_user_id"],
    ["documents", "idx_documents_created_by_user_id", "created_by_user_id"],
    ["document_routes", "idx_document_routes_from_user_id", "from_user_id"],
    ["document_routes", "idx_document_routes_to_user_id", "to_user_id"]
  ];
  for (const [table, indexName, column] of indexes) {
    if (!await schemaObjectExists(target, "INDEX", table, indexName)) {
      await target.$executeRawUnsafe(
        `CREATE INDEX \`${indexName}\` ON \`${table}\` (\`${column}\`)`
      );
    }
  }
  const constraints = [
    ["documents", "fk_documents_assigned_user", "FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE"],
    ["documents", "fk_documents_created_by_user", "FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE"],
    ["document_routes", "fk_document_routes_from_user", "FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE"],
    ["document_routes", "fk_document_routes_to_user", "FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE"],
    ["employee_profiles", "fk_employee_profiles_user", "FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE"]
  ];
  for (const [table, constraintName, definition] of constraints) {
    if (!await schemaObjectExists(target, "CONSTRAINT", table, constraintName)) {
      await target.$executeRawUnsafe(
        `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraintName}\` ${definition}`
      );
    }
  }
}
async function connectMySQLReplica() {
  const datasourceUrl = buildDatabaseUrl();
  status.configured = Boolean(datasourceUrl);
  if (!datasourceUrl) return;
  try {
    client = new PrismaClient({ datasourceUrl });
    await client.$connect();
    await ensureUserIdForeignKeys(client);
    status.connected = true;
    status.lastError = null;
    console.log("Connected to MySQL database.");
  } catch (error) {
    status.connected = false;
    status.lastError = errorMessage(error);
    console.error("MySQL connection failed:", status.lastError);
    await client?.$disconnect().catch(() => void 0);
    client = null;
  }
}
async function syncDatabase(targetClient, targetStatus, entries, databaseLabel) {
  const state = new Map(entries);
  const divisions = asRecords(state.get("divisions"));
  const users = asRecords(state.get("users"));
  const documents = asRecords(state.get("documents"));
  const auditLogs = asRecords(state.get("audit_logs"));
  const envelopeLogs = asRecords(state.get("envelope_logs"));
  const employees = asRecords(state.get("employee_profiles"));
  const directorySections = asRecords(state.get("directory_sections"));
  const usedUsernames = /* @__PURE__ */ new Set();
  const replicaUsers = users.map((item) => {
    const sourceUsername = text(item.username);
    let username = sourceUsername;
    const normalized = username.toLowerCase();
    if (usedUsernames.has(normalized)) {
      const suffix = text(item.id).replace(/[^A-Za-z0-9]/g, "").slice(-8);
      username = `${sourceUsername}_${suffix || usedUsernames.size + 1}`.slice(
        0,
        50
      );
    }
    usedUsernames.add(username.toLowerCase());
    return { item, sourceUsername, username };
  });
  const routes = documents.flatMap(
    (document) => asRecords(document.routes).map(
      (route) => ({
        ...route,
        documentId: text(route.documentId, text(document.id))
      })
    )
  );
  const attachments = [...new Map(documents.flatMap((document) => [
    ...asRecords(document.attachments).map(
      (attachment) => ({
        ...attachment,
        documentId: text(document.id)
      })
    ),
    ...asRecords(document.routes).flatMap((route) => asRecords(route.attachments).map((attachment) => ({
      ...attachment,
      documentId: text(document.id),
      attachmentScope: text(attachment.attachmentScope, "RECIPIENT"),
      uploadedByUserId: optionalText(attachment.uploadedByUserId) || optionalText(route.fromUserId),
      uploadedForRouteId: text(route.id)
    })))
  ]).map((attachment) => [text(attachment.id), attachment])).values()];
  try {
    await targetClient.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
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
          } catch {
          }
          if (divisions.length) {
            await tx.division.createMany({
              data: divisions.map((item) => ({
                id: text(item.id),
                code: text(item.code),
                name: text(item.name),
                chiefName: text(item.chiefName),
                email: optionalText(item.email)
              }))
            });
          }
          if (replicaUsers.length) {
            await tx.user.createMany({
              data: replicaUsers.map(({ item, sourceUsername, username }) => ({
                id: text(item.id),
                username,
                sourceUsername,
                password: optionalText(item.password),
                temporaryPasswordExpiresAt: item.temporaryPasswordExpiresAt ? date(item.temporaryPasswordExpiresAt) : null,
                fullName: text(item.fullName),
                email: text(item.email),
                role: text(item.role),
                divisionCode: text(item.divisionCode),
                designation: optionalText(item.designation),
                contactNo: optionalText(item.contactNo),
                avatarUrl: optionalText(item.avatarUrl),
                permissions: item.permissions ? JSON.parse(JSON.stringify(item.permissions)) : null,
                active: item.active !== false,
                createdAt: date(item.createdAt),
                folders: item.folders || void 0
              }))
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
                priority: text(item.priority, "ROUTINE"),
                currentStatus: text(item.currentStatus, "PENDING"),
                currentDivision: text(item.currentDivision),
                assignedUser: optionalText(item.assignedUser),
                assignedUserId: optionalText(item.assignedUserId),
                dateReceived: date(item.dateReceived),
                targetCompletionDate: item.targetCompletionDate ? date(item.targetCompletionDate) : null,
                completedDate: item.completedDate ? date(item.completedDate) : null,
                createdBy: text(item.createdBy),
                createdByUserId: optionalText(item.createdByUserId),
                createdAt: date(item.createdAt),
                updatedAt: date(item.updatedAt)
              }))
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
                createdAt: date(item.createdAt)
              }))
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
                uploadedForRouteId: optionalText(item.uploadedForRouteId)
              }))
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
                  item.documentTrackingNumber
                ),
                details: text(item.details),
                ipAddress: optionalText(item.ipAddress)
              })),
              skipDuplicates: true
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
                action: "ENVELOPE_LOG",
                documentTrackingNumber: optionalText(
                  item.documentTrackingNumber
                ),
                details: text(item.details),
                ipAddress: optionalText(item.ipAddress)
              })),
              skipDuplicates: true
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
                officeType: text(item.officeType, "BLGF"),
                divisionCode: optionalText(item.divisionCode),
                email: text(item.email),
                contactNo: optionalText(item.contactNo),
                address: optionalText(item.address),
                active: item.active !== false,
                folders: item.folders || void 0,
                createdAt: date(item.createdAt)
              }))
            });
          }
          if (directorySections.length) {
            try {
              await tx.directorySection.createMany({
                data: directorySections.map((item) => ({
                  id: text(item.id),
                  label: text(item.label),
                  officeTypes: item.officeTypes || [],
                  color: optionalText(item.color)
                }))
              });
            } catch {
            }
          }
        } finally {
          await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
        }
      },
      { maxWait: 1e4, timeout: 3e4 }
    );
    await targetClient.$executeRawUnsafe(
      "DROP TABLE IF EXISTS app_state_replica"
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
      directorySections: directorySections.length
    };
    targetStatus.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString();
    targetStatus.lastError = null;
  } catch (error) {
    targetStatus.lastError = errorMessage(error);
    console.error(
      `${databaseLabel} synchronization failed:`,
      targetStatus.lastError
    );
  }
}
async function syncMySQLReplica(entries) {
  if (client && status.connected) {
    await syncDatabase(client, status, entries, "MySQL");
  }
}
async function loadMySQLState() {
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
    directorySections
  ] = await Promise.all([
    client.division.findMany(),
    client.user.findMany(),
    client.document.findMany(),
    client.documentRoute.findMany(),
    client.documentAttachment.findMany(),
    client.auditLog.findMany({ orderBy: { timestamp: "desc" } }),
    client.envelopeLog.findMany({ orderBy: { timestamp: "desc" } }),
    client.employeeProfile.findMany(),
    client.directorySection.findMany().catch(() => [])
  ]);
  const routesByDocument = /* @__PURE__ */ new Map();
  for (const route of routes) {
    const list = routesByDocument.get(route.documentId) || [];
    list.push(route);
    routesByDocument.set(route.documentId, list);
  }
  const attachmentsByDocument = /* @__PURE__ */ new Map();
  const attachmentsByRoute = /* @__PURE__ */ new Map();
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
    username: user.username
  }));
  const serializedDocuments = documents.map((document) => ({
    ...document,
    routeNo: document.routeNo || document.trackingNumber,
    tags: [],
    routes: (routesByDocument.get(document.id) || []).map((route) => ({
      ...route,
      routeNo: document.routeNo || document.trackingNumber,
      attachments: (attachmentsByRoute.get(route.id) || []).map(({ fileData, ...attachment }) => ({ ...attachment, url: fileData || "" }))
    })),
    attachments: (attachmentsByDocument.get(document.id) || []).map(
      ({ fileData, ...attachment }) => ({
        ...attachment,
        url: fileData || ""
      })
    )
  }));
  const serialize = (value) => JSON.parse(JSON.stringify(value));
  return [
    ["divisions", serialize(divisions)],
    ["users", serialize(serializedUsers)],
    ["documents", serialize(serializedDocuments)],
    ["audit_logs", serialize(auditLogs)],
    ["envelope_logs", serialize(envelopeLogs)],
    ["employee_profiles", serialize(employees)],
    ["directory_sections", serialize(directorySections)]
  ];
}
async function loadLiveDocuments() {
  if (!client || !status.connected) return null;
  const [documents, routes, attachments] = await Promise.all([
    client.document.findMany({ orderBy: { createdAt: "desc" } }),
    client.documentRoute.findMany({ orderBy: { createdAt: "asc" } }),
    client.documentAttachment.findMany()
  ]);
  const routesByDocument = /* @__PURE__ */ new Map();
  for (const route of routes) {
    const list = routesByDocument.get(route.documentId) || [];
    list.push(route);
    routesByDocument.set(route.documentId, list);
  }
  const attachmentsByDocument = /* @__PURE__ */ new Map();
  const attachmentsByRoute = /* @__PURE__ */ new Map();
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
          attachments: (attachmentsByRoute.get(route.id) || []).map(({ fileData, ...attachment }) => ({ ...attachment, url: fileData || "" }))
        }));
        const completedRoute = [...docRoutes].reverse().find((r) => r.statusAfter === "COMPLETED");
        const remarks = completedRoute?.remarks || "";
        const handoffMatch = remarks.match(/Handoff Instructions:\s*(.*)$/is);
        const finalInstructions = handoffMatch ? handoffMatch[1].trim() : document.finalInstructions;
        return {
          ...document,
          finalInstructions,
          routeNo: document.trackingNumber,
          tags: [],
          routes: docRoutes,
          attachments: (attachmentsByDocument.get(document.id) || []).map(
            ({ fileData, ...attachment }) => ({
              ...attachment,
              url: fileData || ""
            })
          )
        };
      })
    )
  );
}
function getMySQLReplicaStatus() {
  return { ...status, recordCounts: { ...status.recordCounts } };
}
async function loadLiveUsers() {
  if (!client || !status.connected) return null;
  const users = await client.user.findMany({ orderBy: { createdAt: "asc" } });
  return JSON.parse(
    JSON.stringify(
      users.map(({ sourceUsername: _sourceUsername, ...user }) => ({
        ...user,
        username: user.username
      }))
    )
  );
}
function userWriteData(item) {
  const sourceUsername = text(item.username).trim();
  return {
    username: sourceUsername,
    sourceUsername,
    password: optionalText(item.password),
    temporaryPasswordExpiresAt: item.temporaryPasswordExpiresAt ? date(item.temporaryPasswordExpiresAt) : null,
    fullName: text(item.fullName),
    email: text(item.email),
    role: text(item.role, "STAFF"),
    divisionCode: text(item.divisionCode, "AD"),
    designation: optionalText(item.designation),
    contactNo: optionalText(item.contactNo),
    avatarUrl: optionalText(item.avatarUrl),
    permissions: item.permissions ? JSON.parse(JSON.stringify(item.permissions)) : null,
    active: item.active !== false,
    createdAt: date(item.createdAt, /* @__PURE__ */ new Date())
  };
}
async function writeUser(target, user) {
  const id = text(user.id);
  const data = userWriteData(user);
  await target.user.upsert({
    where: { id },
    create: { id, ...data },
    update: data
  });
}
async function saveUserDirect(user) {
  if (!client || !status.connected) return;
  await writeUser(client, user);
}
async function deleteUserDirect(userId) {
  if (!client || !status.connected) return;
  await client.user.deleteMany({ where: { id: userId } });
}
async function getLiveDisplayNotifications(userId) {
  if (!client || !status.connected) return null;
  const rows = await client.$queryRawUnsafe(
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
    userId
  );
  return rows.map((row) => {
    const decisionText = `${row.action_requested || ""} ${row.remarks || ""}`.toUpperCase();
    const decisionStatus = decisionText.includes("DISAPPROVED") ? "DISAPPROVED" : decisionText.includes("APPROVED") ? "APPROVED" : void 0;
    return {
      id: `route-alert-${userId}-${row.route_id}`,
      userId,
      title: decisionStatus === "APPROVED" ? `Approved by ${row.from_user}` : decisionStatus === "DISAPPROVED" ? `Disapproved by ${row.from_user}` : "Document Routed to You",
      message: decisionStatus === "APPROVED" ? `Document ${row.tracking_number} was APPROVED by ${row.from_user} and will proceed to routing.` : decisionStatus === "DISAPPROVED" ? `Document ${row.tracking_number} was DISAPPROVED by ${row.from_user}. Reason: ${row.remarks || "No reason provided."}` : `Document ${row.tracking_number} (${row.title}) requires your approval: ${row.action_requested || "Appropriate Action"}.`,
      documentId: row.document_id,
      trackingNumber: row.tracking_number,
      type: "ACTION_REQUIRED",
      requiresDecision: false,
      decisionStatus,
      createdAt: row.created_at.toISOString()
    };
  });
}
async function updateUserPassword(userId, password, temporaryPasswordExpiresAt = null) {
  if (!client || !status.connected) return;
  const primaryResult = await client.user.updateMany({
    where: { id: userId },
    data: { password, temporaryPasswordExpiresAt }
  });
  if (primaryResult.count !== 1) {
    throw new Error(
      "The administrator account was not found in the MySQL database."
    );
  }
  status.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString();
  status.lastError = null;
}
async function writeDocument(target, item) {
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
    priority: text(item.priority, "ROUTINE"),
    currentStatus: text(item.currentStatus, "PENDING"),
    currentDivision: text(item.currentDivision),
    assignedUser: optionalText(item.assignedUser),
    assignedUserId: optionalText(item.assignedUserId),
    dateReceived: date(item.dateReceived),
    targetCompletionDate: item.targetCompletionDate ? date(item.targetCompletionDate) : null,
    completedDate: item.completedDate ? date(item.completedDate) : null,
    createdBy: text(item.createdBy),
    createdByUserId: optionalText(item.createdByUserId),
    createdAt: date(item.createdAt),
    updatedAt: date(item.updatedAt)
  };
  const documentId = text(item.id);
  const routes = asRecords(item.routes);
  const attachments = [...new Map([
    ...asRecords(item.attachments),
    ...routes.flatMap((route) => asRecords(route.attachments).map((attachment) => ({
      ...attachment,
      attachmentScope: text(attachment.attachmentScope, "RECIPIENT"),
      uploadedByUserId: optionalText(attachment.uploadedByUserId) || optionalText(route.fromUserId),
      uploadedForRouteId: text(route.id)
    })))
  ].map((attachment) => [text(attachment.id), attachment])).values()];
  await target.$transaction(
    async (tx) => {
      await tx.document.upsert({
        where: { id: documentId },
        create: { id: documentId, ...documentData },
        update: documentData
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
            createdAt: date(route.createdAt)
          }))
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
            uploadedForRouteId: optionalText(attachment.uploadedForRouteId)
          }))
        });
    },
    { maxWait: 5e3, timeout: 15e3 }
  );
}
async function saveDocumentDirect(document) {
  if (!client || !status.connected) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await writeDocument(client, document);
      return;
    } catch (err) {
      const isDeadlock = err?.code === "P2034" || /deadlock|write conflict/i.test(err?.message || "");
      if (attempt === 2 || !isDeadlock) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
}
async function deleteDocumentDirect(documentId) {
  if (!client || !status.connected) return;
  await client.$transaction(async (tx) => {
    await tx.documentRoute.deleteMany({ where: { documentId } });
    await tx.documentAttachment.deleteMany({ where: { documentId } });
    await tx.document.deleteMany({ where: { id: documentId } });
  });
}
async function saveAuditLogDirect(log) {
  const item = log;
  const data = {
    id: text(item.id),
    timestamp: date(item.timestamp),
    userId: text(item.userId),
    userName: text(item.userName),
    userRole: text(item.userRole),
    action: text(item.action),
    documentTrackingNumber: optionalText(item.documentTrackingNumber),
    details: text(item.details),
    ipAddress: optionalText(item.ipAddress)
  };
  if (!client || !status.connected) return;
  await client.auditLog.upsert({
    where: { id: data.id },
    create: data,
    update: data
  });
}
async function saveEnvelopeLogDirect(log) {
  const item = log;
  const data = {
    id: text(item.id),
    timestamp: date(item.timestamp),
    userId: text(item.userId),
    userName: text(item.userName),
    userRole: text(item.userRole),
    action: "ENVELOPE_LOG",
    documentTrackingNumber: optionalText(item.documentTrackingNumber),
    details: text(item.details),
    ipAddress: optionalText(item.ipAddress)
  };
  if (!client || !status.connected) return;
  await client.envelopeLog.upsert({
    where: { id: data.id },
    create: data,
    update: data
  });
}
async function deleteAuditLogsDirect() {
  if (!client || !status.connected) return 0;
  const result = await client.auditLog.deleteMany();
  return result.count;
}
async function deleteEnvelopeLogsDirect() {
  if (!client || !status.connected) return 0;
  const result = await client.envelopeLog.deleteMany();
  return result.count;
}
async function disconnectMySQLReplica() {
  await client?.$disconnect();
  client = null;
  status.connected = false;
}

// frontend/src/app/types.ts
var DEFAULT_ROLE_PERMISSIONS = {
  SYSTEM_ADMIN: {
    mainMenu: true,
    management: true,
    canDelete: true,
    canViewAllDocuments: true,
    canViewAllRoutes: true,
    allowedActions: [
      "EMPLOYEE_CREATE",
      "EMPLOYEE_EDIT",
      "EMPLOYEE_DELETE",
      "EMPLOYEE_FOLDER_MANAGE",
      "WORKFLOW_OPTION_MANAGE",
      "ROUTING_MONITOR_VIEW",
      "ROUTING_REMINDER_SEND",
      "NOTIFICATION_VIEW_ALL"
    ],
    allowedViews: [
      "dashboard",
      "division-workload",
      "incoming",
      "outgoing",
      "incoming-report",
      "outgoing-report",
      "envelope-report",
      "envelope",
      "envelope-logs",
      "audit",
      "users",
      "settings",
      "qr",
      "employees"
    ]
  },
  ADMIN: {
    mainMenu: true,
    management: false,
    canDelete: false,
    canViewAllDocuments: false,
    canViewAllRoutes: false,
    allowedActions: [],
    allowedViews: [
      "dashboard",
      "division-workload",
      "incoming",
      "outgoing",
      "incoming-report",
      "outgoing-report",
      "envelope",
      "settings",
      "qr"
    ]
  },
  ORD: {
    mainMenu: true,
    management: true,
    canDelete: false,
    canViewAllDocuments: true,
    canViewAllRoutes: true,
    allowedActions: [
      "EMPLOYEE_CREATE",
      "EMPLOYEE_EDIT",
      "EMPLOYEE_FOLDER_MANAGE",
      "ROUTING_MONITOR_VIEW",
      "ROUTING_REMINDER_SEND"
    ],
    allowedViews: [
      "dashboard",
      "division-workload",
      "incoming",
      "outgoing",
      "incoming-report",
      "outgoing-report",
      "envelope-report",
      "envelope",
      "envelope-logs",
      "audit",
      "settings",
      "qr",
      "employees"
    ]
  },
  RECORDS_OFFICER: {
    mainMenu: true,
    management: true,
    canDelete: false,
    canViewAllDocuments: false,
    canViewAllRoutes: false,
    allowedActions: [
      "ROUTING_MONITOR_VIEW",
      "ROUTING_REMINDER_SEND",
      "NOTIFICATION_VIEW_ALL"
    ],
    allowedViews: [
      "dashboard",
      "division-workload",
      "incoming",
      "outgoing",
      "incoming-report",
      "outgoing-report",
      "envelope-report",
      "envelope",
      "envelope-logs",
      "audit",
      "settings",
      "qr",
      "employees"
    ]
  },
  DIVISION_CHIEF: {
    mainMenu: true,
    management: true,
    canDelete: false,
    canViewAllDocuments: false,
    canViewAllRoutes: false,
    allowedActions: ["ROUTING_MONITOR_VIEW", "ROUTING_REMINDER_SEND"],
    allowedViews: [
      "dashboard",
      "division-workload",
      "incoming",
      "outgoing",
      "incoming-report",
      "outgoing-report",
      "envelope-report",
      "envelope",
      "envelope-logs",
      "audit",
      "settings",
      "qr",
      "employees"
    ]
  },
  ACTION_OFFICER: {
    mainMenu: true,
    management: false,
    canDelete: false,
    canViewAllDocuments: false,
    canViewAllRoutes: false,
    allowedActions: [],
    allowedViews: [
      "dashboard",
      "division-workload",
      "incoming",
      "outgoing",
      "incoming-report",
      "outgoing-report",
      "envelope-report",
      "envelope",
      "envelope-logs",
      "settings",
      "qr",
      "employees"
    ]
  },
  STAFF: {
    mainMenu: true,
    management: false,
    canDelete: false,
    canViewAllDocuments: false,
    canViewAllRoutes: false,
    allowedActions: [],
    allowedViews: [
      "dashboard",
      "division-workload",
      "incoming",
      "outgoing",
      "incoming-report",
      "outgoing-report",
      "settings",
      "qr"
    ]
  }
};

// backend/users.ts
var MAX_SYSTEM_ADMINISTRATORS = 3;
var withoutCredentials = (user) => {
  const { password: _password, temporaryPasswordExpiresAt: _expires, ...safe } = user;
  return safe;
};
function createUsersRouter(getUsersState, setUsersState, getAuditLogsState, syncEmployeeProfile) {
  const router = express.Router();
  const getActingUser = (req) => getUsersState().find(
    (user) => user.id === String(req.get("X-User-Id") || "") && user.active
  );
  router.get("/", async (req, res) => {
    try {
      const liveUsers = await loadLiveUsers();
      if (liveUsers) {
        const databaseUsers = liveUsers;
        setUsersState(databaseUsers);
        databaseUsers.forEach(syncEmployeeProfile);
      }
      const actingUser = getActingUser(req);
      if (!actingUser) return res.json([]);
      const visibleUsers = actingUser.role === "SYSTEM_ADMIN" ? getUsersState() : getUsersState().filter((user) => user.active);
      res.json(visibleUsers.map(withoutCredentials));
    } catch (error) {
      console.error("[GET /api/users] Live MySQL read failed:", error);
      const actingUser = getActingUser(req);
      if (!actingUser) return res.json([]);
      const visibleUsers = actingUser.role === "SYSTEM_ADMIN" ? getUsersState() : getUsersState().filter((user) => user.active);
      res.json(visibleUsers.map(withoutCredentials));
    }
  });
  router.post("/", async (req, res) => {
    const body = req.body;
    const usersState2 = getUsersState();
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    if (actingUser.role !== "SYSTEM_ADMIN") {
      return res.status(403).json({ error: "System Administrator access required." });
    }
    if (body.role === "SYSTEM_ADMIN" && usersState2.filter((user) => user.role === "SYSTEM_ADMIN").length >= MAX_SYSTEM_ADMINISTRATORS) {
      return res.status(403).json({
        error: "A maximum of three System Administrator accounts is allowed."
      });
    }
    const username = String(body.username || "").trim();
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    if (usersState2.some(
      (user) => user.username.trim().toLowerCase() === username.toLowerCase()
    )) {
      return res.status(409).json({ error: "Username already exists" });
    }
    const newUser = {
      id: `usr-${randomUUID2()}`,
      username,
      password: body.password,
      fullName: body.fullName,
      email: body.email,
      role: body.role || "STAFF",
      divisionCode: body.role === "ADMIN" ? "AD" : body.role === "SYSTEM_ADMIN" ? "ITMS" : body.divisionCode || "AD",
      designation: body.designation || "Staff Member",
      contactNo: body.contactNo || "",
      avatarUrl: body.avatarUrl,
      permissions: body.permissions || structuredClone(
        DEFAULT_ROLE_PERMISSIONS[body.role || "STAFF"] || DEFAULT_ROLE_PERMISSIONS.STAFF
      ),
      active: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    setUsersState([...usersState2, newUser]);
    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: "CREATE_USER",
      details: `Created new user account: ${newUser.fullName} (${newUser.username}) - Role: ${newUser.role}`,
      ipAddress: req.ip || "127.0.0.1"
    });
    try {
      await Promise.all([
        saveUserDirect(newUser),
        saveAuditLogDirect(auditLog)
      ]);
    } catch (error) {
      setUsersState(usersState2.filter((user) => user.id !== newUser.id));
      const message = error instanceof Error ? error.message : String(error);
      return res.status(message.includes("Unique constraint") ? 409 : 500).json({
        error: message.includes("Unique constraint") ? "Username already exists" : "Failed to save the user account."
      });
    }
    syncEmployeeProfile(newUser);
    res.status(201).json(withoutCredentials(newUser));
  });
  router.put("/:id", async (req, res) => {
    const usersState2 = getUsersState();
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    const uIdx = usersState2.findIndex((u) => u.id === req.params.id);
    if (uIdx === -1) {
      return res.status(404).json({ error: "User not found" });
    }
    const isSelfUpdate = actingUser.id === req.params.id;
    if (!isSelfUpdate && actingUser.role !== "SYSTEM_ADMIN") {
      return res.status(403).json({ error: "System Administrator access required." });
    }
    const isSystemAdministrator = usersState2[uIdx].role === "SYSTEM_ADMIN";
    const requestedCurrentPassword = String(req.body.currentPassword || "");
    const updates = { ...req.body };
    delete updates.currentPassword;
    if ("password" in updates) {
      const nextPassword = String(updates.password || "").trim();
      if (nextPassword) {
        updates.password = nextPassword;
      } else {
        delete updates.password;
      }
    }
    if (isSelfUpdate && actingUser.role !== "SYSTEM_ADMIN") {
      delete updates.role;
      delete updates.divisionCode;
      delete updates.permissions;
      delete updates.active;
    }
    if (isSystemAdministrator && req.body.role && req.body.role !== "SYSTEM_ADMIN") {
      return res.status(403).json({
        error: "System Administrator roles cannot be reassigned."
      });
    }
    if (!isSystemAdministrator && req.body.role === "SYSTEM_ADMIN" && usersState2[uIdx].role !== "SYSTEM_ADMIN" && usersState2.filter((user) => user.role === "SYSTEM_ADMIN").length >= MAX_SYSTEM_ADMINISTRATORS) {
      return res.status(403).json({
        error: "A maximum of three System Administrator accounts is allowed."
      });
    }
    const username = String(
      updates.username ?? usersState2[uIdx].username
    ).trim();
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    const usernameChanged = username.toLowerCase() !== usersState2[uIdx].username.trim().toLowerCase();
    if (usernameChanged && usersState2.some(
      (user, index) => index !== uIdx && user.username.trim().toLowerCase() === username.toLowerCase()
    )) {
      return res.status(409).json({ error: "Username already exists" });
    }
    if (updates.password) {
      const administratorResettingAnotherUser = actingUser.role === "SYSTEM_ADMIN" && !isSelfUpdate;
      if (!administratorResettingAnotherUser && !requestedCurrentPassword) {
        return res.status(400).json({ error: "Current password is required." });
      }
      if (!administratorResettingAnotherUser && usersState2[uIdx].password && usersState2[uIdx].password !== requestedCurrentPassword) {
        return res.status(401).json({ error: "Current password is incorrect." });
      }
      updates.temporaryPasswordExpiresAt = null;
    }
    const previousUser = { ...usersState2[uIdx] };
    const updatedUser = {
      ...usersState2[uIdx],
      ...updates,
      username
    };
    if (updatedUser.role === "ADMIN") {
      updatedUser.divisionCode = "AD";
      if (!updates.permissions) {
        updatedUser.permissions = structuredClone(
          DEFAULT_ROLE_PERMISSIONS.ADMIN
        );
      }
    }
    if (updatedUser.role === "SYSTEM_ADMIN") {
      updatedUser.divisionCode = "ITMS";
    }
    const newUsersState = usersState2.map(
      (u) => u.id === req.params.id ? updatedUser : u
    );
    setUsersState(newUsersState);
    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: "UPDATE_USER",
      details: `Updated account details for ${updatedUser.fullName}`,
      ipAddress: req.ip || "127.0.0.1"
    });
    try {
      await Promise.all([
        saveUserDirect(updatedUser),
        saveAuditLogDirect(auditLog)
      ]);
    } catch (error) {
      setUsersState(
        usersState2.map((u) => u.id === req.params.id ? previousUser : u)
      );
      const message = error instanceof Error ? error.message : String(error);
      return res.status(message.includes("Unique constraint") ? 409 : 500).json({
        error: message.includes("Unique constraint") ? "Username already exists" : "Failed to update the user account."
      });
    }
    syncEmployeeProfile(updatedUser);
    res.json(withoutCredentials(updatedUser));
  });
  router.delete("/:id", async (req, res) => {
    const usersState2 = getUsersState();
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    if (actingUser.role !== "SYSTEM_ADMIN") {
      return res.status(403).json({ error: "System Administrator access required." });
    }
    const accountToDelete = usersState2.find(
      (user) => user.id === req.params.id
    );
    if (accountToDelete?.role === "SYSTEM_ADMIN") {
      return res.status(403).json({
        error: "System Administrator accounts cannot be deleted."
      });
    }
    const index = usersState2.findIndex((u) => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "User not found" });
    const originalUsers = [...usersState2];
    const deleted = usersState2[index];
    setUsersState(usersState2.filter((u) => u.id !== req.params.id));
    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: "UPDATE_USER",
      details: `Deleted user account: ${deleted.fullName}`,
      ipAddress: req.ip || "127.0.0.1"
    });
    try {
      await Promise.all([
        deleteUserDirect(deleted.id),
        saveAuditLogDirect(auditLog)
      ]);
    } catch (error) {
      setUsersState(originalUsers);
      return res.status(500).json({ error: "Failed to delete the user account." });
    }
    res.json({ success: true });
  });
  return router;
}

// backend/documents.ts
import express2 from "express";

// frontend/src/app/utils/routing-recipients.ts
function hasCompletedPart(document, recipient) {
  return document.routes?.some((route) => route.statusAfter === "COMPLETED" && (route.fromUserId && recipient.id ? route.fromUserId === recipient.id : Boolean(recipient.fullName?.trim() && route.fromUser?.trim().toLowerCase() === recipient.fullName.trim().toLowerCase() && (!recipient.divisionCode || route.fromDivision === recipient.divisionCode)))) || false;
}
function getPendingRecipients(document) {
  const deliveries = /* @__PURE__ */ new Map();
  for (const route of document.routes || []) {
    if (!route.toUserId && !route.toUser?.trim() || ["APPROVED", "DISAPPROVED"].includes(route.actionRequested?.trim().toUpperCase())) continue;
    deliveries.set(route.toUserId || `${route.toDivision}:${route.toUser?.trim().toLowerCase()}`, route);
  }
  return [...deliveries.values()].filter((delivery) => !(document.routes || []).some((activity) => {
    const samePerson = activity.fromUserId && delivery.toUserId ? activity.fromUserId === delivery.toUserId : Boolean(delivery.toUser?.trim() && activity.fromUser?.trim().toLowerCase() === delivery.toUser.trim().toLowerCase() && activity.fromDivision === delivery.toDivision);
    return activity.id !== delivery.id && samePerson && new Date(activity.createdAt).getTime() >= new Date(delivery.createdAt).getTime() && (activity.statusAfter === "COMPLETED" || !["APPROVED", "DISAPPROVED"].includes(activity.actionRequested?.trim().toUpperCase()) && Boolean(activity.toUserId || activity.toUser?.trim()));
  }));
}
function findPreviousDelivery(document, recipient) {
  return document?.routes?.find((route) => {
    if (["APPROVED", "DISAPPROVED"].includes(route.actionRequested?.trim().toUpperCase())) return false;
    if (route.toUserId && recipient.id) return route.toUserId === recipient.id;
    const name = recipient.fullName?.trim().toLowerCase();
    return Boolean(name && route.toUser?.trim().toLowerCase() === name && (!recipient.divisionCode || route.toDivision === recipient.divisionCode));
  });
}

// frontend/src/app/utils/document-visibility.ts
var normalizeName = (value) => value?.trim().toLowerCase() || "";
var matchesParticipant = (user, participantId, participantName) => participantId === user.id || !participantId && Boolean(normalizeName(participantName)) && normalizeName(participantName) === normalizeName(user.fullName);
var auditNamesRecipient = (details, fullName) => new RegExp(
  `\\bTo:\\s*${fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s*\\||$)`,
  "i"
).test(details);
var isDocumentParticipant = (document, user, auditLogs = []) => matchesParticipant(user, document.assignedUserId, document.assignedUser) || matchesParticipant(user, document.createdByUserId, document.createdBy) || (document.routes || []).some(
  (route) => matchesParticipant(user, route.fromUserId, route.fromUser) || matchesParticipant(user, route.toUserId, route.toUser)
) || auditLogs.some(
  (log) => log.documentTrackingNumber === document.trackingNumber && (matchesParticipant(user, log.userId, log.userName) || auditNamesRecipient(log.details, user.fullName))
);

// backend/documents.ts
import { randomUUID as randomUUID3 } from "node:crypto";
function createDocumentsRouter(getUsersState, getDocumentsState, setDocumentsState, getNotificationsState, getAuditLogsState, setNotificationsState) {
  const router = express2.Router();
  const findActiveDatabaseUser = (id) => getUsersState().find(
    (user) => user.active && Boolean(id) && user.id === id
  );
  const getActingUser = (req) => findActiveDatabaseUser(String(req.get("X-User-Id") || ""));
  const getNextRouteNumber = (direction) => {
    const now = /* @__PURE__ */ new Date();
    const directionCode = direction === "OUTGOING" ? "OUT" : "IN";
    const prefix = `BLGFR2-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${directionCode}-`;
    const highest = getDocumentsState().reduce((currentHighest, document) => {
      const numbers = [document.trackingNumber, document.routeNo];
      return numbers.reduce((value, number) => {
        if (!number?.startsWith(prefix)) return value;
        const sequence = Number(number.slice(prefix.length));
        return Number.isInteger(sequence) ? Math.max(value, sequence) : value;
      }, currentHighest);
    }, 0);
    return `${prefix}${String(highest + 1).padStart(2, "0")}`;
  };
  const canViewDocument = (user, document) => {
    const permissions = user.permissions || DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.STAFF;
    if (user.role === "SYSTEM_ADMIN" || permissions.canViewAllDocuments) {
      return true;
    }
    return isDocumentParticipant(document, user, getAuditLogsState());
  };
  const getPendingDecisionRoute = (user, document) => [...document.routes || []].reverse().find((assignedRoute) => {
    if (["APPROVED", "DISAPPROVED"].includes(assignedRoute.actionRequested.toUpperCase())) return false;
    const assignedToUser = assignedRoute.toUserId === user.id || !assignedRoute.toUserId && assignedRoute.toUser?.trim().toLowerCase() === user.fullName.trim().toLowerCase();
    if (!assignedToUser) return false;
    const actedInRoutes = (document.routes || []).some((route) => route.createdAt > assignedRoute.createdAt && ["APPROVED", "DISAPPROVED"].includes(route.actionRequested.toUpperCase()) && (route.fromUserId === user.id || !route.fromUserId && route.fromUser?.trim().toLowerCase() === user.fullName.trim().toLowerCase()));
    const actedInAudit = getAuditLogsState().some((log) => log.documentTrackingNumber === document.trackingNumber && new Date(log.timestamp).getTime() > new Date(assignedRoute.createdAt).getTime() && (log.userId === user.id || !log.userId && log.userName.trim().toLowerCase() === user.fullName.trim().toLowerCase()) && /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details));
    return !actedInRoutes && !actedInAudit;
  });
  const withRecoveredAuditRoutes = (document) => {
    const storedRoutes = document.routes || [];
    const recovered = getAuditLogsState().filter(
      (log) => log.documentTrackingNumber === document.trackingNumber && log.action === "ROUTE_DOC"
    ).flatMap((log, index) => {
      const toName = log.details.match(/\bTo:\s*([^|]+)/i)?.[1]?.trim();
      if (!toName || /^N\/A(?:\s|$)/i.test(toName)) return [];
      const recipient = getUsersState().find(
        (user) => user.active && user.fullName.trim().toLowerCase() === toName.toLowerCase()
      );
      const recipientDivision = recipient?.divisionCode || log.details.match(/\b(?:To Division|Division):\s*([^|]+)/i)?.[1]?.trim() || document.currentDivision;
      const recipientName = recipient?.fullName || toName;
      const recipientId = recipient?.id;
      const actionRequested = log.details.match(/Action:\s*(.*?)(?:\s*\|\s*Remarks:|$)/i)?.[1] || "Appropriate Action";
      const duplicate = storedRoutes.some(
        (route) => (route.fromUserId === log.userId || route.fromUser.trim().toLowerCase() === log.userName.trim().toLowerCase()) && (recipientId && route.toUserId === recipientId || route.toUser?.trim().toLowerCase() === recipientName.trim().toLowerCase()) && route.actionRequested.trim().toLowerCase() === actionRequested.trim().toLowerCase() && Math.abs(
          new Date(route.createdAt).getTime() - new Date(log.timestamp).getTime()
        ) < 5e3
      );
      if (duplicate) return [];
      const sender = findActiveDatabaseUser(log.userId);
      const statusAfter = log.details.match(/Status:\s*([^|]+)$/i)?.[1]?.trim() || document.currentStatus;
      return [{
        id: `route-recovered-${log.id}`,
        documentId: document.id,
        stepNumber: storedRoutes.length + index + 1,
        routeNo: document.routeNo || document.trackingNumber,
        fromDivision: sender?.divisionCode || document.currentDivision,
        fromUserId: log.userId,
        fromUser: log.userName,
        toDivision: recipientDivision,
        toUserId: recipientId,
        toUser: recipientName,
        actionRequested,
        remarks: log.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1] || "",
        statusBefore: document.currentStatus,
        statusAfter,
        receivedAt: log.timestamp,
        createdAt: log.timestamp
      }];
    });
    return recovered.length ? { ...document, routes: [...storedRoutes, ...recovered] } : document;
  };
  const hideSystemAdministratorFromTransactions = (document) => document;
  router.get("/", async (req, res) => {
    try {
      const liveDocuments = await loadLiveDocuments();
      if (liveDocuments) setDocumentsState(liveDocuments);
    } catch (error) {
      console.error("[GET /api/documents] Live MySQL read failed:", error);
      return res.status(503).json({ error: "Documents are temporarily unavailable." });
    }
    let list = [...getDocumentsState()];
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    list = list.filter((document) => canViewDocument(actingUser, document)).map(withRecoveredAuditRoutes).map(hideSystemAdministratorFromTransactions);
    const { search, direction, status: status2, division, priority } = req.query;
    if (direction) {
      list = list.filter((d) => d.direction === direction);
    }
    if (status2) {
      list = list.filter((d) => d.currentStatus === status2);
    }
    if (division) {
      list = list.filter((d) => d.currentDivision === division);
    }
    if (priority) {
      list = list.filter((d) => d.priority === priority);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) => d.routeNo?.toLowerCase().includes(q) || d.title.toLowerCase().includes(q) || d.subject.toLowerCase().includes(q) || d.originatingOffice.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
      );
    }
    res.json(list);
  });
  router.get("/next-route-number", async (req, res) => {
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    try {
      const liveDocuments = await loadLiveDocuments();
      if (liveDocuments) setDocumentsState(liveDocuments);
    } catch (error) {
      console.error("[GET next route number] Live read failed:", error);
      return res.status(503).json({ error: "Unable to determine the next Document Route No." });
    }
    res.json({ routeNo: getNextRouteNumber(String(req.query.direction || "INCOMING")) });
  });
  router.get("/:id", (req, res) => {
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    const doc = getDocumentsState().find(
      (d) => d.id === req.params.id || d.routeNo === req.params.id
    );
    if (!doc || !canViewDocument(actingUser, doc)) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(hideSystemAdministratorFromTransactions(withRecoveredAuditRoutes(doc)));
  });
  router.post("/", async (req, res) => {
    const body = req.body;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let documentsState2 = getDocumentsState();
    const usersState2 = getUsersState();
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    try {
      const liveDocuments = await loadLiveDocuments();
      if (liveDocuments) {
        documentsState2 = liveDocuments;
        setDocumentsState(documentsState2);
      }
    } catch (error) {
      console.error("[POST /api/documents] Live duplicate check failed:", error);
      return res.status(503).json({ error: "Unable to verify the next Document Route No." });
    }
    const trackingNumber = String(body.routeNo || "").trim();
    const nextRouteNumber = getNextRouteNumber(String(body.direction || "INCOMING"));
    const isDuplicate = documentsState2.some(
      (document) => document.trackingNumber === trackingNumber || document.routeNo === trackingNumber
    );
    if (!trackingNumber || isDuplicate || trackingNumber !== nextRouteNumber) {
      return res.status(409).json({
        error: isDuplicate ? `Duplicate Document Route No.: ${trackingNumber} is already assigned. Nothing was saved.` : `Document Route No. is no longer available. The next number is ${nextRouteNumber}. Nothing was saved.`,
        nextRouteNo: nextRouteNumber
      });
    }
    const newDocumentId = `doc-${randomUUID3()}`;
    const isMultiDivisionInitialRoute = body.routeAllDivisions || body.routeMultipleDivisions;
    const initialRecipients = usersState2.filter(
      (user) => user.active && user.role !== "SYSTEM_ADMIN" && user.divisionCode !== "ITMS" && Array.isArray(body.initialRecipientIds) && body.initialRecipientIds.includes(user.id)
    );
    const directlyAssignedUser = body.assignedUserId ? findActiveDatabaseUser(String(body.assignedUserId)) : void 0;
    if (directlyAssignedUser?.role === "SYSTEM_ADMIN" || directlyAssignedUser?.divisionCode === "ITMS") {
      return res.status(400).json({
        error: "System administrators cannot be document recipients or handlers."
      });
    }
    const newDoc = {
      id: newDocumentId,
      trackingNumber,
      routeNo: trackingNumber,
      direction: body.direction || "INCOMING",
      title: body.title,
      subject: body.subject || "",
      category: body.category || "General Correspondence",
      originatingOffice: body.originatingOffice || "External Office",
      destinationOffice: body.destinationOffice || "BLGF Region II",
      senderName: body.senderName || "",
      senderPosition: body.senderPosition || "",
      senderAddress: body.senderAddress || "",
      recipientName: body.recipientName || "",
      recipientPosition: body.recipientPosition || "",
      recipientOffice: body.recipientOffice || "",
      recipientAddress: body.recipientAddress || "",
      priority: body.priority || "ROUTINE",
      currentStatus: body.currentStatus || "PENDING",
      currentDivision: body.currentDivision || "AD",
      assignedUser: directlyAssignedUser?.fullName || "",
      assignedUserId: directlyAssignedUser?.id,
      dateReceived: body.dateReceived || now,
      targetCompletionDate: body.targetCompletionDate || new Date(Date.now() + 3 * 864e5).toISOString(),
      tags: body.tags || [],
      attachments: (body.attachments || []).map((file) => ({ ...file, attachmentScope: "DOCUMENT", uploadedByUserId: actingUser.id })),
      actionRequested: body.initialAction || "Appropriate Action",
      routes: initialRecipients.length > 0 ? initialRecipients.map((recipient, index) => ({
        id: `route-${randomUUID3()}`,
        documentId: newDocumentId,
        stepNumber: index + 1,
        routeNo: trackingNumber,
        fromDivision: body.currentDivision || "AD",
        fromUserId: actingUser.id,
        fromUser: actingUser.fullName,
        toDivision: recipient.divisionCode,
        toUser: recipient.fullName,
        toUserId: recipient.id,
        actionRequested: body.initialAction || "Initial Entry & Routing",
        remarks: body.remarks || "N/A",
        statusBefore: "PENDING",
        statusAfter: body.currentStatus || "PENDING",
        isMultiRoute: initialRecipients.length > 1,
        receivedAt: now,
        createdAt: now
      })) : [
        {
          id: `route-${randomUUID3()}`,
          documentId: newDocumentId,
          stepNumber: 1,
          routeNo: trackingNumber,
          fromDivision: body.currentDivision || "AD",
          fromUserId: actingUser.id,
          fromUser: actingUser.fullName,
          toDivision: body.currentDivision || "AD",
          toUser: directlyAssignedUser?.fullName,
          toUserId: directlyAssignedUser?.id,
          actionRequested: body.initialAction || "Initial Entry & Routing",
          remarks: body.remarks || "N/A",
          statusBefore: "PENDING",
          statusAfter: body.currentStatus || "PENDING",
          receivedAt: now,
          createdAt: now
        }
      ],
      createdBy: actingUser.fullName,
      createdByUserId: actingUser.id,
      createdAt: now,
      updatedAt: now
    };
    setDocumentsState([newDoc, ...documentsState2]);
    saveDatabaseToFile2(false);
    const creationAuditLog = addAuditLog(
      getAuditLogsState(),
      {
        userId: actingUser.id,
        userName: actingUser.fullName,
        userRole: actingUser.role,
        action: "CREATE_DOC",
        documentTrackingNumber: trackingNumber,
        details: [
          `Created by: ${actingUser.fullName}`,
          `Document: ${body.title || "Untitled"} [${trackingNumber}]`,
          `Subject: ${body.subject || "N/A"}`,
          `Sender: ${body.senderName || "N/A"}`,
          `Position: ${body.senderPosition || "N/A"}`,
          `Originating office: ${body.originatingOffice || "N/A"}`,
          `Address: ${body.senderAddress || "N/A"}`,
          `Action: ${body.initialAction || "Appropriate Action"}`
        ].join(" | "),
        ipAddress: req.ip || "127.0.0.1"
      },
      false
    );
    const createdNotifications = [];
    if (body.assignedUserId) {
      const assignedRecipient = usersState2.find(
        (user) => user.id === body.assignedUserId && user.active && user.role !== "SYSTEM_ADMIN" && user.divisionCode !== "ITMS"
      );
      if (assignedRecipient) {
        createdNotifications.push(
          createNotification(
            {
              userId: assignedRecipient.id,
              title: "New Document Routed to You",
              message: `Document ${trackingNumber} (${newDoc.title}) was assigned directly to you.`,
              documentId: newDoc.id,
              trackingNumber,
              type: "ACTION_REQUIRED"
            }
          )
        );
      }
    } else if (body.currentDivision) {
      const excludedRecipientIds = Array.isArray(body.excludedRecipientIds) ? body.excludedRecipientIds : [];
      usersState2.filter(
        (user) => user.active && (isMultiDivisionInitialRoute ? Array.isArray(body.initialRecipientIds) && body.initialRecipientIds.includes(user.id) : user.divisionCode === body.currentDivision) && !excludedRecipientIds.includes(user.id)
      ).forEach((divisionUser) => {
        createdNotifications.push(
          createNotification(
            {
              userId: divisionUser.id,
              title: `New Document for ${isMultiDivisionInitialRoute ? "Multiple Divisions" : body.currentDivision}`,
              message: `Document ${trackingNumber} (${newDoc.title}) was routed to ${isMultiDivisionInitialRoute ? "multiple divisions" : "your division"}.`,
              documentId: newDoc.id,
              trackingNumber,
              type: "ACTION_REQUIRED"
            }
          )
        );
      });
    }
    await Promise.all([
      saveDocumentDirect(newDoc),
      saveAuditLogDirect(creationAuditLog)
    ]);
    res.status(201).json(newDoc);
  });
  router.post("/:id/decision", async (req, res) => {
    const documentsState2 = getDocumentsState();
    const docIndex = documentsState2.findIndex((document) => document.id === req.params.id);
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    if (docIndex === -1) return res.status(404).json({ error: "Document not found." });
    const doc = documentsState2[docIndex];
    if (doc.currentStatus === "COMPLETED" || hasCompletedPart(doc, actingUser)) {
      return res.status(409).json({ error: "This transaction has ended. Completed documents cannot be routed or changed." });
    }
    const decision = String(req.body.decision || "").toUpperCase();
    const remarks = String(req.body.remarks || "").trim();
    if (decision !== "APPROVED" && decision !== "DISAPPROVED") {
      return res.status(400).json({ error: "Select Approved or Disapproved." });
    }
    if (decision === "DISAPPROVED" && !remarks) {
      return res.status(400).json({ error: "A disapproval remark is required." });
    }
    let assignedRoute = [...doc.routes || []].reverse().find(
      (route) => !["APPROVED", "DISAPPROVED"].includes(
        route.actionRequested.toUpperCase()
      ) && (route.toUserId === actingUser.id || !route.toUserId && route.toUser?.trim().toLowerCase() === actingUser.fullName.trim().toLowerCase())
    );
    if (!assignedRoute) {
      const recoveredAudit = [...getAuditLogsState()].filter(
        (log) => log.documentTrackingNumber === doc.trackingNumber && new RegExp(
          `\\bTo:\\s*${actingUser.fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s*\\||$)`,
          "i"
        ).test(log.details)
      ).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      if (recoveredAudit) {
        const recoveredSender = findActiveDatabaseUser(recoveredAudit.userId);
        assignedRoute = {
          id: `route-recovered-${recoveredAudit.id}`,
          documentId: doc.id,
          stepNumber: (doc.routes || []).length + 1,
          routeNo: doc.routeNo || doc.trackingNumber,
          fromDivision: recoveredSender?.divisionCode || doc.currentDivision,
          fromUserId: recoveredSender?.id,
          fromUser: recoveredAudit.userName,
          toDivision: actingUser.divisionCode,
          toUserId: actingUser.id,
          toUser: actingUser.fullName,
          actionRequested: recoveredAudit.details.match(/Action:\s*(.*?)(?:\s*\|\s*Remarks:|$)/i)?.[1] || "Appropriate Action",
          remarks: recoveredAudit.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1] || "",
          statusBefore: doc.currentStatus,
          statusAfter: doc.currentStatus,
          createdAt: recoveredAudit.timestamp
        };
        doc.routes.push(assignedRoute);
      }
    }
    if (!assignedRoute) {
      return res.status(403).json({ error: "This document is not awaiting your decision." });
    }
    const latestDecision = [...doc.routes || []].reverse().find(
      (route) => (route.fromUserId === actingUser.id || !route.fromUserId && route.fromUser?.trim().toLowerCase() === actingUser.fullName.trim().toLowerCase()) && route.createdAt > assignedRoute.createdAt && ["APPROVED", "DISAPPROVED"].includes(route.actionRequested)
    );
    const isReapproval = decision === "APPROVED" && latestDecision?.actionRequested === "DISAPPROVED";
    if (latestDecision && !isReapproval) {
      return res.status(409).json({ error: "You have already acted on this document route." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    assignedRoute.actionTaken = decision;
    assignedRoute.processedAt = now;
    const legacySenderRoute = (doc.routes || []).find(
      (route) => Boolean(route.toUserId) && route.toUser?.trim().toLowerCase() === assignedRoute.fromUser?.trim().toLowerCase()
    );
    const sender = (assignedRoute.fromUserId ? findActiveDatabaseUser(assignedRoute.fromUserId) : void 0) || (legacySenderRoute?.toUserId ? findActiveDatabaseUser(legacySenderRoute.toUserId) : void 0) || (doc.createdByUserId ? findActiveDatabaseUser(doc.createdByUserId) : void 0) || getUsersState().find(
      (user) => user.active && (user.fullName.trim().toLowerCase() === assignedRoute.fromUser?.trim().toLowerCase() || user.fullName.trim().toLowerCase() === doc.createdBy?.trim().toLowerCase())
    );
    const decisionRoute = {
      id: `route-decision-${randomUUID3()}`,
      documentId: doc.id,
      stepNumber: (doc.routes || []).length + 1,
      routeNo: doc.routeNo || doc.trackingNumber,
      fromDivision: actingUser.divisionCode,
      fromUserId: actingUser.id,
      fromUser: actingUser.fullName,
      toDivision: decision === "DISAPPROVED" && sender ? sender.divisionCode : actingUser.divisionCode,
      toUser: sender?.fullName,
      toUserId: sender?.id,
      actionRequested: decision,
      remarks: remarks || "Approved; proceed with routing.",
      statusBefore: doc.currentStatus,
      statusAfter: decision === "DISAPPROVED" ? "RETURNED" : "IN_PROGRESS",
      receivedAt: now,
      createdAt: now
    };
    doc.routes.push(decisionRoute);
    doc.currentStatus = decisionRoute.statusAfter;
    doc.updatedAt = now;
    if (decision === "DISAPPROVED" && sender) {
      doc.currentDivision = sender.divisionCode;
      doc.assignedUser = sender.fullName;
      doc.assignedUserId = sender.id;
    }
    documentsState2[docIndex] = doc;
    setDocumentsState(documentsState2);
    saveDatabaseToFile2(false);
    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: "UPDATE_STATUS",
      documentTrackingNumber: doc.trackingNumber,
      details: `${decision} by ${actingUser.fullName} | Remarks: ${remarks || "Approved; proceed with routing."}`,
      ipAddress: req.ip || "127.0.0.1"
    }, false);
    await Promise.all([saveDocumentDirect(doc), saveAuditLogDirect(auditLog)]);
    res.json(withRecoveredAuditRoutes(doc));
  });
  router.post("/:id/route", async (req, res) => {
    const documentsState2 = getDocumentsState();
    const docIndex = documentsState2.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: "Document not found" });
    }
    const doc = documentsState2[docIndex];
    const {
      fromDivision,
      toDivision,
      toUser,
      toUserId,
      actionRequested,
      remarks,
      replyAttachments,
      newStatus,
      actingUserId,
      actingUserName,
      routeNo
    } = req.body;
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    if (!canViewDocument(actingUser, doc)) {
      return res.status(404).json({ error: "Document not found" });
    }
    if (doc.currentStatus === "COMPLETED" || hasCompletedPart(doc, actingUser)) {
      return res.status(409).json({ error: "This transaction has ended. Completed documents cannot be routed or changed." });
    }
    if (doc.currentStatus === "RETURNED") {
      return res.status(409).json({
        error: "This document is disapproved. Re-approve it before routing."
      });
    }
    if (getPendingDecisionRoute(actingUser, doc)) {
      return res.status(409).json({
        error: "Action required: Approve or Disapprove this document before routing or forwarding it."
      });
    }
    if (routeNo && documentsState2.some(
      (document) => document.id !== doc.id && (document.routeNo?.trim().toLowerCase() === String(routeNo).trim().toLowerCase() || document.routes?.some(
        (route) => route.routeNo?.trim().toLowerCase() === String(routeNo).trim().toLowerCase()
      ))
    )) {
      return res.status(409).json({
        error: `Document Route No. ${routeNo} is already used by another document.`
      });
    }
    const recipient = getUsersState().find(
      (user) => user.id === toUserId && user.active && user.role !== "SYSTEM_ADMIN" && user.divisionCode !== "ITMS"
    );
    const isCompletionWithoutRecipient = newStatus === "COMPLETED" && !toUserId && !toUser;
    if (!recipient && !isCompletionWithoutRecipient) {
      return res.status(400).json({ error: "Select an active user account as the recipient." });
    }
    if (recipient && findPreviousDelivery(doc, recipient)) {
      return res.status(409).json({ error: `Already routed to ${recipient.fullName}. Choose another recipient.` });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const oldStatus = doc.currentStatus;
    if (newStatus === "COMPLETED" && (toUserId || toUser)) {
      return res.status(400).json({ error: "Complete your part without sending to new recipients." });
    }
    const nextStatus = newStatus || doc.currentStatus;
    const stepNumber = (doc.routes || []).length + 1;
    markLatestRouteAsProcessed(
      doc,
      actingUser.id,
      actingUser.fullName,
      actionRequested || "Document forwarded",
      now,
      Array.isArray(replyAttachments) ? replyAttachments : void 0
    );
    const newRoute = {
      id: `route-${randomUUID3()}`,
      documentId: doc.id,
      stepNumber,
      routeNo: routeNo || doc.routeNo || "",
      fromDivision: fromDivision || doc.currentDivision,
      fromUserId: actingUser.id,
      fromUser: actingUser.fullName,
      toDivision: toDivision || doc.currentDivision,
      toUser: recipient?.fullName,
      toUserId: recipient?.id,
      actionRequested: actionRequested || "For Appropriate Action",
      remarks: remarks || "",
      statusBefore: oldStatus,
      statusAfter: nextStatus,
      receivedAt: now,
      attachments: Array.isArray(replyAttachments) ? replyAttachments.map((file) => ({ ...file, attachmentScope: "RECIPIENT", uploadedByUserId: actingUser.id })) : void 0,
      createdAt: now
    };
    doc.routes.push(newRoute);
    if (routeNo) doc.routeNo = routeNo;
    doc.currentDivision = toDivision || doc.currentDivision;
    const pendingRecipients = nextStatus === "COMPLETED" ? getPendingRecipients(doc) : [];
    doc.currentStatus = nextStatus === "COMPLETED" && pendingRecipients.length ? "IN_PROGRESS" : nextStatus;
    doc.actionRequested = actionRequested || doc.actionRequested;
    if (recipient) {
      doc.assignedUser = recipient.fullName;
      doc.assignedUserId = recipient.id;
    } else {
      doc.assignedUser = pendingRecipients[0]?.toUser;
      doc.assignedUserId = pendingRecipients[0]?.toUserId;
    }
    doc.updatedAt = now;
    setNotificationsState(
      getNotificationsState().filter(
        (notification) => !(notification.documentId === doc.id && notification.userId === actingUser.id)
      )
    );
    if (doc.currentStatus === "COMPLETED" && !doc.completedDate) {
      doc.completedDate = now;
      doc.destinationOffice = "BLGF Regional Office II";
    }
    documentsState2[docIndex] = doc;
    setDocumentsState(documentsState2);
    saveDatabaseToFile2(false);
    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: "ROUTE_DOC",
      documentTrackingNumber: doc.trackingNumber,
      details: [
        `Routed by: ${actingUser.fullName}`,
        `Document: ${doc.title} [${doc.trackingNumber}]`,
        `Subject: ${doc.subject || "N/A"}`,
        `From: ${fromDivision || doc.currentDivision}`,
        `To: ${recipient?.fullName || toUser || "N/A"}`,
        `Action: ${actionRequested || "For Appropriate Action"}`,
        `Remarks: ${remarks || "N/A"}`,
        `Status: ${nextStatus}`
      ].join(" | "),
      ipAddress: req.ip || "127.0.0.1"
    }, false);
    await Promise.all([saveDocumentDirect(doc), saveAuditLogDirect(auditLog)]);
    if (recipient) {
      createNotification({
        userId: recipient.id,
        title: "Document Routed to You",
        message: `Document ${doc.trackingNumber} (${doc.title}) forwarded for: ${actionRequested}`,
        documentId: doc.id,
        trackingNumber: doc.trackingNumber,
        type: nextStatus === "FOR_SIGNATURE" ? "ACTION_REQUIRED" : "INFO"
      });
    }
    res.json(doc);
  });
  router.post("/:id/transfer", (req, res) => {
    const documentsState2 = getDocumentsState();
    const docIndex = documentsState2.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: "Document not found" });
    }
    const doc = documentsState2[docIndex];
    const {
      fromDivision,
      toDivision,
      toUser,
      toUserId,
      transferReason,
      actingUserId,
      actingUserName,
      routeNo
    } = req.body;
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    if (!canViewDocument(actingUser, doc)) {
      return res.status(404).json({ error: "Document not found" });
    }
    if (doc.currentStatus === "COMPLETED" || hasCompletedPart(doc, actingUser)) {
      return res.status(409).json({ error: "This transaction has ended. Completed documents cannot be routed or changed." });
    }
    const recipient = findActiveDatabaseUser(toUserId);
    if (recipient?.role === "SYSTEM_ADMIN" || recipient?.divisionCode === "ITMS") {
      return res.status(400).json({
        error: "System administrators cannot be document recipients or handlers."
      });
    }
    if (!recipient) {
      return res.status(400).json({ error: "Select an active database user." });
    }
    if (routeNo && documentsState2.some(
      (document) => document.id !== doc.id && (document.routeNo?.trim().toLowerCase() === String(routeNo).trim().toLowerCase() || document.routes?.some(
        (route) => route.routeNo?.trim().toLowerCase() === String(routeNo).trim().toLowerCase()
      ))
    )) {
      return res.status(409).json({
        error: `Document Route No. ${routeNo} is already used by another document.`
      });
    }
    if (findPreviousDelivery(doc, recipient)) {
      return res.status(409).json({ error: "Already routed to this recipient. Choose another recipient." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const oldStatus = doc.currentStatus;
    const stepNumber = (doc.routes || []).length + 1;
    markLatestRouteAsProcessed(
      doc,
      actingUser.id,
      actingUser.fullName,
      "Document transferred",
      now
    );
    const transferRoute = {
      id: `route-${randomUUID3()}`,
      documentId: doc.id,
      stepNumber,
      fromDivision: fromDivision || doc.currentDivision,
      fromUserId: actingUser.id,
      fromUser: actingUser.fullName,
      toDivision,
      toUser: recipient.fullName,
      toUserId: recipient.id,
      actionRequested: "Transfer / Reassigned to Correct Office",
      remarks: transferReason ? `[DOCUMENT TRANSFER] ${transferReason}` : "[DOCUMENT TRANSFER] Transferred to correct office",
      statusBefore: oldStatus,
      statusAfter: oldStatus,
      isTransfer: true,
      receivedAt: now,
      createdAt: now
    };
    doc.routes.push(transferRoute);
    doc.currentDivision = toDivision;
    doc.assignedUser = recipient.fullName;
    doc.assignedUserId = recipient.id;
    doc.updatedAt = now;
    documentsState2[docIndex] = doc;
    setDocumentsState(documentsState2);
    saveDatabaseToFile2();
    addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: "TRANSFER_DOC",
      documentTrackingNumber: doc.trackingNumber,
      details: `Transferred document [${doc.trackingNumber}] from ${fromDivision} to ${toDivision}. Reason: ${transferReason}`,
      ipAddress: req.ip || "127.0.0.1"
    });
    createNotification({
      userId: recipient.id,
      title: `Document Transferred to ${toDivision}`,
      message: `Document ${doc.trackingNumber} transferred by ${actingUser.fullName}: ${transferReason}`,
      documentId: doc.id,
      trackingNumber: doc.trackingNumber,
      type: "INFO"
    });
    res.json(doc);
  });
  router.post("/:id/multi-route", async (req, res) => {
    const documentsState2 = getDocumentsState();
    const docIndex = documentsState2.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: "Document not found" });
    }
    const doc = documentsState2[docIndex];
    if (doc.currentStatus === "RETURNED") {
      return res.status(409).json({
        error: "This document is disapproved. Re-approve it before routing."
      });
    }
    const {
      fromDivision,
      targetDivisions,
      // Array of DivisionCodes, e.g. ['LTOD', 'LAOD', 'AD']
      recipients,
      actionRequested,
      remarks,
      replyAttachments,
      newStatus,
      actingUserId,
      actingUserName,
      routeNo
    } = req.body;
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    if (!canViewDocument(actingUser, doc)) {
      return res.status(404).json({ error: "Document not found" });
    }
    if (doc.currentStatus === "COMPLETED" || hasCompletedPart(doc, actingUser)) {
      return res.status(409).json({ error: "This transaction has ended. Completed documents cannot be routed or changed." });
    }
    if (getPendingDecisionRoute(actingUser, doc)) {
      return res.status(409).json({
        error: "Action required: Approve or Disapprove this document before routing or forwarding it."
      });
    }
    if (routeNo && documentsState2.some(
      (document) => document.id !== doc.id && (document.routeNo?.trim().toLowerCase() === String(routeNo).trim().toLowerCase() || document.routes?.some(
        (route) => route.routeNo?.trim().toLowerCase() === String(routeNo).trim().toLowerCase()
      ))
    )) {
      return res.status(409).json({
        error: `Document Route No. ${routeNo} is already used by another document.`
      });
    }
    const requestedRoutingTargets = Array.isArray(recipients) && recipients.length > 0 ? recipients : Array.isArray(targetDivisions) ? targetDivisions.map((division) => ({
      toDivision: division
    })) : [];
    const routingTargets = requestedRoutingTargets.filter((target) => {
      if (target.toDivision === "ITMS") return false;
      if (!target.toUserId) return true;
      return getUsersState().some(
        (user) => user.id === target.toUserId && user.active && user.role !== "SYSTEM_ADMIN" && user.divisionCode !== "ITMS"
      );
    });
    if (routingTargets.length === 0) {
      return res.status(400).json({ error: "At least one target division must be specified" });
    }
    const targetKeys = /* @__PURE__ */ new Set();
    for (const target of routingTargets) {
      const recipient = findActiveDatabaseUser(target.toUserId);
      const key = target.toUserId || `${target.toDivision}:${String(target.toUser || "").trim().toLowerCase()}`;
      if (targetKeys.has(key)) return res.status(409).json({ error: "The same recipient is listed more than once. Review your recipients." });
      targetKeys.add(key);
      if (findPreviousDelivery(doc, recipient || { fullName: target.toUser, divisionCode: target.toDivision })) {
        return res.status(409).json({ error: `Already routed to ${recipient?.fullName || target.toUser}. Choose another recipient.` });
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const oldStatus = doc.currentStatus;
    if (newStatus === "COMPLETED") {
      return res.status(400).json({ error: "Complete your part without sending to new recipients." });
    }
    const nextStatus = newStatus || doc.currentStatus;
    markLatestRouteAsProcessed(
      doc,
      actingUser.id,
      actingUser.fullName,
      actionRequested || "Document multi-routed",
      now,
      Array.isArray(replyAttachments) ? replyAttachments : void 0
    );
    routingTargets.forEach((target, index) => {
      const targetDiv = target.toDivision;
      const stepNumber = (doc.routes || []).length + 1;
      const multiRouteStep = {
        id: `route-${randomUUID3()}`,
        documentId: doc.id,
        stepNumber,
        routeNo: routeNo || doc.routeNo || "",
        fromDivision: fromDivision || doc.currentDivision,
        fromUserId: actingUser.id,
        fromUser: actingUser.fullName,
        toDivision: targetDiv,
        toUser: target.toUser,
        toUserId: target.toUserId,
        actionRequested: actionRequested || "For Information & Appropriate Action",
        remarks: remarks ? `[MULTI-ROUTE ${index + 1}/${routingTargets.length}] ${remarks}` : `[MULTI-ROUTE ${index + 1}/${routingTargets.length}] Routed simultaneously`,
        statusBefore: oldStatus,
        statusAfter: nextStatus,
        isMultiRoute: true,
        receivedAt: now,
        attachments: Array.isArray(replyAttachments) ? replyAttachments.map((file) => ({ ...file, attachmentScope: "RECIPIENT", uploadedByUserId: actingUser.id })) : void 0,
        createdAt: now
      };
      doc.routes.push(multiRouteStep);
      const targetUser = findActiveDatabaseUser(target.toUserId);
      if (targetUser) {
        createNotification({
          userId: targetUser.id,
          title: `Multi-Route Received at ${targetDiv}`,
          message: `Document ${doc.trackingNumber} dispatched to multiple divisions including ${targetDiv}`,
          documentId: doc.id,
          trackingNumber: doc.trackingNumber,
          type: "INFO"
        });
      }
    });
    if (routeNo) doc.routeNo = routeNo;
    doc.currentDivision = routingTargets[0].toDivision;
    doc.currentStatus = nextStatus;
    doc.actionRequested = actionRequested || doc.actionRequested;
    doc.updatedAt = now;
    setNotificationsState(
      getNotificationsState().filter(
        (notification) => !(notification.documentId === doc.id && notification.userId === actingUser.id)
      )
    );
    documentsState2[docIndex] = doc;
    setDocumentsState(documentsState2);
    saveDatabaseToFile2(false);
    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: "ROUTE_DOC",
      documentTrackingNumber: doc.trackingNumber,
      details: `Multi-routed [${doc.trackingNumber}] to ${routingTargets.map((target) => target.toUser || target.toDivision).join(", ")}. Action: ${actionRequested}`,
      ipAddress: req.ip || "127.0.0.1"
    }, false);
    await Promise.all([saveDocumentDirect(doc), saveAuditLogDirect(auditLog)]);
    res.json(doc);
  });
  router.post("/:id/attachments", async (req, res) => {
    const documentsState2 = getDocumentsState();
    const docIndex = documentsState2.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: "Document not found" });
    }
    const doc = documentsState2[docIndex];
    const {
      fileName,
      fileSize,
      fileType,
      url,
      fileData,
      actingUserId,
      actingUserName
    } = req.body;
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    if (!canViewDocument(actingUser, doc)) {
      return res.status(404).json({ error: "Document not found" });
    }
    const newAttachment = {
      id: `att-${randomUUID3()}`,
      attachmentScope: "RECIPIENT",
      uploadedByUserId: actingUser.id,
      uploadedForRouteId: [...doc.routes || []].reverse().find((route) => route.toUserId === actingUser.id && !["APPROVED", "DISAPPROVED"].includes(route.actionRequested?.toUpperCase()))?.id,
      fileName: fileName || "Document_Attachment.pdf",
      fileSize: fileSize || "1.2 MB",
      fileType: fileType || "application/pdf",
      uploadDate: (/* @__PURE__ */ new Date()).toISOString(),
      url: url || "",
      fileData: fileData || void 0
    };
    if (!doc.attachments) doc.attachments = [];
    doc.attachments.push(newAttachment);
    doc.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    documentsState2[docIndex] = doc;
    setDocumentsState(documentsState2);
    saveDatabaseToFile2();
    addAuditLog(
      getAuditLogsState(),
      {
        userId: actingUser.id,
        userName: actingUser.fullName,
        userRole: actingUser.role,
        action: "UPLOAD_ATTACHMENT",
        documentTrackingNumber: doc.trackingNumber,
        details: `Uploaded file attachment "${newAttachment.fileName}" (${newAttachment.fileSize}) to ${doc.trackingNumber}`,
        ipAddress: req.ip || "127.0.0.1"
      },
      false
    );
    await flushDatabaseSync();
    res.json(doc);
  });
  router.patch("/:id/final-instructions", async (req, res) => {
    const documentsState2 = getDocumentsState();
    const docIndex = documentsState2.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: "Document not found" });
    }
    const doc = documentsState2[docIndex];
    const actingUser = getActingUser(req) || (req.body.actingUserId ? findActiveDatabaseUser(String(req.body.actingUserId)) : void 0);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    const instructions = String(req.body.instructions || "").trim();
    if (!instructions) {
      return res.status(400).json({ error: "Instruction cannot be empty." });
    }
    const routes = doc.routes ? [...doc.routes] : [];
    const routeId = req.body.routeId ? String(req.body.routeId) : void 0;
    if (routeId) {
      const targetIndex = routes.findIndex((r) => r.id === routeId);
      if (targetIndex !== -1) {
        routes[targetIndex] = {
          ...routes[targetIndex],
          remarks: `Handoff Instructions: ${instructions}`
        };
        doc.routes = routes;
      }
    } else {
      const finalRouteIndex = [...routes].reverse().findIndex((r) => r.statusAfter === "COMPLETED");
      if (finalRouteIndex !== -1) {
        const actualIndex = routes.length - 1 - finalRouteIndex;
        routes[actualIndex] = {
          ...routes[actualIndex],
          remarks: `Handoff Instructions: ${instructions}`
        };
        doc.routes = routes;
      } else if (routes.length > 0) {
        routes[routes.length - 1] = {
          ...routes[routes.length - 1],
          remarks: `Handoff Instructions: ${instructions}`
        };
        doc.routes = routes;
      } else {
        routes.push({
          id: `route-${randomUUID3()}`,
          documentId: doc.id,
          stepNumber: 1,
          routeNo: doc.routeNo || doc.trackingNumber,
          fromDivision: actingUser.divisionCode,
          fromUserId: actingUser.id,
          fromUser: actingUser.fullName,
          toDivision: doc.currentDivision || actingUser.divisionCode,
          actionRequested: "Completed & Finalized",
          remarks: `Handoff Instructions: ${instructions}`,
          statusBefore: "COMPLETED",
          statusAfter: "COMPLETED",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        doc.routes = routes;
      }
    }
    doc.finalInstructions = instructions;
    doc.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    documentsState2[docIndex] = doc;
    setDocumentsState(documentsState2);
    saveDatabaseToFile2(false);
    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: "UPDATE_STATUS",
      documentTrackingNumber: doc.trackingNumber,
      details: `Updated final instructions for ${doc.trackingNumber}: "${instructions}"`,
      ipAddress: req.ip || "127.0.0.1"
    }, false);
    await Promise.all([saveDocumentDirect(doc), saveAuditLogDirect(auditLog)]);
    res.json({ success: true, document: doc, instructions });
  });
  router.put("/:id", async (req, res) => {
    const documentsState2 = getDocumentsState();
    const docIndex = documentsState2.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: "Document not found" });
    }
    const currentDoc = documentsState2[docIndex];
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    if (!canViewDocument(actingUser, currentDoc)) {
      return res.status(404).json({ error: "Document not found" });
    }
    if (currentDoc.currentStatus === "COMPLETED" && req.body.currentStatus !== void 0 && req.body.currentStatus !== "COMPLETED") {
      return res.status(409).json({ error: "This transaction has ended and cannot be reopened for routing." });
    }
    const updated = {
      ...currentDoc,
      ...req.body,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    documentsState2[docIndex] = updated;
    setDocumentsState(documentsState2);
    saveDatabaseToFile2();
    addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: "UPDATE_STATUS",
      documentTrackingNumber: currentDoc.trackingNumber,
      details: `Updated document details for ${currentDoc.trackingNumber}. Status: ${updated.currentStatus}`,
      ipAddress: req.ip || "127.0.0.1"
    });
    await flushDatabaseSync();
    res.json(updated);
  });
  router.delete("/:id", async (req, res) => {
    const documentsState2 = getDocumentsState();
    const doc = documentsState2.find((d) => d.id === req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    const permissions = actingUser.permissions || DEFAULT_ROLE_PERMISSIONS[actingUser.role];
    if (actingUser.role !== "SYSTEM_ADMIN" && !permissions.canDelete) {
      return res.status(403).json({ error: "Delete permission is required." });
    }
    setDocumentsState(documentsState2.filter((d) => d.id !== req.params.id));
    saveDatabaseToFile2(false);
    const deletionAuditLog = addAuditLog(
      getAuditLogsState(),
      {
        userId: actingUser.id,
        userName: actingUser.fullName,
        userRole: actingUser.role,
        action: "DELETE_DOC",
        documentTrackingNumber: doc.trackingNumber,
        details: `Deleted document ${doc.trackingNumber} (${doc.title})`,
        ipAddress: req.ip || "127.0.0.1"
      },
      false
    );
    try {
      await Promise.all([
        deleteDocumentDirect(doc.id),
        saveAuditLogDirect(deletionAuditLog)
      ]);
    } catch (error) {
      setDocumentsState(documentsState2);
      return res.status(500).json({ error: "Failed to delete the document from the database." });
    }
    res.json({
      success: true,
      message: `Document ${doc.trackingNumber} deleted`
    });
  });
  return router;
}

// backend/server.ts
import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import nodemailer from "nodemailer";

// backend/pdfGenerator.ts
function escapePdf(text2) {
  return String(text2 || "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function generateOfficialPdfBuffer(title, details = {}) {
  const cleanTitle = escapePdf(title || "BLGF Official Document");
  const docNo = escapePdf(details.trackingNumber || "BLGF2-OFFICIAL-RECORD");
  const cat = escapePdf(details.category || "Official Document / Attachment");
  const dateStr = escapePdf(
    details.date || (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  );
  const sender = escapePdf(
    details.sender || "Bureau of Local Government Finance - Regional Office No. II"
  );
  const recipient = escapePdf(
    details.recipient || "All Concerned Offices and Division Units"
  );
  const remarks = escapePdf(
    details.remarks || "Standard document logging and routing compliance."
  );
  const status2 = escapePdf(details.status || "VERIFIED & REGISTERED");
  const stream = `
0.05 0.23 0.40 rg
50 715 512 45 re f

1 1 1 rg
BT
/F1 13 Tf
60 742 Td
(BUREAU OF LOCAL GOVERNMENT FINANCE - REGION II) Tj
ET
BT
/F2 8 Tf
60 727 Td
(Department of Finance | Regional Government Center, Carig Sur, Tuguegarao City, Cagayan) Tj
ET

0.85 0.65 0.13 rg
50 712 512 3 re f

0.05 0.23 0.40 rg
BT
/F1 13 Tf
50 680 Td
(${cleanTitle}) Tj
ET

0.80 0.82 0.85 rg
50 668 512 1 re f

0.15 0.18 0.22 rg
BT
/F1 10 Tf
50 645 Td
(DOCUMENT SPECIFICATIONS & TRACKING DETAILS) Tj
ET

BT
/F1 9 Tf
50 622 Td
(Tracking Number: ) Tj
/F2 9 Tf
( ${docNo} ) Tj
ET

BT
/F1 9 Tf
50 604 Td
(Classification: ) Tj
/F2 9 Tf
( ${cat} ) Tj
ET

BT
/F1 9 Tf
50 586 Td
(Date Logged: ) Tj
/F2 9 Tf
( ${dateStr} ) Tj
ET

BT
/F1 9 Tf
50 568 Td
(Originating Office: ) Tj
/F2 9 Tf
( ${sender} ) Tj
ET

BT
/F1 9 Tf
50 550 Td
(Intended Recipient: ) Tj
/F2 9 Tf
( ${recipient} ) Tj
ET

BT
/F1 9 Tf
50 532 Td
(Action / Remarks: ) Tj
/F2 9 Tf
( ${remarks} ) Tj
ET

0.94 0.96 0.99 rg
50 365 512 145 re f
0.15 0.35 0.60 RG
1 w
50 365 512 145 re S

0.05 0.23 0.40 rg
BT
/F1 11 Tf
65 482 Td
(OFFICIAL ATTACHMENT VERIFICATION NOTICE) Tj
ET

0.20 0.20 0.20 rg
BT
/F2 9 Tf
65 458 Td
(This digital file serves as an authenticated system attachment under the BLGF Region II) Tj
ET
BT
/F2 9 Tf
65 442 Td
(Document Tracking System, preserving the integrity of all routed communications.) Tj
ET
BT
/F2 9 Tf
65 422 Td
(Governing Policy: Republic Act No. 12001 - Real Property Valuation and Assessment Reform Act) Tj
ET
BT
/F2 9 Tf
65 406 Td
(Administrative Circulars and Regional Guidelines for Local Treasury and Assessment Services.) Tj
ET
BT
/F1 9 Tf
65 384 Td
(Authentication Status: ) Tj
/F2 9 Tf
( ${status2} ) Tj
ET

0.80 0.80 0.80 rg
50 95 512 1 re f
0.45 0.45 0.45 rg
BT
/F2 8 Tf
50 80 Td
(Confidential & Official Document - Bureau of Local Government Finance Region II) Tj
ET
BT
/F2 8 Tf
465 80 Td
(Page 1 of 1) Tj
ET
`;
  const streamBuf = Buffer.from(stream.trim(), "utf8");
  const streamLen = streamBuf.length;
  const header = "%PDF-1.4\n";
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n";
  const obj4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";
  const obj5 = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
  const obj6Head = `6 0 obj
<< /Length ${streamLen} >>
stream
`;
  const obj6Tail = "\nendstream\nendobj\n";
  const parts = [
    Buffer.from(header, "ascii"),
    Buffer.from(obj1, "ascii"),
    Buffer.from(obj2, "ascii"),
    Buffer.from(obj3, "ascii"),
    Buffer.from(obj4, "ascii"),
    Buffer.from(obj5, "ascii"),
    Buffer.from(obj6Head, "ascii"),
    streamBuf,
    Buffer.from(obj6Tail, "ascii")
  ];
  let offset = header.length;
  const offsets = [];
  offsets.push(offset);
  offset += obj1.length;
  offsets.push(offset);
  offset += obj2.length;
  offsets.push(offset);
  offset += obj3.length;
  offsets.push(offset);
  offset += obj4.length;
  offsets.push(offset);
  offset += obj5.length;
  offsets.push(offset);
  const preStreamLen = header.length + obj1.length + obj2.length + obj3.length + obj4.length + obj5.length + obj6Head.length + streamLen + obj6Tail.length;
  let xref = `xref
0 7
0000000000 65535 f \r
`;
  for (let i = 0; i < 6; i++) {
    xref += String(offsets[i]).padStart(10, "0") + " 00000 n \r\n";
  }
  xref += `trailer
<< /Size 7 /Root 1 0 R >>
startxref
${preStreamLen}
%%EOF
`;
  parts.push(Buffer.from(xref, "ascii"));
  return Buffer.concat(parts);
}

// backend/server.ts
dotenv.config({ quiet: true });
var DEFAULT_PORT = 3001;
var PORT = Number(process.env.PORT || DEFAULT_PORT);
var IS_VERCEL = Boolean(process.env.VERCEL);
var ADMIN_PASSWORD_RESET_COOLDOWN_MS = 15 * 60 * 1e3;
var TEMPORARY_PASSWORD_VALIDITY_MS = 5 * 60 * 1e3;
var adminPasswordResetRequests = /* @__PURE__ */ new Map();
var BUNDLED_DATA_DIR = path.join(process.cwd(), "backend", "data");
var DATA_DIR = IS_VERCEL ? path.join(os.tmpdir(), "blgf-data") : path.join(process.cwd(), "backend", "data");
var DB_FILE = path.join(DATA_DIR, "blgf_doctrack_db.json");
var ENVELOPE_LOG_DB_FILE = path.join(DATA_DIR, "blgf_envelope_logs_db.json");
var STORAGE_ROOT_DIR = path.join(DATA_DIR, "storage");
var STORAGE_DIRECTORIES = {
  documentAttachments: path.join(STORAGE_ROOT_DIR, "attachments"),
  profilePictures: path.join(STORAGE_ROOT_DIR, "profile-pictures")
};
var RECORDS_ROOT_DIR = path.join(
  IS_VERCEL ? os.tmpdir() : process.cwd(),
  IS_VERCEL ? "blgf-records-management" : "backend/records-management"
);
var RECORDS_METADATA_FILE = path.join(
  RECORDS_ROOT_DIR,
  ".file-metadata.json"
);
var RECORD_CATEGORIES = ["memo", "letter", "circular", "report", "other"];
var RECORD_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".html",
  ".jpg",
  ".jpeg",
  ".png"
];
var readRecordMetadata = () => {
  try {
    return fs.existsSync(RECORDS_METADATA_FILE) ? JSON.parse(fs.readFileSync(RECORDS_METADATA_FILE, "utf8")) : {};
  } catch {
    return {};
  }
};
var writeRecordMetadata = (metadata) => {
  fs.writeFileSync(RECORDS_METADATA_FILE, JSON.stringify(metadata, null, 2));
};
var recordMetadataKey = (category, fileName) => `${category}/${fileName}`;
var safeStorageFileName = (name) => {
  const extension = path.extname(name);
  const baseName = path.basename(name, extension).replace(/[^a-zA-Z0-9._ -]/g, "_").trim() || "file";
  return `${Date.now()}_${baseName}${extension.toLowerCase()}`;
};
var storageFileUrl = (kind, fileName) => `/api/storage/files/${kind}/${encodeURIComponent(fileName)}`;
var mysqlSyncQueue = Promise.resolve();
var mysqlSyncRequested = false;
var mysqlSyncWorkerActive = false;
var divisionsState = [];
var usersState = [];
var documentsState = [];
var auditLogsState = [];
var envelopeLogsState = [];
var notificationsState = [];
var employeesState = [];
var DEFAULT_DIRECTORY_SECTIONS = [
  { id: "BLGF", label: "BLGF Personnel", officeTypes: ["BLGF"], color: "blue" },
  {
    id: "LGU_STAFF",
    label: "LGU Staff",
    officeTypes: ["PROVINCIAL_TREASURER", "MUNICIPAL_TREASURER", "LGU"],
    color: "emerald"
  },
  {
    id: "OTHER_AGENCIES",
    label: "Other Agencies",
    officeTypes: ["OTHER_AGENCIES"],
    color: "amber"
  }
];
var directorySectionsState = DEFAULT_DIRECTORY_SECTIONS;
var RESERVED_SYSTEM_ADMIN = {
  id: "usr-1785138104157",
  username: "tom",
  fullName: "Tom Catral",
  email: "catraltom@gmail.com",
  role: "SYSTEM_ADMIN",
  divisionCode: "ORD",
  designation: "System Administrator",
  contactNo: "",
  active: true,
  createdAt: "2026-07-27T07:41:44.157Z",
  avatarUrl: "",
  permissions: structuredClone(DEFAULT_ROLE_PERMISSIONS.SYSTEM_ADMIN)
};
async function ensureReservedSystemAdministrator() {
  const existing = usersState.find(
    (user) => user.id === RESERVED_SYSTEM_ADMIN.id || user.username.trim().toLowerCase() === RESERVED_SYSTEM_ADMIN.username.toLowerCase()
  );
  if (existing) return;
  const password = process.env.SYSTEM_ADMIN_PASSWORD?.trim();
  if (!password) {
    console.error(
      "No users exist in MySQL and SYSTEM_ADMIN_PASSWORD is not configured; login is unavailable."
    );
    return;
  }
  const administrator = {
    ...structuredClone(RESERVED_SYSTEM_ADMIN),
    password
  };
  await saveUserDirect(administrator);
  usersState.push(administrator);
  console.log("Created the reserved System Administrator account in MySQL.");
}
function markLatestRouteAsProcessed(document, actingUserId, _actingUserName, actionTaken, processedAt, attachments) {
  const route = [...document.routes || []].reverse().find(
    (candidate) => !candidate.processedAt && Boolean(actingUserId) && candidate.toUserId === actingUserId
  );
  if (!route) return;
  route.actionTaken = actionTaken;
  route.processedAt = processedAt;
  if (attachments?.length) {
    route.attachments = attachments;
  }
}
function ensureStorageDirectories() {
  Object.values(STORAGE_DIRECTORIES).forEach(
    (directory) => fs.mkdirSync(directory, { recursive: true })
  );
  fs.mkdirSync(RECORDS_ROOT_DIR, { recursive: true });
  RECORD_CATEGORIES.forEach(
    (category) => fs.mkdirSync(path.join(RECORDS_ROOT_DIR, category), { recursive: true })
  );
}
function ensureSeededAttachmentsExist() {
  try {
    const logoPath = path.join(process.cwd(), "frontend", "public", "blgflogo.jpg");
    const logoBuffer = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : Buffer.from("");
    const allAttachments = [];
    for (const doc of documentsState) {
      for (const att of doc.attachments || []) {
        allAttachments.push({ ...att, doc });
      }
      for (const route of doc.routes || []) {
        for (const att of route.attachments || []) {
          allAttachments.push({ ...att, doc });
        }
      }
    }
    for (const item of allAttachments) {
      const rawUrl = item.url || "";
      const rawFileName = rawUrl.split("/").pop() || "";
      if (!rawFileName) continue;
      const decodedFileName = decodeURIComponent(rawFileName);
      const fileNamesToEnsure = /* @__PURE__ */ new Set([rawFileName, decodedFileName]);
      for (const fileName of fileNamesToEnsure) {
        if (!fileName) continue;
        const targetPath = path.join(STORAGE_DIRECTORIES.documentAttachments, fileName);
        if (fs.existsSync(targetPath)) continue;
        if (fileName.toLowerCase().endsWith(".pdf")) {
          const doc = item.doc;
          const pdfBuf = generateOfficialPdfBuffer(item.fileName || fileName.replace(/^\d+_/, ""), {
            trackingNumber: doc?.trackingNumber || "BLGF2-OFFICIAL-RECORD",
            category: doc?.category || "Official Document",
            date: doc?.createdAt ? new Date(doc.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : void 0,
            sender: doc?.originatingOffice || doc?.senderName || "Bureau of Local Government Finance - Regional Office No. II",
            recipient: doc?.destinationOffice || doc?.recipientName || "All Concerned Personnel & Stakeholders",
            remarks: doc?.subject || "Implementation of Republic Act No. 12001 - Approved",
            status: "VERIFIED & AUTHENTICATED SYSTEM ATTACHMENT"
          });
          try {
            fs.writeFileSync(targetPath, pdfBuf);
          } catch {
          }
        } else if (fileName.toLowerCase().match(/\.(jpe?g|png)$/)) {
          try {
            fs.writeFileSync(targetPath, logoBuffer);
          } catch {
          }
        }
      }
    }
  } catch (err) {
    console.warn("[STORAGE] ensureSeededAttachmentsExist notice:", err);
  }
}
var recordUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      const uploadDirectory = path.join(RECORDS_ROOT_DIR, "_uploads");
      fs.mkdirSync(uploadDirectory, { recursive: true });
      callback(null, uploadDirectory);
    },
    filename: (_req, file, callback) => callback(null, safeStorageFileName(file.originalname))
  }),
  limits: { fileSize: 1024 * 1024 * 1024 }
});
var storageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 }
});
function initDatabaseStorage() {
  if (IS_VERCEL) {
    divisionsState = [];
    usersState = [];
    documentsState = [];
    auditLogsState = [];
    envelopeLogsState = [];
    notificationsState = [];
    employeesState = [];
    directorySectionsState = [...DEFAULT_DIRECTORY_SECTIONS];
    return;
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const bundledDatabaseFile = path.join(
    BUNDLED_DATA_DIR,
    "blgf_doctrack_db.json"
  );
  if (IS_VERCEL && !fs.existsSync(DB_FILE) && fs.existsSync(bundledDatabaseFile)) {
    fs.copyFileSync(bundledDatabaseFile, DB_FILE);
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8").replace(/\u0410/g, "A").replace(/\u2014/g, "-");
      const data = JSON.parse(raw);
      divisionsState = data.divisions || [];
      usersState = (data.users || []).map(
        (user) => user.role === "SYSTEM_ADMIN" ? { ...user, divisionCode: "ITMS" } : user
      );
      documentsState = data.documents || [];
      auditLogsState = data.auditLogs || [];
      if (fs.existsSync(ENVELOPE_LOG_DB_FILE)) {
        const envelopeData = JSON.parse(
          fs.readFileSync(ENVELOPE_LOG_DB_FILE, "utf-8")
        );
        envelopeLogsState = envelopeData.logs || [];
      } else {
        envelopeLogsState = auditLogsState.filter(
          (log) => log.action === "ENVELOPE_LOG"
        );
        auditLogsState = auditLogsState.filter(
          (log) => log.action !== "ENVELOPE_LOG"
        );
        saveEnvelopeLogsToFile();
      }
      notificationsState = data.notifications || [];
      repairInitialRouteRecipients();
      employeesState = data.employees || [];
      directorySectionsState = data.directorySections || DEFAULT_DIRECTORY_SECTIONS;
      console.log("Loaded local recovery snapshot before MySQL initialization:", DB_FILE);
    } catch (err) {
      console.error(
        "[WARN] Failed to parse database file, resetting to initial seed:",
        err
      );
      resetDatabaseToDefault();
    }
  } else {
    resetDatabaseToDefault();
  }
}
function applyDatabaseState(entries) {
  const state = new Map(entries);
  const use = (key, fallback) => {
    const value = state.get(key);
    return Array.isArray(value) ? value : fallback;
  };
  divisionsState = use("divisions", divisionsState);
  usersState = use("users", usersState).map(
    (user) => user.role === "SYSTEM_ADMIN" ? { ...user, divisionCode: "ITMS" } : user
  );
  documentsState = use("documents", documentsState);
  auditLogsState = use("audit_logs", auditLogsState);
  envelopeLogsState = use("envelope_logs", envelopeLogsState);
  notificationsState = use("notifications", notificationsState);
  employeesState = use("employee_profiles", employeesState);
  directorySectionsState = use("directory_sections", directorySectionsState);
}
function getDatabaseStateEntries() {
  return [
    ["divisions", divisionsState],
    ["users", usersState],
    ["documents", documentsState],
    ["audit_logs", auditLogsState],
    ["envelope_logs", envelopeLogsState],
    ["notifications", notificationsState],
    ["employee_profiles", employeesState],
    ["directory_sections", directorySectionsState]
  ];
}
function queueDatabaseSync() {
  if (!getMySQLReplicaStatus().connected) return;
  mysqlSyncRequested = true;
  if (mysqlSyncWorkerActive) return;
  mysqlSyncWorkerActive = true;
  mysqlSyncQueue = mysqlSyncQueue.then(async () => {
    await new Promise((resolve) => setImmediate(resolve));
    do {
      mysqlSyncRequested = false;
      await syncMySQLReplica(getDatabaseStateEntries());
    } while (mysqlSyncRequested);
  }).catch((error) => console.error("MySQL synchronization failed:", error)).finally(() => {
    mysqlSyncWorkerActive = false;
    if (mysqlSyncRequested) queueDatabaseSync();
  });
}
async function flushDatabaseSync() {
  await mysqlSyncQueue;
}
function syncEmployeeProfileFromUser(user, persist = true) {
  const matchingIndices = [];
  employeesState.forEach((emp, index) => {
    if (emp.userId === user.id) {
      matchingIndices.push(index);
    } else if (!emp.userId && emp.officeType === "BLGF" && emp.fullName.trim().toLowerCase() === user.fullName.trim().toLowerCase()) {
      matchingIndices.push(index);
    }
  });
  const matchingProfiles = matchingIndices.map((i) => employeesState[i]);
  const primaryExisting = matchingProfiles[0];
  const empId = primaryExisting?.id || `emp-${user.id}`;
  const allExistingFolders = [];
  const seenFolderNames = /* @__PURE__ */ new Set();
  for (const p of matchingProfiles) {
    for (const raw of p.folders || []) {
      if (!raw) continue;
      const rawStr = typeof raw === "string" ? raw : null;
      const f = rawStr !== null ? {
        id: rawStr,
        name: rawStr.startsWith("fld-auto-") ? "Personnel Records" : rawStr,
        employeeId: empId,
        userId: user.id,
        systemManaged: rawStr.startsWith("fld-auto-"),
        fileCount: 0,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        files: []
      } : raw;
      const folderName = f.name || f.id || "Folder";
      const key = folderName.toLowerCase();
      if (!seenFolderNames.has(key)) {
        seenFolderNames.add(key);
        allExistingFolders.push(f);
      }
    }
  }
  const autoFolderId = `fld-auto-${user.id}`;
  const otherFolders = allExistingFolders.filter(
    (folder) => folder.id !== autoFolderId && folder.userId !== user.id
  );
  const autoFolder = allExistingFolders.find(
    (folder) => folder.id === autoFolderId || folder.userId === user.id
  );
  const folders = [
    {
      id: autoFolderId,
      name: "Personnel Records",
      description: `Automatically created static personnel records folder for ${user.fullName}.`,
      employeeId: empId,
      userId: user.id,
      systemManaged: true,
      fileCount: autoFolder?.files?.length || 0,
      createdAt: user.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      files: autoFolder?.files || []
    },
    ...otherFolders
  ];
  const profile = {
    id: empId,
    userId: user.id,
    fullName: user.fullName,
    position: user.designation || user.role,
    office: "Bureau of Local Government Finance - Regional Office II",
    officeType: "BLGF",
    divisionCode: user.divisionCode,
    email: user.email || "N/A",
    contactNo: user.contactNo || "",
    address: primaryExisting?.address || "Regional Government Center, Carig Sur, Tuguegarao City",
    active: user.active,
    createdAt: primaryExisting?.createdAt || user.createdAt,
    folders
  };
  if (matchingIndices.length > 0) {
    const keepIndex = matchingIndices[0];
    const removeSet = new Set(matchingIndices.slice(1));
    employeesState[keepIndex] = profile;
    employeesState = employeesState.filter((_, idx) => !removeSet.has(idx));
  } else {
    employeesState.push(profile);
  }
  if (persist) saveDatabaseToFile();
}
function ensureUserEmployeeProfiles() {
  employeesState = employeesState.filter(
    (emp) => emp.id !== "emp-1785138157086" && emp.id !== "emp-1785138202454"
  );
  for (const user of usersState) syncEmployeeProfileFromUser(user, false);
  saveDatabaseToFile();
}
function repairInitialRouteRecipients() {
  let repaired = false;
  for (const document of documentsState) {
    const blankInitialRoutes = (document.routes || []).filter(
      (route) => route.stepNumber === 1 && !route.toUser && !route.toUserId
    );
    if (blankInitialRoutes.length === 0) continue;
    const recipientUsers = notificationsState.filter(
      (notification) => notification.documentId === document.id && notification.type === "ACTION_REQUIRED"
    ).map(
      (notification) => usersState.find(
        (user) => user.id === notification.userId && user.active
      )
    ).filter((user) => Boolean(user));
    if (recipientUsers.length === 0) continue;
    const blankRouteIds = new Set(blankInitialRoutes.map((route) => route.id));
    const template = blankInitialRoutes[0];
    document.routes = [
      ...(document.routes || []).filter(
        (route) => !blankRouteIds.has(route.id)
      ),
      ...recipientUsers.map((recipient, index) => ({
        ...template,
        id: `${template.id}-recipient-${index + 1}`,
        stepNumber: index + 1,
        toDivision: recipient.divisionCode,
        toUser: recipient.fullName,
        toUserId: recipient.id,
        isMultiRoute: recipientUsers.length > 1
      }))
    ];
    repaired = true;
  }
  if (repaired) saveDatabaseToFile();
}
function resetDatabaseToDefault() {
  divisionsState = [];
  usersState = [];
  documentsState = [];
  auditLogsState = [];
  envelopeLogsState = [];
  notificationsState = [];
  employeesState = [];
  directorySectionsState = [...DEFAULT_DIRECTORY_SECTIONS];
  saveDatabaseToFile();
}
function saveDatabaseToFile(queueSync = true) {
  if (IS_VERCEL) {
    if (queueSync) queueDatabaseSync();
    return;
  }
  try {
    const payload = {
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      divisions: divisionsState,
      users: usersState,
      documents: documentsState,
      auditLogs: auditLogsState,
      notifications: notificationsState,
      employees: employeesState,
      directorySections: directorySectionsState
    };
    const serialized = JSON.stringify(payload, null, 2).replace(/\u0410/g, "A").replace(/\u2014/g, "-");
    fs.writeFileSync(DB_FILE, serialized, "utf-8");
    if (queueSync) queueDatabaseSync();
  } catch (err) {
    console.error("[ERROR] Error saving database file:", err);
  }
}
function saveEnvelopeLogsToFile() {
  if (IS_VERCEL) {
    queueDatabaseSync();
    return;
  }
  fs.writeFileSync(
    ENVELOPE_LOG_DB_FILE,
    JSON.stringify(
      {
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        database: "BLGF Outgoing Envelope Dispatch Logs",
        logs: envelopeLogsState
      },
      null,
      2
    ),
    "utf-8"
  );
}
async function createApp() {
  initDatabaseStorage();
  ensureStorageDirectories();
  await connectMySQLReplica();
  const mysqlConnected = getMySQLReplicaStatus().connected;
  if (IS_VERCEL && !mysqlConnected) {
    throw new Error("MySQL connection is unavailable.");
  }
  if (mysqlConnected) {
    applyDatabaseState(await loadMySQLState());
  } else {
    console.warn(
      "MySQL is unavailable; using the local JSON data store for this development session."
    );
  }
  await ensureReservedSystemAdministrator();
  ensureUserEmployeeProfiles();
  ensureSeededAttachmentsExist();
  const initialSyncSucceeded = mysqlConnected;
  if (process.argv.includes("--sync-only")) {
    if (initialSyncSucceeded) {
      console.log(
        `Database sync complete: ${usersState.length} users, ${documentsState.length} documents, ${documentsState.reduce((count, document) => count + (document.routes?.length || 0), 0)} routes, ${documentsState.reduce((count, document) => count + (document.attachments?.length || 0), 0)} attachments, ${notificationsState.length} notifications, ${employeesState.length} employee profiles.`
      );
    } else {
      console.error(
        "Database sync did not run because no database is connected."
      );
      process.exitCode = 1;
    }
    await mysqlSyncQueue;
    await disconnectMySQLReplica();
    return;
  }
  const app = express3();
  app.use(cors());
  app.use(express3.json({ limit: "50mb" }));
  const getRequestUser = (req) => usersState.find(
    (user) => user.id === String(req.get("X-User-Id") || "") && user.active
  );
  app.use((_req, res, next) => {
    res.locals.getUsersState = () => usersState;
    res.locals.getDocumentsState = () => documentsState;
    res.locals.setDocumentsState = (docs) => {
      documentsState = docs;
    };
    res.locals.getNotificationsState = () => notificationsState;
    res.locals.setNotificationsState = (notifs) => {
      notificationsState = notifs;
    };
    next();
  });
  app.use((req, _res, next) => {
    if (req.path.startsWith("/api")) {
      console.log(`[API ${req.method}] ${req.path}`);
    }
    next();
  });
  app.use(
    "/api/documents",
    createDocumentsRouter(
      () => usersState,
      () => documentsState,
      (docs) => {
        documentsState = docs;
      },
      () => notificationsState,
      () => auditLogsState,
      (notifs) => {
        notificationsState = notifs;
      }
    )
  );
  app.use(
    "/api/users",
    createUsersRouter(
      () => usersState,
      (newUsers) => usersState = newUsers,
      () => auditLogsState,
      syncEmployeeProfileFromUser
    )
  );
  app.post(
    "/api/storage/upload/:kind",
    storageUpload.single("file"),
    async (req, res) => {
      const kind = req.params.kind;
      if (!Object.prototype.hasOwnProperty.call(STORAGE_DIRECTORIES, kind) || !req.file) {
        return res.status(400).json({ error: "Invalid storage type or file." });
      }
      const fileName = safeStorageFileName(req.file.originalname);
      fs.mkdirSync(STORAGE_DIRECTORIES[kind], { recursive: true });
      fs.writeFileSync(
        path.join(STORAGE_DIRECTORIES[kind], fileName),
        req.file.buffer
      );
      res.status(201).json({
        fileName,
        url: storageFileUrl(kind, fileName),
        fileData: req.file.buffer.toString("base64")
      });
    }
  );
  app.get("/api/storage/files/:kind/:fileName", async (req, res) => {
    const kind = req.params.kind;
    if (!Object.prototype.hasOwnProperty.call(STORAGE_DIRECTORIES, kind)) {
      return res.status(400).json({ error: "Invalid storage type." });
    }
    const rawFileName = req.params.fileName;
    const decodedFileName = decodeURIComponent(rawFileName);
    const baseName = path.basename(decodedFileName);
    const rawBaseName = path.basename(rawFileName);
    const target = path.join(STORAGE_DIRECTORIES[kind], baseName);
    const rawTarget = path.join(STORAGE_DIRECTORIES[kind], rawBaseName);
    if (fs.existsSync(target)) {
      return res.sendFile(target);
    }
    if (fs.existsSync(rawTarget)) {
      return res.sendFile(rawTarget);
    }
    const allAttachments = documentsState.flatMap((document) => [
      ...(document.attachments || []).map((candidate) => ({ ...candidate, doc: document })),
      ...(document.routes || []).flatMap(
        (route) => (route.attachments || []).map((candidate) => ({ ...candidate, doc: document }))
      )
    ]);
    const matching = allAttachments.find((candidate) => {
      const candidateUrl = candidate.url || "";
      const candidateName = decodeURIComponent(candidateUrl.split("/").pop() || "");
      const rawCandidateName = candidateUrl.split("/").pop() || "";
      return candidateName === baseName || rawCandidateName === rawBaseName || candidate.fileName === baseName || candidate.fileName === rawBaseName;
    });
    if (matching?.fileData && !matching.fileData.startsWith("/") && !matching.fileData.startsWith("http")) {
      try {
        const mimeType = matching.fileType || (baseName.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
        const buffer = Buffer.from(matching.fileData, "base64");
        try {
          fs.writeFileSync(target, buffer);
        } catch {
        }
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${baseName}"`);
        return res.send(buffer);
      } catch (err) {
        console.error("[STORAGE] Error decoding base64 attachment:", err);
      }
    }
    if (kind === "documentAttachments" && (baseName.toLowerCase().endsWith(".pdf") || rawBaseName.toLowerCase().endsWith(".pdf"))) {
      const doc = matching?.doc;
      const pdfTitle = matching?.fileName || baseName.replace(/^\d+_/, "").replace(/\.pdf$/i, "");
      const pdfBuf = generateOfficialPdfBuffer(pdfTitle, {
        trackingNumber: doc?.trackingNumber || "BLGF2-OFFICIAL-RECORD",
        category: doc?.category || "Official Document",
        date: doc?.createdAt ? new Date(doc.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }) : void 0,
        sender: doc?.originatingOffice || doc?.senderName || "Bureau of Local Government Finance - Regional Office No. II",
        recipient: doc?.destinationOffice || doc?.recipientName || "All Concerned Offices & Stakeholders",
        remarks: doc?.subject || "Official document attachment logged in BLGF Region II system.",
        status: "VERIFIED & AUTHENTICATED SYSTEM ATTACHMENT"
      });
      try {
        fs.mkdirSync(STORAGE_DIRECTORIES[kind], { recursive: true });
        fs.writeFileSync(target, pdfBuf);
        if (rawTarget !== target) fs.writeFileSync(rawTarget, pdfBuf);
      } catch {
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${baseName}"`);
      return res.send(pdfBuf);
    }
    if (baseName.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/) || rawBaseName.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/)) {
      const logoPath = path.join(process.cwd(), "frontend", "public", "blgflogo.jpg");
      if (fs.existsSync(logoPath)) {
        try {
          fs.mkdirSync(STORAGE_DIRECTORIES[kind], { recursive: true });
          fs.copyFileSync(logoPath, target);
        } catch {
        }
        return res.sendFile(logoPath);
      }
    }
    return res.status(404).json({ error: "Stored file not found." });
  });
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      system: "BLGF Region II Document Tracking System API",
      databaseLoaded: true,
      activeDatabase: mysqlConnected ? "mysql" : "local-json",
      mysql: getMySQLReplicaStatus(),
      recordsCount: {
        documents: documentsState.length,
        users: usersState.length,
        auditLogs: auditLogsState.length
      }
    });
  });
  app.post("/api/auth/login", (req, res) => {
    const username = String(req.body?.username ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }
    const matchingUsers = usersState.filter(
      (u) => String(u.username ?? "").trim().toLowerCase() === username || String(u.email ?? "").trim().toLowerCase() === username
    );
    if (!matchingUsers.length) {
      return res.status(401).json({ error: "User account not found" });
    }
    if (!matchingUsers.some((user2) => user2.active)) {
      return res.status(403).json({ error: "Account is deactivated. Contact Admin." });
    }
    const user = matchingUsers.find(
      (candidate) => candidate.active && typeof candidate.password === "string" && candidate.password === password
    );
    if (!user) {
      return res.status(401).json({ error: "Incorrect password." });
    }
    if (user.temporaryPasswordExpiresAt && new Date(user.temporaryPasswordExpiresAt).getTime() <= Date.now()) {
      return res.status(401).json({
        error: "Temporary password expired. Request a new temporary password."
      });
    }
    addAuditLog(auditLogsState, {
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: "LOGIN",
      details: `User ${user.fullName} (${user.role}) logged in successfully.`,
      ipAddress: req.ip || "127.0.0.1"
    });
    const {
      password: _password,
      temporaryPasswordExpiresAt: _temporaryPasswordExpiresAt,
      ...safeUser
    } = user;
    return res.json({ user: safeUser });
  });
  app.post("/api/auth/forgot-admin-password", async (req, res) => {
    const identifier = String(req.body?.identifier || "").trim().toLowerCase();
    if (!identifier) {
      return res.status(400).json({
        error: "Administrator username or email is required."
      });
    }
    const matchingAdministrators = usersState.filter(
      (user) => user.role === "SYSTEM_ADMIN" && user.active && (user.username.trim().toLowerCase() === identifier || user.email.trim().toLowerCase() === identifier)
    );
    const administrator = matchingAdministrators.find(
      (user) => user.username.trim().toLowerCase() === identifier
    ) || matchingAdministrators[0];
    if (!administrator) {
      return res.status(404).json({
        error: "No active administrator account matches that username or email."
      });
    }
    if (!administrator.email?.trim()) {
      return res.status(400).json({
        error: "This administrator account does not have an email address."
      });
    }
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPassword = process.env.SMTP_PASSWORD?.replace(/\s+/g, "");
    if (!smtpHost || !smtpUser || !smtpPassword) {
      return res.status(503).json({
        error: "Password-reset email is not configured on the server."
      });
    }
    const lastRequest = adminPasswordResetRequests.get(administrator.id) || 0;
    if (Date.now() - lastRequest < ADMIN_PASSWORD_RESET_COOLDOWN_MS) {
      return res.status(429).json({
        error: "A temporary password was recently sent. Please wait 15 minutes before trying again."
      });
    }
    const temporaryPassword = `BLGF-${crypto.randomBytes(9).toString("base64url")}`;
    const temporaryPasswordExpiresAt = new Date(
      Date.now() + TEMPORARY_PASSWORD_VALIDITY_MS
    );
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE !== "false" && smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      },
      connectionTimeout: 1e4,
      greetingTimeout: 1e4,
      socketTimeout: 2e4
    });
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: administrator.email,
        subject: "BLGF Document Tracking System temporary password",
        text: [
          `Hello ${administrator.fullName},`,
          "",
          "A password reset was requested for your administrator account.",
          `Username: ${administrator.username}`,
          `Temporary password: ${temporaryPassword}`,
          "This temporary password is valid for 5 minutes only.",
          "",
          "Sign in with this temporary password, then change it immediately in User Settings.",
          "If you did not request this reset, contact your system administrator."
        ].join("\n")
      });
      administrator.password = temporaryPassword;
      administrator.temporaryPasswordExpiresAt = temporaryPasswordExpiresAt.toISOString();
      try {
        await updateUserPassword(
          administrator.id,
          temporaryPassword,
          temporaryPasswordExpiresAt
        );
      } catch (databaseError) {
        console.error(
          "Temporary password email was sent but MySQL update failed:",
          databaseError
        );
        return res.status(503).json({
          error: "The email was sent, but the database could not save the temporary password. Request another reset after the database connection is restored.",
          existingPasswordChanged: false
        });
      }
      adminPasswordResetRequests.set(administrator.id, Date.now());
      addAuditLog(auditLogsState, {
        userId: administrator.id,
        userName: administrator.fullName,
        userRole: administrator.role,
        action: "UPDATE_USER",
        details: `A temporary password was emailed to administrator ${administrator.username}.`,
        ipAddress: req.ip || "127.0.0.1"
      });
      return res.json({
        message: `A temporary password was sent to ${administrator.email} for username ${administrator.username}.`
      });
    } catch (error) {
      console.error(
        "Could not send administrator password-reset email:",
        error
      );
      const smtpError = error;
      const authenticationFailed = smtpError.code === "EAUTH" || smtpError.responseCode === 535;
      const connectionFailed = [
        "ECONNECTION",
        "ETIMEDOUT",
        "ESOCKET",
        "ECONNREFUSED"
      ].includes(String(smtpError.code || ""));
      return res.status(502).json({
        error: authenticationFailed ? "Gmail rejected the SMTP login. Use a Google App Password for SMTP_PASSWORD, not the Gmail account password." : connectionFailed ? "The email server could not be reached. Check SMTP_HOST, SMTP_PORT, and SMTP_SECURE." : "The temporary password email could not be sent. Check the recipient and SMTP_FROM settings.",
        code: smtpError.code || "SMTP_SEND_FAILED",
        existingPasswordChanged: false
      });
    }
  });
  app.get("/api/records/folders", (_req, res) => {
    const metadata = readRecordMetadata();
    const folders = RECORD_CATEGORIES.map((category) => {
      const categoryDir = path.join(RECORDS_ROOT_DIR, category);
      const files = fs.existsSync(categoryDir) ? fs.readdirSync(categoryDir).filter(
        (name) => RECORD_FILE_EXTENSIONS.includes(path.extname(name).toLowerCase())
      ).map((name) => {
        const fullPath = path.join(categoryDir, name);
        const stats = fs.statSync(fullPath);
        return {
          name,
          size: stats.size,
          updatedAt: stats.mtime.toISOString(),
          metadata: metadata[recordMetadataKey(category, name)] || null
        };
      }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : [];
      return {
        name: category,
        count: files.length,
        files
      };
    });
    res.json({ folders });
  });
  app.post("/api/records/folders", (req, res) => {
    const name = String(req.body?.name || "").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
    if (!name) return res.status(400).json({ error: "Enter a folder name." });
    if (!RECORD_CATEGORIES.includes(name)) RECORD_CATEGORIES.push(name);
    fs.mkdirSync(path.join(RECORDS_ROOT_DIR, name), { recursive: true });
    res.status(201).json({ name, path: path.join(RECORDS_ROOT_DIR, name) });
  });
  app.put("/api/records/folders/:name", (req, res) => {
    const oldName = String(req.params.name || "").toLowerCase();
    const nextName = String(req.body?.name || "").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
    if (!RECORD_CATEGORIES.includes(oldName) || !nextName)
      return res.status(400).json({ error: "Invalid folder name." });
    const oldPath = path.join(RECORDS_ROOT_DIR, oldName);
    const nextPath = path.join(RECORDS_ROOT_DIR, nextName);
    if (fs.existsSync(nextPath))
      return res.status(409).json({ error: "A folder with that name already exists." });
    fs.renameSync(oldPath, nextPath);
    RECORD_CATEGORIES = RECORD_CATEGORIES.map(
      (item) => item === oldName ? nextName : item
    );
    res.json({ name: nextName });
  });
  app.delete("/api/records/folders/:name", (req, res) => {
    const name = String(req.params.name || "").toLowerCase();
    if (!RECORD_CATEGORIES.includes(name) || ["memo", "letter", "circular", "report", "other"].includes(name))
      return res.status(400).json({ error: "This system folder cannot be deleted." });
    const target = path.join(RECORDS_ROOT_DIR, name);
    fs.rmSync(target, { recursive: true, force: true });
    RECORD_CATEGORIES = RECORD_CATEGORIES.filter((item) => item !== name);
    res.json({ success: true });
  });
  app.get(
    "/api/records/storage",
    (_req, res) => res.json({ path: RECORDS_ROOT_DIR })
  );
  app.get("/api/records/:category/:fileName", (req, res) => {
    const category = String(req.params.category || "").toLowerCase();
    const fileName = path.basename(String(req.params.fileName || ""));
    if (!RECORD_CATEGORIES.includes(category) || !RECORD_FILE_EXTENSIONS.includes(path.extname(fileName).toLowerCase())) {
      return res.status(400).json({ error: "Invalid records file request." });
    }
    const targetFile = path.join(RECORDS_ROOT_DIR, category, fileName);
    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: "Record file not found." });
    }
    res.sendFile(targetFile);
  });
  app.put("/api/records/:category/:fileName", (req, res) => {
    const category = String(req.params.category || "").toLowerCase();
    const oldFileName = path.basename(String(req.params.fileName || ""));
    const requestedName = path.basename(String(req.body?.name || "")).trim();
    const oldExtension = path.extname(oldFileName).toLowerCase();
    const requestedExtension = path.extname(requestedName).toLowerCase();
    if (!RECORD_CATEGORIES.includes(category) || !RECORD_FILE_EXTENSIONS.includes(oldExtension) || !requestedName) {
      return res.status(400).json({ error: "Invalid file rename request." });
    }
    if (requestedExtension && requestedExtension !== oldExtension) {
      return res.status(400).json({ error: "The file extension cannot be changed." });
    }
    const safeBaseName = path.basename(requestedName, requestedExtension || oldExtension).replace(/[^a-zA-Z0-9._ -]/g, "_").trim();
    if (!safeBaseName) {
      return res.status(400).json({ error: "Enter a valid file name." });
    }
    const nextFileName = `${safeBaseName}${oldExtension}`;
    const oldPath = path.join(RECORDS_ROOT_DIR, category, oldFileName);
    const nextPath = path.join(RECORDS_ROOT_DIR, category, nextFileName);
    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ error: "Record file not found." });
    }
    if (oldPath !== nextPath && fs.existsSync(nextPath)) {
      return res.status(409).json({ error: "A file with that name already exists." });
    }
    fs.renameSync(oldPath, nextPath);
    const metadata = readRecordMetadata();
    const oldKey = recordMetadataKey(category, oldFileName);
    const nextKey = recordMetadataKey(category, nextFileName);
    if (metadata[oldKey]) {
      metadata[nextKey] = metadata[oldKey];
      delete metadata[oldKey];
      writeRecordMetadata(metadata);
    }
    res.json({ success: true, fileName: nextFileName });
  });
  app.delete("/api/records/:category/:fileName", (req, res) => {
    const category = String(req.params.category || "").toLowerCase();
    const fileName = path.basename(String(req.params.fileName || ""));
    if (!RECORD_CATEGORIES.includes(category) || !RECORD_FILE_EXTENSIONS.includes(path.extname(fileName).toLowerCase())) {
      return res.status(400).json({ error: "Invalid file delete request." });
    }
    const targetFile = path.join(RECORDS_ROOT_DIR, category, fileName);
    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: "Record file not found." });
    }
    fs.unlinkSync(targetFile);
    const metadata = readRecordMetadata();
    delete metadata[recordMetadataKey(category, fileName)];
    writeRecordMetadata(metadata);
    res.json({ success: true });
  });
  app.post("/api/records/upload", (req, res) => {
    const category = String(req.body?.category || "other").toLowerCase();
    const originalName = path.basename(String(req.body?.fileName || ""));
    const extension = path.extname(originalName).toLowerCase();
    const content = String(req.body?.content || "");
    if (!RECORD_CATEGORIES.includes(category) || !RECORD_FILE_EXTENSIONS.includes(extension)) {
      return res.status(400).json({ error: "Unsupported folder or file type." });
    }
    if (!content || content.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "File is missing or too large." });
    }
    const safeBaseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9._ -]/g, "_").trim() || "record";
    const fileName = `${Date.now()}_${safeBaseName}${extension}`;
    const targetFile = path.join(RECORDS_ROOT_DIR, category, fileName);
    try {
      fs.writeFileSync(targetFile, Buffer.from(content, "base64"));
      res.status(201).json({
        success: true,
        category,
        fileName,
        storedIn: "records-management"
      });
    } catch (error) {
      console.error("Record file upload failed:", error);
      res.status(500).json({ error: "Could not save the file." });
    }
  });
  app.post(
    "/api/records/upload-file",
    recordUpload.single("file"),
    (req, res) => {
      const category = String(req.body?.category || "other").toLowerCase();
      const file = req.file;
      if (!file || !RECORD_CATEGORIES.includes(category))
        return res.status(400).json({ error: "Choose a valid folder and file." });
      const extension = path.extname(file.originalname).toLowerCase();
      if (!RECORD_FILE_EXTENSIONS.includes(extension)) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: "Unsupported file type." });
      }
      const title = String(req.body?.title || "").replace(/[^a-zA-Z0-9._ -]/g, "_").trim();
      const safeName = (title || path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9._ -]/g, "_").trim() || "record") + extension;
      const fileName = `${Date.now()}_${safeName}`;
      fs.renameSync(file.path, path.join(RECORDS_ROOT_DIR, category, fileName));
      const metadata = readRecordMetadata();
      metadata[recordMetadataKey(category, fileName)] = {
        subject: String(req.body?.subject || "").trim(),
        source: String(req.body?.source || "").trim(),
        signatory: String(req.body?.signatory || "").trim(),
        remarks: String(req.body?.remarks || "").trim()
      };
      writeRecordMetadata(metadata);
      res.status(201).json({
        success: true,
        fileName,
        storedIn: path.join(RECORDS_ROOT_DIR, category)
      });
    }
  );
  app.post("/api/records/save", (req, res) => {
    const body = req.body || {};
    const category = (body.category || "other").toLowerCase();
    const safeCategory = RECORD_CATEGORIES.includes(category) ? category : "other";
    const fileNameBase = String(body.fileName || body.title || body.trackingNumber || "record").replace(/[^a-zA-Z0-9\-_ ]/g, "").trim().replace(/\s+/g, "_") || "record";
    const trackingNumber = String(body.trackingNumber || "BLGF-RECORD").replace(
      /[^a-zA-Z0-9\-_]/g,
      ""
    );
    const fileName = `${trackingNumber}_${fileNameBase}.html`;
    const targetDir = path.join(RECORDS_ROOT_DIR, safeCategory);
    const targetFile = path.join(targetDir, fileName);
    const escapeHtml = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(trackingNumber)} - ${escapeHtml(body.title || fileNameBase)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
    .meta { margin-bottom: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; }
    .meta div { margin: 4px 0; }
    .content { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h2>BLGF Records Management File</h2>
  <div class="meta">
    <div><strong>Category:</strong> ${escapeHtml(safeCategory)}</div>
    <div><strong>Document Route No.:</strong> ${escapeHtml(trackingNumber)}</div>
    <div><strong>Title:</strong> ${escapeHtml(body.title || "")}</div>
    <div><strong>Subject:</strong> ${escapeHtml(body.subject || "")}</div>
    <div><strong>Saved On:</strong> ${(/* @__PURE__ */ new Date()).toISOString()}</div>
  </div>
  <div class="content">${escapeHtml(body.content)}</div>
</body>
</html>`;
    fs.writeFileSync(targetFile, html, "utf-8");
    res.json({
      success: true,
      category: safeCategory,
      path: targetFile,
      fileName,
      url: `/api/records/${safeCategory}/${encodeURIComponent(fileName)}`,
      storedIn: "records-management"
    });
  });
  app.get("/api/stats", (_req, res) => {
    const totalIncoming = documentsState.filter(
      (d) => d.direction === "INCOMING"
    ).length;
    const totalOutgoing = documentsState.filter(
      (d) => d.direction === "OUTGOING"
    ).length;
    const pendingCount = documentsState.filter(
      (d) => d.currentStatus === "PENDING"
    ).length;
    const inProgressCount = documentsState.filter(
      (d) => d.currentStatus === "IN_PROGRESS"
    ).length;
    const completedCount = documentsState.filter(
      (d) => d.currentStatus === "COMPLETED"
    ).length;
    const urgentCount = documentsState.filter(
      (d) => d.priority === "URGENT" || d.priority === "VERY_URGENT"
    ).length;
    const returnedCount = documentsState.filter(
      (d) => d.currentStatus === "RETURNED"
    ).length;
    const divMap = {};
    divisionsState.forEach((d) => {
      divMap[d.code] = 0;
    });
    documentsState.forEach((doc) => {
      divMap[doc.currentDivision] = (divMap[doc.currentDivision] || 0) + 1;
    });
    const divisionBreakdown = Object.entries(divMap).map(([code, count]) => ({
      division: code,
      count
    }));
    const statusMap = {
      PENDING: 0,
      IN_PROGRESS: 0,
      FOR_SIGNATURE: 0,
      COMPLETED: 0,
      RETURNED: 0,
      ON_HOLD: 0
    };
    documentsState.forEach((d) => {
      statusMap[d.currentStatus] = (statusMap[d.currentStatus] || 0) + 1;
    });
    const statusBreakdown = [
      {
        status: "COMPLETED",
        label: "Completed",
        count: statusMap.COMPLETED,
        color: "#10b981"
      },
      {
        status: "IN_PROGRESS",
        label: "In Progress",
        count: statusMap.IN_PROGRESS,
        color: "#3b82f6"
      },
      {
        status: "FOR_SIGNATURE",
        label: "For Signature",
        count: statusMap.FOR_SIGNATURE,
        color: "#6366f1"
      },
      {
        status: "PENDING",
        label: "Pending",
        count: statusMap.PENDING,
        color: "#f59e0b"
      },
      {
        status: "RETURNED",
        label: "Returned",
        count: statusMap.RETURNED,
        color: "#f43f5e"
      },
      {
        status: "ON_HOLD",
        label: "On Hold",
        count: statusMap.ON_HOLD,
        color: "#ea580c"
      }
    ];
    res.json({
      totalIncoming,
      totalOutgoing,
      pendingCount,
      inProgressCount,
      completedCount,
      urgentCount,
      returnedCount,
      avgTurnaroundHours: 18.5,
      divisionBreakdown,
      statusBreakdown,
      recentActivity: auditLogsState.slice(0, 8)
    });
  });
  app.get("/api/divisions", (_req, res) => {
    res.json(divisionsState);
  });
  app.post("/api/divisions", (req, res) => {
    const code = String(req.body.code || "").trim().toUpperCase();
    const name = String(req.body.name || "").trim();
    const chiefName = String(req.body.chiefName || "").trim();
    if (!code || !name || !chiefName) {
      return res.status(400).json({
        error: "Division code, name, and division head are required."
      });
    }
    if (divisionsState.some((division2) => division2.code === code)) {
      return res.status(409).json({ error: "Division code already exists." });
    }
    const division = {
      id: `div-${randomUUID4()}`,
      code,
      name,
      chiefName,
      email: String(req.body.email || "").trim()
    };
    divisionsState.push(division);
    saveDatabaseToFile();
    res.status(201).json(division);
  });
  app.put("/api/divisions/:id", (req, res) => {
    const index = divisionsState.findIndex(
      (division) => division.id === req.params.id
    );
    if (index === -1)
      return res.status(404).json({ error: "Division not found." });
    const code = String(req.body.code || divisionsState[index].code).trim().toUpperCase();
    const name = String(req.body.name || divisionsState[index].name).trim();
    const chiefName = String(
      req.body.chiefName || divisionsState[index].chiefName
    ).trim();
    if (!code || !name || !chiefName) {
      return res.status(400).json({
        error: "Division code, name, and division head are required."
      });
    }
    if (divisionsState.some(
      (division, divisionIndex) => divisionIndex !== index && division.code === code
    )) {
      return res.status(409).json({ error: "Division code already exists." });
    }
    divisionsState[index] = {
      id: divisionsState[index].id,
      code,
      name,
      chiefName,
      email: String(req.body.email ?? divisionsState[index].email).trim()
    };
    saveDatabaseToFile();
    res.json(divisionsState[index]);
  });
  app.delete("/api/divisions/:id", (req, res) => {
    const originalLength = divisionsState.length;
    divisionsState = divisionsState.filter(
      (division) => division.id !== req.params.id
    );
    if (divisionsState.length === originalLength) {
      return res.status(404).json({ error: "Division not found." });
    }
    saveDatabaseToFile();
    res.json({ success: true });
  });
  app.get("/api/audit-logs", (_req, res) => {
    res.json(auditLogsState);
  });
  app.delete("/api/audit-logs", async (_req, res) => {
    const deletedCount = auditLogsState.length;
    auditLogsState = [];
    await deleteAuditLogsDirect();
    res.json({
      success: true,
      deletedCount,
      message: "System audit records were deleted. Envelope logs were preserved."
    });
  });
  app.post("/api/audit-logs", (req, res) => {
    const body = req.body || {};
    const actingUser = getRequestUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    const log = addAuditLog(auditLogsState, {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: body.action || "ENVELOPE_LOG",
      documentTrackingNumber: body.documentTrackingNumber,
      details: body.details || "System activity recorded.",
      ipAddress: req.ip || "127.0.0.1"
    });
    res.status(201).json(log);
  });
  app.get("/api/envelope-logs", (_req, res) => {
    res.json(envelopeLogsState);
  });
  app.post("/api/envelope-logs", async (req, res) => {
    const body = req.body || {};
    const actingUser = getRequestUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    const log = {
      id: `envelope-log-${randomUUID4()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: "ENVELOPE_LOG",
      documentTrackingNumber: body.documentTrackingNumber,
      details: body.details || "Outgoing envelope dispatched.",
      ipAddress: req.ip || "127.0.0.1"
    };
    envelopeLogsState.unshift(log);
    await saveEnvelopeLogDirect(log);
    res.status(201).json(log);
  });
  app.delete("/api/envelope-logs", async (_req, res) => {
    const deletedCount = envelopeLogsState.length;
    envelopeLogsState = [];
    await deleteEnvelopeLogsDirect();
    res.json({ success: true, deletedCount });
  });
  app.get("/api/notifications", async (req, res) => {
    const userId = typeof req.query.userId === "string" ? req.query.userId : "";
    if (!userId) return res.json([]);
    const requestingUser = getRequestUser(req);
    if (!requestingUser || requestingUser.id !== userId) {
      return res.status(403).json({ error: "Notification access denied." });
    }
    const notificationPermissions = requestingUser.permissions?.allowedActions || DEFAULT_ROLE_PERMISSIONS[requestingUser.role]?.allowedActions || [];
    const canViewAllTransactionNotifications = requestingUser.permissions?.notificationViewAllConfigured === true ? notificationPermissions.includes("NOTIFICATION_VIEW_ALL") : (DEFAULT_ROLE_PERMISSIONS[requestingUser.role]?.allowedActions || []).includes("NOTIFICATION_VIEW_ALL");
    const storedNotifications = notificationsState.filter(
      (notification) => notification.userId === userId
    );
    const globalTransactionNotifications = canViewAllTransactionNotifications ? auditLogsState.filter(
      (log) => Boolean(log.documentTrackingNumber) && ["CREATE_DOC", "ROUTE_DOC", "TRANSFER_DOC", "UPDATE_STATUS"].includes(
        log.action
      )
    ).map((log) => {
      const decision = log.details.match(
        /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i
      )?.[1]?.toUpperCase();
      const status2 = log.details.match(/Status:\s*([^|]+)/i)?.[1]?.trim();
      const recipient = log.details.match(/To:\s*([^|]+)/i)?.[1]?.trim();
      const title = decision === "APPROVED" ? `Approved by ${log.userName}` : decision === "DISAPPROVED" ? `Disapproved by ${log.userName}` : status2 === "COMPLETED" ? `Document Completed by ${log.userName}` : log.action === "CREATE_DOC" ? `Document Logged by ${log.userName}` : `Document Routed by ${log.userName}`;
      const message = decision ? `${log.documentTrackingNumber} was ${decision.toLowerCase()} by ${log.userName}.${decision === "DISAPPROVED" ? ` Reason: ${log.details.match(/Remarks:\s*([^|]+)/i)?.[1]?.trim() || "No reason provided."}` : ""}` : `${log.documentTrackingNumber} - ${title}${recipient ? ` to ${recipient}` : ""}${status2 ? ` (${status2.replaceAll("_", " ")})` : ""}.`;
      return {
        id: `transaction-activity-${log.id}`,
        userId,
        title,
        message,
        trackingNumber: log.documentTrackingNumber,
        documentId: documentsState.find(
          (document) => document.trackingNumber === log.documentTrackingNumber || document.routeNo === log.documentTrackingNumber
        )?.id,
        type: decision === "DISAPPROVED" ? "URGENT" : "INFO",
        requiresDecision: false,
        decisionStatus: decision === "APPROVED" || decision === "DISAPPROVED" ? decision : void 0,
        createdAt: log.timestamp
      };
    }) : [];
    try {
      const liveNotifications = await getLiveDisplayNotifications(userId);
      if (liveNotifications) {
        return res.json([
          ...globalTransactionNotifications,
          ...storedNotifications,
          ...liveNotifications.filter(
            (notification) => !storedNotifications.some(
              (stored) => stored.id === notification.id
            )
          )
        ]);
      }
    } catch (error) {
      console.warn(
        "Live notification query failed; using in-memory routes:",
        error
      );
    }
    const user = usersState.find((candidate) => candidate.id === userId);
    if (!user) return res.json([]);
    const activeNotifications = documentsState.flatMap(
      (document) => {
        const routes = [...document.routes || []].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const assignedRoutes = routes.filter(
          (route) => route.toUserId === user.id || !route.toUserId && route.toUser?.trim().toLowerCase() === user.fullName.trim().toLowerCase()
        );
        const assignedRoute = assignedRoutes.at(-1);
        if (!assignedRoute) return [];
        const assignedAt = new Date(assignedRoute.createdAt).getTime();
        const decisionText = `${assignedRoute.actionRequested || ""} ${assignedRoute.remarks || ""}`.toUpperCase();
        const decisionStatus = decisionText.includes("DISAPPROVED") ? "DISAPPROVED" : decisionText.includes("APPROVED") ? "APPROVED" : void 0;
        const isDecisionResult = Boolean(decisionStatus);
        if (isDecisionResult && Date.now() - assignedAt >= 24 * 60 * 60 * 1e3) {
          return [];
        }
        const userAlreadyActed = routes.some(
          (route) => (route.fromUserId === user.id || !route.fromUserId && route.fromUser?.trim().toLowerCase() === user.fullName.trim().toLowerCase()) && new Date(route.createdAt).getTime() > assignedAt
        ) || auditLogsState.some(
          (log) => log.documentTrackingNumber === document.trackingNumber && log.userId === user.id && new Date(log.timestamp).getTime() > assignedAt && ["ROUTE_DOC", "TRANSFER_DOC", "UPDATE_STATUS"].includes(log.action)
        );
        if (userAlreadyActed || document.currentStatus === "COMPLETED")
          return [];
        return [
          {
            id: `route-alert-${user.id}-${assignedRoute.id}`,
            userId: user.id,
            title: decisionStatus === "APPROVED" ? `Approved by ${assignedRoute.fromUser}` : decisionStatus === "DISAPPROVED" ? `Disapproved by ${assignedRoute.fromUser}` : "Document Routed to You",
            message: decisionStatus === "APPROVED" ? `Document ${document.routeNo || document.trackingNumber} was APPROVED by ${assignedRoute.fromUser} and will proceed to routing.` : decisionStatus === "DISAPPROVED" ? `Document ${document.routeNo || document.trackingNumber} was DISAPPROVED by ${assignedRoute.fromUser}. Reason: ${assignedRoute.remarks || "No reason provided."}` : `Document ${document.routeNo || document.trackingNumber} (${document.title}) requires your approval.`,
            documentId: document.id,
            trackingNumber: document.routeNo || document.trackingNumber,
            type: "ACTION_REQUIRED",
            requiresDecision: false,
            decisionStatus,
            createdAt: assignedRoute.createdAt
          }
        ];
      }
    );
    res.json([
      ...globalTransactionNotifications,
      ...storedNotifications,
      ...activeNotifications
    ]);
  });
  app.post("/api/notifications/reminder", (req, res) => {
    const actingUser = getRequestUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    const allowedActions = actingUser.permissions?.allowedActions || DEFAULT_ROLE_PERMISSIONS[actingUser.role]?.allowedActions || [];
    if (actingUser.role !== "SYSTEM_ADMIN" && !allowedActions.includes("ROUTING_REMINDER_SEND")) {
      return res.status(403).json({ error: "Reminder access is not enabled for this role." });
    }
    const document = documentsState.find(
      (candidate) => candidate.id === String(req.body.documentId || "")
    );
    const recipient = usersState.find(
      (candidate) => candidate.id === String(req.body.recipientUserId || "") && candidate.active && candidate.role !== "SYSTEM_ADMIN" && candidate.divisionCode !== "ITMS"
    );
    const message = String(req.body.message || "").trim();
    if (!document || !recipient) {
      return res.status(400).json({ error: "Select a valid document handler." });
    }
    if (!message) {
      return res.status(400).json({ error: "Enter a reminder message." });
    }
    const reminder = createNotification({
      userId: recipient.id,
      title: "Routing Action Reminder",
      message: `${message} - Sent by ${actingUser.fullName}`,
      documentId: document.id,
      trackingNumber: document.routeNo || document.trackingNumber,
      type: "URGENT",
      requiresDecision: false,
      reminderSenderName: actingUser.fullName,
      reminderHandlerName: recipient.fullName,
      reminderActionRequested: String(req.body.actionRequested || "").trim() || "Appropriate Action"
    });
    notificationsState.unshift(reminder);
    addAuditLog(auditLogsState, {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: "UPDATE_STATUS",
      documentTrackingNumber: document.trackingNumber,
      details: `Routing reminder sent to ${recipient.fullName} | Message: ${message}`,
      ipAddress: req.ip || "127.0.0.1"
    });
    saveDatabaseToFile();
    res.status(201).json(reminder);
  });
  app.delete("/api/notifications/:id", (_req, res) => {
    res.json({ success: true });
  });
  app.get("/api/employees", (req, res) => {
    const actingUser = getRequestUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: "Active database user required." });
    }
    ensureUserEmployeeProfiles();
    res.json(
      actingUser.role === "SYSTEM_ADMIN" ? employeesState : employeesState.filter(
        (employee) => employee.userId === actingUser.id
      )
    );
  });
  const canManageEmployees = (req) => {
    const user = getRequestUser(req);
    if (!user) return false;
    const actions = (user.permissions || DEFAULT_ROLE_PERMISSIONS[user.role]).allowedActions || [];
    return user.role === "SYSTEM_ADMIN" || actions.some(
      (action) => ["EMPLOYEE_CREATE", "EMPLOYEE_EDIT", "EMPLOYEE_DELETE"].includes(action)
    );
  };
  app.post("/api/employees", (req, res) => {
    if (!canManageEmployees(req)) {
      return res.status(403).json({ error: "Personnel management permission required." });
    }
    const body = req.body;
    const newEmp = {
      id: `emp-${randomUUID4()}`,
      userId: body.userId || void 0,
      fullName: body.fullName,
      position: body.position,
      office: body.office,
      officeType: body.officeType || "BLGF",
      divisionCode: body.divisionCode || void 0,
      email: body.email,
      contactNo: body.contactNo || "",
      address: body.address || "",
      active: body.active !== void 0 ? body.active : true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    employeesState.push(newEmp);
    saveDatabaseToFile();
    res.status(201).json(newEmp);
  });
  app.put("/api/employees/:id", (req, res) => {
    const idx = employeesState.findIndex((e) => e.id === req.params.id);
    if (idx === -1)
      return res.status(404).json({ error: "Employee not found" });
    const actingUser = getRequestUser(req);
    const actions = (actingUser?.permissions || (actingUser ? DEFAULT_ROLE_PERMISSIONS[actingUser.role] : void 0))?.allowedActions || [];
    const folderOnlyUpdate = Object.keys(req.body || {}).every(
      (key) => key === "folders"
    );
    const canUpdateFolders = Boolean(
      actingUser && folderOnlyUpdate && (actingUser.role === "SYSTEM_ADMIN" || actions.includes("EMPLOYEE_FOLDER_MANAGE") || employeesState[idx].userId === actingUser.id)
    );
    if (!canManageEmployees(req) && !canUpdateFolders) {
      return res.status(403).json({ error: "Personnel management permission required." });
    }
    employeesState[idx] = { ...employeesState[idx], ...req.body };
    if (employeesState[idx].userId && !folderOnlyUpdate && actingUser?.role === "SYSTEM_ADMIN") {
      const uIdx = usersState.findIndex((u) => u.id === employeesState[idx].userId);
      if (uIdx >= 0) {
        if (req.body.fullName) usersState[uIdx].fullName = req.body.fullName;
        if (req.body.position) usersState[uIdx].designation = req.body.position;
        if (req.body.contactNo !== void 0) usersState[uIdx].contactNo = req.body.contactNo;
        if (req.body.divisionCode) usersState[uIdx].divisionCode = req.body.divisionCode;
        void saveUserDirect(usersState[uIdx]).catch(() => null);
      }
    }
    saveDatabaseToFile();
    res.json(employeesState[idx]);
  });
  app.delete("/api/employees/:id", (req, res) => {
    if (getRequestUser(req)?.role !== "SYSTEM_ADMIN") {
      return res.status(403).json({ error: "System Administrator access required." });
    }
    const idx = employeesState.findIndex((e) => e.id === req.params.id);
    if (idx === -1)
      return res.status(404).json({ error: "Employee not found" });
    if (employeesState[idx].userId) {
      return res.status(400).json({
        error: "Cannot delete static personnel linked to an active User Account. Only manually added personnel in Office Directory can be deleted."
      });
    }
    employeesState.splice(idx, 1);
    saveDatabaseToFile();
    res.json({ success: true, message: "Employee deleted" });
  });
  app.get("/api/directory-sections", (_req, res) => {
    if (!directorySectionsState || directorySectionsState.length === 0) {
      directorySectionsState = [...DEFAULT_DIRECTORY_SECTIONS];
    }
    res.json(directorySectionsState);
  });
  const handleSaveSections = (req, res) => {
    const actingUser = getRequestUser(req);
    if (!actingUser || actingUser.role !== "SYSTEM_ADMIN" && !canManageEmployees(req)) {
      return res.status(403).json({ error: "Permission denied to modify directory sections." });
    }
    const nextSections = Array.isArray(req.body) ? req.body : req.body?.sections;
    if (!Array.isArray(nextSections) || nextSections.length === 0) {
      return res.status(400).json({ error: "Invalid directory sections format." });
    }
    directorySectionsState = nextSections;
    saveDatabaseToFile();
    res.json({ success: true, directorySections: directorySectionsState });
  };
  app.post("/api/directory-sections", handleSaveSections);
  app.put("/api/directory-sections", handleSaveSections);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });
  if (IS_VERCEL) return app;
  const distPath = path.join(process.cwd(), "dist", "frontend");
  app.use(express3.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  let activePort = PORT;
  const maxPort = process.env.PORT ? PORT : PORT + 10;
  while (true) {
    try {
      await new Promise((resolve, reject) => {
        const server = app.listen(activePort, "0.0.0.0");
        server.once("listening", resolve);
        server.once("error", reject);
      });
      break;
    } catch (error) {
      const code = error.code;
      const canRetry = !process.env.PORT && (code === "EACCES" || code === "EADDRINUSE") && activePort < maxPort;
      if (!canRetry) {
        throw error;
      }
      console.warn(
        `Port ${activePort} is unavailable (${code}); trying ${activePort + 1}.`
      );
      activePort += 1;
    }
  }
  console.log(`=======================================================`);
  console.log(`BLGF REGION II DOCUMENT TRACKING SYSTEM SERVER RUNNING`);
  console.log(`URL: http://localhost:${activePort}`);
  console.log(`=======================================================`);
  return app;
}
if (!IS_VERCEL) {
  createApp().catch((error) => {
    console.error("Server failed to start:", error);
    process.exitCode = 1;
  });
}

// backend/vercel-handler.ts
var appPromise;
async function handler(req, res) {
  try {
    if (req.query.path !== void 0) {
      const requestedPath = String(req.query.path).replace(/^\/+/, "");
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (key === "path") continue;
        if (Array.isArray(value)) {
          value.forEach((item) => query.append(key, String(item)));
        } else if (value !== void 0) {
          query.append(key, String(value));
        }
      }
      req.url = `/api/${requestedPath}${query.size ? `?${query}` : ""}`;
    }
    appPromise ??= createApp();
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error("Backend initialization failed:", error);
    appPromise = void 0;
    return res.status(500).json({
      error: "Backend initialization failed.",
      detail: error instanceof Error ? error.message : "Unknown startup error"
    });
  }
}
export {
  handler as default
};
