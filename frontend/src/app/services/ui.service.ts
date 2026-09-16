import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiService {
  readonly successAlert = signal<string | null>(null);
  readonly errorAlert = signal<string | null>(null);

  showSuccess(message: string): void {
    this.successAlert.set(message);
  }

  showToast(message: string): void {
    this.showSuccess(message);
  }

  showError(message: string): void {
    this.errorAlert.set(message);
  }

  clearSuccess(): void {
    this.successAlert.set(null);
  }

  clearError(): void {
    this.errorAlert.set(null);
  }
}