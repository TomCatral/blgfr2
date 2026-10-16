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
import { isDocumentParticipant } from '../../../utils/document-visibility';
import { IonicModule } from '@ionic/angular';
import { AppModalLayerComponent } from '../../ui/modal-layer.component';

interface GroupedRouteTransaction extends DocumentRouteStep {
  toDivisions: string[];
  toUsers: string[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonicModule, CommonModule, FormsModule, AppModalLayerComponent],
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
  @Input({ required: true }) onSelectDoc: (doc: DocumentRecord) => void = () => { };
  @Input({ required: true }) onOpenCreateDoc: () => void = () => { };
  @Input({ required: true }) onNavigateToView: (view: string) => void = () => { };
  @Input({ required: true }) onReapproveDocument: (doc: DocumentRecord) => void = () => { };
  @Input({ required: true }) onSendRoutingReminder: (document: DocumentRecord, route: DocumentRouteStep) => Promise<void> = async () => { };
  @Input() onOpenMobileQr: () => void = () => { };

  selectedCard = signal<'incoming' | 'outgoing' | 'inProgress' | 'pending' | 'completed' | 'returned' | null>(null);
  isUserStatusOpen = signal(false);
  transactionPage = signal(1);
  recentDocFilter = signal<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  searchQuery = signal<string>('');
  private readonly inputRevision = signal(0);

  closeCardModal = (): void => {
    this.selectedCard.set(null);
  };

  selectCard(card: 'incoming' | 'outgoing' | 'inProgress' | 'pending' | 'completed' | 'returned'): void {
    this.selectedCard.set(card);
  };

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
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        hourCycle: 'h23'
      }).format(new Date())
    );

    if (hour >= 18) return 'Good Evening';
    if (hour >= 12) return 'Good Afternoon';
    return 'Good Morning';
  }

  get formattedToday(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  readonly primaryDivisions = ['ORD', 'LAOD', 'ITMS', 'LTOD', 'FD', 'LU', 'AD'];

  divisionBreakdown = computed(() => {
    this.inputRevision();
    // Calculate involved functional divisions from active documents
    const activeDocs = this.documents.filter(d => d.currentStatus !== 'COMPLETED');
    if (activeDocs.length > 0) {
      const divMap: Record<string, number> = {};
      this.primaryDivisions.forEach(code => { divMap[code] = 0; });
      activeDocs.forEach(doc => {
        const involved = new Set<string>();
        if (doc.currentDivision) involved.add(doc.currentDivision);
        const creator = this.users.find(u => u.id === doc.createdByUserId);
        if (creator?.divisionCode) involved.add(creator.divisionCode);
        (doc.routes || []).forEach(r => {
          if (r.toDivision) involved.add(r.toDivision);
          if (r.fromDivision) involved.add(r.fromDivision);
        });
        involved.forEach(code => {
          if (divMap[code] !== undefined) divMap[code]++;
        });
      });
      return this.primaryDivisions.map(code => ({ division: code, count: divMap[code] || 0 }));
    }
    if (this.stats?.divisionBreakdown?.length) {
      return this.stats.divisionBreakdown;
    }
    return this.primaryDivisions.map(code => ({ division: code, count: 0 }));
  });

  totalDivisionWorkload = computed(() => {
    return this.divisionBreakdown().reduce((acc, curr) => acc + curr.count, 0);
  });

  totalActiveDocuments = computed(() => {
    this.inputRevision();
    const active = this.documents.filter(d => d.currentStatus !== 'COMPLETED').length;
    return active > 0 ? active : (this.totalDivisionWorkload() > 0 ? 1 : 0);
  });

  topDivision = computed(() => {
    const list = this.divisionBreakdown();
    if (!list.length) return null;
    return [...list].sort((a, b) => b.count - a.count)[0];
  });

  getDivisionPercentage(count: number): number {
    const total = this.totalActiveDocuments();
    if (!total || total === 0) return 0;
    return Math.min(100, Math.round((count / total) * 100));
  }

  barPercentage(count: number): number {
    const list = this.divisionBreakdown();
    if (!list.length || count === 0) return 0;
    const max = Math.max(...list.map(d => d.count), 1);
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
    if (this.currentUser.role === 'SYSTEM_ADMIN') return false;
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
      pendingCount: this.documents.filter(d => d.currentStatus === 'PENDING' || d.currentStatus === 'NOT_YET_ROUTED').length,
      completedCount: this.documents.filter(d => d.currentStatus === 'COMPLETED').length,
      returnedCount: this.myDisapprovedTransactions().length
    };
  });

  recentTransactions = computed(() => {
    this.inputRevision();
    return this.documents
      .filter(doc =>
        this.currentUser.role === 'SYSTEM_ADMIN' ||
        this.currentUser.role === 'ORD' ||
        this.currentUser.permissions?.canViewAllDocuments ||
        isDocumentParticipant(doc, this.currentUser, this.auditLogs)
      )
      .sort((a, b) => this.documentActivityTime(b) - this.documentActivityTime(a));
  });

  private documentActivityTime(document: DocumentRecord): number {
    const routeTime = (document.routes || []).reduce(
      (latest, route) => Math.max(latest, new Date(route.processedAt || route.createdAt).getTime() || 0),
      0,
    );
    return Math.max(
      routeTime,
      new Date(document.updatedAt || document.createdAt || document.dateReceived).getTime() || 0,
    );
  }

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

    const candidates = this.documents.filter(doc => {
      if (card === 'incoming') return doc.direction === 'INCOMING';
      if (card === 'outgoing') return doc.direction === 'OUTGOING';
      if (card === 'inProgress') return doc.currentStatus === 'IN_PROGRESS';
      if (card === 'pending') return doc.currentStatus === 'PENDING' || doc.currentStatus === 'NOT_YET_ROUTED';
      if (card === 'completed') return doc.currentStatus === 'COMPLETED';
      return false;
    });

    if (
      this.currentUser.role === 'SYSTEM_ADMIN' ||
      this.currentUser.role === 'ORD' ||
      this.currentUser.permissions?.canViewAllDocuments
    ) {
      return candidates;
    }

    // Personnel cards only contain transactions the account created, received,
    // or routed.
    return candidates.filter(doc => {
      if (card === 'pending') {
        const isCreator =
          doc.createdByUserId === this.currentUser.id ||
          doc.createdBy?.trim().toLowerCase() === this.normalizedUserName;
        const isAssigned =
          doc.assignedUserId === this.currentUser.id ||
          doc.assignedUser?.trim().toLowerCase() === this.normalizedUserName;
        const latestRoute = (doc.routes || [])[(doc.routes || []).length - 1];
        const isLatestRecipient = Boolean(
          latestRoute &&
          (latestRoute.toUserId === this.currentUser.id ||
            latestRoute.toUser?.trim().toLowerCase() === this.normalizedUserName)
        );
        return (doc.currentStatus === 'NOT_YET_ROUTED' && isCreator) || isAssigned || isLatestRecipient;
      }

      return isDocumentParticipant(doc, this.currentUser, this.auditLogs);
    });
  });

  getCardVisibleRoutes(document: DocumentRecord): GroupedRouteTransaction[] {
    const grouped = this.groupRouteTransactions(document);
    if (
      grouped.length <= 1 ||
      this.currentUser.role === 'SYSTEM_ADMIN' ||
      this.currentUser.role === 'ORD' ||
      this.currentUser.permissions?.canViewAllRoutes
    ) {
      return grouped;
    }

    const isUserParticipant = (r: GroupedRouteTransaction) =>
      r.fromUserId === this.currentUser.id ||
      r.toUserId === this.currentUser.id ||
      r.fromUser?.trim().toLowerCase() === this.normalizedUserName ||
      r.toUser?.trim().toLowerCase() === this.normalizedUserName ||
      (r.toUsers || []).some(u => u.trim().toLowerCase() === this.normalizedUserName);

    // Only the steps this account routed or received. There is no "All
    // Personnel" view - other personnel's routing stays hidden.
    return grouped.filter(isUserParticipant);
  }

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
    const list = this.divisionBreakdown();
    if (!list.length) return 8;
    const max = Math.max(...list.map(d => d.count), 1);
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
