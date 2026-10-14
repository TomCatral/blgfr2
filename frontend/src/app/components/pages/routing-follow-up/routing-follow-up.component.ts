import { Component, Input, DoCheck, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgClass } from '@angular/common';
import { ClsPipe } from '../../../shared/cls.pipe';
import {
  AuditLog,
  DEFAULT_ROLE_PERMISSIONS,
  DocumentRecord,
  DocumentRouteStep,
  User,
} from '../../../types';
import { formatDate } from '../../../utils/status-utils';
import { getPendingRecipients } from '../../../utils/routing-recipients';
import { IonicModule } from '@ionic/angular';

interface RoutingFollowUpItem {
  document: DocumentRecord;
  route: DocumentRouteStep;
  status: string;
  statusSince: string;
  awaitingAction: boolean;
}

const DIVISION_NAMES: Record<string, string> = {
  ITMS: 'ITMS',
  ORD: 'Office of the Regional Director',
  AD: 'Administrative Division',
  LAOD: 'Local Assessment Operations Division',
  LTOD: 'Local Treasury Operations Division',
  FD: 'Financial Division',
  LU: 'Legal Division / Unit',
};

@Component({
  selector: 'app-routing-follow-up',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonicModule, NgClass, ClsPipe],
  styleUrl: './routing-follow-up.component.scss',
  templateUrl: './routing-follow-up.component.html',
})
export class RoutingFollowUpComponent implements DoCheck {
  @Input({ required: true }) documents: DocumentRecord[] = [];
  @Input({ required: true }) auditLogs: AuditLog[] = [];
  @Input({ required: true }) users: User[] = [];
  @Input({ required: true }) currentUser!: User;
  @Input({ required: true }) onSelectDoc: (document: DocumentRecord) => void = () => {};
  @Input({ required: true }) onSendReminder: (document: DocumentRecord, route: DocumentRouteStep) => Promise<void> = async () => {};

  currentPage = signal(1);
  searchQuery = signal('');

  recordsPerPage = 5;

  formatDate = formatDate;

  ngDoCheck(): void {
    if (this.currentPage() > this.pageCount) {
      this.currentPage.set(this.pageCount);
    }
  }

  get permissions() {
    return (
      this.currentUser.permissions ||
      DEFAULT_ROLE_PERMISSIONS[this.currentUser.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF
    );
  }

  get canSendReminder(): boolean {
    return (
      this.currentUser.role === 'SYSTEM_ADMIN' ||
      (this.permissions.allowedActions || []).includes('ROUTING_REMINDER_SEND')
    );
  }

  get userNameById(): Map<string, string> {
    return new Map(this.users.map((user) => [user.id, user.fullName]));
  }

  get pendingRoutes(): Array<{ document: DocumentRecord; route: DocumentRouteStep }> {
    return this.documents.flatMap((document) =>
      document.currentStatus === 'COMPLETED'
        ? []
        : getPendingRecipients(document).map((route) => ({ document, route })),
    ).sort(
      (first, second) =>
        new Date(first.route.createdAt).getTime() -
        new Date(second.route.createdAt).getTime(),
    );
  }

  get routingProgress(): RoutingFollowUpItem[] {
    return this.pendingRoutes.map((item) => ({
      ...item,
      status: 'WAITING FOR ACTION',
      statusSince: item.route.createdAt,
      awaitingAction: true,
    })).sort(
      (first, second) => this.statusSinceMs(first.statusSince) - this.statusSinceMs(second.statusSince),
    );
  }

  private statusSinceMs(iso: string): number {
    const time = new Date(iso).getTime();
    return Number.isNaN(time) ? Date.now() : time;
  }

  get filteredRoutingProgress(): RoutingFollowUpItem[] {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.routingProgress;
    return this.routingProgress.filter(({ document, route, status }) => {
      const handler =
        this.userNameById.get(route.toUserId || '') || route.toUser || '';
      return [
        document.routeNo,
        document.trackingNumber,
        document.title,
        document.subject,
        document.currentDivision,
        handler,
        status,
        route.actionRequested,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query),
      );
    });
  }

  get pageCount(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredRoutingProgress.length / this.recordsPerPage),
    );
  }

  get paginatedRoutingProgress(): RoutingFollowUpItem[] {
    return this.filteredRoutingProgress.slice(
      (this.currentPage() - 1) * this.recordsPerPage,
      this.currentPage() * this.recordsPerPage,
    );
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onClearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  previousPage(): void {
    if (this.currentPage() > 1) this.currentPage.update((page) => page - 1);
  }

  nextPage(): void {
    this.currentPage.update((page) => Math.min(this.pageCount, page + 1));
  }

  statusBadgeClass(item: RoutingFollowUpItem): string {
    return (
      'routing-followup-statusBadge' +
      (item.awaitingAction
        ? ' routing-followup-waiting'
        : item.status === 'RETURNED'
          ? ' routing-followup-returned'
          : ' routing-followup-active')
    );
  }

  elapsedText(statusSince: string): string {
    const elapsed = Math.max(0, Date.now() - new Date(statusSince).getTime());
    const days = Math.floor(elapsed / 86_400_000);
    const hours = Math.max(1, Math.floor(elapsed / 3_600_000));
    return days > 0
      ? `${days} day${days === 1 ? '' : 's'} in status`
      : `${hours} hour${hours === 1 ? '' : 's'} in status`;
  }

  elapsedUrgencyClass(statusSince: string): string {
    const elapsed = Math.max(0, Date.now() - new Date(statusSince).getTime());
    const days = Math.floor(elapsed / 86_400_000);
    if (days >= 7) return 'urgency-critical';
    if (days >= 3) return 'urgency-warning';
    return 'urgency-calm';
  }

  divisionName(code?: string): string {
    return (code && DIVISION_NAMES[code]) || code || 'N/A';
  }

  priorityLabel(priority?: string): string {
    if (!priority) return 'Not set';
    return priority
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  recordHandler(route: DocumentRouteStep, document?: DocumentRecord): string {
    const userId = route.toUserId || document?.assignedUserId;
    return (
      this.userNameById.get(userId || '') ||
      route.toUser ||
      document?.assignedUser ||
      'Unassigned handler'
    );
  }

  recordHandlerDivision(route: DocumentRouteStep, document?: DocumentRecord): string {
    const userId = route.toUserId || document?.assignedUserId;
    const user = this.users.find((u) => u.id === userId);
    const div = route.toDivision || user?.divisionCode || document?.currentDivision;
    return this.divisionName(div);
  }

  reminderHistory(document: DocumentRecord, handler: string): AuditLog[] {
    return this.auditLogs
      .filter(
        (log) =>
          (log.documentTrackingNumber === document.trackingNumber ||
            log.documentTrackingNumber === document.routeNo) &&
          log.details.startsWith('Routing reminder sent to ') &&
          log.details
            .slice('Routing reminder sent to '.length)
            .split(' | Message:')[0]
            .split(' (')[0]
            .trim()
            .toLowerCase() === handler.trim().toLowerCase(),
      )
      .sort(
        (first, second) =>
          new Date(first.timestamp).getTime() -
          new Date(second.timestamp).getTime(),
      );
  }

  reminderMessage(reminder: AuditLog): string {
    return (
      reminder.details.split(' | Message:')[1]?.trim() ||
      'Please take action on this routed document.'
    );
  }
}
