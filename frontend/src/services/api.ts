import {
  DocumentRecord,
  User,
  Division,
  AuditLog,
  NotificationItem,
  DashboardStats,
  EmployeeProfile,
} from '../types';

const configuredApiBase = String(import.meta.env.VITE_API_BASE || '').replace(
  /\/$/,
  '',
);
const API_BASE = configuredApiBase || '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  // sessionStorage is isolated per browser tab. This prevents one user's
  // login in another tab from changing the actor of an in-flight request.
  const currentUserId =
    sessionStorage.getItem('blgf_current_user') ||
    localStorage.getItem('blgf_current_user');
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(currentUserId ? { 'X-User-Id': currentUserId } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  uploadToStorage: async (
    kind: 'documentAttachments' | 'profilePictures',
    file: File,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/storage/upload/${kind}`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'File upload failed.');
    return data as { fileName: string; url: string; fileData?: string };
  },
  // Auth
  login: (username: string, password: string) =>
    fetchJSON<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  forgotAdminPassword: (identifier: string) =>
    fetchJSON<{ message: string }>('/auth/forgot-admin-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),

  // Stats
  getStats: () => fetchJSON<DashboardStats>('/stats'),

  // Documents
  getDocuments: (params?: {
    search?: string;
    direction?: string;
    status?: string;
    division?: string;
    priority?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.direction) query.append('direction', params.direction);
    if (params?.status) query.append('status', params.status);
    if (params?.division) query.append('division', params.division);
    if (params?.priority) query.append('priority', params.priority);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return fetchJSON<DocumentRecord[]>(`/documents${queryString}`);
  },

  getDocumentById: (id: string) =>
    fetchJSON<DocumentRecord>(`/documents/${id}`),

  getNextRouteNumber: (direction: string) =>
    fetchJSON<{ routeNo: string }>(
      `/documents/next-route-number?direction=${encodeURIComponent(direction)}`,
    ),

  createDocument: (
    data: Partial<DocumentRecord> & { userId?: string; userRole?: string },
  ) =>
    fetchJSON<DocumentRecord>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  routeDocument: (
    documentId: string,
    data: {
      fromDivision: string;
      fromUser: string;
      toDivision: string;
      toUser?: string;
      toUserId?: string;
      actionRequested: string;
      remarks?: string;
      newStatus?: string;
      actingUserId?: string;
      actingUserName?: string;
      actingUserRole?: string;
    },
  ) =>
    fetchJSON<DocumentRecord>(`/documents/${documentId}/route`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  decideDocumentRoute: (
    documentId: string,
    decision: 'APPROVED' | 'DISAPPROVED',
    remarks?: string,
    actingUserId?: string,
  ) =>
    fetchJSON<DocumentRecord>(`/documents/${documentId}/decision`, {
      method: 'POST',
      headers: actingUserId ? { 'X-User-Id': actingUserId } : undefined,
      body: JSON.stringify({ decision, remarks }),
    }),

  transferDocument: (
    documentId: string,
    data: {
      fromDivision: string;
      fromUser: string;
      toDivision: string;
      toUser?: string;
      toUserId?: string;
      transferReason: string;
      actingUserId?: string;
      actingUserName?: string;
      actingUserRole?: string;
    },
  ) =>
    fetchJSON<DocumentRecord>(`/documents/${documentId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  multiRouteDocument: (
    documentId: string,
    data: {
      fromDivision: string;
      fromUser: string;
      targetDivisions: string[];
      recipients?: {
        toDivision: string;
        toUser: string;
        toUserId: string;
      }[];
      actionRequested: string;
      remarks?: string;
      newStatus?: string;
      actingUserId?: string;
      actingUserName?: string;
      actingUserRole?: string;
    },
  ) =>
    fetchJSON<DocumentRecord>(`/documents/${documentId}/multi-route`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  attachFile: (
    documentId: string,
    data: {
      fileName: string;
      fileSize: string;
      fileType: string;
      url?: string;
      fileData?: string;
      actingUserId?: string;
      actingUserName?: string;
      actingUserRole?: string;
    },
  ) =>
    fetchJSON<DocumentRecord>(`/documents/${documentId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDocument: (id: string, data: Partial<DocumentRecord>) =>
    fetchJSON<DocumentRecord>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteDocument: (id: string) =>
    fetchJSON<{ success: boolean }>(`/documents/${id}`, {
      method: 'DELETE',
    }),

  // Users
  getUsers: () => fetchJSON<User[]>('/users'),
  createUser: (data: Partial<User>) =>
    fetchJSON<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUser: (
    id: string,
    data: Partial<User> & { currentPassword?: string },
  ) =>
    fetchJSON<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteUser: (id: string) =>
    fetchJSON<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),

  // Divisions
  getDivisions: () => fetchJSON<Division[]>('/divisions'),
  createDivision: (data: Omit<Division, 'id'>) =>
    fetchJSON<Division>('/divisions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDivision: (id: string, data: Partial<Division>) =>
    fetchJSON<Division>(`/divisions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDivision: (id: string) =>
    fetchJSON<{ success: boolean }>(`/divisions/${id}`, { method: 'DELETE' }),

  // Audit Logs
  getAuditLogs: () => fetchJSON<AuditLog[]>('/audit-logs'),
  createAuditLog: (data: Partial<AuditLog>) =>
    fetchJSON<AuditLog>('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getEnvelopeLogs: () => fetchJSON<AuditLog[]>('/envelope-logs'),
  createEnvelopeLog: (data: Partial<AuditLog>) =>
    fetchJSON<AuditLog>('/envelope-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Notifications
  getNotifications: (userId?: string) =>
    fetchJSON<NotificationItem[]>(
      userId
        ? `/notifications?userId=${encodeURIComponent(userId)}`
        : '/notifications',
    ),
  deleteNotification: (id: string) =>
    fetchJSON<{ success: boolean }>(`/notifications/${id}`, {
      method: 'DELETE',
    }),
  sendRoutingReminder: (data: {
    documentId: string;
    recipientUserId: string;
    message: string;
    actionRequested?: string;
  }) =>
    fetchJSON<NotificationItem>('/notifications/reminder', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Employee Profiles
  getEmployees: () => fetchJSON<EmployeeProfile[]>('/employees'),

  createEmployee: (data: Partial<EmployeeProfile>) =>
    fetchJSON<EmployeeProfile>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEmployee: (id: string, data: Partial<EmployeeProfile>) =>
    fetchJSON<EmployeeProfile>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteEmployee: (id: string) =>
    fetchJSON<{ success: boolean }>(`/employees/${id}`, {
      method: 'DELETE',
    }),
};
