import { Component, EventEmitter, Input, Output, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgClass } from '@angular/common';
import { DEFAULT_ROLE_PERMISSIONS, RolePermission, User } from '../../types';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  section: 'Main Menu' | 'Reports' | 'Management' | 'Logs';
  actionPermission?: string;
  adminOnly?: boolean;
  showsPendingCount?: boolean;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', section: 'Main Menu' },
  { id: 'incoming', label: 'Incoming Documents', icon: 'arrow-down-left', section: 'Main Menu', showsPendingCount: true },
  { id: 'outgoing', label: 'Outgoing Documents', icon: 'arrow-up-right', section: 'Main Menu' },
  { id: 'routing-followup', label: 'Routing Follow-up', icon: 'notifications', section: 'Main Menu', actionPermission: 'ROUTING_MONITOR_VIEW' },
  { id: 'slip', label: 'Document Routing Slip', icon: 'print', section: 'Main Menu' },
  { id: 'envelope', label: 'Outgoing Envelope', icon: 'mail', section: 'Main Menu' },
  { id: 'employees', label: 'Office Directory', icon: 'person-circle', section: 'Main Menu' },
  { id: 'qr', label: 'QR Code Generator', icon: 'qr-code', section: 'Main Menu' },
  { id: 'incoming-report', label: 'Incoming Report', icon: 'arrow-down-left', section: 'Reports' },
  { id: 'outgoing-report', label: 'Outgoing Report', icon: 'arrow-up-right', section: 'Reports' },
  { id: 'envelope-report', label: 'Envelope Report', icon: 'file-tray', section: 'Reports' },
  { id: 'users', label: 'User Accounts', icon: 'people', section: 'Management', adminOnly: true },
  { id: 'audit', label: 'Audit Logs', icon: 'clipboard', section: 'Logs' },
  { id: 'envelope-logs', label: 'Envelope Dispatch Logs', icon: 'mail', section: 'Logs' },
];

const SECTIONS = ['Main Menu', 'Reports', 'Management', 'Logs'] as const;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgClass],
  styleUrl: './sidebar.component.scss',
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  @Input() activeView = '';
  @Input() currentUser: User = {} as User;
  @Input() pendingCount = 0;
  @Input() collapsed = false;
  @Input() isMobileOpen = false;
  @Output() navigate = new EventEmitter<string>();
  @Output() onToggleCollapse = new EventEmitter<void>();
  @Output() onCloseMobile = new EventEmitter<void>();

  displayedView = '';
  innerWidth = window.innerWidth;

  readonly listener = (): void => {
    this.innerWidth = window.innerWidth;
  };

  constructor() {
    this.displayedView = this.activeView;
  }

  ngOnChanges(): void {
    this.displayedView = this.activeView;
  }

  ngOnInit(): void {
    window.addEventListener('resize', this.listener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.listener);
  }

  private permissions(): RolePermission {
    return (
      this.currentUser.permissions ||
      DEFAULT_ROLE_PERMISSIONS[this.currentUser.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF
    );
  }

  private canViewItem(item: NavigationItem): boolean {
    const permissions = this.permissions();
    const allowedViews = permissions.allowedViews || [];
    if (item.adminOnly && this.currentUser.role !== 'SYSTEM_ADMIN') return false;
    if ((item.section === 'Management' || item.section === 'Logs') && !permissions.management) return false;
    if (item.section !== 'Management' && item.section !== 'Logs' && !permissions.mainMenu) return false;
    if (item.actionPermission) {
      return (
        this.currentUser.role === 'SYSTEM_ADMIN' ||
        (permissions.allowedActions || []).includes(item.actionPermission)
      );
    }
    if (allowedViews.includes(item.id)) return true;
    if (item.id === 'incoming-report')
      return allowedViews.includes('reports') || allowedViews.includes('incoming');
    if (item.id === 'outgoing-report')
      return allowedViews.includes('reports') || allowedViews.includes('outgoing');
    if (item.id === 'envelope-report')
      return allowedViews.includes('reports') || allowedViews.includes('envelope-logs');
    return false;
  }

  visibleSections(): string[] {
    const sections: string[] = [];
    for (const section of SECTIONS) {
      if (this.itemsFor(section).length > 0) sections.push(section);
    }
    return sections;
  }

  itemsFor(section: string): NavigationItem[] {
    return NAVIGATION_ITEMS.filter(
      (item) => item.section === section && this.canViewItem(item),
    );
  }

  handleNavigate(view: string): void {
    if (view === this.displayedView) {
      this.onCloseMobile.emit();
      return;
    }
    this.displayedView = view;
    // Emit while this component is still mounted. On mobile, closing the drawer
    // destroys this instance immediately; a deferred emit is therefore cancelled
    // before the parent can switch views.
    this.navigate.emit(view);
    this.onCloseMobile.emit();
  }
}
