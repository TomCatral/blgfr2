import { Component, OnDestroy, OnInit, effect, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { DialogRequest, DialogService } from '../../services/dialog.service';
import { UiService } from '../../services/ui.service';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-dialog-host',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonicModule, FormsModule],
  templateUrl: './app-dialog-host.component.html',
  styleUrl: './app-dialog-host.component.scss',
})
export class AppDialogHostComponent implements OnInit, OnDestroy {
  private dialogService = inject(DialogService);
  protected ui = inject(UiService);
  request: DialogRequest | null = null;
  promptValue = '';
  private subscription?: Subscription;
  private successTimer?: ReturnType<typeof setTimeout>;
  private errorTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const message = this.ui.successAlert();
      if (message) {
        clearTimeout(this.successTimer);
        this.successTimer = setTimeout(() => this.ui.clearSuccess(), 3200);
      }
    });
    effect(() => {
      const message = this.ui.errorAlert();
      if (message) {
        clearTimeout(this.errorTimer);
        this.errorTimer = setTimeout(() => this.ui.clearError(), 4200);
      }
    });
  }

  ngOnInit(): void {
    this.subscription = this.dialogService.requests$.subscribe((request) => {
      this.request = request;
      if (request) this.promptValue = request.defaultValue;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    clearTimeout(this.successTimer);
    clearTimeout(this.errorTimer);
  }

  stop(event: Event): void {
    event.stopPropagation();
  }

  dismiss(): void {
    this.dialogService.resolveCurrent(null);
  }

  accept(): void {
    if (!this.request) return;
    if (this.request.kind === 'prompt') {
      this.dialogService.resolveCurrent(this.promptValue.trim());
    } else {
      this.dialogService.resolveCurrent(true);
    }
  }
}
