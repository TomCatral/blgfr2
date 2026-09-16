import {
  Component,
  Input,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AppModalLayerComponent } from '../../ui/modal-layer.component';
import {
  ManagedOptionsSelectComponent,
  ManagedOption,
} from '../../ui/managed-options-select.component';
import { AutocompleteFieldComponent } from '../../ui/autocomplete-field.component';
import {
  DocumentDirection,
  PriorityLevel,
  DivisionCode,
  User,
  DocumentAttachment,
  DocumentRecord,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../../types';
import { documentFileType } from '../../../utils/document-files';

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
    ManagedOptionsSelectComponent,
    AutocompleteFieldComponent,
  ],
  templateUrl: './create-document.component.html',
  styleUrl: './create-document.component.scss',
})
export class CreateDocumentComponent implements OnInit, OnDestroy {
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

  ngOnInit(): void {
    this.loadEmployees();
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

  fetchServerRouteNo(): void {
    this.serverRouteNo = '';
    firstValueFrom(this.api.getNextRouteNumber(this.direction()))
      .then(({ routeNo }) => (this.serverRouteNo = routeNo))
      .catch(() => (this.serverRouteNo = this.formattedRouteNo()));
  }

  ngOnChanges(): void {
    if (this.isOpen) {
      this.direction.set(this.initialDirection);
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
      this.loadEmployees();
      this.fetchServerRouteNo();
    }
  }

  ngOnDestroy(): void {}

  private serverRouteNo = '';

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
    () => this.serverRouteNo || this.formattedRouteNo(),
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
    const div = this.currentDivision();
    const addl = this.additionalDivisions();
    const selIds = this.selectedRecipientIds();
    const holdRecips = this.holdingDivisionRecipients();
    const displayed = this.displayedRouteNo();
    return {
      direction: this.direction(),
      routeNo: displayed,
      title: this.title(),
      subject: this.subject(),
      category: this.category(),
      originatingOffice:
        this.originatingOffice() || 'BLGF Regional Office II',
      destinationOffice:
        this.recipientOffice() || 'BLGF Regional Office II',
      senderName: this.senderName(),
      senderPosition: this.senderPosition(),
      senderAddress: this.senderAddress(),
      recipientName: this.recipientName(),
      assignedUser: this.recipientName(),
      assignedUserId:
        selIds.length === 0 ? this.recipientUserId() : undefined,
      recipientPosition: this.recipientPosition(),
      recipientOffice: this.recipientOffice(),
      recipientAddress: this.recipientAddress(),
      priority: this.priority(),
      currentDivision:
        div === 'ALL'
          ? this.currentUser.divisionCode
          : div,
      routeAllDivisions: div === 'ALL',
      routeMultipleDivisions:
        addl.length > 0 || selIds.length > 1,
      initialTargetDivisions:
        div === 'ALL'
          ? []
          : [div, ...addl].filter(Boolean),
      initialRecipientIds: [
        ...new Set([
          ...selIds,
          ...holdRecips.map((u) => u.id),
        ]),
      ],
      targetCompletionDate: new Date(
        this.targetCompletionDate(),
      ).toISOString(),
      initialAction: this.initialAction(),
      remarks: this.remarks(),
      attachments: this.attachments(),
      createdBy: this.currentUser.fullName,
      userId: this.currentUser.id,
      userRole: this.currentUser.role,
      shouldPrintSlip: false,
      shouldRouteModal: false,
      shouldOpenEnvelope: false,
      excludedRecipientIds: this.excludedRecipientIds(),
    };
  }

  handleSubmit(
    event: Event,
    actionType: 'none' | 'route' = 'none',
  ): void {
    event.preventDefault();
    if (this.submitting()) return;
    const missingFields = [
      !this.title().trim() && 'Document Title',
      !this.category().trim() && 'Category / Type',
      !this.subject().trim() && 'Subject Matter / Particulars',
      !this.senderName().trim() && 'Letter From / Sender',
      !this.originatingOffice().trim() && 'Originating Office',
      !this.senderAddress().trim() && 'Office Address',
      !this.currentDivision() &&
        !this.recipientUserId() &&
        this.selectedRecipientIds().length === 0 &&
        'Division Assignment or Assigned Personnel',
      !this.recipientUserId() &&
        this.selectedRecipientIds().length === 0 &&
        this.holdingDivisionRecipients().length === 0 &&
        'Assigned Handler / Recipient',
      !this.initialAction() && 'Action Requested',
      !this.priority() && 'Priority Level',
      !this.targetCompletionDate() && 'Target Completion Date',
    ].filter(Boolean);
    if (missingFields.length > 0) {
      alert(
        `Please complete all required fields before proceeding:\n\n${missingFields.map((f) => `- ${f}`).join('\n')}`,
      );
      return;
    }
    this.submitting.set(true);
    const formData = this.buildFormData();
    formData.shouldRouteModal =
      actionType === 'route' &&
      !this.recipientUserId() &&
      !this.currentDivision();
    this.onSubmit(formData)
      .then(() => this.onClose())
      .catch(() => {})
      .finally(() => this.submitting.set(false));
  }
}
