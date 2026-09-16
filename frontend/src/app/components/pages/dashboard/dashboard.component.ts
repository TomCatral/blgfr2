import { Component, Input, signal, computed, OnChanges, SimpleChanges, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { cx } from '../../../shared/class-utils';
import {
  DashboardStats,
  DocumentRecord,
  DocumentRouteStep,
  AuditLog,
  User,
  DEFAULT_ROLE_PERMISSIONS
} from '../../../types';
import { STATUS_CONFIGS, formatDate } from '../../../utils/status-utils';

interface GroupedRouteTransaction extends DocumentRouteStep {
  toDivisions: string[];
  toUsers: string[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnChanges {
  @Input({ required: true }) stats!: DashboardStats;
  @Input({ required: true }) documents: DocumentRecord[] = [];
  @Input({ required: true }) currentUser!: User;
  @Input({ required: true }) users: User[] = [];
  @Input({ required: true }) isOnline = false;
  @Input({ required: true }) auditLogs: AuditLog[] = [];
  @Input({ required: true }) onSelectDoc: (doc: DocumentRecord) => void = () => {};
  @Input({ required: true }) onOpenCreateDoc: () => void = () => {};
  @Input({ required: true }) onNavigateToView: (view: string) => void = () => {};
  @Input({ required: true }) onReapproveDocument: (doc: DocumentRecord) => void = () => {};
  @Input({ required: true }) onSendRoutingReminder: (document: DocumentRecord, route: DocumentRouteStep) => Promise<void> = async () => {};

  selectedCard = signal<'incoming' | 'outgoing' | 'inProgress' | 'pending' | 'completed' | 'returned' | null>(null);
  isUserStatusOpen = signal(false);
  transactionPage = signal(1);
  recentDocFilter = signal<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  searchQuery = signal<string>('');
  private readonly inputRevision = signal(0);

  cx = cx;

  ngOnChanges(changes: SimpleChanges): void {
    this.inputRevision.update(revision => revision + 1);
    if (changes['currentUser']) this.transactionPage.set(1);
    queueMicrotask(() => this.adjustPageOnCountChange());
  }

  get perms() {
    return this.currentUser.permissions || DEFAULT_ROLE_PERMISSIONS[this.currentUser.role] || DEFAULT_ROLE_PERMISSIONS.STAFF;
  }

  get canAccessDocumentSlip() {
    return (this.perms.allowedViews || []).includes('slip');
  }

  get canViewDivisionWorkload() {
    return (this.perms.allowedViews || []).includes('division-workload');
  }

  canViewRoutingMonitor() {
    return this.currentUser.role === 'SYSTEM_ADMIN' || (this.perms.allowedActions || []).includes('ROUTING_MONITOR_VIEW');
  }

  canSendRoutingReminderAction() {
    return this.currentUser.role === 'SYSTEM_ADMIN' || (this.perms.allowedActions || []).includes('ROUTING_REMINDER_SEND');
  }

  get normalizedUserName() {
    return this.currentUser.fullName.trim().toLowerCase();
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  get formattedToday(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  totalDivisionWorkload = computed(() => {
    this.inputRevision();
    return (this.stats?.divisionBreakdown || []).reduce((acc, curr) => acc + curr.count, 0);
  });

  topDivision = computed(() => {
    this.inputRevision();
    if (!this.stats?.divisionBreakdown?.length) return null;
    return [...this.stats.divisionBreakdown].sort((a, b) => b.count - a.count)[0];
  });

  getDivisionPercentage(count: number): number {
    const total = this.totalDivisionWorkload();
    if (!total || total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  barPercentage(count: number): number {
    if (!this.stats?.divisionBreakdown?.length || count === 0) return 0;
    const max = Math.max(...this.stats.divisionBreakdown.map(d => d.count), 1);
    return Math.max(8, Math.round((count / max) * 100));
  }

  readonly divisionNames: Record<string, string> = {
    ORD: 'Office of the Regional Director',
    AD: 'Administrative Division',
    FD: 'Financial Division',
    LU: 'Legal Division / Unit',
    LAOD: 'Local Assessment Operations Division',
    LTOD: 'Local Treasury Operations Division',
    ITMS: 'Information Technology Management System',
    MRD: 'Municipal Operations Review Division',
    LD: 'Legal Division',
    FMD: 'Financial Management Division',
    PFMD: 'Provincial Financial Management Division',
    CD: 'Clearance & Certification Division',
  };

  getDivisionFullName(code: string): string {
    return this.divisionNames[code] || `${code} Functional Division`;
  }

  resolveUserName(userId?: string, legacyName?: string) {
    return this.users.find(u => u.id === userId)?.fullName || legacyName || '';
  }

  urgentDocs = computed(() => {
    this.inputRevision();
    return this.documents.filter(d => (d.priority === 'URGENT' || d.priority === 'VERY_URGENT') && d.currentStatus !== 'COMPLETED');
  });

  myDisapprovedTransactions = computed(() => {
    this.inputRevision();
    return this.documents.filter(doc => this.getLatestDocumentDecision(doc)?.status === 'DISAPPROVED');
  });

  canReapproveDocument(doc: DocumentRecord): boolean {
    return this.getLatestDocumentDecision(doc, this.currentUser.id)?.status === 'DISAPPROVED';
  }

  private getLatestDocumentDecision(
    document: DocumentRecord,
    actorId?: string,
  ): { status: 'APPROVED' | 'DISAPPROVED' | undefined } | undefined {
    const actorName = actorId === this.currentUser.id ? this.normalizedUserName : '';
    const routeDecisions = (document.routes || [])
      .map(route => ({
        status: this.getRouteDecision(route),
        actorId: route.fromUserId,
        actorName: this.resolveUserName(route.fromUserId, route.fromUser).trim().toLowerCase(),
        timestamp: route.createdAt
      }))
      .filter(decision => Boolean(decision.status) && (!actorId || decision.actorId === actorId || decision.actorName === actorName));
    const auditDecisions = this.auditLogs
      .filter(log =>
        (log.documentTrackingNumber === document.trackingNumber || log.documentTrackingNumber === document.routeNo) &&
        /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details) &&
        (!actorId || log.userId === actorId || log.userName.trim().toLowerCase() === actorName)
      )
      .map(log => ({
        status: log.details.match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1]?.toUpperCase() as 'APPROVED' | 'DISAPPROVED',
        actorId: log.userId,
        actorName: log.userName.trim().toLowerCase(),
        timestamp: log.timestamp
      }));
    return [...routeDecisions, ...auditDecisions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }

  visibleStats = computed(() => {
    this.inputRevision();
    return {
      totalIncoming: this.documents.filter(d => d.direction === 'INCOMING').length,
      totalOutgoing: this.documents.filter(d => d.direction === 'OUTGOING').length,
      inProgressCount: this.documents.filter(d => d.currentStatus === 'IN_PROGRESS').length,
      pendingCount: this.documents.filter(d => d.currentStatus === 'PENDING').length,
      completedCount: this.documents.filter(d => d.currentStatus === 'COMPLETED').length,
      returnedCount: this.myDisapprovedTransactions().length
    };
  });

  recentTransactions = computed(() => {
    this.inputRevision();
    if (this.currentUser.role === 'SYSTEM_ADMIN') return this.documents;
    return this.documents.filter(doc => {
      const isDocumentOwnerOrHandler =
        doc.createdByUserId === this.currentUser.id ||
        doc.assignedUserId === this.currentUser.id ||
        doc.createdBy?.trim().toLowerCase() === this.normalizedUserName ||
        doc.assignedUser?.trim().toLowerCase() === this.normalizedUserName;
      const isRoutingParticipant = (doc.routes || []).some(route =>
        route.fromUserId === this.currentUser.id ||
        route.toUserId === this.currentUser.id ||
        route.fromUser?.trim().toLowerCase() === this.normalizedUserName ||
        route.toUser?.trim().toLowerCase() === this.normalizedUserName
      );
      return isDocumentOwnerOrHandler || isRoutingParticipant;
    });
  });

  readonly transactionsPerPage = 6;

  incomingRecentCount = computed(() => this.recentTransactions().filter(d => d.direction === 'INCOMING').length);
  outgoingRecentCount = computed(() => this.recentTransactions().filter(d => d.direction === 'OUTGOING').length);

  filteredTransactions = computed(() => {
    const list = this.recentTransactions();
    const filter = this.recentDocFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return list.filter(doc => {
      if (filter === 'INCOMING' && doc.direction !== 'INCOMING') return false;
      if (filter === 'OUTGOING' && doc.direction !== 'OUTGOING') return false;
      if (query) {
        const routeMatch = (doc.routeNo || '').toLowerCase().includes(query) || (doc.trackingNumber || '').toLowerCase().includes(query);
        const titleMatch = (doc.title || '').toLowerCase().includes(query);
        const subjectMatch = (doc.subject || '').toLowerCase().includes(query);
        const senderMatch = (doc.senderName || '').toLowerCase().includes(query) || (doc.originatingOffice || '').toLowerCase().includes(query);
        const divisionMatch = (doc.currentDivision || '').toLowerCase().includes(query);
        const statusMatch = (doc.currentStatus || '').toLowerCase().includes(query);
        if (!routeMatch && !titleMatch && !subjectMatch && !senderMatch && !divisionMatch && !statusMatch) {
          return false;
        }
      }
      return true;
    });
  });

  transactionPageCount = computed(() => Math.max(1, Math.ceil(this.filteredTransactions().length / this.transactionsPerPage)));

  paginatedTransactions = computed(() => {
    const all = this.filteredTransactions();
    const page = this.transactionPage();
    return all.slice((page - 1) * this.transactionsPerPage, page * this.transactionsPerPage);
  });

  setRecentFilter(filter: 'ALL' | 'INCOMING' | 'OUTGOING'): void {
    this.recentDocFilter.set(filter);
    this.transactionPage.set(1);
  }

  onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);
    this.transactionPage.set(1);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.transactionPage.set(1);
  }

  private adjustPageOnCountChange(): void {
    const count = this.transactionPageCount();
    const page = this.transactionPage();
    if (page > count) this.transactionPage.set(count);
  }

  prevPage(): void {
    this.transactionPage.set(Math.max(1, this.transactionPage() - 1));
  }

  nextPage(): void {
    this.transactionPage.set(Math.min(this.transactionPageCount(), this.transactionPage() + 1));
  }

  cardDocuments = computed(() => {
    this.inputRevision();
    const card = this.selectedCard();
    if (!card) return [];
    if (card === 'returned') return this.myDisapprovedTransactions();
    return this.documents.filter(doc => {
      if (card === 'incoming') return doc.direction === 'INCOMING';
      if (card === 'outgoing') return doc.direction === 'OUTGOING';
      if (card === 'inProgress') return doc.currentStatus === 'IN_PROGRESS';
      if (card === 'pending') return doc.currentStatus === 'PENDING';
      if (card === 'completed') return doc.currentStatus === 'COMPLETED';
      return false;
    });
  });

  cardTitle = computed(() => {
    const titles: Record<string, string> = {
      incoming: 'Incoming Documents',
      outgoing: 'Outgoing Documents',
      inProgress: 'In Progress Documents',
      pending: 'Pending Action Documents',
      completed: 'Completed Documents',
      returned: 'Disapproved Documents'
    };
    return titles[this.selectedCard() || 'pending'];
  });

  getRouteDecision(route: DocumentRouteStep): 'APPROVED' | 'DISAPPROVED' | undefined {
    const text = `${route.actionRequested || ''} ${route.remarks || ''}`.toUpperCase();
    if (text.includes('DISAPPROVED')) return 'DISAPPROVED';
    if (text.includes('APPROVED')) return 'APPROVED';
    return undefined;
  }

  groupRouteTransactions(document: DocumentRecord): GroupedRouteTransaction[] {
    return [...(document.routes || [])]
      .sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) || a.stepNumber - b.stepNumber)
      .reduce<GroupedRouteTransaction[]>((transactions, route) => {
        const existing = transactions.find(t =>
          t.createdAt === route.createdAt && t.fromUserId === route.fromUserId && t.routeNo === route.routeNo && t.actionRequested === route.actionRequested
        );
        if (existing) {
          if (!existing.toDivisions.includes(route.toDivision)) existing.toDivisions.push(route.toDivision);
          if (route.toUser && !existing.toUsers.includes(route.toUser)) {
            existing.toUsers.push(route.toUser);
            existing.toUser = existing.toUsers.join(', ');
          }
          return transactions;
        }
        transactions.push({ ...route, toDivisions: route.toDivision ? [route.toDivision] : [], toUsers: route.toUser ? [route.toUser] : [] });
        return transactions;
      }, []);
  }

  statusCfg(status: string) {
    return (STATUS_CONFIGS as any)[status];
  }

  formatDate(dateString: string): string {
    return formatDate(dateString);
  }

  latestAction(doc: DocumentRecord): string {
    return [...(doc.routes || [])].sort((a, b) => b.stepNumber - a.stepNumber)[0]?.actionRequested || doc.actionRequested || 'N/A';
  }

  barHeight(count: number): number {
    if (!this.stats.divisionBreakdown.length) return 8;
    const max = Math.max(...this.stats.divisionBreakdown.map(d => d.count), 1);
    return Math.max(8, Math.round((count / max) * 160));
  }

  getUserInitials(fullName: string): string {
    return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(name => name[0]).join('').toUpperCase();
  }

  isCurrentUserOnline(userId: string): boolean {
    return userId === this.currentUser.id && this.isOnline;
  }

  onBackdropMouseDown(event: MouseEvent, type: 'userStatus' | 'selectedCard'): void {
    if (event.target === event.currentTarget) {
      if (type === 'userStatus') this.isUserStatusOpen.set(false);
      else this.selectedCard.set(null);
    }
  }

  selectDocFromCard(document: DocumentRecord): void {
    this.selectedCard.set(null);
    this.onSelectDoc(document);
  }

  reapproveFromCard(document: DocumentRecord): void {
    this.selectedCard.set(null);
    this.onReapproveDocument(document);
  }
}
