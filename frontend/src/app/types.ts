export type Role =
  | 'SYSTEM_ADMIN'
  | 'ADMIN'
  | 'ORD'
  | 'RECORDS_OFFICER'
  | 'DIVISION_CHIEF'
  | 'ACTION_OFFICER'
  | 'STAFF';

export type DocumentDirection = 'INCOMING' | 'OUTGOING';

export type PriorityLevel =
  | 'ROUTINE'
  | 'URGENT'
  | 'VERY_URGENT'
  | 'CONFIDENTIAL';

export type DocumentStatus =
  | 'PENDING' // Yellow / Orange - Newly received or awaiting processing
  | 'IN_PROGRESS' // Blue - Currently being acted upon
  | 'FOR_SIGNATURE' // Purple / Yellow - Awaiting approval/signature
  | 'COMPLETED' // Green - Released / Processed / Filed
  | 'RETURNED' // Red / Amber - Returned for revisions/clarification
  | 'ON_HOLD'; // Gray - Suspended

export interface StatusConfig {
  label: string;
  badgeClass: string;
  bgHex: string;
  textHex: string;
  dotClass: string;
}

export type DivisionCode = 'ITMS' | 'ORD' | 'AD' | 'LAOD' | 'LTOD' | 'FD' | 'LU';

export interface Division {
  id: string;
  code: DivisionCode;
  name: string;
  chiefName: string;
  email: string;
}

export interface RolePermission {
  mainMenu: boolean;
  management: boolean;
  allowedViews: string[];
  canDelete: boolean; // Whether role can delete documents
  canViewAllDocuments: boolean; // Global visibility; otherwise users only see documents routed or assigned to them
  canViewAllRoutes: boolean; // Whether the role can see the complete routing trail across divisions
  allowedActions?: string[]; // granular feature actions controlled in User & Role Access Manager
  notificationViewAllConfigured?: boolean; // distinguishes legacy defaults from an explicit role-manager choice
}

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, RolePermission> = {
  SYSTEM_ADMIN: {
    mainMenu: true,
    management: true,
    canDelete: true,
    canViewAllDocuments: true,
    canViewAllRoutes: true,
    allowedActions: [
      'EMPLOYEE_CREATE',
      'EMPLOYEE_EDIT',
      'EMPLOYEE_DELETE',
      'EMPLOYEE_FOLDER_MANAGE',
      'DIRECTORY_BLGF_VIEW',
      'DIRECTORY_LGU_VIEW',
      'DIRECTORY_OTHER_VIEW',
      'USER_ACCOUNT_CREATE',
      'USER_ACCOUNT_EDIT',
      'USER_ACCOUNT_DELETE',
      'USER_SYSTEM_ADMIN_MANAGE',
      'WORKFLOW_OPTION_MANAGE',
      'ROUTING_MONITOR_VIEW',
      'ROUTING_REMINDER_SEND',
      'NOTIFICATION_VIEW_ALL',
    ],
    allowedViews: [
      'dashboard',
      'division-workload',
      'incoming',
      'outgoing',
      'incoming-report',
      'outgoing-report',
      'envelope-report',
      'envelope',
      'envelope-logs',
      'audit',
      'users',
      'settings',
      'qr',
      'employees',
    ],
  },
  ADMIN: {
    mainMenu: true,
    management: false,
    canDelete: false,
    canViewAllDocuments: false,
    canViewAllRoutes: false,
    allowedActions: [],
    allowedViews: [
      'dashboard',
      'division-workload',
      'incoming',
      'outgoing',
      'incoming-report',
      'outgoing-report',
      'envelope',
      'settings',
      'qr',
    ],
  },
  ORD: {
    mainMenu: true,
    management: true,
    canDelete: false,
    canViewAllDocuments: true,
    canViewAllRoutes: true,
    allowedActions: [
      'EMPLOYEE_CREATE',
      'EMPLOYEE_EDIT',
      'EMPLOYEE_FOLDER_MANAGE',
      'DIRECTORY_LGU_VIEW',
      'DIRECTORY_OTHER_VIEW',
      'USER_ACCOUNT_CREATE',
      'USER_ACCOUNT_EDIT',
      'ROUTING_MONITOR_VIEW',
      'ROUTING_REMINDER_SEND',
    ],
    allowedViews: [
      'dashboard',
      'division-workload',
      'incoming',
      'outgoing',
      'incoming-report',
      'outgoing-report',
      'envelope-report',
      'envelope',
      'envelope-logs',
      'audit',
      'settings',
      'qr',
      'employees',
    ],
  },
  RECORDS_OFFICER: {
    mainMenu: true,
    management: true,
    canDelete: false,
    canViewAllDocuments: false,
    canViewAllRoutes: false,
    allowedActions: [
      'ROUTING_MONITOR_VIEW',
      'ROUTING_REMINDER_SEND',
      'NOTIFICATION_VIEW_ALL',
      'DIRECTORY_LGU_VIEW',
      'DIRECTORY_OTHER_VIEW',
      'USER_ACCOUNT_CREATE',
      'USER_ACCOUNT_EDIT',
    ],
    allowedViews: [
      'dashboard',
      'division-workload',
      'incoming',
      'outgoing',
      'incoming-report',
      'outgoing-report',
      'envelope-report',
      'envelope',
      'envelope-logs',
      'audit',
      'settings',
      'qr',
      'employees',
    ],
  },
  DIVISION_CHIEF: {
    mainMenu: true,
    management: true,
    canDelete: false,
    canViewAllDocuments: false,
    canViewAllRoutes: false,
    allowedActions: [
      'ROUTING_MONITOR_VIEW',
      'ROUTING_REMINDER_SEND',
      'DIRECTORY_LGU_VIEW',
      'DIRECTORY_OTHER_VIEW',
    ],
    allowedViews: [
      'dashboard',
      'division-workload',
      'incoming',
      'outgoing',
      'incoming-report',
      'outgoing-report',
      'envelope-report',
      'envelope',
      'envelope-logs',
      'audit',
      'settings',
      'qr',
      'employees',
    ],
  },
  ACTION_OFFICER: {
    mainMenu: true,
    management: false,
    canDelete: false,
    canViewAllDocuments: false,
    canViewAllRoutes: false,
    allowedActions: ['DIRECTORY_LGU_VIEW', 'DIRECTORY_OTHER_VIEW'],
    allowedViews: [
      'dashboard',
      'division-workload',
      'incoming',
      'outgoing',
      'incoming-report',
      'outgoing-report',
      'envelope-report',
      'envelope',
      'envelope-logs',
      'settings',
      'qr',
      'employees',
    ],
  },
  STAFF: {
    mainMenu: true,
    management: false,
    canDelete: false,
    canViewAllDocuments: false,
    canViewAllRoutes: false,
    allowedActions: [],
    allowedViews: [
      'dashboard',
      'division-workload',
      'incoming',
      'outgoing',
      'incoming-report',
      'outgoing-report',
      'settings',
      'qr',
    ],
  },
};

export interface User {
  id: string;
  username: string;
  password?: string;
  temporaryPasswordExpiresAt?: string | null;
  fullName: string;
  email: string;
  role: Role;
  divisionCode: DivisionCode;
  designation: string;
  contactNo: string;
  active: boolean;
  avatarUrl?: string;
  createdAt: string;
  permissions?: RolePermission;
}

export interface DocumentRouteStep {
  id: string;
  documentId: string;
  stepNumber: number;
  routeNo?: string;
  fromDivision: DivisionCode;
  fromUserId?: string;
  fromUser: string;
  toDivision: DivisionCode;
  toUser?: string;
  toUserId?: string;
  actionRequested: string; // e.g., 'For Appropriate Action', 'For Signature', 'For Review/Comment', 'For Filing'
  actionTaken?: string;
  remarks?: string;
  statusBefore: DocumentStatus;
  statusAfter: DocumentStatus;
  isTransfer?: boolean; // Flag if document was transferred/reassigned because it was not theirs
  isMultiRoute?: boolean; // Flag if this step is part of a multi-division dispatch
  receivedAt?: string;
  processedAt?: string;
  attachments?: DocumentAttachment[];
  createdAt: string;
}

export interface DocumentAttachment {
  attachmentScope?: 'DOCUMENT' | 'RECIPIENT';
  uploadedByUserId?: string;
  uploadedForRouteId?: string;
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadDate: string;
  url?: string;
  fileData?: string; // base64 bytes for attachments that survive ephemeral serverless storage
}

export interface DocumentRecord {
  id: string;
  trackingNumber: string; // e.g., BLGF2-2026-IN-0012
  routeNo?: string;
  direction: DocumentDirection;
  title: string;
  subject: string;
  category: string; // e.g., 'Treasury Circular', 'Real Property Tax Assessment', 'Financial Report', 'Personnel Memo', 'Legal Opinion', 'General Correspondence'
  originatingOffice: string; // e.g., 'Provincial Treasury Office - Isabela' or 'LGU Tuguegarao'
  destinationOffice: string; // e.g., 'Office of the Regional Director'
  senderName: string;
  senderPosition?: string;
  senderAddress?: string;
  recipientName: string;
  recipientPosition?: string;
  recipientOffice?: string;
  recipientAddress?: string;
  priority: PriorityLevel;
  currentStatus: DocumentStatus;
  currentDivision: DivisionCode;
  assignedUser?: string;
  assignedUserId?: string;
  dateReceived: string; // ISO date string
  targetCompletionDate: string;
  completedDate?: string;
  tags: string[];
  attachments: DocumentAttachment[];
  routes: DocumentRouteStep[];
  actionRequested?: string;
  remarks?: string;
  createdBy: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
  finalInstructions?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  action:
    | 'CREATE_DOC'
    | 'ROUTE_DOC'
    | 'TRANSFER_DOC'
    | 'UPLOAD_ATTACHMENT'
    | 'UPDATE_STATUS'
    | 'DELETE_DOC'
    | 'CREATE_USER'
    | 'UPDATE_USER'
    | 'LOGIN'
    | 'EXPORT_DB'
    | 'SQL_QUERY'
    | 'ENVELOPE_LOG'
    | 'REGISTER_DOC';
  documentTrackingNumber?: string;
  details: string;
  ipAddress: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  documentId?: string;
  trackingNumber?: string;
  type: 'INFO' | 'URGENT' | 'ACTION_REQUIRED' | 'SUCCESS';
  requiresDecision?: boolean;
  decisionStatus?: 'APPROVED' | 'DISAPPROVED';
  reminderSenderName?: string;
  reminderActionRequested?: string;
  reminderHandlerName?: string;
  createdAt: string;
}

export interface EmployeeProfile {
  id: string;
  userId?: string;
  fullName: string;
  position: string;
  office: string;
  officeType:
    | 'BLGF'
    | 'MUNICIPAL_TREASURER'
    | 'PROVINCIAL_TREASURER'
    | 'LGU'
    | 'OTHER_AGENCIES';
  divisionCode?: DivisionCode;
  email: string;
  contactNo: string;
  address: string;
  active: boolean;
  createdAt: string;
  folders?: EmployeeFolderRecord[];
}

export interface EmployeeFolderRecord {
  id: string;
  name: string;
  employeeId: string;
  userId?: string;
  systemManaged?: boolean;
  description?: string;
  fileCount: number;
  createdAt: string;
  files: EmployeeFolderFile[];
}

export interface EmployeeFolderFile {
  title?: string;
  name: string;
  date: string;
  size: string;
  type?: string;
  dataUrl?: string;
}

export interface DashboardStats {
  totalIncoming: number;
  totalOutgoing: number;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  urgentCount: number;
  returnedCount: number;
  avgTurnaroundHours: number;
  divisionBreakdown: { division: string; count: number }[];
  statusBreakdown: {
    status: DocumentStatus;
    label: string;
    count: number;
    color: string;
  }[];
  recentActivity: AuditLog[];
}
