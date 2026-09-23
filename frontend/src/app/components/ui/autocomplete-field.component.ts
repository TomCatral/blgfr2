import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-autocomplete-field',
  standalone: true,
  imports: [NgClass, FormsModule],
  templateUrl: './autocomplete-field.component.html',
  styleUrl: './autocomplete-field.component.scss',
})
export class AutocompleteFieldComponent {
  @Input() value = '';
  @Input() suggestions: string[] = [];
  @Input() placeholder?: string;
  @Input() required = false;
  @Input() multiline = false;
  @Input() rows = 2;
  @Input() className?: string;
  @Input() ariaLabel?: string;
  @Output() onChange = new EventEmitter<string>();

  focused = false;
  closedTimer: number | null = null;

  get filteredSuggestions(): string[] {
    const query = this.value.trim().toLowerCase();
    if (!query) return this.suggestions.slice(0, 8);
    return this.suggestions
      .filter((item) => item.toLowerCase().includes(query))
      .slice(0, 8);
  }

  get inputClass(): string {
    return this.className || '';
  }

  select(event: Event, suggestion: string): void {
    event.preventDefault();
    this.onChange.emit(suggestion);
    this.focused = false;
  }

  hideAfterDelay(): void {
    if (this.closedTimer) window.clearTimeout(this.closedTimer);
    this.closedTimer = window.setTimeout(() => {
      this.focused = false;
    }, 150);
  }
}