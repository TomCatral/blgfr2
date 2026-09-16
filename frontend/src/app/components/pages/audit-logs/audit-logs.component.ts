import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewEncapsulation,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { cx } from '../../../shared/class-utils';
import { AuditLog } from '../../../types';
import { formatDate } from '../../../utils/status-utils';
import * as XLSX from 'xlsx';

const normalizeActionDetailItem = (item: string) =>
  item.startsWith('To:') ? item.replace(/\s+\([^)]*\)\s*$/, '') : item;

const getActionDetailItems = (details: string): string[] => {
  const normalized = details.trim();
  if (!normalized) return [];

  if (normalized.includes(' | ')) {
    return normalized
      .split(' | ')
      .map((item) => item.trim())
      .filter(
        (item) =>
          Boolean(item) &&
          !item.startsWith('Assigned Handler / Individual Recipient:'),
      )
      .map(normalizeActionDetailItem);
  }

  if (normalized.startsWith('Envelope dispatched to:')) {
    const subjectMarker = '. Subject: ';
    const releasedMarker = '. Released by ';
    const subjectIndex = normalized.indexOf(subjectMarker);
    const releasedIndex = normalized.lastIndexOf(releasedMarker);
    if (subjectIndex > -1 && releasedIndex > subjectIndex) {
      return [
        normalized.slice(0, subjectIndex).trim(),
        `Subject: ${normalized
          .slice(subjectIndex + subjectMarker.length, releasedIndex)
          .trim()}`,
        `Released by: ${normalized
          .slice(releasedIndex + releasedMarker.length)
          .replace(/\.$/, '')
          .trim()}`,
      ].map(normalizeActionDetailItem);
    }
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return (lines.length > 1 ? lines : [normalized]).map(
    normalizeActionDetailItem,
  );
};

const openHandleDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('blgf_file_handles', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('handles')) {
        request.result.createObjectStore('handles');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const saveDirectoryHandle = async (key: string, handle: any) => {
  const database = await openHandleDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction('handles', 'readwrite');
    transaction.objectStore('handles').put(handle, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
};

const loadDirectoryHandle = async (key: string) => {
  const database = await openHandleDatabase();
  const handle = await new Promise<any>((resolve, reject) => {
    const request = database
      .transaction('handles', 'readonly')
      .objectStore('handles')
      .get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return handle;
};

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, FormsModule],
  styleUrl: './audit-logs.component.scss',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './audit-logs.component.html',
})
export class AuditLogsComponent implements OnChanges, OnDestroy {
  @Input() auditLogs: AuditLog[] = [];
  @Input() title?: string = '';
  @Input() subtitle?: string = '';

  searchQuery = '';
  actionFilter = 'ALL';
  monthFilter = 'ALL';
  exportMsg = '';
  autoDirectory: any = null;
  savedFolderName = '';
  autoSaveStatus = '';
  page = 1;
  logsPerPage = 25;

  formatDate = formatDate;
  getActionDetailItems = getActionDetailItems;

  private autoSaveTimer: any = null;
  private lastStorageKey = '';

  get filteredLogs(): AuditLog[] {
    return this.auditLogs.filter((log) => {
      if (this.actionFilter !== 'ALL' && log.action !== this.actionFilter)
        return false;
      if (
        this.monthFilter !== 'ALL' &&
        new Date(log.timestamp).toISOString().slice(0, 7) !== this.monthFilter
      )
        return false;
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        return (
          log.userName.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          (log.documentTrackingNumber &&
            log.documentTrackingNumber.toLowerCase().includes(q)) ||
          log.action.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }

  get availableMonths(): string[] {
    return [
      ...new Set(
        this.auditLogs.map((log) =>
          new Date(log.timestamp).toISOString().slice(0, 7),
        ),
      ),
    ].sort((a, b) => b.localeCompare(a));
  }

  get exportMonthLabel(): string {
    return this.monthFilter === 'ALL' ? 'All_Months' : this.monthFilter;
  }

  get isEnvelopeLog(): boolean {
    return Boolean(this.title);
  }

  get handleStorageKey(): string {
    return this.isEnvelopeLog
      ? 'envelope_log_auto_save'
      : 'audit_log_auto_save';
  }

  get folderNameStorageKey(): string {
    return `${this.handleStorageKey}_folder_name`;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLogs.length / this.logsPerPage));
  }

  get pageLogs(): AuditLog[] {
    return this.filteredLogs.slice(
      (this.page - 1) * this.logsPerPage,
      this.page * this.logsPerPage,
    );
  }

  get paginationStart(): number {
    return this.filteredLogs.length === 0
      ? 0
      : (this.page - 1) * this.logsPerPage + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.page * this.logsPerPage, this.filteredLogs.length);
  }

  get currentMonthLabel(): string {
    return this.monthFilter === 'ALL'
      ? 'All months'
      : new Date(`${this.monthFilter}-01T00:00:00`).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        });
  }

  formatMonthOption(month: string): string {
    return new Date(`${month}-01T00:00:00`).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['auditLogs']) this.scheduleAutoSave();
    const currentKey = this.handleStorageKey;
    if (currentKey !== this.lastStorageKey) {
      this.lastStorageKey = currentKey;
      this.reloadDirectoryHandle();
    }
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimer) window.clearTimeout(this.autoSaveTimer);
  }

  private scheduleAutoSave(): void {
    if (!this.autoDirectory) return;
    if (this.autoSaveTimer) window.clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = window.setTimeout(() => {
      this.writeMonthToDirectory(this.autoDirectory).catch((error: any) => {
        this.autoSaveStatus = `Automatic save failed: ${error.message}`;
      });
    }, 750);
  }

  private reloadDirectoryHandle(): void {
    this.savedFolderName = localStorage.getItem(this.folderNameStorageKey) || '';
    loadDirectoryHandle(this.handleStorageKey)
      .then(async (handle: any) => {
        if (!handle) return;
        const permission = await handle.queryPermission({
          mode: 'readwrite',
        });
        if (permission === 'granted') this.setAutoDirectory(handle);
        else
          this.autoSaveStatus = `Select "${handle.name}" again to restore automatic monthly saving.`;
      })
      .catch(() => {});
  }

  private setAutoDirectory(handle: any): void {
    this.autoDirectory = handle;
    this.scheduleAutoSave();
  }

  async chooseAutoSaveDirectory(): Promise<void> {
    const picker = (globalThis as any).showDirectoryPicker;
    if (!picker) {
      this.autoSaveStatus =
        'The folder picker is unavailable in this browser. Open this system in the latest Chrome or Microsoft Edge, then select the default monthly log folder.';
      return;
    }
    try {
      const handle = await picker({
        id: this.handleStorageKey,
        mode: 'readwrite',
        startIn: 'documents',
      });
      const permission = await handle.requestPermission({
        mode: 'readwrite',
      });
      if (permission !== 'granted') return;
      await saveDirectoryHandle(this.handleStorageKey, handle);
      localStorage.setItem(this.folderNameStorageKey, handle.name);
      this.savedFolderName = handle.name;
      this.setAutoDirectory(handle);
      await this.writeMonthToDirectory(handle);
    } catch (error: any) {
      if (error?.name !== 'AbortError')
        this.autoSaveStatus = `Unable to select folder: ${error.message}`;
    }
  }

  toExcelRows(logs: AuditLog[]): any[] {
    return logs.map((log) => ({
      Timestamp: formatDate(log.timestamp),
      'User Name': log.userName,
      'User Role': log.userRole,
      'Action Type': log.action,
      'Document Route No.': log.documentTrackingNumber || 'N/A',
      'Action Details': log.details,
      'IP Address': log.ipAddress || 'N/A',
    }));
  }

  async writeMonthToDirectory(
    directoryHandle: any,
    requestedMonth = new Date().toISOString().slice(0, 7),
    automatic = true,
  ): Promise<void> {
    const currentMonth =
      requestedMonth === 'ALL'
        ? new Date().toISOString().slice(0, 7)
        : requestedMonth;
    const monthlyLogs = this.auditLogs.filter(
      (log) =>
        new Date(log.timestamp).toISOString().slice(0, 7) === currentMonth,
    );
    const data = this.toExcelRows(monthlyLogs);
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MonthlyLogs');
    const contents = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const fileName = `BLGF_R2_${this.isEnvelopeLog ? 'EnvelopeLogs' : 'AuditLogs'}_${currentMonth}.xlsx`;
    const fileHandle = await directoryHandle.getFileHandle(fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
    this.autoSaveStatus = `${automatic ? 'Automatically saved' : 'Saved'} ${monthlyLogs.length} record(s) to ${directoryHandle.name}/${fileName}. This is the default monthly log folder.`;
  }

  getActionBadge(action: string): string {
    switch (action) {
      case 'CREATE_DOC':
        return 'audit-actionCreate';
      case 'ROUTE_DOC':
        return 'audit-actionRoute';
      case 'UPDATE_STATUS':
        return 'audit-actionUpdate';
      case 'TRANSFER_DOC':
        return 'audit-actionDanger';
      case 'UPLOAD_ATTACHMENT':
        return 'audit-actionUpload';
      case 'DELETE_DOC':
        return 'audit-actionDanger';
      case 'LOGIN':
        return 'audit-actionLogin';
      case 'ENVELOPE_LOG':
        return 'audit-actionEnvelope';
      case 'SQL_QUERY':
        return 'audit-actionSql';
      default:
        return 'audit-actionDefault';
    }
  }

  badgeClass(action: string): string {
    return cx('audit-actionBadge', this.getActionBadge(action));
  }

  async exportToExcel(): Promise<void> {
    try {
      const data = this.toExcelRows(this.filteredLogs);
      const actionLabel =
        this.actionFilter === 'ALL' ? 'All_Action_Types' : this.actionFilter;
      const fileName = `BLGF_R2_${this.title ? 'EnvelopeLogs' : 'AuditLogs'}_${this.exportMonthLabel}_${actionLabel}.xlsx`;

      if (this.autoDirectory) {
        let permission = await this.autoDirectory.queryPermission({
          mode: 'readwrite',
        });
        if (permission !== 'granted') {
          permission = await this.autoDirectory.requestPermission({
            mode: 'readwrite',
          });
        }
        if (permission === 'granted') {
          const worksheet = XLSX.utils.json_to_sheet(data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'AuditLogs');
          const contents = XLSX.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
          });
          const fileHandle = await this.autoDirectory.getFileHandle(fileName, {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(contents);
          await writable.close();
          this.autoSaveStatus = `Saved ${data.length} matching record(s) to ${this.autoDirectory.name}/${fileName}.`;
          return;
        }
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'AuditLogs');

      (ws as any)['!cols'] = [
        { wch: 22 },
        { wch: 25 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 50 },
        { wch: 18 },
      ];

      XLSX.writeFile(wb, fileName);
      this.exportMsg =
        'No default folder is active. Downloaded ' +
        fileName +
        ' (' +
        data.length +
        ' records).';
      this.clearExportMsg();
    } catch (err: any) {
      this.exportMsg = 'Export failed: ' + err.message;
      this.clearExportMsg();
    }
  }

  exportToCSV(): void {
    try {
      const headers = [
        'Timestamp',
        'User Name',
        'User Role',
        'Action Type',
        'Document Route No.',
        'Action Details',
        'IP Address',
      ];
      const rows = this.filteredLogs.map((log) => [
        formatDate(log.timestamp),
        log.userName,
        log.userRole,
        log.action,
        log.documentTrackingNumber || 'N/A',
        '"' + log.details.replace(/"/g, '""') + '"',
        log.ipAddress || 'N/A',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const link = document.createElement('a');
      const fileName = `BLGF_R2_${this.title ? 'EnvelopeLogs' : 'AuditLogs'}_${this.exportMonthLabel}.csv`;
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
      this.exportMsg =
        'Exported to ' + fileName + ' (' + rows.length + ' records)';
      this.clearExportMsg();
    } catch (err: any) {
      this.exportMsg = 'Export failed: ' + err.message;
      this.clearExportMsg();
    }
  }

  onMonthFilterChange(value: string): void {
    this.monthFilter = value;
    this.page = 1;
  }

  goToPreviousPage(): void {
    this.page = Math.max(1, this.page - 1);
  }

  goToNextPage(): void {
    this.page = Math.min(this.totalPages, this.page + 1);
  }

  private clearExportMsg(): void {
    setTimeout(() => (this.exportMsg = ''), 5000);
  }
}
