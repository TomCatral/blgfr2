import { Component, Input, inject, OnInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutocompleteFieldComponent } from '../../ui/autocomplete-field.component';
import { AppModalLayerComponent } from '../../ui/modal-layer.component';
import { ApiService } from '../../../services/api.service';
import { showConfirm } from '../../../services/dialog.service';
import { UiService } from '../../../services/ui.service';
import { DocumentRecord, User, EmployeeProfile } from '../../../types';

export type EnvelopeSize = 'NO10' | 'DL' | 'CUSTOM';

export interface EnvelopeAddressee {
  id: string;
  name: string;
  position: string;
  office: string;
  address: string;
}

export interface EnvelopeSender {
  name: string;
  position: string;
  office: string;
  address: string;
}

export interface SavedEnvelopeFormat {
  id: string;
  name: string;
  subject: string;
  sender?: EnvelopeSender;
  addressees: EnvelopeAddressee[];
}

@Component({
  selector: 'app-outgoing-envelope',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, FormsModule, AutocompleteFieldComponent, AppModalLayerComponent],
  styleUrl: './outgoing-envelope.component.scss',
  templateUrl: './outgoing-envelope.component.html',
})
export class OutgoingEnvelopeComponent implements OnInit {
  @Input() documents: DocumentRecord[] = [];
  @Input() currentUser!: User;
  @Input() onBack: () => void = () => {};
  @Input() onLogDispatch: (details: string, trackingNumber: string) => Promise<void> | void = () => {};

  private _document: DocumentRecord | null = null;
  @Input()
  get document(): DocumentRecord | null {
    return this._document;
  }
  set document(value: DocumentRecord | null) {
    this._document = value;
    if (value) {
      this.subject = value.subject || value.title || '';
      this.logged = false;
      this.previewIndex = 0;
      if (value.recipientName) {
        this.addressees = [
          {
            id: `addr-${Date.now()}`,
            name: value.recipientName || '',
            position: value.recipientPosition || '',
            office: value.recipientOffice || value.destinationOffice || '',
            address: value.recipientAddress || '',
          },
        ];
      } else {
        this.addressees = [
          {
            id: 'addr-1',
            name: '',
            position: '',
            office: '',
            address: '',
          },
        ];
      }
    }
  }

  @ViewChild('envelopePdfFrame') envelopePdfFrameRef?: ElementRef<HTMLIFrameElement>;

  private api = inject(ApiService);
  private ui = inject(UiService);

  officePlaceholder = 'Office Line 1\nOffice / Department Line 2';
  addressPlaceholder = 'Address Line 1\nAddress Line 2';

  // Envelope Canvas & Sizing
  envelopeSize: EnvelopeSize = 'NO10';
  envelopeWidth = 9.5;
  envelopeHeight = 4.125;
  canvasMode: 'ENVELOPE' | 'CUTOUT' = 'ENVELOPE';
  previewIndex = 0;
  showCustomDimensions = false;

  envelopePdfUrl: string | null = null;
  logged = false;
  subject = '';

  sender: EnvelopeSender = {
    name: '',
    position: '',
    office: 'Bureau of Local Government Finance - Regional Office II',
    address: 'Regional Government Center, Carig Sur, Tuguegarao City, Cagayan',
  };

  addressees: EnvelopeAddressee[] = [
    {
      id: 'addr-manual-1',
      name: '',
      position: '',
      office: '',
      address: '',
    },
  ];

  activeNameField: string | null = null;
  employees: EmployeeProfile[] = this.loadStoredEmployees();
  savedFormats: SavedEnvelopeFormat[] = this.loadStoredFormats();
  formatName = '';
  showSaveFormat = true;
  showSenderDrawer = false;

  // DTS Document Quick-Picker modal state
  showDocPicker = false;
  docSearchQuery = '';
  docFilterType: 'ALL' | 'OUTGOING' | 'IN_PROGRESS' | 'COMPLETED' = 'ALL';

  // Directory Multi-Picker modal state
  showDirPicker = false;
  dirSearchQuery = '';
  dirOfficeFilter: string = 'ALL';
  selectedDirEmployeeIds = new Set<string>();

  get activeDoc(): DocumentRecord | null {
    return this._document;
  }

  get currentPreviewAddressee(): EnvelopeAddressee | null {
    if (!this.addressees || this.addressees.length === 0) return null;
    const clampedIndex = Math.min(Math.max(0, this.previewIndex), this.addressees.length - 1);
    return this.addressees[clampedIndex] || this.addressees[0];
  }

  get envelopeDimensions(): { width: string; height: string } {
    return {
      width: `${Math.max(1, this.envelopeWidth)}in`,
      height: `${Math.max(1, this.envelopeHeight)}in`,
    };
  }

  get subjectSuggestions(): string[] {
    return [
      ...this.documents.flatMap((item) => [item.subject, item.title]),
      ...this.savedFormats.map((format) => format.subject),
    ];
  }

  get printStyles(): string {
    const width = this.envelopeDimensions.width;
    const height = this.envelopeDimensions.height;
    return `@media print {
  html, body {
    width: ${width} !important;
    height: ${height} !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }
  body * { visibility: hidden; }
   .envelope-print-area, .envelope-print-area * { visibility: visible; }
   .envelope-print-area {
     position: absolute;
     left: 0;
     top: 0;
     width: ${width} !important;
     height: auto !important;
     margin: 0 !important;
     padding: 0 !important;
     overflow: visible !important;
   }
   .envelope-page {
     width: ${width} !important;
     height: ${height} !important;
     min-height: 0 !important;
     margin: 0 !important;
     padding: 0.18in !important;
     box-sizing: border-box;
     overflow: hidden;
     break-after: page;
     page-break-after: always;
     border-radius: 0 !important;
   }
   .envelope-page:last-child { break-after: auto; page-break-after: auto; }
  .print\\:hidden { display: none !important; }
  @page {
    size: ${width} ${height};
    margin: 0;
  }
}`;
  }

  positionSuggestions(): string[] {
    return [
      ...this.employees.map((employee) => employee.position || ''),
      ...this.savedFormats.flatMap((format) => format.addressees.map((item) => item.position)),
    ];
  }

  officeSuggestions(): string[] {
    return [
      ...this.employees.map((employee) => employee.office || ''),
      ...this.savedFormats.flatMap((format) => format.addressees.map((item) => item.office)),
    ];
  }

  addressSuggestions(): string[] {
    return [
      ...this.employees.map((employee) => employee.address || ''),
      ...this.savedFormats.flatMap((format) => format.addressees.map((item) => item.address)),
    ];
  }

  ngOnInit(): void {
    if (this.currentUser && !this.sender.name) {
      this.sender.name = this.currentUser.fullName || '';
      this.sender.position = this.currentUser.designation || '';
    }
    this.api.getEmployees().subscribe({
      next: (directoryEmployees) => {
        const activeEmployees = directoryEmployees.filter(
          (employee) => employee.active !== false,
        );
        this.employees = activeEmployees;
        localStorage.setItem('blgf_employees', JSON.stringify(activeEmployees));
      },
      error: () => {},
    });
  }

  // Preview Pagination
  nextPreview(): void {
    if (this.previewIndex < this.addressees.length - 1) {
      this.previewIndex++;
    }
  }

  prevPreview(): void {
    if (this.previewIndex > 0) {
      this.previewIndex--;
    }
  }

  goToPreview(index: number): void {
    if (index >= 0 && index < this.addressees.length) {
      this.previewIndex = index;
    }
  }

  // Document Linker
  openDocPicker(): void {
    this.docSearchQuery = '';
    this.docFilterType = 'ALL';
    this.showDocPicker = true;
  }

  closeDocPicker = (): void => {
    this.showDocPicker = false;
  };

  get filteredDocuments(): DocumentRecord[] {
    const q = (this.docSearchQuery || '').trim().toLowerCase();
    return this.documents.filter((doc) => {
      if (this.docFilterType === 'OUTGOING' && doc.direction !== 'OUTGOING') return false;
      if (this.docFilterType === 'IN_PROGRESS' && doc.currentStatus !== 'IN_PROGRESS') return false;
      if (this.docFilterType === 'COMPLETED' && doc.currentStatus !== 'COMPLETED') return false;

      if (!q) return true;
      const haystack = `${doc.trackingNumber || ''} ${doc.routeNo || ''} ${doc.title || ''} ${doc.subject || ''} ${doc.recipientName || ''} ${doc.originatingOffice || ''} ${doc.destinationOffice || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  linkDocument(doc: DocumentRecord): void {
    this._document = doc;
    this.subject = doc.subject || doc.title || '';
    this.logged = false;
    this.previewIndex = 0;

    // Pre-fill recipient if present in the document
    if (doc.recipientName) {
      this.addressees = [
        {
          id: `addr-${Date.now()}`,
          name: doc.recipientName || '',
          position: doc.recipientPosition || '',
          office: doc.recipientOffice || doc.destinationOffice || '',
          address: doc.recipientAddress || '',
        },
      ];
    }

    this.showDocPicker = false;
    this.ui.showSuccess(`Linked document ${doc.routeNo || doc.trackingNumber}`);
  }

  unlinkDocument(): void {
    this._document = null;
    this.ui.showSuccess('Unlinked document. Switched to manual envelope mode.');
  }

  // Directory Multi-Picker
  openDirPicker(): void {
    this.dirSearchQuery = '';
    this.dirOfficeFilter = 'ALL';
    this.selectedDirEmployeeIds.clear();
    this.showDirPicker = true;
  }

  closeDirPicker = (): void => {
    this.showDirPicker = false;
  };

  get filteredEmployees(): EmployeeProfile[] {
    const q = (this.dirSearchQuery || '').trim().toLowerCase();
    return this.employees.filter((emp) => {
      if (this.dirOfficeFilter !== 'ALL' && emp.officeType !== this.dirOfficeFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = `${emp.fullName || ''} ${emp.position || ''} ${emp.office || ''} ${emp.address || ''} ${emp.officeType || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  isEmployeeSelected(id: string): boolean {
    return this.selectedDirEmployeeIds.has(id);
  }

  toggleEmployeeSelection(id: string): void {
    if (this.selectedDirEmployeeIds.has(id)) {
      this.selectedDirEmployeeIds.delete(id);
    } else {
      this.selectedDirEmployeeIds.add(id);
    }
  }

  selectAllFilteredEmployees(): void {
    this.filteredEmployees.forEach((emp) => this.selectedDirEmployeeIds.add(emp.id));
  }

  clearSelectedEmployees(): void {
    this.selectedDirEmployeeIds.clear();
  }

  confirmImportFromDirectory(): void {
    if (this.selectedDirEmployeeIds.size === 0) {
      this.ui.showError('Please select at least one contact from the directory.');
      return;
    }

    const selectedEmployees = this.employees.filter((emp) =>
      this.selectedDirEmployeeIds.has(emp.id),
    );

    const newAddressees: EnvelopeAddressee[] = selectedEmployees.map((emp) => ({
      id: `addr-dir-${emp.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: emp.fullName,
      position: emp.position || '',
      office: emp.office || '',
      address: emp.address || '',
    }));

    // If the only addressee is empty, replace it
    const isFirstEmpty =
      this.addressees.length === 1 &&
      !this.addressees[0].name.trim() &&
      !this.addressees[0].position.trim() &&
      !this.addressees[0].office.trim();

    if (isFirstEmpty) {
      this.addressees = newAddressees;
    } else {
      this.addressees = [...this.addressees, ...newAddressees];
    }

    this.showDirPicker = false;
    this.selectedDirEmployeeIds.clear();
    this.ui.showSuccess(`Added ${newAddressees.length} recipient(s) from Office Directory.`);
  }

  // Sender Presets
  applySenderDivision(division: string): void {
    switch (division) {
      case 'ORD':
        this.sender.office = 'Office of the Regional Director - BLGF Regional Office II';
        break;
      case 'LTOD':
        this.sender.office = 'Local Treasury Operations Division - BLGF Regional Office II';
        break;
      case 'LAOD':
        this.sender.office = 'Local Assessment Operations Division - BLGF Regional Office II';
        break;
      case 'AD':
        this.sender.office = 'Administrative Division - BLGF Regional Office II';
        break;
      case 'FD':
        this.sender.office = 'Financial Division - BLGF Regional Office II';
        break;
      case 'LU':
        this.sender.office = 'Legal Unit - BLGF Regional Office II';
        break;
      default:
        this.sender.office = 'Bureau of Local Government Finance - Regional Office II';
    }
  }

  // Addressees Management
  addAddressee(): void {
    const newId = `addr-${Date.now()}`;
    this.addressees = [
      ...this.addressees,
      {
        id: newId,
        name: '',
        position: '',
        office: '',
        address: '',
      },
    ];
    this.previewIndex = this.addressees.length - 1;
  }

  duplicateAddressee(addr: EnvelopeAddressee): void {
    const newId = `addr-${Date.now()}`;
    this.addressees = [
      ...this.addressees,
      {
        id: newId,
        name: addr.name,
        position: addr.position,
        office: addr.office,
        address: addr.address,
      },
    ];
    this.previewIndex = this.addressees.length - 1;
    this.ui.showSuccess('Recipient duplicated.');
  }

  updateAddressee(id: string, field: keyof EnvelopeAddressee, value: string): void {
    this.addressees = this.addressees.map((a: EnvelopeAddressee) =>
      a.id === id ? { ...a, [field]: value } : a,
    );
  }

  removeAddressee(id: string): void {
    if (this.addressees.length <= 1) {
      this.ui.showError('You must have at least one addressee.');
      return;
    }
    const idx = this.addressees.findIndex((a) => a.id === id);
    this.addressees = this.addressees.filter((a: EnvelopeAddressee) => a.id !== id);
    if (this.previewIndex >= this.addressees.length) {
      this.previewIndex = Math.max(0, this.addressees.length - 1);
    }
  }

  selectEmployeeForAddressee(addresseeId: string, employee: EmployeeProfile): void {
    this.addressees = this.addressees.map((addressee: EnvelopeAddressee) =>
      addressee.id === addresseeId
        ? {
            ...addressee,
            name: employee.fullName,
            position: employee.position || '',
            office: employee.office || '',
            address: employee.address || '',
          }
        : addressee,
    );
    this.activeNameField = null;
  }

  nameSuggestions(addresseeId: string): EmployeeProfile[] {
    const addressee = this.addressees.find((a) => a.id === addresseeId);
    if (!addressee) return [];
    const query = addressee.name.trim().toLowerCase();
    return this.employees
      .filter((employee) =>
        `${employee.fullName} ${employee.position} ${employee.office}`
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 8);
  }

  onNameFocus(id: string): void {
    this.activeNameField = id;
  }

  onNameBlur(id: string): void {
    window.setTimeout(() => {
      if (this.activeNameField === id) this.activeNameField = null;
    }, 150);
  }

  onNameInput(id: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.updateAddressee(id, 'name', value);
    this.activeNameField = id;
  }

  onPickEmployee(event: Event, id: string, employee: EmployeeProfile): void {
    event.preventDefault();
    this.selectEmployeeForAddressee(id, employee);
  }

  selectEnvelopeSize(size: EnvelopeSize): void {
    this.envelopeSize = size;
    if (size === 'NO10') {
      this.envelopeWidth = 9.5;
      this.envelopeHeight = 4.125;
      this.showCustomDimensions = false;
    } else if (size === 'DL') {
      this.envelopeWidth = 8.66;
      this.envelopeHeight = 4.33;
      this.showCustomDimensions = false;
    } else if (size === 'CUSTOM') {
      this.showCustomDimensions = true;
    }
  }

  onWidthInput(event: Event): void {
    this.envelopeWidth = Number((event.target as HTMLInputElement).value) || 1;
    this.envelopeSize = 'CUSTOM';
  }

  onHeightInput(event: Event): void {
    this.envelopeHeight = Number((event.target as HTMLInputElement).value) || 1;
    this.envelopeSize = 'CUSTOM';
  }

  onSenderInput(field: keyof EnvelopeSender, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.sender = { ...this.sender, [field]: value };
  }

  onFormatNameInput(event: Event): void {
    this.formatName = (event.target as HTMLInputElement).value;
  }

  validateEnvelopeFields(): boolean {
    if (!this.subject.trim()) {
      this.ui.showError('Please fill in Subject / Reference.');
      return false;
    }
    if (!this.addressees.length) {
      this.ui.showError('Please add at least one addressee.');
      return false;
    }
    const incompleteIndex = this.addressees.findIndex(
      (item) =>
        !item.name.trim() ||
        !item.position.trim() ||
        !item.office.trim() ||
        !item.address.trim(),
    );
    if (incompleteIndex >= 0) {
      this.previewIndex = incompleteIndex;
      this.ui.showError(
        `Please complete Full Name, Position, Office / Department, and Address for Addressee #${incompleteIndex + 1}.`,
      );
      return false;
    }
    return true;
  }

  validateSenderFields(): boolean {
    if (
      !this.sender.name.trim() ||
      !this.sender.position.trim() ||
      !this.sender.office.trim() ||
      !this.sender.address.trim()
    ) {
      this.showSenderDrawer = true;
      this.ui.showError(
        'Please complete the FROM Name, Position, Office, and Address before printing the FROM/TO.',
      );
      return false;
    }
    return true;
  }

  saveCurrentFormat(): void {
    if (!this.validateEnvelopeFields()) return;
    if (!this.formatName.trim()) {
      this.ui.showError('Please fill in the format name.');
      return;
    }
    const newFormat: SavedEnvelopeFormat = {
      id: `fmt-${Date.now()}`,
      name: this.formatName,
      subject: this.subject,
      sender: this.sender,
      addressees: this.addressees,
    };
    const updated = [...this.savedFormats, newFormat];
    this.savedFormats = updated;
    localStorage.setItem('blgf_envelope_formats', JSON.stringify(updated));
    this.formatName = '';
    this.showSaveFormat = true;
    this.ui.showSuccess('Envelope format saved successfully!');
  }

  toggleTemplates(): void {
    this.showSaveFormat = !this.showSaveFormat;
    if (this.showSaveFormat) {
      setTimeout(() => {
        document.getElementById('envelope-templates-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  loadFormat(fmt: SavedEnvelopeFormat): void {
    this.subject = fmt.subject;
    if (fmt.sender) this.sender = fmt.sender;
    this.addressees = fmt.addressees;
    this.previewIndex = 0;
    this.ui.showSuccess(`Loaded template "${fmt.name}"`);
  }

  async deleteFormat(id: string): Promise<void> {
    if (await showConfirm('Delete this saved format template?')) {
      const updated = this.savedFormats.filter((f: SavedEnvelopeFormat) => f.id !== id);
      this.savedFormats = updated;
      localStorage.setItem('blgf_envelope_formats', JSON.stringify(updated));
      this.ui.showSuccess('Template removed.');
    }
  }

  async recordDispatch(): Promise<boolean> {
    const dispatchDetails = [
      ...this.addressees.flatMap((addressee, index) => [
        `Recipient ${index + 1}: ${addressee.name}`,
        `Office ${index + 1}: ${addressee.office}`,
      ]),
      `Subject: ${this.subject}`,
      `Printed by: ${this.currentUser?.fullName || 'System User'}`,
    ];

    const tracking = this.activeDoc?.routeNo || this.activeDoc?.trackingNumber || 'MANUAL-DISPATCH';

    try {
      await this.onLogDispatch(
        dispatchDetails.join(' | '),
        tracking,
      );
      this.logged = true;
      this.ui.showSuccess(`Dispatch recorded under tracking: ${tracking}`);
      return true;
    } catch (error) {
      console.error('Unable to record envelope log:', error);
      return false;
    }
  }

  closeEnvelopePdf(): void {
    if (this.envelopePdfUrl) URL.revokeObjectURL(this.envelopePdfUrl);
    this.envelopePdfUrl = null;
  }

  async printPreparedEnvelope(): Promise<void> {
    try {
      const printWindow = this.envelopePdfFrameRef?.nativeElement.contentWindow;
      if (!printWindow) {
        throw new Error('Envelope PDF is not ready.');
      }
      printWindow.focus();
      printWindow.print();
      if (!this.logged) {
        await this.recordDispatch();
      }
    } catch {
      this.ui.showError('Unable to open the envelope print dialog. No dispatch log was saved.');
    }
  }

  printEnvelopeDirectly(): void {
    if (!this.validateEnvelopeFields()) return;
    try {
      this.closeEnvelopePdf();
      if (!this.logged) void this.recordDispatch();
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          try {
            window.print();
          } catch {
            this.ui.showError('Unable to open the envelope print dialog.');
          }
        });
      });
    } catch {
      this.ui.showError('Unable to open the envelope print dialog.');
    }
  }

  escapePrintText(value: string): string {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return value.replace(/[&<>'"]/g, (character) => replacements[character] || character);
  }

  printFromToCutOut(): void {
    if (!this.validateEnvelopeFields()) return;
    if (!this.validateSenderFields()) return;
    if (!this.logged) void this.recordDispatch();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.ui.showError('Please allow pop-ups to print the FROM/TO cut-out labels.');
      return;
    }

    const safeSenderName = this.escapePrintText(this.sender.name.trim());
    const safeSenderDesignation = this.escapePrintText(this.sender.position.trim());
    const safeSenderOffice = this.escapePrintText(this.sender.office.trim());
    const safeSenderAddress = this.escapePrintText(this.sender.address.trim());
    const pageRule = 'size: A4 portrait; margin: 12mm;';
    const pageWidth = '150mm';
    const pageHeight = '88mm';
    const pageRows = '44mm 44mm';
    const labelPadding = '4mm 9mm';
    const labelFontSize = '9pt';
    const pages = this.addressees
      .map(
        (addressee) => `
          <article class="half-bond-page">
            <section class="cut-label from-label">
              <div class="label-heading">FROM:</div>
              <div class="name">${safeSenderName}</div>
              <div>${safeSenderDesignation}</div>
              <div>${safeSenderOffice}</div>
              <div>${safeSenderAddress}</div>
            </section>
            <section class="cut-label to-label">
              <div class="label-heading">TO:</div>
              <div class="name">${this.escapePrintText(addressee.name)}</div>
              <div>${this.escapePrintText(addressee.position)}</div>
              <div>${this.escapePrintText(addressee.office)}</div>
              <div>${this.escapePrintText(addressee.address)}</div>
            </section>
          </article>`,
      )
      .join('');

    printWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>BLGF FROM and TO Cut-Out Labels</title>
          <style>
            @page { ${pageRule} }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111; background: #fff; }
            body { width: auto; }
            .half-bond-page { width: ${pageWidth}; height: ${pageHeight}; display: grid; grid-template-rows: ${pageRows}; margin: 16mm auto 0; break-after: page; page-break-after: always; overflow: hidden; }
            .half-bond-page:last-child { break-after: auto; page-break-after: auto; }
            .cut-label { position: relative; display: flex; flex-direction: column; justify-content: center; border: 1.5px dashed #444; padding: ${labelPadding}; font-size: ${labelFontSize}; line-height: 1.2; }
            .to-label { padding-left: 23mm; }
            .label-heading { position: absolute; left: 4mm; top: 3mm; font-size: 8pt; font-weight: 800; letter-spacing: .08em; }
            .name { font-size: 10pt; font-weight: 800; text-transform: uppercase; }
            @media screen { body { min-height: 297mm; padding: 12px; background: #e5e7eb; } .half-bond-page { background: white; box-shadow: 0 2px 12px #a1a1aa; } }
          </style>
        </head>
        <body>${pages}
          <script>
            window.onload = function () { window.print(); window.close(); };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  private loadStoredEmployees(): EmployeeProfile[] {
    try {
      const stored = localStorage.getItem('blgf_employees');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed)
          ? parsed.filter((item: EmployeeProfile) => item && typeof item.fullName === 'string')
          : [];
      }
    } catch (e) {}
    return [];
  }

  private loadStoredFormats(): SavedEnvelopeFormat[] {
    try {
      const stored = localStorage.getItem('blgf_envelope_formats');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed)
          ? parsed.filter(
              (item: SavedEnvelopeFormat) =>
                item && typeof item.name === 'string' && Array.isArray(item.addressees),
            )
          : [];
      }
    } catch (e) {}
    return [];
  }
}
