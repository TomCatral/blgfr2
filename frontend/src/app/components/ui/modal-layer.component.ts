import { Component, HostListener, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-modal-layer',
  standalone: true,
  imports: [],
  templateUrl: './modal-layer.component.html',
  styleUrl: './modal-layer.component.scss',
})
export class AppModalLayerComponent {
  @Input() isOpen = false;
  @Input() maxWidth = '48rem';
  @Input() onClose: (() => void) | null = null;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (!this.isOpen) return;
    this.close();
  }

  handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  stop(event: Event): void {
    event.stopPropagation();
  }

  private close(): void {
    if (this.onClose) this.onClose();
    else this.closed.emit();
  }
}