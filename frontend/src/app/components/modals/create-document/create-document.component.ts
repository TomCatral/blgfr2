import {
  Component,
  Input,
  signal,
  computed,
  inject,
  OnInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  HostListener,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AppModalLayerComponent } from '../../ui/modal-layer.component';
import { ManagedOption, ManagedOptionsSelectComponent } from '../../ui/managed-options-select.component';
import { AutocompleteFieldComponent } from '../../ui/autocomplete-field.component';
import {
  DocumentDirection,
  PriorityLevel,
  DivisionCode,
  User,
  DocumentAttachment,
  DocumentRecord,
  DEFAULT_ROLE_PERMISSIONS,
  EmployeeProfile,
} from '../../../types';
import { documentFileType } from '../../../utils/document-files';

export interface OutsideRecipientEntry {
  id: string;
  name: string;
  position: string;
  office: string;
  address: string;
  isManual?: boolean;
}

const ACTION_OPTIONS: ManagedOption[] = [
  'Appropriate Action',
  'Approval',
  'Return with/without action',
  'Confer with RD',
  'Verify /analyze reports',
  'Please indorse/refer/forward',
  'Furnish Copy',
  'File',
].map((label) => ({ value: label, label }));

const PRIORITY_OPTIONS: ManagedOption[] = [
  { value: 'ROUTINE', label: 'Routine' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'VERY_URGENT', label: 'Very Urgent!' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
];

const INCOMING_TYPE_OPTIONS: ManagedOption[] = [
  { value: 'LETTER', label: 'Letter' },
  { value: 'MEMORANDUM', label: 'Memorandum' },
  { value: 'RESOLUTION', label: 'Resolution' },
  { value: 'ORDINANCE', label: 'Ordinance' },
  { value: 'REPORT', label: 'Report' },
  { value: 'CERTIFICATION', label: 'Certification' },
].map((o) => ({ value: o.value, label: o.label }));

const OUTGOING_TYPE_OPTIONS: ManagedOption[] = [
  { value: 'LETTER', label: 'Letter' },
  { value: 'MEMORANDUM', label: 'Memorandum' },
  { value: 'INDORSEMENT', label: 'Indorsement' },
  { value: 'REPORT', label: 'Report' },
  { value: 'CERTIFICATION', label: 'Certification' },
].map((o) => ({ value: o.value, label: o.label }));

const DIVISION_OPTIONS: Array<[string, string]> = [
  ['ORD', 'Office of the Regional Director'],
  ['AD', 'Administrative Division'],
  ['LAOD', 'Local Assessment Operations Division'],
  ['LTOD', 'Local Treasury Operations Division'],
  ['FD', 'Financial Division'],
  ['LU', 'Legal Division / Unit'],
];

const DIVISION_OFFICE_NAMES: Record<string, string> = Object.fromEntries(DIVISION_OPTIONS);

@Component({
  selector: 'app-create-document',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    AppModalLayerComponent,
    AutocompleteFieldComponent,
    ManagedOptionsSelectComponent,
  ],
  templateUrl: './create-document.component.html',
  styleUrl: './create-document.component.scss',
})
export class CreateDocumentComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() currentUser!: User;
  @Input() existingDocuments: DocumentRecord[] = [];
  @Input() existingRouteNumbers: string[] = [];
  @Input() initialDirection: DocumentDirection = 'INCOMING';
  @Input() onClose: () => void = () => {};
  @Input() onSubmit: (formData: any) => Promise<void> = () =>
    Promise.resolve();

  private api = inject(ApiService);

  readonly DIVISION_OPTIONS = DIVISION_OPTIONS;
  readonly DIVISION_OFFICE_NAMES = DIVISION_OFFICE_NAMES;

  direction = signal<DocumentDirection>(this.initialDirection);
  recipientType = signal<'INTERNAL' | 'OUTSIDE'>('OUTSIDE');

  isOutsideOffice = computed(() => {
    return this.direction() === 'OUTGOING' && this.recipientType() === 'OUTSIDE';
  });
  title = signal('');
  subject = signal('');
  category = signal('Treasury Circular');
  senderName = signal('');
  senderPosition = signal('');
  originatingOffice = signal('');
  senderAddress = signal('');
  recipientName = signal('');
  recipientUserId = signal('');
  selectedRecipientIds = signal<string[]>([]);
  recipientPosition = signal('');
  recipientOffice = signal('');
  recipientAddress = signal('');
  priority = signal<PriorityLevel | ''>('ROUTINE');
  currentDivision = signal<DivisionCode | 'ALL' | ''>('');
  targetCompletionDate = signal('');
  remarks = signal('');
  initialAction = signal('Appropriate Action');
  attachments = signal<DocumentAttachment[]>([]);
  allEmployees = signal<User[]>([]);
  excludedRecipientIds = signal<string[]>([]);
  additionalDivisions = signal<DivisionCode[]>([]);
  showAddDivision = signal(false);
  submitting = signal(false);

  directoryProfiles = signal<EmployeeProfile[]>([]);
  blgfSenderProfiles = signal<EmployeeProfile[]>([]);
  selectedBlgfSenderId = signal<string>('');
  selectedDirectoryProfileId = signal<string>('');
  validationErrors = signal<string[]>([]);
  routeAssignmentWarning = signal<string>('');

  outsideOfficeDepartment = signal<string>('');
  selectedOutsideDepartments = signal<string[]>([]);
  selectedOutsideEmployeeId = signal<string>('');
  showAddOutsideDepartment = signal(false);
  excludedOutsideRecipientIds = signal<string[]>([]);
  customOutsideRecipients = signal<OutsideRecipientEntry[]>([]);
  outsideEmployeeSearch = signal<string>('');
  isOutsideDropdownOpen = signal<boolean>(false);
  isInsideDropdownOpen = signal<boolean>(false);
  isOutsideDeptDropdownOpen = signal<boolean>(false);
  outsideDeptSearch = signal<string>('');
  isInsideDivDropdownOpen = signal<boolean>(false);
  insideDivSearch = signal<string>('');

  readonly outsideDepartmentOptions = [
    { code: 'PTO', label: 'Provincial Treasury Offices (PTO)', icon: 'business', desc: 'Provincial treasury administration & local finance' },
    { code: 'MTO', label: 'Municipal Treasury Offices / LGUs (MTO)', icon: 'business-outline', desc: 'Municipal treasuries and local government units' },
    { code: 'PARTNER', label: 'Other Agencies (Partner & External Offices)', icon: 'globe-outline', desc: 'Regional & national government agencies and partners' }
  ];

  readonly filteredOutsideDepartmentOptions = computed(() => {
    const q = this.outsideDeptSearch().trim().toLowerCase();
    if (!q) return this.outsideDepartmentOptions;
    return this.outsideDepartmentOptions.filter(d =>
      d.code.toLowerCase().includes(q) ||
      d.label.toLowerCase().includes(q) ||
      d.desc.toLowerCase().includes(q)
    );
  });

  readonly insideDivisionOptions = computed(() => [
    { code: 'ALL', name: 'All Divisions', desc: 'Broadcast to all functional divisions' },
    ...this.DIVISION_OPTIONS.map(([code, name]) => ({
      code,
      name,
      desc: `${name} (${code})`
    }))
  ]);

  readonly filteredInsideDivisionOptions = computed(() => {
    const q = this.insideDivSearch().trim().toLowerCase();
    const list = this.insideDivisionOptions();
    if (!q) return list;
    return list.filter(d =>
      d.code.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      d.desc.toLowerCase().includes(q)
    );
  });

  openOutsideDropdown(): void {
    this.isOutsideDropdownOpen.set(true);
    this.isInsideDropdownOpen.set(false);
    this.isOutsideDeptDropdownOpen.set(false);
    this.isInsideDivDropdownOpen.set(false);
  }

  openInsideDropdown(): void {
    this.isInsideDropdownOpen.set(true);
    this.isOutsideDropdownOpen.set(false);
    this.isOutsideDeptDropdownOpen.set(false);
    this.isInsideDivDropdownOpen.set(false);
  }

  openOutsideDeptDropdown(): void {
    this.isOutsideDeptDropdownOpen.set(true);
    this.isOutsideDropdownOpen.set(false);
    this.isInsideDropdownOpen.set(false);
    this.isInsideDivDropdownOpen.set(false);
  }

  openInsideDivDropdown(): void {
    this.isInsideDivDropdownOpen.set(true);
    this.isOutsideDropdownOpen.set(false);
    this.isInsideDropdownOpen.set(false);
    this.isOutsideDeptDropdownOpen.set(false);
  }

  toggleOutsideDropdown(open?: boolean): void {
    if (open === false) {
      this.isOutsideDropdownOpen.set(false);
    } else {
      this.openOutsideDropdown();
    }
  }

  toggleInsideDropdown(open?: boolean): void {
    if (open === false) {
      this.isInsideDropdownOpen.set(false);
    } else {
      this.openInsideDropdown();
    }
  }

  toggleOutsideDeptDropdown(open?: boolean): void {
    if (open === false) {
      this.isOutsideDeptDropdownOpen.set(false);
    } else {
      this.openOutsideDeptDropdown();
    }
  }

  toggleInsideDivDropdown(open?: boolean): void {
    if (open === false) {
      this.isInsideDivDropdownOpen.set(false);
    } else {
      this.openInsideDivDropdown();
    }
  }

  selectAndAddOutsideDepartment(deptCode: string): void {
    if (!this.selectedOutsideDepartments().includes(deptCode)) {
      this.selectedOutsideDepartments.set([...this.selectedOutsideDepartments(), deptCode]);
    }
    this.outsideOfficeDepartment.set(deptCode);
    this.isOutsideDeptDropdownOpen.set(false);
    this.outsideDeptSearch.set('');

    const depts = this.selectedOutsideDepartments();
    this.recipientName.set(this.getDepartmentGroupRecipientName(depts));
    this.recipientPosition.set(this.getDepartmentGroupPositions(depts));
    this.recipientOffice.set(this.getDepartmentGroupOffices(depts));
    this.recipientAddress.set(this.getDepartmentGroupAddress(depts));
  }

  selectAndAddDivision(divCode: string): void {
    if (divCode === 'ALL') {
      this.currentDivision.set('ALL');
      this.additionalDivisions.set([]);
      this.recipientName.set('All Divisions');
      this.recipientPosition.set('Division Chiefs & Staff');
      this.recipientOffice.set('All BLGF Regional Office II Divisions');
      this.recipientAddress.set('Regional Government Center, Carig Sur, Tuguegarao City');
    } else {
      const code = divCode as DivisionCode;
      if (!this.currentDivision() || this.currentDivision() === 'ALL') {
        this.currentDivision.set(code);
      } else if (this.currentDivision() !== code && !this.additionalDivisions().includes(code)) {
        this.additionalDivisions.set([...this.additionalDivisions(), code]);
      }
      const allSelected = [this.currentDivision(), ...this.additionalDivisions()].filter(Boolean) as DivisionCode[];
      if (allSelected.length > 1) {
        const names = allSelected.map((d) => this.DIVISION_OFFICE_NAMES[d] || d);
        this.recipientName.set(names.join(', '));
        this.recipientPosition.set('Division Chiefs & Staff');
        this.recipientOffice.set(names.join('; '));
        this.recipientAddress.set('Regional Government Center, Carig Sur, Tuguegarao City');
      } else {
        const single = allSelected[0];
        this.recipientName.set(this.DIVISION_OFFICE_NAMES[single] || single);
        this.recipientPosition.set('Division Chief / Staff');
        this.recipientOffice.set(this.DIVISION_OFFICE_NAMES[single] || single);
        this.recipientAddress.set('Regional Government Center, Carig Sur, Tuguegarao City');
      }
    }
    this.isInsideDivDropdownOpen.set(false);
    this.insideDivSearch.set('');
  }

  selectAndAddOutsideEmployee(empId: string): void {
    this.selectedOutsideEmployeeId.set(empId);
    this.addOutsideRecipientFromDirectory();
    this.isOutsideDropdownOpen.set(false);
    this.outsideEmployeeSearch.set('');
  }

  selectAndAddInsideRecipient(userId: string): void {
    this.recipientUserId.set(userId);
    this.addRecipient();
    this.isInsideDropdownOpen.set(false);
    this.internalRecipientSearch.set('');
  }

  getInitials(name?: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  closeAllDropdowns(): void {
    this.isOutsideDropdownOpen.set(false);
    this.isInsideDropdownOpen.set(false);
    this.isOutsideDeptDropdownOpen.set(false);
    this.isInsideDivDropdownOpen.set(false);
  }

  onComboboxFocusOut(event: FocusEvent, type: 'insideDiv' | 'insideHandler' | 'outsideDept' | 'outsideHandler'): void {
    const currentTarget = event.currentTarget as HTMLElement | null;
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (relatedTarget && currentTarget && currentTarget.contains(relatedTarget)) {
      return;
    }
    switch (type) {
      case 'insideDiv':
        this.isInsideDivDropdownOpen.set(false);
        break;
      case 'insideHandler':
        this.isInsideDropdownOpen.set(false);
        break;
      case 'outsideDept':
        this.isOutsideDeptDropdownOpen.set(false);
        break;
      case 'outsideHandler':
        this.isOutsideDropdownOpen.set(false);
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('#outside-dept-select')) {
      this.isOutsideDeptDropdownOpen.set(false);
    }
    if (!target.closest('#outside-handler-select')) {
      this.isOutsideDropdownOpen.set(false);
    }
    if (!target.closest('#inside-div-select')) {
      this.isInsideDivDropdownOpen.set(false);
    }
    if (!target.closest('#inside-handler-select')) {
      this.isInsideDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAllDropdowns();
  }

  readonly availableOutsideEmployees = computed(() => {
    const dept = this.outsideOfficeDepartment();
    if (dept === 'PTO') return this.provincialTreasuryProfiles();
    if (dept === 'MTO') return this.municipalTreasuryProfiles();
    if (dept === 'PARTNER') return this.partnerAgencyProfiles();
    return this.directoryProfiles();
  });

  readonly filteredAvailableOutsideEmployees = computed(() => {
    const q = this.outsideEmployeeSearch().trim().toLowerCase();
    const list = this.availableOutsideEmployees();
    if (!q) return list;
    return list.filter((emp) =>
      (emp.fullName || '').toLowerCase().includes(q) ||
      (emp.position || '').toLowerCase().includes(q) ||
      (emp.office || '').toLowerCase().includes(q),
    );
  });

  readonly provincialTreasuryProfiles = computed(() =>
    this.directoryProfiles().filter(
      (e) =>
        e.officeType === 'PROVINCIAL_TREASURER' ||
        /provincial\s+treasur|pto\b/i.test(`${e.office} ${e.position}`),
    ),
  );

  readonly municipalTreasuryProfiles = computed(() =>
    this.directoryProfiles().filter(
      (e) =>
        (e.officeType === 'MUNICIPAL_TREASURER' ||
          e.officeType === 'LGU' ||
          /municipal\s+treasur|mto\b/i.test(`${e.office} ${e.position}`)) &&
        !this.provincialTreasuryProfiles().includes(e),
    ),
  );

  readonly partnerAgencyProfiles = computed(() =>
    this.directoryProfiles().filter(
      (e) =>
        !this.provincialTreasuryProfiles().includes(e) &&
        !this.municipalTreasuryProfiles().includes(e),
    ),
  );

  getDepartmentLabel(deptKey: string): string {
    switch (deptKey) {
      case 'PTO':
        return 'Provincial Treasury Offices (PTO)';
      case 'MTO':
        return 'Municipal Treasury Offices / LGUs (MTO)';
      case 'PARTNER':
        return 'Partner Agencies & External Stakeholders';
      default:
        return 'All External Directory';
    }
  }

  getDepartmentShortCode(deptKey: string): string {
    switch (deptKey) {
      case 'PTO':
        return 'PTO';
      case 'MTO':
        return 'MTO';
      case 'PARTNER':
        return 'PARTNER AGENCIES';
      default:
        return 'DIRECTORY';
    }
  }

  outsideDepartmentLabel = computed(() => {
    const depts = this.selectedOutsideDepartments();
    if (depts.length === 0) return 'EXTERNAL DIRECTORY';
    if (depts.length === 1) {
      return this.getDepartmentShortCode(depts[0]);
    }
    return depts.map((d) => this.getDepartmentShortCode(d)).join(' & ');
  });

  getDepartmentGroupRecipientName(deptCodes: string[]): string {
    const parts: string[] = [];
    if (deptCodes.includes('PTO')) {
      parts.push('All Provincial Treasurer');
    }
    if (deptCodes.includes('MTO')) {
      parts.push('Municipal Treasurer');
    }
    if (deptCodes.includes('PARTNER')) {
      parts.push('Other Agencies');
    }
    for (const code of deptCodes) {
      if (!['PTO', 'MTO', 'PARTNER'].includes(code)) {
        parts.push(this.getDepartmentLabel(code));
      }
    }
    return parts.join(', ');
  }

  getDepartmentGroupPositions(deptCodes: string[]): string {
    const parts: string[] = [];
    if (deptCodes.includes('PTO')) {
      parts.push('Provincial Treasurer');
    }
    if (deptCodes.includes('MTO')) {
      parts.push('Municipal Treasurer');
    }
    if (deptCodes.includes('PARTNER')) {
      parts.push('Agency Head / Representative');
    }
    return parts.join(', ') || 'Authorized Recipient';
  }

  getDepartmentGroupOffices(deptCodes: string[]): string {
    const parts: string[] = [];
    if (deptCodes.includes('PTO')) {
      parts.push('Provincial Treasury Offices - Region II');
    }
    if (deptCodes.includes('MTO')) {
      parts.push('Municipal Treasury Offices - Region II');
    }
    if (deptCodes.includes('PARTNER')) {
      parts.push('Other Agencies');
    }
    return parts.join('; ') || 'External Offices - Region II';
  }

  getDepartmentGroupAddress(_deptCodes?: string[]): string {
    return 'Various LGUs / Partner Offices, Region II';
  }

  getEmployeesForDept(deptKey: string): EmployeeProfile[] {
    if (deptKey === 'PTO') return this.provincialTreasuryProfiles();
    if (deptKey === 'MTO') return this.municipalTreasuryProfiles();
    if (deptKey === 'PARTNER') return this.partnerAgencyProfiles();
    return this.directoryProfiles();
  }

  readonly outsideDepartmentRecipients = computed<OutsideRecipientEntry[]>(() => {
    const depts = this.selectedOutsideDepartments();
    const excluded = this.excludedOutsideRecipientIds();
    const list: OutsideRecipientEntry[] = [];

    for (const d of depts) {
      const emps = this.getEmployeesForDept(d);
      for (const emp of emps) {
        if (!excluded.includes(emp.id) && !list.some((r) => r.id === emp.id)) {
          list.push({
            id: emp.id,
            name: emp.fullName || '',
            position: emp.position || '',
            office: emp.office || '',
            address: emp.address || '',
          });
        }
      }
    }

    for (const manual of this.customOutsideRecipients()) {
      if (!excluded.includes(manual.id) && !list.some((r) => r.id === manual.id)) {
        list.push(manual);
      }
    }

    return list;
  });

  onSelectOutsideDepartment(deptVal: string): void {
    this.outsideOfficeDepartment.set(deptVal);
    if (deptVal) {
      this.selectedOutsideDepartments.set([deptVal]);
      this.recipientName.set(this.getDepartmentGroupRecipientName([deptVal]));
      this.recipientPosition.set(this.getDepartmentGroupPositions([deptVal]));
      this.recipientOffice.set(this.getDepartmentGroupOffices([deptVal]));
      this.recipientAddress.set(this.getDepartmentGroupAddress([deptVal]));
    } else {
      this.selectedOutsideDepartments.set([]);
      this.clearOutsideRecipientFields();
    }
    this.selectedOutsideEmployeeId.set('');
    this.excludedOutsideRecipientIds.set([]);
  }

  onAddOutsideDepartment(event: Event): void {
    const dept = (event.target as HTMLSelectElement).value;
    if (dept && !this.selectedOutsideDepartments().includes(dept)) {
      const updated = [...this.selectedOutsideDepartments(), dept];
      this.selectedOutsideDepartments.set(updated);
      this.outsideOfficeDepartment.set(dept);
      this.recipientName.set(this.getDepartmentGroupRecipientName(updated));
      this.recipientPosition.set(this.getDepartmentGroupPositions(updated));
      this.recipientOffice.set(this.getDepartmentGroupOffices(updated));
      this.recipientAddress.set(this.getDepartmentGroupAddress(updated));
    }
    this.showAddOutsideDepartment.set(false);
  }

  onRemoveOutsideDepartment(deptVal: string): void {
    const remaining = this.selectedOutsideDepartments().filter((d) => d !== deptVal);
    this.selectedOutsideDepartments.set(remaining);
    if (this.outsideOfficeDepartment() === deptVal) {
      this.outsideOfficeDepartment.set(remaining[0] || '');
    }
    this.selectedOutsideEmployeeId.set('');

    if (remaining.length > 0) {
      this.recipientName.set(this.getDepartmentGroupRecipientName(remaining));
      this.recipientPosition.set(this.getDepartmentGroupPositions(remaining));
      this.recipientOffice.set(this.getDepartmentGroupOffices(remaining));
      this.recipientAddress.set(this.getDepartmentGroupAddress(remaining));
    } else {
      this.clearOutsideRecipientFields();
    }
  }

  onOutsideEmployeeSelect(empId: string): void {
    this.selectedOutsideEmployeeId.set(empId);
    if (!empId) return;
    const emp = this.directoryProfiles().find((p) => p.id === empId);
    if (emp) {
      this.populateFieldsFromRecipient({
        id: emp.id,
        name: emp.fullName || '',
        position: emp.position || '',
        office: emp.office || '',
        address: emp.address || '',
      });
    }
  }

  addOutsideRecipientFromDirectory(): void {
    const empId = this.selectedOutsideEmployeeId();
    if (!empId) return;
    const emp = this.directoryProfiles().find((p) => p.id === empId);
    if (!emp) return;

    // Unexclude if it was previously excluded
    this.excludedOutsideRecipientIds.set(
      this.excludedOutsideRecipientIds().filter((id) => id !== empId),
    );

    // If employee is outside current department selection, add to custom list
    const inSelectedDepts = this.selectedOutsideDepartments().some((d) =>
      this.getEmployeesForDept(d).some((e) => e.id === empId),
    );
    if (!inSelectedDepts && !this.customOutsideRecipients().some((r) => r.id === empId)) {
      this.customOutsideRecipients.set([
        ...this.customOutsideRecipients(),
        {
          id: emp.id,
          name: emp.fullName || '',
          position: emp.position || '',
          office: emp.office || '',
          address: emp.address || '',
        },
      ]);
    }

    this.populateFieldsFromRecipient({
      id: emp.id,
      name: emp.fullName || '',
      position: emp.position || '',
      office: emp.office || '',
      address: emp.address || '',
    });
    this.selectedOutsideEmployeeId.set('');
  }

  addCurrentFieldsToRecipients(): void {
    const name = this.recipientName().trim();
    const position = this.recipientPosition().trim();
    const office = this.recipientOffice().trim();
    const address = this.recipientAddress().trim();
    if (!name || !office) return;

    const selectedProfile = this.directoryProfiles().find(
      (profile) =>
        profile.id === this.selectedDirectoryProfileId() &&
        this.normalizeRecipientName(profile.fullName) ===
          this.normalizeRecipientName(name) &&
        (profile.position || '').trim() === position &&
        (profile.office || '').trim() === office &&
        (profile.address || '').trim() === address,
    );
    if (selectedProfile) {
      this.selectedOutsideEmployeeId.set(selectedProfile.id);
      this.addOutsideRecipientFromDirectory();
      return;
    }

    const newEntry: OutsideRecipientEntry = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name,
      position,
      office,
      address,
      isManual: true,
    };

    this.customOutsideRecipients.set([...this.customOutsideRecipients(), newEntry]);
    this.selectedDirectoryProfileId.set('');
    this.clearFieldValidation('recipient');
    this.clearFieldValidation('department');
    this.clearFieldValidation('office');
    this.clearFieldValidation('address');
  }

  removeOutsideRecipient(id: string): void {
    if (!this.excludedOutsideRecipientIds().includes(id)) {
      this.excludedOutsideRecipientIds.set([...this.excludedOutsideRecipientIds(), id]);
    }
    this.customOutsideRecipients.set(this.customOutsideRecipients().filter((r) => r.id !== id));

    const remaining = this.outsideDepartmentRecipients();
    if (remaining.length > 0) {
      this.populateFieldsFromRecipient(remaining[0]);
    } else {
      this.clearOutsideRecipientFields();
    }
  }

  onOutsideRecipientNameChange(name: string): void {
    this.recipientName.set(name);
    this.clearFieldValidation('recipient');
    if (!name || !name.trim()) return;

    const normalizedName = this.normalizeRecipientName(name);
    if (!normalizedName) return;

    // 1. Exact match against outside directory profiles
    let profile = this.directoryProfiles().find(
      (p) => p.officeType !== 'BLGF' && this.normalizeRecipientName(p.fullName) === normalizedName,
    );

    // 2. If no exact match, try prefix / title-stripped or substring match
    if (!profile) {
      const cleanInput = normalizedName.replace(/^(mr\.|ms\.|atty\.|hon\.|dir\.|engr\.)\s+/i, '').trim();
      profile = this.directoryProfiles().find((p) => {
        if (p.officeType === 'BLGF') return false;
        const cleanName = this.normalizeRecipientName(p.fullName).replace(/^(mr\.|ms\.|atty\.|hon\.|dir\.|engr\.)\s+/i, '').trim();
        return cleanName === cleanInput || cleanName.includes(cleanInput) || cleanInput.includes(cleanName);
      });
    }

    if (profile) {
      this.populateFieldsFromRecipient({
        id: profile.id,
        name: profile.fullName || name,
        position: profile.position || '',
        office: profile.office || '',
        address: profile.address || '',
      });
    }
  }

  populateFieldsFromRecipient(rec: OutsideRecipientEntry): void {
    this.recipientName.set(rec.name);
    this.recipientPosition.set(rec.position);
    this.recipientOffice.set(rec.office);
    this.recipientAddress.set(rec.address);
    this.selectedDirectoryProfileId.set(
      this.directoryProfiles().some((profile) => profile.id === rec.id) ? rec.id : '',
    );
    this.clearFieldValidation('recipient');
    this.clearFieldValidation('department');
    this.clearFieldValidation('office');
    this.clearFieldValidation('address');
  }

  private clearOutsideRecipientFields(): void {
    this.recipientName.set('');
    this.selectedDirectoryProfileId.set('');
    this.recipientPosition.set('');
    this.recipientOffice.set('');
    this.recipientAddress.set('');
  }

  private normalizeRecipientName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  }

  ngOnInit(): void {
    this.loadEmployees();
    this.loadDirectoryProfiles();
    this.fetchServerRouteNo();
  }

  private loadEmployees(): void {
    firstValueFrom(this.api.getUsers())
      .then((users) =>
        this.allEmployees.set(
          users.filter(
            (user) => user.active && user.role !== 'SYSTEM_ADMIN',
          ),
        ),
      )
      .catch(() => {});
  }

  private loadDirectoryProfiles(): void {
    firstValueFrom(this.api.getEmployees())
      .then((employees) => {
        const activeEmployees = (employees || []).filter(
          (employee) => employee.active !== false,
        );
        this.blgfSenderProfiles.set(
          activeEmployees.filter(
            (employee) =>
              employee.officeType === 'BLGF' ||
              /bureau of local government finance|\bblgf\b/i.test(employee.office || ''),
          ),
        );
        const nonBlgf = (employees || []).filter(
          (employee) =>
            employee.active !== false &&
            employee.officeType !== 'BLGF',
        );
        this.directoryProfiles.set(nonBlgf);
        if (this.direction() === 'OUTGOING' && this.recipientType() === 'OUTSIDE') {
          this.populateOutsideBlgfDirector();
        }
      })
      .catch(() => {});
  }

  onSenderNameChange(name: string): void {
    const previouslyAutoFilled = Boolean(this.selectedBlgfSenderId());
    this.senderName.set(name);
    if (this.direction() !== 'OUTGOING' || this.recipientType() !== 'OUTSIDE') {
      this.selectedBlgfSenderId.set('');
      return;
    }
    const normalized = this.normalizeRecipientName(name);
    const profile = this.blgfSenderProfiles().find(
      (employee) => this.normalizeRecipientName(employee.fullName || '') === normalized,
    );
    if (profile) {
      this.populateSenderFromProfile(profile);
    } else if (previouslyAutoFilled) {
      this.selectedBlgfSenderId.set('');
      this.senderPosition.set('');
      this.originatingOffice.set('');
      this.senderAddress.set('');
    }
  }

  private populateOutsideBlgfDirector(): void {
    if (this.senderName().trim()) return;
    const profiles = this.blgfSenderProfiles();
    const director =
      profiles.find((employee) =>
        /julaida(?:\s+t\.)?\s+caddawan-pancho/i.test(employee.fullName || ''),
      ) ||
      profiles.find(
        (employee) =>
          employee.officeType === 'BLGF' &&
          /regional\s+(executive\s+)?director|director.*regional/i.test(employee.position || ''),
      );
    if (director) this.populateSenderFromProfile(director);
  }

  private populateSenderFromProfile(profile: EmployeeProfile): void {
    this.selectedBlgfSenderId.set(profile.id);
    this.senderName.set(profile.fullName || '');
    this.senderPosition.set(profile.position || '');
    this.originatingOffice.set(profile.office || 'Bureau of Local Government Finance Regional Office II');
    this.senderAddress.set(profile.address || '');
  }

  private clearAutoFilledBlgfSender(): void {
    if (!this.selectedBlgfSenderId()) return;
    this.selectedBlgfSenderId.set('');
    this.senderName.set('');
    this.senderPosition.set('');
    this.originatingOffice.set('');
    this.senderAddress.set('');
  }

  clearValidationErrors(): void {
    this.validationErrors.set([]);
  }

  clearFieldValidation(keyword: string): void {
    if (this.validationErrors().length === 0) return;
    this.validationErrors.update((errors) =>
      errors.filter((e) => !e.toLowerCase().includes(keyword.toLowerCase())),
    );
  }

  isFieldInvalid(keyword: string): boolean {
    return this.validationErrors().some((e) =>
      e.toLowerCase().includes(keyword.toLowerCase()),
    );
  }

  private serverRouteNo = signal('');
  private routeNoRequestId = 0;

  fetchServerRouteNo(): void {
    const reqId = ++this.routeNoRequestId;
    const targetDir = this.direction();
    this.serverRouteNo.set('');
    firstValueFrom(this.api.getNextRouteNumber(targetDir))
      .then(({ routeNo }) => {
        if (reqId === this.routeNoRequestId && this.direction() === targetDir) {
          this.serverRouteNo.set(routeNo);
        }
      })
      .catch(() => {
        if (reqId === this.routeNoRequestId && this.direction() === targetDir) {
          this.serverRouteNo.set(this.formattedRouteNo());
        }
      });
  }

  setDirection(dir: DocumentDirection): void {
    if (this.direction() === dir) return;
    this.resetRecipientAssignment();
    this.direction.set(dir);

    if (dir === 'OUTGOING') {
      this.recipientType.set('OUTSIDE');
      this.priority.set('ROUTINE');
      this.populateOutsideBlgfDirector();
      const recipients = this.outsideDepartmentRecipients();
      if (recipients.length > 0) {
        this.populateFieldsFromRecipient(recipients[0]);
      }
    } else {
      this.recipientType.set('INTERNAL');
      this.clearAutoFilledBlgfSender();
    }

    this.validationErrors.set([]);
    this.fetchServerRouteNo();
  }

  setRecipientType(type: 'INTERNAL' | 'OUTSIDE'): void {
    if (this.recipientType() === type) return;
    this.resetRecipientAssignment();
    this.recipientType.set(type);

    if (type === 'OUTSIDE' && this.direction() === 'OUTGOING') {
      this.priority.set('ROUTINE');
      this.populateOutsideBlgfDirector();
      const recipients = this.outsideDepartmentRecipients();
      if (recipients.length > 0) {
        this.populateFieldsFromRecipient(recipients[0]);
      }
    } else {
      this.clearAutoFilledBlgfSender();
    }

    this.validationErrors.set([]);
  }

  private resetRecipientAssignment(): void {
    this.recipientName.set('');
    this.recipientUserId.set('');
    this.selectedRecipientIds.set([]);
    this.recipientPosition.set('');
    this.recipientOffice.set('');
    this.recipientAddress.set('');
    this.currentDivision.set('');
    this.excludedRecipientIds.set([]);
    this.additionalDivisions.set([]);
    this.showAddDivision.set(false);
    this.selectedDirectoryProfileId.set('');
    // A fresh outside-office assignment must start empty. The user explicitly
    // chooses PTO, MTO, or a partner agency before recipients are populated.
    this.outsideOfficeDepartment.set('');
    this.selectedOutsideDepartments.set([]);
    this.selectedOutsideEmployeeId.set('');
    this.showAddOutsideDepartment.set(false);
    this.excludedOutsideRecipientIds.set([]);
    this.customOutsideRecipients.set([]);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const isOpenChange = changes['isOpen'];
    // Only reset and reinitialize form state when modal transitions from closed to open
    if (isOpenChange && isOpenChange.currentValue === true && !isOpenChange.previousValue) {
      this.resetForm();
    }
  }

  discardAndClose = (): void => {
    this.resetForm();
    this.onClose();
  };

  private resetForm(): void {
    const dir = this.initialDirection || 'INCOMING';
    this.direction.set(dir);
    this.recipientType.set(dir === 'OUTGOING' ? 'OUTSIDE' : 'INTERNAL');
    this.title.set('');
    this.subject.set('');
    this.category.set(this.categoryOptions()[0]?.value || 'Treasury Circular');
    this.senderName.set('');
    this.selectedBlgfSenderId.set('');
    this.senderPosition.set('');
    this.originatingOffice.set('');
    this.senderAddress.set('');
    this.recipientName.set('');
    this.recipientUserId.set('');
    this.selectedRecipientIds.set([]);
    this.recipientPosition.set('');
    this.recipientOffice.set('');
    this.recipientAddress.set('');
    this.selectedDirectoryProfileId.set('');
    this.priority.set('ROUTINE');
    this.currentDivision.set('');
    this.targetCompletionDate.set('');
    this.remarks.set('');
    this.initialAction.set('Appropriate Action');
    this.attachments.set([]);
    this.excludedRecipientIds.set([]);
    this.additionalDivisions.set([]);
    this.showAddDivision.set(false);
    this.submitting.set(false);
    this.outsideOfficeDepartment.set('');
    this.selectedOutsideDepartments.set([]);
    this.selectedOutsideEmployeeId.set('');
    this.showAddOutsideDepartment.set(false);
    this.excludedOutsideRecipientIds.set([]);
    this.customOutsideRecipients.set([]);
    this.validationErrors.set([]);
    this.loadEmployees();
    // Refresh the directory every time the modal opens so newly added BLGF
    // employees are immediately searchable and the current Regional Director
    // can be auto-filled without restarting the application.
    this.loadDirectoryProfiles();
    this.fetchServerRouteNo();
  }

  ngOnDestroy(): void {}

  private formattedRouteNo = computed(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dir = this.direction() === 'INCOMING' ? 'IN' : 'OUT';
    const prefix = `BLGFR2-${year}-${month}-${dir}-`;
    const next =
      this.existingRouteNumbers.reduce((highest, existing) => {
        if (!existing.startsWith(prefix)) return highest;
        const seq = Number(existing.slice(prefix.length));
        return Number.isInteger(seq) ? Math.max(highest, seq) : highest;
      }, 0) + 1;
    return `${prefix}${String(next).padStart(2, '0')}`;
  });

  displayedRouteNo = computed(
    () => this.serverRouteNo() || this.formattedRouteNo(),
  );

  holdingDivisionRecipients = computed(() => {
    if (
      this.recipientUserId() ||
      this.selectedRecipientIds().length > 0 ||
      !this.currentDivision()
    )
      return [];
    const div = this.currentDivision();
    const addl = this.additionalDivisions();
    const excl = this.excludedRecipientIds();
    return this.allEmployees().filter(
      (user) =>
        user.active &&
        (div === 'ALL' ||
          user.divisionCode === div ||
          addl.includes(user.divisionCode)) &&
        !excl.includes(user.id),
    );
  });

  selectedDivisionCodes = computed<Array<DivisionCode | 'ALL'>>(() => {
    const div = this.currentDivision();
    if (!div) return [];
    if (div === 'ALL') return ['ALL'];
    return [div, ...this.additionalDivisions()].filter(
      Boolean,
    ) as DivisionCode[];
  });

  selectedDivisionLabels = computed(() => {
    const div = this.currentDivision();
    if (!div) return '';
    if (div === 'ALL') return 'All Divisions';
    return [div, ...this.additionalDivisions()].filter(Boolean).join(', ');
  });

  categoryOptions = computed<ManagedOption[]>(() => this.loadDocumentCategories());

  get typeOptions(): ManagedOption[] {
    return this.direction() === 'INCOMING'
      ? [...INCOMING_TYPE_OPTIONS]
      : [...OUTGOING_TYPE_OPTIONS];
  }

  get actionOptions(): ManagedOption[] {
    return [...ACTION_OPTIONS];
  }

  get priorityOptions(): ManagedOption[] {
    return [...PRIORITY_OPTIONS];
  }

  canManageWorkflowOptions(): boolean {
    const role = this.currentUser?.role;
    if (role === 'SYSTEM_ADMIN' || role === 'ADMIN') return true;
    const perms =
      this.currentUser?.permissions ||
      (role ? DEFAULT_ROLE_PERMISSIONS[role] : undefined) ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    return Boolean(
      perms.allowedActions?.includes('WORKFLOW_OPTION_MANAGE'),
    );
  }

  availableAdditionalDivisions = computed(() => {
    const cur = this.currentDivision();
    const addl = this.additionalDivisions();
    return DIVISION_OPTIONS.filter(
      ([code]) => code !== cur && !addl.includes(code as DivisionCode),
    );
  });

  internalRecipientSearch = signal<string>('');

  availableRecipients = computed(() => {
    const selIds = this.selectedRecipientIds();
    return this.allEmployees().filter(
      (user) => !selIds.includes(user.id),
    );
  });

  filteredAvailableRecipients = computed(() => {
    const q = this.internalRecipientSearch().trim().toLowerCase();
    const list = this.availableRecipients();
    if (!q) return list;
    return list.filter((user) =>
      (user.fullName || '').toLowerCase().includes(q) ||
      (user.designation || '').toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q) ||
      (user.divisionCode || '').toLowerCase().includes(q),
    );
  });

  titleSuggestions = computed(() =>
    this.existingDocuments.map((doc) => doc.title),
  );
  subjectSuggestions = computed(() =>
    this.existingDocuments.map((doc) => doc.subject),
  );
  senderNameSuggestions = computed(() => [
    ...new Set([
      ...(this.direction() === 'OUTGOING' && this.recipientType() === 'OUTSIDE'
        ? this.blgfSenderProfiles().map((profile) => profile.fullName)
        : []),
      ...this.existingDocuments.map((doc) => doc.senderName),
    ].map((name) => (name || '').trim()).filter(Boolean)),
  ]);
  senderPositionSuggestions = computed(() =>
    this.existingDocuments.map((doc) => doc.senderPosition || ''),
  );
  originatingOfficeSuggestions = computed(() =>
    this.existingDocuments.map((doc) => doc.originatingOffice),
  );
  senderAddressSuggestions = computed(() =>
    this.existingDocuments.map((doc) => doc.senderAddress || ''),
  );
  remarksSuggestions = computed(() =>
    this.existingDocuments.map((doc) => doc.remarks || ''),
  );
  recipientNameSuggestions = computed(() => [
    ...new Set(
      this.directoryProfiles()
        .map((profile) => (profile.fullName || '').trim())
        .filter(Boolean),
    ),
  ]);
  recipientPositionSuggestions = computed(() => [
    ...new Set(
      this.directoryProfiles()
        .map((profile) => (profile.position || '').trim())
        .filter(Boolean),
    ),
  ]);
  recipientOfficeSuggestions = computed(() => [
    ...new Set(
      this.directoryProfiles()
        .map((profile) => (profile.office || '').trim())
        .filter(Boolean),
    ),
  ]);
  recipientAddressSuggestions = computed(() => [
    ...new Set(
      this.directoryProfiles()
        .map((profile) => (profile.address || '').trim())
        .filter(Boolean),
    ),
  ]);

  private loadDocumentCategories(): ManagedOption[] {
    const DEFAULTS = [
      'Treasury Circular',
      'Real Property Tax Assessment',
      'Financial Report',
      'Legal Opinion',
      'Personnel Memo',
      'General Correspondence',
    ].map((label) => ({ value: label, label }));
    try {
      const raw = localStorage.getItem('blgf_document_categories');
      if (!raw) return DEFAULTS;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULTS;
      const cats = parsed
        .map((item) => {
          if (typeof item === 'string') {
            const label = item.trim();
            return label ? { value: label, label } : null;
          }
          if (!item || typeof item !== 'object') return null;
          const opt = item as { label?: unknown; value?: unknown };
          const label = typeof opt.label === 'string' ? opt.label.trim() : '';
          const value = typeof opt.value === 'string' ? opt.value.trim() : '';
          return label || value ? { value: value || label, label: label || value } : null;
        })
        .filter((item): item is ManagedOption => item !== null)
        .filter((item, index, all) => all.findIndex((candidate) => candidate.value === item.value) === index);
      return cats.length ? cats : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  }

  getEmployeeName(id: string): string {
    return (
      this.allEmployees().find((u) => u.id === id)?.fullName || id
    );
  }

  onTargetDateChange(event: Event): void {
    this.targetCompletionDate.set(
      (event.target as HTMLInputElement).value,
    );
  }

  onPriorityChange(value: string): void {
    this.priority.set(value as PriorityLevel);
  }

  priorityBadgeClasses(value: string): string {
    switch (value) {
      case 'VERY_URGENT':
        return 'priority-very-urgent';
      case 'URGENT':
        return 'priority-urgent';
      case 'CONFIDENTIAL':
        return 'priority-confidential';
      default:
        return 'priority-routine';
    }
  }

  onDivisionChange(event: Event): void {
    const division = (event.target as HTMLSelectElement).value as
      | DivisionCode
      | 'ALL'
      | '';
    this.currentDivision.set(division);
    if (division === 'ALL' || !division) {
      this.additionalDivisions.set([]);
    } else {
      this.additionalDivisions.set(
        this.additionalDivisions().filter((d) => d !== division),
      );
    }
    this.excludedRecipientIds.set([]);
    if (division === 'ALL') {
      this.selectedRecipientIds.set([]);
      this.recipientName.set('All Divisions');
      this.recipientUserId.set('');
      this.recipientPosition.set('Division Chiefs & Staff');
      this.recipientOffice.set('All BLGF Regional Office II Divisions');
      this.recipientAddress.set('Regional Government Center, Carig Sur, Tuguegarao City');
    } else if (division) {
      this.selectedRecipientIds.set([]);
      this.recipientName.set(this.DIVISION_OFFICE_NAMES[division] || division);
      this.recipientUserId.set('');
      this.recipientPosition.set('Division Chief / Staff');
      this.recipientOffice.set(this.DIVISION_OFFICE_NAMES[division] || `BLGF Regional Office II - ${division}`);
      this.recipientAddress.set('Regional Government Center, Carig Sur, Tuguegarao City');
    }
  }

  onAddDivision(event: Event): void {
    const division = (event.target as HTMLSelectElement)
      .value as DivisionCode;
    if (
      division &&
      division !== this.currentDivision() &&
      !this.additionalDivisions().includes(division)
    ) {
      this.additionalDivisions.set([
        ...this.additionalDivisions(),
        division,
      ]);
      this.excludedRecipientIds.set([]);
    }
    this.showAddDivision.set(false);
  }

  onRemoveDivision(division: DivisionCode | 'ALL', index: number): void {
    if (this.currentDivision() === 'ALL') {
      this.currentDivision.set('');
      this.additionalDivisions.set([]);
    } else if (index === 0) {
      const [nextPrimary, ...remaining] = this.additionalDivisions();
      this.currentDivision.set(nextPrimary || '');
      this.additionalDivisions.set(remaining);
    } else {
      this.additionalDivisions.set(
        this.additionalDivisions().filter((d) => d !== division),
      );
    }
    this.excludedRecipientIds.set([]);
  }

  onRecipientSelect(event: Event): void {
    const userId = (event.target as HTMLSelectElement).value;
    const account = this.allEmployees().find((u) => u.id === userId);
    if (!account) {
      this.recipientName.set('');
      this.recipientUserId.set('');
      this.recipientPosition.set('');
      this.recipientOffice.set('');
      this.recipientAddress.set('');
      this.currentDivision.set('');
      return;
    }
    this.recipientName.set(account.fullName);
    this.recipientUserId.set(account.id);
    this.recipientPosition.set(account.designation || account.role);
    this.recipientOffice.set('BLGF Regional Office II');
    this.currentDivision.set(account.divisionCode);
    this.recipientAddress.set(
      'Regional Government Center, Carig Sur, Tuguegarao City',
    );
  }

  addRecipient(): void {
    const id = this.recipientUserId();
    if (!id) return;
    this.selectedRecipientIds.set([
      ...new Set([...this.selectedRecipientIds(), id]),
    ]);
    this.recipientName.set('');
    this.recipientUserId.set('');
    this.recipientPosition.set('');
    this.recipientOffice.set('');
    this.recipientAddress.set('');
  }

  removeRecipient(id: string): void {
    this.selectedRecipientIds.set(
      this.selectedRecipientIds().filter((uid) => uid !== id),
    );
  }

  excludeRecipient(id: string): void {
    this.excludedRecipientIds.set([...this.excludedRecipientIds(), id]);
  }

  async onFilePicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    const newAtts: DocumentAttachment[] = [];
    for (const f of Array.from(files) as File[]) {
      const storedFile = await firstValueFrom(
        this.api.uploadToStorage('documentAttachments', f),
      );
      const sizeMb = (f.size / (1024 * 1024)).toFixed(2);
      newAtts.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        fileName: f.name,
        fileSize: `${sizeMb} MB`,
        fileType: documentFileType(f),
        uploadDate: new Date().toISOString(),
        url: storedFile.url,
      });
    }
    this.attachments.set([...this.attachments(), ...newAtts]);
    input.value = '';
  }

  removeAttachment(id: string): void {
    this.attachments.set(
      this.attachments().filter((a) => a.id !== id),
    );
  }

  private buildFormData(forceRegisterOnly = false): any {
    const isOutside = this.isOutsideOffice();
    const div = isOutside ? 'Other Agencies' : this.currentDivision();
    const addl = isOutside ? [] : this.additionalDivisions();
    const selIds = isOutside ? [] : this.selectedRecipientIds();
    const holdRecips = isOutside ? [] : this.holdingDivisionRecipients();
    const displayed = this.displayedRouteNo();

    const depts = this.selectedOutsideDepartments();
    const outsideList = isOutside ? this.outsideDepartmentRecipients() : [];

    let combinedRecipName = this.recipientName().trim();
    let combinedRecipPos = this.recipientPosition()?.trim() || '';
    let combinedRecipOffice = this.recipientOffice()?.trim() || (isOutside ? 'External Office' : 'BLGF Regional Office II');
    let combinedRecipAddress = this.recipientAddress()?.trim() || '';

    if (isOutside) {
      if (depts.length > 0) {
        combinedRecipName = this.getDepartmentGroupRecipientName(depts);
        combinedRecipPos = this.getDepartmentGroupPositions(depts);
        combinedRecipOffice = this.getDepartmentGroupOffices(depts);
        combinedRecipAddress = this.getDepartmentGroupAddress(depts);
      } else if (outsideList.length > 0) {
        combinedRecipName = outsideList.map((r) => r.name).join(', ');
        combinedRecipPos = outsideList.map((r) => r.position).filter(Boolean).join(', ');
        combinedRecipOffice = [...new Set(outsideList.map((r) => r.office))].join('; ');
        combinedRecipAddress = outsideList[0].address;
      }
    } else {
      if (div === 'ALL') {
        combinedRecipName = 'All Divisions';
        combinedRecipPos = 'Division Chiefs & Staff';
        combinedRecipOffice = 'All BLGF Regional Office II Divisions';
        combinedRecipAddress = 'Regional Government Center, Carig Sur, Tuguegarao City';
      } else if (addl.length > 0 && selIds.length === 0) {
        const divNames = [div, ...addl].map((d) => this.DIVISION_OFFICE_NAMES[d] || d);
        combinedRecipName = divNames.join(', ');
        combinedRecipPos = 'Division Chiefs & Staff';
        combinedRecipOffice = divNames.join('; ');
        combinedRecipAddress = 'Regional Government Center, Carig Sur, Tuguegarao City';
      } else if (!combinedRecipName && div) {
        combinedRecipName = this.DIVISION_OFFICE_NAMES[div] || div;
        combinedRecipPos = 'Division Chief / Staff';
        combinedRecipOffice = this.DIVISION_OFFICE_NAMES[div] || div;
        combinedRecipAddress = 'Regional Government Center, Carig Sur, Tuguegarao City';
      }
    }

    const hasRecipient =
      Boolean(this.recipientUserId()) ||
      this.selectedRecipientIds().length > 0 ||
      holdRecips.length > 0;
    const hasDivision = Boolean(this.currentDivision());
    // The clicked action is authoritative. "Register Only" must never create
    // an initial route just because the user previously selected a division or
    // recipient while filling out the form.
    const isNotYetRouted = !isOutside && (forceRegisterOnly || (!hasRecipient && !hasDivision));

    return {
      direction: this.direction(),
      routeNo: displayed,
      title: this.title(),
      subject: this.subject(),
      category: this.category(),
      originatingOffice:
        this.originatingOffice() || 'BLGF Regional Office II',
      destinationOffice:
        isOutside
          ? combinedRecipOffice
          : (isNotYetRouted ? 'Awaiting Initial Routing' : combinedRecipOffice),
      senderName: this.senderName(),
      senderPosition: this.senderPosition(),
      senderAddress: this.senderAddress(),
      recipientName: isOutside ? combinedRecipName : (isNotYetRouted ? 'Not Yet Routed' : combinedRecipName),
      assignedUser: isOutside ? combinedRecipName : (isNotYetRouted ? 'Not Yet Routed' : combinedRecipName),
      assignedUserId:
        isOutside || isNotYetRouted
          ? undefined
          : (selIds.length === 0 ? this.recipientUserId() : undefined),
      recipientPosition: isOutside ? combinedRecipPos : (isNotYetRouted ? undefined : combinedRecipPos),
      recipientOffice: isOutside ? combinedRecipOffice : (isNotYetRouted ? undefined : combinedRecipOffice),
      recipientAddress: isOutside ? combinedRecipAddress : (isNotYetRouted ? undefined : combinedRecipAddress),
      outsideRecipients: isOutside ? outsideList : [],
      isOutside: isOutside,
      currentStatus: isOutside ? 'COMPLETED' : (isNotYetRouted ? 'NOT_YET_ROUTED' : 'PENDING'),
      priority: isOutside ? 'ROUTINE' : (this.priority() || 'ROUTINE'),
      currentDivision: isOutside
        ? 'Other Agencies'
        : (div === 'ALL'
          ? (this.currentUser.divisionCode === 'ITMS' ? 'ORD' : this.currentUser.divisionCode)
          : (div || (this.currentUser.divisionCode === 'ITMS' ? 'ORD' : this.currentUser.divisionCode) || 'AD')),
      routeAllDivisions: !isOutside && !isNotYetRouted && div === 'ALL',
      routeMultipleDivisions:
        !isOutside && !isNotYetRouted && (addl.length > 0 || selIds.length > 1),
      initialTargetDivisions:
        isOutside || div === 'ALL' || isNotYetRouted
          ? []
          : [div, ...addl].filter(Boolean),
      initialRecipientIds: isOutside || isNotYetRouted
        ? []
        : [
            ...new Set([
              ...selIds,
              ...holdRecips.map((u) => u.id),
            ]),
          ],
      targetCompletionDate: (isOutside || !this.targetCompletionDate())
        ? new Date(Date.now() + 3 * 86400000).toISOString()
        : new Date(this.targetCompletionDate()).toISOString(),
      initialAction: isOutside
        ? 'Dispatched / Recorded (Outside Office)'
        : (isNotYetRouted ? (this.initialAction() || 'Awaiting Initial Routing') : (this.initialAction() || 'Appropriate Action')),
      remarks: isOutside
        ? (this.remarks().trim() || 'Completed - Recorded as Outside Office Outgoing Dispatch')
        : (isNotYetRouted ? (this.remarks().trim() || 'Document registered. Not yet routed.') : this.remarks()),
      attachments: this.attachments(),
      createdBy: this.currentUser.fullName,
      userId: this.currentUser.id,
      userRole: this.currentUser.role,
      shouldPrintSlip: false,
      shouldRouteModal: false,
      shouldOpenEnvelope: false,
      excludedRecipientIds: isOutside ? [] : this.excludedRecipientIds(),
      isNotYetRouted,
    };
  }

  handleSubmit(
    event: Event,
    actionType: 'none' | 'route' = 'none',
  ): void {
    event.preventDefault();
    if (this.submitting()) return;

    const isOutside = this.isOutsideOffice();
    const outsideList = isOutside ? this.outsideDepartmentRecipients() : [];
    const isRouting = actionType === 'route';

    const hasAssignment =
      Boolean(this.currentDivision()) ||
      Boolean(this.recipientUserId()) ||
      this.selectedRecipientIds().length > 0 ||
      this.holdingDivisionRecipients().length > 0;

    // If user clicked "Register & Route" without any initial recipient or division assignment, show warning!
    if (!isOutside && isRouting && !hasAssignment) {
      this.routeAssignmentWarning.set(
        'Please select an Initial Division or Assigned Recipient before routing. (Or choose "Register Only" to save this document as Not Yet Routed).'
      );
      const assignmentPanel = document.getElementById('initial-assignment-panel');
      if (assignmentPanel) {
        assignmentPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    this.routeAssignmentWarning.set('');

    const missingFields: string[] = [
      !this.title().trim() && 'Document Title',
      !this.category().trim() && 'Category / Type',
      !this.subject().trim() && 'Subject Matter / Particulars',
      !this.senderName().trim() && 'Letter From / Sender',
      !this.originatingOffice().trim() && 'Originating Office',
      !this.senderAddress().trim() && 'Office Address',
      // If Outside Office: require manual recipient fields or outside chips
      isOutside && !this.recipientName().trim() && outsideList.length === 0 && 'Recipient Name / Addressee',
      isOutside && !this.recipientOffice().trim() && outsideList.length === 0 && 'Department / Office',
      isOutside && !this.recipientAddress().trim() && outsideList.length === 0 && 'Recipient Address',
      // If Internal BLGF and ROUTING: require division or user assignment
      !isOutside && isRouting && !hasAssignment && 'Initial Division or Assigned Personnel',
      !isOutside && !this.initialAction() && 'Action Requested',
      !isOutside && !this.priority() && 'Priority Level',
    ].filter(Boolean) as string[];

    if (missingFields.length > 0) {
      this.validationErrors.set(missingFields);
      alert(
        `Please complete all required fields before proceeding:\n\n${missingFields.map((f) => `- ${f}`).join('\n')}`,
      );
      return;
    }
    this.validationErrors.set([]);
    this.submitting.set(true);
    const formData = this.buildFormData(!isOutside && actionType === 'none');
    formData.shouldRouteModal =
      !isOutside &&
      actionType === 'route' &&
      !this.recipientUserId() &&
      !this.currentDivision();
    this.onSubmit(formData)
      .then(() => {
        this.validationErrors.set([]);
        this.onClose();
      })
      .catch((err) => {
        console.warn('Document registration submission error:', err);
      })
      .finally(() => this.submitting.set(false));
  }
}
