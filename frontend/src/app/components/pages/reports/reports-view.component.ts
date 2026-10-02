import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { AuditLog, DocumentRecord, DocumentRouteStep } from '../../../types';
import { ClsPipe } from '../../../shared/cls.pipe';
import { cx } from '../../../shared/class-utils';
import { formatDate as formatDateUtil } from '../../../utils/status-utils';
import { IonicModule } from '@ionic/angular';

type ReportType = 'INCOMING' | 'OUTGOING' | 'ENVELOPE';

const DOCUMENT_REPORT_HEADERS = [
  '#',
  'Route No.',
  'Details',
  'Route',
  'Status',
];

const ENVELOPE_REPORT_HEADERS = [
  'Timestamp',
  'Route No.',
  'Released By',
  'Dispatch Details',
];

interface ReportEvent {
  id: string;
  timestamp: string;
  actor: string;
  event: string;
  details: string;
  outcome: 'APPROVED' | 'DISAPPROVED' | 'RETURNED' | 'COMPLETED' | '';
}

interface RouteHistoryRow {
  id: string;
  timestamp: string;
  date: string;
  from: string;
  to: string;
  action: string;
  remarks: string;
}



const formatReportDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
};

const routeActionLabel = (route: DocumentRouteStep) => {
  const decision = decisionFrom(
    `${route.actionRequested || ''} ${route.remarks || ''}`,
  );
  if (decision === 'APPROVED') return 'Approved';
  if (decision === 'DISAPPROVED') return 'Disapproved / Returned';
  if (route.statusAfter === 'RETURNED') return 'Returned';
  if (route.statusAfter === 'COMPLETED') return 'Completed';
  if (route.isTransfer) return 'Transferred';
  return route.actionRequested?.trim() || 'Routed / Assigned';
};

interface ReportTab {
  type: ReportType;
  icon: string;
  count: number;
}

const AUTO_SAVE_KEY = 'document_reports_auto_save';

const AUTO_SAVE_FOLDER_KEY = `${AUTO_SAVE_KEY}_folder_name`;

const monthOf = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 7);
};

const decisionFrom = (value?: string) =>
  value?.match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1]
    ?.toUpperCase() as 'APPROVED' | 'DISAPPROVED' | undefined;

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

const saveDirectoryHandle = async (handle: any) => {
  const database = await openHandleDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction('handles', 'readwrite');
    transaction.objectStore('handles').put(handle, AUTO_SAVE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
};

const loadDirectoryHandle = async () => {
  const database = await openHandleDatabase();
  const handle = await new Promise<any>((resolve, reject) => {
    const request = database
      .transaction('handles', 'readonly')
      .objectStore('handles')
      .get(AUTO_SAVE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return handle;
};

const makeWorkbook = (
  rows: Record<string, unknown>[],
  sheetName: string,
  headings: string[],
) => {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headings });
  worksheet['!cols'] = headings.map((heading) => {
    if (heading === '#') return { wch: 6 };
    if (heading === 'Route No.') return { wch: 22 };
    if (heading === 'Details') return { wch: 35 };
    if (heading === 'Route') return { wch: 65 };
    if (heading === 'Status') return { wch: 18 };
    const longestValue = rows.reduce((longest, row) => {
      const value = String(row[heading] ?? '');
      const longestLine = value
        .split('\n')
        .reduce((maximum, line) => Math.max(maximum, line.length), 0);
      return Math.max(longest, longestLine);
    }, heading.length);
    return { wch: Math.min(55, Math.max(14, longestValue + 2)) };
  });
  worksheet['!autofilter'] = {
    ref:
      worksheet['!ref'] ||
      `A1:${XLSX.utils.encode_col(Math.max(0, headings.length - 1))}1`,
  };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  return workbook;
};

@Component({
  selector: 'app-reports-view',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonicModule, FormsModule, NgClass, ClsPipe],
  styleUrl: './reports-view.component.scss',
  templateUrl: './reports-view.component.html',
})
export class ReportsViewComponent implements OnInit, OnChanges, OnDestroy {
  @Input() documents: DocumentRecord[] = [];
  @Input() envelopeLogs: AuditLog[] = [];
  @Input() auditLogs: AuditLog[] = [];
  @Input() reportType: ReportType | '' = '';

  readonly activeReport = signal<ReportType>('INCOMING');
  readonly monthFilter = signal('ALL');
  readonly searchQuery = signal('');
  readonly expandedRouteId = signal<string | null>(null);
  readonly autoDirectory = signal<any>(null);
  readonly savedFolderName = signal('');
  readonly statusMessage = signal('');

  private autoExportTimer: any = null;

  ngOnInit(): void {
    this.activeReport.set(this.reportType || 'INCOMING');
    this.savedFolderName.set(localStorage.getItem(AUTO_SAVE_FOLDER_KEY) || '');
    loadDirectoryHandle()
      .then(async (handle) => {
        if (!handle) return;
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          this.autoDirectory.set(handle);
          this.scheduleAutoExport();
        } else {
          this.statusMessage.set(
            `Select "${handle.name}" again to restore monthly auto-export.`,
          );
        }
      })
      .catch(() => {});
  }

  ngOnDestroy(): void {
    if (this.autoExportTimer) window.clearTimeout(this.autoExportTimer);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reportType']) {
      this.activeReport.set(this.reportType || 'INCOMING');
      this.monthFilter.set('ALL');
      this.searchQuery.set('');
    }
    if ((changes['documents'] || changes['envelopeLogs']) && this.autoDirectory()) {
      this.scheduleAutoExport();
    }
  }

  private scheduleAutoExport(): void {
    if (this.autoExportTimer) window.clearTimeout(this.autoExportTimer);
    const directory = this.autoDirectory();
    if (!directory) return;
    this.autoExportTimer = window.setTimeout(() => {
      this.autoExportCurrentMonth(directory).catch((error: Error) =>
        this.statusMessage.set(`Monthly auto-export failed: ${error.message}`),
      );
    }, 750);
  }

  reportLabel(type: ReportType): string {
    if (type === 'INCOMING') return 'Incoming Documents';
    if (type === 'OUTGOING') return 'Outgoing Documents';
    return 'Envelope Dispatches';
  }

  pageTitle(): string {
    return this.reportType
      ? `${this.reportLabel(this.activeReport())} Report`
      : 'Document Reports';
  }

  pageSubtitle(): string {
    return this.reportType
      ? `Monthly ${this.reportLabel(this.activeReport()).toLowerCase()} records with Excel export and automatic folder saving.`
      : 'Separate monthly reports for incoming documents, outgoing documents, and envelope dispatches.';
  }

  folderButtonLabel(): string {
    return this.autoDirectory() || this.savedFolderName()
      ? `Auto Folder: ${this.autoDirectory()?.name || this.savedFolderName()}`
      : 'Enable Monthly Auto-Export';
  }

  reportFileLabel(type: ReportType): string {
    if (type === 'INCOMING') return 'Incoming';
    if (type === 'OUTGOING') return 'Outgoing';
    return 'Envelope';
  }

  formatDate(dateString: string): string {
    return formatDateUtil(dateString);
  }

  monthLabel(month: string): string {
    return new Date(`${month}-01T00:00:00`).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
  }

  incoming(): DocumentRecord[] {
    return this.documents.filter((document) => document.direction === 'INCOMING');
  }

  outgoing(): DocumentRecord[] {
    return this.documents.filter((document) => document.direction === 'OUTGOING');
  }

  reportTabs(): ReportTab[] {
    return [
      { type: 'INCOMING', icon: 'arrow-down-left', count: this.incoming().length },
      { type: 'OUTGOING', icon: 'arrow-up-right', count: this.outgoing().length },
      { type: 'ENVELOPE', icon: 'mail', count: this.envelopeLogs.length },
    ];
  }

  filteredDocuments(): DocumentRecord[] {
    const source = this.activeReport() === 'INCOMING' ? this.incoming() : this.outgoing();
    const query = this.searchQuery().trim().toLowerCase();
    return source.filter((document) => {
      if (this.monthFilter() !== 'ALL' && monthOf(document.dateReceived) !== this.monthFilter())
        return false;
      if (!query) return true;
      return [
        document.routeNo,
        document.trackingNumber,
        document.title,
        document.subject,
        document.senderName,
        document.recipientName,
        document.originatingOffice,
        document.destinationOffice,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }

  filteredEnvelopeLogs(): AuditLog[] {
    const query = this.searchQuery().trim().toLowerCase();
    return this.envelopeLogs.filter((log) => {
      if (this.monthFilter() !== 'ALL' && monthOf(log.timestamp) !== this.monthFilter())
        return false;
      if (!query) return true;
      return [log.documentTrackingNumber, log.userName, log.details].some(
        (value) => value?.toLowerCase().includes(query),
      );
    });
  }

  availableMonths(): string[] {
    const months = new Set<string>();
    this.documents.forEach((document) => months.add(monthOf(document.dateReceived)));
    this.envelopeLogs.forEach((log) => months.add(monthOf(log.timestamp)));
    return [...months].filter(Boolean).sort((first, second) => second.localeCompare(first));
  }

  visibleCount(): number {
    return this.activeReport() === 'ENVELOPE'
      ? this.filteredEnvelopeLogs().length
      : this.filteredDocuments().length;
  }

  latestRouteOf(document: DocumentRecord): DocumentRouteStep | undefined {
    return [...(document.routes || [])].sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    )[0];
  }

  routeHistoryFor(document: DocumentRecord): RouteHistoryRow[] {
    return (document.routes || [])
      .map((route) => ({
        id: `route-${route.id}`,
        timestamp: route.processedAt || route.createdAt,
        date: formatReportDate(route.processedAt || route.createdAt),
        from: route.fromUser || 'System',
        to: route.toUser || route.toDivision || 'Unassigned',
        action: routeActionLabel(route),
        remarks:
          route.remarks ||
          route.actionTaken ||
          route.actionRequested ||
          'No remarks provided',
      }))
      .sort(
        (first, second) =>
          new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime(),
      );
  }

  eventsFor(document: DocumentRecord): ReportEvent[] {
    const routeEvents: ReportEvent[] = (document.routes || []).map((route) => {
      const decision = decisionFrom(
        `${route.actionRequested || ''} ${route.remarks || ''}`,
      );
      return {
        id: `route-${route.id}`,
        timestamp: route.processedAt || route.createdAt,
        actor: route.fromUser || 'System',
        event: decision
          ? decision === 'APPROVED'
            ? 'Approved'
            : 'Disapproved / Returned'
          : route.isTransfer
            ? 'Transferred'
            : 'Routed / Assigned',
        details: decision
          ? `${decision === 'APPROVED' ? 'Approved for continued processing' : 'Disapproved and returned'}${route.actionTaken ? `. Action taken: ${route.actionTaken}` : ''}${route.remarks ? `. Reason/remarks: ${route.remarks}` : ''}`
          : `Sent to ${route.toUser || route.toDivision || 'Unassigned'}${route.actionRequested ? ` for ${route.actionRequested}` : ''}${route.actionTaken ? `. Action taken/completion note: ${route.actionTaken}` : ''}${route.remarks ? `. Notes/remarks: ${route.remarks}` : ''}`,
        outcome:
          decision ||
          (route.statusAfter === 'RETURNED'
            ? 'RETURNED'
            : route.statusAfter === 'COMPLETED'
              ? 'COMPLETED'
              : ''),
      };
    });
    const routeNumber = document.routeNo || document.trackingNumber;
    const auditEvents: ReportEvent[] = this.auditLogs
      .filter(
        (log) =>
          (log.documentTrackingNumber === routeNumber ||
            log.documentTrackingNumber === document.trackingNumber) &&
          [
            'CREATE_DOC',
            'REGISTER_DOC',
            'ROUTE_DOC',
            'TRANSFER_DOC',
            'UPDATE_STATUS',
          ].includes(log.action),
      )
      .map((log) => {
        const decision = decisionFrom(log.details);
        const status = log.details
          .match(/Status:\s*([^|]+)/i)?.[1]
          ?.trim()
          .toUpperCase();
        return {
          id: `audit-${log.id}`,
          timestamp: log.timestamp,
          actor: log.userName,
          event: decision
            ? decision === 'APPROVED'
              ? 'Approved'
              : 'Disapproved / Returned'
            : log.action === 'CREATE_DOC' || log.action === 'REGISTER_DOC'
              ? 'Received / Registered'
              : log.action === 'TRANSFER_DOC'
                ? 'Transferred'
                : log.action === 'UPDATE_STATUS'
                  ? 'Status Updated'
                  : 'Routed / Assigned',
          details: log.details,
          outcome:
            decision ||
            (status === 'RETURNED'
              ? 'RETURNED'
              : status === 'COMPLETED'
                ? 'COMPLETED'
                : ''),
        };
      });
    return [...routeEvents, ...auditEvents]
      .sort(
        (first, second) =>
          new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime(),
      )
      .filter(
        (event, index, events) =>
          index ===
          events.findIndex(
            (candidate) =>
              candidate.event === event.event &&
              candidate.actor.trim().toLowerCase() ===
                event.actor.trim().toLowerCase() &&
              Math.abs(
                new Date(candidate.timestamp).getTime() -
                  new Date(event.timestamp).getTime(),
              ) < 2_000,
          ),
      );
  }

  finalOutcomeOf(document: DocumentRecord, events: ReportEvent[]): string {
    const latestDecision = [...events].reverse().find((event) => event.outcome);
    if (
      latestDecision?.outcome === 'DISAPPROVED' ||
      latestDecision?.outcome === 'RETURNED'
    )
      return 'DISAPPROVED / RETURNED';
    if (
      document.currentStatus === 'COMPLETED' ||
      latestDecision?.outcome === 'COMPLETED'
    )
      return 'COMPLETED';
    if (latestDecision?.outcome === 'APPROVED')
      return 'APPROVED - FOR CONTINUED PROCESSING';
    if (document.currentStatus === 'FOR_SIGNATURE')
      return 'WAITING FOR APPROVAL / SIGNATURE';
    if (document.currentStatus === 'ON_HOLD') return 'ON HOLD';
    if (document.currentStatus === 'IN_PROGRESS') return 'IN PROGRESS';
    return 'PENDING ACTION';
  }

  outcomeBadgeClass(finalOutcome: string): string {
    return cx(
      'reports-outcome',
      finalOutcome.includes('DISAPPROVED')
        ? 'reports-outcomeNegative'
        : finalOutcome === 'COMPLETED'
          ? 'reports-outcomeComplete'
          : finalOutcome.includes('APPROVED')
            ? 'reports-outcomeApproved'
            : 'reports-outcomePending',
    );
  }

  eventNameClass(outcome: string): string {
    return cx(
      'reports-eventName',
      outcome === 'DISAPPROVED' || outcome === 'RETURNED'
        ? 'reports-eventNegative'
        : outcome === 'APPROVED' || outcome === 'COMPLETED'
          ? 'reports-eventPositive'
          : 'reports-eventNeutral',
    );
  }

  tabClass(type: ReportType): string {
    return cx(
      'reports-reportTab',
      this.activeReport() === type && 'reports-reportTabActive',
    );
  }

  

  

  documentRows(documents: DocumentRecord[]): Record<string, unknown>[] {
    const sorted = [...documents].sort((first, second) => {
      const timeDiff =
        new Date(second.dateReceived || second.createdAt).getTime() -
        new Date(first.dateReceived || first.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (first.routeNo || '').localeCompare(second.routeNo || '');
    });

    return sorted.map((document, index) => {
      const routes = [...(document.routes || [])].sort(
        (first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
      );
      const latestRoute = routes.at(-1);
      const initialDate = this.formatDate(document.dateReceived || document.createdAt);
      const sender = document.senderName || document.originatingOffice || '—';
      const senderOffice =
        document.originatingOffice &&
        document.senderName &&
        document.originatingOffice !== document.senderName
          ? document.originatingOffice
          : '';
      const currentHolder =
        document.recipientName ||
        latestRoute?.toUser ||
        document.assignedUser ||
        '—';
      const currentOffice =
        document.recipientOffice ||
        latestRoute?.toDivision ||
        document.currentDivision ||
        '';

      const actionText =
        latestRoute?.actionTaken ||
        latestRoute?.actionRequested ||
        document.actionRequested ||
        '';
      const remarksText = latestRoute?.remarks || document.remarks || '';

      const movementRows = this.routeHistoryFor(document);
      const displayRows = movementRows.length
        ? movementRows
        : [
            {
              id: 'initial',
              timestamp: document.dateReceived || document.createdAt,
              date: initialDate,
              from: sender + (senderOffice ? ` (${senderOffice})` : ''),
              to: currentHolder + (currentOffice ? ` (${currentOffice})` : ''),
              action: actionText || 'Initial Entry',
              remarks: remarksText || 'Recorded in system',
            },
          ];

      const routeText = displayRows
        .map((row, i) => {
          const stepPrefix = displayRows.length > 1 ? `[${i + 1}] ` : '';
          const actionInfo =
            row.remarks &&
            row.remarks !== 'No remarks provided' &&
            row.remarks !== row.action
              ? `${row.action} (${row.remarks})`
              : row.action;
          return `${stepPrefix}${row.date} | From: ${row.from} -> To: ${row.to} | Action: ${actionInfo}`;
        })
        .join('\n');

      const title = document.title || 'Untitled';
      const subject =
        document.subject && document.subject.trim() !== title.trim()
          ? `Subject: ${document.subject.trim()}`
          : '';
      const details = [title, subject].filter(Boolean).join('\n');

      const simpleStatus = this.getSimpleStatus(document.currentStatus);

      return {
        '#': index + 1,
        'Route No.': document.routeNo || document.trackingNumber || 'N/A',
        Details: details,
        Route: routeText,
        Status: simpleStatus.label,
      };
    });
  }

  getDispatchDetailItems(details: string): string[] {
    if (!details) return [];
    const normalized = details.trim();
    if (normalized.includes(' | ')) {
      return normalized
        .split(' | ')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (normalized.includes('\n')) {
      return normalized
        .split('\n')
        .map((s) => s.trim().replace(/^[•\-\*]\s*/, ''))
        .filter(Boolean);
    }
    return [normalized];
  }

  envelopeRows(logs: AuditLog[]): Record<string, unknown>[] {
    return logs.map((log) => {
      const bulletedDetails = this.getDispatchDetailItems(log.details)
        .map((item) => `• ${item}`)
        .join('\n');
      return {
        Timestamp: formatDateUtil(log.timestamp),
        'Route No.': log.documentTrackingNumber || 'N/A',
        'Released By': log.userName,
        'Dispatch Details': bulletedDetails || log.details,
      };
    });
  }

  rowsFor(type: ReportType, month: string): Record<string, unknown>[] {
    if (type === 'ENVELOPE') {
      return this.envelopeRows(
        this.envelopeLogs.filter(
          (log) => month === 'ALL' || monthOf(log.timestamp) === month,
        ),
      );
    }
    return this.documentRows(
      this.documents.filter(
        (document) =>
          document.direction === type &&
          (month === 'ALL' || monthOf(document.dateReceived) === month),
      ),
    );
  }

  async writeReportToDirectory(
    directory: any,
    type: ReportType,
    month: string,
  ) {
    const rows = this.rowsFor(type, month);
    const workbook = makeWorkbook(
      rows,
      this.reportLabel(type),
      type === 'ENVELOPE' ? ENVELOPE_REPORT_HEADERS : DOCUMENT_REPORT_HEADERS,
    );
    const contents = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileName = `BLGF_R2_${this.reportFileLabel(type)}_Report_${month}.xlsx`;
    const fileHandle = await directory.getFileHandle(fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
    return { count: rows.length, fileName };
  }

  async autoExportCurrentMonth(directory: any): Promise<void> {
    const month = new Date().toISOString().slice(0, 7);
    const results = await Promise.all(
      (['INCOMING', 'OUTGOING', 'ENVELOPE'] as ReportType[]).map((type) =>
        this.writeReportToDirectory(directory, type, month),
      ),
    );
    this.statusMessage.set(
      `Monthly auto-export updated ${results.length} reports in ${directory.name} for ${month}.`,
    );
  }

  async chooseAutoSaveDirectory(): Promise<void> {
    const picker = (globalThis as any).showDirectoryPicker;
    if (!picker) {
      this.statusMessage.set(
        'Monthly auto-export requires the latest Chrome or Microsoft Edge.',
      );
      return;
    }
    try {
      const handle = await picker({
        id: AUTO_SAVE_KEY,
        mode: 'readwrite',
        startIn: 'documents',
      });
      const permission = await handle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') return;
      await saveDirectoryHandle(handle);
      localStorage.setItem(AUTO_SAVE_FOLDER_KEY, handle.name);
      this.savedFolderName.set(handle.name);
      this.autoDirectory.set(handle);
      this.scheduleAutoExport();
      await this.autoExportCurrentMonth(handle);
    } catch (error: any) {
      if (error?.name !== 'AbortError')
        this.statusMessage.set(
          `Unable to select report folder: ${error.message}`,
        );
    }
  }

  async exportActiveReport(): Promise<void> {
    try {
      const rows =
        this.activeReport() === 'ENVELOPE'
          ? this.envelopeRows(this.filteredEnvelopeLogs())
          : this.documentRows(this.filteredDocuments());
      const month = this.monthFilter() === 'ALL' ? 'All_Months' : this.monthFilter();
      const fileName = `BLGF_R2_${this.reportFileLabel(this.activeReport())}_Report_${month}.xlsx`;
      const workbook = makeWorkbook(
        rows,
        this.reportLabel(this.activeReport()),
        this.activeReport() === 'ENVELOPE'
          ? ENVELOPE_REPORT_HEADERS
          : DOCUMENT_REPORT_HEADERS,
      );
      XLSX.writeFile(workbook, fileName);
      this.statusMessage.set(`Exported ${rows.length} record(s) to ${fileName}.`);
    } catch (error: any) {
      this.statusMessage.set(`Excel export failed: ${error.message}`);
    }
  }

  printActiveReport(): void {
    const type = this.activeReport();
    const reportName = type === 'ENVELOPE'
      ? 'Outgoing Envelope Register'
      : `${this.reportLabel(type)} Report`;
    const period = this.monthFilter() === 'ALL'
      ? 'All available records'
      : this.monthLabel(this.monthFilter());
    const query = this.searchQuery().trim();
    const generatedOn = new Date().toLocaleString('en-PH', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
    const logoUrl = `${window.location.origin}/blgflogo.jpg`;

    let rowsHtml = '';
    let tableHeader = '';
    let routingFlowHtml = '';

    if (type === 'ENVELOPE') {
      const logs = this.filteredEnvelopeLogs();
      tableHeader = `
        <tr>
          <th class="row-no">#</th>
          <th class="route-col">Document Route No.</th>
          <th>Dispatch Details</th>
          <th class="date-col">Date &amp; Time</th>
          <th class="person-col">Released By</th>
        </tr>`;
      rowsHtml = logs.map((log, index) => `
        <tr>
          <td class="row-no">${index + 1}</td>
          <td class="route-value">${this.escapePrintHtml(log.documentTrackingNumber || 'N/A')}</td>
          <td>${this.getDispatchDetailItems(log.details).map((item) => `<div class="detail-line">• ${this.escapePrintHtml(item)}</div>`).join('')}</td>
          <td>${this.escapePrintHtml(this.formatDate(log.timestamp))}</td>
          <td>${this.escapePrintHtml(log.userName)}</td>
        </tr>`).join('');
    } else {
      const documents = [...this.filteredDocuments()].sort((first, second) => {
        const timeDiff =
          new Date(second.dateReceived || second.createdAt).getTime() -
          new Date(first.dateReceived || first.createdAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return (first.routeNo || '').localeCompare(second.routeNo || '');
      });

      const tableRows = documents.map((document, index) => {
        const routes = [...(document.routes || [])].sort(
          (first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
        );
        const latestRoute = routes.at(-1);
        const initialDate = this.formatDate(document.dateReceived || document.createdAt);
        const sender = document.senderName || document.originatingOffice || '—';
        const senderOffice = document.originatingOffice && document.senderName && document.originatingOffice !== document.senderName
          ? document.originatingOffice
          : '';
        const currentHolder = document.recipientName || latestRoute?.toUser || document.assignedUser || '—';
        const currentOffice = document.recipientOffice || latestRoute?.toDivision || document.currentDivision || '';

        const actionText = latestRoute?.actionTaken || latestRoute?.actionRequested || document.actionRequested || '';
        const remarksText = latestRoute?.remarks || document.remarks || '';

        // Simple status
        const simpleStatus = this.getSimpleStatus(document.currentStatus);

        // Routing path summary with date, from, to, and action/remarks
        const movementRows = this.routeHistoryFor(document);
        const displayRows = movementRows.length
          ? movementRows
          : [
              {
                id: 'initial',
                timestamp: document.dateReceived || document.createdAt,
                date: initialDate,
                from: sender + (senderOffice ? ` (${senderOffice})` : ''),
                to: currentHolder + (currentOffice ? ` (${currentOffice})` : ''),
                action: actionText || 'Initial Entry',
                remarks: remarksText || 'Recorded in system',
              },
            ];

        const routeStepsHtml = `<table class="route-movement">
          <thead>
            <tr>
              <th class="rm-date">Date</th>
              <th class="rm-from">From</th>
              <th class="rm-to">To</th>
              <th class="rm-action">Action / Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${displayRows.map((row) => `
              <tr>
                <td class="rm-date">${this.escapePrintHtml(row.date)}</td>
                <td class="rm-from">${this.escapePrintHtml(row.from)}</td>
                <td class="rm-to">${this.escapePrintHtml(row.to)}</td>
                <td class="rm-action">
                  <div class="rm-act">${this.escapePrintHtml(row.action)}</div>
                  ${row.remarks && row.remarks !== 'No remarks provided' && row.remarks !== row.action ? `<div class="rm-rem">${this.escapePrintHtml(row.remarks)}</div>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;

        return `<tr>
          <td class="col-num">${index + 1}</td>
          <td class="col-route-no">
            <span class="route-code">${this.escapePrintHtml(document.routeNo || document.trackingNumber)}</span>
          </td>
          <td class="col-details">
            <div class="detail-title">${this.escapePrintHtml(document.title)}</div>
            ${document.subject ? `<div class="detail-subject">${this.escapePrintHtml(document.subject)}</div>` : ''}
          </td>
          <td class="col-route">
            ${routeStepsHtml}
          </td>
          <td class="col-status">
            <span class="status-text">${this.escapePrintHtml(simpleStatus.label)}</span>
          </td>
        </tr>`;
      }).join('');

      routingFlowHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th class="col-route-no">Route No.</th>
              <th class="col-details">Details</th>
              <th class="col-route">Route</th>
              <th class="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || `<tr><td colspan="5" class="empty-table-cell">No documents match the selected report criteria.</td></tr>`}
          </tbody>
        </table>`;
    }

    const printHtml = `<!doctype html>
      <html lang="en"><head><meta charset="utf-8">
      <title></title>
      <style>
        @page { size: A4 landscape; margin: 0 !important; }
        * { box-sizing: border-box; }
        html, body {
          margin: 0; padding: 0; background: #fff; color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @media screen {
          body { background: #e2e8f0; padding: 20px; display: flex; justify-content: center; }
          .print-page {
            width: 297mm; min-height: 210mm; background: #fff;
            padding: 10mm 12mm 14mm 12mm;
            box-shadow: 0 10px 32px rgba(15, 23, 42, 0.16);
            box-sizing: border-box; border-radius: 4px;
          }
        }
        @media print {
          body { background: #fff !important; padding: 0 !important; }
          .print-page {
            width: 100% !important; min-height: 0 !important;
            padding: 8mm 10mm 10mm !important; margin: 0 !important;
            box-shadow: none !important;
          }
        }

        /* Official Header */
        .official-header {
          display: grid; grid-template-columns: 20mm 1fr 48mm;
          align-items: center; gap: 4mm; padding-bottom: 3mm;
          border-bottom: 2.5px solid #0f2d59;
        }
        .seal { width: 19mm; height: 19mm; object-fit: contain; }
        .official-header-text { text-align: left; }
        .republic {
          margin: 0 0 0.5mm; font-family: Georgia, "Times New Roman", serif;
          font-size: 7.5pt; color: #475569; letter-spacing: 0.06em; text-transform: uppercase;
        }
        .department {
          margin: 0; font-size: 7.5pt; font-weight: 700; color: #334155;
          letter-spacing: 0.04em; text-transform: uppercase;
        }
        .agency {
          margin: 0.5mm 0; color: #0f2d59; font-size: 12pt; font-weight: 900;
          letter-spacing: 0.015em; line-height: 1.15;
        }
        .regional-office {
          margin: 0; color: #1e40af; font-size: 8.5pt; font-weight: 800; letter-spacing: 0.03em;
        }
        .office-address {
          margin: 0.5mm 0 0; color: #64748b; font-size: 7pt; line-height: 1.3;
        }
        .header-mark {
          text-align: right; border-left: 1px solid #cbd5e1; padding-left: 3mm;
        }
        .header-mark-title {
          color: #0f2d59; font-size: 8pt; font-weight: 900; letter-spacing: 0.05em;
        }
        .header-mark-sub {
          color: #64748b; font-size: 6.5pt; font-weight: 700; margin-top: 0.5mm;
        }
        .header-mark-badge {
          display: inline-block; margin-top: 1.5mm; padding: 0.8mm 2.2mm;
          border-radius: 3px; background: #0f2d59; color: #ffffff;
          font-size: 6pt; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;
        }

        /* Report Title & Subtitle */
        .report-heading {
          display: flex; justify-content: space-between; align-items: flex-end;
          gap: 5mm; padding: 3.5mm 0 2.5mm; border-bottom: 1px solid #e2e8f0;
          margin-bottom: 3mm;
        }
        h1 {
          margin: 0; color: #0f2d59; font-size: 14pt; font-weight: 900;
          letter-spacing: -0.02em; line-height: 1.2;
        }
        .report-category {
          margin-top: 0.8mm; color: #2563eb; font-size: 8pt; font-weight: 700;
        }
        .report-meta {
          margin-top: 1mm; color: #475569; font-size: 7.2pt;
        }
        .generated {
          text-align: right; color: #475569; font-size: 7pt; line-height: 1.45; white-space: nowrap;
        }

        /* Official Report Table */
        .report-table {
          width: 100%; border-collapse: collapse; table-layout: fixed;
          font-size: 7pt; margin-top: 3mm; border: 1.5px solid #0f2d59;
        }
        .report-table thead { display: table-header-group; }
        .report-table th {
          padding: 2.2mm 2mm; background: #0f2d59; color: #ffffff;
          font-size: 6.8pt; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.03em; text-align: left; border-right: 1px solid #2d4f9e;
          vertical-align: middle;
        }
        .report-table th:last-child { border-right: none; }
        .report-table td {
          padding: 2mm 2mm; border-top: 1px solid #cbd5e1;
          border-right: 1px solid #f1f5f9; vertical-align: top;
          line-height: 1.35; overflow-wrap: break-word; word-break: break-word;
        }
        .report-table td:last-child { border-right: none; }
        .report-table tbody tr:nth-child(even) { background: #f8fafc; }
        .report-table tr { page-break-inside: avoid; break-inside: avoid; }

        .col-num { width: 3.5%; text-align: center; font-weight: 800; color: #1e3a8a; }
        .col-route-no { width: 17%; }
        .col-details { width: 18%; }
        .col-route { width: 52.5%; }
        .col-status { width: 9%; text-align: center; }

        .route-code {
          font-family: Consolas, monospace;
          font-weight: 800;
          color: #1e40af;
          font-size: 7.2pt;
          word-break: break-all;
        }

        .route-movement {
          width: 100%;
          border-collapse: collapse;
          font-size: 6.2pt;
          background: #ffffff;
          border: 1px solid #cbd5e1;
        }
        .route-movement thead th {
          background: #1e3a8a;
          color: #ffffff;
          padding: 1.2mm 1.6mm;
          font-size: 6pt;
          font-weight: 800;
          text-transform: uppercase;
          border-right: 1px solid #3b82f6;
          text-align: left;
        }
        .route-movement thead th:last-child { border-right: none; }
        .route-movement tbody td {
          padding: 1.2mm 1.6mm;
          border-top: 1px solid #e2e8f0;
          border-right: 1px solid #f1f5f9;
          vertical-align: top;
          line-height: 1.28;
          color: #1e293b;
        }
        .route-movement tbody td:last-child { border-right: none; }
        .route-movement tbody tr:nth-child(even) { background: #f8fafc; }
        .rm-date { width: 22%; font-weight: 600; color: #334155; white-space: nowrap; }
        .rm-from { width: 25%; font-weight: 700; color: #0f172a; }
        .rm-to { width: 25%; font-weight: 700; color: #0f172a; }
        .rm-action { width: 28%; }
        .rm-act { font-weight: 600; color: #1e293b; }
        .rm-rem { font-size: 5.6pt; color: #64748b; font-style: italic; margin-top: 0.3mm; }

        .detail-title {
          font-weight: 800;
          color: #0f172a;
          line-height: 1.22;
          font-size: 6.8pt;
        }
        .detail-subject {
          font-size: 5.8pt;
          color: #475569;
          margin-top: 0.4mm;
          line-height: 1.25;
        }
        .empty-table-cell { text-align: center; padding: 10mm; color: #64748b; font-size: 8pt; }

        .status-text {
          color: #0f172a; font-size: 6.5pt; font-weight: 700;
          text-transform: capitalize; white-space: nowrap;
        }

        /* Envelope Table (For Envelope Report) */
        .envelope-table {
          width: 100%; border-collapse: collapse; table-layout: fixed;
          font-size: 7.2pt; margin-top: 3mm; border: 1.5px solid #0f2d59;
        }
        .envelope-table thead { display: table-header-group; }
        .envelope-table th {
          padding: 2.2mm 2mm; background: #0f2d59; color: #ffffff;
          font-size: 6.8pt; font-weight: 800; text-transform: uppercase; text-align: left;
          border-right: 1px solid #2d4f9e;
        }
        .envelope-table th:last-child { border-right: none; }
        .envelope-table td {
          padding: 2mm 2mm; border-top: 1px solid #cbd5e1;
          border-right: 1px solid #f1f5f9; vertical-align: top; line-height: 1.35;
        }
        .envelope-table td:last-child { border-right: none; }
        .envelope-table tbody tr:nth-child(even) { background: #f8fafc; }
        .envelope-table tr { page-break-inside: avoid; break-inside: avoid; }
        .envelope-table .row-no { width: 4%; text-align: center; font-weight: 800; color: #1e3a8a; }
        .envelope-table .date-col { width: 16%; }
        .envelope-table .route-col { width: 18%; }
        .envelope-table .person-col { width: 18%; }
        .route-value { color: #1e40af; font-family: Consolas, monospace; font-weight: 800; }
        .detail-line { margin-bottom: 0.5mm; }

        /* Empty state */
        .empty {
          padding: 12mm; border: 1px dashed #cbd5e1; border-radius: 4px;
          color: #64748b; text-align: center; font-size: 8pt; margin-top: 4mm;
        }

        /* Signatures */
        .signatures-section {
          display: grid; grid-template-columns: 1fr 1fr; gap: 30mm;
          margin-top: 8mm; padding: 0 4mm; page-break-inside: avoid; break-inside: avoid;
        }
        .sig-block { text-align: left; }
        .sig-title {
          font-size: 6.8pt; font-weight: 800; color: #64748b;
          text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 10mm;
        }
        .sig-line { border-bottom: 1.2px solid #0f172a; margin-bottom: 1.2mm; }
        .sig-name { font-size: 8.5pt; font-weight: 800; color: #0f172a; }
        .sig-role { font-size: 6.8pt; color: #475569; }
        .sig-date { font-size: 6.8pt; color: #64748b; margin-top: 1mm; }

        /* Footer */
        .official-footer {
          margin-top: 6mm; padding-top: 2.5mm; border-top: 1px solid #cbd5e1;
          text-align: center; font-size: 6.5pt; color: #64748b; line-height: 1.45;
        }
      </style></head><body><main class="print-page">
        <header class="official-header">
          <img class="seal" src="${logoUrl}" alt="BLGF seal" onerror="this.style.display='none'">
          <div class="official-header-text">
            <p class="republic">Republic of the Philippines</p>
            <p class="department">Department of Finance</p>
            <p class="agency">BUREAU OF LOCAL GOVERNMENT FINANCE</p>
            <p class="regional-office">REGIONAL OFFICE NO. II</p>
            <p class="office-address">Regional Government Center, Carig Sur, Tuguegarao City, Cagayan 3500</p>
          </div>
          <div class="header-mark">
            <div class="header-mark-title">BLGF REGION II</div>
            <div class="header-mark-sub">DOCUMENT TRACKING SYSTEM</div>
            <div class="header-mark-badge">OFFICIAL REPORT</div>
          </div>
        </header>

        <section class="report-heading">
          <div>
            <h1>${this.escapePrintHtml(reportName)}</h1>
            <div class="report-category">${type === 'ENVELOPE' ? 'Outgoing Envelope Register' : `${this.escapePrintHtml(this.reportLabel(type))} · Movement &amp; Tracking History`}</div>
            <div class="report-meta">
              Reporting Period: <strong>${this.escapePrintHtml(period)}</strong>
              ${query ? ` &nbsp;·&nbsp; Search filter: <strong>${this.escapePrintHtml(query)}</strong>` : ''}
            </div>
          </div>
          <div class="generated">
            Date Generated:<br>
            <strong>${this.escapePrintHtml(generatedOn)}</strong>
          </div>
        </section>

        ${type === 'ENVELOPE'
          ? (this.filteredEnvelopeLogs().length ? `<table class="envelope-table"><thead>${tableHeader}</thead><tbody>${rowsHtml}</tbody></table>` : '<div class="empty">No envelope dispatches match the selected report filters.</div>')
          : (this.filteredDocuments().length ? routingFlowHtml : '<div class="empty">No document records match the selected report filters.</div>')
        }

        <section class="signatures-section">
          <div class="sig-block">
            <div class="sig-title">Prepared and Certified by:</div>
            <div class="sig-line"></div>
            <div class="sig-name">Records Officer / DTS Custodian</div>
            <div class="sig-role">Bureau of Local Government Finance - Regional Office II</div>
            <div class="sig-date">Date: __________________________________</div>
          </div>
          <div class="sig-block">
            <div class="sig-title">Reviewed and Noted by:</div>
            <div class="sig-line"></div>
            <div class="sig-name">Regional Director / Division Chief</div>
            <div class="sig-role">Bureau of Local Government Finance - Regional Office II</div>
            <div class="sig-date">Date: __________________________________</div>
          </div>
        </section>

        <footer class="official-footer">
          Bureau of Local Government Finance · Regional Office No. II · Document Tracking System (DTS)<br>
          Official Document Tracking &amp; Routing Registry · Confidential &amp; Official Government Record
        </footer>
      </main><script>window.onload=function(){setTimeout(function(){window.print();},250)};<\/script></body></html>`;
    this.printHtmlInApp(printHtml);
  }

  private printHtmlInApp(html: string): void {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, {
      position: 'fixed',
      width: '1px',
      height: '1px',
      right: '0',
      bottom: '0',
      opacity: '0',
      pointerEvents: 'none',
      border: '0',
    });
    document.body.appendChild(frame);
    const printWindow = frame.contentWindow;
    if (!printWindow) {
      frame.remove();
      this.statusMessage.set('Unable to prepare the report print dialog.');
      return;
    }

    const previousDocumentTitle = document.title;
    document.title = '';
    let cleanedUp = false;
    const cleanup = (): void => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.title = previousDocumentTitle;
      frame.remove();
    };
    printWindow.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 120_000);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  private escapePrintHtml(value: unknown): string {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character] || character);
  }

  private getSimpleStatus(status?: string): { label: string; classModifier: string } {
    const normalized = (status || 'PENDING').trim().toUpperCase();
    if (normalized === 'COMPLETED') {
      return { label: 'Completed', classModifier: 'completed' };
    }
    if (normalized === 'RETURNED' || normalized === 'DISAPPROVED') {
      return { label: normalized === 'RETURNED' ? 'Returned' : 'Disapproved', classModifier: 'returned' };
    }
    if (normalized === 'IN_PROGRESS' || normalized === 'APPROVED') {
      return { label: 'In Progress', classModifier: 'progress' };
    }
    return { label: normalized.replaceAll('_', ' '), classModifier: 'pending' };
  }

  selectReport(type: ReportType): void {
    this.activeReport.set(type);
    this.monthFilter.set('ALL');
    this.searchQuery.set('');
  }

  toggleHistory(documentId: string): void {
    this.expandedRouteId.update((current) =>
      current === documentId ? null : documentId,
    );
  }
}
