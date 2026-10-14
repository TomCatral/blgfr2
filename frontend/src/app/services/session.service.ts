import { Injectable, signal } from '@angular/core';
import { User } from '../types';

import { sanitizeAssetUrl } from '../utils/asset-url';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly currentUser = signal<User | null>(null);
  readonly isDarkMode = signal<boolean>(
    localStorage.getItem('blgf_theme') === 'dark',
  );
  readonly isOnline = signal(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  readonly isDataLoaded = signal(false);

  constructor() {
    this.applyTheme(this.isDarkMode());
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOnline.set(true));
      window.addEventListener('offline', () => this.isOnline.set(false));
    }
  }

  applyTheme(dark: boolean): void {
    this.isDarkMode.set(dark);
    try {
      const root = document.documentElement;
      const body = document.body;
      const appRoot = document.querySelector('app-root');
      if (dark) {
        root.classList.add('dark');
        if (body) body.classList.add('dark');
        if (appRoot) appRoot.classList.add('dark');
        localStorage.setItem('blgf_theme', 'dark');
      } else {
        root.classList.remove('dark');
        if (body) body.classList.remove('dark');
        if (appRoot) appRoot.classList.remove('dark');
        localStorage.setItem('blgf_theme', 'light');
      }
    } catch {
      // safe fallback in case DOM is unavailable
    }
  }

  toggleDarkMode(): void {
    this.applyTheme(!this.isDarkMode());
  }

  login(user: User): void {
    if (user.avatarUrl) {
      user.avatarUrl = sanitizeAssetUrl(user.avatarUrl);
    }
    this.currentUser.set(user);
    this.isDataLoaded.set(false);
    sessionStorage.setItem('blgf_current_user', user.id);
    localStorage.setItem('blgf_current_user', user.id);
    try {
      localStorage.setItem(`blgf_offline_user_${user.id}`, JSON.stringify(user));
      localStorage.setItem('blgf_offline_last_active_user', JSON.stringify(user));
    } catch {}
  }

  logout(): void {
    this.currentUser.set(null);
    this.isDataLoaded.set(true);
    sessionStorage.removeItem('blgf_current_user');
    localStorage.removeItem('blgf_current_user');
  }

  clearPersistedUser(): void {
    sessionStorage.removeItem('blgf_current_user');
    localStorage.removeItem('blgf_current_user');
  }

  persistedUserId(): string | null {
    return (
      sessionStorage.getItem('blgf_current_user') ||
      localStorage.getItem('blgf_current_user')
    );
  }

  markDataLoading(): void {
    this.isDataLoaded.set(false);
  }

  markDataLoaded(): void {
    this.isDataLoaded.set(true);
  }
}