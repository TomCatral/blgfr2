import { Component, Input, signal, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { cx } from '../../../shared/class-utils';
import {
  User,
  Role,
  DivisionCode,
  RolePermission,
  DEFAULT_ROLE_PERMISSIONS,
  Division,
} from '../../../types';
import { AppModalLayerComponent } from '../../ui/modal-layer.component';
import { showConfirm } from '../../../services/dialog.service';
import { UiService } from '../../../services/ui.service';
import { ApiService } from '../../../services/api.service';
import { IonicModule } from '@ionic/angular';

interface RoleOption {
  role: Role;
  label: string;
  badgeColor: string;
  description: string;
}

interface MenuItem {
  id: string;
  label: string;
  section: string;
  icon: string;
  badge?: string;
}

const ALL_ROLES: RoleOption[] = [
  {
    role: 'ORD',
    label: 'Office of the Regional Director',
    badgeColor:
      'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description:
      'Primary regional office authority. Oversees all documents, complete routing history, and office operations.',
  },
  {
    role: 'SYSTEM_ADMIN',
    label: 'System Administrator',
    badgeColor:
      'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    description:
      'Full administrative authority over system settings, user roles, database, and all document operations.',
  },
  {
    role: 'ADMIN',
    label: 'Administrative Division',
    badgeColor:
      'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    description:
      'Administrative Division transaction access. Sees only assigned and division-related records.',
  },
  {
    role: 'RECORDS_OFFICER',
    label: 'Records Officer',
    badgeColor:
      'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description:
      'Central receiving & dispatch officer. Manages incoming/outgoing documents, envelope logs, and routing slips.',
  },
  {
    role: 'DIVISION_CHIEF',
    label: 'Division Chief',
    badgeColor:
      'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    description:
      'Head of operating division. Reviews and routes documents, assigns tasks to action officers.',
  },
  {
    role: 'ACTION_OFFICER',
    label: 'Action Officer',
    badgeColor:
      'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    description:
      'Processes assigned communications, drafts responses, and completes assigned workflow steps.',
  },
  {
    role: 'STAFF',
    label: 'Administrative Staff',
    badgeColor:
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    description:
      'General staff access to view division communications, print routing slips, and check document status.',
  },
];

const MENU_ITEMS_LIST: MenuItem[] = [
  { id: 'dashboard', label: 'Operations Dashboard', section: 'Main Menu', icon: 'grid' },
  { id: 'division-workload', label: 'Division Workload Distribution', section: 'Main Menu', icon: 'business' },
  { id: 'incoming', label: 'Incoming Documents', section: 'Main Menu', icon: 'arrow-down-left', badge: '3' },
  { id: 'outgoing', label: 'Outgoing Documents', section: 'Main Menu', icon: 'arrow-up-right' },
  { id: 'incoming-report', label: 'Incoming Documents Report', section: 'Reports', icon: 'arrow-down-left' },
  { id: 'outgoing-report', label: 'Outgoing Documents Report', section: 'Reports', icon: 'arrow-up-right' },
  { id: 'envelope-report', label: 'Envelope Dispatch Report', section: 'Reports', icon: 'mail' },
  { id: 'slip', label: 'Document Routing Slip', section: 'Main Menu', icon: 'print' },
  { id: 'envelope', label: 'Outgoing Envelope Format DL / #10', section: 'Main Menu', icon: 'mail' },
  { id: 'employees', label: 'Office Directory', section: 'Main Menu', icon: 'person-circle' },
  { id: 'qr', label: 'QR Code Generator', section: 'Main Menu', icon: 'qr-code' },
  { id: 'users', label: 'User Accounts & Roles', section: 'Management', icon: 'people' },
  { id: 'settings', label: 'Account & Settings', section: 'Management', icon: 'settings' },
  { id: 'audit', label: 'System Audit Logs & Security Trail', section: 'Logs', icon: 'clipboard' },
  { id: 'envelope-logs', label: 'Outgoing Envelope Logs', section: 'Logs', icon: 'mail' },
];

const ACTION_PERMISSIONS: { id: string; label: string }[] = [
  { id: 'NOTIFICATION_VIEW_ALL', label: 'View All Document Transaction Notifications' },
  { id: 'ROUTING_MONITOR_VIEW', label: 'View Routing Follow-up Module' },
  { id: 'ROUTING_REMINDER_SEND', label: 'Send Action Reminders to Document Handlers' },
  { id: 'WORKFLOW_OPTION_MANAGE', label: 'Add, Edit, Delete and Color Workflow Options' },
  { id: 'EMPLOYEE_CREATE', label: 'Add Office Directory Personnel / Staff' },
  { id: 'EMPLOYEE_EDIT', label: 'Edit Office Directory Personnel / Staff' },
  { id: 'EMPLOYEE_DELETE', label: 'Delete Office Directory Personnel / Staff' },
  { id: 'EMPLOYEE_FOLDER_MANAGE', label: 'Manage Employee Folders and Attachments' },
];

const DIVISION_CODES: DivisionCode[] = [
  'ITMS',
  'ORD',
  'AD',
  'LAOD',
  'LTOD',
  'FD',
  'LU',
];

function loadRolePermissions(): Record<Role, RolePermission> {
  try {
    const stored = localStorage.getItem('blgf_role_permissions');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_ROLE_PERMISSIONS;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonicModule, FormsModule, NgClass, AppModalLayerComponent],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent {
  @Input({ required: true }) users: User[] = [];
  @Input({ required: true }) divisions: Division[] = [];
  @Input({ required: true }) currentUser!: User;
  @Input({ required: true }) onCreateUser: (data: Partial<User>) => Promise<User> = async () => ({}) as User;
  @Input({ required: true }) onUpdateUser: (id: string, data: Partial<User> & { currentPassword?: string }) => Promise<User> = async () => ({}) as User;
  @Input({ required: true }) onDeleteUser: (id: string) => Promise<{ success: boolean }> = async () => ({ success: true });
  @Input({ required: true }) onCreateDivision: (data: Omit<Division, 'id'>) => Promise<Division> = async () => ({}) as Division;
  @Input({ required: true }) onUpdateDivision: (id: string, data: Partial<Division>) => Promise<Division> = async () => ({}) as Division;
  @Input({ required: true }) onDeleteDivision: (id: string) => Promise<{ success: boolean }> = async () => ({ success: true });

  cx = cx;
  allRoles = ALL_ROLES;
  DIVISION_CODES = DIVISION_CODES;
  ACTION_PERMISSIONS = ACTION_PERMISSIONS;

  private ui = inject(UiService);
  private api = inject(ApiService);

  activeTab = signal<'users' | 'roles' | 'divisions'>('users');
  showCreatePassword = signal(false);
  showEditPassword = signal(false);
  rolePermissions = signal<Record<Role, RolePermission>>(loadRolePermissions());
  showCreateModal = signal(false);
  editingUser = signal<User | null>(null);
  targetUserForAvatar = signal<User | null>(null);
  isUploadingAvatar = signal(false);
  searchTerm = signal('');
  roleFilter = signal<string>('ALL');
  divisionFilter = signal<string>('ALL');
  statusFilter = signal<string>('ALL');
  viewMode = signal<'table' | 'cards'>('table');
  matrixViewMode = signal<'matrix' | 'by-role'>('matrix');
  selectedRoleForView = signal<Role>('ORD');

  // User Account Permissions State
  permTargetMode = signal<'roles' | 'user'>('roles');
  selectedPermUser = signal<User | null>(null);
  userPermSearch = signal<string>('');
  userPermRoleFilter = signal<string>('ALL');
  userPermForm = signal<RolePermission>(structuredClone(DEFAULT_ROLE_PERMISSIONS.STAFF));
  isUserPermDirty = signal<boolean>(false);

  fullName = signal('');
  username = signal('');
  password = signal('');
  email = signal('');
  avatarUrl = signal('');
  role = signal<Role>('STAFF');
  divisionCode = signal<DivisionCode>('AD');
  designation = signal('');
  contactNo = signal('');
  divisionName = signal('');
  divisionHead = signal('');
  editingDivisionId = signal<string | null>(null);
  formPermissions = signal<RolePermission>(DEFAULT_ROLE_PERMISSIONS['STAFF']);

  noop = () => {};

  get visibleUsers(): User[] {
    return this.currentUser.role === 'SYSTEM_ADMIN'
      ? this.users
      : this.users.filter((user) => user.role !== 'SYSTEM_ADMIN');
  }

  get permFilteredUsers(): User[] {
    const q = this.userPermSearch().toLowerCase().trim();
    const roleF = this.userPermRoleFilter();
    return this.visibleUsers.filter((u) => {
      const matchSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.designation && u.designation.toLowerCase().includes(q));
      const matchRole = roleF === 'ALL' || u.role === roleF;
      return matchSearch && matchRole;
    });
  }

  get activeUsersCount(): number {
    return this.visibleUsers.filter((u) => u.active).length;
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm().trim().length > 0 ||
      this.roleFilter() !== 'ALL' ||
      this.divisionFilter() !== 'ALL' ||
      this.statusFilter() !== 'ALL'
    );
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.roleFilter.set('ALL');
    this.divisionFilter.set('ALL');
    this.statusFilter.set('ALL');
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  divisionNameFor(code: string): string {
    const div = this.divisions.find((d) => d.code === code);
    if (div) return div.name;
    const names: Record<string, string> = {
      ITMS: 'Information Technology Management System',
      ORD: 'Office of the Regional Director',
      AD: 'Administrative Division',
      LAOD: 'Local Assessment Operations Division',
      LTOD: 'Local Treasury Operations Division',
      FD: 'Financial Division',
      LU: 'Legal Division / Unit',
    };
    return names[code] || code;
  }

  roleBadgeClass(roleName: string): string {
    switch (roleName) {
      case 'SYSTEM_ADMIN':
        return 'ua-role-admin';
      case 'ORD':
        return 'ua-role-ord';
      case 'ADMIN':
        return 'ua-role-ad';
      case 'RECORDS_OFFICER':
        return 'ua-role-records';
      case 'DIVISION_CHIEF':
        return 'ua-role-chief';
      case 'ACTION_OFFICER':
        return 'ua-role-action';
      case 'STAFF':
      default:
        return 'ua-role-staff';
    }
  }

  roleAccentClass(roleName: string): string {
    switch (roleName) {
      case 'SYSTEM_ADMIN':
        return 'accent-admin';
      case 'ORD':
        return 'accent-ord';
      case 'ADMIN':
        return 'accent-ad';
      case 'RECORDS_OFFICER':
        return 'accent-records';
      case 'DIVISION_CHIEF':
        return 'accent-chief';
      case 'ACTION_OFFICER':
        return 'accent-action';
      default:
        return 'accent-staff';
    }
  }

  roleAvatarClass(roleName: string): string {
    switch (roleName) {
      case 'SYSTEM_ADMIN':
        return 'avatar-admin';
      case 'ORD':
        return 'avatar-ord';
      case 'ADMIN':
        return 'avatar-ad';
      case 'RECORDS_OFFICER':
        return 'avatar-records';
      case 'DIVISION_CHIEF':
        return 'avatar-chief';
      case 'ACTION_OFFICER':
        return 'avatar-action';
      default:
        return 'avatar-staff';
    }
  }

  get filteredUsers(): User[] {
    const normalizedSearchTerm = this.searchTerm().trim().toLowerCase();
    return this.visibleUsers.filter((user) => {
      if (this.roleFilter() !== 'ALL' && user.role !== this.roleFilter()) return false;
      if (this.divisionFilter() !== 'ALL' && user.divisionCode !== this.divisionFilter()) return false;
      if (this.statusFilter() === 'ACTIVE' && !user.active) return false;
      if (this.statusFilter() === 'INACTIVE' && user.active) return false;
      if (!normalizedSearchTerm) return true;
      return [
        user.fullName,
        user.id,
        user.username,
        user.email,
        user.divisionCode,
        user.designation,
        user.role,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(normalizedSearchTerm),
      );
    });
  }

  get mainMenuItems(): MenuItem[] {
    return MENU_ITEMS_LIST.filter((i) => i.section === 'Main Menu');
  }

  get reportMenuItems(): MenuItem[] {
    return MENU_ITEMS_LIST.filter((i) => i.section === 'Reports');
  }

  get managementMenuItems(): MenuItem[] {
    return MENU_ITEMS_LIST.filter((i) => i.section === 'Management');
  }

  get logsMenuItems(): MenuItem[] {
    return MENU_ITEMS_LIST.filter((i) => i.section === 'Logs');
  }

  get roleDescription(): string | undefined {
    return ALL_ROLES.find((item) => item.role === this.role())?.description;
  }

  userCount(roleName: Role): number {
    return this.users.filter((u) => u.role === roleName).length;
  }

  tabButtonClass(tab: 'users' | 'roles' | 'divisions'): string {
    const active = this.activeTab() === tab;
    return cx(
      'px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer',
      active
        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-2xs'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
    );
  }

  userPerms(user: User): RolePermission {
    return (
      user.permissions ||
      this.rolePermissions()[user.role] ||
      DEFAULT_ROLE_PERMISSIONS[user.role]
    );
  }

  userDivisionFor(user: User): Division | undefined {
    return this.divisions.find((division) => division.code === user.divisionCode);
  }

  mainMenuBadgeClass(perms: RolePermission): string {
    return cx(
      'px-2 py-0.5 rounded text-[10px] font-bold border flex items-center space-x-1',
      perms.mainMenu
        ? 'bg-slate-50 dark:bg-blue-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    );
  }

  managementBadgeClass(perms: RolePermission): string {
    return cx(
      'px-2 py-0.5 rounded text-[10px] font-bold border flex items-center space-x-1',
      perms.management
        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    );
  }

  statusToggleClass(user: User): string {
    return cx(
      'px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-opacity hover:opacity-80',
      user.active
        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
    );
  }

  openCreateModal(): void {
    this.resetForm();
    this.showCreateModal.set(true);
  }

  toggleActiveUser(user: User): void {
    void this.onUpdateUser(user.id, { active: !user.active });
  }

  generateTemporaryPassword(): void {
    const alphabet =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    const randomValues = crypto.getRandomValues(new Uint32Array(12));
    const temporaryPassword = Array.from(
      randomValues,
      (value) => alphabet[value % alphabet.length],
    ).join('');
    this.password.set(temporaryPassword);
    this.showEditPassword.set(true);
    this.showCreatePassword.set(true);
  }

  openUserPermissionsFromModal(user: User): void {
    this.editingUser.set(null);
    this.openUserPermissions(user);
  }

  setFormMainMenu(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.formPermissions.update((prev) => ({ ...prev, mainMenu: checked }));
  }

  setFormManagement(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.formPermissions.update((prev) => {
      const views = prev.allowedViews || [];
      const updatedViews = checked
        ? Array.from(new Set([...views, 'users']))
        : views.filter((v) => v !== 'users');
      return { ...prev, management: checked, allowedViews: updatedViews };
    });
  }

  onRoleChange(value: string): void {
    const nextRole = value as Role;
    this.role.set(nextRole);
    if (nextRole === 'ORD') this.divisionCode.set('ORD');
    if (nextRole === 'SYSTEM_ADMIN') this.divisionCode.set('ITMS');
    if (nextRole === 'ADMIN') this.divisionCode.set('AD');
    this.formPermissions.set(
      this.rolePermissions()[nextRole] || DEFAULT_ROLE_PERMISSIONS[nextRole],
    );
  }

  onDivisionCodeChange(value: string): void {
    this.divisionCode.set(value as DivisionCode);
  }

  handleCreateSubmit(): void {
    if (!this.fullName() || !this.username() || !this.password()) {
      this.ui.showError('Please fill out full name, username, and password');
      return;
    }
    if (
      this.role() === 'SYSTEM_ADMIN' &&
      this.users.filter((user) => user.role === 'SYSTEM_ADMIN').length >= 3
    ) {
      this.ui.showError('Only three System Administrator accounts are allowed.');
      return;
    }

    const name = this.fullName();

    void this.onCreateUser({
      fullName: this.fullName(),
      username: this.username(),
      password: this.password(),
      email: this.email().trim() || 'N/A',
      role: this.role(),
      divisionCode: this.divisionCode(),
      designation: this.designation() || 'Staff Officer',
      contactNo: this.contactNo() || '0917-000-0000',
      avatarUrl: this.avatarUrl(),
      active: true,
      permissions: this.formPermissions(),
    });

    this.showCreateModal.set(false);
    this.resetForm();
    this.ui.showSuccess(`Personnel account "${name}" created successfully!`);
  }

  resetForm(): void {
    this.fullName.set('');
    this.username.set('');
    this.password.set('');
    this.email.set('');
    this.avatarUrl.set('');
    this.designation.set('');
    this.contactNo.set('');
    this.role.set('STAFF');
    this.divisionCode.set('AD');
    this.showCreatePassword.set(false);
    this.showEditPassword.set(false);
    this.formPermissions.set(
      this.rolePermissions()['STAFF'] || DEFAULT_ROLE_PERMISSIONS['STAFF'],
    );
  }

  handleOpenEdit(user: User): void {
    this.editingUser.set(user);
    this.fullName.set(user.fullName);
    this.username.set(user.username);
    this.password.set('');
    this.email.set(user.email);
    this.avatarUrl.set(user.avatarUrl || '');
    this.role.set(user.role);
    this.divisionCode.set(user.divisionCode);
    this.designation.set(user.designation);
    this.contactNo.set(user.contactNo || '');
    this.showEditPassword.set(false);
    this.formPermissions.set(
      user.permissions ||
        this.rolePermissions()[user.role] ||
        DEFAULT_ROLE_PERMISSIONS[user.role],
    );
  }

  async handleEditSubmit(): Promise<void> {
    const user = this.editingUser();
    if (!user) return;
    if (
      this.role() === 'SYSTEM_ADMIN' &&
      user.role !== 'SYSTEM_ADMIN' &&
      this.users.filter((u) => u.role === 'SYSTEM_ADMIN').length >= 3
    ) {
      this.ui.showError('Only three System Administrator accounts are allowed.');
      return;
    }

    const name = this.fullName();
    const passwordTrimmed = this.password().trim();
    const newAvatar = this.avatarUrl();

    await this.onUpdateUser(user.id, {
      fullName: this.fullName(),
      username: this.username(),
      ...(passwordTrimmed ? { password: passwordTrimmed } : {}),
      email: this.email().trim() || 'N/A',
      role: this.role(),
      divisionCode: this.divisionCode(),
      designation: this.designation(),
      contactNo: this.contactNo(),
      avatarUrl: newAvatar,
      permissions: this.formPermissions(),
    });

    user.avatarUrl = newAvatar;
    this.editingUser.set(null);
    this.resetForm();
    this.ui.showSuccess(`User account "${name}" updated successfully!`);
  }

  triggerQuickAvatar(user: User, event: Event, fileInput: HTMLInputElement): void {
    event.stopPropagation();
    event.preventDefault();
    this.targetUserForAvatar.set(user);
    fileInput.value = '';
    fileInput.click();
  }

  async onQuickAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const targetUser = this.targetUserForAvatar();
    if (!file || !targetUser) return;

    if (file.size > 5 * 1024 * 1024) {
      this.ui.showError('Profile picture must be 5 MB or smaller.');
      input.value = '';
      return;
    }

    try {
      this.isUploadingAvatar.set(true);
      const stored = await firstValueFrom(this.api.uploadToStorage('profilePictures', file));
      await this.onUpdateUser(targetUser.id, { avatarUrl: stored.url });
      targetUser.avatarUrl = stored.url;
      this.ui.showSuccess(`Profile picture updated for ${targetUser.fullName}!`);
    } catch (err: unknown) {
      this.ui.showError(String((err as Error)?.message || 'Failed to upload profile picture.'));
    } finally {
      this.isUploadingAvatar.set(false);
      this.targetUserForAvatar.set(null);
      input.value = '';
    }
  }

  triggerFormAvatar(fileInput: HTMLInputElement): void {
    fileInput.value = '';
    fileInput.click();
  }

  async onFormAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.ui.showError('Profile picture must be 5 MB or smaller.');
      input.value = '';
      return;
    }

    try {
      this.isUploadingAvatar.set(true);
      const stored = await firstValueFrom(this.api.uploadToStorage('profilePictures', file));
      this.avatarUrl.set(stored.url);
      this.ui.showSuccess('Photo uploaded successfully.');
    } catch (err: unknown) {
      this.ui.showError(String((err as Error)?.message || 'Failed to upload photo.'));
    } finally {
      this.isUploadingAvatar.set(false);
      input.value = '';
    }
  }

  removeFormAvatar(): void {
    this.avatarUrl.set('');
  }

  async handleDelete(user: User): Promise<void> {
    if (user.role === 'SYSTEM_ADMIN') {
      this.ui.showError('System Administrator accounts cannot be deleted.');
      return;
    }
    if (user.id === this.currentUser.id) {
      this.ui.showError('You cannot delete your own active administrator account.');
      return;
    }
    if (
      await showConfirm(
        `Are you sure you want to permanently delete user account "${user.fullName}" (@${user.username})?`,
      )
    ) {
      try {
        if (this.onDeleteUser) {
          await this.onDeleteUser(user.id);
        } else {
          await this.onUpdateUser(user.id, { active: false });
        }
        this.ui.showSuccess(`User account ${user.fullName} deleted.`);
      } catch (error) {
        this.ui.showError(
          `Failed to delete user account: ${
            error instanceof Error ? error.message : 'Unknown server error'
          }`,
        );
      }
    }
  }

  activePerm(roleName: Role): RolePermission {
    return this.rolePermissions()[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName];
  }

  permittedAction(roleName: Role, actionId: string): boolean {
    return (
      this.rolePermissions()[roleName] ||
      DEFAULT_ROLE_PERMISSIONS[roleName]
    ).allowedActions?.includes(actionId) || false;
  }

  isMainViewAllowed(roleName: Role, viewId: string): boolean {
    const current = this.activePerm(roleName);
    return current.mainMenu && (current.allowedViews || []).includes(viewId);
  }

  isMgmtViewAllowed(roleName: Role, viewId: string): boolean {
    const current = this.activePerm(roleName);
    return (current.allowedViews || []).includes(viewId);
  }

  isReportViewAllowed(roleName: Role, viewId: string): boolean {
    const current = this.activePerm(roleName);
    return (current.allowedViews || []).includes(viewId);
  }

  viewToggleTitle(allowed: boolean, label: string, roleName: Role): string {
    return `${allowed ? 'Disable' : 'Enable'} ${label} for ${roleName}`;
  }

  routesToggleClass(on: boolean): string {
    return cx(
      'w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all cursor-pointer',
      on
        ? 'bg-blue-600 text-white shadow-2xs'
        : 'bg-slate-200 dark:bg-slate-700 text-transparent',
    );
  }

  deleteToggleClass(on: boolean): string {
    return cx(
      'w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all cursor-pointer',
      on
        ? 'bg-rose-600 text-white shadow-2xs'
        : 'bg-slate-200 dark:bg-slate-700 text-transparent hover:border-slate-400',
    );
  }

  sectionToggleClass(on: boolean): string {
    return cx(
      'w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all cursor-pointer',
      on
        ? 'bg-emerald-600 text-white shadow-2xs'
        : 'bg-slate-200 dark:bg-slate-700 text-transparent hover:border-slate-400',
    );
  }

  actionToggleClass(on: boolean): string {
    return cx(
      'w-6 h-6 rounded-md mx-auto flex items-center justify-center',
      on
        ? 'bg-emerald-600 text-white'
        : 'bg-slate-200 dark:bg-slate-700 text-transparent',
    );
  }

  viewToggleClass(disabled: boolean, on: boolean): string {
    if (disabled) {
      return cx(
        'w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all bg-slate-100 dark:bg-slate-800/40 opacity-40 cursor-not-allowed border border-slate-200 dark:border-slate-700',
      );
    }
    if (on) {
      return cx(
        'w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all bg-emerald-600 text-white shadow-2xs cursor-pointer hover:bg-emerald-500',
      );
    }
    return cx(
      'w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500 cursor-pointer',
    );
  }

  toggleCanViewAllRoutes(roleName: Role): void {
    this.rolePermissions.update((prev) => {
      const current = prev[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName];
      return {
        ...prev,
        [roleName]: { ...current, canViewAllRoutes: !current.canViewAllRoutes },
      };
    });
  }

  toggleCanDelete(roleName: Role): void {
    this.rolePermissions.update((prev) => {
      const current = prev[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName];
      return {
        ...prev,
        [roleName]: { ...current, canDelete: !current.canDelete },
      };
    });
  }

  toggleSectionPermission(roleName: Role, section: 'mainMenu' | 'management'): void {
    this.rolePermissions.update((prev) => {
      const current = prev[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName];
      const turningOn = !current[section];
      let updated: RolePermission;
      if (section === 'mainMenu') {
        updated = { ...current, mainMenu: turningOn };
      } else {
        const views = current.allowedViews || [];
        const updatedViews = turningOn
          ? Array.from(new Set([...views, 'users']))
          : views.filter((v) => v !== 'users');
        updated = { ...current, management: turningOn, allowedViews: updatedViews };
      }
      return { ...prev, [roleName]: updated };
    });
  }

  toggleViewPermission(roleName: Role, viewId: string): void {
    this.rolePermissions.update((prev) => {
      const current = prev[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName];
      const currentAllowed = current.allowedViews || [];
      const hasView = currentAllowed.includes(viewId);
      const newAllowed = hasView
        ? currentAllowed.filter((id) => id !== viewId)
        : [...currentAllowed, viewId];
      const isMgmt = ['users', 'settings'].includes(viewId) || MENU_ITEMS_LIST.some((m) => m.id === viewId && (m.section === 'Management' || m.section === 'Logs'));
      return {
        ...prev,
        [roleName]: {
          ...current,
          allowedViews: newAllowed,
          management: (!hasView && isMgmt) ? true : current.management,
        },
      };
    });
  }

  toggleActionPermission(roleName: Role, actionId: string): void {
    this.rolePermissions.update((prev) => {
      const current = prev[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName];
      const actions = current.allowedActions || [];
      const updated = {
        ...prev,
        [roleName]: {
          ...current,
          allowedActions: actions.includes(actionId)
            ? actions.filter((item) => item !== actionId)
            : [...actions, actionId],
        },
      };
      return updated;
    });
  }

  async handleApplyRolePermissionsToUsers(roleName: Role, showMessage = true): Promise<void> {
    const targetPerms = {
      ...(this.rolePermissions()[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName]),
      notificationViewAllConfigured: true,
    };
    const roleUsers = this.users.filter((u) => u.role === roleName);

    if (roleUsers.length === 0) {
      if (showMessage) {
        this.ui.showSuccess(
          `No active personnel found with the role "${roleName}". Custom permissions saved for future accounts.`,
        );
      }
      return;
    }

    await Promise.all(
      roleUsers.map((u) => this.onUpdateUser(u.id, { permissions: targetPerms })),
    );

    if (showMessage) {
      this.ui.showSuccess(
        `Successfully updated and applied menu access permissions to ${roleUsers.length} personnel with role "${roleName}"!`,
      );
    }
  }

  async resetRolePermissions(): Promise<void> {
    if (
      await showConfirm(
        'Reset all user role menu access permissions back to System Defaults?',
      )
    ) {
      this.rolePermissions.set(DEFAULT_ROLE_PERMISSIONS);
      this.ui.showSuccess('Role menu permissions reset to defaults.');
    }
  }

  async saveAllRolePermissions(): Promise<void> {
    localStorage.setItem(
      'blgf_role_permissions',
      JSON.stringify(this.rolePermissions()),
    );
    await Promise.all(
      ALL_ROLES.map((r) => this.handleApplyRolePermissionsToUsers(r.role, false)),
    );
    this.ui.showSuccess(
      'All user role permissions saved and applied across all personnel accounts!',
    );
  }

  async saveAllFromHiddenFooter(): Promise<void> {
    await Promise.all(
      ALL_ROLES.map((r) => this.handleApplyRolePermissionsToUsers(r.role, false)),
    );
    this.ui.showSuccess(
      'Save complete! All user role permissions updated across personnel accounts.',
    );
  }

  // =========================================================================
  // User Account Permissions Handlers
  // =========================================================================
  hasCustomPermissions(user: User): boolean {
    if (!user.permissions) return false;
    const defaultPerm = this.rolePermissions()[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role];
    return JSON.stringify(user.permissions) !== JSON.stringify(defaultPerm);
  }

  openUserPermissions(user: User): void {
    this.activeTab.set('roles');
    this.permTargetMode.set('user');
    this.selectUserForPerm(user);
  }

  switchToUserPermMode(filterRole?: Role): void {
    this.permTargetMode.set('user');
    if (filterRole) {
      this.userPermRoleFilter.set(filterRole);
    }
    const current = this.selectedPermUser();
    if (!current || (filterRole && current.role !== filterRole)) {
      const candidates = this.permFilteredUsers;
      if (candidates.length > 0) {
        this.selectUserForPerm(candidates[0]);
      }
    }
  }

  selectUserForPerm(user: User): void {
    this.selectedPermUser.set(user);
    const activePerm = user.permissions
      ? structuredClone(user.permissions)
      : structuredClone(
          this.rolePermissions()[user.role] ||
            DEFAULT_ROLE_PERMISSIONS[user.role] ||
            DEFAULT_ROLE_PERMISSIONS.STAFF,
        );
    this.userPermForm.set(activePerm);
    this.isUserPermDirty.set(false);
  }

  toggleUserCanViewAllRoutes(): void {
    this.userPermForm.update((p) => ({ ...p, canViewAllRoutes: !p.canViewAllRoutes }));
    this.isUserPermDirty.set(true);
  }

  toggleUserCanViewAllDocuments(): void {
    this.userPermForm.update((p) => ({ ...p, canViewAllDocuments: !p.canViewAllDocuments }));
    this.isUserPermDirty.set(true);
  }

  toggleUserCanDelete(): void {
    this.userPermForm.update((p) => ({ ...p, canDelete: !p.canDelete }));
    this.isUserPermDirty.set(true);
  }

  toggleUserSectionPermission(section: 'mainMenu' | 'management'): void {
    this.userPermForm.update((p) => {
      const turningOn = !p[section];
      let updated: RolePermission;
      if (section === 'mainMenu') {
        updated = { ...p, mainMenu: turningOn };
      } else {
        const views = p.allowedViews || [];
        const updatedViews = turningOn
          ? Array.from(new Set([...views, 'users']))
          : views.filter((v) => v !== 'users');
        updated = { ...p, management: turningOn, allowedViews: updatedViews };
      }
      return updated;
    });
    this.isUserPermDirty.set(true);
  }

  toggleUserActionPermission(actionId: string): void {
    this.userPermForm.update((p) => {
      const actions = p.allowedActions || [];
      const updated = actions.includes(actionId)
        ? actions.filter((id) => id !== actionId)
        : [...actions, actionId];
      return { ...p, allowedActions: updated };
    });
    this.isUserPermDirty.set(true);
  }

  toggleUserViewPermission(viewId: string): void {
    this.userPermForm.update((p) => {
      const views = p.allowedViews || [];
      const hasView = views.includes(viewId);
      const updated = hasView
        ? views.filter((id) => id !== viewId)
        : [...views, viewId];
      const isMgmt = ['users', 'settings'].includes(viewId) || MENU_ITEMS_LIST.some((m) => m.id === viewId && (m.section === 'Management' || m.section === 'Logs'));
      return {
        ...p,
        allowedViews: updated,
        management: (!hasView && isMgmt) ? true : p.management,
      };
    });
    this.isUserPermDirty.set(true);
  }

  isUserViewAllowed(viewId: string): boolean {
    return (this.userPermForm().allowedViews || []).includes(viewId);
  }

  isUserActionAllowed(actionId: string): boolean {
    return (this.userPermForm().allowedActions || []).includes(actionId);
  }

  grantAllUserPermissions(): void {
    const allViews = MENU_ITEMS_LIST.map((m) => m.id);
    const allActions = ACTION_PERMISSIONS.map((a) => a.id);
    this.userPermForm.set({
      canViewAllRoutes: true,
      canViewAllDocuments: true,
      canDelete: true,
      mainMenu: true,
      management: true,
      allowedViews: allViews,
      allowedActions: allActions,
      notificationViewAllConfigured: true,
    });
    this.isUserPermDirty.set(true);
  }

  revokeAllUserPermissions(): void {
    this.userPermForm.set({
      canViewAllRoutes: false,
      canViewAllDocuments: false,
      canDelete: false,
      mainMenu: false,
      management: false,
      allowedViews: ['dashboard'],
      allowedActions: [],
      notificationViewAllConfigured: true,
    });
    this.isUserPermDirty.set(true);
  }

  async resetSelectedUserToRoleDefaults(): Promise<void> {
    const user = this.selectedPermUser();
    if (!user) return;
    const defaultPerm = structuredClone(
      this.rolePermissions()[user.role] ||
        DEFAULT_ROLE_PERMISSIONS[user.role] ||
        DEFAULT_ROLE_PERMISSIONS.STAFF,
    );
    this.userPermForm.set(defaultPerm);
    await this.onUpdateUser(user.id, { permissions: defaultPerm });
    user.permissions = defaultPerm;
    this.isUserPermDirty.set(false);
    this.ui.showSuccess(
      `Permissions reset to standard ${user.role.replaceAll('_', ' ')} defaults for ${user.fullName}.`,
    );
  }

  async saveSelectedUserPermissions(): Promise<void> {
    const user = this.selectedPermUser();
    if (!user) return;
    const perms = structuredClone(this.userPermForm());
    await this.onUpdateUser(user.id, { permissions: perms });
    user.permissions = perms;
    this.isUserPermDirty.set(false);
    this.ui.showSuccess(`Custom permissions saved and active for ${user.fullName}!`);
  }

  resetDivisionForm(): void {
    this.divisionCode.set('AD');
    this.divisionName.set('');
    this.divisionHead.set('');
    this.editingDivisionId.set(null);
  }

  editDivision(division: Division): void {
    this.editingDivisionId.set(division.id);
    this.divisionCode.set(division.code);
    this.divisionName.set(division.name);
    this.divisionHead.set(division.chiefName);
  }

  async deleteDivision(division: Division): Promise<void> {
    if (await showConfirm(`Delete ${division.name}?`)) {
      await this.onDeleteDivision(division.id);
    }
  }

  async handleDivisionSubmit(): Promise<void> {
    const payload = {
      code: this.divisionCode(),
      name: this.divisionName().trim(),
      chiefName: this.divisionHead().trim(),
    };
    if (this.editingDivisionId()) {
      await this.onUpdateDivision(this.editingDivisionId()!, payload);
    } else {
      await this.onCreateDivision({ ...payload, email: '' });
    }
    this.resetDivisionForm();
  }
}
