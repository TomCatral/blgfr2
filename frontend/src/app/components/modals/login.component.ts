import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { SessionService } from '../../services/session.service';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private api = inject(ApiService);
  readonly session = inject(SessionService);

  username = '';
  password = '';
  resetIdentifier = '';
  showForgotPassword = false;
  successMsg = '';
  showPassword = false;
  errorMsg = '';
  loading = false;

  async handleSubmit(): Promise<void> {
    this.errorMsg = '';
    this.successMsg = '';
    this.loading = true;
    try {
      const result = await firstValueFrom(this.api.login(this.username.trim(), this.password));
      this.session.login(result.user);
    } catch (error: unknown) {
      this.errorMsg =
        error instanceof Error ? error.message : 'Unable to sign in.';
    } finally {
      this.loading = false;
    }
  }

  async handleForgotPassword(): Promise<void> {
    this.errorMsg = '';
    this.successMsg = '';
    this.loading = true;
    try {
      const result = await firstValueFrom(this.api.forgotAdminPassword(
        this.resetIdentifier.trim(),
      ));
      this.successMsg = result.message;
      this.resetIdentifier = '';
    } catch (error: unknown) {
      this.errorMsg =
        error instanceof Error
          ? error.message
          : 'Unable to reset the administrator password.';
    } finally {
      this.loading = false;
    }
  }

  openForgotPassword(): void {
    this.showForgotPassword = true;
    this.resetIdentifier = this.username;
    this.errorMsg = '';
    this.successMsg = '';
  }

  backToSignIn(): void {
    this.showForgotPassword = false;
    this.errorMsg = '';
  }
}
