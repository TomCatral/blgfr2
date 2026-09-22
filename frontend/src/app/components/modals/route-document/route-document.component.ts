import { Component, Input, OnChanges, SimpleChanges, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppModalLayerComponent } from '../../ui/modal-layer.component';
import { ManagedOptionsSelectComponent } from '../../ui/managed-options-select.component';
import {
  DocumentRecord,
  DocumentStatus,
  DivisionCode,
  User,
  EmployeeProfile,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../../types';
import { hasCompletedPart, findPreviousDelivery } from '../../../utils/routing-recipients';
import { documentFileType, isReplyAttachment } from '../../../utils/document-files';
import { ApiService } from '../../../services/api.service';

const ACTION_OPTIONS = [
  'Appropriate Action',
  'Approval',
  'Return with/without action',
  'Confer with RD',
  'Verify /analyze reports',
  'Please indorse/refer/forward',
  'Furnish Copy',
  'File',
].map((label) => ({ value: label, label }));

const STATUS_OPTIONS = [
  { value: 'IN_PROGRESS', label: 'In Progress / Under Review', colorDot: '🔵' },
  { value: 'FOR_SIGNATURE', label: 'For Signature / Final Approval', colorDot: '🟣' },
  { value: 'COMPLETED', label: 'Completed - My part', colorDot: '🟢' },
  { value: 'RETURNED', label: 'Returned for Revision', colorDot: '🔴' },
  { value: 'ON_HOLD', label: 'On Hold / Suspended', colorDot: '🟠' },
  { value: 'PENDING', label: 'Pending / Received', colorDot: '🟡' },
];

const AVAILABLE_DIVISIONS: { code: DivisionCode; name: string }[] = [
  { code: 'ORD', name: 'ORD - Office of the Regional Director' },
  { code: 'AD', name: 'AD - Administrative Division' },
  { code: 'LAOD', name: 'LAOD - Local Assessment Operations Division' },
  { code: 'LTOD', name: 'LTOD - Local Treasury Operations Division' },
  { code: 'FD', name: 'FD - Financial Division' },
  { code: 'LU', name: 'LU - Legal Division / Unit' },
];

@Component({
  selector: 'app-route-document',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    AppModalLayerComponent,
    ManagedOptionsSelectComponent,
  ],
  styleUrl: './route-document.component.scss',
  templateUrl: './route-document.component.html',
})
export class RouteDocumentComponent implements OnChanges {
  @Input() document: DocumentRecord | null = null;
  @Input() isOpen = false;
  @Input() currentUser!: User;
  @Input() users: User[] = [];
  @Input() onClose: () => void = () => {};
  @Input() onSubmit: (result: any) => Promise<any> = () => Promise.resolve();

  private api = inject(ApiService);

  routeMode: 'FORWARD' | 'COMPLETE' = 'FORWARD';
  toDivision: DivisionCode | 'ALL' | '' = '';
  additionalDivisions: DivisionCode[] = [];
  showAddDivision = false;
  selectedUserIds: string[] = [];
  actionRequested = 'Appropriate Action';
  remarks = '';
  newStatus: string = 'IN_PROGRESS';
  handoffInstructions = '';
  replyFile: File | null = null;
  isUploadingReply = false;
  isSubmitting = false;
  private submitting = false;
  formError = '';

  readonly actionOptions = ACTION_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;
  readonly availableDivisions = AVAILABLE_DIVISIONS;

  setRouteMode(mode: 'FORWARD' | 'COMPLETE'): void {
    this.routeMode = mode;
    if (mode === 'COMPLETE') {
      this.newStatus = 'COMPLETED';
    } else if (this.newStatus === 'COMPLETED') {
      this.newStatus = 'IN_PROGRESS';
    }
  }

  onStatusChange(status: string): void {
    this.newStatus = status;
    if (status === 'COMPLETED') {
      this.routeMode = 'COMPLETE';
    } else {
      this.routeMode = 'FORWARD';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] || changes['isOpen']) {
      this.routeMode = 'FORWARD';
      this.selectedUserIds = [];
      this.toDivision = '';
      this.additionalDivisions = [];
      this.showAddDivision = false;
      this.replyFile = null;
      this.remarks = '';
      this.handoffInstructions = '';
      this.newStatus = 'IN_PROGRESS';
      this.formError = '';
    }
  }

  get allEmployees(): EmployeeProfile[] {
    return (this.users || [])
      .filter((user) => user.active && user.role !== 'SYSTEM_ADMIN' && user.divisionCode !== 'ITMS')
      .map((user) => ({
        id: user.id,
        fullName: user.fullName,
        position: user.designation || user.role,
        office: 'BLGF Regional Office II',
        officeType: 'BLGF' as EmployeeProfile['officeType'],
        divisionCode: user.divisionCode,
        email: user.email,
        contactNo: user.contactNo,
        address: '',
        active: user.active,
        createdAt: user.createdAt,
      }));
  }

  get selectableEmployees(): EmployeeProfile[] {
    return this.allEmployees.filter((emp) => !this.alreadyRouted(emp));
  }

  get blgfEmployees(): EmployeeProfile[] {
    return this.allEmployees.filter((e) => e.officeType === 'BLGF' && e.active !== false);
  }

  get lguEmployees(): EmployeeProfile[] {
    return this.allEmployees.filter(
      (e) => ['PROVINCIAL_TREASURER', 'MUNICIPAL_TREASURER', 'LGU'].includes(e.officeType) && e.active !== false,
    );
  }

  get otherAgencyEmployees(): EmployeeProfile[] {
    return this.allEmployees.filter((e) => e.officeType === 'OTHER_AGENCIES' && e.active !== false);
  }

  get alreadyRoutedEmployees(): EmployeeProfile[] {
    return this.allEmployees.filter((emp) => this.alreadyRouted(emp));
  }

  get alreadyRoutedNames(): string {
    return this.alreadyRoutedEmployees.map((emp) => emp.fullName).join(', ');
  }

  get isEnded(): boolean {
    if (!this.document || !this.currentUser) return false;
    return this.document.currentStatus === 'COMPLETED' || hasCompletedPart(this.document, this.currentUser);
  }

  get canManageOptions(): boolean {
    if (!this.currentUser) return false;
    return (
      this.currentUser.role === 'SYSTEM_ADMIN' ||
      Boolean(
        (this.currentUser.permissions || DEFAULT_ROLE_PERMISSIONS[this.currentUser.role]).allowedActions?.includes(
          'WORKFLOW_OPTION_MANAGE',
        ),
      )
    );
  }

  get filteredAdditionalDivisions(): { code: DivisionCode; name: string }[] {
    return AVAILABLE_DIVISIONS.filter(
      (div) => div.code !== this.toDivision && !this.additionalDivisions.includes(div.code),
    );
  }

  get allSelectableSelected(): boolean {
    return (
      this.selectableEmployees.length > 0 &&
      this.selectableEmployees.every((emp) => this.selectedUserIds.includes(emp.id))
    );
  }

  get reviewSendTo(): string {
    if (this.newStatus === 'COMPLETED') {
      return 'Outcome: Complete your part. Other recipients can continue until their parts are completed.';
    }
    const names = this.selectedUserIds
      .map((id) => this.findEmployee(id)?.fullName || 'Unknown recipient')
      .join(', ');
    return `Send to: ${names || 'No recipients selected'}`;
  }

  alreadyRouted(employee: EmployeeProfile): boolean {
    return Boolean(findPreviousDelivery(this.document, employee));
  }

  findEmployee(id: string): EmployeeProfile | undefined {
    return this.allEmployees.find((emp) => emp.id === id);
  }

  formatStatus(status: string): string {
    return status ? status.replaceAll('_', ' ').toLowerCase() : '';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  onDivisionChange(event: Event): void {
    const division = (event.target as HTMLSelectElement).value as DivisionCode | 'ALL' | '';
    this.toDivision = division;
    this.additionalDivisions = [];
    if (!division) {
      this.selectedUserIds = [];
      return;
    }
    if (division === 'ALL') {
      this.additionalDivisions = AVAILABLE_DIVISIONS.map((item) => item.code);
      this.selectedUserIds = this.selectableEmployees.filter((emp) => emp.active !== false).map((emp) => emp.id);
      this.showAddDivision = false;
      return;
    }
    this.selectedUserIds = this.selectableEmployees
      .filter((emp) => emp.active !== false && emp.divisionCode === division)
      .map((emp) => emp.id);
  }

  onAddDivisionChange(event: Event): void {
    const division = (event.target as HTMLSelectElement).value as DivisionCode;
    if (division && division !== this.toDivision && !this.additionalDivisions.includes(division)) {
      this.additionalDivisions = [...this.additionalDivisions, division];
      const divisionUserIds = this.selectableEmployees
        .filter((emp) => emp.active !== false && emp.divisionCode === division)
        .map((emp) => emp.id);
      this.selectedUserIds = [...new Set([...this.selectedUserIds, ...divisionUserIds])];
    }
    this.showAddDivision = false;
  }

  removeAdditionalDivision(division: DivisionCode): void {
    this.additionalDivisions = this.additionalDivisions.filter((item) => item !== division);
    const divisionUserIds = new Set(
      this.selectableEmployees.filter((emp) => emp.divisionCode === division).map((emp) => emp.id),
    );
    this.selectedUserIds = this.selectedUserIds.filter((id) => !divisionUserIds.has(id));
  }

  onRecipientSelect(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (!val) return;
    const emp = this.allEmployees.find((e) => e.id === val);
    if (emp && !this.alreadyRouted(emp)) {
      if (!this.selectedUserIds.includes(emp.id)) {
        this.selectedUserIds = [...this.selectedUserIds, emp.id];
      }
    }
    (event.target as HTMLSelectElement).value = '';
  }

  toggleSelectAll(): void {
    this.toDivision = '';
    const allActiveUserIds = this.selectableEmployees.filter((emp) => emp.active !== false).map((emp) => emp.id);
    const allSelected = allActiveUserIds.length > 0 && allActiveUserIds.every((id) => this.selectedUserIds.includes(id));
    this.selectedUserIds = allSelected ? [] : allActiveUserIds;
  }

  removeRecipient(id: string): void {
    this.toDivision = '';
    this.selectedUserIds = this.selectedUserIds.filter((userId) => userId !== id);
  }

  onReplyFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.replyFile = input.files?.[0] || null;
  }

  removeReplyFile(event: Event): void {
    event.preventDefault();
    this.replyFile = null;
  }

  getSubmitLabel(): string {
    if (this.isSubmitting && !this.isUploadingReply) return 'Saving, please wait...';
    if (this.isUploadingReply) return 'Uploading Reply...';
    if (this.newStatus === 'COMPLETED') return 'Complete & Finalize Transaction';
    if (this.selectedUserIds.length === 0) return 'Select Recipient to Route';
    return `Forward & Route (${this.selectedUserIds.length} Recipient${this.selectedUserIds.length === 1 ? '' : 's'})`;
  }

  isSubmitDisabled(): boolean {
    if (!this.document || !this.currentUser) return true;
    if (this.isEnded) return true;
    if (this.isSubmitting || this.isUploadingReply) return true;
    if (this.newStatus === 'COMPLETED') return !this.handoffInstructions.trim();
    if (this.newStatus !== 'COMPLETED' && this.selectedUserIds.length === 0) return true;
    return false;
  }

  async handleSubmit(): Promise<void> {
    if (!this.document || this.submitting) return;
    this.formError = '';

    if (this.document.currentStatus === 'COMPLETED' || hasCompletedPart(this.document, this.currentUser)) {
      this.formError = 'Your part or this transaction has ended. Further routing is not allowed.';
      return;
    }

    const duplicateRecipients = this.allEmployees.filter(
      (emp) => this.selectedUserIds.includes(emp.id) && this.alreadyRouted(emp),
    );
    if (duplicateRecipients.length && this.newStatus !== 'COMPLETED') {
      this.formError = `Already routed to ${duplicateRecipients.map((emp) => emp.fullName).join(', ')}. Remove these recipients before sending.`;
      return;
    }

    if (this.newStatus !== 'COMPLETED' && this.selectedUserIds.length === 0) {
      alert('Select at least one active user account as recipient.');
      return;
    }
    if (this.newStatus === 'COMPLETED' && !this.handoffInstructions.trim()) {
      alert('Enter the completion and document handoff instructions.');
      return;
    }
    if (this.newStatus === 'COMPLETED' && !this.actionRequested) {
      this.actionRequested = 'Completed & Finalized';
    } else if (!this.actionRequested) {
      alert('Select an Action Requested before routing.');
      return;
    }
    if (!this.newStatus) {
      alert('Select a Document Lifecycle Status before routing.');
      return;
    }

    this.submitting = true;
    this.isSubmitting = true;
    try {
      const recipients = (this.newStatus === 'COMPLETED' ? [] : this.selectedUserIds)
        .map((id) => this.allEmployees.find((emp) => emp.id === id))
        .filter((emp): emp is EmployeeProfile => Boolean(emp))
        .map((emp) => ({
          toUserId: emp.id,
          toUser: emp.fullName,
          toDivision: (emp.divisionCode || this.toDivision || this.document!.currentDivision) as DivisionCode,
        }));
      const primaryRecipient = recipients[0];

      let replyAttachments = undefined;
      if (this.replyFile) {
        if (!isReplyAttachment(this.replyFile)) {
          alert('Use a PDF, JPEG, or PNG reply attachment.');
          return;
        }
        if (this.replyFile.size > 7 * 1024 * 1024) {
          alert('The reply attachment exceeds the 7 MB attachment limit.');
          return;
        }
        this.isUploadingReply = true;
        try {
          const storedFile = await firstValueFrom(
            this.api.uploadToStorage('documentAttachments', this.replyFile),
          );
          replyAttachments = [
            {
              id: `route-file-${Date.now()}`,
              fileName: this.replyFile.name,
              fileSize: `${(this.replyFile.size / (1024 * 1024)).toFixed(2)} MB`,
              fileType: documentFileType(this.replyFile),
              uploadDate: new Date().toISOString(),
              url: storedFile.url,
              fileData: storedFile.fileData,
            },
          ];
        } catch (error: any) {
          alert(`Failed to upload reply attachment: ${error.message}`);
          return;
        } finally {
          this.isUploadingReply = false;
        }
      }

      const saved = await this.onSubmit({
        documentId: this.document!.id,
        routeNo:
          this.document!.routeNo ||
          this.document!.routes?.find((route) => route.routeNo)?.routeNo ||
          '',
        fromDivision: this.document!.currentDivision,
        fromUser: this.currentUser.fullName,
        toDivision:
          (primaryRecipient?.toDivision || this.toDivision || this.document!.currentDivision) as DivisionCode,
        toUser: primaryRecipient?.toUser,
        toUserId: primaryRecipient?.toUserId,
        recipients,
        targetDivisions: recipients.map((r) => r.toDivision),
        actionRequested: this.actionRequested,
        remarks:
          this.newStatus === 'COMPLETED'
            ? `Handoff Instructions: ${this.handoffInstructions.trim()}`
            : this.remarks,
        newStatus: this.newStatus,
        actingUserId: this.currentUser.id,
        actingUserName: this.currentUser.fullName,
        actingUserRole: this.currentUser.role,
        replyAttachments,
      });

      if (saved !== false) this.onClose();
      else this.formError = 'The document was not routed. Review the error and recipients, then try again.';
    } catch (error: any) {
      this.formError = error instanceof Error ? error.message : 'Unable to route the document. Please try again.';
    } finally {
      this.submitting = false;
      this.isSubmitting = false;
    }
  }
}
