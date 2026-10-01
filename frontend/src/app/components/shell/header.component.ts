import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClsPipe } from '../../shared/cls.pipe';
import { HighlightPipe } from '../../shared/highlight.pipe';
import { AuditLog, DocumentRecord, NotificationItem, User } from '../../types';
import { isDocumentParticipant } from '../../utils/document-visibility';
import { Html5Qrcode } from 'html5-qrcode';
interface SearchResult {
  doc: DocumentRecord;
  matchedField: string;
  score: number;
}

interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

@Component({
  selector: 'app-header',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgClass, ClsPipe, FormsModule, HighlightPipe],
  styleUrl: './header.component.scss',
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() currentUser: User = {} as User;
  @Input() users: User[] = [];
  @Input() documents: DocumentRecord[] = [];
  @Input() auditLogs: AuditLog[] = [];
  @Input() notifications: NotificationItem[] = [];
  @Input() isDarkMode = false;
  @Input() isOnline = true;
  @Input()
  set searchQuery(value: string) {
    this._searchQuery = value || '';
  }
  get searchQuery(): string {
    return this._searchQuery;
  }
  @Output() onSearchDoc = new EventEmitter<string>();
  @Output() onClearSearch = new EventEmitter<void>();
  @Output() onSelectDoc = new EventEmitter<DocumentRecord>();
  @Output() onOpenNotifications = new EventEmitter<void>();
  @Output() onLogout = new EventEmitter<void>();
  @Output() onToggleDarkMode = new EventEmitter<void>();
  @Output() onOpenMobileSidebar = new EventEmitter<void>();

  @ViewChild('searchInput', { read: ElementRef }) searchInputRef?: ElementRef<HTMLInputElement | HTMLElement>;

  get connectedDocuments(): DocumentRecord[] {
    return this.documents || [];
  }

  get recentDocuments(): DocumentRecord[] {
    return (this.connectedDocuments || []).slice(0, 4);
  }

  get displayResults(): SearchResult[] {
    return this.searchResults;
  }

  quickSearch(term: string): void {
    if (this.searchBlurTimer !== null) {
      window.clearTimeout(this.searchBlurTimer);
      this.searchBlurTimer = null;
    }
    this._searchQuery = term;
    this.isSearchFocused = true;
    this.activeResultIndex = -1;
    this.focusSearchInput();
  }

  private blurSearchInput(): void {
    const el = this.searchInputRef?.nativeElement;
    if (!el) return;
    if (typeof (el as unknown as { blur?: () => void }).blur === 'function') {
      (el as unknown as { blur: () => void }).blur();
    }
    const inner = el.querySelector('input');
    if (inner && typeof inner.blur === 'function') {
      inner.blur();
    }
  }

  private focusSearchInput(): void {
    const el = this.searchInputRef?.nativeElement;
    if (!el) return;
    if (typeof (el as unknown as { setFocus?: () => Promise<void> }).setFocus === 'function') {
      void (el as unknown as { setFocus: () => Promise<void> }).setFocus();
    } else if (typeof (el as unknown as { focus?: () => void }).focus === 'function') {
      (el as unknown as { focus: () => void }).focus();
    }
    const inner = el.querySelector('input');
    if (inner && typeof inner.focus === 'function') {
      inner.focus();
    }
  }

  showUserMenu = false;
  private _searchQuery = '';
  isSearchFocused = false;
  activeResultIndex = -1;
  private searchBlurTimer: number | null = null;
  isScannerOpen = false;
  scannerError = '';
  scrolled = false;
  installPrompt: BeforeInstallPromptEvent | null = null;
  isUserStatusOpen = false;
  userDirectorySearch = '';
  userDirectoryFilter = 'ALL';
  isAppInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;



  window = window;

  private scanner: Html5Qrcode | null = null;

  private readonly onScroll = (): void => {
    this.scrolled = window.scrollY > 10;
  };
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.focusSearchInput();
    }
    if (event.key === 'Escape') {
      this.showUserMenu = false;
      this.closeUserStatusModal();
    }
  };
  private readonly onMouseDown = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const search = target?.closest('.global-document-search') || target?.closest('.header-search-container') || target?.closest('.head2');
    if (!search) {
      this.isSearchFocused = false;
      this.activeResultIndex = -1;
    }
    const menu = target?.closest('.header-account') || target?.closest('.headStyle') || target?.closest('.head14') || target?.closest('.head5');
    if (!menu && this.showUserMenu) this.showUserMenu = false;
  };
  private readonly onBeforeInstallPrompt = (event: Event): void => {
    event.preventDefault();
    this.installPrompt = event as BeforeInstallPromptEvent;
  };
  private readonly onAppInstalled = (): void => {
    this.isAppInstalled = true;
    this.installPrompt = null;
  };

  get searchResults(): SearchResult[] {
    const query = this._searchQuery.trim();
    if (!query) return [];
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const fullQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const doc of this.connectedDocuments) {
      const routeNo = (doc.routeNo || doc.trackingNumber || '').toLowerCase();
      const title = (doc.title || '').toLowerCase();
      const subject = (doc.subject || '').toLowerCase();
      const originating = (doc.originatingOffice || '').toLowerCase();
      const destination = (doc.destinationOffice || '').toLowerCase();
      const sender = (doc.senderName || '').toLowerCase();
      const recipient = (doc.recipientName || '').toLowerCase();
      const division = (doc.currentDivision || '').toLowerCase();
      const category = (doc.category || '').toLowerCase();
      const status = (doc.currentStatus || '').toLowerCase().replaceAll('_', ' ');
      const priority = (doc.priority || '').toLowerCase().replaceAll('_', ' ');
      const remarks = (doc.remarks || '').toLowerCase();
      const assignedUser = this.users.find((u) => u.id === doc.assignedUserId);
      const assignedName = (assignedUser?.fullName || doc.assignedUser || '').toLowerCase();
      const tags = (doc.tags || []).map((t) => t.toLowerCase()).join(' ');
      const routeTrail = (doc.routes || [])
        .flatMap((r) => [r.toUser, r.fromUser, r.toDivision, r.fromDivision, r.actionRequested, r.actionTaken, r.remarks])
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      // Check if EVERY token matches at least one field of this document
      const allTokensMatch = tokens.every(
        (t) =>
          routeNo.includes(t) ||
          title.includes(t) ||
          subject.includes(t) ||
          originating.includes(t) ||
          destination.includes(t) ||
          sender.includes(t) ||
          recipient.includes(t) ||
          division.includes(t) ||
          category.includes(t) ||
          status.includes(t) ||
          priority.includes(t) ||
          remarks.includes(t) ||
          assignedName.includes(t) ||
          tags.includes(t) ||
          routeTrail.includes(t),
      );

      if (!allTokensMatch) continue;

      // Smart relevance score & matched field badge
      let score = 0;
      let matchedField = '';

      if (routeNo === fullQuery) {
        score += 200;
        matchedField = 'Exact Route #';
      } else if (routeNo.startsWith(fullQuery)) {
        score += 150;
        matchedField = 'Route #';
      } else if (routeNo.includes(fullQuery)) {
        score += 120;
        matchedField = 'Route #';
      } else if (title.includes(fullQuery)) {
        score += 90;
        matchedField = 'Title Match';
      } else if (tokens.some((t) => title.includes(t))) {
        score += 80;
        matchedField = 'Title';
      } else if (subject.includes(fullQuery)) {
        score += 70;
        matchedField = 'Subject';
      } else if (originating.includes(fullQuery) || destination.includes(fullQuery)) {
        score += 65;
        matchedField = `Office: ${doc.originatingOffice || doc.destinationOffice}`;
      } else if (sender.includes(fullQuery)) {
        score += 60;
        matchedField = `Sender: ${doc.senderName}`;
      } else if (recipient.includes(fullQuery)) {
        score += 60;
        matchedField = `Recipient: ${doc.recipientName}`;
      } else if (assignedName.includes(fullQuery)) {
        score += 55;
        matchedField = `Assigned: ${assignedUser?.fullName || doc.assignedUser}`;
      } else if (division.includes(fullQuery)) {
        score += 50;
        matchedField = `Division: ${doc.currentDivision}`;
      } else if (category.includes(fullQuery)) {
        score += 45;
        matchedField = `Category: ${doc.category}`;
      } else if (status.includes(fullQuery)) {
        score += 40;
        matchedField = `Status: ${doc.currentStatus.replaceAll('_', ' ')}`;
      } else if (priority.includes(fullQuery)) {
        score += 40;
        matchedField = `Priority: ${doc.priority.replaceAll('_', ' ')}`;
      } else if (remarks.includes(fullQuery)) {
        score += 35;
        matchedField = 'Remarks';
      } else if (tags.includes(fullQuery)) {
        score += 30;
        matchedField = 'Tag';
      } else {
        score += 25;
        matchedField = 'Routing Trail';
      }

      // Bonus for recent documents
      if (doc.createdAt) {
        const ageHours = (Date.now() - new Date(doc.createdAt).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) score += 10;
        else if (ageHours < 72) score += 5;
      }

      results.push({ doc, matchedField, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  ngOnInit(): void {
    window.addEventListener('scroll', this.onScroll);
    window.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.onAppInstalled);
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', this.onAppInstalled);
    document.body.classList.remove('personnel-directory-open');
    this.closeScanner();
  }

  highlightSegments(result: SearchResult, field: 'routeNo' | 'title' | 'subject'): HighlightSegment[] {
    const query = this.searchQuery.trim();
    const source = String(
      field === 'routeNo'
        ? result.doc.routeNo || result.doc.trackingNumber || ''
        : result.doc[field] || '',
    );
    return this.buildSegments(source, query);
  }

  statusBadgeClass(doc: DocumentRecord): string {
    switch (doc.currentStatus) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
      case 'RETURNED':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  }

  wasForwardedToCurrentUser(doc: DocumentRecord): boolean {
    return Boolean(
      doc.routes?.some((route) => route.toUserId === this.currentUser?.id),
    );
  }

  getCurrentUserAction(doc: DocumentRecord): string {
    return (
      [...(doc.routes || [])].reverse().find((route) => route.toUserId === this.currentUser?.id)
        ?.actionRequested ||
      doc.actionRequested ||
      'N/A'
    );
  }

  chooseResult(doc: DocumentRecord): void {
    if (this.searchBlurTimer !== null) {
      window.clearTimeout(this.searchBlurTimer);
      this.searchBlurTimer = null;
    }
    this.isSearchFocused = false;
    this.activeResultIndex = -1;
    this.blurSearchInput();
    this.onSelectDoc.emit(doc);
  }

  viewAllResults(): void {
    const q = this.searchQuery.trim();
    if (q) this.onSearchDoc.emit(q);
    this.isSearchFocused = false;
    this.activeResultIndex = -1;
    this.blurSearchInput();
  }

  submitSearch(): void {
    const results = this.displayResults;
    if (results.length > 0) {
      const idx =
        this.activeResultIndex >= 0 && this.activeResultIndex < Math.min(results.length, 8)
          ? this.activeResultIndex
          : 0;
      this.chooseResult(results[idx].doc);
      return;
    }
    const q = this.searchQuery.trim();
    if (q) this.onSearchDoc.emit(q);
    this.isSearchFocused = false;
    this.activeResultIndex = -1;
    this.blurSearchInput();
  }

  clearSearch(): void {
    this._searchQuery = '';
    this.activeResultIndex = -1;
    this.isSearchFocused = false;
    if (this.searchBlurTimer !== null) {
      window.clearTimeout(this.searchBlurTimer);
      this.searchBlurTimer = null;
    }
    this.onClearSearch.emit();
    this.blurSearchInput();
  }

  private lastFocusTimestamp = 0;

  onInputFocus(): void {
    if (this.searchBlurTimer !== null) {
      window.clearTimeout(this.searchBlurTimer);
      this.searchBlurTimer = null;
    }
    this.lastFocusTimestamp = Date.now();
    this.isSearchFocused = true;
  }

  onInputClick(): void {
    if (Date.now() - this.lastFocusTimestamp < 250) {
      this.isSearchFocused = true;
      return;
    }
    this.isSearchFocused = !this.isSearchFocused;
    if (!this.isSearchFocused) {
      this.activeResultIndex = -1;
      this.blurSearchInput();
    }
  }

  openSearch(): void {
    this.onInputFocus();
  }

  toggleSearch(): void {
    this.onInputClick();
  }

  onSearchInput(event?: Event): void {
    if (this.searchBlurTimer !== null) {
      window.clearTimeout(this.searchBlurTimer);
      this.searchBlurTimer = null;
    }
    const customEvent = event as CustomEvent<{ value?: string | null }>;
    const target = event?.target as HTMLInputElement | null;
    const val = customEvent?.detail?.value ?? target?.value ?? this._searchQuery ?? '';
    this._searchQuery = typeof val === 'string' ? val : '';
    this.activeResultIndex = -1;
    this.isSearchFocused = true;
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    const results = this.displayResults;
    const maxLen = Math.min(results.length, 8);
    if (event.key === 'ArrowDown') {
      if (maxLen > 0) {
        event.preventDefault();
        this.isSearchFocused = true;
        this.activeResultIndex = (this.activeResultIndex + 1) % maxLen;
      }
    } else if (event.key === 'ArrowUp') {
      if (maxLen > 0) {
        event.preventDefault();
        this.isSearchFocused = true;
        this.activeResultIndex = (this.activeResultIndex - 1 + maxLen) % maxLen;
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.activeResultIndex >= 0 && this.activeResultIndex < maxLen) {
        this.chooseResult(results[this.activeResultIndex].doc);
      } else {
        this.submitSearch();
      }
    } else if (event.key === 'Escape') {
      this.clearSearch();
    }
  }

  closeSearchDelayed(): void {
    this.searchBlurTimer = window.setTimeout(() => {
      this.isSearchFocused = false;
      this.activeResultIndex = -1;
    }, 250);
  }

  toggleUserMenu(event?: Event): void {
    event?.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  logoutAction(): void {
    this.showUserMenu = false;
    this.onLogout.emit();
  }

  stop(event: Event): void {
    event.stopPropagation();
  }

  handleInstallApp(): void {
    if (this.installPrompt) {
      this.installPrompt.prompt();
      void this.installPrompt.userChoice.then((choice) => {
        if (choice?.outcome === 'accepted') this.isAppInstalled = true;
      });
      this.installPrompt = null;
      return;
    }
    const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(
      isAppleMobile
        ? 'To install DTS on iPhone or iPad: open this page in Safari, tap the Share button, then select "Add to Home Screen."'
        : 'To install DTS: open this site in Chrome or Edge, open the browser menu, then select "Install app" or "Add to Home screen."',
    );
  }

  async openScanner(): Promise<void> {
    this.isScannerOpen = true;
    this.scannerError = '';
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    const element = document.getElementById('document-search-scanner');
    if (!element) return;
    element.replaceChildren();
    this.closeScanner();
    const scanner = new Html5Qrcode('document-search-scanner');
    this.scanner = scanner;
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) throw new Error('No camera was found on this device.');
      const preferredCamera =
        [...cameras].reverse().find((camera) => /back|rear|environment/i.test(camera.label)) ||
        cameras[cameras.length - 1];
      await scanner.start(
        preferredCamera.id,
        {
          fps: 15,
          qrbox: (width: number, height: number) => ({
            width: Math.min(260, Math.floor(width * 0.8)),
            height: Math.min(260, Math.floor(height * 0.8)),
          }),
          aspectRatio: 1,
        },
        (decodedText) => {
          this.processScannedCode(decodedText);
        },
        () => undefined,
      );
    } catch (error) {
      this.scannerError =
        (error as Error)?.message ||
        'Camera access failed. Allow camera permission and open the application through HTTPS.';
    }
  }

  closeScanner(): void {
    const scanner = this.scanner;
    this.scanner = null;
    if (!scanner) return;
    scanner
      .stop()
      .then(() => scanner.clear())
      .catch(() => undefined)
      .finally(() => document.getElementById('document-search-scanner')?.replaceChildren());
  }

  processScannedCode(decodedText: string): void {
    const rawCode = decodedText.trim();
    const routeNumber =
      rawCode.match(/BLGFR2-\d{4}-\d{2}-(?:IN|OUT)-\d+/i)?.[0] || rawCode;
    const scannedCode = routeNumber.trim();
    if (!scannedCode) return;
    this.searchQuery = scannedCode;
    this.isSearchFocused = false;
    const exactDocument = this.documents.find(
      (document) => document.routeNo?.toLowerCase() === scannedCode.toLowerCase(),
    );
    if (exactDocument) {
      this.isScannerOpen = false;
      this.onSelectDoc.emit(exactDocument);
      this.closeScanner();
    } else {
      this.scannerError = `No document found for QR code: ${scannedCode}`;
      this.onSearchDoc.emit(scannedCode);
    }
  }

  badgeClass(role: string): string {
    const badgeMap: Record<string, string> = {
      SYSTEM_ADMIN:
        'bg-gradient-to-r from-purple-500 to-violet-500 text-white border-purple-300 dark:border-purple-700',
      ADMIN:
        'bg-gradient-to-r from-sky-500 to-blue-500 text-white border-sky-300 dark:border-sky-700',
      RECORDS_OFFICER:
        'bg-gradient-to-r from-slate-500 to-cyan-500 text-white border-slate-300 dark:border-slate-700',
      DIVISION_CHIEF:
        'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-300 dark:border-emerald-700',
      ACTION_OFFICER:
        'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-300 dark:border-amber-700',
      STAFF: 'bg-gradient-to-r from-slate-500 to-slate-600 text-white border-slate-300 dark:border-slate-700',
    };
    return badgeMap[role] || 'bg-slate-700 text-white border-slate-600';
  }

  initialsOf(name: string): string {
    return String(name || 'User')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  private buildSegments(source: string, query: string): HighlightSegment[] {
    const q = query.trim();
    if (!q || !source) return [{ text: source || '', highlighted: false }];
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [{ text: source, highlighted: false }];

    const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = source.split(regex);
    const segments: HighlightSegment[] = [];

    for (const part of parts) {
      if (!part) continue;
      const isMatch = tokens.some((t) => t.toLowerCase() === part.toLowerCase());
      segments.push({ text: part, highlighted: isMatch });
    }

    return segments.length > 0 ? segments : [{ text: source, highlighted: false }];
  }

  get activeUsersCount(): number {
    return (this.users || []).filter((u) => u.active).length;
  }

  get availableDivisions(): string[] {
    const set = new Set<string>();
    for (const u of this.users || []) {
      if (u.divisionCode && u.divisionCode.trim()) {
        set.add(u.divisionCode.trim().toUpperCase());
      }
    }
    return Array.from(set).sort();
  }

  get filteredDirectoryUsers(): User[] {
    let list = [...(this.users || [])];

    if (this.userDirectoryFilter === 'ACTIVE') {
      list = list.filter((u) => u.active);
    } else if (this.userDirectoryFilter === 'MY_DIVISION' && this.currentUser?.divisionCode) {
      list = list.filter(
        (u) => u.divisionCode?.toUpperCase() === this.currentUser.divisionCode?.toUpperCase(),
      );
    } else if (this.userDirectoryFilter !== 'ALL') {
      list = list.filter(
        (u) => u.divisionCode?.toUpperCase() === this.userDirectoryFilter.toUpperCase(),
      );
    }

    const q = this.userDirectorySearch.trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const fullName = (u.fullName || '').toLowerCase();
        const username = (u.username || '').toLowerCase();
        const designation = (u.designation || '').toLowerCase();
        const division = (u.divisionCode || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return (
          fullName.includes(q) ||
          username.includes(q) ||
          designation.includes(q) ||
          division.includes(q) ||
          role.includes(q) ||
          email.includes(q)
        );
      });
    }

    return list.sort((a, b) => {
      if (a.id === this.currentUser?.id) return -1;
      if (b.id === this.currentUser?.id) return 1;
      if (a.active !== b.active) return a.active ? -1 : 1;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
  }

  formatRoleName(role?: string): string {
    if (!role) return '';
    switch (role.toUpperCase()) {
      case 'SYSTEM_ADMIN':
        return 'System Administrator';
      case 'ADMIN':
        return 'Administrator';
      case 'RECORDS_OFFICER':
        return 'Records Officer';
      case 'DIVISION_CHIEF':
        return 'Division Chief';
      case 'ACTION_OFFICER':
        return 'Action Officer';
      case 'STAFF':
        return 'Staff';
      default:
        return role.replaceAll('_', ' ');
    }
  }

  getUserSubtitle(user: User): string {
    const designation = user.designation?.trim();
    const roleText = this.formatRoleName(user.role);
    const title = designation || roleText;
    const division = user.divisionCode?.trim();

    if (title && division) {
      return `${title} · ${division}`;
    }
    if (title) {
      return title;
    }
    if (division) {
      return division;
    }
    return roleText;
  }

  openUserStatusModal(): void {
    this.userDirectorySearch = '';
    this.userDirectoryFilter = 'ALL';
    this.isUserStatusOpen = true;
    document.body.classList.add('personnel-directory-open');
  }

  closeUserStatusModal(): void {
    this.isUserStatusOpen = false;
    this.userDirectorySearch = '';
    document.body.classList.remove('personnel-directory-open');
  }
}
