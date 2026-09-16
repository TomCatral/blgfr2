import { Component, Input, signal, computed, OnInit, OnChanges, SimpleChanges, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClsPipe } from '../../../shared/cls.pipe';
import { cx } from '../../../shared/class-utils';
import {
  DocumentRecord,
  DocumentRouteStep,
  User,
  DivisionCode,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../../types';
import { formatDate } from '../../../utils/status-utils';
import { showConfirm } from '../../../services/dialog.service';

interface PrintFormatPreset {
  id: string;
  name: string;
  isDefault?: boolean;
  docClass?: string;
  docNo?: string;
  senderName?: string;
  senderOffice?: string;
  senderPosition?: string;
  rdName?: string;
  rdPosition?: string;
  receivedBy?: string;
  subjectMatter?: string;
  assignedTo?: { [key: string]: boolean };
  forActions?: { [key: string]: boolean };
  specialInstructionsText?: string;
}

interface GroupedRoute extends DocumentRouteStep {
  recipientNames: string[];
  groupKey?: string;
}

const ROUTING_SLIP_DIVISIONS: { code: DivisionCode; label: string }[] = [
  { code: 'ORD', label: 'Office of the Regional Director' },
  { code: 'AD', label: 'Administrative Division' },
  { code: 'LAOD', label: 'Local Assessment Operations Division' },
  { code: 'LTOD', label: 'Local Treasury Operations Division' },
  { code: 'FD', label: 'Financial Division' },
  { code: 'LU', label: 'Legal Division / Unit' },
];

const ROUTING_SLIP_ACTIONS = [
  'Appropriate Action',
  'Approval',
  'Return with/without action',
  'Confer with RD',
  'Verify /analyze reports',
  'Please indorse/refer/forward',
  'Furnish Copy',
  'File',
];

const DEFAULT_PRESETS: PrintFormatPreset[] = [
  {
    id: 'FORMAT_1',
    name: 'Format 1: BLGF Default (Half A4)',
    isDefault: true,
    senderName: 'ATTY. VERNON S. TALATTAG',
    senderOffice: 'BLGF RO2',
    senderPosition: 'Division Chief',
    rdName: 'ATTY. JULAIDA T. CADDAWAN-PANCHO',
    rdPosition: 'Regional Director',
    receivedBy: 'jay-ann',
    assignedTo: {
      'Office of the Regional Director': false,
      'Administrative Division': true,
      'Local Assessment Operations Division': false,
      'Local Treasury Operations Division': false,
      'Financial Division': false,
      'Legal Division / Unit': false,
    },
    forActions: {
      'Appropriate Action': true,
      Approval: false,
      'Return with/without action': false,
      'Confer with RD': false,
      'Verify /analyze reports': false,
      'Please indorse/refer/forward': false,
      'Furnish Copy': false,
      File: false,
      'Special Instructions': false,
    },
  },
  {
    id: 'FORMAT_2',
    name: 'Format 2: Regional Director Executive',
    senderName: 'ATTY. JULAIDA T. CADDAWAN-PANCHO',
    senderOffice: 'Office of the Regional Director (ORD)',
    senderPosition: 'Regional Director',
    rdName: 'ATTY. JULAIDA T. CADDAWAN-PANCHO',
    rdPosition: 'Regional Director',
    receivedBy: 'ord-records',
    assignedTo: {
      'Office of the Regional Director': true,
      'Administrative Division': true,
      'Local Assessment Operations Division': true,
      'Local Treasury Operations Division': true,
      'Financial Division': true,
      'Legal Division / Unit': true,
    },
    forActions: {
      'Appropriate Action': true,
      Approval: true,
      'Confer with RD': true,
      'Return with/without action': false,
      'Verify /analyze reports': false,
      'Please indorse/refer/forward': false,
      'Furnish Copy': false,
      File: false,
      'Special Instructions': false,
    },
  },
  {
    id: 'FORMAT_3',
    name: 'Format 3: Division Action Memorandum',
    senderName: 'DIVISION CHIEF / OIC',
    senderOffice: 'BLGF RO2 Operating Division',
    senderPosition: 'Division Chief',
    rdName: 'ATTY. JULAIDA T. CADDAWAN-PANCHO',
    rdPosition: 'Regional Director',
    receivedBy: 'div-handler',
    assignedTo: {
      'Office of the Regional Director': false,
      'Administrative Division': false,
      'Local Assessment Operations Division': false,
      'Local Treasury Operations Division': false,
      'Financial Division': true,
      'Legal Division / Unit': false,
    },
    forActions: {
      'Verify /analyze reports': true,
      'Appropriate Action': true,
      Approval: false,
      'Return with/without action': false,
      'Confer with RD': false,
      'Please indorse/refer/forward': false,
      'Furnish Copy': false,
      File: false,
      'Special Instructions': false,
    },
  },
];

@Component({
  selector: 'app-document-slip',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [FormsModule, NgClass, ClsPipe],
  styleUrl: './document-slip.component.scss',
  templateUrl: './document-slip.component.html',
})
export class DocumentSlipComponent implements OnInit, OnChanges {
  @Input() document: DocumentRecord | null = null;
  @Input() documents: DocumentRecord[] = [];
  @Input() currentUser!: User;
  @Input() users: User[] = [];
  @Input() onSelectDocument: (doc: DocumentRecord) => void = () => {};
  @Input() onBack: () => void = () => {};

  routingSlipDivisions = ROUTING_SLIP_DIVISIONS;
  routingSlipActions = ROUTING_SLIP_ACTIONS;

  documentSearch = signal('');
  routingBy = signal('');
  routingHistoryText = signal('');
  slipLayout = signal<'full' | 'simplified'>('simplified');
  docClass = signal('2026-1-005');
  docNo = signal('');
  senderName = signal('ATTY. VERNON S. TALATTAG');
  senderOffice = signal('BLGF RO2');
  senderPosition = signal('Division Chief');
  dateStr = signal('Jan 05, 2026');
  timeStr = signal('');
  receivedBy = signal('jay-ann');
  subjectMatter = signal('PDS as of Jan 05, 2026');
  rdName = signal('ATTY. JULAIDA T. CADDAWAN-PANCHO');
  rdPosition = signal('Regional Director');
  assignedTo = signal<{ [key: string]: boolean }>({
    'Financial Analysis': false,
    Treasury: false,
    Assessment: false,
    Legal: false,
    Administrative: false,
  });
  forActions = signal<{ [key: string]: boolean }>({
    'Appropriate Action': false,
    Approval: false,
    'Return with/without action': false,
    'Confer with RD': false,
    'Verify /analyze reports': false,
    'Please indorse/refer/forward': false,
    'Furnish Copy': false,
    File: false,
    'Special Instructions': false,
  });
  specialInstructionsText = signal('');
  isCustomizeOpen = signal(false);
  signatoryFormats = signal<Array<{ id: string; name: string; signatoryName: string; position: string }>>([]);
  selectedSignatoryFormat = signal('regional-director');
  newSignatoryFormatName = signal('');
  printFormats = signal<PrintFormatPreset[]>(DEFAULT_PRESETS);
  selectedFormat = signal('FORMAT_1');
  newFormatName = signal('');

  selectedDocOverride = signal<DocumentRecord | null>(null);
  highlightedIndex = signal<number>(-1);

  activeDoc = computed(() => this.selectedDocOverride() || this.document || this.documents[0]);

  hasDocumentSearch = computed(() => this.documentSearch().trim().length > 0);

  matchingDocuments = computed(() => {
    const q = this.documentSearch().trim();
    if (!q) return [];
    const lower = q.toLowerCase();
    return this.documents.filter(c =>
      `${c.routeNo} ${c.title} ${c.subject || ''}`.toLowerCase().includes(lower)
    );
  });

  recentDocuments = computed(() => {
    return (this.documents || []).slice(0, 5);
  });

  onSearchInputChange(val: string): void {
    this.documentSearch.set(val);
    this.highlightedIndex.set(val.trim().length > 0 ? 0 : -1);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const matches = this.matchingDocuments();
    if (!matches.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = this.highlightedIndex() + 1;
      this.highlightedIndex.set(next >= matches.length ? 0 : next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = this.highlightedIndex() - 1;
      this.highlightedIndex.set(prev < 0 ? matches.length - 1 : prev);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = this.highlightedIndex() >= 0 && this.highlightedIndex() < matches.length
        ? matches[this.highlightedIndex()]
        : matches[0];
      if (target) {
        this.selectCandidate(target);
      }
    } else if (event.key === 'Escape') {
      this.clearSearch();
    }
  }

  clearSearch(): void {
    this.documentSearch.set('');
    this.highlightedIndex.set(-1);
  }

  selectCandidate(candidate: DocumentRecord): void {
    this.selectedDocOverride.set(candidate);
    this.onSelectDocument(candidate);
    this.documentSearch.set('');
    this.highlightedIndex.set(-1);
    this.syncWithActiveDoc();

    // Auto-scroll directly to the routing slip canvas
    setTimeout(() => {
      const el = document.getElementById('routingSlipCanvas');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  routedByDisplayName = computed(() => {
    const doc = this.activeDoc();
    if (!doc) return '________________';
    const routes = [...(doc.routes || [])].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return diff || a.stepNumber - b.stepNumber;
    });
    const first = routes[0];
    return this.resolveCurrentUserName(first?.fromUserId, first?.fromUser) || doc.createdBy || doc.senderName || '________________';
  });

  recipientDisplayName = computed(() => {
    const doc = this.activeDoc();
    if (!doc) return '________________';
    const routes = doc.routes || [];
    const last = routes[routes.length - 1];
    return this.resolveCurrentUserName(last?.toUserId || doc.assignedUserId, last?.toUser || doc.assignedUser) || doc.recipientName || '________________';
  });

  latestTransactionDateDisplay = computed(() => {
    const doc = this.activeDoc();
    if (!doc) return '';
    const routes = [...(doc.routes || [])].sort((a, b) => {
      if (b.stepNumber !== a.stepNumber) return b.stepNumber - a.stepNumber;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const latest = routes[0];
    if (!latest?.createdAt) return '';
    return new Date(latest.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  });

  recipientListDisplay = computed(() => {
    const doc = this.activeDoc();
    if (!doc) return this.recipientDisplayName();
    const routes = doc.routes || [];
    const sorted = [...routes].sort((a, b) => {
      if (b.stepNumber !== a.stepNumber) return b.stepNumber - a.stepNumber;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const latest = sorted[0];
    if (!latest) return this.recipientDisplayName();
    const names = Array.from(new Set(
      routes
        .filter(r => r.fromUserId === latest.fromUserId && r.actionRequested === latest.actionRequested && r.createdAt === latest.createdAt)
        .map(r => this.resolveCurrentUserName(r.toUserId, r.toUser))
        .filter((n): n is string => Boolean(n))
    ));
    return names.length > 0 ? names.join(', ') : this.recipientDisplayName();
  });

  sortedVisibleRoutes = computed(() => {
    const doc = this.activeDoc();
    if (!doc) return [];
    const canViewAllRoutes = this.currentUser.permissions?.canViewAllRoutes ??
      DEFAULT_ROLE_PERMISSIONS[this.currentUser.role]?.canViewAllRoutes;
    const routes = (doc.routes || []).filter(r =>
      canViewAllRoutes || r.fromUserId === this.currentUser.id || r.toUserId === this.currentUser.id
    );
    return routes
      .map(r => ({
        ...r,
        fromUser: this.resolveCurrentUserName(r.fromUserId, r.fromUser),
        toUser: this.resolveCurrentUserName(r.toUserId, r.toUser),
      }))
      .sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return diff || a.stepNumber - b.stepNumber;
      });
  });

  groupedVisibleRoutes = computed(() => {
    const sorted = this.sortedVisibleRoutes();
    const doc = this.activeDoc();
    return sorted.reduce<GroupedRoute[]>((groups, route) => {
      const groupKey = `${route.fromUserId || route.fromUser}|${route.actionRequested}|${route.createdAt}`;
      const recipientName = route.toUser || doc?.recipientName || doc?.assignedUser || 'Unassigned';
      const existing = groups.find(g => g.groupKey === groupKey);
      if (existing) {
        if (!existing.recipientNames.includes(recipientName)) {
          existing.recipientNames.push(recipientName);
        }
        return groups;
      }
      groups.push({ ...route, groupKey, recipientNames: [recipientName] });
      return groups;
    }, []);
  });

  resolveCurrentUserName(userId?: string, legacyName?: string): string {
    return this.users.find(u => u.id === userId)?.fullName || legacyName || '';
  }

  ngOnInit(): void {
    const stored = localStorage.getItem('blgf_signatory_formats');
    if (stored) {
      try {
        this.signatoryFormats.set(JSON.parse(stored));
      } catch { /* ignore */ }
    } else {
      this.signatoryFormats.set([{
        id: 'regional-director',
        name: 'Regional Director',
        signatoryName: 'ATTY. JULAIDA T. CADDAWAN-PANCHO',
        position: 'Regional Director',
      }]);
    }
    const storedPrint = localStorage.getItem('blgf_print_formats');
    if (storedPrint) {
      try {
        const parsed = JSON.parse(storedPrint);
        if (Array.isArray(parsed) && parsed.length > 0) this.printFormats.set(parsed);
      } catch { /* ignore */ }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] && changes['document'].currentValue) {
      this.selectedDocOverride.set(null);
    }
    if (changes['document'] || changes['documents'] || changes['users']) {
      this.syncWithActiveDoc();
    }
  }

  private syncWithActiveDoc(): void {
    const doc = this.activeDoc();
    if (!doc) return;
    if (this.slipLayout() === 'simplified') {
      this.docNo.set(doc.routeNo || '');
      this.docClass.set(doc.direction || '');
      this.dateStr.set(doc.dateReceived ? new Date(doc.dateReceived).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '');
      this.timeStr.set(doc.dateReceived ? new Date(doc.dateReceived).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '');
      this.routingBy.set(this.routedByDisplayName());
      this.subjectMatter.set(doc.subject || doc.title || '');
      this.routingHistoryText.set('');
      this.specialInstructionsText.set('');
      this.assignedTo.set(Object.fromEntries(ROUTING_SLIP_DIVISIONS.map(d => [d.label, false])));
      this.forActions.set(Object.fromEntries(ROUTING_SLIP_ACTIONS.map(a => [a, false])));
      return;
    }
    this.docClass.set(doc.direction || '');
    this.senderName.set(doc.senderName || doc.originatingOffice || 'ATTY. VERNON S. TALATTAG');
    this.senderOffice.set(doc.originatingOffice || 'BLGF RO2');
    this.dateStr.set(doc.dateReceived ? new Date(doc.dateReceived).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Jan 05, 2026');
    this.timeStr.set(doc.dateReceived ? new Date(doc.dateReceived).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '');
    this.subjectMatter.set(doc.subject || doc.title || 'PDS as of Jan 05, 2026');
    this.routingBy.set(this.routedByDisplayName());
    this.routingHistoryText.set(
      this.groupedVisibleRoutes()
        .map((route, i) => `${i + 1}. ${route.fromUser} to ${route.recipientNames.join(', ')}\nAction: ${route.actionRequested || 'Appropriate Action'}\n${formatDate(route.createdAt)}`)
        .join('\n\n')
    );
    const routes = doc.routes || [];
    const latest = [...routes].sort((a, b) => {
      if (b.stepNumber !== a.stepNumber) return b.stepNumber - a.stepNumber;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
    const txRoutes = latest ? routes.filter(r =>
      r.fromUserId === latest.fromUserId && r.actionRequested === latest.actionRequested && r.createdAt === latest.createdAt
    ) : [];
    const routedDivisions = new Set(
      txRoutes.length > 0
        ? txRoutes.map(r => {
            const account = this.users.find(u => r.toUserId && u.id === r.toUserId);
            return account?.divisionCode || r.toDivision;
          })
        : [doc.currentDivision]
    );
    this.assignedTo.set(Object.fromEntries(ROUTING_SLIP_DIVISIONS.map(d => [d.label, routedDivisions.has(d.code)])));
    this.forActions.set(Object.fromEntries(ROUTING_SLIP_ACTIONS.map(a => [a, false])));
    if (doc.remarks) {
      this.specialInstructionsText.set(doc.remarks);
    }
  }

  toggleAssigned(key: string): void {
    if (this.slipLayout() !== 'full') return;
    this.assignedTo.set({ ...this.assignedTo(), [key]: !this.assignedTo()[key] });
  }

  toggleForAction(key: string): void {
    if (this.slipLayout() !== 'full') return;
    this.forActions.set({ ...this.forActions(), [key]: !this.forActions()[key] });
  }

  changeLayout(layout: 'full' | 'simplified'): void {
    this.slipLayout.set(layout);
    this.syncWithActiveDoc();
  }

  nbsp(): string {
    return '\u00A0';
  }

  recipientCell(): string {
    return this.slipLayout() === 'full' ? this.recipientListDisplay() : '\u00A0';
  }

  toggleRowClass(): string {
    return cx(
      'flex items-center space-x-1.5 select-none py-0.5',
      this.slipLayout() === 'full' ? 'cursor-pointer hover:text-slate-700' : 'cursor-default',
    );
  }

  labelClass(checked: boolean): string {
    return checked ? 'text-[10.5px] font-black text-slate-900' : 'text-[10.5px] font-medium text-slate-700';
  }

  pickOptionClass(candidate: DocumentRecord): string {
    return cx(
      'document-slip-picker-option flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800',
      this.activeDoc()?.id === candidate.id ? 'bg-slate-50 dark:bg-blue-950/30' : '',
    );
  }

  handlePrint(): void {
    const originalTitle = window.document.title;
    const restore = () => {
      window.document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.document.title = '';
    window.addEventListener('afterprint', restore);
    window.print();
    window.setTimeout(restore, 1000);
  }

  applySignatoryFormat(formatId: string): void {
    this.selectedSignatoryFormat.set(formatId);
    const fmt = this.signatoryFormats().find(f => f.id === formatId);
    if (!fmt) return;
    this.rdName.set(fmt.signatoryName);
    this.rdPosition.set(fmt.position);
  }

  createSignatoryFormat(): void {
    const name = this.newSignatoryFormatName().trim();
    if (!name || !this.rdName().trim() || !this.rdPosition().trim()) {
      alert('Enter a format name, signatory name, and position.');
      return;
    }
    const fmt = { id: `signatory-${Date.now()}`, name, signatoryName: this.rdName().trim(), position: this.rdPosition().trim() };
    const updated = [...this.signatoryFormats(), fmt];
    this.signatoryFormats.set(updated);
    this.selectedSignatoryFormat.set(fmt.id);
    this.newSignatoryFormatName.set('');
    localStorage.setItem('blgf_signatory_formats', JSON.stringify(updated));
  }

  async deleteSignatoryFormat(): Promise<void> {
    if (this.selectedSignatoryFormat() === 'regional-director') {
      alert('The default Regional Director format cannot be deleted.');
      return;
    }
    const next = this.signatoryFormats().filter(f => f.id !== this.selectedSignatoryFormat());
    this.signatoryFormats.set(next);
    this.applySignatoryFormat('regional-director');
    localStorage.setItem('blgf_signatory_formats', JSON.stringify(next));
  }

  handleSaveCurrentPreset(): void {
    const idx = this.printFormats().findIndex(f => f.id === this.selectedFormat());
    if (idx === -1) return;
    const updated = [...this.printFormats()];
    updated[idx] = {
      ...updated[idx],
      docClass: this.docClass(), docNo: this.docNo(), senderName: this.senderName(),
      senderOffice: this.senderOffice(), senderPosition: this.senderPosition(),
      rdName: this.rdName(), rdPosition: this.rdPosition(), receivedBy: this.receivedBy(),
      subjectMatter: this.subjectMatter(), assignedTo: this.assignedTo(),
      forActions: this.forActions(), specialInstructionsText: this.specialInstructionsText(),
    };
    this.printFormats.set(updated);
    localStorage.setItem('blgf_print_formats', JSON.stringify(updated));
    alert(`Preset "${updated[idx].name}" updated and saved successfully!`);
  }

  handleAddFormat(): void {
    if (!this.newFormatName().trim()) {
      alert('Please enter a name for the new print format preset.');
      return;
    }
    const newFmt: PrintFormatPreset = {
      id: `FORMAT_${Date.now()}`,
      name: this.newFormatName().trim(),
      docClass: this.docClass(), docNo: this.docNo(), senderName: this.senderName(),
      senderOffice: this.senderOffice(), senderPosition: this.senderPosition(),
      rdName: this.rdName(), rdPosition: this.rdPosition(), receivedBy: this.receivedBy(),
      subjectMatter: this.subjectMatter(), assignedTo: this.assignedTo(),
      forActions: this.forActions(), specialInstructionsText: this.specialInstructionsText(),
    };
    const updated = [...this.printFormats(), newFmt];
    this.printFormats.set(updated);
    this.selectedFormat.set(newFmt.id);
    this.newFormatName.set('');
    localStorage.setItem('blgf_print_formats', JSON.stringify(updated));
  }

  async handleDeleteFormat(formatId: string): Promise<void> {
    if (formatId === 'FORMAT_1') {
      alert('Format 1 is the system default layout and cannot be deleted.');
      return;
    }
    const target = this.printFormats().find(f => f.id === formatId);
    if (await showConfirm(`Are you sure you want to delete print preset "${target?.name || formatId}"?`)) {
      const updated = this.printFormats().filter(f => f.id !== formatId);
      this.printFormats.set(updated);
      this.selectedFormat.set('FORMAT_1');
      const def = updated.find(f => f.id === 'FORMAT_1') || DEFAULT_PRESETS[0];
      this.applyPreset(def);
      localStorage.setItem('blgf_print_formats', JSON.stringify(updated));
    }
  }

  async handleResetToDefault(): Promise<void> {
    if (await showConfirm('Reset all fields and routing slip presets back to System Defaults?')) {
      this.selectedFormat.set('FORMAT_1');
      this.printFormats.set(DEFAULT_PRESETS);
      localStorage.setItem('blgf_print_formats', JSON.stringify(DEFAULT_PRESETS));
      const doc = this.activeDoc();
      this.docClass.set(doc?.direction || '');
      this.docNo.set('');
      this.senderName.set(doc?.senderName || 'ATTY. VERNON S. TALATTAG');
      this.senderOffice.set(doc?.originatingOffice || 'BLGF RO2');
      this.senderPosition.set('Division Chief');
      this.rdName.set('ATTY. JULAIDA T. CADDAWAN-PANCHO');
      this.rdPosition.set('Regional Director');
      this.receivedBy.set('jay-ann');
      this.subjectMatter.set(doc?.subject || doc?.title || 'PDS as of Jan 05, 2026');
      this.specialInstructionsText.set('');
      this.assignedTo.set({
        'Office of the Regional Director': false,
        'Administrative Division': false,
        'Local Assessment Operations Division': false,
        'Local Treasury Operations Division': false,
        'Financial Division': false,
        'Legal Division / Unit': false,
      });
      this.forActions.set({
        'Appropriate Action': false, Approval: false, 'Return with/without action': false,
        'Confer with RD': false, 'Verify /analyze reports': false,
        'Please indorse/refer/forward': false, 'Furnish Copy': false, File: false, 'Special Instructions': false,
      });
    }
  }

  private applyPreset(preset: PrintFormatPreset): void {
    if (preset.senderName) this.senderName.set(preset.senderName);
    if (preset.senderOffice) this.senderOffice.set(preset.senderOffice);
    if (preset.senderPosition) this.senderPosition.set(preset.senderPosition);
    if (preset.rdName) this.rdName.set(preset.rdName);
    if (preset.rdPosition) this.rdPosition.set(preset.rdPosition);
    if (preset.receivedBy) this.receivedBy.set(preset.receivedBy);
    if (preset.specialInstructionsText !== undefined) this.specialInstructionsText.set(preset.specialInstructionsText);
  }

  handleSelectFormat(formatId: string): void {
    this.selectedFormat.set(formatId);
    const found = this.printFormats().find(f => f.id === formatId);
    if (found) this.applyPreset(found);
  }

  formatDate(dateString: string): string {
    return formatDate(dateString);
  }
}
