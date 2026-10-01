import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';

@Component({
  selector: 'app-modal-layer',
  standalone: true,
  imports: [],
  templateUrl: './modal-layer.component.html',
  styleUrl: './modal-layer.component.scss',
})
export class AppModalLayerComponent implements OnChanges, OnDestroy {
  private static openModalCount = 0;
  private scrollLocked = false;

  @Input() isOpen = false;
  @Input() maxWidth = '48rem';
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;
  @Input() onClose: (() => void) | null = null;
  @Output() closed = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isOpen']) return;
    if (this.isOpen && !this.scrollLocked) {
      AppModalLayerComponent.openModalCount += 1;
      this.scrollLocked = true;
    } else if (!this.isOpen && this.scrollLocked) {
      this.releaseScrollLock();
    }
    document.body.classList.toggle(
      'app-modal-open',
      AppModalLayerComponent.openModalCount > 0,
    );
  }

  ngOnDestroy(): void {
    if (this.scrollLocked) this.releaseScrollLock();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (!this.isOpen || !this.closeOnEscape) return;
    this.close();
  }

  handleBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop && event.target === event.currentTarget) {
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

  private releaseScrollLock(): void {
    AppModalLayerComponent.openModalCount = Math.max(
      0,
      AppModalLayerComponent.openModalCount - 1,
    );
    this.scrollLocked = false;
    document.body.classList.toggle(
      'app-modal-open',
      AppModalLayerComponent.openModalCount > 0,
    );
  }
}
