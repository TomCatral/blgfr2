import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import * as XLSX from 'xlsx';
import { AuditLog, DocumentRecord, DocumentRouteStep } from '../../../types';
import { ClsPipe } from '../../../shared/cls.pipe';
import { cx } from '../../../shared/class-utils';
import { formatDate as formatDateUtil } from '../../../utils/status-utils';

type ReportType = 'INCOMING' | 'OUTGOING' | 'ENVELOPE';

interface ReportEvent {
  id: string;
  timestamp: string;
  actor: string;
  event: string;
  details: string;
  outcome: 'APPROVED' | 'DISAPPROVED' | 'RETURNED' | 'COMPLETED' | '';
}

interface HandoffSummary {
  instructions: string;
  completedBy: string;
  completedOffice: string;
  completedOn: string;
}

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

const makeWorkbook = (rows: Record<string, unknown>[], sheetName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = Object.keys(rows[0] || { Report: '' }).map((heading) => ({
    wch: Math.min(55, Math.max(16, heading.length + 3)),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  return workbook;
};

@Component({
  selector: 'app-reports-view',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [FormsModule, NgClass, ClsPipe, IonIcon],
  styleUrl: './reports.shared.scss',
  templateUrl: './reports-view.component.html',
})
export class ReportsViewComponent implements OnInit, OnChanges, OnDestroy {
  @Input() documents: DocumentRecord[] = [];
  @Input() envelopeLogs: AuditLog[] = [];
  @Input() auditLogs: AuditLog[] = [];
  @Input() reportType: ReportType | '' = '';

  readonly activeReport = signal<ReportType>('INCOMING');
  readonly monthFilter = signal(new Date().toISOString().slice(0, 7));
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

  completionNotesOf(document: DocumentRecord): string {
    const routeNumber = document.routeNo || document.trackingNumber;
    const routeNotes = (document.routes || [])
      .filter(
        (route) =>
          route.statusAfter === 'COMPLETED' ||
          Boolean(route.actionTaken?.trim()) ||
          Boolean(route.processedAt && route.remarks?.trim()),
      )
      .map((route) => {
        const note = [route.actionTaken, route.remarks]
          .map((value) => value?.trim())
          .filter(Boolean)
          .filter((value, index, values) => values.indexOf(value) === index)
          .join(' - ');
        return note
          ? `${route.fromUser || route.toUser || 'User'} (${formatDateUtil(route.processedAt || route.createdAt)}): ${note}`
          : '';
      });
    const auditNotes = this.auditLogs
      .filter(
        (log) =>
          (log.documentTrackingNumber === routeNumber ||
            log.documentTrackingNumber === document.trackingNumber) &&
          /COMPLETED|completion|completed/i.test(log.details),
      )
      .map(
        (log) => `${log.userName} (${formatDateUtil(log.timestamp)}): ${log.details}`,
      );
    return [...new Set([...routeNotes, ...auditNotes].filter(Boolean))].join('\n');
  }

  handoffOf(document: DocumentRecord): HandoffSummary {
    const completedRoute = [...(document.routes || [])]
      .reverse()
      .find((route) => route.statusAfter === 'COMPLETED');
    const remarks = completedRoute?.remarks?.trim() || '';
    const legacyPickupLocation =
      remarks
        .match(/Pickup Location:\s*(.*?)(?:\s*\|\s*Next Action:|$)/i)?.[1]
        ?.trim() ||
      (remarks && !/Pickup Location:/i.test(remarks) ? remarks : 'Not recorded');
    const legacyNextAction =
      remarks.match(/Next Action:\s*(.*)$/i)?.[1]?.trim() || 'Not recorded';
    const instructions =
      remarks.match(/Handoff Instructions:\s*(.*)$/i)?.[1]?.trim() ||
      `${legacyPickupLocation} ${legacyNextAction}`.trim();
    return {
      instructions,
      completedBy: completedRoute?.fromUser || 'Not completed',
      completedOffice: completedRoute?.fromDivision || 'Not recorded',
      completedOn: completedRoute
        ? formatDateUtil(completedRoute.processedAt || completedRoute.createdAt)
        : 'Not completed',
    };
  }

  documentRows(documents: DocumentRecord[]): Record<string, unknown>[] {
    return documents.map((document) => {
      const latestRoute = this.latestRouteOf(document);
      const events = this.eventsFor(document);
      const lastEvent = events.at(-1);
      const completionNotes = this.completionNotesOf(document);
      const handoff = this.handoffOf(document);
      return {
        'Document Route No.': document.routeNo || document.trackingNumber,
        Direction: document.direction,
        Title: document.title,
        Subject: document.subject,
        Category: document.category,
        'From Office': document.originatingOffice,
        Sender: document.senderName,
        Recipient: document.recipientName || 'N/A',
        'Initially Received / Recorded By': document.createdBy,
        'Current Holder':
          latestRoute?.toUser || document.assignedUser || 'Unassigned',
        'Current Division': latestRoute?.toDivision || document.currentDivision,
        'Final Outcome': this.finalOutcomeOf(document, events),
        'Last Activity': lastEvent
          ? `${lastEvent.event} by ${lastEvent.actor} on ${formatDateUtil(lastEvent.timestamp)}`
          : 'No activity recorded',
        'Actual Activity Timeline':
          events
            .map(
              (event) =>
                `${formatDateUtil(event.timestamp)} | ${event.actor} | ${event.event} | ${event.details}`,
            )
            .join('\n') || 'No activity recorded',
        'Final Action / Disposition':
          latestRoute?.actionRequested ||
          document.actionRequested ||
          'For appropriate action',
        'Completion Notes': completionNotes || 'No completion notes recorded',
        'Completion & Handoff Instructions': handoff.instructions,
        'Handoff - Completed By': handoff.completedBy,
        'Handoff - Completed Office': handoff.completedOffice,
        'Handoff - Completed On': handoff.completedOn,
        'Final Remarks': latestRoute?.remarks || document.remarks || 'N/A',
        Priority: document.priority.replaceAll('_', ' '),
        Status: document.currentStatus.replaceAll('_', ' '),
        'Date Received': formatDateUtil(document.dateReceived),
        'Target Completion': formatDateUtil(document.targetCompletionDate),
        'Completed Date': document.completedDate
          ? formatDateUtil(document.completedDate)
          : 'N/A',
        'Last Updated': formatDateUtil(document.updatedAt),
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
        'Document Route No.': log.documentTrackingNumber || 'N/A',
        'Released By': log.userName,
        'User Role': log.userRole,
        'Dispatch Details': bulletedDetails || log.details,
        'IP Address': log.ipAddress || 'N/A',
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
    const workbook = makeWorkbook(rows, this.reportLabel(type));
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
      const workbook = makeWorkbook(rows, this.reportLabel(this.activeReport()));
      XLSX.writeFile(workbook, fileName);
      this.statusMessage.set(`Exported ${rows.length} record(s) to ${fileName}.`);
    } catch (error: any) {
      this.statusMessage.set(`Excel export failed: ${error.message}`);
    }
  }

  selectReport(type: ReportType): void {
    this.activeReport.set(type);
    this.searchQuery.set('');
  }

  toggleHistory(documentId: string): void {
    this.expandedRouteId.update((current) =>
      current === documentId ? null : documentId,
    );
  }
}
