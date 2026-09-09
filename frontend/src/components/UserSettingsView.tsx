// UserSettingsView: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { FormInput, FormSelect, FormTextarea } from "./ui/FormControls";
import { Button } from "@mui/material";
import React, { useState, useRef } from "react";
import {
  User as UserIcon,
  Lock,
  Mail,
  Phone,
  Briefcase,
  Building2,
  ShieldCheck,
  Save,
  Eye,
  EyeOff,
  Bell,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserCheck,
  Camera,
  Trash2,
} from "lucide-react";
import { User, DivisionCode } from "../types";
import { api } from "../services/api";
import type { Theme } from "@mui/material/styles";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// Design for UserSettingsView.
// BASE CSS: Pangunahing design ng component.
const userSettingsViewCss = `/* UserSettingsView.module.css */
.mui-usersettingsview-page { max-width: 64rem; margin: 0 auto; display: grid; gap: 1.5rem; }.mui-usersettingsview-profileHero, .mui-usersettingsview-section { border: 1px solid #e4e4e7; border-radius: .75rem; background: #fff; box-shadow: 0 1px 2px rgb(15 23 42 / .04); }.mui-usersettingsview-profileHero { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.5rem; }.mui-usersettingsview-profileIdentity { display: flex; align-items: center; gap: 1rem; }.mui-usersettingsview-avatarWrap { position: relative; }.mui-usersettingsview-avatar { display: flex; width: 3.5rem; height: 3.5rem; align-items: center; justify-content: center; overflow: hidden; border: 2px solid #a1a1aa; border-radius: 1rem; background: #3f3f46; color: #fff; font-size: 1.25rem; font-weight: 900; box-shadow: 0 4px 8px rgb(15 23 42 / .12); }.mui-usersettingsview-avatarImage { width: 100%; height: 100%; object-fit: cover; }.mui-usersettingsview-avatarOverlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border: 0; border-radius: 1rem; background: rgb(15 23 42 / .65); opacity: 0; cursor: pointer; transition: opacity .15s; }.mui-usersettingsview-avatarWrap:hover .mui-usersettingsview-avatarOverlay, .mui-usersettingsview-avatarOverlay:focus-visible { opacity: 1; }.mui-usersettingsview-cameraIcon { width: 1.25rem; color: #fff; }.mui-usersettingsview-hiddenInput { display: none; }.mui-usersettingsview-nameRow { display: flex; align-items: center; gap: .5rem; }.mui-usersettingsview-profileName { margin: 0; color: #18181b; font-size: 1.125rem; font-weight: 900; }.mui-usersettingsview-roleBadge { padding: .125rem .5rem; border: 1px solid #e4e4e7; border-radius: .25rem; background: #f4f4f5; color: #27272a; font-size: .625rem; font-weight: 800; text-transform: uppercase; }.mui-usersettingsview-designation { margin: .125rem 0 0; color: #71717a; font-size: .75rem; }.mui-usersettingsview-removeAvatar { display: flex; align-items: center; gap: .25rem; margin-top: .25rem; padding: 0; border: 0; background: transparent; color: #f43f5e; font-size: .625rem; font-weight: 700; cursor: pointer; }.mui-usersettingsview-removeAvatar:hover { color: #be123c; }.mui-usersettingsview-tinyIcon { width: .75rem; }.mui-usersettingsview-accountSummary { align-self: stretch; display: grid; gap: .25rem; padding: .75rem; border: 1px solid #e4e4e7; border-radius: .75rem; background: #fafafa; font-size: .75rem; }.mui-usersettingsview-summaryLabel { color: #71717a; font-weight: 500; }.mui-usersettingsview-summaryValue { color: #18181b; font-weight: 700; }.mui-usersettingsview-accountId { color: #3f3f46; font: 700 .625rem ui-monospace, monospace; }
.mui-usersettingsview-tabs { display: flex; align-items: center; gap: .5rem; padding-bottom: .5rem; border-bottom: 1px solid #e4e4e7; }.mui-usersettingsview-tab { display: flex; align-items: center; gap: .5rem; padding: .5rem 1rem; border: 1px solid #e4e4e7; border-radius: .5rem; background: #fff; color: #52525b; font-size: .75rem; font-weight: 700; cursor: pointer; transition: background-color .15s, color .15s, border-color .15s; }.mui-usersettingsview-tab:hover { background: #f4f4f5; }.mui-usersettingsview-tabActive { border-color: #3f3f46; background: #3f3f46; color: #fff; box-shadow: 0 1px 2px rgb(37 99 235 / .2); }.mui-usersettingsview-tabActive:hover { background: #27272a; }.mui-usersettingsview-smallIcon { width: 1rem; }.mui-usersettingsview-success, .mui-usersettingsview-error { display: flex; align-items: center; gap: .5rem; padding: 1rem; border-radius: .75rem; font-size: .75rem; font-weight: 700; }.mui-usersettingsview-success { border: 1px solid #a7f3d0; background: #ecfdf5; color: #065f46; }.mui-usersettingsview-error { border: 1px solid #fecdd3; background: #fff1f2; color: #9f1239; }.mui-usersettingsview-successIcon, .mui-usersettingsview-errorIcon { flex: none; width: 1rem; }.mui-usersettingsview-successIcon { color: #059669; }.mui-usersettingsview-errorIcon { color: #e11d48; }
.mui-usersettingsview-section { display: grid; gap: 1.5rem; padding: 1.5rem; }.mui-usersettingsview-sectionHeader { display: flex; align-items: center; gap: .5rem; padding-bottom: .75rem; border-bottom: 1px solid #e4e4e7; }.mui-usersettingsview-sectionIcon { width: 1.25rem; color: #3f3f46; }.mui-usersettingsview-sectionTitle { margin: 0; color: #18181b; font-size: .875rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }.mui-usersettingsview-photoPanel { padding: 1rem; border: 1px solid #e4e4e7; border-radius: .75rem; background: #fafafa; }.mui-usersettingsview-photoContent { display: flex; align-items: center; gap: 1rem; }.mui-usersettingsview-largeAvatar { display: flex; width: 5rem; height: 5rem; flex: none; align-items: center; justify-content: center; overflow: hidden; border-radius: 1rem; background: linear-gradient(135deg,#3f3f46,#52525b); color: #fff; font-size: 1.5rem; font-weight: 900; }.mui-usersettingsview-photoText { flex: 1; }.mui-usersettingsview-photoTitle { margin: 0; color: #18181b; font-size: .75rem; font-weight: 800; }.mui-usersettingsview-photoHelp { margin: .25rem 0 0; color: #71717a; font-size: .6875rem; }.mui-usersettingsview-photoActions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .75rem; }.mui-usersettingsview-uploadButton, .mui-usersettingsview-removePhotoButton, .mui-usersettingsview-saveButton, .mui-usersettingsview-passwordButton { display: flex; align-items: center; justify-content: center; gap: .5rem; border-radius: .5rem; font-weight: 700; cursor: pointer; transition: background-color .15s; }.mui-usersettingsview-uploadButton, .mui-usersettingsview-removePhotoButton { padding: .5rem .75rem; font-size: .6875rem; }.mui-usersettingsview-uploadButton { border: 0; background: #3f3f46; color: #fff; }.mui-usersettingsview-removePhotoButton { border: 1px solid #fecdd3; background: #fff; color: #e11d48; }.mui-usersettingsview-compactIcon { width: .875rem; }
.mui-usersettingsview-formGrid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 1rem; font-size: .75rem; }.mui-usersettingsview-fieldLabel { display: flex; align-items: center; gap: .25rem; margin-bottom: .25rem; color: #3f3f46; font-weight: 700; }.mui-usersettingsview-fieldIcon { width: .875rem; color: #3f3f46; }.mui-usersettingsview-input, .mui-usersettingsview-strongInput, .mui-usersettingsview-mediumInput, .mui-usersettingsview-idInput, .mui-usersettingsview-passwordInput { width: 100%; padding: .625rem; border: 1px solid #e4e4e7; border-radius: .5rem; outline: 0; background: #fafafa; color: #18181b; }.mui-usersettingsview-strongInput { font-weight: 700; }.mui-usersettingsview-mediumInput { font-weight: 500; }.mui-usersettingsview-idInput { font-family: ui-monospace, monospace; }.mui-usersettingsview-idInput:disabled { opacity: .6; cursor: not-allowed; }.mui-usersettingsview-input:focus, .mui-usersettingsview-strongInput:focus, .mui-usersettingsview-mediumInput:focus, .mui-usersettingsview-passwordInput:focus { border-color: #71717a; box-shadow: 0 0 0 2px rgb(59 130 246 / .2); }.mui-usersettingsview-saveRow, .mui-usersettingsview-passwordSaveRow { display: flex; padding-top: .5rem; }.mui-usersettingsview-saveRow { justify-content: flex-end; }.mui-usersettingsview-saveButton, .mui-usersettingsview-passwordButton { padding: .625rem 1.25rem; border: 0; color: #fff; font-size: .75rem; }.mui-usersettingsview-saveButton { background: #3f3f46; }.mui-usersettingsview-passwordButton { background: #52525b; }
.mui-usersettingsview-securityForm { max-width: 32rem; display: grid; gap: 1rem; font-size: .75rem; }.mui-usersettingsview-simpleLabel { display: block; margin-bottom: .25rem; color: #3f3f46; font-weight: 700; }.mui-usersettingsview-passwordField { position: relative; }.mui-usersettingsview-passwordInput { padding-right: 2.5rem; }.mui-usersettingsview-passwordToggle { position: absolute; top: .625rem; right: .75rem; padding: 0; border: 0; background: transparent; color: #a1a1aa; cursor: pointer; }.mui-usersettingsview-strength { display: grid; gap: .25rem; margin-top: .5rem; }.mui-usersettingsview-strengthLabels { display: flex; align-items: center; justify-content: space-between; color: #71717a; font-size: .625rem; font-weight: 700; }.mui-usersettingsview-uppercase { text-transform: uppercase; }.mui-usersettingsview-strengthTrack { width: 100%; height: .375rem; overflow: hidden; border-radius: 999px; background: #e4e4e7; }.mui-usersettingsview-strengthBar { height: 100%; transition: width .2s; }.mui-usersettingsview-strengthEmpty { background: #d4d4d8; }.mui-usersettingsview-strengthWeak { background: #f43f5e; }.mui-usersettingsview-strengthMedium { background: #f59e0b; }.mui-usersettingsview-strengthStrong { background: #10b981; }
.mui-usersettingsview-preferences { display: grid; gap: 1rem; font-size: .75rem; }.mui-usersettingsview-preference { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .875rem; border: 1px solid #e4e4e7; border-radius: .75rem; background: #fafafa; }.mui-usersettingsview-preferenceTitle { color: #18181b; font-weight: 700; }.mui-usersettingsview-preferenceHelp { color: #71717a; font-size: .6875rem; }.mui-usersettingsview-checkbox { width: 1rem; height: 1rem; accent-color: #3f3f46; cursor: pointer; }
.dark .mui-usersettingsview-profileHero, .dark .mui-usersettingsview-section { border-color: #27272a; background: #18181b; }.dark .mui-usersettingsview-profileName, .dark .mui-usersettingsview-summaryValue, .dark .mui-usersettingsview-sectionTitle, .dark .mui-usersettingsview-photoTitle, .dark .mui-usersettingsview-preferenceTitle { color: #fff; }.dark .mui-usersettingsview-roleBadge { border-color: #3f3f46; background: #172554; color: #d4d4d8; }.dark .mui-usersettingsview-designation, .dark .mui-usersettingsview-summaryLabel, .dark .mui-usersettingsview-photoHelp { color: #a1a1aa; }.dark .mui-usersettingsview-accountSummary, .dark .mui-usersettingsview-photoPanel, .dark .mui-usersettingsview-preference { border-color: #3f3f46; background: rgb(30 41 59 / .65); }.dark .mui-usersettingsview-tabs, .dark .mui-usersettingsview-sectionHeader { border-color: #27272a; }.dark .mui-usersettingsview-tab { border-color: #27272a; background: #18181b; color: #a1a1aa; }.dark .mui-usersettingsview-tab:hover { background: #27272a; }.dark .mui-usersettingsview-tabActive { border-color: #3f3f46; background: #3f3f46; color: #fff; }.dark .mui-usersettingsview-success { border-color: #065f46; background: rgb(2 44 34 / .6); color: #a7f3d0; }.dark .mui-usersettingsview-error { border-color: #9f1239; background: rgb(76 5 25 / .6); color: #fecdd3; }.dark .mui-usersettingsview-fieldLabel, .dark .mui-usersettingsview-simpleLabel { color: #d4d4d8; }.dark .mui-usersettingsview-input, .dark .mui-usersettingsview-strongInput, .dark .mui-usersettingsview-mediumInput, .dark .mui-usersettingsview-idInput, .dark .mui-usersettingsview-passwordInput { border-color: #3f3f46; background: #27272a; color: #fff; }.dark .mui-usersettingsview-strengthTrack { background: #3f3f46; }
@media (max-width:639px) { .mui-usersettingsview-profileHero { align-items: flex-start; flex-direction: column; }.mui-usersettingsview-photoContent { align-items: flex-start; flex-direction: column; }.mui-usersettingsview-formGrid { grid-template-columns: 1fr; }.mui-usersettingsview-tabs { display: grid; grid-template-columns: 1fr; overflow: visible; }.mui-usersettingsview-tab { width: 100%; justify-content: flex-start; }.mui-usersettingsview-saveButton, .mui-usersettingsview-passwordButton { width: 100%; } }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const userSettingsViewStyles = {
  accountId: "mui-usersettingsview-accountId",
  accountSummary: "mui-usersettingsview-accountSummary",
  avatar: "mui-usersettingsview-avatar",
  avatarImage: "mui-usersettingsview-avatarImage",
  avatarOverlay: "mui-usersettingsview-avatarOverlay",
  avatarWrap: "mui-usersettingsview-avatarWrap",
  cameraIcon: "mui-usersettingsview-cameraIcon",
  checkbox: "mui-usersettingsview-checkbox",
  compactIcon: "mui-usersettingsview-compactIcon",
  designation: "mui-usersettingsview-designation",
  error: "mui-usersettingsview-error",
  errorIcon: "mui-usersettingsview-errorIcon",
  fieldIcon: "mui-usersettingsview-fieldIcon",
  fieldLabel: "mui-usersettingsview-fieldLabel",
  formGrid: "mui-usersettingsview-formGrid",
  hiddenInput: "mui-usersettingsview-hiddenInput",
  idInput: "mui-usersettingsview-idInput",
  input: "mui-usersettingsview-input",
  largeAvatar: "mui-usersettingsview-largeAvatar",
  mediumInput: "mui-usersettingsview-mediumInput",
  nameRow: "mui-usersettingsview-nameRow",
  page: "mui-usersettingsview-page",
  passwordButton: "mui-usersettingsview-passwordButton",
  passwordField: "mui-usersettingsview-passwordField",
  passwordInput: "mui-usersettingsview-passwordInput",
  passwordSaveRow: "mui-usersettingsview-passwordSaveRow",
  passwordToggle: "mui-usersettingsview-passwordToggle",
  photoActions: "mui-usersettingsview-photoActions",
  photoContent: "mui-usersettingsview-photoContent",
  photoHelp: "mui-usersettingsview-photoHelp",
  photoPanel: "mui-usersettingsview-photoPanel",
  photoText: "mui-usersettingsview-photoText",
  photoTitle: "mui-usersettingsview-photoTitle",
  preference: "mui-usersettingsview-preference",
  preferenceHelp: "mui-usersettingsview-preferenceHelp",
  preferenceTitle: "mui-usersettingsview-preferenceTitle",
  preferences: "mui-usersettingsview-preferences",
  profileHero: "mui-usersettingsview-profileHero",
  profileIdentity: "mui-usersettingsview-profileIdentity",
  profileName: "mui-usersettingsview-profileName",
  removeAvatar: "mui-usersettingsview-removeAvatar",
  removePhotoButton: "mui-usersettingsview-removePhotoButton",
  roleBadge: "mui-usersettingsview-roleBadge",
  saveButton: "mui-usersettingsview-saveButton",
  saveRow: "mui-usersettingsview-saveRow",
  section: "mui-usersettingsview-section",
  sectionHeader: "mui-usersettingsview-sectionHeader",
  sectionIcon: "mui-usersettingsview-sectionIcon",
  sectionTitle: "mui-usersettingsview-sectionTitle",
  securityForm: "mui-usersettingsview-securityForm",
  simpleLabel: "mui-usersettingsview-simpleLabel",
  smallIcon: "mui-usersettingsview-smallIcon",
  strength: "mui-usersettingsview-strength",
  strengthBar: "mui-usersettingsview-strengthBar",
  strengthEmpty: "mui-usersettingsview-strengthEmpty",
  strengthLabels: "mui-usersettingsview-strengthLabels",
  strengthMedium: "mui-usersettingsview-strengthMedium",
  strengthStrong: "mui-usersettingsview-strengthStrong",
  strengthTrack: "mui-usersettingsview-strengthTrack",
  strengthWeak: "mui-usersettingsview-strengthWeak",
  strongInput: "mui-usersettingsview-strongInput",
  success: "mui-usersettingsview-success",
  successIcon: "mui-usersettingsview-successIcon",
  summaryLabel: "mui-usersettingsview-summaryLabel",
  summaryValue: "mui-usersettingsview-summaryValue",
  tab: "mui-usersettingsview-tab",
  tabActive: "mui-usersettingsview-tabActive",
  tabs: "mui-usersettingsview-tabs",
  tinyIcon: "mui-usersettingsview-tinyIcon",
  uploadButton: "mui-usersettingsview-uploadButton",
  uppercase: "mui-usersettingsview-uppercase",
} as const;

// THEME: Kulay, spacing, at itsura sa light at dark mode.
const createUserSettingsViewStyles = (theme: Theme) => {
  const dark = theme.palette.mode === "dark";
  const surface = theme.palette.background.paper;
  const soft = dark ? "#18181b" : "#fafafa";
  const border = theme.palette.divider;
  const text = theme.palette.text.primary;
  const shadow = "0 1px 2px rgba(24,24,27,.04)";
  return {
    ".mui-usersettingsview-page": {
      gap: "16px !important",
    },
    ".mui-usersettingsview-profileHero": {
      padding: "16px 18px !important",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
    },
    ".mui-usersettingsview-profileName": {
      color: text + " !important",
      fontSize: "20px !important",
      lineHeight: "1.3 !important",
      letterSpacing: "-.025em !important",
    },
    ".mui-usersettingsview-section": {
      overflow: "hidden",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
      padding: "20px !important",
    },
    ".mui-usersettingsview-preference": {
      borderRadius: "12px !important",
      background: soft + " !important",
    },
    ".mui-usersettingsview-photoPanel": {
      borderRadius: "12px !important",
      background: soft + " !important",
    },
    // MOBILE: Design para sa maliit na screen.
    "@media (max-width: 767px)": {
      ".mui-usersettingsview-profileHero": { padding: "14px !important" },
      ".mui-usersettingsview-section": { padding: "16px !important" },
    },
  };
};
const styles = userSettingsViewStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

const classes = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

// DATA: Mga props at uri ng data na ginagamit ng component.
interface UserSettingsViewProps {
  currentUser: User;
  onUpdateUser: (
    updatedData: Partial<User> & { currentPassword?: string },
  ) => Promise<void>;
}

// LOGIC: State, events, at pagproseso ng data.
export const UserSettingsView: React.FC<UserSettingsViewProps> = ({
  currentUser,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "preferences"
  >("profile");

  // Profile State
  const [fullName, setFullName] = useState<string>(currentUser.fullName || "");
  const [username, setUsername] = useState<string>(currentUser.username || "");
  const [email, setEmail] = useState<string>(currentUser.email || "");
  const [contactNo, setContactNo] = useState<string>(
    currentUser.contactNo || "",
  );
  const [designation, setDesignation] = useState<string>(
    currentUser.designation || "",
  );
  const [divisionCode, setDivisionCode] = useState<DivisionCode>(
    currentUser.divisionCode || "AD",
  );

  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string>(
    currentUser.avatarUrl || "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password State
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmPass, setShowConfirmPass] = useState<boolean>(false);

  // Notifications & Preferences State
  const [emailNotifs, setEmailNotifs] = useState<boolean>(true);
  const [routingAlerts, setRoutingAlerts] = useState<boolean>(true);
  const [soundEffects, setSoundEffects] = useState<boolean>(true);

  // Status message
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Password Strength Calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "Empty", color: "bg-slate-200" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score, label: "Weak", color: "bg-rose-500" };
    if (score <= 4) return { score, label: "Medium", color: "bg-amber-500" };
    return { score, label: "Strong", color: "bg-emerald-500" };
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg("");
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Profile picture must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }
    try {
      const storedFile = await api.uploadToStorage("profilePictures", file);
      setAvatarUrl(storedFile.url);
    } catch (error: any) {
      setErrorMsg(error.message || "Could not store the profile picture.");
      e.target.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const profileUpdate: Partial<User> = {
        fullName,
        email: email.trim() || "N/A",
        contactNo,
        designation,
        divisionCode,
        avatarUrl,
      };
      if (username.trim() !== currentUser.username) {
        profileUpdate.username = username.trim();
      }
      await onUpdateUser(profileUpdate);
      setSuccessMsg("✅ Profile information updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (!newPassword) {
      setErrorMsg("Please enter a new password.");
      setSaving(false);
      return;
    }

    if (!currentPassword) {
      setErrorMsg("Please enter your current password.");
      setSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirm password do not match.");
      setSaving(false);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      setSaving(false);
      return;
    }

    try {
      await onUpdateUser({
        password: newPassword,
        currentPassword,
      });
      setSuccessMsg("🔒 Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <UserSettingsViewDesign />
      {
        <div className={styles.page}>
          {/* Header Banner */}
          <div className={styles.profileHero}>
            <div className={styles.profileIdentity}>
              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className={styles.avatarImage}
                    />
                  ) : (
                    <span>
                      {currentUser.fullName
                        ? currentUser.fullName.charAt(0)
                        : "U"}
                    </span>
                  )}
                </div>
                <div
                  className={styles.avatarOverlay}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className={styles.cameraIcon} />
                </div>
                <FormInput
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.hiddenInput}
                  onChange={handleAvatarUpload}
                />
              </div>
              <div>
                <div className={styles.nameRow}>
                  <h2 className={styles.profileName}>
                    Account settings
                  </h2>
                  <span className={styles.roleBadge}>{currentUser.role}</span>
                </div>
                <p className={styles.designation}>
                  Manage your personal profile, credentials, security password,
                  and notification preferences
                </p>
                {avatarUrl && (
                  <Button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className={styles.removeAvatar}
                  >
                    <Trash2 className={styles.tinyIcon} />
                    <span>Remove photo</span>
                  </Button>
                )}
              </div>
            </div>

            {/* User Quick Info */}
            <div className={styles.accountSummary}>
              <div className={styles.summaryLabel}>Logged in as:</div>
              <div className={styles.preferenceTitle}>
                {currentUser.email || currentUser.username}
              </div>
              <div className={styles.accountId}>
                Division: {currentUser.divisionCode}
              </div>
            </div>
          </div>

          {/* Tabs Bar */}
          <div className={styles.tabs}>
            <Button
              type="button"
              onClick={() => setActiveTab("profile")} variant={activeTab === "profile" ? "contained" : "text"}
              className={classes(
                styles.tab,
                activeTab === "profile" && styles.tabActive,
              )}
            >
              <UserIcon className={styles.smallIcon} />
              <span>Profile Details</span>
            </Button>

            <Button
              type="button"
              onClick={() => setActiveTab("security")} variant={activeTab === "security" ? "contained" : "text"}
              className={classes(
                styles.tab,
                activeTab === "security" && styles.tabActive,
              )}
            >
              <Lock className={styles.smallIcon} />
              <span>Change Password & Security</span>
            </Button>

            <Button
              type="button"
              onClick={() => setActiveTab("preferences")} variant={activeTab === "preferences" ? "contained" : "text"}
              className={classes(
                styles.tab,
                activeTab === "preferences" && styles.tabActive,
              )}
            >
              <Bell className={styles.smallIcon} />
              <span>System Preferences</span>
            </Button>
          </div>

          {/* Alert Banners */}
          {successMsg && (
            <div className={styles.success}>
              <CheckCircle2 className={styles.successIcon} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className={styles.error}>
              <AlertCircle className={styles.errorIcon} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PROFILE DETAILS FORM */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className={styles.section}>
              <div className={styles.sectionHeader}>
                <UserCheck className={styles.sectionIcon} />
                <h3 className={styles.sectionTitle}>
                  Personal & Official Identification
                </h3>
              </div>

              <div className={styles.photoPanel}>
                <div className={styles.photoContent}>
                  <div className={styles.largeAvatar}>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={`${fullName || "User"} profile preview`}
                        className={styles.avatarImage}
                      />
                    ) : (
                      fullName.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                  <div className={styles.photoText}>
                    <p className={styles.photoTitle}>Profile Picture</p>
                    <p className={styles.photoHelp}>
                      Upload a JPG, PNG, or WebP image up to 5 MB. It will also
                      appear in your account and logout menu after saving.
                    </p>
                    <div className={styles.photoActions}>
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={styles.uploadButton}
                      >
                        <Camera className={styles.compactIcon} />
                        {avatarUrl ? "Change Photo" : "Upload Photo"}
                      </Button>
                      {avatarUrl && (
                        <Button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className={styles.removePhotoButton}
                        >
                          <Trash2 className={styles.compactIcon} />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.formGrid}>
                {/* Full Name */}
                <div>
                  <label className={styles.fieldLabel}>
                    <UserIcon className={styles.fieldIcon} />
                    <span>Full Name:</span>
                  </label>
                  <FormInput
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className={styles.strongInput}
                  />
                </div>

                {/* Username */}
                <div>
                  <label className={styles.fieldLabel}>
                    <KeyRound className={styles.fieldIcon} />
                    <span>Account Username:</span>
                  </label>
                  <FormInput
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={currentUser.role === "SYSTEM_ADMIN"}
                    placeholder="e.g. fcatral"
                    required
                    className={styles.idInput}
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className={styles.fieldLabel}>
                    <Mail className={styles.fieldIcon} />
                    <span>Official Email Address:</span>
                  </label>
                  <FormInput
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. fcatral@blgf.gov.ph or N/A"
                    className={styles.input}
                  />
                </div>

                {/* Contact Number */}
                <div>
                  <label className={styles.fieldLabel}>
                    <Phone className={styles.fieldIcon} />
                    <span>Contact Number:</span>
                  </label>
                  <FormInput
                    type="text"
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value)}
                    placeholder="e.g. +63 917 123 4567"
                    className={styles.input}
                  />
                </div>

                {/* Designation / Position */}
                <div>
                  <label className={styles.fieldLabel}>
                    <Briefcase className={styles.fieldIcon} />
                    <span>Official Position / Designation:</span>
                  </label>
                  <FormInput
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Regional Director / Action Officer"
                    className={styles.mediumInput}
                  />
                </div>

                {/* Office / Division Code */}
                <div>
                  <label className={styles.fieldLabel}>
                    <Building2 className={styles.fieldIcon} />
                    <span>Assigned Division / Office:</span>
                  </label>
                  <FormSelect
                    value={divisionCode}
                    onChange={(e) =>
                      setDivisionCode(e.target.value as DivisionCode)
                    }
                    className={styles.strongInput}
                  >
                    <option value="ITMS">
                      Information Technology Management System (ITMS)
                    </option>
                    <option value="ORD">
                      Office of the Regional Director (ORD)
                    </option>
                    <option value="AD">Administrative Division (AD)</option>
                    <option value="LAOD">
                      Local Assessment Operations Division (LAOD)
                    </option>
                    <option value="LTOD">
                      Local Treasury Operations Division (LTOD)
                    </option>
                    <option value="FD">Financial Division (FD)</option>
                  </FormSelect>
                </div>
              </div>

              <div className={styles.saveRow}>
                <Button
                  type="submit"
                  disabled={saving}
                  className={styles.saveButton}
                >
                  <Save className={styles.smallIcon} />
                  <span>
                    {saving ? "Saving Profile..." : "Save Profile Changes"}
                  </span>
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: CHANGE PASSWORD & SECURITY */}
          {activeTab === "security" && (
            <form onSubmit={handleChangePassword} className={styles.section}>
              <div className={styles.sectionHeader}>
                <ShieldCheck className={styles.sectionIcon} />
                <h3 className={styles.sectionTitle}>Change Account Password</h3>
              </div>

              <div className={styles.securityForm}>
                {/* Current Password */}
                <div>
                  <label className={styles.simpleLabel}>
                    Current Password:
                  </label>
                  <div className={styles.passwordField}>
                    <FormInput
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current account password"
                      className={styles.passwordInput}
                    />

                    <Button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className={styles.passwordToggle} sx={{ position: "absolute", right: 4, top: 2, minWidth: 36, width: 36, padding: 0 }} aria-label="Toggle password visibility"
                    >
                      {showCurrentPass ? (
                        <EyeOff className={styles.smallIcon} />
                      ) : (
                        <Eye className={styles.smallIcon} />
                      )}
                    </Button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className={styles.simpleLabel}>New Password:</label>
                  <div className={styles.passwordField}>
                    <FormInput
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className={styles.passwordInput}
                    />

                    <Button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className={styles.passwordToggle} sx={{ position: "absolute", right: 4, top: 2, minWidth: 36, width: 36, padding: 0 }} aria-label="Toggle password visibility"
                    >
                      {showNewPass ? (
                        <EyeOff className={styles.smallIcon} />
                      ) : (
                        <Eye className={styles.smallIcon} />
                      )}
                    </Button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className={styles.strength}>
                      <div className={styles.strengthLabels}>
                        <span>Password Strength:</span>
                        <span className={styles.uppercase}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className={styles.strengthTrack}>
                        <div
                          className={classes(
                            styles.strengthBar,
                            styles[
                              `strength${passwordStrength.label.replace(/\s+/g, "")}`
                            ],
                          )}
                          style={{
                            width: `${(passwordStrength.score / 5) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className={styles.simpleLabel}>
                    Confirm New Password:
                  </label>
                  <div className={styles.passwordField}>
                    <FormInput
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className={styles.passwordInput}
                    />

                    <Button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className={styles.passwordToggle} sx={{ position: "absolute", right: 4, top: 2, minWidth: 36, width: 36, padding: 0 }} aria-label="Toggle password visibility"
                    >
                      {showConfirmPass ? (
                        <EyeOff className={styles.smallIcon} />
                      ) : (
                        <Eye className={styles.smallIcon} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className={styles.passwordSaveRow}>
                <Button
                  type="submit"
                  disabled={saving}
                  className={styles.passwordButton}
                >
                  <Lock className={styles.smallIcon} />
                  <span>
                    {saving
                      ? "Updating Password..."
                      : "Update Security Password"}
                  </span>
                </Button>
              </div>
            </form>
          )}

          {/* TAB 3: SYSTEM PREFERENCES */}
          {activeTab === "preferences" && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Bell className={styles.sectionIcon} />
                <h3 className={styles.sectionTitle}>
                  System Notification & Workflow Settings
                </h3>
              </div>

              <div className={styles.preferences}>
                {/* Email Notifications */}
                <div className={styles.preference}>
                  <div>
                    <div className={styles.preferenceTitle}>
                      Email Document Routing Alerts
                    </div>
                    <div className={styles.preferenceHelp}>
                      Receive an email notification whenever a document is
                      routed to your division.
                    </div>
                  </div>
                  <FormInput
                    type="checkbox"
                    checked={emailNotifs}
                    onChange={(e) => setEmailNotifs(e.target.checked)}
                    className={styles.checkbox}
                  />
                </div>

                {/* Desktop Popups */}
                <div className={styles.preference}>
                  <div>
                    <div className={styles.preferenceTitle}>
                      Real-Time Routing Popups
                    </div>
                    <div className={styles.preferenceHelp}>
                      Show in-app notification toasts when urgent documents
                      require immediate signature.
                    </div>
                  </div>
                  <FormInput
                    type="checkbox"
                    checked={routingAlerts}
                    onChange={(e) => setRoutingAlerts(e.target.checked)}
                    className={styles.checkbox}
                  />
                </div>

                {/* Audio Feedback */}
                <div className={styles.preference}>
                  <div>
                    <div className={styles.preferenceTitle}>
                      System Audio Alerts
                    </div>
                    <div className={styles.preferenceHelp}>
                      Play subtle chime sounds on document receipt and release
                      logs.
                    </div>
                  </div>
                  <FormInput
                    type="checkbox"
                    checked={soundEffects}
                    onChange={(e) => setSoundEffects(e.target.checked)}
                    className={styles.checkbox}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function UserSettingsViewDesign() {
  const theme = useComponentTheme();
  return (
    <ComponentGlobalStyles
      styles={[userSettingsViewCss, createUserSettingsViewStyles(theme)]}
    />
  );
}
