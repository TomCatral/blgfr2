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
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-document-list',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonicModule, FormsModule, NgClass, ClsPipe],
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
  @Input({ required: true }) onOpenCreateDoc: (direction?: DocumentDirection) => void = () => {};
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

    const tokens = query ? query.split(/\s+/).filter(Boolean) : [];

    const matches = this.userFilteredDocs().filter((doc) => {
      if (direction !== 'ALL' && doc.direction !== direction) return false;
      if (status !== 'ALL' && doc.currentStatus !== status) return false;
      if (division !== 'ALL' && doc.currentDivision !== division) return false;
      if (priority !== 'ALL' && doc.priority !== priority) return false;

      if (tokens.length > 0) {
        const searchable = [
          doc.routeNo || '',
          doc.trackingNumber || '',
          doc.title || '',
          doc.subject || '',
          doc.originatingOffice || '',
          doc.destinationOffice || '',
          doc.senderName || '',
          doc.senderPosition || '',
          doc.senderAddress || '',
          doc.recipientName || '',
          doc.recipientPosition || '',
          doc.recipientOffice || '',
          doc.recipientAddress || '',
          doc.currentDivision || '',
          doc.category || '',
          doc.assignedUser || '',
          doc.actionRequested || '',
          doc.remarks || '',
          doc.currentStatus || '',
          doc.currentStatus === 'NOT_YET_ROUTED' ? 'not yet routed unrouted' : '',
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

        const allTokensMatch = tokens.every((token) => searchable.includes(token));
        if (!allTokensMatch) return false;
      }

      return true;
    });

    if (tokens.length === 0) {
      return matches;
    }

    return [...matches].sort((a, b) => {
      const aRoute = (a.routeNo || a.trackingNumber || '').toLowerCase();
      const bRoute = (b.routeNo || b.trackingNumber || '').toLowerCase();
      const aTitle = (a.title || '').toLowerCase();
      const bTitle = (b.title || '').toLowerCase();

      let aScore = 0;
      let bScore = 0;

      if (aRoute === query) aScore += 200;
      if (bRoute === query) bScore += 200;
      if (aRoute.includes(query)) aScore += 100;
      if (bRoute.includes(query)) bScore += 100;
      if (aTitle.includes(query)) aScore += 60;
      if (bTitle.includes(query)) bScore += 60;

      for (const t of tokens) {
        if (aRoute.includes(t)) aScore += 25;
        if (bRoute.includes(t)) bScore += 25;
        if (aTitle.includes(t)) aScore += 15;
        if (bTitle.includes(t)) bScore += 15;
      }

      return bScore - aScore;
    });
  });

  onLocalSearchChange(value: string): void {
    this.searchQuerySig.set(value);
    this.onSearchChange.emit(value);
  }

  clearLocalSearch(): void {
    this.searchQuerySig.set('');
    this.onSearchChange.emit('');
    if (typeof this.onClearSearchFn === 'function') {
      this.onClearSearchFn();
    }
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
    if (dir === 'OUTGOING') {
      this.createLabel = 'Log Outgoing Document';
    } else if (dir === 'INCOMING') {
      this.createLabel = 'Log New Document';
    } else {
      this.createLabel =
        this.initialDirectionVal === 'OUTGOING' ? 'Log Outgoing Document' : 'Log New Document';
    }
  }

  handleOpenCreate(): void {
    const dir: DocumentDirection =
      this.effectiveDirection() === 'OUTGOING' ? 'OUTGOING' : 'INCOMING';
    this.onOpenCreateDoc(dir);
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
    return (
      doc.currentStatus !== 'COMPLETED' &&
      doc.currentStatus !== 'RETURNED' &&
      !this.hasPendingDecision(doc)
    );
  }

  hasPendingDecision(doc: DocumentRecord): boolean {
    const routes = doc.routes || [];
    const assignment = [...routes]
      .reverse()
      .find(
        (route) =>
          !/^(APPROVED|DISAPPROVED)$/i.test(route.actionRequested) &&
          (route.toUserId === this.currentUser.id ||
            (!route.toUserId &&
              route.toUser?.trim().toLowerCase() ===
                this.currentUser.fullName.trim().toLowerCase())),
      );
    if (!assignment) return false;

    const assignedAt = new Date(assignment.createdAt).getTime();
    const userAlreadyActed = routes.some(
      (route) =>
        (route.fromUserId === this.currentUser.id ||
          (!route.fromUserId &&
            route.fromUser?.trim().toLowerCase() ===
              this.currentUser.fullName.trim().toLowerCase())) &&
        new Date(route.createdAt).getTime() >= assignedAt &&
        route.id !== assignment.id,
    );
    return !userAlreadyActed;
  }

  routeButtonTitle(doc: DocumentRecord): string {
    if (this.hasPendingDecision(doc)) {
      return 'Approve or disapprove this document before routing it.';
    }
    return `Route ${doc.routeNo}`;
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
    const q = query ? query.trim() : '';
    if (!q || !source) return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(source));

    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(source));

    const escapedTokens = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');

    const escaped = this.escapeHtml(source);
    const highlighted = escaped.replace(
      regex,
      '<mark class="search-highlight match is-highlighted">$1</mark>',
    );

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
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
