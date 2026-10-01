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
  recoveryEmailSent = false;
  recoveredUsername = '';
  recoveredEmail = '';

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
    this.recoveryEmailSent = false;
    this.loading = true;
    try {
      const result = await firstValueFrom(this.api.forgotPassword(
        this.resetIdentifier.trim(),
      ));
      this.recoveryEmailSent = true;
      this.recoveredUsername = result.username || this.resetIdentifier.trim();
      this.recoveredEmail = result.targetEmail || '';
      this.successMsg = result.message || 'A temporary recovery password has been sent to your email address.';
    } catch (error: unknown) {
      this.errorMsg =
        error instanceof Error
          ? error.message
          : 'Unable to send recovery email. Please check your SMTP settings in .env.';
    } finally {
      this.loading = false;
    }
  }

  proceedToSignInWithEmailCode(): void {
    this.username = this.recoveredUsername || this.username || this.resetIdentifier.trim();
    this.password = '';
    this.showForgotPassword = false;
    this.recoveryEmailSent = false;
    this.errorMsg = '';
    this.successMsg = 'Please enter the temporary password sent to your email to sign in.';
  }

  openForgotPassword(): void {
    this.showForgotPassword = true;
    this.resetIdentifier = this.username;
    this.recoveryEmailSent = false;
    this.errorMsg = '';
    this.successMsg = '';
  }

  backToSignIn(): void {
    this.showForgotPassword = false;
    this.recoveryEmailSent = false;
    this.errorMsg = '';
  }
}
