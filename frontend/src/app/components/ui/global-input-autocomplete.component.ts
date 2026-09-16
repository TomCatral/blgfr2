import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { ClsPipe } from '../../shared/cls.pipe';

type EligibleElement = HTMLInputElement | HTMLTextAreaElement;

const STORAGE_KEY = 'blgf_input_history_v1';
const MAX_FIELD_HISTORY = 30;

function isEligible(element: EventTarget | null): element is EligibleElement {
  if (
    !(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    )
  ) {
    return false;
  }
  if (
    element.dataset['autocompleteManaged'] === 'true' ||
    element.disabled ||
    element.readOnly
  ) {
    return false;
  }
  if (element instanceof HTMLTextAreaElement) return true;
  return ['text', 'search', 'email', 'tel', 'url'].includes(
    element.type || 'text',
  );
}

function fieldKey(element: EligibleElement): string {
  const nearbyLabel =
    element.labels?.[0]?.textContent ||
    element.parentElement?.querySelector('label')?.textContent ||
    '';
  return (
    [
      element.name,
      element.id,
      element.getAttribute('aria-label'),
      nearbyLabel,
      element.placeholder,
    ]
      .find((value) => value?.trim())
      ?.trim()
      .toLocaleLowerCase()
      .replace(/\s+/g, ' ') || 'general-text'
  );
}

function loadHistory(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setNativeValue(element: EligibleElement, value: string): void {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(
    element,
    value,
  );
  element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: value,
    }),
  );
}

function executeEnterAction(element: EligibleElement): void {
  window.setTimeout(() => {
    if (element.form) {
      element.form.requestSubmit();
      return;
    }
    element.dataset['autocompleteEnterPending'] = 'true';
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
  }, 0);
}

@Component({
  selector: 'app-global-input-autocomplete',
  standalone: true,
  imports: [],
  styleUrl: './global-input-autocomplete.component.scss',
  templateUrl: './global-input-autocomplete.component.html',
})
export class GlobalInputAutocompleteComponent implements OnInit, OnDestroy {
  @ViewChild('host') host?: ElementRef<HTMLElement>;

  target: EligibleElement | null = null;
  matches: string[] = [];
  activeIndex = 0;
  position = { left: 0, top: 0, width: 0 };

  private removeListeners: (() => void)[] = [];

  ngOnInit(): void {
    const onFocus = (event: FocusEvent) => {
      if (!isEligible(event.target)) return;
      this.target = event.target;
      this.refresh(event.target);
    };
    const onInput = (event: Event) => {
      if (isEligible(event.target)) this.refresh(event.target);
    };
    const onBlur = (event: FocusEvent) => {
      if (!isEligible(event.target)) return;
      this.save(event.target);
      window.setTimeout(() => {
        if (this.target === event.target) {
          this.target = null;
          this.matches = [];
        }
      }, 120);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        isEligible(event.target) &&
        event.target.dataset['autocompleteEnterPending'] === 'true'
      ) {
        delete event.target.dataset['autocompleteEnterPending'];
        return;
      }
      if (!this.target || this.matches.length === 0 || event.target !== this.target) {
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.activeIndex = (this.activeIndex + 1) % this.matches.length;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.activeIndex =
          (this.activeIndex - 1 + this.matches.length) % this.matches.length;
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        if (event.key === 'Enter') event.preventDefault();
        setNativeValue(this.target, this.matches[this.activeIndex] || this.matches[0]);
        this.matches = [];
        if (event.key === 'Enter') executeEnterAction(this.target);
      } else if (event.key === 'Escape') {
        this.matches = [];
      }
    };
    const reposition = () => {
      if (this.target) this.updatePosition(this.target);
    };
    document.addEventListener('focusin', onFocus);
    document.addEventListener('input', onInput);
    document.addEventListener('focusout', onBlur);
    document.addEventListener('keydown', onKeyDown as EventListener);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    this.removeListeners = [
      () => document.removeEventListener('focusin', onFocus),
      () => document.removeEventListener('input', onInput),
      () => document.removeEventListener('focusout', onBlur),
      () => document.removeEventListener('keydown', onKeyDown as EventListener),
      () => window.removeEventListener('resize', reposition),
      () => window.removeEventListener('scroll', reposition, true),
    ];
  }

  ngOnDestroy(): void {
    this.removeListeners.forEach((remove) => remove());
  }

  private refresh(element: EligibleElement): void {
    const query = element.value.trim().toLocaleLowerCase();
    const history = loadHistory()[fieldKey(element)] || [];
    this.matches = query
      ? history
          .filter(
            (item) =>
              item.toLocaleLowerCase() !== query &&
              item.toLocaleLowerCase().includes(query),
          )
          .slice(0, 7)
      : [];
    this.activeIndex = 0;
    this.updatePosition(element);
  }

  private save(element: EligibleElement): void {
    const value = element.value.trim();
    if (!value) return;
    const history = loadHistory();
    const key = fieldKey(element);
    history[key] = [
      value,
      ...(history[key] || []).filter(
        (item) => item.toLocaleLowerCase() !== value.toLocaleLowerCase(),
      ),
    ].slice(0, MAX_FIELD_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  private updatePosition(element: EligibleElement): void {
    const rect = element.getBoundingClientRect();
    this.position = {
      left: rect.left,
      top: rect.bottom + 4,
      width: rect.width,
    };
  }

  protected apply(item: string, event: Event): void {
    event.preventDefault();
    if (!this.target) return;
    setNativeValue(this.target, item);
    this.matches = [];
  }
}
