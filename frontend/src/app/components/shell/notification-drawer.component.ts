import { Component, EventEmitter, HostListener, Input, Output, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NotificationItem } from '../../types';
import { formatDate } from '../../utils/status-utils';

@Component({
  selector: 'app-notification-drawer',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [],
  styleUrl: './notification-drawer.component.scss',
  templateUrl: './notification-drawer.component.html',
})
export class NotificationDrawerComponent {
  formatDate = formatDate;
  @Input() isOpen = false;
  @Input() notifications: NotificationItem[] = [];
  @Input() decisionSubmittingId: string | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onMarkRead = new EventEmitter<string>();
  @Output() onSelectDoc = new EventEmitter<string>();
  @Output() onDecision = new EventEmitter<{
    notification: NotificationItem;
    decision: 'APPROVED' | 'DISAPPROVED';
  }>();

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.isOpen) this.onClose.emit();
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.onClose.emit();
  }

  view(trackingNumber: string): void {
    this.onSelectDoc.emit(trackingNumber);
    this.onClose.emit();
  }

  dismissAll(): void {
    this.notifications.forEach((notification) =>
      this.onMarkRead.emit(notification.id),
    );
  }
}
