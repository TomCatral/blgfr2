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

  // Background image managed from User Accounts. Falls back to the themed
  // gradient when no image has been uploaded yet.
  backgroundImageUrl = '';
  hasBackgroundImage = false;

  constructor() {
    void this.loadBackgroundImage();
  }

  private async loadBackgroundImage(): Promise<void> {
    try {
      const result = await firstValueFrom(this.api.getLoginBackground());
      const url = result?.url || '';
      if (!url) return;
      this.backgroundImageUrl = url;
      this.hasBackgroundImage = true;
    } catch {
      // A missing or unreachable setting simply keeps the default background.
    }
  }

  // Temporary-password sign in. The session is only created once the user has
  // replaced the emailed credential with a password of their own.
  requiresPasswordSetup = false;
  setupUsername = '';
  temporaryPassword = '';
  newPassword = '';
  confirmPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;

  async handleSubmit(): Promise<void> {
    this.errorMsg = '';
    this.successMsg = '';
    this.loading = true;
    try {
      const result = await firstValueFrom(this.api.login(this.username.trim(), this.password));
      if (result.mustChangePassword) {
        this.setupUsername = this.username.trim();
        this.temporaryPassword = this.password;
        this.newPassword = '';
        this.confirmPassword = '';
        this.password = '';
        this.requiresPasswordSetup = true;
        return;
      }
      this.session.login(result.user);
    } catch (error: unknown) {
      this.errorMsg =
        error instanceof Error ? error.message : 'Unable to sign in.';
    } finally {
      this.loading = false;
    }
  }

  async handleSetNewPassword(): Promise<void> {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.newPassword) {
      this.errorMsg = 'Please enter your new password.';
      return;
    }
    if (this.newPassword.length < 6) {
      this.errorMsg = 'Password must be at least 6 characters long.';
      return;
    }
    if (this.newPassword === this.temporaryPassword) {
      this.errorMsg = 'Your new password must be different from the temporary password.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg = 'New password and confirm password do not match.';
      return;
    }

    this.loading = true;
    try {
      const result = await firstValueFrom(
        this.api.completePasswordSetup(
          this.setupUsername,
          this.temporaryPassword,
          this.newPassword,
        ),
      );
      this.temporaryPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.requiresPasswordSetup = false;
      this.session.login(result.user);
    } catch (error: unknown) {
      this.errorMsg =
        error instanceof Error
          ? error.message
          : 'Unable to save your new password. Please try again.';
      // The temporary credential may have expired while the form was open, so
      // let the user start over instead of leaving them on a dead screen.
      if (error instanceof Error && /expired|no longer valid/i.test(error.message)) {
        this.requiresPasswordSetup = false;
        this.username = this.setupUsername;
      }
    } finally {
      this.loading = false;
    }
  }

  cancelPasswordSetup(): void {
    this.requiresPasswordSetup = false;
    this.temporaryPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.username = this.setupUsername;
    this.password = '';
    this.errorMsg = '';
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
    this.successMsg = 'Temporary password sent. Sign in with it, then create your new password.';
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
