import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import zlib from 'zlib';
import { createUsersRouter } from './users.js';
import { createDocumentsRouter } from './documents.js';
import { isDocumentParticipant } from '../frontend/src/app/utils/document-visibility.js';
import { getPendingRecipients } from '../frontend/src/app/utils/routing-recipients.js';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import {
  sendTemporaryPasswordEmail,
  getSmtpConfig,
} from './emailService.js';
import {
  connectMySQLReplica,
  disconnectMySQLReplica,
  getLiveDisplayNotifications,
  loadLiveDocuments,
  loadMySQLState,
  syncMySQLReplica,
  saveEnvelopeLogDirect,
  deleteAuditLogsDirect,
  deleteEnvelopeLogsDirect,
  updateUserPassword,
  saveUserDirect,
  readSystemSetting,
  saveSystemSetting,
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
  DEFAULT_ROLE_PERMISSIONS,
} from '../frontend/src/app/types';
import { addAuditLog, createNotification } from './serverUtils.js';
import { generateOfficialPdfBuffer } from './pdfGenerator.js';
import { nextReadableId } from './readableIds.js';

dotenv.config({ quiet: true });

const DEFAULT_PORT = 3001;
const PORT = Number(process.env.PORT || DEFAULT_PORT);
const HOST = process.env.HOST || '0.0.0.0';
const IS_VERCEL = Boolean(process.env.VERCEL);
// Server start
const adminPasswordResetRequests = new Map<string, number>();
const LOGIN_MAX_FAILED_ATTEMPTS = 3;
const LOGIN_LOCK_DURATIONS_SECONDS = [30, 40, 60] as const;
const loginAttemptState = new Map<string, {
  failedAttempts: number;
  lockLevel: number;
  lockedUntil: number;
}>();
// JSON files under backend/data are recovery snapshots only. MySQL is the
// authoritative database and always replaces this in-memory bootstrap state.
const BUNDLED_DATA_DIR = path.join(process.cwd(), 'backend', 'data');
const DATA_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), 'blgf-data')
  : path.join(process.cwd(), 'backend', 'data');
const MOBILE_PUBLIC_URL_FILE = path.join(DATA_DIR, '.mobile-public-url.json');
const DB_FILE = path.join(DATA_DIR, 'blgf_doctrack_db.json');
const ENVELOPE_LOG_DB_FILE = path.join(DATA_DIR, 'blgf_envelope_logs_db.json');
type StorageKind =
  | 'documentAttachments'
  | 'profilePictures'
  | 'loginBackground';
type StorageConfig = Record<StorageKind, string>;
const STORAGE_ROOT_DIR = path.join(DATA_DIR, 'storage');
const STORAGE_DIRECTORIES: StorageConfig = {
  documentAttachments: path.join(STORAGE_ROOT_DIR, 'attachments'),
  profilePictures: path.join(STORAGE_ROOT_DIR, 'profile-pictures'),
  loginBackground: path.join(STORAGE_ROOT_DIR, 'login-background'),
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

function readRuntimeMobilePublicUrl(): string {
  if (IS_VERCEL || !fs.existsSync(MOBILE_PUBLIC_URL_FILE)) return '';
  try {
    const value = JSON.parse(fs.readFileSync(MOBILE_PUBLIC_URL_FILE, 'utf8')) as {
      publicUrl?: unknown;
    };
    const publicUrl = String(value.publicUrl || '').trim();
    return /^https:\/\/[a-z0-9.-]+(?:\/.*)?$/i.test(publicUrl) ? publicUrl : '';
  } catch {
    return '';
  }
}
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
const LOGIN_BACKGROUND_KEY = 'login_background_url';
let loginBackgroundUrlState: string | null = null;

export interface DirectorySectionRecord {
  id: string;
  label: string;
  officeTypes: string[];
  color?: string;
}

const normalizeDirectoryOfficeTypes = (types: unknown): string[] => {
  if (Array.isArray(types)) return types.map((t) => String(t));
  if (typeof types === 'string') {
    try {
      const parsed = JSON.parse(types);
      if (Array.isArray(parsed)) return parsed.map((t) => String(t));
    } catch {
      return [types];
    }
  }
  return [];
};

const DEFAULT_DIRECTORY_SECTIONS: DirectorySectionRecord[] = [
  { id: 'BLGF', label: 'BLGF Personnel', officeTypes: ['BLGF'], color: 'blue' },
  {
    id: 'MUNICIPAL_TREASURER',
    label: 'Municipal Treasurers',
    officeTypes: ['MUNICIPAL_TREASURER'],
    color: 'purple',
  },
  {
    id: 'PROVINCIAL_TREASURER',
    label: 'Provincial Treasurers',
    officeTypes: ['PROVINCIAL_TREASURER'],
    color: 'cyan',
  },
  {
    id: 'LGU_STAFF',
    label: 'LGU Staff',
    officeTypes: ['LGU'],
    color: 'emerald',
  },
  {
    id: 'OTHER_AGENCIES',
    label: 'Other Agencies',
    officeTypes: ['OTHER_AGENCIES'],
    color: 'amber',
  },
];

function migrateDirectorySections(sections: DirectorySectionRecord[]): DirectorySectionRecord[] {
  if (!Array.isArray(sections) || sections.length === 0) {
    return [...DEFAULT_DIRECTORY_SECTIONS];
  }
  let result = sections.map((s) => ({
    ...s,
    officeTypes: normalizeDirectoryOfficeTypes(s.officeTypes),
  }));

  const hasDedicatedMto = result.some(
    (s) => s.officeTypes.length === 1 && s.officeTypes[0] === 'MUNICIPAL_TREASURER',
  );

  if (!hasDedicatedMto) {
    result = result.map((s) => {
      if (s.officeTypes.includes('MUNICIPAL_TREASURER')) {
        return {
          ...s,
          officeTypes: s.officeTypes.filter((t) => t !== 'MUNICIPAL_TREASURER'),
        };
      }
      return s;
    });

    const mtoSection: DirectorySectionRecord = {
      id: 'MUNICIPAL_TREASURER',
      label: 'Municipal Treasurers',
      officeTypes: ['MUNICIPAL_TREASURER'],
      color: 'purple',
    };
    const blgfIdx = result.findIndex((s) => s.id === 'BLGF');
    if (blgfIdx >= 0) {
      result.splice(blgfIdx + 1, 0, mtoSection);
    } else {
      result.unshift(mtoSection);
    }
  }

  const hasDedicatedPto = result.some(
    (s) => s.officeTypes.length === 1 && s.officeTypes[0] === 'PROVINCIAL_TREASURER',
  );
  if (!hasDedicatedPto) {
    result = result.map((s) => {
      if (s.officeTypes.includes('PROVINCIAL_TREASURER')) {
        return {
          ...s,
          officeTypes: s.officeTypes.filter((t) => t !== 'PROVINCIAL_TREASURER'),
        };
      }
      return s;
    });

    const ptoSection: DirectorySectionRecord = {
      id: 'PROVINCIAL_TREASURER',
      label: 'Provincial Treasurers',
      officeTypes: ['PROVINCIAL_TREASURER'],
      color: 'cyan',
    };
    const mtoIdx = result.findIndex((s) => s.id === 'MUNICIPAL_TREASURER');
    if (mtoIdx >= 0) {
      result.splice(mtoIdx + 1, 0, ptoSection);
    } else {
      result.push(ptoSection);
    }
  }

  return result;
}

let directorySectionsState: DirectorySectionRecord[] = DEFAULT_DIRECTORY_SECTIONS;

const RESERVED_SYSTEM_ADMIN: User = {
  id: 'USR-0008',
  username: 'tom',
  fullName: 'Tom Catral',
  email: 'catraltom@gmail.com',
  role: 'SYSTEM_ADMIN',
  divisionCode: 'ITMS',
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

function sanitizeUserPermissionsOnLoad(user: User): User {
  if (user.role === 'SYSTEM_ADMIN' || user.divisionCode === 'ITMS') {
    return {
      ...user,
      role: 'SYSTEM_ADMIN',
      divisionCode: 'ITMS' as const,
      permissions: user.permissions
        ? {
            ...user.permissions,
            canViewAllRoutes: true,
            canViewAllDocuments: true,
          }
        : undefined,
    };
  }
  const adminActions = [
    'USER_ACCOUNT_CREATE',
    'USER_ACCOUNT_EDIT',
    'USER_ACCOUNT_DELETE',
    'USER_SYSTEM_ADMIN_MANAGE',
  ];
  let permissions = user.permissions;
  if (permissions) {
    const canViewAll = Boolean(permissions.canViewAllRoutes);
    permissions = {
      ...permissions,
      canViewAllRoutes: canViewAll,
      canViewAllDocuments: canViewAll,
      allowedViews: (permissions.allowedViews || []).filter((v) => v !== 'users'),
      allowedActions: (permissions.allowedActions || []).filter(
        (a) => !adminActions.includes(a),
      ),
    };
  }
  return { ...user, permissions };
}

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
      usersState = (data.users || []).map(sanitizeUserPermissionsOnLoad);
      documentsState = data.documents || [];
      const validDocKeys = new Set(
        documentsState.flatMap((d) => [
          d.id?.trim().toUpperCase(),
          d.trackingNumber?.trim().toUpperCase(),
          d.routeNo?.trim().toUpperCase(),
        ]).filter(Boolean) as string[],
      );
      auditLogsState = (data.auditLogs || []).filter((log: AuditLog) => {
        if (!log.documentTrackingNumber) return true;
        // A DELETE_DOC tombstone outlives its document on purpose: it is the
        // record that retired a route number for good, so dropping it would let
        // the same number be handed out again.
        if (log.action === 'DELETE_DOC') return true;
        return validDocKeys.has(log.documentTrackingNumber.trim().toUpperCase());
      });
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
      notificationsState = (data.notifications || []).filter((n: NotificationItem) => {
        if (n.documentId && !validDocKeys.has(n.documentId.trim().toUpperCase())) return false;
        if (n.trackingNumber && !validDocKeys.has(n.trackingNumber.trim().toUpperCase())) return false;
        return true;
      });
      repairInitialRouteRecipients();
      purgeRecalledRecipientRoutes();
      employeesState = data.employees || [];
      directorySectionsState = migrateDirectorySections(data.directorySections || DEFAULT_DIRECTORY_SECTIONS);
      if (typeof data.systemSettings?.login_background_url !== 'undefined') {
        loginBackgroundUrlState = data.systemSettings.login_background_url || null;
      }
      if (!loginBackgroundUrlState && data.systemSettings?.explicitRemoved !== true) {
        const bgDir = STORAGE_DIRECTORIES.loginBackground;
        if (fs.existsSync(bgDir)) {
          const files = fs.readdirSync(bgDir)
            .filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f))
            .map(f => ({ name: f, time: fs.statSync(path.join(bgDir, f)).mtimeMs }))
            .sort((a, b) => b.time - a.time);
          if (files.length > 0) {
            loginBackgroundUrlState = storageFileUrl('loginBackground', files[0].name);
          }
        }
      }
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
  usersState = use<User[]>('users', usersState).map(sanitizeUserPermissionsOnLoad);
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

// Full-snapshot replication deletes and rewrites every table. That must never
// happen implicitly from an ordinary save, so it stays opt-in via
// BLGF_MYSQL_SYNC_ON_SAVE=1 or an explicit request to /api/admin/sync.
function queueDatabaseSync(force = false) {
  if (!getMySQLReplicaStatus().connected) return;
  if (!force && process.env.BLGF_MYSQL_SYNC_ON_SAVE !== '1') return;
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
      if (mysqlSyncRequested) queueDatabaseSync(true);
    });
}

export async function flushDatabaseSync() {
  flushDatabaseFileWrite();
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
  const empId = primaryExisting?.id || nextReadableId('EMP', employeesState);

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

function purgeRecalledRecipientRoutes() {
  let changed = false;
  for (const doc of documentsState) {
    if (!doc.routes || doc.routes.length === 0) continue;
    const removalLogs = auditLogsState.filter((log) => {
      const isThisDoc =
        log.documentTrackingNumber === doc.trackingNumber ||
        (Boolean(doc.routeNo) && log.documentTrackingNumber === doc.routeNo) ||
        (Boolean(doc.id) && log.documentTrackingNumber === doc.id);
      return isThisDoc && (log.details || '').toLowerCase().includes('removed recipient');
    });
    if (removalLogs.length === 0) continue;

    for (const remLog of removalLogs) {
      const match = remLog.details.match(/removed recipient\s+([^|(]+?)(?:\s*\(([^)]+)\))?\s+from transaction/i);
      if (!match) continue;
      const removedName = match[1].trim().toLowerCase();
      const removalTime = new Date(remLog.timestamp).getTime();

      const initialCount = doc.routes.length;
      doc.routes = doc.routes.filter((route) => {
        const matchesRoute =
          (route.toUser && route.toUser.trim().toLowerCase() === removedName) ||
          (route.fromUser && route.fromUser.trim().toLowerCase() === removedName);
        if (!matchesRoute) return true;
        const routeTime = new Date(route.createdAt).getTime();
        return routeTime > removalTime;
      });

      if (doc.routes.length !== initialCount) {
        changed = true;
        doc.routes.forEach((r, idx) => {
          if (r.stepNumber !== 0) {
            r.stepNumber = idx + 1;
          }
        });
      }
    }
  }
  if (changed) saveDatabaseToFile();
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

function writeJsonFileAtomic(target: string, contents: string) {
  try {
    fs.writeFileSync(target, contents, 'utf-8');
  } catch (err: any) {
    if (err?.code === 'EBUSY' || err?.code === 'EPERM') {
      try {
        const tempFile = `${target}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFileSync(tempFile, contents, 'utf-8');
        fs.renameSync(tempFile, target);
      } catch {
        // In-memory data is intact, safe fallback on Windows lock contention
      }
    } else {
      console.error('[ERROR] Error saving database file:', err);
    }
  }
}

const DATABASE_FILE_WRITE_DEBOUNCE_MS = 150;
let databaseFileDirty = false;
let databaseFileWriteTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDatabaseSyncRequest = false;

function writeDatabaseFileNow(queueSync: boolean) {
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
      systemSettings: {
        login_background_url: loginBackgroundUrlState,
        explicitRemoved: loginBackgroundUrlState === null,
      },
    };
    const serialized = JSON.stringify(payload, null, 2)
      .replace(/\u0410/g, 'A')
      .replace(/\u2014/g, '-');
    writeJsonFileAtomic(DB_FILE, serialized);
    databaseFileDirty = false;
    if (queueSync) queueDatabaseSync();
  } catch (err) {
    console.error('[ERROR] Error saving database file:', err);
  }
}

// One user action can touch the document, its audit trail and several
// notifications at once. Rewriting the whole database file for each of them
// blocks the event loop and is what makes the app feel slow, so writes are
// coalesced and flushed on the next tick, on demand, and on shutdown.
function scheduleDatabaseFileWrite(queueSync: boolean) {
  databaseFileDirty = true;
  pendingDatabaseSyncRequest = pendingDatabaseSyncRequest || queueSync;
  if (databaseFileWriteTimer) return;
  databaseFileWriteTimer = setTimeout(() => {
    databaseFileWriteTimer = null;
    flushDatabaseFileWrite();
  }, DATABASE_FILE_WRITE_DEBOUNCE_MS);
}

export function flushDatabaseFileWrite() {
  if (databaseFileWriteTimer) {
    clearTimeout(databaseFileWriteTimer);
    databaseFileWriteTimer = null;
  }
  if (!databaseFileDirty) return;
  writeDatabaseFileNow(pendingDatabaseSyncRequest);
  pendingDatabaseSyncRequest = false;
}

export function saveDatabaseToFile(queueSync = true) {
  if (IS_VERCEL) {
    if (queueSync) queueDatabaseSync();
    return;
  }
  scheduleDatabaseFileWrite(queueSync);
}

function saveEnvelopeLogsToFile() {
  if (IS_VERCEL) {
    queueDatabaseSync();
    return;
  }
  writeJsonFileAtomic(
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
  app.set('trust proxy', true);
  app.use(cors());

  // High-performance gzip compression for API JSON and text payloads > 1KB
  app.use((req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (!acceptEncoding.includes('gzip')) {
      return next();
    }
    const originalSend = res.send.bind(res);
    res.send = (body: any): any => {
      if (
        res.getHeader('Content-Encoding') ||
        res.statusCode < 200 ||
        res.statusCode === 204 ||
        res.statusCode === 304
      ) {
        return originalSend(body);
      }
      const rawBuffer = Buffer.isBuffer(body)
        ? body
        : Buffer.from(typeof body === 'object' ? JSON.stringify(body) : String(body ?? ''));

      if (rawBuffer.length < 1024) {
        return originalSend(body);
      }

      try {
        const gzipped = zlib.gzipSync(rawBuffer, { level: 6 });
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        res.removeHeader('Content-Length');
        return originalSend(gzipped);
      } catch {
        return originalSend(body);
      }
    };
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  const getRequestUser = (req: express.Request) =>
    usersState.find(
      (user) => user.id === String(req.get('X-User-Id') || '') && user.active !== false,
    );

  // Login background is a single global setting managed from User Accounts.
  // It is cached in memory, saved in db.json, and mirrored to the system_settings table.
  try {
    const dbBackground = await readSystemSetting(LOGIN_BACKGROUND_KEY);
    if (dbBackground) {
      loginBackgroundUrlState = dbBackground;
    }
  } catch (error) {
    console.warn('[SETTINGS] Login background load warning:', error);
  }

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

  // MySQL is the source of truth and is loaded into shared server state at
  // startup (and refreshed by an explicit sync). Read requests must never
  // replace shared state, otherwise concurrent polling can overwrite newer
  // in-memory writes mid-request.

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
      // The login background renders before sign-in, so only real raster images
      // are accepted for that slot.
      if (kind === 'loginBackground' && !/^image\/(jpe?g|png|webp|gif)$/.test(req.file.mimetype)) {
        return res
          .status(400)
          .json({ error: 'Login background must be a JPG, PNG, WEBP, or GIF image.' });
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

  // Unauthenticated: the login page renders before anyone signs in.
  app.get('/api/settings/login-background', (_req, res) => {
    res.json({ url: loginBackgroundUrlState });
  });

  app.put('/api/settings/login-background', async (req, res) => {
    const actingUser = getRequestUser(req);
    if (!actingUser || (actingUser.role !== 'SYSTEM_ADMIN' && actingUser.divisionCode !== 'ITMS')) {
      return res.status(403).json({ error: 'SYSTEM_ADMIN access required.' });
    }
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    const nextUrl = rawUrl ? rawUrl : null;
    if (nextUrl && !nextUrl.startsWith('/api/storage/files/loginBackground/')) {
      return res.status(400).json({ error: 'Invalid background image URL.' });
    }
    try {
      await saveSystemSetting(LOGIN_BACKGROUND_KEY, nextUrl);
      loginBackgroundUrlState = nextUrl;
      saveDatabaseToFile(false);
      res.json({ url: loginBackgroundUrlState });
    } catch (error: any) {
      console.error('Failed to save login background:', error);
      res.status(500).json({ error: 'Failed to save login background.' });
    }
  });

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

  // Lightweight in-process presence tracking for the local/public-IP server.
  // A user is considered online while heartbeats arrive within 45 seconds.
  const presenceByUserId = new Map<string, number>();
  const presenceTtlMs = 45_000;
  const onlineUserIds = (): string[] => {
    const cutoff = Date.now() - presenceTtlMs;
    for (const [userId, lastSeen] of presenceByUserId) {
      if (lastSeen < cutoff) presenceByUserId.delete(userId);
    }
    return [...presenceByUserId.keys()];
  };

  app.post('/api/presence/heartbeat', (req, res) => {
    const userId = String(req.body?.userId || '').trim();
    const user = usersState.find((entry) => entry.id === userId && entry.active);
    if (!user) return res.status(400).json({ error: 'Valid active user is required.' });
    presenceByUserId.set(userId, Date.now());
    return res.json({ onlineUserIds: onlineUserIds() });
  });

  app.get('/api/presence', (_req, res) => {
    res.json({ onlineUserIds: onlineUserIds() });
  });

  app.get('/api/system/network-info', (req, res) => {
    try {
      const interfaces = os.networkInterfaces();
      const addresses: string[] = [];
      for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name] || []) {
          if (net.family === 'IPv4' && !net.internal) {
            addresses.push(net.address);
          }
        }
      }
      const preferredIp =
        addresses.find((ip) => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) ||
        addresses[0] ||
        'localhost';

      const domainPort = PORT === 80 ? '' : `:${PORT}`;
      const ipUrl = preferredIp !== 'localhost' ? `http://${preferredIp}${domainPort}/login` : `http://localhost${domainPort}/login`;
      const domainUrl = ipUrl;
      const fallbackDomainUrl = ipUrl;
      const localDomain = preferredIp;

      const hostHeader = req.get('host') || `${preferredIp}:${PORT}`;
      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || (IS_VERCEL ? 'https' : 'http');
      const currentOrigin = `${protocol}://${hostHeader}`;

      const publicDomain = process.env.PUBLIC_DOMAIN || 'blgfdts.duckdns.org';
      const runtimeMobileUrl = readRuntimeMobilePublicUrl();
      const publicUrl = runtimeMobileUrl || process.env.PUBLIC_URL || `https://${publicDomain}/login`;
      const publicIp = process.env.PUBLIC_IP || '124.6.177.154';
      const hostname = os.hostname().toLowerCase();

      res.json({
        localIp: preferredIp,
        port: PORT,
        hostname,
        localDomain,
        domainUrl,
        fallbackDomainUrl,
        ipUrl,
        lanUrl: ipUrl,
        publicUrl,
        publicIp,
        publicDomain,
        currentOrigin,
        mobileTunnelActive: Boolean(runtimeMobileUrl),
        isVercel: IS_VERCEL,
        allIps: addresses,
      });
    } catch (err: any) {
      const hostHeader = req.get('host') || 'blgf-region2.vercel.app';
      res.json({
        localIp: 'localhost',
        port: PORT,
        hostname: 'server',
        localDomain: 'localhost',
        domainUrl: `http://localhost:${PORT}/login`,
        ipUrl: `http://localhost:${PORT}/login`,
        lanUrl: `http://localhost:${PORT}/login`,
        publicUrl: 'https://blgfdts.duckdns.org/login',
        publicIp: '124.6.177.154',
        publicDomain: 'blgfdts.duckdns.org',
        currentOrigin: IS_VERCEL ? `https://${hostHeader}` : `http://localhost:${PORT}`,
        isVercel: IS_VERCEL,
        allIps: [],
      });
    }
  });

  // Explicit full MySQL replication for system administrators. Ordinary saves
  // persist to the local JSON store only.
  app.post('/api/admin/sync', (req, res) => {
    const actingUser = usersState.find(
      (user) => user.id === req.header('X-User-Id'),
    );
    if (!actingUser || actingUser.role !== 'SYSTEM_ADMIN') {
      return res.status(403).json({ error: 'System administrator access required.' });
    }
    queueDatabaseSync(true);
    void flushDatabaseSync().then(() =>
      res.json({ synced: true, recordsCount: getDatabaseStateEntries().length }),
    );
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

    const activeCandidates = matchingUsers.filter((candidate) => candidate.active);
    const attemptKey = activeCandidates[0]?.id || username;
    const attemptState = loginAttemptState.get(attemptKey);
    if (attemptState?.lockedUntil && attemptState.lockedUntil > Date.now()) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((attemptState.lockedUntil - Date.now()) / 1000),
      );
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: `Sign-in is locked. Try again in ${retryAfterSeconds} seconds.`,
        code: 'LOGIN_LOCKED',
        retryAfterSeconds,
        redirectToForgotPassword: false,
      });
    }
    if (attemptState?.lockedUntil && attemptState.lockedUntil <= Date.now()) {
      loginAttemptState.set(attemptKey, { ...attemptState, lockedUntil: 0 });
    }

    const user = activeCandidates.find(
      (candidate) =>
        typeof candidate.password === 'string' &&
        candidate.password === password,
    );
    if (!user) {
      const currentState = loginAttemptState.get(attemptKey) || {
        failedAttempts: 0,
        lockLevel: 0,
        lockedUntil: 0,
      };

      if (currentState.lockLevel >= LOGIN_LOCK_DURATIONS_SECONDS.length) {
        return res.status(423).json({
          error: 'The password is still incorrect after the final lock period. Account recovery is now required.',
          code: 'RECOVERY_REQUIRED',
          redirectToForgotPassword: true,
        });
      }

      const failedAttempts = currentState.failedAttempts + 1;
      const attemptsRemaining = Math.max(0, LOGIN_MAX_FAILED_ATTEMPTS - failedAttempts);
      const shouldApplyLock = currentState.lockLevel > 0 || failedAttempts >= LOGIN_MAX_FAILED_ATTEMPTS;

      if (shouldApplyLock) {
        const lockSeconds = LOGIN_LOCK_DURATIONS_SECONDS[currentState.lockLevel];
        const lockedUntil = Date.now() + lockSeconds * 1000;
        const nextLockLevel = currentState.lockLevel + 1;
        loginAttemptState.set(attemptKey, {
          failedAttempts: 0,
          lockLevel: nextLockLevel,
          lockedUntil,
        });
        res.setHeader('Retry-After', String(lockSeconds));
        return res.status(429).json({
          error: `Incorrect password. Sign-in is locked for ${lockSeconds} seconds.`,
          code: 'LOGIN_LOCKED',
          retryAfterSeconds: lockSeconds,
          redirectToForgotPassword: false,
        });
      }

      loginAttemptState.set(attemptKey, {
        failedAttempts,
        lockLevel: currentState.lockLevel,
        lockedUntil: 0,
      });
      return res.status(401).json({
        error: `Incorrect password. ${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining before a 30-second lock.`,
        code: 'INCORRECT_PASSWORD',
        attemptsRemaining,
      });
    }
    if (
      user.temporaryPasswordExpiresAt &&
      new Date(user.temporaryPasswordExpiresAt).getTime() <= Date.now()
    ) {
      return res.status(401).json({
        error: 'Temporary password expired. Request a new temporary password.',
      });
    }

    loginAttemptState.delete(attemptKey);

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
    // Signing in with a temporary password does not finish the login: the
    // client has to collect a new password first. The expiry check above
    // already rejected stale temporary passwords, so any remaining value means
    // this credential is a live temporary one.
    const mustChangePassword = Boolean(user.temporaryPasswordExpiresAt);
    return res.json({ user: safeUser, mustChangePassword });
  });

  // Finishes a temporary-password login. The temporary credential is verified
  // again here because no session exists yet, so the new password can only be
  // stored after proving ownership of the account.
  app.post('/api/auth/complete-password-setup', async (req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const temporaryPassword = String(req.body?.temporaryPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!username || !temporaryPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Username, temporary password, and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters long.' });
    }
    if (newPassword === temporaryPassword) {
      return res
        .status(400)
        .json({ error: 'Your new password must be different from the temporary password.' });
    }

    const user = usersState.find(
      (candidate) =>
        candidate.active &&
        candidate.username.trim().toLowerCase() === username,
    );
    if (
      !user ||
      typeof user.password !== 'string' ||
      user.password !== temporaryPassword ||
      !user.temporaryPasswordExpiresAt
    ) {
      return res
        .status(401)
        .json({ error: 'Temporary password is no longer valid. Sign in again.' });
    }
    if (new Date(user.temporaryPasswordExpiresAt).getTime() <= Date.now()) {
      return res
        .status(401)
        .json({ error: 'Temporary password expired. Request a new temporary password.' });
    }

    user.password = newPassword;
    user.temporaryPasswordExpiresAt = null;
    try {
      await saveUserDirect(user);
    } catch (databaseError) {
      console.warn('[AUTH] New password persistence warning:', databaseError);
    }

    addAuditLog(auditLogsState, {
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'UPDATE_USER',
      details: `${user.fullName} replaced a temporary password with a new account password.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    const {
      password: _newPassword,
      temporaryPasswordExpiresAt: _clearedExpiry,
      ...safeUser
    } = user;
    return res.json({ user: safeUser });
  });

  const handleForgotPassword = async (req: express.Request, res: express.Response) => {
    const identifier = String(
      req.body?.identifier ||
        req.body?.usernameOrEmail ||
        req.body?.email ||
        req.body?.username ||
        '',
    )
      .trim()
      .toLowerCase();
    if (!identifier) {
      return res.status(400).json({
        error: 'Username or email is required.',
      });
    }

    const matchingUsers = usersState.filter(
      (user) =>
        user.active &&
        (user.username.trim().toLowerCase() === identifier ||
          (user.email && user.email.trim().toLowerCase() === identifier)),
    );
    const targetUser =
      matchingUsers.find(
        (user) => user.username.trim().toLowerCase() === identifier,
      ) ||
      matchingUsers.find(
        (user) => user.email && user.email.trim().toLowerCase() === identifier,
      ) ||
      matchingUsers[0];

    if (!targetUser) {
      return res.status(404).json({
        error:
          'No active user account matches that username or email.',
      });
    }

    const lastRequest = adminPasswordResetRequests.get(targetUser.id) || 0;
    if (Date.now() - lastRequest < 15_000) {
      return res.status(429).json({
        error:
          'A temporary recovery password was recently generated. Please wait 15 seconds before trying again.',
      });
    }

    const recipientEmail = targetUser.email?.trim();
    if (!recipientEmail || recipientEmail === 'N/A' || !recipientEmail.includes('@')) {
      return res.status(400).json({
        error: `User account "${targetUser.fullName}" (${targetUser.username}) does not have an official email address on file. Please contact your system administrator to configure your email address.`,
      });
    }

    const smtpConfig = getSmtpConfig();
    if (!smtpConfig.isConfigured) {
      return res.status(503).json({
        error:
          'Email delivery is currently unconfigured. Please configure SMTP_USER and SMTP_PASSWORD in .env so the temporary password can be delivered directly to your email address.',
      });
    }

    // Generate secure, readable recovery password
    const temporaryPassword = `BLGF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const temporaryPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    try {
      const emailResult = await sendTemporaryPasswordEmail(
        targetUser,
        temporaryPassword,
        15,
      );

      if (!emailResult.success) {
        return res.status(500).json({
          error: `Failed to deliver recovery email to ${recipientEmail}: ${emailResult.error || 'SMTP delivery failed'}. Please verify SMTP settings in .env.`,
        });
      }

      // Update password only after email is successfully dispatched
      targetUser.password = temporaryPassword;
      targetUser.temporaryPasswordExpiresAt = temporaryPasswordExpiresAt.toISOString();

      try {
        await updateUserPassword(
          targetUser.id,
          temporaryPassword,
          temporaryPasswordExpiresAt,
        );
      } catch (databaseError) {
        console.warn('[AUTH] Direct MySQL password update warning:', databaseError);
      }
      adminPasswordResetRequests.set(targetUser.id, Date.now());
      loginAttemptState.delete(targetUser.id);

      addAuditLog(auditLogsState, {
        userId: targetUser.id,
        userName: targetUser.fullName,
        userRole: targetUser.role,
        action: 'UPDATE_USER',
        details: `A temporary password was successfully emailed to ${targetUser.fullName} (${targetUser.username}) at ${recipientEmail}.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.json({
        success: true,
        emailSent: true,
        message: `A temporary password has been dispatched to your email address: ${recipientEmail}.`,
        targetEmail: recipientEmail,
        username: targetUser.username,
        expiresInMinutes: 15,
      });
    } catch (emailError: any) {
      console.error('[AUTH] SMTP dispatch failed:', emailError);
      return res.status(500).json({
        error: `Failed to deliver recovery email to ${recipientEmail}: ${emailError?.message || 'SMTP connection failed'}. Please verify SMTP settings in .env.`,
      });
    }
  };

  app.post('/api/auth/forgot-password', handleForgotPassword);
  app.post('/api/auth/forgot-admin-password', handleForgotPassword);

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
  app.get('/api/stats', async (_req, res) => {
    try {
      const liveDocuments = await loadLiveDocuments();
      if (liveDocuments) documentsState = liveDocuments as DocumentRecord[];
    } catch {
      // ignore
    }
    const totalIncoming = documentsState.filter(
      (d) => d.direction === 'INCOMING',
    ).length;
    const totalOutgoing = documentsState.filter(
      (d) => d.direction === 'OUTGOING',
    ).length;
    const pendingCount = documentsState.filter(
      (d) => d.currentStatus === 'PENDING' || d.currentStatus === 'NOT_YET_ROUTED',
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

    // Division breakdown: active workload per division. Every functional division
    // involved in an active document (originating division, current division, and
    // routing participants) is included in the workload count.
    const divMap: Record<string, number> = {};
    divisionsState.forEach((d) => {
      divMap[d.code] = 0;
    });
    documentsState.forEach((doc) => {
      if (doc.currentStatus === 'COMPLETED') return;
      const involvedDivisions = new Set<string>();
      if (doc.currentDivision) involvedDivisions.add(doc.currentDivision);
      const creatorUser = doc.createdByUserId
        ? usersState.find((u) => u.id === doc.createdByUserId)
        : null;
      if (creatorUser?.divisionCode) involvedDivisions.add(creatorUser.divisionCode);
      (doc.routes || []).forEach((route) => {
        if (route.toDivision) involvedDivisions.add(route.toDivision);
        if (route.fromDivision) involvedDivisions.add(route.fromDivision);
      });
      involvedDivisions.forEach((code) => {
        if (divMap[code] !== undefined) {
          divMap[code] = (divMap[code] || 0) + 1;
        }
      });
    });

    const divisionBreakdown = Object.entries(divMap).map(([code, count]) => ({
      division: code,
      count,
    }));

    // Status breakdown
    const statusMap: Record<DocumentStatus, number> = {
      NOT_YET_ROUTED: 0,
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
        status: 'NOT_YET_ROUTED' as DocumentStatus,
        label: 'Not Yet Routed',
        count: statusMap.NOT_YET_ROUTED,
        color: '#8b5cf6',
      },
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
      id: nextReadableId('DIV', divisionsState),
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
      id: nextReadableId('ENV', envelopeLogsState),
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
    const activeDocTrackings = new Map<string, DocumentRecord>();
    for (const d of documentsState) {
      if (d.id) activeDocTrackings.set(d.id.trim().toUpperCase(), d);
      if (d.trackingNumber) activeDocTrackings.set(d.trackingNumber.trim().toUpperCase(), d);
      if (d.routeNo) activeDocTrackings.set(d.routeNo.trim().toUpperCase(), d);
    }
    // The transaction-activity feed may only ever describe this account's own
    // documents. Without this an activity log on somebody else's routing would
    // surface in the requester's notification list.
    const isOwnDocument = (document: DocumentRecord) =>
      isDocumentParticipant(document, requestingUser, auditLogsState);

    // Clean up any stale/orphaned notifications in memory
    notificationsState = notificationsState.filter((n) => {
      if (n.documentId && !activeDocTrackings.has(n.documentId.trim().toUpperCase())) {
        return false;
      }
      if (n.trackingNumber && !activeDocTrackings.has(n.trackingNumber.trim().toUpperCase())) {
        return false;
      }
      return true;
    });

    const storedNotifications = notificationsState
      .filter((notification) => notification.userId === userId)
      .map((notification) =>
        notification.title === 'Routing Action Reminder'
          ? { ...notification, type: 'URGENT' as const, requiresDecision: false, decisionStatus: undefined }
          : notification,
      );
    const globalTransactionNotifications: NotificationItem[] =
      canViewAllTransactionNotifications
        ? auditLogsState
            .filter(
              (log) =>
                Boolean(log.documentTrackingNumber) &&
                activeDocTrackings.has(log.documentTrackingNumber.trim().toUpperCase()) &&
                ['CREATE_DOC', 'ROUTE_DOC', 'TRANSFER_DOC', 'UPDATE_STATUS'].includes(
                  log.action,
                ) &&
                !log.details?.startsWith('Routing reminder sent to'),
            )
            .map<NotificationItem | null>((log) => {
              const matchedDoc = log.documentTrackingNumber
                ? activeDocTrackings.get(log.documentTrackingNumber.trim().toUpperCase())
                : undefined;
              if (!matchedDoc || !isOwnDocument(matchedDoc)) return null;
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
                documentId: matchedDoc.id,
                type: decision === 'DISAPPROVED' ? 'URGENT' : 'INFO',
                requiresDecision: false,
                decisionStatus:
                  decision === 'APPROVED' || decision === 'DISAPPROVED'
                    ? decision
                    : undefined,
                createdAt: log.timestamp,
              } satisfies NotificationItem;
            })
            .filter((n): n is NotificationItem => n !== null)
        : [];
    const dedupedGlobalNotifications = [
      ...globalTransactionNotifications
        .reduce((map, item) => {
          const key = item.trackingNumber || item.documentId || item.id;
          const existing = map.get(key);
          if (
            !existing ||
            new Date(item.createdAt).getTime() >
              new Date(existing.createdAt).getTime()
          ) {
            map.set(key, item);
          }
          return map;
        }, new Map<string, NotificationItem>())
        .values(),
    ];
    try {
      const rawLiveNotifications = await getLiveDisplayNotifications(userId);
      const liveNotifications = rawLiveNotifications
        ? rawLiveNotifications.filter((n) => {
            if (n.documentId && !activeDocTrackings.has(n.documentId.trim().toUpperCase())) return false;
            if (n.trackingNumber && !activeDocTrackings.has(n.trackingNumber.trim().toUpperCase())) return false;
            return true;
          })
        : null;
      if (liveNotifications) {
        const liveDocKeys = new Set(
          [...liveNotifications, ...storedNotifications].flatMap((n) =>
            [n.documentId, n.trackingNumber].filter(Boolean),
          ),
        );
        const filteredGlobal = dedupedGlobalNotifications.filter(
          (notification) =>
            (!notification.documentId ||
              !liveDocKeys.has(notification.documentId)) &&
            (!notification.trackingNumber ||
              !liveDocKeys.has(notification.trackingNumber)),
        );
        return res.json([
          ...filteredGlobal,
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
    const activeDocKeys = new Set(
      [...activeNotifications, ...storedNotifications].flatMap((n) =>
        [n.documentId, n.trackingNumber].filter(Boolean),
      ),
    );
    const filteredGlobal = dedupedGlobalNotifications.filter(
      (notification) =>
        (!notification.documentId ||
          !activeDocKeys.has(notification.documentId)) &&
        (!notification.trackingNumber ||
          !activeDocKeys.has(notification.trackingNumber)),
    );
    res.json([
      ...filteredGlobal,
      ...storedNotifications,
      ...activeNotifications,
    ]);
  });

  app.post('/api/notifications/reminder', async (req, res) => {
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
        candidate.active,
    );
    const message = String(req.body.message || '').trim();
    if (!document || !recipient) {
      return res.status(400).json({ error: 'Select a valid document handler.' });
    }
    if (document.currentStatus === 'COMPLETED') {
      return res.status(409).json({ error: 'This transaction is already completed and no longer needs a reminder.' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Enter a reminder message.' });
    }

    const actionRequested =
      String(req.body.actionRequested || '').trim() || 'Appropriate Action';

    // In-app notification for the specific recipient ONLY
    const reminder = createNotification({
      userId: recipient.id,
      title: 'Routing Action Reminder',
      message: `${message} - Sent by ${actingUser.fullName}`,
      documentId: document.id,
      trackingNumber: document.routeNo || document.trackingNumber,
      type: 'URGENT',
      requiresDecision: false,
      reminderSenderName: actingUser.fullName,
      reminderHandlerName: recipient.fullName,
      reminderActionRequested: actionRequested,
    }, notificationsState);
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
    res.status(201).json({
      ...reminder,
      recipientName: recipient.fullName,
    });
  });

  // Notifications are display-only. Dismissed IDs are retained by the browser.
  app.delete('/api/notifications/:id', (_req, res) => {
    res.json({ success: true });
  });

  // ======================================================================
  // EMPLOYEE PROFILES API
  // ======================================================================

  const directoryActionsFor = (user: User): string[] =>
    (user.permissions || DEFAULT_ROLE_PERMISSIONS[user.role])?.allowedActions || [];

  const directoryViewsFor = (user: User): string[] =>
    (user.permissions || DEFAULT_ROLE_PERMISSIONS[user.role])?.allowedViews || [];

  const canAccessDirectoryOfficeType = (user: User, officeType: string): boolean => {
    if (user.role === 'SYSTEM_ADMIN') return true;
    const views = directoryViewsFor(user);
    const hasDirectoryView = views.includes('employees') || Boolean(user.permissions?.mainMenu);
    const actions = directoryActionsFor(user);

    if (officeType === 'BLGF') {
      return actions.includes('DIRECTORY_BLGF_VIEW');
    }
    if (['PROVINCIAL_TREASURER', 'MUNICIPAL_TREASURER', 'LGU'].includes(officeType)) {
      return hasDirectoryView || actions.includes('DIRECTORY_LGU_VIEW');
    }
    return hasDirectoryView || actions.includes('DIRECTORY_OTHER_VIEW');
  };

  const normalizeOfficeTypes = (types: unknown): string[] => {
    if (Array.isArray(types)) return types;
    if (typeof types === 'string') {
      try {
        const parsed = JSON.parse(types);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [types];
      }
    }
    return [];
  };

  const canAccessDirectorySection = (user: User, section: DirectorySectionRecord): boolean => {
    if (!section) return false;
    if (user.role === 'SYSTEM_ADMIN') return true;
    const views = directoryViewsFor(user);
    if (views.includes('employees') || Boolean(user.permissions?.mainMenu)) return true;
    const types = normalizeOfficeTypes(section.officeTypes);
    return types.some((officeType) => canAccessDirectoryOfficeType(user, officeType));
  };

  // GET all employees
  app.get('/api/employees', (req, res) => {
    const actingUser = getRequestUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    // Self-heal deleted or legacy directory cards. The immutable user ID is
    // the owner key; names, usernames, roles, and passwords may safely change.
    ensureUserEmployeeProfiles();

    const canViewAllBlgf =
      actingUser.role === 'SYSTEM_ADMIN' ||
      directoryActionsFor(actingUser).includes('DIRECTORY_BLGF_VIEW');

    const filtered = employeesState.filter((employee) => {
      if (employee.officeType === 'BLGF') {
        if (!canViewAllBlgf) {
          return (
            employee.userId === actingUser.id ||
            Boolean(
              employee.email &&
                actingUser.email &&
                employee.email.toLowerCase().trim() === actingUser.email.toLowerCase().trim(),
            )
          );
        }
        return true;
      }
      return canAccessDirectoryOfficeType(actingUser, employee.officeType);
    });

    res.json(filtered);
  });

  const canManageEmployees = (req: express.Request) => {
    const user = getRequestUser(req);
    if (!user) return false;
    const perm =
      user.permissions || DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.STAFF;
    const actions = perm.allowedActions || [];
    return (
      user.role === 'SYSTEM_ADMIN' ||
      Boolean(perm.canDelete) ||
      actions.some((action) =>
        ['EMPLOYEE_CREATE', 'EMPLOYEE_EDIT', 'EMPLOYEE_DELETE'].includes(action),
      )
    );
  };

  // POST create employee
  app.post('/api/employees', (req, res) => {
    const actingUser = getRequestUser(req);
    if (!actingUser || !canManageEmployees(req)) {
      return res.status(403).json({ error: 'Personnel management permission required.' });
    }
    const body = req.body;
    const officeType = body.officeType || 'BLGF';
    if (!canAccessDirectoryOfficeType(actingUser, officeType)) {
      return res.status(403).json({ error: 'Directory category access permission required.' });
    }
    const newEmp: EmployeeProfile = {
      id: nextReadableId('EMP', employeesState),
      userId: body.userId || undefined,
      fullName: body.fullName,
      position: body.position,
      office: body.office,
      officeType,
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
    const targetOfficeType = req.body?.officeType || employeesState[idx].officeType;
    const isOwnRecord = Boolean(actingUser && employeesState[idx].userId === actingUser.id);
    const canAccessCurrent = isOwnRecord || canAccessDirectoryOfficeType(actingUser, employeesState[idx].officeType);
    const canAccessTarget = isOwnRecord || canAccessDirectoryOfficeType(actingUser, targetOfficeType);
    if (!actingUser || !canAccessCurrent || !canAccessTarget) {
      return res.status(403).json({ error: 'Directory category access permission required.' });
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
    const actingUser = getRequestUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active user required.' });
    }
    const perm =
      actingUser.permissions ||
      DEFAULT_ROLE_PERMISSIONS[actingUser.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    const canDeleteEmployee =
      actingUser.role === 'SYSTEM_ADMIN' ||
      Boolean(perm.canDelete) ||
      Boolean(perm.allowedActions?.includes('EMPLOYEE_DELETE'));
    if (!canDeleteEmployee) {
      return res.status(403).json({ error: 'Delete permission or System Administrator access required.' });
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
  app.get('/api/directory-sections', (req, res) => {
    if (!directorySectionsState || directorySectionsState.length === 0) {
      directorySectionsState = [...DEFAULT_DIRECTORY_SECTIONS];
    }
    directorySectionsState = migrateDirectorySections(directorySectionsState);
    const actingUser = getRequestUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    const sanitizedSections = directorySectionsState.map((section) => ({
      ...section,
      officeTypes: normalizeOfficeTypes(section.officeTypes),
    }));
    if (actingUser.role === 'SYSTEM_ADMIN') return res.json(sanitizedSections);
    res.json(sanitizedSections.filter((section) =>
      canAccessDirectorySection(actingUser, section),
    ));
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
    const cleanSections: DirectorySectionRecord[] = nextSections.map((sec: any) => ({
      id: String(sec.id || '').trim(),
      label: String(sec.label || '').trim(),
      officeTypes: normalizeOfficeTypes(sec.officeTypes),
      color: sec.color || 'blue',
    }));
    if (actingUser.role === 'SYSTEM_ADMIN') {
      directorySectionsState = cleanSections;
    } else {
      const hiddenSections = directorySectionsState
        .map((section) => ({
          ...section,
          officeTypes: normalizeOfficeTypes(section.officeTypes),
        }))
        .filter((section) => !canAccessDirectorySection(actingUser, section));
      directorySectionsState = [...hiddenSections, ...cleanSections];
    }
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
  app.use(express.static(distPath, {
    etag: true,
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html') || filePath.endsWith('service-worker.js') || filePath.endsWith('offline-assets.json') || filePath.endsWith('manifest.webmanifest')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (/\.(js|css)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      } else if (/\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
      if (filePath.endsWith('manifest.webmanifest')) {
        res.setHeader('Content-Type', 'application/manifest+json');
      }
      if (filePath.endsWith('service-worker.js')) {
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Content-Type', 'application/javascript');
      }
    },
  }));
  app.get('*', (req, res) => {
    if (/\.(js|css|map|png|jpg|jpeg|gif|svg|ico|json|woff2?|ttf|eot)$/i.test(req.path)) {
      return res.status(404).send('Not found');
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'));
  });

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(PORT, HOST);
    server.once('listening', resolve);
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Port ${PORT} is already in use. Stop the process using that port or run "npm run dev" so the launcher can select a free port.`,
          ),
        );
        return;
      }
      reject(error);
    });
  });

  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  const preferredIp =
    addresses.find((ip) => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) ||
    addresses[0] ||
    'localhost';
  console.log(`=======================================================`);
  console.log(`BLGF REGION II DOCUMENT TRACKING SYSTEM SERVER RUNNING`);
  console.log(`Desktop Local  : http://localhost:${PORT}/login`);
  console.log(`Public Online  : ${process.env.PUBLIC_URL || 'https://blgfdts.duckdns.org/login'}`);
  console.log(`=======================================================`);
  return app;
}

if (!IS_VERCEL) {
  const shutdown = () => {
    flushDatabaseFileWrite();
  };
  process.on('exit', shutdown);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(signal, () => {
      shutdown();
      process.exit(0);
    });
  }

  createApp().catch((error) => {
    console.error('Server failed to start:', error);
    process.exitCode = 1;
  });
}
