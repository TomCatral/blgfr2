import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DialogRequest {
  kind: 'confirm' | 'prompt';
  message: string;
  defaultValue: string;
  resolve: (value: boolean | string | null) => void;
}

function createRequest(
  kind: 'confirm' | 'prompt',
  message: string,
  defaultValue = '',
): Promise<boolean | string | null> {
  return new Promise((resolve) => {
    requests.next({ kind, message, defaultValue, resolve });
  });
}

const requests = new BehaviorSubject<DialogRequest | null>(null);

export function subscribeToDialogs(): Observable<DialogRequest | null> {
  return requests.asObservable();
}

export function showConfirm(message: string): Promise<boolean> {
  return createRequest('confirm', message) as Promise<boolean>;
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