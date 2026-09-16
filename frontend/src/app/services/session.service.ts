import { Injectable, signal } from '@angular/core';
import { User } from '../types';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly currentUser = signal<User | null>(null);
  readonly isDarkMode = signal<boolean>(
    localStorage.getItem('blgf_theme') === 'dark',
  );
  readonly isOnline = signal(true);
  readonly isDataLoaded = signal(false);

  constructor() {
    this.applyTheme(this.isDarkMode());
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
    this.currentUser.set(user);
    sessionStorage.setItem('blgf_current_user', user.id);
    localStorage.setItem('blgf_current_user', user.id);
  }

  logout(): void {
    this.currentUser.set(null);
    sessionStorage.removeItem('blgf_current_user');
    localStorage.removeItem('blgf_current_user');
  }

  persistedUserId(): string | null {
    return (
      sessionStorage.getItem('blgf_current_user') ||
      localStorage.getItem('blgf_current_user')
    );
  }

  markDataLoaded(): void {
    this.isDataLoaded.set(true);
  }
}