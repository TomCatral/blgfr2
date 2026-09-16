import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DashboardStats,
  Division,
  DocumentAttachment,
  DocumentRecord,
  EmployeeProfile,
  NotificationItem,
  User,
} from '../types';

export type StorageKind = 'documentAttachments' | 'profilePictures';

const configuredApiBase = String(
  (window as unknown as { __BLGF_API_BASE__?: string }).__BLGF_API_BASE__ ?? '',
).replace(/\/$/, '');
const API_BASE = configuredApiBase || '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  private get<T>(url: string, params?: Record<string, string | number>): Observable<T> {
    return this.http.get<T>(`${API_BASE}${url}`, {
      params: params as Record<string, string>,
    });
  }

  private post<T>(url: string, body?: unknown, _params?: Record<string, string>, headers?: Record<string, string>): Observable<T> {
    return this.http.post<T>(`${API_BASE}${url}`, body, headers ? { headers } : undefined);
  }

  private put<T>(url: string, body?: unknown): Observable<T> {
    return this.http.put<T>(`${API_BASE}${url}`, body);
  }

  private patch<T>(url: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(`${API_BASE}${url}`, body);
  }

  private delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(`${API_BASE}${url}`);
  }

  readonly apiBase = API_BASE;

  // ---------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------
  uploadToStorage(kind: StorageKind, file: File): Observable<{ fileName: string; url: string; fileData?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ fileName: string; url: string; fileData?: string }>(
      `${API_BASE}/storage/upload/${kind}`,
      formData,
    );
  }

  // ---------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------
  login(username: string, password: string): Observable<{ user: User }> {
    return this.post<{ user: User }>('/auth/login', { username, password });
  }

  forgotAdminPassword(identifier: string): Observable<{ message: string }> {
    return this.post<{ message: string }>('/auth/forgot-admin-password', { identifier });
  }

  // ---------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------
  getStats(): Observable<DashboardStats> {
    return this.get<DashboardStats>('/stats');
  }

  // ---------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------
  getDocuments(params?: {
    search?: string;
    direction?: string;
    status?: string;
    division?: string;
    priority?: string;
  }): Observable<DocumentRecord[]> {
    return this.get<DocumentRecord[]>('/documents', params);
  }

  getDocumentById(id: string): Observable<DocumentRecord> {
    return this.get<DocumentRecord>(`/documents/${id}`);
  }

  getNextRouteNumber(direction: string): Observable<{ routeNo: string }> {
    return this.get<{ routeNo: string }>('/documents/next-route-number', { direction });
  }

  createDocument(data: Partial<DocumentRecord> & { userId?: string; userRole?: string }): Observable<DocumentRecord> {
    return this.post<DocumentRecord>('/documents', data);
  }

  routeDocument(
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
  ): Observable<DocumentRecord> {
    return this.post<DocumentRecord>(`/documents/${documentId}/route`, data);
  }

  decideDocumentRoute(
    documentId: string,
    decision: 'APPROVED' | 'DISAPPROVED',
    remarks?: string,
    actingUserId?: string,
  ): Observable<DocumentRecord> {
    const headers = actingUserId ? { 'X-User-Id': actingUserId } : undefined;
    return this.post<DocumentRecord>(
      `/documents/${documentId}/decision`,
      { decision, remarks },
      {},
      headers,
    );
  }

  transferDocument(
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
  ): Observable<DocumentRecord> {
    return this.post<DocumentRecord>(`/documents/${documentId}/transfer`, data);
  }

  multiRouteDocument(
    documentId: string,
    data: {
      fromDivision: string;
      fromUser: string;
      targetDivisions: string[];
      recipients?: { toDivision: string; toUser: string; toUserId: string }[];
      actionRequested: string;
      remarks?: string;
      newStatus?: string;
      actingUserId?: string;
      actingUserName?: string;
      actingUserRole?: string;
    },
  ): Observable<DocumentRecord> {
    return this.post<DocumentRecord>(`/documents/${documentId}/multi-route`, data);
  }

  attachFile(
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
  ): Observable<DocumentRecord> {
    return this.post<DocumentRecord>(`/documents/${documentId}/attachments`, data);
  }

  updateDocument(id: string, data: Partial<DocumentRecord>): Observable<DocumentRecord> {
    return this.put<DocumentRecord>(`/documents/${id}`, data);
  }

  updateFinalInstructions(documentId: string, instructions: string, actingUserId?: string): Observable<{ success: boolean; document: DocumentRecord; instructions: string }> {
    return this.patch<{ success: boolean; document: DocumentRecord; instructions: string }>(
      `/documents/${documentId}/final-instructions`,
      { instructions, actingUserId },
    );
  }

  deleteDocument(id: string): Observable<{ success: boolean }> {
    return this.delete<{ success: boolean }>(`/documents/${id}`);
  }

  // ---------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------
  getUsers(): Observable<User[]> {
    return this.get<User[]>('/users');
  }

  createUser(data: Partial<User>): Observable<User> {
    return this.post<User>('/users', data);
  }

  updateUser(id: string, data: Partial<User> & { currentPassword?: string }): Observable<User> {
    return this.put<User>(`/users/${id}`, data);
  }

  deleteUser(id: string): Observable<{ success: boolean }> {
    return this.delete<{ success: boolean }>(`/users/${id}`);
  }

  // ---------------------------------------------------------------
  // Divisions
  // ---------------------------------------------------------------
  getDivisions(): Observable<Division[]> {
    return this.get<Division[]>('/divisions');
  }

  createDivision(data: Omit<Division, 'id'>): Observable<Division> {
    return this.post<Division>('/divisions', data);
  }

  updateDivision(id: string, data: Partial<Division>): Observable<Division> {
    return this.put<Division>(`/divisions/${id}`, data);
  }

  deleteDivision(id: string): Observable<{ success: boolean }> {
    return this.delete<{ success: boolean }>(`/divisions/${id}`);
  }

  // ---------------------------------------------------------------
  // Audit logs
  // ---------------------------------------------------------------
  getAuditLogs(): Observable<import('../types').AuditLog[]> {
    return this.get<import('../types').AuditLog[]>('/audit-logs');
  }

  createAuditLog(data: Partial<import('../types').AuditLog>): Observable<import('../types').AuditLog> {
    return this.post<import('../types').AuditLog>('/audit-logs', data);
  }

  getEnvelopeLogs(): Observable<import('../types').AuditLog[]> {
    return this.get<import('../types').AuditLog[]>('/envelope-logs');
  }

  createEnvelopeLog(data: Partial<import('../types').AuditLog>): Observable<import('../types').AuditLog> {
    return this.post<import('../types').AuditLog>('/envelope-logs', data);
  }

  // ---------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------
  getNotifications(userId?: string): Observable<NotificationItem[]> {
    return this.get<NotificationItem[]>(
      userId ? `/notifications?userId=${encodeURIComponent(userId)}` : '/notifications',
    );
  }

  deleteNotification(id: string): Observable<{ success: boolean }> {
    return this.delete<{ success: boolean }>(`/notifications/${id}`);
  }

  sendRoutingReminder(data: {
    documentId: string;
    recipientUserId: string;
    message: string;
    actionRequested?: string;
  }): Observable<NotificationItem> {
    return this.post<NotificationItem>('/notifications/reminder', data);
  }

  // ---------------------------------------------------------------
  // Employees
  // ---------------------------------------------------------------
  getEmployees(): Observable<EmployeeProfile[]> {
    return this.get<EmployeeProfile[]>('/employees');
  }

  createEmployee(data: Partial<EmployeeProfile>): Observable<EmployeeProfile> {
    return this.post<EmployeeProfile>('/employees', data);
  }

  updateEmployee(id: string, data: Partial<EmployeeProfile>): Observable<EmployeeProfile> {
    return this.put<EmployeeProfile>(`/employees/${id}`, data);
  }

  deleteEmployee(id: string): Observable<{ success: boolean }> {
    return this.delete<{ success: boolean }>(`/employees/${id}`);
  }

  // ---------------------------------------------------------------
  // Directory Sections & Titles
  // ---------------------------------------------------------------
  getDirectorySections(): Observable<any[]> {
    return this.get<any[]>('/directory-sections');
  }

  saveDirectorySections(sections: any[]): Observable<{ success: boolean; directorySections: any[] }> {
    return this.post<{ success: boolean; directorySections: any[] }>('/directory-sections', sections);
  }

  // ---------------------------------------------------------------
  // Record storage (document-level attachments carried as base64)
  // ---------------------------------------------------------------
  attachmentPayload(file: File): Observable<Pick<DocumentAttachment, 'fileName' | 'fileSize' | 'fileType' | 'url' | 'fileData'>> {
    return this.uploadToStorage('documentAttachments', file).pipe(
      map((result) => ({
        fileName: result.fileName,
        fileSize: (file.size / (1024 * 1024)).toFixed(2),
        fileType: file.type,
        url: result.url || '',
        fileData: result.fileData,
      })),
    );
  }
}