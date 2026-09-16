import {
  Component,
  Input,
  OnInit,
  signal,
  computed,
  inject,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { User, DivisionCode } from '../../../types';
import { ApiService } from '../../../services/api.service';
import { UiService } from '../../../services/ui.service';

type ActiveTab = 'profile' | 'security' | 'preferences';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: 'System Admin',
  ADMIN: 'Admin',
  ORD: 'Regional Director',
  RECORDS_OFFICER: 'Records Officer',
  DIVISION_CHIEF: 'Division Chief',
  ACTION_OFFICER: 'Action Officer',
  STAFF: 'Staff',
};

@Component({
  selector: 'app-user-settings',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, FormsModule],
  styleUrl: './user-settings.component.scss',
  templateUrl: './user-settings.component.html',
})
export class UserSettingsComponent implements OnInit {
  @Input() currentUser!: User;
  @Input() onUpdateUser: (
    id: string,
    data: Partial<User> & { currentPassword?: string },
  ) => Promise<User> = async () => this.currentUser;

  @ViewChild('avatarFileInput') avatarFileInput?: ElementRef<HTMLInputElement>;

  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);

  private readonly activeTabSignal = signal<ActiveTab>('profile');

  private readonly fullNameSignal = signal('');
  private readonly usernameSignal = signal('');
  private readonly emailSignal = signal('');
  private readonly contactNoSignal = signal('');
  private readonly designationSignal = signal('');
  private readonly divisionCodeSignal = signal<DivisionCode>('AD');
  private readonly avatarUrlSignal = signal('');
  private readonly currentPasswordSignal = signal('');
  private readonly newPasswordSignal = signal('');
  private readonly confirmPasswordSignal = signal('');
  private readonly showCurrentPassSignal = signal(false);
  private readonly showNewPassSignal = signal(false);
  private readonly showConfirmPassSignal = signal(false);
  private readonly emailNotifsSignal = signal(true);
  private readonly routingAlertsSignal = signal(true);
  private readonly soundEffectsSignal = signal(true);
  private readonly savingSignal = signal(false);
  private readonly successMsgSignal = signal('');
  private readonly errorMsgSignal = signal('');

  readonly passwordStrength = computed(() =>
    this.getPasswordStrength(this.newPasswordSignal()),
  );

  ngOnInit(): void {
    this.fullNameSignal.set(this.currentUser.fullName || '');
    this.usernameSignal.set(this.currentUser.username || '');
    this.emailSignal.set(this.currentUser.email || '');
    this.contactNoSignal.set(this.currentUser.contactNo || '');
    this.designationSignal.set(this.currentUser.designation || '');
    this.divisionCodeSignal.set(this.currentUser.divisionCode || 'AD');
    this.avatarUrlSignal.set(this.currentUser.avatarUrl || '');
  }

  get activeTab(): ActiveTab {
    return this.activeTabSignal();
  }
  set activeTab(value: ActiveTab) {
    this.activeTabSignal.set(value);
  }
  setActiveTab(tab: ActiveTab): void {
    this.activeTabSignal.set(tab);
  }

  get fullName(): string {
    return this.fullNameSignal();
  }
  set fullName(value: string) {
    this.fullNameSignal.set(value);
  }

  get username(): string {
    return this.usernameSignal();
  }
  set username(value: string) {
    this.usernameSignal.set(value);
  }

  get email(): string {
    return this.emailSignal();
  }
  set email(value: string) {
    this.emailSignal.set(value);
  }

  get contactNo(): string {
    return this.contactNoSignal();
  }
  set contactNo(value: string) {
    this.contactNoSignal.set(value);
  }

  get designation(): string {
    return this.designationSignal();
  }
  set designation(value: string) {
    this.designationSignal.set(value);
  }

  get divisionCode(): DivisionCode {
    return this.divisionCodeSignal();
  }
  set divisionCode(value: DivisionCode) {
    this.divisionCodeSignal.set(value);
  }

  get avatarUrl(): string {
    return this.avatarUrlSignal();
  }
  set avatarUrl(value: string) {
    this.avatarUrlSignal.set(value);
  }

  get currentPassword(): string {
    return this.currentPasswordSignal();
  }
  set currentPassword(value: string) {
    this.currentPasswordSignal.set(value);
  }

  get newPassword(): string {
    return this.newPasswordSignal();
  }
  set newPassword(value: string) {
    this.newPasswordSignal.set(value);
  }

  get confirmPassword(): string {
    return this.confirmPasswordSignal();
  }
  set confirmPassword(value: string) {
    this.confirmPasswordSignal.set(value);
  }

  get showCurrentPass(): boolean {
    return this.showCurrentPassSignal();
  }
  set showCurrentPass(value: boolean) {
    this.showCurrentPassSignal.set(value);
  }

  get showNewPass(): boolean {
    return this.showNewPassSignal();
  }
  set showNewPass(value: boolean) {
    this.showNewPassSignal.set(value);
  }

  get showConfirmPass(): boolean {
    return this.showConfirmPassSignal();
  }
  set showConfirmPass(value: boolean) {
    this.showConfirmPassSignal.set(value);
  }

  get emailNotifs(): boolean {
    return this.emailNotifsSignal();
  }
  set emailNotifs(value: boolean) {
    this.emailNotifsSignal.set(value);
  }

  get routingAlerts(): boolean {
    return this.routingAlertsSignal();
  }
  set routingAlerts(value: boolean) {
    this.routingAlertsSignal.set(value);
  }

  get soundEffects(): boolean {
    return this.soundEffectsSignal();
  }
  set soundEffects(value: boolean) {
    this.soundEffectsSignal.set(value);
  }

  get saving(): boolean {
    return this.savingSignal();
  }
  set saving(value: boolean) {
    this.savingSignal.set(value);
  }

  get successMsg(): string {
    return this.successMsgSignal();
  }
  set successMsg(value: string) {
    this.successMsgSignal.set(value);
  }

  get errorMsg(): string {
    return this.errorMsgSignal();
  }
  set errorMsg(value: string) {
    this.errorMsgSignal.set(value);
  }

  getPasswordStrength(pass: string): PasswordStrength {
    if (!pass) return { score: 0, label: 'Empty', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-amber-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  }

  strengthBarClass(): string {
    const suffix = this.passwordStrength().label.replace(/\s+/g, '');
    const classes: Record<string, string> = {
      Empty: 'settings-strengthEmpty',
      Weak: 'settings-strengthWeak',
      Medium: 'settings-strengthMedium',
      Strong: 'settings-strengthStrong',
    };
    return `settings-strengthBar ${classes[suffix] ?? ''}`;
  }

  openAvatarPicker(): void {
    this.avatarFileInput?.nativeElement.click();
  }

  async onAvatarFilePicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.errorMsgSignal.set('');
    if (file.size > 5 * 1024 * 1024) {
      this.showErrorMsg('Profile picture must be 5 MB or smaller.');
      input.value = '';
      return;
    }
    try {
      const storedFile = await firstValueFrom(
        this.api.uploadToStorage('profilePictures', file),
      );
      this.avatarUrlSignal.set(storedFile.url);
    } catch (err: unknown) {
      this.showErrorMsg(
        this.errorOf(err) || 'Could not store the profile picture.',
      );
      input.value = '';
    }
  }

  onRemoveAvatar(): void {
    this.avatarUrlSignal.set('');
    if (this.avatarFileInput) this.avatarFileInput.nativeElement.value = '';
  }

  async onSaveProfile(): Promise<void> {
    this.savingSignal.set(true);
    this.successMsgSignal.set('');
    this.errorMsgSignal.set('');

    try {
      const profileUpdate: Partial<User> = {
        fullName: this.fullNameSignal(),
        email: this.emailSignal().trim() || 'N/A',
        contactNo: this.contactNoSignal(),
        designation: this.designationSignal(),
        divisionCode: this.divisionCodeSignal(),
        avatarUrl: this.avatarUrlSignal(),
      };
      if (this.usernameSignal().trim() !== this.currentUser.username) {
        profileUpdate.username = this.usernameSignal().trim();
      }
      await this.onUpdateUser(this.currentUser.id, profileUpdate);
      const msg = 'Profile information updated successfully!';
      this.ui.showSuccess(msg);
      this.scheduleSuccessClear();
    } catch (err: unknown) {
      this.showErrorMsg(
        this.errorOf(err) || 'Failed to update profile settings.',
      );
    } finally {
      this.savingSignal.set(false);
    }
  }

  async onChangePassword(): Promise<void> {
    this.savingSignal.set(true);
    this.successMsgSignal.set('');
    this.errorMsgSignal.set('');

    if (!this.newPasswordSignal()) {
      this.showErrorMsg('Please enter a new password.');
      this.savingSignal.set(false);
      return;
    }

    if (!this.currentPasswordSignal()) {
      this.showErrorMsg('Please enter your current password.');
      this.savingSignal.set(false);
      return;
    }

    if (this.newPasswordSignal() !== this.confirmPasswordSignal()) {
      this.showErrorMsg(
        'New password and confirm password do not match.',
      );
      this.savingSignal.set(false);
      return;
    }

    if (this.newPasswordSignal().length < 6) {
      this.showErrorMsg(
        'Password must be at least 6 characters long.',
      );
      this.savingSignal.set(false);
      return;
    }

    try {
      await this.onUpdateUser(this.currentUser.id, {
        password: this.newPasswordSignal(),
        currentPassword: this.currentPasswordSignal(),
      });
      const msg = 'Password changed successfully!';
      this.ui.showSuccess(msg);
      this.currentPasswordSignal.set('');
      this.newPasswordSignal.set('');
      this.confirmPasswordSignal.set('');
      this.scheduleSuccessClear();
    } catch (err: unknown) {
      this.showErrorMsg(
        this.errorOf(err) || 'Failed to update password.',
      );
    } finally {
      this.savingSignal.set(false);
    }
  }

  private scheduleSuccessClear(): void {
    setTimeout(() => this.successMsgSignal.set(''), 4000);
  }

  private errorOf(err: unknown): string {
    return (err as { message?: string })?.message || '';
  }

  get roleLabel(): string {
    return ROLE_LABELS[this.currentUser.role] || this.currentUser.role;
  }

  private showErrorMsg(message: string): void {
    this.ui.showError(message);
  }
}
