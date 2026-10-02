import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DialogRequest {
  kind: 'confirm' | 'prompt';
  message: string;
  defaultValue: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  resolve: (value: boolean | string | null) => void;
}

export type ConfirmDialogOptions = Pick<
  DialogRequest,
  'title' | 'confirmLabel' | 'cancelLabel' | 'tone'
>;

function createRequest(
  kind: 'confirm' | 'prompt',
  message: string,
  defaultValue = '',
  options: ConfirmDialogOptions = {},
): Promise<boolean | string | null> {
  return new Promise((resolve) => {
    requests.next({ kind, message, defaultValue, ...options, resolve });
  });
}

const requests = new BehaviorSubject<DialogRequest | null>(null);

export function showConfirm(message: string, options: ConfirmDialogOptions = {}): Promise<boolean> {
  return createRequest('confirm', message, '', options) as Promise<boolean>;
}

export function showPrompt(message: string, defaultValue = ''): Promise<string | null> {
  return createRequest('prompt', message, defaultValue) as Promise<string | null>;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly requests$ = requests.asObservable();

  resolveCurrent(value: boolean | string | null): void {
    const current = requests.value;
    if (!current) return;
    requests.next(null);
    current.resolve(value);
  }
}
