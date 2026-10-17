import { Component, inject, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
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
export class LoginComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  readonly session = inject(SessionService);
  private sanitizer = inject(DomSanitizer);

  canInstallPwa = false;
  private pwaInstallListener: (() => void) | null = null;
  private pwaInstalledListener: (() => void) | null = null;

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
  lockSecondsRemaining = 0;
  private lockCountdownId: ReturnType<typeof setInterval> | null = null;

  // Background image managed from User Accounts. Falls back to the themed
  // gradient when no image has been uploaded yet. Cached in localStorage so
  // logging out or reloading displays the chosen background immediately.
  backgroundImageUrl = localStorage.getItem('blgf_login_background_url') || '';
  hasBackgroundImage = Boolean(this.backgroundImageUrl);

  get safeBackgroundStyle(): SafeStyle | string {
    if (!this.hasBackgroundImage || !this.backgroundImageUrl) return '';
    return this.sanitizer.bypassSecurityTrustStyle(
      `linear-gradient(rgba(2, 6, 23, 0.62), rgba(2, 6, 23, 0.82)), url('${this.backgroundImageUrl}')`
    );
  }

  constructor() {
    void this.loadBackgroundImage();
  }

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const updatePwaState = () => {
        this.canInstallPwa = Boolean((window as any).__blgfInstallPrompt);
      };
      updatePwaState();
      this.pwaInstallListener = () => updatePwaState();
      this.pwaInstalledListener = () => { this.canInstallPwa = false; };
      window.addEventListener('blgf-pwa-installable', this.pwaInstallListener);
      window.addEventListener('blgf-pwa-installed', this.pwaInstalledListener);
    }
  }

  ngOnDestroy(): void {
    this.clearLockCountdown();
    if (typeof window !== 'undefined') {
      if (this.pwaInstallListener) window.removeEventListener('blgf-pwa-installable', this.pwaInstallListener);
      if (this.pwaInstalledListener) window.removeEventListener('blgf-pwa-installed', this.pwaInstalledListener);
    }
  }

  installPwa(): void {
    const prompt = (window as any).__blgfInstallPrompt;
    if (prompt) {
      prompt.prompt();
      void prompt.userChoice.then((choice: any) => {
        if (choice?.outcome === 'accepted') {
          this.canInstallPwa = false;
        }
      });
    }
  }

  private async loadBackgroundImage(): Promise<void> {
    try {
      const result = await firstValueFrom(this.api.getLoginBackground());
      const url = result?.url || '';
      if (url) {
        this.backgroundImageUrl = url;
        this.hasBackgroundImage = true;
        localStorage.setItem('blgf_login_background_url', url);
      } else {
        this.backgroundImageUrl = '';
        this.hasBackgroundImage = false;
        localStorage.removeItem('blgf_login_background_url');
      }
    } catch {
      const cached = localStorage.getItem('blgf_login_background_url') || '';
      if (cached) {
        this.backgroundImageUrl = cached;
        this.hasBackgroundImage = true;
      }
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
      const loginError = error as Error & {
        code?: string;
        retryAfterSeconds?: number;
        redirectToForgotPassword?: boolean;
      };
      if (loginError.code === 'LOGIN_LOCKED') {
        this.password = '';
        this.resetIdentifier = this.username.trim();
        this.showForgotPassword = false;
        this.startLockCountdown(loginError.retryAfterSeconds || 30);
        return;
      }
      if (loginError.code === 'RECOVERY_REQUIRED' || loginError.redirectToForgotPassword) {
        this.clearLockCountdown();
        this.lockSecondsRemaining = 0;
        this.password = '';
        this.resetIdentifier = this.username.trim();
        this.showForgotPassword = true;
        this.recoveryEmailSent = false;
        this.errorMsg = 'Maximum login attempts reached. Please recover your account using your registered email.';
        return;
      }
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

  private startLockCountdown(seconds: number): void {
    this.clearLockCountdown();
    this.lockSecondsRemaining = Math.max(1, Math.ceil(seconds));
    this.updateLockMessage();
    this.lockCountdownId = setInterval(() => {
      this.lockSecondsRemaining = Math.max(0, this.lockSecondsRemaining - 1);
      if (this.lockSecondsRemaining === 0) {
        this.clearLockCountdown();
        this.errorMsg = '';
        this.successMsg = 'The sign-in lock has ended. You may try your password again.';
        return;
      }
      this.updateLockMessage();
    }, 1000);
  }

  private updateLockMessage(): void {
    this.successMsg = '';
    this.errorMsg = `Sign-in is temporarily locked. Try again in ${this.lockSecondsRemaining} seconds.`;
  }

  private clearLockCountdown(): void {
    if (this.lockCountdownId) {
      clearInterval(this.lockCountdownId);
      this.lockCountdownId = null;
    }
  }
}
