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
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AppModalLayerComponent } from '../../ui/modal-layer.component';
import { ManagedOption } from '../../ui/managed-options-select.component';
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

@Component({
  selector: 'app-create-document',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    AppModalLayerComponent,
    AutocompleteFieldComponent,
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
  priority = signal<PriorityLevel>('ROUTINE');
  currentDivision = signal<DivisionCode | 'ALL' | ''>('');
  targetCompletionDate = signal(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  );
  remarks = signal('');
  initialAction = signal('Appropriate Action');
  attachments = signal<DocumentAttachment[]>([]);
  allEmployees = signal<User[]>([]);
  excludedRecipientIds = signal<string[]>([]);
  additionalDivisions = signal<DivisionCode[]>([]);
  showAddDivision = signal(false);
  submitting = signal(false);

  directoryProfiles = signal<EmployeeProfile[]>([]);
  selectedDirectoryProfileId = signal<string>('');
  validationErrors = signal<string[]>([]);

  outsideOfficeDepartment = signal<string>('');
  selectedOutsideDepartments = signal<string[]>([]);
  selectedOutsideEmployeeId = signal<string>('');
  showAddOutsideDepartment = signal(false);
  excludedOutsideRecipientIds = signal<string[]>([]);
  customOutsideRecipients = signal<OutsideRecipientEntry[]>([]);

  readonly availableOutsideEmployees = computed(() => {
    const dept = this.outsideOfficeDepartment();
    if (dept === 'PTO') return this.provincialTreasuryProfiles();
    if (dept === 'MTO') return this.municipalTreasuryProfiles();
    if (dept === 'PARTNER') return this.partnerAgencyProfiles();
    return this.directoryProfiles();
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
    } else {
      this.selectedOutsideDepartments.set([]);
    }
    this.selectedOutsideEmployeeId.set('');
    this.excludedOutsideRecipientIds.set([]);

    const recipients = deptVal
      ? this.getEmployeesForDept(deptVal).map((employee) => ({
          id: employee.id,
          name: employee.fullName || '',
          position: employee.position || '',
          office: employee.office || '',
          address: employee.address || '',
        }))
      : [];

    if (recipients.length > 0) {
      this.populateFieldsFromRecipient(recipients[0]);
    } else {
      this.clearOutsideRecipientFields();
    }
  }

  onAddOutsideDepartment(event: Event): void {
    const dept = (event.target as HTMLSelectElement).value;
    if (dept && !this.selectedOutsideDepartments().includes(dept)) {
      this.selectedOutsideDepartments.set([...this.selectedOutsideDepartments(), dept]);
      this.outsideOfficeDepartment.set(dept);
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

    const recipients = this.outsideDepartmentRecipients();
    if (recipients.length > 0) {
      this.populateFieldsFromRecipient(recipients[0]);
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

    const normalizedName = this.normalizeRecipientName(name);
    const matchingProfiles = normalizedName
      ? this.directoryProfiles().filter(
          (profile) =>
            profile.active &&
            profile.officeType !== 'BLGF' &&
            this.normalizeRecipientName(profile.fullName) === normalizedName,
        )
      : [];

    if (matchingProfiles.length !== 1) {
      this.clearOutsideRecipientLookupDetails();
      return;
    }

    const profile = matchingProfiles[0];
    this.populateFieldsFromRecipient({
      id: profile.id,
      name: profile.fullName || '',
      position: profile.position || '',
      office: profile.office || '',
      address: profile.address || '',
    });
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

  private clearOutsideRecipientLookupDetails(): void {
    this.selectedDirectoryProfileId.set('');
    this.recipientPosition.set('');
    this.recipientOffice.set('');
    this.recipientAddress.set('');
    this.clearFieldValidation('department');
    this.clearFieldValidation('office');
    this.clearFieldValidation('recipient address');
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
        const nonBlgf = (employees || []).filter(
          (employee) => employee.active && employee.officeType !== 'BLGF',
        );
        this.directoryProfiles.set(nonBlgf);
      })
      .catch(() => {});
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
      this.populateDefaultOutgoingSender();
      const recipients = this.outsideDepartmentRecipients();
      if (recipients.length > 0) {
        this.populateFieldsFromRecipient(recipients[0]);
      }
    } else {
      this.recipientType.set('INTERNAL');
      this.populateDefaultIncomingSender();
    }

    this.validationErrors.set([]);
    this.fetchServerRouteNo();
  }

  setRecipientType(type: 'INTERNAL' | 'OUTSIDE'): void {
    if (this.recipientType() === type) return;
    this.resetRecipientAssignment();
    this.recipientType.set(type);

    if (type === 'OUTSIDE') {
      this.priority.set('ROUTINE');
      this.populateDefaultOutgoingSender();
      const recipients = this.outsideDepartmentRecipients();
      if (recipients.length > 0) {
        this.populateFieldsFromRecipient(recipients[0]);
      }
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
    this.outsideOfficeDepartment.set('PTO');
    this.selectedOutsideDepartments.set(['PTO']);
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

  private resetForm(): void {
    const dir = this.initialDirection || 'INCOMING';
    this.direction.set(dir);
    this.recipientType.set(dir === 'OUTGOING' ? 'OUTSIDE' : 'INTERNAL');
    this.title.set('');
    this.subject.set('');
    this.category.set('Treasury Circular');
    this.senderName.set('');
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
    this.targetCompletionDate.set(
      new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    );
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
    this.loadEmployees();
    this.fetchServerRouteNo();
  }

  populateDefaultOutgoingSender(): void {
    if (!this.senderName()) {
      this.senderName.set(this.currentUser?.fullName || '');
    }
    if (!this.senderPosition()) {
      this.senderPosition.set(
        this.currentUser?.designation || this.currentUser?.role?.replaceAll('_', ' ') || '',
      );
    }
    if (!this.originatingOffice()) {
      this.originatingOffice.set('Bureau of Local Government Finance Regional Office II');
    }
    if (!this.senderAddress()) {
      this.senderAddress.set(
        'Regional Government Center, Carig Sur, Tuguegarao City, Cagayan',
      );
    }
    this.initialAction.set('Appropriate Action');
  }

  populateDefaultIncomingSender(): void {
    if (this.originatingOffice() === 'Bureau of Local Government Finance Regional Office II') {
      this.originatingOffice.set('');
      this.senderAddress.set('');
      if (this.senderName() === this.currentUser?.fullName) {
        this.senderName.set('');
        this.senderPosition.set('');
      }
    }
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

  categoryOptions = computed<ManagedOption[]>(() => {
    const categories = this.loadDocumentCategories();
    return categories.map((c) => ({ value: c, label: c }));
  });

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

  canManageWorkflowOptions = computed(() => {
    const role = this.currentUser?.role;
    if (role === 'SYSTEM_ADMIN') return true;
    const perms =
      this.currentUser?.permissions ||
      DEFAULT_ROLE_PERMISSIONS[role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    return Boolean(
      perms.allowedActions?.includes('WORKFLOW_OPTION_MANAGE'),
    );
  });

  availableAdditionalDivisions = computed(() => {
    const cur = this.currentDivision();
    const addl = this.additionalDivisions();
    return DIVISION_OPTIONS.filter(
      ([code]) => code !== cur && !addl.includes(code as DivisionCode),
    );
  });

  availableRecipients = computed(() => {
    const selIds = this.selectedRecipientIds();
    return this.allEmployees().filter(
      (user) => !selIds.includes(user.id),
    );
  });

  titleSuggestions = computed(() =>
    this.existingDocuments.map((doc) => doc.title),
  );
  subjectSuggestions = computed(() =>
    this.existingDocuments.map((doc) => doc.subject),
  );
  senderNameSuggestions = computed(() =>
    this.existingDocuments.map((doc) => doc.senderName),
  );
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

  private loadDocumentCategories(): string[] {
    const DEFAULTS = [
      'Treasury Circular',
      'Real Property Tax Assessment',
      'Financial Report',
      'Legal Opinion',
      'Personnel Memo',
      'General Correspondence',
    ];
    try {
      const raw = localStorage.getItem('blgf_document_categories');
      if (!raw) return DEFAULTS;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULTS;
      const cats = parsed
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (!item || typeof item !== 'object') return '';
          const opt = item as { label?: unknown; value?: unknown };
          if (typeof opt.label === 'string') return opt.label.trim();
          return typeof opt.value === 'string' ? opt.value.trim() : '';
        })
        .filter((item, index, all) => item && all.indexOf(item) === index);
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
    if (division) {
      this.selectedRecipientIds.set([]);
      this.recipientName.set('');
      this.recipientUserId.set('');
      this.recipientPosition.set('');
      this.recipientOffice.set('');
      this.recipientAddress.set('');
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

  private buildFormData(): any {
    const isOutside = this.isOutsideOffice();
    const div = isOutside ? (this.currentUser.divisionCode || 'ORD') : this.currentDivision();
    const addl = isOutside ? [] : this.additionalDivisions();
    const selIds = isOutside ? [] : this.selectedRecipientIds();
    const holdRecips = isOutside ? [] : this.holdingDivisionRecipients();
    const displayed = this.displayedRouteNo();

    const outsideList = isOutside ? this.outsideDepartmentRecipients() : [];
    const combinedRecipName = outsideList.length > 0
      ? outsideList.map((r) => r.name).join(', ')
      : this.recipientName();
    const combinedRecipPos = outsideList.length > 0
      ? outsideList.map((r) => r.position).filter(Boolean).join(', ')
      : this.recipientPosition();
    const combinedRecipOffice = outsideList.length > 0
      ? [...new Set(outsideList.map((r) => r.office))].join('; ')
      : (this.recipientOffice() || 'External Office');
    const combinedRecipAddress = outsideList.length > 0
      ? outsideList[0].address
      : this.recipientAddress();

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
          : (this.recipientOffice() || 'BLGF Regional Office II'),
      senderName: this.senderName(),
      senderPosition: this.senderPosition(),
      senderAddress: this.senderAddress(),
      recipientName: isOutside ? combinedRecipName : this.recipientName(),
      assignedUser: isOutside ? combinedRecipName : this.recipientName(),
      assignedUserId:
        isOutside
          ? undefined
          : (selIds.length === 0 ? this.recipientUserId() : undefined),
      recipientPosition: isOutside ? combinedRecipPos : this.recipientPosition(),
      recipientOffice: isOutside ? combinedRecipOffice : this.recipientOffice(),
      recipientAddress: isOutside ? combinedRecipAddress : this.recipientAddress(),
      outsideRecipients: isOutside ? outsideList : [],
      isOutside: isOutside,
      currentStatus: isOutside ? 'COMPLETED' : 'PENDING',
      priority: isOutside ? 'ROUTINE' : (this.priority() || 'ROUTINE'),
      currentDivision:
        div === 'ALL'
          ? this.currentUser.divisionCode
          : div,
      routeAllDivisions: !isOutside && div === 'ALL',
      routeMultipleDivisions:
        !isOutside && (addl.length > 0 || selIds.length > 1),
      initialTargetDivisions:
        isOutside || div === 'ALL'
          ? []
          : [div, ...addl].filter(Boolean),
      initialRecipientIds: isOutside
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
      initialAction: isOutside ? 'Dispatched / Recorded (Outside Office)' : (this.initialAction() || 'Appropriate Action'),
      remarks: isOutside
        ? (this.remarks().trim() || 'Completed - Recorded as Outside Office Outgoing Dispatch')
        : this.remarks(),
      attachments: this.attachments(),
      createdBy: this.currentUser.fullName,
      userId: this.currentUser.id,
      userRole: this.currentUser.role,
      shouldPrintSlip: false,
      shouldRouteModal: false,
      shouldOpenEnvelope: false,
      excludedRecipientIds: isOutside ? [] : this.excludedRecipientIds(),
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
      // If Internal BLGF: require division / user assignment
      !isOutside &&
        !this.currentDivision() &&
        !this.recipientUserId() &&
        this.selectedRecipientIds().length === 0 &&
        'Division Assignment or Assigned Personnel',
      !isOutside &&
        !this.recipientUserId() &&
        this.selectedRecipientIds().length === 0 &&
        this.holdingDivisionRecipients().length === 0 &&
        'Assigned Handler / Recipient',
      !isOutside && !this.initialAction() && 'Action Requested',
      !isOutside && !this.priority() && 'Priority Level',
      !isOutside && !this.targetCompletionDate() && 'Target Completion Date',
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
    const formData = this.buildFormData();
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
