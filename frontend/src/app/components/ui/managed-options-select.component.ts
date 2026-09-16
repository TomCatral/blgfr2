import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { NgFor } from '@angular/common';

import { showConfirm, showPrompt } from '../../services/dialog.service';

export type ManagedOption = {
  value: string;
  label: string;
  colorDot?: string;
};

const COLOR_DOTS = ['🔵', '🟣', '🟢', '🔴', '🟠', '🟡'];

function normalizeOption(
  option: unknown,
  index: number,
): ManagedOption | null {
  if (typeof option === 'string') {
    const label = option.trim();
    return label ? { value: label, label } : null;
  }

  if (!option || typeof option !== 'object') return null;
  const candidate = option as Partial<ManagedOption>;
  const label =
    typeof candidate.label === 'string' ? candidate.label.trim() : '';
  const value =
    typeof candidate.value === 'string' ? candidate.value.trim() : '';
  if (!label && !value) return null;

  return {
    value: value || label || `OPTION_${index + 1}`,
    label: label || value,
    colorDot:
      typeof candidate.colorDot === 'string' ? candidate.colorDot : undefined,
  };
}

function makeValue(label: string, existing: ManagedOption[]): string {
  const base =
    label
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `OPTION_${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  while (existing.some((option) => option.value === candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  return candidate;
}

@Component({
  selector: 'app-managed-options-select',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgFor],
  styleUrl: './managed-options-select.component.scss',
  templateUrl: './managed-options-select.component.html',
})
export class ManagedOptionsSelectComponent implements OnInit {
  @Input() storageKey = '';
  @Input() options: ManagedOption[] = [];
  @Input() value = '';
  @Input() required = false;
  @Input() colorCoding = false;
  @Input() canManageOptions = false;
  @Input() textAlign: 'left' | 'right' = 'right';

  @Output() valueChange = new EventEmitter<string>();

  readonly COLOR_DOTS = COLOR_DOTS;

  private managedState: ManagedOption[] = [];

  showPalette = false;

  ngOnInit(): void {
    if (this.storageKey) this.loadFromStorage();
  }

  get managedOptions(): ManagedOption[] {
    return this.managedState.length ? this.managedState : this.options;
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          const normalized = parsed
            .map(normalizeOption)
            .filter((option): option is ManagedOption => option !== null)
            .map((option, index) => ({
              ...option,
              label: option.label.replace(/^[🔵🟣🟢🔴🟠🟡]\s*/u, ''),
              colorDot: this.colorCoding
                ? option.colorDot || COLOR_DOTS[index % COLOR_DOTS.length]
                : undefined,
            }));
          if (!normalized.length) return;
          this.managedState = normalized;
          localStorage.setItem(this.storageKey, JSON.stringify(normalized));
        }
      }
    } catch {
      this.managedState = [...this.options];
    }
  }

  private persist(next: ManagedOption[]): void {
    this.managedState = next;
    if (this.storageKey) {
      localStorage.setItem(this.storageKey, JSON.stringify(next));
    }
  }

  handleChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }

  async addOption(): Promise<void> {
    const label = (await showPrompt('Enter the new option:'))?.trim();
    if (!label) return;
    const current = this.managedOptions;
    const nextOption: ManagedOption = {
      value: makeValue(label, current),
      label,
      colorDot: this.colorCoding
        ? COLOR_DOTS[current.length % COLOR_DOTS.length]
        : undefined,
    };
    this.persist([...current, nextOption]);
    this.valueChange.emit(nextOption.value);
  }

  async editOption(): Promise<void> {
    const selected = this.managedOptions.find(
      (option) => option.value === this.value,
    );
    if (!selected) return;
    const label = (
      await showPrompt('Edit this option:', selected.label)
    )?.trim();
    if (!label) return;
    this.persist(
      this.managedOptions.map((option) =>
        option.value === selected.value ? { ...option, label } : option,
      ),
    );
  }

  async deleteOption(): Promise<void> {
    if (this.managedOptions.length <= 1) return;
    const selected = this.managedOptions.find(
      (option) => option.value === this.value,
    );
    if (!selected || !(await showConfirm(`Delete "${selected.label}"?`)))
      return;
    const next = this.managedOptions.filter(
      (option) => option.value !== selected.value,
    );
    this.persist(next);
    this.valueChange.emit(next[0].value);
  }

  setSelectedColor(colorDot: string): void {
    const selected = this.managedOptions.find(
      (option) => option.value === this.value,
    );
    if (!selected) return;
    this.persist(
      this.managedOptions.map((option) =>
        option.value === selected.value ? { ...option, colorDot } : option,
      ),
    );
    this.showPalette = false;
  }
}
