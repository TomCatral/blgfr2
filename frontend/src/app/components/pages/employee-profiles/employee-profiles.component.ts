import {
  Component,
  Input,
  OnInit,
  computed,
  inject,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { cx } from '../../../shared/class-utils';
import { ApiService } from '../../../services/api.service';
import { UiService } from '../../../services/ui.service';
import { showConfirm, showPrompt } from '../../../services/dialog.service';
import { AppModalLayerComponent } from '../../ui/modal-layer.component';
import {
  EmployeeProfile,
  DivisionCode,
  User,
  DEFAULT_ROLE_PERMISSIONS,
  EmployeeFolderRecord,
} from '../../../types';

type EmployeeFolder = EmployeeFolderRecord;

export interface DirectorySection {
  id: string;
  label: string;
  officeTypes: string[];
  color?: string;
}

export interface SectionColorOption {
  id: string;
  label: string;
  colorHex: string;
  bgHex: string;
  borderHex: string;
}

export const SECTION_COLOR_PALETTES: SectionColorOption[] = [
  { id: 'blue', label: 'Blue', colorHex: '#2563eb', bgHex: '#eff6ff', borderHex: '#bfdbfe' },
  { id: 'indigo', label: 'Indigo', colorHex: '#4f46e5', bgHex: '#eef2ff', borderHex: '#c7d2fe' },
  { id: 'emerald', label: 'Emerald', colorHex: '#059669', bgHex: '#ecfdf5', borderHex: '#a7f3d0' },
  { id: 'purple', label: 'Purple', colorHex: '#9333ea', bgHex: '#faf5ff', borderHex: '#e9d5ff' },
  { id: 'amber', label: 'Amber', colorHex: '#d97706', bgHex: '#fffbeb', borderHex: '#fde68a' },
  { id: 'rose', label: 'Rose', colorHex: '#e11d48', bgHex: '#fff1f2', borderHex: '#fecdd3' },
  { id: 'cyan', label: 'Cyan', colorHex: '#0891b2', bgHex: '#ecfeff', borderHex: '#a5f3fc' },
];

const DEFAULT_DIRECTORY_SECTIONS: DirectorySection[] = [
  { id: 'BLGF', label: 'BLGF Personnel', officeTypes: ['BLGF'], color: 'blue' },
  {
    id: 'LGU_STAFF',
    label: 'LGU Staff',
    officeTypes: ['PROVINCIAL_TREASURER', 'MUNICIPAL_TREASURER', 'LGU'],
    color: 'emerald',
  },
  {
    id: 'OTHER_AGENCIES',
    label: 'Other Agencies',
    officeTypes: ['OTHER_AGENCIES'],
    color: 'amber',
  },
];

const loadDirectorySections = (): DirectorySection[] => {
  try {
    const raw = localStorage.getItem('blgf_directory_sections');
    return (raw && JSON.parse(raw)) || DEFAULT_DIRECTORY_SECTIONS;
  } catch {
    return DEFAULT_DIRECTORY_SECTIONS;
  }
};

const DIVISION_OFFICE_NAMES: Record<DivisionCode, string> = {
  ITMS: 'Information Technology Management System',
  ORD: 'Office of the Regional Director',
  AD: 'Administrative Division',
  LAOD: 'Local Assessment Operations Division',
  LTOD: 'Local Treasury Operations Division',
  FD: 'Financial Division',
  LU: 'Legal Division / Unit',
};

const getOfficeDepartmentName = (employee: EmployeeProfile): string => {
  if (employee.divisionCode) {
    return DIVISION_OFFICE_NAMES[employee.divisionCode];
  }
  const office = employee.office?.trim();
  if (!office) return 'Not specified';
  const normalizedOffice = office.toLowerCase();
  const aliases: Record<string, DivisionCode> = {
    itms: 'ITMS',
    'information technology management system': 'ITMS',
    ord: 'ORD',
    'office of regional director': 'ORD',
    'office of the regional director': 'ORD',
    ad: 'AD',
    administrative: 'AD',
    'administrative division': 'AD',
    laod: 'LAOD',
    'local assessment operations': 'LAOD',
    'local assessment operations division': 'LAOD',
    ltod: 'LTOD',
    'local treasury operations': 'LTOD',
    'local treasury operations division': 'LTOD',
    fd: 'FD',
    financial: 'FD',
    'financial division': 'FD',
    lu: 'LU',
    legal: 'LU',
    'legal division': 'LU',
    'legal division / unit': 'LU',
  };
  const divisionCode = aliases[normalizedOffice];
  return divisionCode ? DIVISION_OFFICE_NAMES[divisionCode] : office;
};

const loadFolders = (): EmployeeFolder[] => {
  try {
    const stored = localStorage.getItem('blgf_employee_folders');
    if (stored) return JSON.parse(stored);
  } catch {
    return [];
  }
  return [];
};

@Component({
  selector: 'app-employee-profiles',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, FormsModule, AppModalLayerComponent],
  templateUrl: './employee-profiles.component.html',
  styleUrl: './employee-profiles.component.scss',
})
export class EmployeeProfilesComponent implements OnInit {
  @Input({ required: true }) currentUser!: User;

  private selectFn: ((employee: EmployeeProfile) => void) | undefined;
  showSelect = false;

  @Input()
  set onSelectEmployee(value: ((employee: EmployeeProfile) => void) | undefined) {
    this.selectFn = value;
    this.showSelect = Boolean(value);
  }
  get onSelectEmployee(): ((employee: EmployeeProfile) => void) | undefined {
    return this.selectFn;
  }

  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);
  private ui = inject(UiService);

  employees = signal<EmployeeProfile[]>([]);
  searchTerm = signal('');
  showForm = signal(false);
  editingEmp = signal<EmployeeProfile | null>(null);
  typeFilter = signal('ALL');
  selectedEmpForFolder = signal<EmployeeProfile | null>(null);
  showFolderModal = signal(false);
  folderName = signal('');
  folderDescription = signal('');
  showOfficeManager = signal(false);
  officeName = signal('');
  selectedColor = signal<string>('blue');
  titleFilter = signal<string>('');
  colorPalettes = SECTION_COLOR_PALETTES;
  editingOfficeId = signal<string | null>(null);
  directorySections = signal<DirectorySection[]>(loadDirectorySections());

  readonly filteredDirectorySections = computed(() => {
    const q = this.titleFilter().toLowerCase().trim();
    if (!q) return this.directorySections();
    return this.directorySections().filter((s) =>
      s.label.toLowerCase().includes(q),
    );
  });
  folders = signal<EmployeeFolder[]>(loadFolders());
  expandedFolder = signal<string | null>(null);
  openFolderId = signal<string | null>(null);
  folderToDelete = signal<EmployeeFolder | null>(null);
  viewingPdf = signal<{ name: string; dataUrl: string } | null>(null);
  activeTab = signal('BLGF');
  formData = signal<Partial<EmployeeProfile>>({
    fullName: '',
    position: '',
    office: '',
    officeType: 'BLGF',
    email: '',
    contactNo: '',
    address: '',
    active: true,
  });

  readonly visibleEmployees = computed(() =>
    this.canViewAllPersonnel()
      ? this.employees()
      : this.employees().filter((employee) => employee.userId === this.currentUser.id),
  );

  readonly tabFilteredEmployees = computed(() => {
    const tab = this.activeTab();
    return this.visibleEmployees().filter((e) => {
      if (tab === 'ALL') return true;
      const section = this.directorySections().find((item) => item.id === tab);
      return section ? section.officeTypes.includes(e.officeType) : false;
    });
  });

  readonly filtered = computed(() =>
    this.tabFilteredEmployees().filter((e) => {
      if (this.typeFilter() !== 'ALL' && e.officeType !== this.typeFilter()) return false;
      const q = this.searchTerm().toLowerCase();
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.office.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
      );
    }),
  );

  readonly tabs = computed(() => {
    const visible = this.visibleEmployees();
    return [
      ...this.directorySections().map((section) => ({
        key: section.id,
        label: section.label,
        count: visible.filter((employee) =>
          section.officeTypes.includes(employee.officeType),
        ).length,
      })),
      { key: 'ALL', label: 'All Combined', count: visible.length },
    ];
  });

  readonly totalCount = computed(() => this.visibleEmployees().length);
  readonly activeCount = computed(() => this.visibleEmployees().filter((e) => e.active).length);
  readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.typeFilter() !== 'ALL',
  );

  ngOnInit(): void {
    void this.loadDirectory();
  }

  private profileFromUser(user: User): EmployeeProfile {
    return {
      id: `emp-${user.id}`,
      userId: user.id,
      fullName: user.fullName,
      position: user.designation || user.role,
      office: 'Bureau of Local Government Finance - Regional Office II',
      officeType: 'BLGF',
      divisionCode: user.divisionCode,
      email: user.email || 'N/A',
      contactNo: user.contactNo || '',
      address: 'Regional Government Center, Carig Sur, Tuguegarao City',
      active: user.active,
      createdAt: user.createdAt,
    };
  }

  private async loadDirectory(): Promise<void> {
    const [loadedEmployees, apiSections] = await Promise.all([
      firstValueFrom(this.api.getEmployees()).catch(() => [] as EmployeeProfile[]),
      firstValueFrom(this.api.getDirectorySections()).catch(() => null),
    ]);
    if (Array.isArray(apiSections) && apiSections.length > 0) {
      this.directorySections.set(apiSections);
      try {
        localStorage.setItem('blgf_directory_sections', JSON.stringify(apiSections));
      } catch {}
    }
    const loadedUsers = this.canViewAllPersonnel()
      ? await firstValueFrom(this.api.getUsers()).catch(() => [] as User[])
      : ([] as User[]);
    const accountUsers = this.canViewAllPersonnel() ? loadedUsers : [this.currentUser];
    const mergedEmployees = [...loadedEmployees];
    for (const user of accountUsers) {
      if (!mergedEmployees.some((employee) => employee.userId === user.id)) {
        mergedEmployees.push(this.profileFromUser(user));
      }
    }
    const linkedEmployees = accountUsers.map(
      (user) =>
        mergedEmployees.find((employee) => employee.userId === user.id) ||
        this.profileFromUser(user),
    );
    const manualEmployees = this.canViewAllPersonnel()
      ? mergedEmployees.filter((employee) => !employee.userId)
      : [];
    const accessibleEmployees = [...linkedEmployees, ...manualEmployees];
    this.employees.set(accessibleEmployees);
    this.folders.update((currentFolders) => {
      const databaseFolders = accessibleEmployees.flatMap(
        (employee) => employee.folders || [],
      );
      const nextFolders =
        databaseFolders.length > 0
          ? [...databaseFolders]
          : [...currentFolders];
      for (const employee of accessibleEmployees) {
        if (
          employee.userId &&
          !nextFolders.some(
            (folder) =>
              folder.userId === employee.userId ||
              folder.employeeId === employee.id ||
              folder.id === `fld-auto-${employee.userId}`,
          )
        ) {
          nextFolders.push({
            id: `fld-auto-${employee.userId}`,
            name: 'Personnel Records',
            description: `Automatically created static personnel records folder for ${employee.fullName}.`,
            employeeId: employee.id,
            userId: employee.userId,
            systemManaged: true,
            fileCount: 0,
            createdAt: new Date().toISOString(),
            files: [],
          });
        }
      }
      if (nextFolders.length !== currentFolders.length) {
        localStorage.setItem('blgf_employee_folders', JSON.stringify(nextFolders));
      }
      if (databaseFolders.length === 0 && nextFolders.length > 0) {
        for (const employee of accessibleEmployees) {
          const employeeFolders = nextFolders.filter(
            (folder) =>
              folder.employeeId === employee.id ||
              Boolean(employee.userId && folder.userId === employee.userId),
          );
          void firstValueFrom(
            this.api.updateEmployee(employee.id, { folders: employeeFolders }),
          ).catch(() => null);
        }
      }
      return nextFolders;
    });
  }

  canViewAllPersonnel(): boolean {
    return this.currentUser.role === 'SYSTEM_ADMIN';
  }

  canManage(action: string): boolean {
    if (this.currentUser.role === 'SYSTEM_ADMIN') return true;
    const perm = this.currentUser.permissions || DEFAULT_ROLE_PERMISSIONS[this.currentUser.role];
    return perm.allowedActions?.includes(action) ?? false;
  }

  canManageEmployeeFolder(employee: EmployeeProfile): boolean {
    return this.canManage('EMPLOYEE_FOLDER_MANAGE') || employee.userId === this.currentUser.id;
  }

  canManageFolder(folder: EmployeeFolder): boolean {
    return this.canManage('EMPLOYEE_FOLDER_MANAGE') || folder.userId === this.currentUser.id;
  }

  persistFolders(nextFolders: EmployeeFolder[]): void {
    const previousFolders = this.folders();
    this.folders.set(nextFolders);
    localStorage.setItem('blgf_employee_folders', JSON.stringify(nextFolders));
    for (const employee of this.employees()) {
      const currentEmployeeFolders = previousFolders.filter(
        (folder) =>
          folder.employeeId === employee.id ||
          Boolean(employee.userId && folder.userId === employee.userId),
      );
      const employeeFolders = nextFolders.filter(
        (folder) =>
          folder.employeeId === employee.id ||
          Boolean(employee.userId && folder.userId === employee.userId),
      );
      if (JSON.stringify(currentEmployeeFolders) !== JSON.stringify(employeeFolders)) {
        void firstValueFrom(
          this.api.updateEmployee(employee.id, { folders: employeeFolders }),
        ).catch(() => null);
      }
    }
    this.employees.update((currentEmployees) =>
      currentEmployees.map((employee) => ({
        ...employee,
        folders: nextFolders.filter(
          (folder) =>
            folder.employeeId === employee.id ||
            Boolean(employee.userId && folder.userId === employee.userId),
        ),
      })),
    );
  }

  isSystemDefault(office: DirectorySection): boolean {
    return ['BLGF', 'LGU_STAFF', 'OTHER_AGENCIES'].includes(office.id);
  }

  sectionEmployeeCount(section: DirectorySection): number {
    return this.visibleEmployees().filter((employee) =>
      section.officeTypes.includes(employee.officeType),
    ).length;
  }

  persistDirectorySections(sections: DirectorySection[]): void {
    this.directorySections.set(sections);
    try {
      localStorage.setItem('blgf_directory_sections', JSON.stringify(sections));
    } catch {}
    this.api.saveDirectorySections(sections).subscribe({
      next: () => {},
      error: (err) => console.warn('Directory sections API sync notice:', err),
    });
  }

  moveSection(index: number, direction: 'up' | 'down'): void {
    const sections = [...this.directorySections()];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const [moved] = sections.splice(index, 1);
    sections.splice(targetIdx, 0, moved);
    this.persistDirectorySections(sections);
    this.ui.showToast(`Category "${moved.label}" moved ${direction}.`);
  }

  saveOffice(): void {
    const name = this.officeName().trim();
    if (!name) {
      this.ui.showError('Please enter a directory title.');
      return;
    }
    if (
      this.directorySections().some(
        (section) =>
          section.label.toLowerCase() === name.toLowerCase() &&
          section.id !== this.editingOfficeId(),
      )
    ) {
      this.ui.showError('A directory title with this name already exists.');
      return;
    }
    const color = this.selectedColor();
    const customId = `CUSTOM_${Date.now()}`;
    const next = this.editingOfficeId()
      ? this.directorySections().map((section) =>
          section.id === this.editingOfficeId()
            ? { ...section, label: name, color }
            : section,
        )
      : [
          ...this.directorySections(),
          {
            id: customId,
            label: name,
            officeTypes: [customId],
            color,
          },
        ];
    this.persistDirectorySections(next);
    const wasEditing = Boolean(this.editingOfficeId());
    this.cancelEditOffice();
    this.ui.showToast(
      wasEditing
        ? `Directory title "${name}" updated successfully.`
        : `Directory title "${name}" added successfully.`,
    );
  }

  openOfficeManager(): void {
    this.titleFilter.set('');
    this.showOfficeManager.set(true);
  }

  closeOfficeManager(): void {
    this.showOfficeManager.set(false);
    this.cancelEditOffice();
  }

  cancelEditOffice(): void {
    this.officeName.set('');
    this.editingOfficeId.set(null);
    this.selectedColor.set('blue');
  }

  editOffice(office: DirectorySection): void {
    this.officeName.set(office.label);
    this.editingOfficeId.set(office.id);
    this.selectedColor.set(office.color || 'blue');
  }

  async deleteOffice(office: DirectorySection): Promise<void> {
    if (this.isSystemDefault(office)) {
      this.ui.showError(
        'System default directory titles (BLGF, LGU Staff, Other Agencies) are required by the system and cannot be deleted.',
      );
      return;
    }
    const count = this.sectionEmployeeCount(office);
    const msg =
      count > 0
        ? `Delete directory title "${office.label}"? There are ${count} personnel currently assigned to it (they will remain accessible under "All Combined").`
        : `Delete directory title "${office.label}"?`;
    if (!(await showConfirm(msg))) {
      return;
    }
    const next = this.directorySections().filter((item) => item.id !== office.id);
    this.persistDirectorySections(next);
    if (this.activeTab() === office.id) this.activeTab.set('ALL');
    if (this.editingOfficeId() === office.id) this.cancelEditOffice();
    this.ui.showToast(`Directory title "${office.label}" deleted.`);
  }

  openTab(key: string): void {
    this.activeTab.set(key);
    this.expandedFolder.set(null);
  }

  openAddForm(): void {
    this.editingEmp.set(null);
    this.resetFormData();
    this.showForm.set(true);
  }

  openEdit(emp: EmployeeProfile): void {
    this.formData.set(emp);
    this.editingEmp.set(emp);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingEmp.set(null);
  }

  resetFormData(): void {
    this.formData.set({
      fullName: '',
      position: '',
      office: '',
      officeType: 'BLGF',
      email: '',
      contactNo: '',
      address: '',
      active: true,
    });
  }

  setForm(key: keyof EmployeeProfile, value: string): void {
    this.formData.update((d) => ({ ...d, [key]: value }));
  }

  async handleSave(): Promise<void> {
    const current = this.formData();
    if (!current.fullName || !current.position || !current.office) {
      this.ui.showError('Please fill in Name, Position, and Office fields.');
      return;
    }
    try {
      const employeeData = {
        ...current,
        email: current.email?.trim() || 'N/A',
      };
      if (this.editingEmp()) {
        const editingEmp = this.editingEmp()!;
        const editingId = editingEmp.id;
        const updatedEmployee = await firstValueFrom(
          this.api.updateEmployee(editingId, employeeData),
        );
        this.employees.update((list) =>
          list.map((e) => (e.id === editingId ? updatedEmployee : e)),
        );
        if (editingEmp.userId && this.currentUser.role === 'SYSTEM_ADMIN') {
          void firstValueFrom(
            this.api.updateUser(editingEmp.userId, {
              fullName: employeeData.fullName,
              designation: employeeData.position,
              contactNo: employeeData.contactNo,
              divisionCode: employeeData.divisionCode,
            }),
          ).catch(() => null);
        }
        this.editingEmp.set(null);
        this.ui.showSuccess(`Updated profile for ${employeeData.fullName}.`);
      } else {
        const newEmployee = await firstValueFrom(
          this.api.createEmployee(employeeData),
        );
        this.employees.update((list) => [...list, newEmployee]);
        this.ui.showSuccess(`Added directory entry for ${newEmployee.fullName}.`);
      }
    } catch (err) {
      this.ui.showError('Unable to save employee: ' + (err as Error).message);
      return;
    }
    this.showForm.set(false);
    this.resetFormData();
  }

  async onDeleteEmp(id: string): Promise<void> {
    const target = this.employees().find((e) => e.id === id);
    if (!target) return;
    if (target.userId) {
      this.ui.showError(
        'This personnel profile is linked to an active User Account and cannot be deleted from the Office Directory. Only manually added directory entries can be deleted.',
      );
      return;
    }
    if (this.currentUser.role !== 'SYSTEM_ADMIN' && !this.canManage('EMPLOYEE_DELETE')) {
      this.ui.showError('System Administrator access required to delete personnel.');
      return;
    }
    if (!(await showConfirm(`Delete manual directory entry for "${target.fullName}"?`))) return;
    try {
      await firstValueFrom(this.api.deleteEmployee(id));
      this.employees.update((list) => list.filter((e) => e.id !== id));
      this.folders.update((list) => list.filter((f) => f.employeeId !== id));
      this.ui.showSuccess(`Deleted manual directory entry for ${target.fullName}.`);
    } catch (err) {
      this.ui.showError('Unable to delete employee: ' + (err as Error).message);
    }
  }

  handleSelect(emp: EmployeeProfile): void {
    if (this.selectFn) this.selectFn(emp);
  }

  onToggleFolderSection(emp: EmployeeProfile): void {
    this.selectedEmpForFolder.set(emp);
    this.expandedFolder.set(this.expandedFolder() === emp.id ? null : emp.id);
  }

  openNewFolder(emp: EmployeeProfile): void {
    this.selectedEmpForFolder.set(emp);
    this.showFolderModal.set(true);
    this.folderName.set('');
    this.folderDescription.set('');
  }

  closeFolderModal(): void {
    this.showFolderModal.set(false);
    this.selectedEmpForFolder.set(null);
    this.folderName.set('');
    this.folderDescription.set('');
  }

  createFolder(): void {
    const selectedEmp = this.selectedEmpForFolder();
    if (!selectedEmp || !this.canManageEmployeeFolder(selectedEmp)) return;
    if (!this.folderName().trim()) {
      this.ui.showError('Please enter a folder name.');
      return;
    }
    const newFolder: EmployeeFolder = {
      id: `fld-${Date.now()}`,
      name: this.folderName().trim(),
      description: this.folderDescription().trim(),
      employeeId: selectedEmp.id,
      userId: selectedEmp.userId,
      fileCount: 0,
      createdAt: new Date().toISOString(),
      files: [],
    };
    this.persistFolders([...this.folders(), newFolder]);
    this.showFolderModal.set(false);
    this.selectedEmpForFolder.set(null);
    this.folderName.set('');
    this.folderDescription.set('');
  }

  toggleFolder(id: string): void {
    this.openFolderId.set(this.openFolderId() === id ? null : id);
  }

  requestDeleteFolder(folder: EmployeeFolder): void {
    this.folderToDelete.set(folder);
  }

  clearFolderToDelete(): void {
    this.folderToDelete.set(null);
  }

  onDeleteOverlayMousedown(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.folderToDelete.set(null);
  }

  confirmDeleteFolder(): void {
    const folder = this.folderToDelete();
    if (!folder || !this.canManageFolder(folder)) return;
    if (folder.systemManaged || folder.id.startsWith('fld-auto-')) {
      this.ui.showError('This static folder is linked to a User Account and cannot be deleted.');
      this.folderToDelete.set(null);
      return;
    }
    this.persistFolders(this.folders().filter((f) => f.id !== folder.id));
    this.ui.showSuccess(`Deleted custom folder "${folder.name}".`);
    this.folderToDelete.set(null);
  }

  async editFolder(fld: EmployeeFolder): Promise<void> {
    const name = (await showPrompt('Folder name:', fld.name))?.trim();
    if (!name || name === fld.name) return;
    const description =
      (await showPrompt('Folder details / description:', fld.description || '')) ?? fld.description;
    this.persistFolders(
      this.folders().map((item) =>
        item.id === fld.id ? { ...item, name, description } : item,
      ),
    );
  }

  viewFile(file: EmployeeFolderRecord['files'][number]): void {
    if (!file.dataUrl) return;
    if (file.type === 'application/pdf') {
      this.viewingPdf.set({ name: file.name, dataUrl: file.dataUrl });
    } else {
      window.open(file.dataUrl, '_blank', 'noopener,noreferrer');
    }
  }

  closePdf(): void {
    this.viewingPdf.set(null);
  }

  async editFileTitle(fld: EmployeeFolder, idx: number): Promise<void> {
    const file = fld.files[idx];
    const nextTitle = (
      await showPrompt(
        'Edit file title:',
        file.title || file.name.replace(/\.[^.]+$/, ''),
      )
    )?.trim();
    if (!nextTitle) return;
    this.persistFolders(
      this.folders().map((folder) =>
        folder.id !== fld.id
          ? folder
          : {
              ...folder,
              files: folder.files.map((item, fileIndex) =>
                fileIndex === idx ? { ...item, title: nextTitle } : item,
              ),
            },
      ),
    );
  }

  async deleteFile(fld: EmployeeFolder, idx: number): Promise<void> {
    const file = fld.files[idx];
    if (!(await showConfirm(`Delete file "${file.title || file.name}"?`))) return;
    this.persistFolders(
      this.folders().map((folder) => {
        if (folder.id !== fld.id) return folder;
        const nextFiles = folder.files.filter((_, fileIndex) => fileIndex !== idx);
        return { ...folder, files: nextFiles, fileCount: nextFiles.length };
      }),
    );
  }

  async onAddFiles(event: Event, fld: EmployeeFolder): Promise<void> {
    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files || []);
    if (selectedFiles.length === 0) return;
    try {
      const uploadedFiles: EmployeeFolder['files'] = [];
      for (const file of selectedFiles) {
        const defaultTitle = file.name.replace(/\.[^.]+$/, '');
        const title = (await showPrompt(`File title for ${file.name}:`, defaultTitle))?.trim();
        if (!title) continue;
        const storedFile = await firstValueFrom(
          this.api.uploadToStorage('documentAttachments', file),
        );
        uploadedFiles.push({
          title,
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          date: new Date().toISOString(),
          type: file.type || 'application/octet-stream',
          dataUrl: storedFile.url,
        });
      }
      if (uploadedFiles.length === 0) {
        input.value = '';
        return;
      }
      this.persistFolders(
        this.folders().map((folder) =>
          folder.id !== fld.id
            ? folder
            : {
                ...folder,
                fileCount: folder.files.length + uploadedFiles.length,
                files: [...folder.files, ...uploadedFiles],
              },
        ),
      );
    } catch (err) {
      this.ui.showError((err as Error).message || 'Could not store the selected files.');
    }
    input.value = '';
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  safePdfUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  isPdf(fileName: string): boolean {
    return fileName?.toLowerCase().endsWith('.pdf') ?? false;
  }

  previewPdf(file: EmployeeFolderRecord['files'][number]): void {
    this.viewFile(file);
  }

  fileBaseName(file: EmployeeFolderRecord['files'][number]): string {
    return file.title || file.name.replace(/\.[^.]+$/, '');
  }

  fileDateLabel(date: string): string {
    return new Date(date).toLocaleString();
  }

  customSections(): DirectorySection[] {
    return this.directorySections().filter((section) => section.id.startsWith('CUSTOM_'));
  }

  officeTypeLabel(type: string): string {
    const section = this.directorySections().find(
      (s) => s.id === type || s.officeTypes.includes(type),
    );
    if (section) return section.label;
    return type.replace(/_/g, ' ');
  }

  getOfficeTypeBadge(type: string): string {
    const section = this.directorySections().find(
      (s) => s.id === type || s.officeTypes.includes(type),
    );
    if (section?.color) {
      switch (section.color) {
        case 'indigo':
          return cx('bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800');
        case 'emerald':
          return cx('bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800');
        case 'purple':
          return cx('bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800');
        case 'amber':
          return cx('bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800');
        case 'rose':
          return cx('bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800');
        case 'cyan':
          return cx('bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800');
        default:
          return cx('bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800');
      }
    }
    switch (type) {
      case 'BLGF':
        return cx('bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800');
      case 'PROVINCIAL_TREASURER':
        return cx('bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800');
      case 'MUNICIPAL_TREASURER':
        return cx('bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800');
      case 'LGU':
        return cx('bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800');
      default:
        return cx('bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700');
    }
  }

  cardAccentClass(type: string): string {
    switch (type) {
      case 'BLGF':
        return 'accent-blgf';
      case 'PROVINCIAL_TREASURER':
        return 'accent-provincial';
      case 'MUNICIPAL_TREASURER':
        return 'accent-municipal';
      case 'LGU':
        return 'accent-lgu';
      default:
        return 'accent-other';
    }
  }

  avatarGradientClass(type: string): string {
    switch (type) {
      case 'BLGF':
        return 'avatar-blgf';
      case 'PROVINCIAL_TREASURER':
        return 'avatar-provincial';
      case 'MUNICIPAL_TREASURER':
        return 'avatar-municipal';
      case 'LGU':
        return 'avatar-lgu';
      default:
        return 'avatar-other';
    }
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.typeFilter.set('ALL');
    this.activeTab.set('ALL');
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  officeTypeBadgeClass(type: string): string {
    return cx(
      'px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border tracking-wide inline-flex items-center gap-1',
      this.getOfficeTypeBadge(type),
    );
  }

  officeDepartmentName(employee: EmployeeProfile): string {
    return getOfficeDepartmentName(employee);
  }

  tabClass(key: string): string {
    const active = this.activeTab() === key;
    return cx(
      'py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all',
      active
        ? 'bg-blue-600 text-white shadow-xs'
        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white',
    );
  }

  tabCountClass(key: string): string {
    const active = this.activeTab() === key;
    return cx(
      'text-[10px] rounded-full font-bold px-1.5 py-0.5',
      active
        ? 'bg-white/20 text-white'
        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    );
  }

  folderCountFor(emp: EmployeeProfile): number {
    return this.folders().filter((f) => f.employeeId === emp.id).length;
  }

  empFolders(emp: EmployeeProfile): EmployeeFolder[] {
    return this.folders().filter((f) => f.employeeId === emp.id);
  }

  folderFileLabelClass(fld: EmployeeFolder): string {
    return cx(
      'inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 hover:text-slate-900',
      this.canManageFolder(fld) ? 'cursor-pointer' : 'pointer-events-none opacity-30',
    );
  }

  cx = cx;
}
