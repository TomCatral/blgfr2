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
import { DocumentRecord, NotificationItem, User } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';

interface SearchResult {
  doc: DocumentRecord;
  matchedField: string;
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
  imports: [NgClass, ClsPipe, FormsModule],
  styleUrl: './header.component.scss',
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() currentUser: User = {} as User;
  @Input() users: User[] = [];
  @Input() documents: DocumentRecord[] = [];
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

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

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
      this.searchInputRef?.nativeElement.focus();
    }
    if (event.key === 'Escape') this.showUserMenu = false;
  };
  private readonly onMouseDown = (event: MouseEvent): void => {
    const menu = (event.target as HTMLElement).closest('.header-actions .relative');
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
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const doc of this.documents) {
      const fields: Array<[string, string]> = [
        ['Tracking No.', `${doc.routeNo || doc.trackingNumber || ''}`],
        ['Title', `${doc.title || ''}`],
        ['Subject', `${doc.subject || ''}`],
        ['Originating Office', `${doc.originatingOffice || ''}`],
        ['Sender', `${doc.senderName || ''}`],
        ['Recipient', `${doc.recipientName || ''}`],
        ['Division', `${doc.currentDivision || ''}`],
        ['Category', `${doc.category || ''}`],
        ['Status', `${(doc.currentStatus || '').replaceAll('_', ' ')}`],
        ['Priority', `${doc.priority || ''}`],
        ['Remarks', `${doc.remarks || ''}`],
      ];

      const matchedField = fields.find(([, value]) =>
        value.toLowerCase().includes(q),
      )?.[0];

      if (matchedField) {
        results.push({ doc, matchedField });
        continue;
      }

      const assignedUser = this.users.find((u) => u.id === doc.assignedUserId);
      const assignedName = assignedUser?.fullName || doc.assignedUser || '';
      if (assignedName.toLowerCase().includes(q)) {
        results.push({ doc, matchedField: `Assigned: ${assignedName}` });
        continue;
      }

      if (doc.actionRequested && doc.actionRequested.toLowerCase().includes(q)) {
        results.push({ doc, matchedField: `Action: ${doc.actionRequested}` });
        continue;
      }

      const matchedTag = (doc.tags || []).find((t) => t.toLowerCase().includes(q));
      if (matchedTag) {
        results.push({ doc, matchedField: `Tag: ${matchedTag}` });
        continue;
      }

      const matchedRoute = (doc.routes || []).find((r) =>
        (r.toUser && r.toUser.toLowerCase().includes(q)) ||
        (r.fromUser && r.fromUser.toLowerCase().includes(q)) ||
        (r.toDivision && r.toDivision.toLowerCase().includes(q)) ||
        (r.actionRequested && r.actionRequested.toLowerCase().includes(q)) ||
        (r.actionTaken && r.actionTaken.toLowerCase().includes(q)) ||
        (r.remarks && r.remarks.toLowerCase().includes(q)),
      );
      if (matchedRoute) {
        results.push({
          doc,
          matchedField: `Route: ${matchedRoute.actionRequested || matchedRoute.toUser || matchedRoute.toDivision}`,
        });
        continue;
      }
    }
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
    this.searchInputRef?.nativeElement.blur();
    this.onSelectDoc.emit(doc);
  }

  viewAllResults(): void {
    const q = this.searchQuery.trim();
    if (q) this.onSearchDoc.emit(q);
    this.isSearchFocused = false;
    this.activeResultIndex = -1;
  }

  submitSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) return;
    const results = this.searchResults;
    if (results.length > 0) {
      const idx =
        this.activeResultIndex >= 0 && this.activeResultIndex < Math.min(results.length, 8)
          ? this.activeResultIndex
          : 0;
      this.chooseResult(results[idx].doc);
      return;
    }
    this.onSearchDoc.emit(q);
    this.isSearchFocused = false;
    this.activeResultIndex = -1;
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
    this.searchInputRef?.nativeElement.blur();
  }

  onSearchInput(): void {
    this.activeResultIndex = -1;
    this.isSearchFocused = true;
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    const results = this.searchResults;
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
    const lowerSource = source.toLowerCase();
    const lowerQ = q.toLowerCase();
    const segments: HighlightSegment[] = [];
    let startIdx = 0;
    let matchIdx = lowerSource.indexOf(lowerQ, startIdx);

    while (matchIdx !== -1) {
      if (matchIdx > startIdx) {
        segments.push({ text: source.slice(startIdx, matchIdx), highlighted: false });
      }
      segments.push({ text: source.slice(matchIdx, matchIdx + q.length), highlighted: true });
      startIdx = matchIdx + q.length;
      matchIdx = lowerSource.indexOf(lowerQ, startIdx);
    }

    if (startIdx < source.length) {
      segments.push({ text: source.slice(startIdx), highlighted: false });
    }

    return segments.length > 0 ? segments : [{ text: source, highlighted: false }];
  }
}
