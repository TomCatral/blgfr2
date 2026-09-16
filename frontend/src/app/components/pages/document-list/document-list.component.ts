import { Component, Input, Output, EventEmitter, OnInit, computed, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClsPipe } from '../../../shared/cls.pipe';
import { cx } from '../../../shared/class-utils';
import {
  User,
  DocumentRecord,
  DocumentDirection,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../../types';
import {
  STATUS_CONFIGS,
  PRIORITY_CONFIGS,
  formatShortDate as formatShortDateUtil,
} from '../../../utils/status-utils';
import { calculateDocumentProgress } from '../../../utils/progress';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-document-list',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [FormsModule, NgClass, ClsPipe],
  styleUrl: './document-list.component.scss',
  templateUrl: './document-list.component.html',
})
export class DocumentListComponent implements OnInit {
  @Input({ required: true })
  set documents(value: DocumentRecord[]) {
    this.documentsSig.set(value);
  }

  @Input()
  set initialDirection(value: 'INCOMING' | 'OUTGOING') {
    this.initialDirectionVal = value;
    this.directionFilter.set(value);
    this.createLabel = value === 'OUTGOING' ? 'Log Outgoing Document' : 'Log New Document';
  }

  @Input()
  get searchQuery(): string {
    return this.searchQuerySig();
  }
  set searchQuery(value: string) {
    this.searchQuerySig.set(value || '');
  }

  @Output() onSearchChange = new EventEmitter<string>();

  @Input({ required: true }) currentUser!: User;

  @Input()
  get onClearSearch(): () => void {
    return this.onClearSearchFn;
  }
  set onClearSearch(value: () => void) {
    this.onClearSearchFn = value;
    this.canClearSearch = Boolean(value);
  }

  @Input({ required: true }) onSelectDoc: (doc: DocumentRecord) => void = () => {};
  @Input({ required: true }) onOpenRouteDoc: (doc: DocumentRecord) => void = () => {};
  @Input({ required: true }) onOpenCreateDoc: () => void = () => {};
  @Input({ required: true }) onPrintSlip: (doc: DocumentRecord) => void = () => {};
  @Input({ required: true }) onDeleteDoc: (doc: DocumentRecord) => Promise<void> = () => Promise.resolve();

  initialDirectionVal: 'INCOMING' | 'OUTGOING' = 'INCOMING';

  readonly directions: Array<DocumentDirection | 'ALL'> = ['ALL', 'INCOMING', 'OUTGOING'];

  directionFilter = signal<DocumentDirection | 'ALL'>('ALL');
  statusFilter = signal<string>('ALL');
  divisionFilter = signal<string>('ALL');
  priorityFilter = signal<string>('ALL');

  readonly documentsSig = signal<DocumentRecord[]>([]);
  private readonly searchQuerySig = signal('');
  private onClearSearchFn: () => void = () => {};
  canClearSearch = false;

  private perms = DEFAULT_ROLE_PERMISSIONS.STAFF;
  canAccessSlip = false;
  canDeleteDoc = false;
  createLabel = 'Log New Document';

  readonly userFilteredDocs = computed(() => this.documentsSig());

  readonly normalizedQuery = computed(() => this.searchQuerySig().trim().toLowerCase());

  readonly effectiveDirection = computed<DocumentDirection | 'ALL'>(() => this.directionFilter());

  readonly filteredDocs = computed(() => {
    const query = this.normalizedQuery();
    const direction = this.effectiveDirection();
    const status = this.statusFilter();
    const division = this.divisionFilter();
    const priority = this.priorityFilter();

    return this.userFilteredDocs().filter((doc) => {
      if (query) {
        const searchable = [
          doc.routeNo || '',
          doc.trackingNumber || '',
          doc.title || '',
          doc.subject || '',
          doc.originatingOffice || '',
          doc.destinationOffice || '',
          doc.senderName || '',
          doc.senderPosition || '',
          doc.recipientName || '',
          doc.recipientPosition || '',
          doc.recipientOffice || '',
          doc.currentDivision || '',
          doc.category || '',
          doc.assignedUser || '',
          doc.actionRequested || '',
          doc.remarks || '',
          doc.currentStatus || '',
          doc.priority || '',
          ...(doc.tags || []),
          ...(doc.routes || []).flatMap((r) => [
            r.toUser || '',
            r.fromUser || '',
            r.toDivision || '',
            r.fromDivision || '',
            r.actionRequested || '',
            r.actionTaken || '',
            r.remarks || '',
          ]),
        ]
          .join(' ')
          .toLowerCase();

        if (!searchable.includes(query)) return false;
      }
      if (direction !== 'ALL' && doc.direction !== direction) return false;
      if (status !== 'ALL' && doc.currentStatus !== status) return false;
      if (division !== 'ALL' && doc.currentDivision !== division) return false;
      if (priority !== 'ALL' && doc.priority !== priority) return false;
      return true;
    });
  });

  onLocalSearchChange(value: string): void {
    this.searchQuerySig.set(value);
    this.onSearchChange.emit(value);
  }

  clearLocalSearch(): void {
    this.searchQuerySig.set('');
    this.onSearchChange.emit('');
    this.onClearSearchFn();
  }

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.directionFilter.set(this.initialDirectionVal);
    this.createLabel =
      this.initialDirectionVal === 'OUTGOING' ? 'Log Outgoing Document' : 'Log New Document';
    this.perms =
      this.currentUser.permissions ||
      DEFAULT_ROLE_PERMISSIONS[this.currentUser.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    this.canAccessSlip = (this.perms.allowedViews || []).includes('slip');
    this.canDeleteDoc = this.currentUser.role === 'SYSTEM_ADMIN' || Boolean(this.perms.canDelete);
  }

  setDirection(dir: DocumentDirection | 'ALL'): void {
    this.directionFilter.set(dir);
  }

  dirTabClass(dir: DocumentDirection | 'ALL'): string {
    const active = this.effectiveDirection() === dir;
    return cx('directionTab', active && 'directionTabActive', active && dir === 'OUTGOING' && 'outgoingTab');
  }

  dirLabel(dir: DocumentDirection | 'ALL'): string {
    if (dir === 'ALL') return `All (${this.userFilteredDocs().length})`;
    const label = dir === 'INCOMING' ? 'Incoming' : 'Outgoing';
    const count = this.userFilteredDocs().filter((d) => d.direction === dir).length;
    return `${label} (${count})`;
  }

  priorityClass(doc: DocumentRecord): string {
    const cfg = PRIORITY_CONFIGS[doc.priority];
    return cx('priorityBadge', `priority_${doc.priority}`, cfg?.animatePulse && 'pulse');
  }

  prioLabel(doc: DocumentRecord): string {
    return PRIORITY_CONFIGS[doc.priority]?.label || doc.priority;
  }

  statusLabel(doc: DocumentRecord): string {
    return STATUS_CONFIGS[doc.currentStatus]?.label || doc.currentStatus;
  }

  getProgress(doc: DocumentRecord) {
    return calculateDocumentProgress(doc);
  }

  canRoute(doc: DocumentRecord): boolean {
    return doc.currentStatus !== 'COMPLETED' && doc.currentStatus !== 'RETURNED';
  }

  latestAction(doc: DocumentRecord): string {
    return (
      [...(doc.routes || [])].sort((a, b) => b.stepNumber - a.stepNumber)[0]
        ?.actionRequested ||
      doc.actionRequested ||
      'N/A'
    );
  }

  highlightText(text: string | undefined, query: string): SafeHtml {
    const source = String(text || '');
    const q = query.trim();
    if (!q || !source) return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(source));
    const index = source.toLowerCase().indexOf(q.toLowerCase());
    if (index === -1) return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(source));
    const before = this.escapeHtml(source.slice(0, index));
    const match = this.escapeHtml(source.slice(index, index + q.length));
    const after = this.escapeHtml(source.slice(index + q.length));
    return this.sanitizer.bypassSecurityTrustHtml(
      `${before}<mark class="match">${match}</mark>${after}`
    );
  }

  formatShortDate(dateString: string): string {
    return formatShortDateUtil(dateString);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  cx = cx;
}
