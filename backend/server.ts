import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createUsersRouter } from './users.js';
import { createDocumentsRouter } from './documents.js';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import nodemailer from 'nodemailer';
import {
  connectMySQLReplica,
  disconnectMySQLReplica,
  getLiveDisplayNotifications,
  loadMySQLState,
  syncMySQLReplica,
  saveAuditLogDirect,
  saveEnvelopeLogDirect,
  deleteAuditLogsDirect,
  deleteEnvelopeLogsDirect,
  updateUserPassword,
  saveUserDirect,
  getMySQLReplicaStatus,
} from './mysqlReplica.js';
import {
  User,
  Division,
  DocumentRecord,
  AuditLog,
  NotificationItem,
  DocumentStatus,
  DocumentRouteStep,
  EmployeeProfile,
  EmployeeFolderRecord,
  EmployeeFolderFile,
  DEFAULT_ROLE_PERMISSIONS,
} from '../frontend/src/app/types';
import { addAuditLog, createNotification } from './serverUtils.js';
import { generateOfficialPdfBuffer } from './pdfGenerator.js';

dotenv.config({ quiet: true });

const DEFAULT_PORT = 3001;
const PORT = Number(process.env.PORT || DEFAULT_PORT);
const IS_VERCEL = Boolean(process.env.VERCEL);
const ADMIN_PASSWORD_RESET_COOLDOWN_MS = 15 * 60 * 1000;
const TEMPORARY_PASSWORD_VALIDITY_MS = 5 * 60 * 1000;
// Server start
const adminPasswordResetRequests = new Map<string, number>();
// JSON files under backend/data are recovery snapshots only. MySQL is the
// authoritative database and always replaces this in-memory bootstrap state.
const BUNDLED_DATA_DIR = path.join(process.cwd(), 'backend', 'data');
const DATA_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), 'blgf-data')
  : path.join(process.cwd(), 'backend', 'data');
const DB_FILE = path.join(DATA_DIR, 'blgf_doctrack_db.json');
const ENVELOPE_LOG_DB_FILE = path.join(DATA_DIR, 'blgf_envelope_logs_db.json');
type StorageKind = 'documentAttachments' | 'profilePictures';
type StorageConfig = Record<StorageKind, string>;
const STORAGE_ROOT_DIR = path.join(DATA_DIR, 'storage');
const STORAGE_DIRECTORIES: StorageConfig = {
  documentAttachments: path.join(STORAGE_ROOT_DIR, 'attachments'),
  profilePictures: path.join(STORAGE_ROOT_DIR, 'profile-pictures'),
};
const RECORDS_ROOT_DIR = path.join(
  IS_VERCEL ? os.tmpdir() : process.cwd(),
  IS_VERCEL ? 'blgf-records-management' : 'backend/records-management',
);
const RECORDS_METADATA_FILE = path.join(
  RECORDS_ROOT_DIR,
  '.file-metadata.json',
);
let RECORD_CATEGORIES = ['memo', 'letter', 'circular', 'report', 'other'];
const RECORD_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
  '.html',
  '.jpg',
  '.jpeg',
  '.png',
];

type RecordFileMetadata = {
  subject: string;
  source: string;
  signatory: string;
  remarks: string;
};

const readRecordMetadata = (): Record<string, RecordFileMetadata> => {
  try {
    return fs.existsSync(RECORDS_METADATA_FILE)
      ? JSON.parse(fs.readFileSync(RECORDS_METADATA_FILE, 'utf8'))
      : {};
  } catch {
    return {};
  }
};

const writeRecordMetadata = (metadata: Record<string, RecordFileMetadata>) => {
  fs.writeFileSync(RECORDS_METADATA_FILE, JSON.stringify(metadata, null, 2));
};

const recordMetadataKey = (category: string, fileName: string) =>
  `${category}/${fileName}`;
const safeStorageFileName = (name: string) => {
  const extension = path.extname(name);
  const baseName =
    path
      .basename(name, extension)
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .trim() || 'file';
  return `${Date.now()}_${baseName}${extension.toLowerCase()}`;
};

const storageFileUrl = (kind: StorageKind, fileName: string) =>
  `/api/storage/files/${kind}/${encodeURIComponent(fileName)}`;
let mysqlSyncQueue: Promise<void> = Promise.resolve();
let mysqlSyncRequested = false;
let mysqlSyncWorkerActive = false;

// Memory Data State
export let divisionsState: Division[] = [];
let usersState: User[] = [];
let documentsState: DocumentRecord[] = [];
let auditLogsState: AuditLog[] = [];
let envelopeLogsState: AuditLog[] = [];
let notificationsState: NotificationItem[] = [];
let employeesState: EmployeeProfile[] = [];

export interface DirectorySectionRecord {
  id: string;
  label: string;
  officeTypes: string[];
  color?: string;
}

const DEFAULT_DIRECTORY_SECTIONS: DirectorySectionRecord[] = [
  { id: 'BLGF', label: 'BLGF Personnel', officeTypes: ['BLGF'], color: 'blue' },
  {
    id: 'LGU_STAFF',
    label: 'LGU Staff',
    officeTypes: ['PROVINCIAL_TREASURER', 'MUNICIPAL_TREASURER', 'LGU'],
    color: 'emerald',
  },
  {
    id: 'OTHER_AGENCIES',
    label: 'Other Agencies',
    officeTypes: ['OTHER_AGENCIES'],
    color: 'amber',
  },
];

let directorySectionsState: DirectorySectionRecord[] = DEFAULT_DIRECTORY_SECTIONS;

const RESERVED_SYSTEM_ADMIN: User = {
  id: 'usr-1785138104157',
  username: 'tom',
  fullName: 'Tom Catral',
  email: 'catraltom@gmail.com',
  role: 'SYSTEM_ADMIN',
  divisionCode: 'ORD',
  designation: 'System Administrator',
  contactNo: '',
  active: true,
  createdAt: '2026-07-27T07:41:44.157Z',
  avatarUrl: '',
  permissions: structuredClone(DEFAULT_ROLE_PERMISSIONS.SYSTEM_ADMIN),
};

async function ensureReservedSystemAdministrator() {
  const existing = usersState.find(
    (user) =>
      user.id === RESERVED_SYSTEM_ADMIN.id ||
      user.username.trim().toLowerCase() ===
        RESERVED_SYSTEM_ADMIN.username.toLowerCase(),
  );
  if (existing) return;

  const password = process.env.SYSTEM_ADMIN_PASSWORD?.trim();
  if (!password) {
    console.error(
      'No users exist in MySQL and SYSTEM_ADMIN_PASSWORD is not configured; login is unavailable.',
    );
    return;
  }

  const administrator = {
    ...structuredClone(RESERVED_SYSTEM_ADMIN),
    password,
  };
  await saveUserDirect(administrator);
  usersState.push(administrator);
  console.log('Created the reserved System Administrator account in MySQL.');
}

export function markLatestRouteAsProcessed(
  document: DocumentRecord,
  actingUserId: string | undefined,
  _actingUserName: string | undefined,
  actionTaken: string,
  processedAt: string,
  attachments?: DocumentRouteStep['attachments'],
) {
  const route = [...(document.routes || [])]
    .reverse()
    .find(
      (candidate) =>
        !candidate.processedAt &&
        Boolean(actingUserId) &&
        candidate.toUserId === actingUserId,
    );
  if (!route) return;
  route.actionTaken = actionTaken;
  route.processedAt = processedAt;
  if (attachments?.length) {
    route.attachments = attachments;
  }
}

// Ensure data directory exists & load database file
function ensureStorageDirectories() {
  Object.values(STORAGE_DIRECTORIES).forEach((directory) =>
    fs.mkdirSync(directory, { recursive: true }),
  );
  fs.mkdirSync(RECORDS_ROOT_DIR, { recursive: true });
  RECORD_CATEGORIES.forEach((category) =>
    fs.mkdirSync(path.join(RECORDS_ROOT_DIR, category), { recursive: true }),
  );
}

function ensureSeededAttachmentsExist() {
  try {
    const logoPath = path.join(process.cwd(), 'frontend', 'public', 'blgflogo.jpg');
    const logoBuffer = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : Buffer.from('');

    const allAttachments: { fileName: string; url?: string; fileType?: string; doc?: DocumentRecord }[] = [];
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
      const rawUrl = item.url || '';
      const rawFileName = rawUrl.split('/').pop() || '';
      if (!rawFileName) continue;
      const decodedFileName = decodeURIComponent(rawFileName);
      const fileNamesToEnsure = new Set([rawFileName, decodedFileName]);

      for (const fileName of fileNamesToEnsure) {
        if (!fileName) continue;
        const targetPath = path.join(STORAGE_DIRECTORIES.documentAttachments, fileName);
        if (fs.existsSync(targetPath)) continue;

        if (fileName.toLowerCase().endsWith('.pdf')) {
          const doc = item.doc;
          const pdfBuf = generateOfficialPdfBuffer(item.fileName || fileName.replace(/^\d+_/, ''), {
            trackingNumber: doc?.trackingNumber || 'BLGF2-OFFICIAL-RECORD',
            category: doc?.category || 'Official Document',
            date: doc?.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined,
            sender: doc?.originatingOffice || doc?.senderName || 'Bureau of Local Government Finance - Regional Office No. II',
            recipient: doc?.destinationOffice || doc?.recipientName || 'All Concerned Personnel & Stakeholders',
            remarks: doc?.subject || 'Implementation of Republic Act No. 12001 - Approved',
            status: 'VERIFIED & AUTHENTICATED SYSTEM ATTACHMENT',
          });
          try {
            fs.writeFileSync(targetPath, pdfBuf);
          } catch {}
        } else if (fileName.toLowerCase().match(/\.(jpe?g|png)$/)) {
          try {
            fs.writeFileSync(targetPath, logoBuffer);
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn('[STORAGE] ensureSeededAttachmentsExist notice:', err);
  }
}
const recordUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      const uploadDirectory = path.join(RECORDS_ROOT_DIR, '_uploads');
      fs.mkdirSync(uploadDirectory, { recursive: true });
      callback(null, uploadDirectory);
    },
    filename: (_req, file, callback) =>
      callback(null, safeStorageFileName(file.originalname)),
  }),
  limits: { fileSize: 1024 * 1024 * 1024 },
});
const storageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 },
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
    'blgf_doctrack_db.json',
  );
  if (
    IS_VERCEL &&
    !fs.existsSync(DB_FILE) &&
    fs.existsSync(bundledDatabaseFile)
  ) {
    fs.copyFileSync(bundledDatabaseFile, DB_FILE);
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs
        .readFileSync(DB_FILE, 'utf-8')
        .replace(/\u0410/g, 'A')
        .replace(/\u2014/g, '-');
      const data = JSON.parse(raw);
      divisionsState = data.divisions || [];
      usersState = (data.users || []).map((user: User) =>
        user.role === 'SYSTEM_ADMIN'
          ? { ...user, divisionCode: 'ITMS' as const }
          : user,
      );
      documentsState = data.documents || [];
      auditLogsState = data.auditLogs || [];
      if (fs.existsSync(ENVELOPE_LOG_DB_FILE)) {
        const envelopeData = JSON.parse(
          fs.readFileSync(ENVELOPE_LOG_DB_FILE, 'utf-8'),
        );
        envelopeLogsState = envelopeData.logs || [];
      } else {
        envelopeLogsState = auditLogsState.filter(
          (log) => log.action === 'ENVELOPE_LOG',
        );
        auditLogsState = auditLogsState.filter(
          (log) => log.action !== 'ENVELOPE_LOG',
        );
        saveEnvelopeLogsToFile();
      }
      notificationsState = data.notifications || [];
      repairInitialRouteRecipients();
      employeesState = data.employees || [];
      directorySectionsState = data.directorySections || DEFAULT_DIRECTORY_SECTIONS;
      console.log('Loaded local recovery snapshot before MySQL initialization:', DB_FILE);
    } catch (err) {
      console.error(
        '[WARN] Failed to parse database file, resetting to initial seed:',
        err,
      );
      resetDatabaseToDefault();
    }
  } else {
    resetDatabaseToDefault();
  }

}

function applyDatabaseState(entries: Array<[string, unknown[]]>) {
  const state = new Map(entries);
  const use = <T>(key: string, fallback: T): T => {
    const value = state.get(key);
    return Array.isArray(value) ? (value as T) : fallback;
  };
  divisionsState = use('divisions', divisionsState);
  usersState = use<User[]>('users', usersState).map((user) =>
    user.role === 'SYSTEM_ADMIN'
      ? { ...user, divisionCode: 'ITMS' as const }
      : user,
  );
  documentsState = use('documents', documentsState);
  auditLogsState = use('audit_logs', auditLogsState);
  envelopeLogsState = use('envelope_logs', envelopeLogsState);
  notificationsState = use('notifications', notificationsState);
  employeesState = use('employee_profiles', employeesState);
  directorySectionsState = use('directory_sections', directorySectionsState);
}

function getDatabaseStateEntries(): Array<[string, unknown[]]> {
  return [
    ['divisions', divisionsState],
    ['users', usersState],
    ['documents', documentsState],
    ['audit_logs', auditLogsState],
    ['envelope_logs', envelopeLogsState],
    ['notifications', notificationsState],
    ['employee_profiles', employeesState],
    ['directory_sections', directorySectionsState],
  ];
}

function queueDatabaseSync() {
  if (!getMySQLReplicaStatus().connected) return;
  mysqlSyncRequested = true;
  if (mysqlSyncWorkerActive) return;

  mysqlSyncWorkerActive = true;
  mysqlSyncQueue = mysqlSyncQueue
    .then(async () => {
      // One user action may update the document, audit log, and several
      // notifications synchronously. Let those writes collect, then persist
      // one current snapshot instead of repeating the full sync for each item.
      await new Promise<void>((resolve) => setImmediate(resolve));
      do {
        mysqlSyncRequested = false;
        await syncMySQLReplica(getDatabaseStateEntries());
      } while (mysqlSyncRequested);
    })
    .catch((error) => console.error('MySQL synchronization failed:', error))
    .finally(() => {
      mysqlSyncWorkerActive = false;
      if (mysqlSyncRequested) queueDatabaseSync();
    });
}

export async function flushDatabaseSync() {
  await mysqlSyncQueue;
}

function syncEmployeeProfileFromUser(user: User, persist = true) {
  const matchingIndices: number[] = [];
  employeesState.forEach((emp, index) => {
    if (emp.userId === user.id) {
      matchingIndices.push(index);
    } else if (
      !emp.userId &&
      emp.officeType === 'BLGF' &&
      emp.fullName.trim().toLowerCase() === user.fullName.trim().toLowerCase()
    ) {
      matchingIndices.push(index);
    }
  });

  const matchingProfiles = matchingIndices.map((i) => employeesState[i]);
  const primaryExisting = matchingProfiles[0];
  const empId = primaryExisting?.id || `emp-${user.id}`;

  const allExistingFolders: EmployeeFolderRecord[] = [];
  const seenFolderNames = new Set<string>();
  for (const p of matchingProfiles) {
    for (const raw of (p.folders as unknown[]) || []) {
      if (!raw) continue;
      const rawStr = typeof raw === 'string' ? raw : null;
      const f: EmployeeFolderRecord =
        rawStr !== null
          ? {
              id: rawStr,
              name: rawStr.startsWith('fld-auto-') ? 'Personnel Records' : rawStr,
              employeeId: empId,
              userId: user.id,
              systemManaged: rawStr.startsWith('fld-auto-'),
              fileCount: 0,
              createdAt: new Date().toISOString(),
              files: [],
            }
          : (raw as EmployeeFolderRecord);
      const folderName = f.name || f.id || 'Folder';
      const key = folderName.toLowerCase();
      if (!seenFolderNames.has(key)) {
        seenFolderNames.add(key);
        allExistingFolders.push(f);
      }
    }
  }

  const autoFolderId = `fld-auto-${user.id}`;
  const otherFolders = allExistingFolders.filter(
    (folder) => folder.id !== autoFolderId && folder.userId !== user.id,
  );
  const autoFolder = allExistingFolders.find(
    (folder) => folder.id === autoFolderId || folder.userId === user.id,
  );

  const folders: EmployeeFolderRecord[] = [
    {
      id: autoFolderId,
      name: 'Personnel Records',
      description: `Automatically created static personnel records folder for ${user.fullName}.`,
      employeeId: empId,
      userId: user.id,
      systemManaged: true,
      fileCount: autoFolder?.files?.length || 0,
      createdAt: user.createdAt || new Date().toISOString(),
      files: autoFolder?.files || [],
    },
    ...otherFolders,
  ];

  const profile: EmployeeProfile = {
    id: empId,
    userId: user.id,
    fullName: user.fullName,
    position: user.designation || user.role,
    office: 'Bureau of Local Government Finance - Regional Office II',
    officeType: 'BLGF',
    divisionCode: user.divisionCode,
    email: user.email || 'N/A',
    contactNo: user.contactNo || '',
    address:
      primaryExisting?.address ||
      'Regional Government Center, Carig Sur, Tuguegarao City',
    active: user.active,
    createdAt: primaryExisting?.createdAt || user.createdAt,
    folders,
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
    (emp) => emp.id !== 'emp-1785138157086' && emp.id !== 'emp-1785138202454',
  );
  for (const user of usersState) syncEmployeeProfileFromUser(user, false);
  saveDatabaseToFile();
}

function repairInitialRouteRecipients() {
  let repaired = false;
  for (const document of documentsState) {
    const blankInitialRoutes = (document.routes || []).filter(
      (route) => route.stepNumber === 1 && !route.toUser && !route.toUserId,
    );
    if (blankInitialRoutes.length === 0) continue;

    const recipientUsers = notificationsState
      .filter(
        (notification) =>
          notification.documentId === document.id &&
          notification.type === 'ACTION_REQUIRED',
      )
      .map((notification) =>
        usersState.find(
          (user) => user.id === notification.userId && user.active,
        ),
      )
      .filter((user): user is User => Boolean(user));
    if (recipientUsers.length === 0) continue;

    const blankRouteIds = new Set(blankInitialRoutes.map((route) => route.id));
    const template = blankInitialRoutes[0];
    document.routes = [
      ...(document.routes || []).filter(
        (route) => !blankRouteIds.has(route.id),
      ),
      ...recipientUsers.map((recipient, index) => ({
        ...template,
        id: `${template.id}-recipient-${index + 1}`,
        stepNumber: index + 1,
        toDivision: recipient.divisionCode,
        toUser: recipient.fullName,
        toUserId: recipient.id,
        isMultiRoute: recipientUsers.length > 1,
      })),
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

export function saveDatabaseToFile(queueSync = true) {
  if (IS_VERCEL) {
    if (queueSync) queueDatabaseSync();
    return;
  }
  try {
    const payload = {
      updatedAt: new Date().toISOString(),
      divisions: divisionsState,
      users: usersState,
      documents: documentsState,
      auditLogs: auditLogsState,
      notifications: notificationsState,
      employees: employeesState,
      directorySections: directorySectionsState,
    };
    const serialized = JSON.stringify(payload, null, 2)
      .replace(/\u0410/g, 'A')
      .replace(/\u2014/g, '-');
    fs.writeFileSync(DB_FILE, serialized, 'utf-8');
    if (queueSync) queueDatabaseSync();
  } catch (err) {
    console.error('[ERROR] Error saving database file:', err);
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
        updatedAt: new Date().toISOString(),
        database: 'BLGF Outgoing Envelope Dispatch Logs',
        logs: envelopeLogsState,
      },
      null,
      2,
    ),
    'utf-8',
  );
}

export async function createApp() {
  initDatabaseStorage();
  ensureStorageDirectories();
  await connectMySQLReplica();
  const mysqlConnected = getMySQLReplicaStatus().connected;
  if (IS_VERCEL && !mysqlConnected) {
    throw new Error('MySQL connection is unavailable.');
  }
  if (mysqlConnected) {
    applyDatabaseState(await loadMySQLState());
  } else {
    console.warn(
      'MySQL is unavailable; using the local JSON data store for this development session.',
    );
  }
  await ensureReservedSystemAdministrator();
  ensureUserEmployeeProfiles();
  ensureSeededAttachmentsExist();
  const initialSyncSucceeded = mysqlConnected;

  if (process.argv.includes('--sync-only')) {
    if (initialSyncSucceeded) {
      console.log(
        `Database sync complete: ${usersState.length} users, ${documentsState.length} documents, ` +
          `${documentsState.reduce((count, document) => count + (document.routes?.length || 0), 0)} routes, ` +
          `${documentsState.reduce((count, document) => count + (document.attachments?.length || 0), 0)} attachments, ` +
          `${notificationsState.length} notifications, ${employeesState.length} employee profiles.`,
      );
    } else {
      console.error(
        'Database sync did not run because no database is connected.',
      );
      process.exitCode = 1;
    }
    await mysqlSyncQueue;
    await disconnectMySQLReplica();
    return;
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  const getRequestUser = (req: express.Request) =>
    usersState.find(
      (user) => user.id === String(req.get('X-User-Id') || '') && user.active,
    );

  // Request logger
  app.use((_req, res, next) => {
    res.locals.getUsersState = () => usersState;
    res.locals.getDocumentsState = () => documentsState;
    res.locals.setDocumentsState = (docs: DocumentRecord[]) => {
      documentsState = docs;
    };
    res.locals.getNotificationsState = () => notificationsState;
    res.locals.setNotificationsState = (notifs: NotificationItem[]) => {
      notificationsState = notifs;
    };
    next();
  });
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API ${req.method}] ${req.path}`);
    }
    next();
  });

  // -------------------------------------------------------------
  // REST API ENDPOINTS
  // -------------------------------------------------------------

  app.use(
    '/api/documents',
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
      },
    ),
  );

  app.use(
    '/api/users',
    createUsersRouter(
      () => usersState,
      (newUsers) => (usersState = newUsers),
      () => auditLogsState,
      syncEmployeeProfileFromUser,
    ),
  );

  app.post(
    '/api/storage/upload/:kind',
    storageUpload.single('file'),
    async (req, res) => {
      const kind = req.params.kind as StorageKind;
      if (
        !Object.prototype.hasOwnProperty.call(STORAGE_DIRECTORIES, kind) ||
        !req.file
      ) {
        return res.status(400).json({ error: 'Invalid storage type or file.' });
      }
      const fileName = safeStorageFileName(req.file.originalname);
      fs.mkdirSync(STORAGE_DIRECTORIES[kind], { recursive: true });
      fs.writeFileSync(
        path.join(STORAGE_DIRECTORIES[kind], fileName),
        req.file.buffer,
      );
      // Persist the raw base64 bytes so attachments survive on ephemeral
      // serverless filesystems (e.g. Vercel) and render on mobile devices.
      res.status(201).json({
        fileName,
        url: storageFileUrl(kind, fileName),
        fileData: req.file.buffer.toString('base64'),
      });
    },
  );

  app.get('/api/storage/files/:kind/:fileName', async (req, res) => {
    const kind = req.params.kind as StorageKind;
    if (!Object.prototype.hasOwnProperty.call(STORAGE_DIRECTORIES, kind)) {
      return res.status(400).json({ error: 'Invalid storage type.' });
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

    // Find matching attachment across documents and routes
    const allAttachments = documentsState.flatMap((document) => [
      ...(document.attachments || []).map((candidate) => ({ ...candidate, doc: document })),
      ...(document.routes || []).flatMap((route) =>
        (route.attachments || []).map((candidate) => ({ ...candidate, doc: document })),
      ),
    ]);

    const matching = allAttachments.find((candidate) => {
      const candidateUrl = candidate.url || '';
      const candidateName = decodeURIComponent(candidateUrl.split('/').pop() || '');
      const rawCandidateName = candidateUrl.split('/').pop() || '';
      return (
        candidateName === baseName ||
        rawCandidateName === rawBaseName ||
        candidate.fileName === baseName ||
        candidate.fileName === rawBaseName
      );
    });

    // Check if attachment has valid base64 data
    if (
      matching?.fileData &&
      !matching.fileData.startsWith('/') &&
      !matching.fileData.startsWith('http')
    ) {
      try {
        const mimeType =
          matching.fileType ||
          (baseName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
        const buffer = Buffer.from(matching.fileData, 'base64');
        try {
          fs.writeFileSync(target, buffer);
        } catch {}
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${baseName}"`);
        return res.send(buffer);
      } catch (err) {
        console.error('[STORAGE] Error decoding base64 attachment:', err);
      }
    }

    // Fallback: If it's a PDF document attachment, dynamically generate official BLGF PDF
    if (
      kind === 'documentAttachments' &&
      (baseName.toLowerCase().endsWith('.pdf') || rawBaseName.toLowerCase().endsWith('.pdf'))
    ) {
      const doc = matching?.doc;
      const pdfTitle =
        matching?.fileName ||
        baseName.replace(/^\d+_/, '').replace(/\.pdf$/i, '');
      const pdfBuf = generateOfficialPdfBuffer(pdfTitle, {
        trackingNumber: doc?.trackingNumber || 'BLGF2-OFFICIAL-RECORD',
        category: doc?.category || 'Official Document',
        date: doc?.createdAt
          ? new Date(doc.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : undefined,
        sender:
          doc?.originatingOffice ||
          doc?.senderName ||
          'Bureau of Local Government Finance - Regional Office No. II',
        recipient:
          doc?.destinationOffice ||
          doc?.recipientName ||
          'All Concerned Offices & Stakeholders',
        remarks:
          doc?.subject ||
          'Official document attachment logged in BLGF Region II system.',
        status: 'VERIFIED & AUTHENTICATED SYSTEM ATTACHMENT',
      });
      try {
        fs.mkdirSync(STORAGE_DIRECTORIES[kind], { recursive: true });
        fs.writeFileSync(target, pdfBuf);
        if (rawTarget !== target) fs.writeFileSync(rawTarget, pdfBuf);
      } catch {}
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${baseName}"`);
      return res.send(pdfBuf);
    }

    // Fallback: If it's an image
    if (
      baseName.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/) ||
      rawBaseName.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/)
    ) {
      const logoPath = path.join(process.cwd(), 'frontend', 'public', 'blgflogo.jpg');
      if (fs.existsSync(logoPath)) {
        try {
          fs.mkdirSync(STORAGE_DIRECTORIES[kind], { recursive: true });
          fs.copyFileSync(logoPath, target);
        } catch {}
        return res.sendFile(logoPath);
      }
    }

    return res.status(404).json({ error: 'Stored file not found.' });
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      system: 'BLGF Region II Document Tracking System API',
      databaseLoaded: true,
      activeDatabase: mysqlConnected ? 'mysql' : 'local-json',
      mysql: getMySQLReplicaStatus(),
      recordsCount: {
        documents: documentsState.length,
        users: usersState.length,
        auditLogs: auditLogsState.length,
      },
    });
  });

  // Auth / Current Session Mock Login
  app.post('/api/auth/login', (req, res) => {
    const username = String(req.body?.username ?? '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Username and password are required.' });
    }
    const matchingUsers = usersState.filter(
      (u) =>
        String(u.username ?? '')
          .trim()
          .toLowerCase() === username ||
        String(u.email ?? '')
          .trim()
          .toLowerCase() === username,
    );

    if (!matchingUsers.length) {
      return res.status(401).json({ error: 'User account not found' });
    }

    if (!matchingUsers.some((user) => user.active)) {
      return res
        .status(403)
        .json({ error: 'Account is deactivated. Contact Admin.' });
    }

    const user = matchingUsers.find(
      (candidate) =>
        candidate.active &&
        typeof candidate.password === 'string' &&
        candidate.password === password,
    );
    if (!user) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    if (
      user.temporaryPasswordExpiresAt &&
      new Date(user.temporaryPasswordExpiresAt).getTime() <= Date.now()
    ) {
      return res.status(401).json({
        error: 'Temporary password expired. Request a new temporary password.',
      });
    }

    addAuditLog(auditLogsState, {
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'LOGIN',
      details: `User ${user.fullName} (${user.role}) logged in successfully.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    const {
      password: _password,
      temporaryPasswordExpiresAt: _temporaryPasswordExpiresAt,
      ...safeUser
    } = user;
    return res.json({ user: safeUser });
  });

  app.post('/api/auth/forgot-admin-password', async (req, res) => {
    const identifier = String(req.body?.identifier || '')
      .trim()
      .toLowerCase();
    if (!identifier) {
      return res.status(400).json({
        error: 'Administrator username or email is required.',
      });
    }

    const matchingAdministrators = usersState.filter(
      (user) =>
        user.role === 'SYSTEM_ADMIN' &&
        user.active &&
        (user.username.trim().toLowerCase() === identifier ||
          user.email.trim().toLowerCase() === identifier),
    );
    const administrator = matchingAdministrators.find(
      (user) => user.username.trim().toLowerCase() === identifier,
    ) || matchingAdministrators[0];
    if (!administrator) {
      return res.status(404).json({
        error:
          'No active administrator account matches that username or email.',
      });
    }
    if (!administrator.email?.trim()) {
      return res.status(400).json({
        error: 'This administrator account does not have an email address.',
      });
    }

    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPassword = process.env.SMTP_PASSWORD?.replace(/\s+/g, '');
    if (!smtpHost || !smtpUser || !smtpPassword) {
      return res.status(503).json({
        error: 'Password-reset email is not configured on the server.',
      });
    }

    const lastRequest = adminPasswordResetRequests.get(administrator.id) || 0;
    if (Date.now() - lastRequest < ADMIN_PASSWORD_RESET_COOLDOWN_MS) {
      return res.status(429).json({
        error:
          'A temporary password was recently sent. Please wait 15 minutes before trying again.',
      });
    }

    const temporaryPassword = `BLGF-${crypto.randomBytes(9).toString('base64url')}`;
    const temporaryPasswordExpiresAt = new Date(
      Date.now() + TEMPORARY_PASSWORD_VALIDITY_MS,
    );
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure:
        process.env.SMTP_SECURE === 'true' ||
        (process.env.SMTP_SECURE !== 'false' && smtpPort === 465),
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: administrator.email,
        subject: 'BLGF Document Tracking System temporary password',
        text: [
          `Hello ${administrator.fullName},`,
          '',
          'A password reset was requested for your administrator account.',
          `Username: ${administrator.username}`,
          `Temporary password: ${temporaryPassword}`,
          'This temporary password is valid for 5 minutes only.',
          '',
          'Sign in with this temporary password, then change it immediately in User Settings.',
          'If you did not request this reset, contact your system administrator.',
        ].join('\n'),
      });

      administrator.password = temporaryPassword;
      administrator.temporaryPasswordExpiresAt =
        temporaryPasswordExpiresAt.toISOString();
      try {
        await updateUserPassword(
          administrator.id,
          temporaryPassword,
          temporaryPasswordExpiresAt,
        );
      } catch (databaseError) {
        console.error(
          'Temporary password email was sent but MySQL update failed:',
          databaseError,
        );
        return res.status(503).json({
          error:
            'The email was sent, but the database could not save the temporary password. Request another reset after the database connection is restored.',
          existingPasswordChanged: false,
        });
      }
      adminPasswordResetRequests.set(administrator.id, Date.now());
      addAuditLog(auditLogsState, {
        userId: administrator.id,
        userName: administrator.fullName,
        userRole: administrator.role,
        action: 'UPDATE_USER',
        details: `A temporary password was emailed to administrator ${administrator.username}.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.json({
        message: `A temporary password was sent to ${administrator.email} for username ${administrator.username}.`,
      });
    } catch (error) {
      console.error(
        'Could not send administrator password-reset email:',
        error,
      );
      const smtpError = error as {
        code?: string;
        responseCode?: number;
        command?: string;
      };
      const authenticationFailed =
        smtpError.code === 'EAUTH' || smtpError.responseCode === 535;
      const connectionFailed = [
        'ECONNECTION',
        'ETIMEDOUT',
        'ESOCKET',
        'ECONNREFUSED',
      ].includes(String(smtpError.code || ''));
      return res.status(502).json({
        error: authenticationFailed
          ? 'Gmail rejected the SMTP login. Use a Google App Password for SMTP_PASSWORD, not the Gmail account password.'
          : connectionFailed
            ? 'The email server could not be reached. Check SMTP_HOST, SMTP_PORT, and SMTP_SECURE.'
            : 'The temporary password email could not be sent. Check the recipient and SMTP_FROM settings.',
        code: smtpError.code || 'SMTP_SEND_FAILED',
        existingPasswordChanged: false,
      });
    }
  });

  app.get('/api/records/folders', (_req, res) => {
    const metadata = readRecordMetadata();
    const folders = RECORD_CATEGORIES.map((category) => {
      const categoryDir = path.join(RECORDS_ROOT_DIR, category);
      const files = fs.existsSync(categoryDir)
        ? fs
            .readdirSync(categoryDir)
            .filter((name) =>
              RECORD_FILE_EXTENSIONS.includes(path.extname(name).toLowerCase()),
            )
            .map((name) => {
              const fullPath = path.join(categoryDir, name);
              const stats = fs.statSync(fullPath);
              return {
                name,
                size: stats.size,
                updatedAt: stats.mtime.toISOString(),
                metadata: metadata[recordMetadataKey(category, name)] || null,
              };
            })
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        : [];

      return {
        name: category,
        count: files.length,
        files,
      };
    });

    res.json({ folders });
  });

  app.post('/api/records/folders', (req, res) => {
    const name = String(req.body?.name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-');
    if (!name) return res.status(400).json({ error: 'Enter a folder name.' });
    if (!RECORD_CATEGORIES.includes(name)) RECORD_CATEGORIES.push(name);
    fs.mkdirSync(path.join(RECORDS_ROOT_DIR, name), { recursive: true });
    res.status(201).json({ name, path: path.join(RECORDS_ROOT_DIR, name) });
  });

  app.put('/api/records/folders/:name', (req, res) => {
    const oldName = String(req.params.name || '').toLowerCase();
    const nextName = String(req.body?.name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-');
    if (!RECORD_CATEGORIES.includes(oldName) || !nextName)
      return res.status(400).json({ error: 'Invalid folder name.' });
    const oldPath = path.join(RECORDS_ROOT_DIR, oldName);
    const nextPath = path.join(RECORDS_ROOT_DIR, nextName);
    if (fs.existsSync(nextPath))
      return res
        .status(409)
        .json({ error: 'A folder with that name already exists.' });
    fs.renameSync(oldPath, nextPath);
    RECORD_CATEGORIES = RECORD_CATEGORIES.map((item) =>
      item === oldName ? nextName : item,
    );
    res.json({ name: nextName });
  });

  app.delete('/api/records/folders/:name', (req, res) => {
    const name = String(req.params.name || '').toLowerCase();
    if (
      !RECORD_CATEGORIES.includes(name) ||
      ['memo', 'letter', 'circular', 'report', 'other'].includes(name)
    )
      return res
        .status(400)
        .json({ error: 'This system folder cannot be deleted.' });
    const target = path.join(RECORDS_ROOT_DIR, name);
    fs.rmSync(target, { recursive: true, force: true });
    RECORD_CATEGORIES = RECORD_CATEGORIES.filter((item) => item !== name);
    res.json({ success: true });
  });

  app.get('/api/records/storage', (_req, res) =>
    res.json({ path: RECORDS_ROOT_DIR }),
  );

  app.get('/api/records/:category/:fileName', (req, res) => {
    const category = String(req.params.category || '').toLowerCase();
    const fileName = path.basename(String(req.params.fileName || ''));
    if (
      !RECORD_CATEGORIES.includes(category) ||
      !RECORD_FILE_EXTENSIONS.includes(path.extname(fileName).toLowerCase())
    ) {
      return res.status(400).json({ error: 'Invalid records file request.' });
    }

    const targetFile = path.join(RECORDS_ROOT_DIR, category, fileName);
    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: 'Record file not found.' });
    }

    res.sendFile(targetFile);
  });

  app.put('/api/records/:category/:fileName', (req, res) => {
    const category = String(req.params.category || '').toLowerCase();
    const oldFileName = path.basename(String(req.params.fileName || ''));
    const requestedName = path.basename(String(req.body?.name || '')).trim();
    const oldExtension = path.extname(oldFileName).toLowerCase();
    const requestedExtension = path.extname(requestedName).toLowerCase();
    if (
      !RECORD_CATEGORIES.includes(category) ||
      !RECORD_FILE_EXTENSIONS.includes(oldExtension) ||
      !requestedName
    ) {
      return res.status(400).json({ error: 'Invalid file rename request.' });
    }
    if (requestedExtension && requestedExtension !== oldExtension) {
      return res
        .status(400)
        .json({ error: 'The file extension cannot be changed.' });
    }
    const safeBaseName = path
      .basename(requestedName, requestedExtension || oldExtension)
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .trim();
    if (!safeBaseName) {
      return res.status(400).json({ error: 'Enter a valid file name.' });
    }
    const nextFileName = `${safeBaseName}${oldExtension}`;
    const oldPath = path.join(RECORDS_ROOT_DIR, category, oldFileName);
    const nextPath = path.join(RECORDS_ROOT_DIR, category, nextFileName);
    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ error: 'Record file not found.' });
    }
    if (oldPath !== nextPath && fs.existsSync(nextPath)) {
      return res
        .status(409)
        .json({ error: 'A file with that name already exists.' });
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

  app.delete('/api/records/:category/:fileName', (req, res) => {
    const category = String(req.params.category || '').toLowerCase();
    const fileName = path.basename(String(req.params.fileName || ''));
    if (
      !RECORD_CATEGORIES.includes(category) ||
      !RECORD_FILE_EXTENSIONS.includes(path.extname(fileName).toLowerCase())
    ) {
      return res.status(400).json({ error: 'Invalid file delete request.' });
    }
    const targetFile = path.join(RECORDS_ROOT_DIR, category, fileName);
    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: 'Record file not found.' });
    }
    fs.unlinkSync(targetFile);
    const metadata = readRecordMetadata();
    delete metadata[recordMetadataKey(category, fileName)];
    writeRecordMetadata(metadata);
    res.json({ success: true });
  });

  app.post('/api/records/upload', (req, res) => {
    const category = String(req.body?.category || 'other').toLowerCase();
    const originalName = path.basename(String(req.body?.fileName || ''));
    const extension = path.extname(originalName).toLowerCase();
    const content = String(req.body?.content || '');
    if (
      !RECORD_CATEGORIES.includes(category) ||
      !RECORD_FILE_EXTENSIONS.includes(extension)
    ) {
      return res
        .status(400)
        .json({ error: 'Unsupported folder or file type.' });
    }
    if (!content || content.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File is missing or too large.' });
    }

    const safeBaseName =
      path
        .basename(originalName, extension)
        .replace(/[^a-zA-Z0-9._ -]/g, '_')
        .trim() || 'record';
    const fileName = `${Date.now()}_${safeBaseName}${extension}`;
    const targetFile = path.join(RECORDS_ROOT_DIR, category, fileName);
    try {
      fs.writeFileSync(targetFile, Buffer.from(content, 'base64'));
      res.status(201).json({
        success: true,
        category,
        fileName,
        storedIn: 'records-management',
      });
    } catch (error) {
      console.error('Record file upload failed:', error);
      res.status(500).json({ error: 'Could not save the file.' });
    }
  });

  app.post(
    '/api/records/upload-file',
    recordUpload.single('file'),
    (req, res) => {
      const category = String(req.body?.category || 'other').toLowerCase();
      const file = req.file;
      if (!file || !RECORD_CATEGORIES.includes(category))
        return res
          .status(400)
          .json({ error: 'Choose a valid folder and file.' });
      const extension = path.extname(file.originalname).toLowerCase();
      if (!RECORD_FILE_EXTENSIONS.includes(extension)) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Unsupported file type.' });
      }
      const title = String(req.body?.title || '')
        .replace(/[^a-zA-Z0-9._ -]/g, '_')
        .trim();
      const safeName =
        (title ||
          path
            .basename(file.originalname, extension)
            .replace(/[^a-zA-Z0-9._ -]/g, '_')
            .trim() ||
          'record') + extension;
      const fileName = `${Date.now()}_${safeName}`;
      fs.renameSync(file.path, path.join(RECORDS_ROOT_DIR, category, fileName));
      const metadata = readRecordMetadata();
      metadata[recordMetadataKey(category, fileName)] = {
        subject: String(req.body?.subject || '').trim(),
        source: String(req.body?.source || '').trim(),
        signatory: String(req.body?.signatory || '').trim(),
        remarks: String(req.body?.remarks || '').trim(),
      };
      writeRecordMetadata(metadata);
      res.status(201).json({
        success: true,
        fileName,
        storedIn: path.join(RECORDS_ROOT_DIR, category),
      });
    },
  );

  app.post('/api/records/save', (req, res) => {
    const body = req.body || {};
    const category = (body.category || 'other').toLowerCase();
    const safeCategory = RECORD_CATEGORIES.includes(category)
      ? category
      : 'other';
    const fileNameBase =
      String(body.fileName || body.title || body.trackingNumber || 'record')
        .replace(/[^a-zA-Z0-9\-_ ]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'record';
    const trackingNumber = String(body.trackingNumber || 'BLGF-RECORD').replace(
      /[^a-zA-Z0-9\-_]/g,
      '',
    );
    const fileName = `${trackingNumber}_${fileNameBase}.html`;
    const targetDir = path.join(RECORDS_ROOT_DIR, safeCategory);
    const targetFile = path.join(targetDir, fileName);

    const escapeHtml = (value: unknown) =>
      String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
    <div><strong>Title:</strong> ${escapeHtml(body.title || '')}</div>
    <div><strong>Subject:</strong> ${escapeHtml(body.subject || '')}</div>
    <div><strong>Saved On:</strong> ${new Date().toISOString()}</div>
  </div>
  <div class="content">${escapeHtml(body.content)}</div>
</body>
</html>`;

    fs.writeFileSync(targetFile, html, 'utf-8');

    res.json({
      success: true,
      category: safeCategory,
      path: targetFile,
      fileName,
      url: `/api/records/${safeCategory}/${encodeURIComponent(fileName)}`,
      storedIn: 'records-management',
    });
  });

  // GET Stats
  app.get('/api/stats', (_req, res) => {
    const totalIncoming = documentsState.filter(
      (d) => d.direction === 'INCOMING',
    ).length;
    const totalOutgoing = documentsState.filter(
      (d) => d.direction === 'OUTGOING',
    ).length;
    const pendingCount = documentsState.filter(
      (d) => d.currentStatus === 'PENDING',
    ).length;
    const inProgressCount = documentsState.filter(
      (d) => d.currentStatus === 'IN_PROGRESS',
    ).length;
    const completedCount = documentsState.filter(
      (d) => d.currentStatus === 'COMPLETED',
    ).length;
    const urgentCount = documentsState.filter(
      (d) => d.priority === 'URGENT' || d.priority === 'VERY_URGENT',
    ).length;
    const returnedCount = documentsState.filter(
      (d) => d.currentStatus === 'RETURNED',
    ).length;

    // Division breakdown
    const divMap: Record<string, number> = {};
    divisionsState.forEach((d) => {
      divMap[d.code] = 0;
    });
    documentsState.forEach((doc) => {
      divMap[doc.currentDivision] = (divMap[doc.currentDivision] || 0) + 1;
    });

    const divisionBreakdown = Object.entries(divMap).map(([code, count]) => ({
      division: code,
      count,
    }));

    // Status breakdown
    const statusMap: Record<DocumentStatus, number> = {
      PENDING: 0,
      IN_PROGRESS: 0,
      FOR_SIGNATURE: 0,
      COMPLETED: 0,
      RETURNED: 0,
      ON_HOLD: 0,
    };
    documentsState.forEach((d) => {
      statusMap[d.currentStatus] = (statusMap[d.currentStatus] || 0) + 1;
    });

    const statusBreakdown = [
      {
        status: 'COMPLETED' as DocumentStatus,
        label: 'Completed',
        count: statusMap.COMPLETED,
        color: '#10b981',
      },
      {
        status: 'IN_PROGRESS' as DocumentStatus,
        label: 'In Progress',
        count: statusMap.IN_PROGRESS,
        color: '#3b82f6',
      },
      {
        status: 'FOR_SIGNATURE' as DocumentStatus,
        label: 'For Signature',
        count: statusMap.FOR_SIGNATURE,
        color: '#6366f1',
      },
      {
        status: 'PENDING' as DocumentStatus,
        label: 'Pending',
        count: statusMap.PENDING,
        color: '#f59e0b',
      },
      {
        status: 'RETURNED' as DocumentStatus,
        label: 'Returned',
        count: statusMap.RETURNED,
        color: '#f43f5e',
      },
      {
        status: 'ON_HOLD' as DocumentStatus,
        label: 'On Hold',
        count: statusMap.ON_HOLD,
        color: '#ea580c',
      },
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
      recentActivity: auditLogsState.slice(0, 8),
    });
  });

  // GET Divisions
  app.get('/api/divisions', (_req, res) => {
    res.json(divisionsState);
  });

  app.post('/api/divisions', (req, res) => {
    const code = String(req.body.code || '')
      .trim()
      .toUpperCase();
    const name = String(req.body.name || '').trim();
    const chiefName = String(req.body.chiefName || '').trim();
    if (!code || !name || !chiefName) {
      return res.status(400).json({
        error: 'Division code, name, and division head are required.',
      });
    }
    if (divisionsState.some((division) => division.code === code)) {
      return res.status(409).json({ error: 'Division code already exists.' });
    }
    const division: Division = {
      id: `div-${randomUUID()}`,
      code: code as Division['code'],
      name,
      chiefName,
      email: String(req.body.email || '').trim(),
    };
    divisionsState.push(division);
    saveDatabaseToFile();
    res.status(201).json(division);
  });

  app.put('/api/divisions/:id', (req, res) => {
    const index = divisionsState.findIndex(
      (division) => division.id === req.params.id,
    );
    if (index === -1)
      return res.status(404).json({ error: 'Division not found.' });
    const code = String(req.body.code || divisionsState[index].code)
      .trim()
      .toUpperCase() as Division['code'];
    const name = String(req.body.name || divisionsState[index].name).trim();
    const chiefName = String(
      req.body.chiefName || divisionsState[index].chiefName,
    ).trim();
    if (!code || !name || !chiefName) {
      return res.status(400).json({
        error: 'Division code, name, and division head are required.',
      });
    }
    if (
      divisionsState.some(
        (division, divisionIndex) =>
          divisionIndex !== index && division.code === code,
      )
    ) {
      return res.status(409).json({ error: 'Division code already exists.' });
    }
    divisionsState[index] = {
      id: divisionsState[index].id,
      code,
      name,
      chiefName,
      email: String(req.body.email ?? divisionsState[index].email).trim(),
    };
    saveDatabaseToFile();
    res.json(divisionsState[index]);
  });

  app.delete('/api/divisions/:id', (req, res) => {
    const originalLength = divisionsState.length;
    divisionsState = divisionsState.filter(
      (division) => division.id !== req.params.id,
    );
    if (divisionsState.length === originalLength) {
      return res.status(404).json({ error: 'Division not found.' });
    }
    saveDatabaseToFile();
    res.json({ success: true });
  });

  // GET Audit Logs
  app.get('/api/audit-logs', (_req, res) => {
    res.json(auditLogsState);
  });

  app.delete('/api/audit-logs', async (_req, res) => {
    const deletedCount = auditLogsState.length;
    auditLogsState = [];
    await deleteAuditLogsDirect();
    res.json({
      success: true,
      deletedCount,
      message: 'System audit records were deleted. Envelope logs were preserved.',
    });
  });

  app.post('/api/audit-logs', (req, res) => {
    const body = req.body || {};
    const actingUser = getRequestUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    const log = addAuditLog(auditLogsState, {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: body.action || 'ENVELOPE_LOG',
      documentTrackingNumber: body.documentTrackingNumber,
      details: body.details || 'System activity recorded.',
      ipAddress: req.ip || '127.0.0.1',
    } as Omit<AuditLog, 'id' | 'timestamp'>);
    res.status(201).json(log);
  });

  app.get('/api/envelope-logs', (_req, res) => {
    res.json(envelopeLogsState);
  });

  app.post('/api/envelope-logs', async (req, res) => {
    const body = req.body || {};
    const actingUser = getRequestUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    const log: AuditLog = {
      id: `envelope-log-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'ENVELOPE_LOG',
      documentTrackingNumber: body.documentTrackingNumber,
      details: body.details || 'Outgoing envelope dispatched.',
      ipAddress: req.ip || '127.0.0.1',
    };
    envelopeLogsState.unshift(log);
    await saveEnvelopeLogDirect(log);
    res.status(201).json(log);
  });

  app.delete('/api/envelope-logs', async (_req, res) => {
    const deletedCount = envelopeLogsState.length;
    envelopeLogsState = [];
    await deleteEnvelopeLogsDirect();
    res.json({ success: true, deletedCount });
  });

  // GET Notifications
  app.get('/api/notifications', async (req, res) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
    if (!userId) return res.json([]);
    const requestingUser = getRequestUser(req);
    if (!requestingUser || requestingUser.id !== userId) {
      return res.status(403).json({ error: 'Notification access denied.' });
    }
    const notificationPermissions =
      requestingUser.permissions?.allowedActions ||
      DEFAULT_ROLE_PERMISSIONS[requestingUser.role]?.allowedActions ||
      [];
    const canViewAllTransactionNotifications =
      requestingUser.permissions?.notificationViewAllConfigured === true
        ? notificationPermissions.includes('NOTIFICATION_VIEW_ALL')
        : (
            DEFAULT_ROLE_PERMISSIONS[requestingUser.role]?.allowedActions || []
          ).includes('NOTIFICATION_VIEW_ALL');
    const storedNotifications = notificationsState.filter(
      (notification) => notification.userId === userId,
    );
    const globalTransactionNotifications: NotificationItem[] =
      canViewAllTransactionNotifications
        ? auditLogsState
            .filter(
              (log) =>
                Boolean(log.documentTrackingNumber) &&
                ['CREATE_DOC', 'ROUTE_DOC', 'TRANSFER_DOC', 'UPDATE_STATUS'].includes(
                  log.action,
                ),
            )
            .map((log) => {
              const decision = log.details.match(
                /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i,
              )?.[1]?.toUpperCase();
              const status = log.details.match(/Status:\s*([^|]+)/i)?.[1]?.trim();
              const recipient = log.details.match(/To:\s*([^|]+)/i)?.[1]?.trim();
              const title =
                decision === 'APPROVED'
                  ? `Approved by ${log.userName}`
                  : decision === 'DISAPPROVED'
                    ? `Disapproved by ${log.userName}`
                    : status === 'COMPLETED'
                      ? `Document Completed by ${log.userName}`
                      : log.action === 'CREATE_DOC'
                        ? `Document Logged by ${log.userName}`
                        : `Document Routed by ${log.userName}`;
              const message = decision
                ? `${log.documentTrackingNumber} was ${decision.toLowerCase()} by ${log.userName}.${
                    decision === 'DISAPPROVED'
                      ? ` Reason: ${log.details.match(/Remarks:\s*([^|]+)/i)?.[1]?.trim() || 'No reason provided.'}`
                      : ''
                  }`
                : `${log.documentTrackingNumber} - ${title}${recipient ? ` to ${recipient}` : ''}${status ? ` (${status.replaceAll('_', ' ')})` : ''}.`;
              return {
                id: `transaction-activity-${log.id}`,
                userId,
                title,
                message,
                trackingNumber: log.documentTrackingNumber,
                documentId: documentsState.find(
                  (document) =>
                    document.trackingNumber === log.documentTrackingNumber ||
                    document.routeNo === log.documentTrackingNumber,
                )?.id,
                type: decision === 'DISAPPROVED' ? 'URGENT' : 'INFO',
                requiresDecision: false,
                decisionStatus:
                  decision === 'APPROVED' || decision === 'DISAPPROVED'
                    ? decision
                    : undefined,
                createdAt: log.timestamp,
              } satisfies NotificationItem;
            })
        : [];
    try {
      const liveNotifications = await getLiveDisplayNotifications(userId);
      if (liveNotifications) {
        return res.json([
          ...globalTransactionNotifications,
          ...storedNotifications,
          ...liveNotifications.filter(
            (notification) =>
              !storedNotifications.some(
                (stored) => stored.id === notification.id,
              ),
          ),
        ]);
      }
    } catch (error) {
      console.warn(
        'Live notification query failed; using in-memory routes:',
        error,
      );
    }
    const user = usersState.find((candidate) => candidate.id === userId);
    if (!user) return res.json([]);
    const activeNotifications: NotificationItem[] = documentsState.flatMap(
      (document) => {
        const routes = [...(document.routes || [])].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        const assignedRoutes = routes.filter(
          (route) =>
            route.toUserId === user.id ||
            (!route.toUserId &&
              route.toUser?.trim().toLowerCase() ===
                user.fullName.trim().toLowerCase()),
        );
        const assignedRoute = assignedRoutes.at(-1);
        if (!assignedRoute) return [];
        const assignedAt = new Date(assignedRoute.createdAt).getTime();
        const decisionText = `${assignedRoute.actionRequested || ''} ${assignedRoute.remarks || ''}`.toUpperCase();
        const decisionStatus = decisionText.includes('DISAPPROVED')
          ? 'DISAPPROVED' as const
          : decisionText.includes('APPROVED')
            ? 'APPROVED' as const
            : undefined;
        const isDecisionResult = Boolean(decisionStatus);
        if (isDecisionResult && Date.now() - assignedAt >= 24 * 60 * 60 * 1000) {
          return [];
        }
        const userAlreadyActed = routes.some(
          (route) =>
            (route.fromUserId === user.id ||
              (!route.fromUserId &&
                route.fromUser?.trim().toLowerCase() ===
                  user.fullName.trim().toLowerCase())) &&
            new Date(route.createdAt).getTime() > assignedAt,
        ) || auditLogsState.some(
          (log) =>
            log.documentTrackingNumber === document.trackingNumber &&
            log.userId === user.id &&
            new Date(log.timestamp).getTime() > assignedAt &&
            ['ROUTE_DOC', 'TRANSFER_DOC', 'UPDATE_STATUS'].includes(log.action),
        );
        if (userAlreadyActed || document.currentStatus === 'COMPLETED')
          return [];
        return [
          {
            id: `route-alert-${user.id}-${assignedRoute.id}`,
            userId: user.id,
            title: decisionStatus === 'APPROVED'
              ? `Approved by ${assignedRoute.fromUser}`
              : decisionStatus === 'DISAPPROVED'
                ? `Disapproved by ${assignedRoute.fromUser}`
                : 'Document Routed to You',
            message: decisionStatus === 'APPROVED'
              ? `Document ${document.routeNo || document.trackingNumber} was APPROVED by ${assignedRoute.fromUser} and will proceed to routing.`
              : decisionStatus === 'DISAPPROVED'
                ? `Document ${document.routeNo || document.trackingNumber} was DISAPPROVED by ${assignedRoute.fromUser}. Reason: ${assignedRoute.remarks || 'No reason provided.'}`
                : `Document ${document.routeNo || document.trackingNumber} (${document.title}) requires your approval.`,
            documentId: document.id,
            trackingNumber: document.routeNo || document.trackingNumber,
            type: 'ACTION_REQUIRED' as const,
            requiresDecision: false,
            decisionStatus,
            createdAt: assignedRoute.createdAt,
          },
        ];
      },
    );
    res.json([
      ...globalTransactionNotifications,
      ...storedNotifications,
      ...activeNotifications,
    ]);
  });

  app.post('/api/notifications/reminder', (req, res) => {
    const actingUser = getRequestUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    const allowedActions =
      actingUser.permissions?.allowedActions ||
      DEFAULT_ROLE_PERMISSIONS[actingUser.role]?.allowedActions ||
      [];
    if (
      actingUser.role !== 'SYSTEM_ADMIN' &&
      !allowedActions.includes('ROUTING_REMINDER_SEND')
    ) {
      return res.status(403).json({ error: 'Reminder access is not enabled for this role.' });
    }
    const document = documentsState.find(
      (candidate) => candidate.id === String(req.body.documentId || ''),
    );
    const recipient = usersState.find(
      (candidate) =>
        candidate.id === String(req.body.recipientUserId || '') &&
        candidate.active &&
        candidate.role !== 'SYSTEM_ADMIN' &&
        candidate.divisionCode !== 'ITMS',
    );
    const message = String(req.body.message || '').trim();
    if (!document || !recipient) {
      return res.status(400).json({ error: 'Select a valid document handler.' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Enter a reminder message.' });
    }
    const reminder = createNotification({
      userId: recipient.id,
      title: 'Routing Action Reminder',
      message: `${message} - Sent by ${actingUser.fullName}`,
      documentId: document.id,
      trackingNumber: document.routeNo || document.trackingNumber,
      type: 'URGENT',
      requiresDecision: true,
      reminderSenderName: actingUser.fullName,
      reminderHandlerName: recipient.fullName,
      reminderActionRequested:
        String(req.body.actionRequested || '').trim() || 'Appropriate Action',
    });
    notificationsState.unshift(reminder);
    addAuditLog(auditLogsState, {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'UPDATE_STATUS',
      documentTrackingNumber: document.trackingNumber,
      details: `Routing reminder sent to ${recipient.fullName} | Message: ${message}`,
      ipAddress: req.ip || '127.0.0.1',
    });
    saveDatabaseToFile();
    res.status(201).json(reminder);
  });

  // Notifications are display-only. Dismissed IDs are retained by the browser.
  app.delete('/api/notifications/:id', (_req, res) => {
    res.json({ success: true });
  });

  // ======================================================================
  // EMPLOYEE PROFILES API
  // ======================================================================

  // GET all employees
  app.get('/api/employees', (req, res) => {
    const actingUser = getRequestUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    // Self-heal deleted or legacy directory cards. The immutable user ID is
    // the owner key; names, usernames, roles, and passwords may safely change.
    ensureUserEmployeeProfiles();
    res.json(
      actingUser.role === 'SYSTEM_ADMIN'
        ? employeesState
        : employeesState.filter(
            (employee) => employee.userId === actingUser.id,
          ),
    );
  });

  const canManageEmployees = (req: express.Request) => {
    const user = getRequestUser(req);
    if (!user) return false;
    const actions = (
      user.permissions || DEFAULT_ROLE_PERMISSIONS[user.role]
    ).allowedActions || [];
    return (
      user.role === 'SYSTEM_ADMIN' ||
      actions.some((action) =>
        ['EMPLOYEE_CREATE', 'EMPLOYEE_EDIT', 'EMPLOYEE_DELETE'].includes(action),
      )
    );
  };

  // POST create employee
  app.post('/api/employees', (req, res) => {
    if (!canManageEmployees(req)) {
      return res.status(403).json({ error: 'Personnel management permission required.' });
    }
    const body = req.body;
    const newEmp: EmployeeProfile = {
      id: `emp-${randomUUID()}`,
      userId: body.userId || undefined,
      fullName: body.fullName,
      position: body.position,
      office: body.office,
      officeType: body.officeType || 'BLGF',
      divisionCode: body.divisionCode || undefined,
      email: body.email,
      contactNo: body.contactNo || '',
      address: body.address || '',
      active: body.active !== undefined ? body.active : true,
      createdAt: new Date().toISOString(),
    };
    employeesState.push(newEmp);
    saveDatabaseToFile();
    res.status(201).json(newEmp);
  });

  // PUT update employee
  app.put('/api/employees/:id', (req, res) => {
    const idx = employeesState.findIndex((e) => e.id === req.params.id);
    if (idx === -1)
      return res.status(404).json({ error: 'Employee not found' });
    const actingUser = getRequestUser(req);
    const actions = (
      actingUser?.permissions ||
      (actingUser ? DEFAULT_ROLE_PERMISSIONS[actingUser.role] : undefined)
    )?.allowedActions || [];
    const folderOnlyUpdate = Object.keys(req.body || {}).every(
      (key) => key === 'folders',
    );
    const canUpdateFolders = Boolean(
      actingUser &&
        folderOnlyUpdate &&
        (actingUser.role === 'SYSTEM_ADMIN' ||
          actions.includes('EMPLOYEE_FOLDER_MANAGE') ||
          employeesState[idx].userId === actingUser.id),
    );
    if (!canManageEmployees(req) && !canUpdateFolders) {
      return res.status(403).json({ error: 'Personnel management permission required.' });
    }

    employeesState[idx] = { ...employeesState[idx], ...req.body };
    if (employeesState[idx].userId && !folderOnlyUpdate && actingUser?.role === 'SYSTEM_ADMIN') {
      const uIdx = usersState.findIndex((u) => u.id === employeesState[idx].userId);
      if (uIdx >= 0) {
        if (req.body.fullName) usersState[uIdx].fullName = req.body.fullName;
        if (req.body.position) usersState[uIdx].designation = req.body.position;
        if (req.body.contactNo !== undefined) usersState[uIdx].contactNo = req.body.contactNo;
        if (req.body.divisionCode) usersState[uIdx].divisionCode = req.body.divisionCode;
        void saveUserDirect(usersState[uIdx]).catch(() => null);
      }
    }
    saveDatabaseToFile();
    res.json(employeesState[idx]);
  });

  // DELETE employee
  app.delete('/api/employees/:id', (req, res) => {
    if (getRequestUser(req)?.role !== 'SYSTEM_ADMIN') {
      return res.status(403).json({ error: 'System Administrator access required.' });
    }
    const idx = employeesState.findIndex((e) => e.id === req.params.id);
    if (idx === -1)
      return res.status(404).json({ error: 'Employee not found' });

    if (employeesState[idx].userId) {
      return res.status(400).json({
        error: 'Cannot delete static personnel linked to an active User Account. Only manually added personnel in Office Directory can be deleted.',
      });
    }

    employeesState.splice(idx, 1);
    saveDatabaseToFile();
    res.json({ success: true, message: 'Employee deleted' });
  });

  // GET directory sections
  app.get('/api/directory-sections', (_req, res) => {
    if (!directorySectionsState || directorySectionsState.length === 0) {
      directorySectionsState = [...DEFAULT_DIRECTORY_SECTIONS];
    }
    res.json(directorySectionsState);
  });

  // POST / PUT save directory sections
  const handleSaveSections = (req: express.Request, res: express.Response) => {
    const actingUser = getRequestUser(req);
    if (!actingUser || (actingUser.role !== 'SYSTEM_ADMIN' && !canManageEmployees(req))) {
      return res.status(403).json({ error: 'Permission denied to modify directory sections.' });
    }
    const nextSections = Array.isArray(req.body) ? req.body : req.body?.sections;
    if (!Array.isArray(nextSections) || nextSections.length === 0) {
      return res.status(400).json({ error: 'Invalid directory sections format.' });
    }
    directorySectionsState = nextSections;
    saveDatabaseToFile();
    res.json({ success: true, directorySections: directorySectionsState });
  };
  app.post('/api/directory-sections', handleSaveSections);
  app.put('/api/directory-sections', handleSaveSections);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // -------------------------------------------------------------
  // IONIC ANGULAR STATIC FRONTEND
  // -------------------------------------------------------------
  if (IS_VERCEL) return app;

  const distPath = path.join(process.cwd(), 'dist', 'frontend');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  let activePort = PORT;
  const maxPort = process.env.PORT ? PORT : PORT + 10;

  while (true) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = app.listen(activePort, '0.0.0.0');
        server.once('listening', resolve);
        server.once('error', reject);
      });
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const canRetry =
        !process.env.PORT &&
        (code === 'EACCES' || code === 'EADDRINUSE') &&
        activePort < maxPort;

      if (!canRetry) {
        throw error;
      }

      console.warn(
        `Port ${activePort} is unavailable (${code}); trying ${activePort + 1}.`,
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
    console.error('Server failed to start:', error);
    process.exitCode = 1;
  });
}
