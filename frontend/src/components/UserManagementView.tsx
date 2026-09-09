// UserManagementView
// Data, events, layout, at kasalukuyang inline design ng component.

// IMPORTS: Mga component, helper, at library na ginagamit dito.
import { FormInput, FormSelect, FormTextarea } from "./ui/FormControls";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { cx } from "../styles/muiClasses";
import React, { useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Search,
  Settings2,
  Check,
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Mail,
  ClipboardList,
  Settings,
  ShieldAlert,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Building2,
  QrCode,
  UserCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  User,
  Role,
  DivisionCode,
  RolePermission,
  DEFAULT_ROLE_PERMISSIONS,
  Division,
} from "../types";
import { showConfirm } from "../services/dialogService";

// DATA: Mga props at uri ng data na ginagamit ng component.
interface UserManagementViewProps {
  users: User[];
  onCreateUser: (user: Partial<User>) => void;
  onUpdateUser: (id: string, user: Partial<User>) => void | Promise<void>;
  onDeleteUser?: (id: string) => void | Promise<void>;
  currentUser: User;
  divisions: Division[];
  onCreateDivision: (division: Omit<Division, "id">) => Promise<void>;
  onUpdateDivision: (id: string, division: Partial<Division>) => Promise<void>;
  onDeleteDivision: (id: string) => Promise<void>;
}

const ALL_ROLES: {
  role: Role;
  label: string;
  badgeColor: string;
  description: string;
}[] = [
  {
    role: "ORD",
    label: "Office of the Regional Director",
    badgeColor:
      "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    description:
      "Primary regional office authority. Oversees all documents, complete routing history, and office operations.",
  },
  {
    role: "SYSTEM_ADMIN",
    label: "System Administrator",
    badgeColor:
      "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    description:
      "Full administrative authority over system settings, user roles, database, and all document operations.",
  },
  {
    role: "ADMIN",
    label: "Administrative Division",
    badgeColor:
      "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    description:
      "Administrative Division transaction access. Sees only assigned and division-related records.",
  },
  {
    role: "RECORDS_OFFICER",
    label: "Records Officer",
    badgeColor:
      "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    description:
      "Central receiving & dispatch officer. Manages incoming/outgoing documents, envelope logs, and routing slips.",
  },
  {
    role: "DIVISION_CHIEF",
    label: "Division Chief",
    badgeColor:
      "bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
    description:
      "Head of operating division. Reviews and routes documents, assigns tasks to action officers.",
  },
  {
    role: "ACTION_OFFICER",
    label: "Action Officer",
    badgeColor:
      "bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
    description:
      "Processes assigned communications, drafts responses, and completes assigned workflow steps.",
  },
  {
    role: "STAFF",
    label: "Administrative Staff",
    badgeColor:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    description:
      "General staff access to view division communications, print routing slips, and check document status.",
  },
];

const MENU_ITEMS_LIST = [
  {
    id: "dashboard",
    label: "Operations Dashboard",
    section: "Main Menu",
    icon: LayoutDashboard,
  },
  {
    id: "division-workload",
    label: "Division Workload Distribution",
    section: "Main Menu",
    icon: Building2,
  },
  {
    id: "incoming",
    label: "Incoming Documents",
    section: "Main Menu",
    icon: ArrowDownLeft,
    badge: "3",
  },
  {
    id: "outgoing",
    label: "Outgoing Documents",
    section: "Main Menu",
    icon: ArrowUpRight,
  },
  {
    id: "incoming-report",
    label: "Incoming Documents Report",
    section: "Reports",
    icon: ArrowDownLeft,
  },
  {
    id: "outgoing-report",
    label: "Outgoing Documents Report",
    section: "Reports",
    icon: ArrowUpRight,
  },
  {
    id: "envelope-report",
    label: "Envelope Dispatch Report",
    section: "Reports",
    icon: Mail,
  },
  {
    id: "slip",
    label: "Document Routing Slip",
    section: "Main Menu",
    icon: Printer,
  },
  {
    id: "envelope",
    label: "Outgoing Envelope Format DL / #10",
    section: "Main Menu",
    icon: Mail,
  },
  {
    id: "employees",
    label: "Office Directory",
    section: "Main Menu",
    icon: UserCircle,
  },
  {
    id: "qr",
    label: "QR Code Generator",
    section: "Main Menu",
    icon: QrCode,
  },
  {
    id: "envelope-logs",
    label: "Outgoing Envelope Logs",
    section: "Management",
    icon: Mail,
  },
  {
    id: "audit",
    label: "System Audit Logs & Security Trail",
    section: "Management",
    icon: ClipboardList,
  },
  {
    id: "users",
    label: "User Accounts & Roles",
    section: "Management",
    icon: Users,
  },
  {
    id: "settings",
    label: "Account & Settings",
    section: "Management",
    icon: Settings,
  },
];

const ACTION_PERMISSIONS = [
  {
    id: "NOTIFICATION_VIEW_ALL",
    label: "View All Document Transaction Notifications",
  },
  {
    id: "ROUTING_MONITOR_VIEW",
    label: "View Routing Follow-up Module",
  },
  {
    id: "ROUTING_REMINDER_SEND",
    label: "Send Action Reminders to Document Handlers",
  },
  {
    id: "WORKFLOW_OPTION_MANAGE",
    label: "Add, Edit, Delete and Color Workflow Options",
  },
  { id: "EMPLOYEE_CREATE", label: "Add Office Directory Personnel / Staff" },
  { id: "EMPLOYEE_EDIT", label: "Edit Office Directory Personnel / Staff" },
  { id: "EMPLOYEE_DELETE", label: "Delete Office Directory Personnel / Staff" },
  {
    id: "EMPLOYEE_FOLDER_MANAGE",
    label: "Manage Employee Folders and Attachments",
  },
];

// LOGIC: State, events, at pagproseso ng data.
export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  currentUser,
  divisions,
  onCreateDivision,
  onUpdateDivision,
  onDeleteDivision,
}) => {
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "divisions">(
    "users",
  );

  // Password visibility states
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Role Permissions Master State
  const [rolePermissions, setRolePermissions] = useState<
    Record<Role, RolePermission>
  >(() => {
    try {
      const stored = localStorage.getItem("blgf_role_permissions");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ROLE_PERMISSIONS;
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("STAFF");
  const [divisionCode, setDivisionCode] = useState<DivisionCode>("AD");
  const [designation, setDesignation] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [divisionName, setDivisionName] = useState("");
  const [divisionHead, setDivisionHead] = useState("");
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(
    null,
  );
  const [formPermissions, setFormPermissions] = useState<RolePermission>(
    DEFAULT_ROLE_PERMISSIONS["STAFF"],
  );

  const generateTemporaryPassword = () => {
    const alphabet =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    const randomValues = crypto.getRandomValues(new Uint32Array(12));
    const temporaryPassword = Array.from(
      randomValues,
      (value) => alphabet[value % alphabet.length],
    ).join("");
    setPassword(temporaryPassword);
    setShowEditPassword(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !password) {
      alert("Please fill out full name, username, and password");
      return;
    }
    if (
      role === "SYSTEM_ADMIN" &&
      users.filter((user) => user.role === "SYSTEM_ADMIN").length >= 3
    ) {
      alert("Only three System Administrator accounts are allowed.");
      return;
    }

    onCreateUser({
      fullName,
      username,
      password,
      email: email.trim() || "N/A",
      role,
      divisionCode,
      designation: designation || "Staff Officer",
      contactNo: contactNo || "0917-000-0000",
      active: true,
      permissions: formPermissions,
    });

    setShowCreateModal(false);
    resetForm();
    alert(`✅ Personnel account "${fullName}" created successfully!`);
  };

  const resetForm = () => {
    setFullName("");
    setUsername("");
    setPassword("");
    setEmail("");
    setDesignation("");
    setContactNo("");
    setRole("STAFF");
    setDivisionCode("AD");
    setShowCreatePassword(false);
    setShowEditPassword(false);
    setFormPermissions(
      rolePermissions["STAFF"] || DEFAULT_ROLE_PERMISSIONS["STAFF"],
    );
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setUsername(user.username);
    setPassword("");
    setEmail(user.email);
    setRole(user.role);
    setDivisionCode(user.divisionCode);
    setDesignation(user.designation);
    setContactNo(user.contactNo || "");
    setShowEditPassword(false);
    setFormPermissions(
      user.permissions ||
        rolePermissions[user.role] ||
        DEFAULT_ROLE_PERMISSIONS[user.role],
    );
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (
      role === "SYSTEM_ADMIN" &&
      editingUser.role !== "SYSTEM_ADMIN" &&
      users.filter((user) => user.role === "SYSTEM_ADMIN").length >= 3
    ) {
      alert("Only three System Administrator accounts are allowed.");
      return;
    }

    await onUpdateUser(editingUser.id, {
      fullName,
      username,
      ...(password.trim() ? { password: password.trim() } : {}),
      email: email.trim() || "N/A",
      role,
      divisionCode,
      designation,
      contactNo,
      permissions: formPermissions,
    });

    setEditingUser(null);
    resetForm();
    alert(`✅ User account "${fullName}" updated successfully!`);
  };

  const handleDelete = async (user: User) => {
    if (user.role === "SYSTEM_ADMIN") {
      alert("System Administrator accounts cannot be deleted.");
      return;
    }
    if (user.id === currentUser.id) {
      alert("You cannot delete your own active administrator account.");
      return;
    }
    if (
      await showConfirm(
        `Are you sure you want to permanently delete user account "${user.fullName}" (@${user.username})?`,
      )
    ) {
      try {
        if (onDeleteUser) {
          await onDeleteUser(user.id);
        } else {
          await onUpdateUser(user.id, { active: false });
        }
        alert(`User account ${user.fullName} deleted.`);
      } catch (error) {
        alert(
          `Failed to delete user account: ${
            error instanceof Error ? error.message : "Unknown server error"
          }`,
        );
      }
    }
  };

  // Toggle role permissions in role configurator tab
  const handleToggleSectionPermission = (
    roleName: Role,
    section: "mainMenu" | "management",
  ) => {
    setRolePermissions((prev) => {
      const currentRolePerm =
        prev[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName];
      const updated = {
        ...prev,
        [roleName]: {
          ...currentRolePerm,
          [section]: !currentRolePerm[section],
        },
      };
      return updated;
    });
  };

  const handleToggleViewPermission = (roleName: Role, viewId: string) => {
    setRolePermissions((prev) => {
      const currentRolePerm =
        prev[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName];
      const currentAllowed = currentRolePerm.allowedViews || [];
      const hasView = currentAllowed.includes(viewId);
      const newAllowed = hasView
        ? currentAllowed.filter((id) => id !== viewId)
        : [...currentAllowed, viewId];

      const updated = {
        ...prev,
        [roleName]: {
          ...currentRolePerm,
          allowedViews: newAllowed,
        },
      };
      return updated;
    });
  };

  const handleToggleActionPermission = (roleName: Role, actionId: string) => {
    setRolePermissions((prev) => {
      const current = prev[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName];
      const actions = current.allowedActions || [];
      const updated = {
        ...prev,
        [roleName]: {
          ...current,
          allowedActions: actions.includes(actionId)
            ? actions.filter((item) => item !== actionId)
            : [...actions, actionId],
        },
      };
      return updated;
    });
  };

  const handleApplyRolePermissionsToUsers = async (
    roleName: Role,
    showMessage = true,
  ) => {
    const targetPerms = {
      ...(rolePermissions[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName]),
      notificationViewAllConfigured: true,
    };
    const roleUsers = users.filter((u) => u.role === roleName);

    if (roleUsers.length === 0) {
      if (showMessage) {
        alert(
          `No active personnel found with the role "${roleName}". Custom permissions saved for future accounts.`,
        );
      }
      return;
    }

    await Promise.all(
      roleUsers.map((u) => onUpdateUser(u.id, { permissions: targetPerms })),
    );

    if (showMessage)
      alert(
        `🎉 Successfully updated and applied menu access permissions to ${roleUsers.length} personnel with role "${roleName}"!`,
      );
  };

  const handleResetRolePermissions = async () => {
    if (
      await showConfirm(
        "Reset all user role menu access permissions back to System Defaults?",
      )
    ) {
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      alert("↺ Role menu permissions reset to defaults.");
    }
  };

  const visibleUsers =
    currentUser.role === "SYSTEM_ADMIN"
      ? users
      : users.filter((user) => user.role !== "SYSTEM_ADMIN");

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredUsers = visibleUsers.filter((user) =>
    [
      user.fullName,
      user.id,
      user.username,
      user.email,
      user.divisionCode,
      user.designation,
      user.role,
    ].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(normalizedSearchTerm),
    ),
  );

  const resetDivisionForm = () => {
    setDivisionCode("AD");
    setDivisionName("");
    setDivisionHead("");
    setEditingDivisionId(null);
  };

  const handleDivisionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      code: divisionCode,
      name: divisionName.trim(),
      chiefName: divisionHead.trim(),
    };
    if (editingDivisionId) {
      await onUpdateDivision(editingDivisionId, payload);
    } else {
      await onCreateDivision({ ...payload, email: "" });
    }
    resetDivisionForm();
  };

  // LAYOUT: Ang nakikita sa screen.
  return (
    <div className={cx("space-y-5")}>
      {/* Top Header Card */}
      <div
        className={cx(
          "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4",
        )}
      >
        <div>
          <h2
            className={cx(
              "text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2",
            )}
          >
            <Users className={cx("w-5 h-5 text-slate-600 dark:text-slate-400")} />
            <span>Users & access</span>
          </h2>
          <p
            className={cx(
              "text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium",
            )}
          >
            Manage personnel accounts and configure menu section access
            permissions (Main Menu & Management) per user role
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          className={cx(
            "flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700",
          )}
        >
          <Button
            type="button"
            onClick={() => setActiveTab("users")}
            className={cx(
              `px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "users"
                  ? "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`,
            )}
          >
            <Users className={cx("w-3.5 h-3.5")} />
            <span>Personnel List ({visibleUsers.length})</span>
          </Button>

          <Button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={cx(
              `px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "roles"
                  ? "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`,
            )}
          >
            <ShieldCheck
              className={cx("w-3.5 h-3.5 text-purple-600 dark:text-purple-400")}
            />
            <span>Role Menu Access Matrix</span>
          </Button>
          <Button
            type="button"
            onClick={() => setActiveTab("divisions")}
            className={cx(
              `px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "divisions"
                  ? "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`,
            )}
          >
            <Building2 className={cx("w-3.5 h-3.5")} />
            <span>Divisions ({divisions.length})</span>
          </Button>
        </div>
      </div>

      {activeTab === "divisions" && (
        <div className={cx("grid gap-4 lg:grid-cols-[360px_1fr]")}>
          <form
            onSubmit={handleDivisionSubmit}
            className={cx(
              "space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900",
            )}
          >
            <h3 className={cx("font-extrabold text-slate-900 dark:text-white")}>
              {editingDivisionId ? "Edit Division" : "Manual Division Entry"}
            </h3>
            <FormSelect
              value={divisionCode}
              onChange={(event) =>
                setDivisionCode(event.target.value as DivisionCode)
              }
              className={cx(
                "w-full rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800",
              )}
            >
              {(
                [
                  "ITMS",
                  "ORD",
                  "AD",
                  "LAOD",
                  "LTOD",
                  "FD",
                  "LU",
                ] as DivisionCode[]
              ).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </FormSelect>
            <FormInput
              required
              value={divisionName}
              onChange={(event) => setDivisionName(event.target.value)}
              placeholder="Division name"
              className={cx(
                "w-full rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800",
              )}
            />

            <FormInput
              required
              value={divisionHead}
              onChange={(event) => setDivisionHead(event.target.value)}
              placeholder="Division head full name"
              className={cx(
                "w-full rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800",
              )}
            />

            <div className={cx("flex gap-2")}>
              <Button
                type="submit"
                className={cx(
                  "flex-1 rounded-lg bg-blue-600 px-3 py-2 font-bold text-white",
                )}
              >
                {editingDivisionId ? "Save Changes" : "Add Division"}
              </Button>
              {editingDivisionId && (
                <Button
                  type="button"
                  onClick={resetDivisionForm}
                  className={cx(
                    "rounded-lg bg-slate-200 px-3 py-2 font-bold dark:bg-slate-700",
                  )}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
          <div className={cx("space-y-2")}>
            {divisions.length === 0 && (
              <div
                className={cx(
                  "rounded-xl border border-dashed p-8 text-center text-sm text-slate-500",
                )}
              >
                No divisions saved. Enter the first division and division head
                manually.
              </div>
            )}
            {divisions.map((division) => (
              <div
                key={division.id}
                className={cx(
                  "flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900",
                )}
              >
                <div>
                  <div className={cx("font-extrabold")}>
                    {division.code} — {division.name}
                  </div>
                  <div className={cx("text-xs text-slate-500")}>
                    Division Head: {division.chiefName}
                  </div>
                </div>
                <div className={cx("flex gap-2 text-xs font-bold")}>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingDivisionId(division.id);
                      setDivisionCode(division.code);
                      setDivisionName(division.name);
                      setDivisionHead(division.chiefName);
                    }}
                    className={cx("text-slate-600")}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (await showConfirm(`Delete ${division.name}?`))
                        await onDeleteDivision(division.id);
                    }}
                    className={cx("text-rose-600")}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: PERSONNEL LIST */}
      {activeTab === "users" && (
        <div className={cx("space-y-4")}>
          {/* Action Bar */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{ position: "relative", width: "100%", minWidth: 0, flex: 1 }}
            >
              <Search
                className={cx("w-4 h-4 text-slate-400 absolute left-3 top-2.5")}
              />
              <FormInput
                type="text"
                placeholder="Search personnel by name, role, division..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cx(
                  "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                )}
               style={{ paddingLeft: 38 }} />
            </Box>

            <Button
              type="button"
              variant="contained"
              sx={{ width: { xs: "100%", md: "auto" }, flexShrink: 0 }}
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className={cx(
                "bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer",
              )}
            >
              <UserPlus className={cx("w-4 h-4")} />
              <span>Add Regional Personnel</span>
            </Button>
          </Box>

          {/* Personnel Table */}
          <div
            className={cx(
              "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs",
            )}
          >
            <div className={cx("overflow-x-auto")}>
              <Table
                stickyHeader
                className={cx("w-full text-left text-xs border-collapse")}
              >
                <TableHead>
                  <TableRow
                    className={cx(
                      "bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider",
                    )}
                  >
                    <TableCell className={cx("py-3 px-3")}>
                      SSO Unique User ID
                    </TableCell>
                    <TableCell className={cx("py-3 px-3")}>
                      Personnel Name
                    </TableCell>
                    <TableCell className={cx("py-3 px-3")}>Division</TableCell>
                    <TableCell className={cx("py-3 px-3")}>
                      Designation Title
                    </TableCell>
                    <TableCell className={cx("py-3 px-3")}>
                      Role & Menu Section Access
                    </TableCell>
                    <TableCell className={cx("py-3 px-3")}>Status</TableCell>
                    <TableCell className={cx("py-3 px-3 text-right")}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody
                  className={cx(
                    "divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200",
                  )}
                >
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className={cx(
                          "py-8 text-center text-slate-400 font-medium",
                        )}
                      >
                        No personnel found matching your search term.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((usr) => {
                      const userPerms =
                        usr.permissions ||
                        rolePermissions[usr.role] ||
                        DEFAULT_ROLE_PERMISSIONS[usr.role];
                      const userDivision = divisions.find(
                        (division) => division.code === usr.divisionCode,
                      );
                      return (
                        <TableRow
                          key={usr.id}
                          className={cx(
                            "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors",
                          )}
                        >
                          <TableCell
                            className={cx(
                              "py-3 px-3 font-mono text-[10px] text-slate-700 dark:text-slate-300",
                            )}
                          >
                            {usr.id}
                          </TableCell>

                          <TableCell className={cx("py-3 px-3")}>
                            <div
                              className={cx(
                                "font-bold text-slate-900 dark:text-white flex items-center space-x-2.5",
                              )}
                            >
                              <div
                                className={cx(
                                  "w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs",
                                )}
                              >
                                {usr.fullName ? usr.fullName.charAt(0) : "U"}
                              </div>
                              <div>
                                <div
                                  className={cx(
                                    "text-xs font-bold text-slate-900 dark:text-white",
                                  )}
                                >
                                  {usr.fullName}
                                </div>
                                <div
                                  className={cx(
                                    "text-[10px] text-slate-400 dark:text-slate-500 font-mono",
                                  )}
                                >
                                  @{usr.username} • {usr.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className={cx("py-3 px-3")}>
                            <div
                              className={cx(
                                "font-bold text-slate-800 dark:text-slate-200",
                              )}
                            >
                              {usr.divisionCode === "ITMS"
                                ? "Information Technology Management System"
                                : userDivision?.name || usr.divisionCode}
                            </div>
                            <div
                              className={cx(
                                "text-[10px] text-slate-500 dark:text-slate-400 font-medium",
                              )}
                            >
                              {usr.divisionCode}
                            </div>
                          </TableCell>

                          <TableCell
                            className={cx(
                              "py-3 px-3 font-medium text-slate-700 dark:text-slate-300",
                            )}
                          >
                            {usr.designation || "Not specified"}
                          </TableCell>

                          <TableCell className={cx("py-3 px-3")}>
                            <div className={cx("mb-1.5")}>
                              <span
                                className={cx(
                                  "inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:border-slate-800 dark:bg-indigo-950/60 dark:text-slate-300",
                                )}
                              >
                                Role: {usr.role}
                              </span>
                            </div>
                            <div
                              className={cx("flex items-center space-x-1.5")}
                            >
                              <span
                                className={cx(
                                  `px-2 py-0.5 rounded text-[10px] font-bold border flex items-center space-x-1 ${
                                    userPerms.mainMenu
                                      ? "bg-slate-50 dark:bg-blue-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                  }`,
                                )}
                              >
                                {userPerms.mainMenu ? (
                                  <Check
                                    className={cx("w-3 h-3 text-slate-600")}
                                  />
                                ) : (
                                  <XCircle
                                    className={cx("w-3 h-3 text-slate-400")}
                                  />
                                )}
                                <span>Main Menu</span>
                              </span>

                              <span
                                className={cx(
                                  `px-2 py-0.5 rounded text-[10px] font-bold border flex items-center space-x-1 ${
                                    userPerms.management
                                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                  }`,
                                )}
                              >
                                {userPerms.management ? (
                                  <Check
                                    className={cx("w-3 h-3 text-purple-600")}
                                  />
                                ) : (
                                  <XCircle
                                    className={cx("w-3 h-3 text-slate-400")}
                                  />
                                )}
                                <span>Management</span>
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className={cx("py-3 px-3")}>
                            <Button
                              type="button"
                              onClick={() =>
                                onUpdateUser(usr.id, { active: !usr.active })
                              }
                              className={cx(
                                `px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-opacity hover:opacity-80 ${
                                  usr.active
                                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                    : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                                }`,
                              )}

                              title="Click to toggle active/inactive status"
                            >
                              {usr.active ? (
                                <CheckCircle2 className={cx("w-3 h-3")} />
                              ) : (
                                <XCircle className={cx("w-3 h-3")} />
                              )}
                              <span>{usr.active ? "Active" : "Inactive"}</span>
                            </Button>
                          </TableCell>

                          <TableCell className={cx("py-3 px-3 text-right")}>
                            <div
                              className={cx(
                                "flex items-center justify-end space-x-2",
                              )}
                            >
                              <Button
                                type="button"
                                onClick={() => handleOpenEdit(usr)}
                                className={cx(
                                  "p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-blue-950 rounded-lg transition-colors cursor-pointer",
                                )}
                                title="Edit Personnel & Custom Menu Access"
                              >
                                <Edit className={cx("w-3.5 h-3.5")} />
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleDelete(usr)}
                                className={cx(
                                  "p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors cursor-pointer",
                                )}
                                title="Delete User Account"
                              >
                                <Trash2 className={cx("w-3.5 h-3.5")} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE ACCESS CONTROL MATRIX TABLE */}
      {activeTab === "roles" && (
        <div className={cx("space-y-5 animate-fadeIn")}>
          {/* Header & Controls Bar */}
          <div
            className={cx(
              "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3",
            )}
          >
            <div>
              <h3
                className={cx(
                  "text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2",
                )}
              >
                <ShieldCheck
                  className={cx("w-5 h-5 text-purple-600 dark:text-purple-400")}
                />
                <span>Role Permission Matrix & Menu Access Grid</span>
              </h3>
              <p
                className={cx(
                  "text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium",
                )}
              >
                Configure full or granular menu access checkboxes across all
                personnel roles in real time
              </p>
            </div>

            <div className={cx("flex items-center space-x-2")}>
              <Button
                type="button"
                onClick={handleResetRolePermissions}
                className={cx(
                  "px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer",
                )}
              >
                <RotateCcw className={cx("w-3.5 h-3.5")} />
                <span>Reset Defaults</span>
              </Button>

              <Button
                type="button"
                onClick={async () => {
                  localStorage.setItem(
                    "blgf_role_permissions",
                    JSON.stringify(rolePermissions),
                  );
                  await Promise.all(
                    ALL_ROLES.map((r) =>
                      handleApplyRolePermissionsToUsers(r.role, false),
                    ),
                  );
                  alert(
                    "🎉 All user role permissions saved and applied across all personnel accounts!",
                  );
                }}
                className={cx(
                  "px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer",
                )}
              >
                <Save className={cx("w-4 h-4")} />
                <span>Save Changes</span>
              </Button>
            </div>
          </div>

          {/* Matrix Table */}
          <div
            className={cx(
              "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs",
            )}
          >
            <div className={cx("overflow-x-auto")}>
              <Table
                stickyHeader
                className={cx("w-full text-left text-xs border-collapse")}
              >
                <TableHead>
                  <TableRow
                    className={cx(
                      "bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800",
                    )}
                  >
                    <TableCell
                      className={cx(
                        "py-3.5 px-4 font-black uppercase text-[11px] text-slate-700 dark:text-slate-300 w-1/3",
                      )}
                    >
                      Features & Menu Sections
                    </TableCell>
                    {ALL_ROLES.map((r) => {
                      const userCount = users.filter(
                        (u) => u.role === r.role,
                      ).length;
                      return (
                        <TableCell
                          key={r.role}
                          className={cx(
                            "py-3.5 px-3 text-center border-l border-slate-200 dark:border-slate-800/80 min-w-[120px]",
                          )}
                        >
                          <div
                            className={cx(
                              "font-black text-xs text-slate-900 dark:text-white",
                            )}
                          >
                            {r.role}
                          </div>
                          <div
                            className={cx(
                              "text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5",
                            )}
                          >
                            {r.label}
                          </div>
                          <div className={cx("mt-1")}>
                            <span
                              className={cx(
                                "text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
                              )}
                            >
                              {userCount} {userCount === 1 ? "user" : "users"}
                            </span>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableHead>

                <TableBody
                  className={cx(
                    "divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium",
                  )}
                >
                  {/* CATEGORY: DELETE PERMISSION */}
                  <TableRow
                    className={cx(
                      "bg-slate-100/70 dark:bg-slate-800/40 border-y border-slate-200 dark:border-slate-700 font-black",
                    )}
                  >
                    <TableCell
                      className={cx(
                        "py-2.5 px-4 text-slate-900 dark:text-white flex items-center space-x-2 text-xs uppercase tracking-wider",
                      )}
                    >
                      <ShieldCheck
                        className={cx(
                          "w-4 h-4 text-slate-600 dark:text-slate-400",
                        )}
                      />
                      <span>View All Document Routes</span>
                    </TableCell>
                    {ALL_ROLES.map((r) => {
                      const activePerm =
                        rolePermissions[r.role] ||
                        DEFAULT_ROLE_PERMISSIONS[r.role];
                      return (
                        <TableCell
                          key={r.role}
                          className={cx(
                            "py-2.5 px-3 text-center border-l border-slate-200 dark:border-slate-800/80",
                          )}
                        >
                          <Button
                            type="button"
                            onClick={() =>
                              setRolePermissions((prev) => {
                                const current =
                                  prev[r.role] ||
                                  DEFAULT_ROLE_PERMISSIONS[r.role];
                                return {
                                  ...prev,
                                  [r.role]: {
                                    ...current,
                                    canViewAllRoutes: !current.canViewAllRoutes,
                                  },
                                };
                              })
                            }
                            className={cx(
                              `w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all cursor-pointer ${
                                activePerm.canViewAllRoutes
                                  ? "bg-blue-600 text-white shadow-2xs"
                                  : "bg-slate-200 dark:bg-slate-700 text-transparent"
                              }`,
                            )}

                            title={`Allow ${r.role} to view the complete routing history`}
                          >
                            <Check className={cx("w-4 h-4 stroke-[3]")} />
                          </Button>
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  <TableRow
                    className={cx(
                      "bg-slate-100/70 dark:bg-slate-800/40 border-y border-slate-200 dark:border-slate-700 font-black",
                    )}
                  >
                    <TableCell
                      className={cx(
                        "py-2.5 px-4 text-slate-900 dark:text-white flex items-center space-x-2 text-xs uppercase tracking-wider",
                      )}
                    >
                      <ShieldAlert
                        className={cx(
                          "w-4 h-4 text-rose-600 dark:text-rose-400",
                        )}
                      />
                      <span>Delete Document Permission</span>
                    </TableCell>
                    {ALL_ROLES.map((r) => {
                      const activePerm =
                        rolePermissions[r.role] ||
                        DEFAULT_ROLE_PERMISSIONS[r.role];

                      return (
                        <TableCell
                          key={r.role}
                          className={cx(
                            "py-2.5 px-3 text-center border-l border-slate-200 dark:border-slate-800/80",
                          )}
                        >
                          <Button
                            type="button"
                            onClick={() => {
                              setRolePermissions((prev) => {
                                const currentRolePerm =
                                  prev[r.role] ||
                                  DEFAULT_ROLE_PERMISSIONS[r.role];
                                const updated = {
                                  ...prev,
                                  [r.role]: {
                                    ...currentRolePerm,
                                    canDelete: !currentRolePerm.canDelete,
                                  },
                                };
                                return updated;
                              });
                            }}
                            className={cx(
                              `w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all cursor-pointer ${
                                activePerm.canDelete
                                  ? "bg-rose-600 text-white shadow-2xs"
                                  : "bg-slate-200 dark:bg-slate-700 text-transparent hover:border-slate-400"
                              }`,
                            )}

                            title={`Toggle Delete Permission for ${r.role}`}
                          >
                            <Check className={cx("w-4 h-4 stroke-[3]")} />
                          </Button>
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  <TableRow
                    className={cx(
                      "bg-slate-100/70 dark:bg-slate-800/40 border-y border-slate-200 dark:border-slate-700 font-black",
                    )}
                  >
                    <TableCell
                      className={cx(
                        "py-2.5 px-4 text-slate-900 dark:text-white text-xs uppercase tracking-wider",
                      )}
                    >
                      Feature Action Permissions
                    </TableCell>
                    {ALL_ROLES.map((r) => (
                      <TableCell
                        key={r.role}
                        className={cx(
                          "border-l border-slate-200 dark:border-slate-800",
                        )}
                      />
                    ))}
                  </TableRow>
                  {ACTION_PERMISSIONS.map((action) => (
                    <TableRow
                      key={action.id}
                      className={cx(
                        "hover:bg-slate-50/80 dark:hover:bg-slate-800/50",
                      )}
                    >
                      <TableCell
                        className={cx("py-3 px-4 pl-8 font-bold text-xs")}
                      >
                        {action.label}
                      </TableCell>
                      {ALL_ROLES.map((r) => {
                        const permitted = (
                          rolePermissions[r.role] ||
                          DEFAULT_ROLE_PERMISSIONS[r.role]
                        ).allowedActions?.includes(action.id);
                        return (
                          <TableCell
                            key={r.role}
                            className={cx(
                              "py-3 px-3 text-center border-l border-slate-200 dark:border-slate-800/80",
                            )}
                          >
                            <Button
                              type="button"
                              onClick={() =>
                                handleToggleActionPermission(r.role, action.id)
                              }
                              className={cx(
                                `w-6 h-6 rounded-md mx-auto flex items-center justify-center ${permitted ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-transparent"}`,
                              )}
                            >
                              <Check className={cx("w-4 h-4 stroke-[3]")} />
                            </Button>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}

                  {/* CATEGORY 1: MAIN MENU */}
                  <TableRow
                    className={cx(
                      "bg-slate-100/70 dark:bg-slate-800/40 border-y border-slate-200 dark:border-slate-700 font-black",
                    )}
                  >
                    <TableCell
                      className={cx(
                        "py-2.5 px-4 text-slate-900 dark:text-white flex items-center space-x-2 text-xs uppercase tracking-wider",
                      )}
                    >
                      <LayoutDashboard
                        className={cx(
                          "w-4 h-4 text-slate-600 dark:text-slate-400",
                        )}
                      />
                      <span>Main Menu Section Access</span>
                    </TableCell>
                    {ALL_ROLES.map((r) => {
                      const activePerm =
                        rolePermissions[r.role] ||
                        DEFAULT_ROLE_PERMISSIONS[r.role];
                      const isMainAllowed = activePerm.mainMenu;

                      return (
                        <TableCell
                          key={r.role}
                          className={cx(
                            "py-2.5 px-3 text-center border-l border-slate-200 dark:border-slate-800/80",
                          )}
                        >
                          <Button
                            type="button"
                            onClick={() =>
                              handleToggleSectionPermission(r.role, "mainMenu")
                            }
                            className={cx(
                              `w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all cursor-pointer ${
                                isMainAllowed
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-slate-200 dark:bg-slate-700 text-transparent hover:border-slate-400"
                              }`,
                            )}

                            title={`Toggle Main Menu Section for ${r.role}`}
                          >
                            <Check className={cx("w-4 h-4 stroke-[3]")} />
                          </Button>
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {/* MAIN MENU SUB-VIEWS */}
                  {MENU_ITEMS_LIST.filter((i) => i.section === "Main Menu").map(
                    (item) => {
                      const Icon = item.icon;

                      return (
                        <TableRow
                          key={item.id}
                          className={cx(
                            "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors",
                          )}
                        >
                          <TableCell className={cx("py-3 px-4 pl-8")}>
                            <div
                              className={cx("flex items-center space-x-2.5")}
                            >
                              <Icon
                                className={cx(
                                  "w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0",
                                )}
                              />
                              <span
                                className={cx(
                                  "font-bold text-xs text-slate-900 dark:text-slate-100",
                                )}
                              >
                                {item.label}
                              </span>
                              {item.badge && (
                                <span
                                  className={cx(
                                    "px-1.5 py-0.5 text-[10px] font-black rounded-full bg-blue-600 text-white",
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {ALL_ROLES.map((r) => {
                            const activePerm =
                              rolePermissions[r.role] ||
                              DEFAULT_ROLE_PERMISSIONS[r.role];
                            const isAllowed =
                              activePerm.mainMenu &&
                              (activePerm.allowedViews || []).includes(item.id);

                            return (
                              <TableCell
                                key={r.role}
                                className={cx(
                                  "py-3 px-3 text-center border-l border-slate-200 dark:border-slate-800/80",
                                )}
                              >
                                <Button
                                  type="button"
                                  onClick={() =>
                                    handleToggleViewPermission(r.role, item.id)
                                  }
                                  disabled={!activePerm.mainMenu}
                                  className={cx(
                                    `w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all ${
                                      !activePerm.mainMenu
                                        ? "bg-slate-100 dark:bg-slate-800/40 opacity-40 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                                        : isAllowed
                                          ? "bg-emerald-600 text-white shadow-2xs cursor-pointer hover:bg-emerald-500"
                                          : "bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500 cursor-pointer"
                                    }`,
                                  )}

                                  title={`${isAllowed ? "Disable" : "Enable"} ${item.label} for ${r.role}`}
                                >
                                  <Check className={cx("w-4 h-4 stroke-[3]")} />
                                </Button>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    },
                  )}

                  {/* REPORT SUB-VIEWS */}
                  <TableRow
                    className={cx(
                      "bg-emerald-50/70 dark:bg-emerald-950/20 border-y border-emerald-200 dark:border-emerald-900/60 font-black",
                    )}
                  >
                    <TableCell
                      colSpan={ALL_ROLES.length + 1}
                      className={cx(
                        "py-2.5 px-4 text-emerald-900 dark:text-emerald-200 text-xs uppercase tracking-wider",
                      )}
                    >
                      <div className={cx("flex items-center space-x-2")}>
                        <FileSpreadsheet className={cx("w-4 h-4")} />
                        <span>Reports Section Access</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {MENU_ITEMS_LIST.filter((i) => i.section === "Reports").map(
                    (item) => {
                      const Icon = item.icon;
                      return (
                        <TableRow
                          key={item.id}
                          className={cx(
                            "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors",
                          )}
                        >
                          <TableCell className={cx("py-3 px-4 pl-8")}>
                            <div
                              className={cx("flex items-center space-x-2.5")}
                            >
                              <Icon
                                className={cx(
                                  "w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0",
                                )}
                              />
                              <span
                                className={cx(
                                  "font-bold text-xs text-slate-900 dark:text-slate-100",
                                )}
                              >
                                {item.label}
                              </span>
                            </div>
                          </TableCell>
                          {ALL_ROLES.map((r) => {
                            const activePerm =
                              rolePermissions[r.role] ||
                              DEFAULT_ROLE_PERMISSIONS[r.role];
                            const isAllowed =
                              activePerm.mainMenu &&
                              (activePerm.allowedViews || []).includes(item.id);
                            return (
                              <TableCell
                                key={r.role}
                                className={cx(
                                  "py-3 px-3 text-center border-l border-slate-200 dark:border-slate-800/80",
                                )}
                              >
                                <Button
                                  type="button"
                                  onClick={() =>
                                    handleToggleViewPermission(r.role, item.id)
                                  }
                                  disabled={!activePerm.mainMenu}
                                  className={cx(
                                    `w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all ${
                                      !activePerm.mainMenu
                                        ? "bg-slate-100 dark:bg-slate-800/40 opacity-40 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                                        : isAllowed
                                          ? "bg-emerald-600 text-white shadow-2xs cursor-pointer hover:bg-emerald-500"
                                          : "bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500 cursor-pointer"
                                    }`,
                                  )}

                                  title={`${isAllowed ? "Disable" : "Enable"} ${item.label} for ${r.role}`}
                                >
                                  <Check className={cx("w-4 h-4 stroke-[3]")} />
                                </Button>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    },
                  )}

                  {/* CATEGORY 2: MANAGEMENT */}
                  <TableRow
                    className={cx(
                      "bg-slate-100/70 dark:bg-slate-800/40 border-y border-slate-200 dark:border-slate-700 font-black",
                    )}
                  >
                    <TableCell
                      className={cx(
                        "py-2.5 px-4 text-slate-900 dark:text-white flex items-center space-x-2 text-xs uppercase tracking-wider",
                      )}
                    >
                      <Settings2
                        className={cx(
                          "w-4 h-4 text-purple-600 dark:text-purple-400",
                        )}
                      />
                      <span>Management Section Access</span>
                    </TableCell>
                    {ALL_ROLES.map((r) => {
                      const activePerm =
                        rolePermissions[r.role] ||
                        DEFAULT_ROLE_PERMISSIONS[r.role];
                      const isMgmtAllowed = activePerm.management;

                      return (
                        <TableCell
                          key={r.role}
                          className={cx(
                            "py-2.5 px-3 text-center border-l border-slate-200 dark:border-slate-800/80",
                          )}
                        >
                          <Button
                            type="button"
                            onClick={() =>
                              handleToggleSectionPermission(
                                r.role,
                                "management",
                              )
                            }
                            className={cx(
                              `w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all cursor-pointer ${
                                isMgmtAllowed
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-slate-200 dark:bg-slate-700 text-transparent hover:border-slate-400"
                              }`,
                            )}

                            title={`Toggle Management Section for ${r.role}`}
                          >
                            <Check className={cx("w-4 h-4 stroke-[3]")} />
                          </Button>
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {/* MANAGEMENT SUB-VIEWS */}
                  {MENU_ITEMS_LIST.filter(
                    (i) => i.section === "Management",
                  ).map((item) => {
                    const Icon = item.icon;

                    return (
                      <TableRow
                        key={item.id}
                        className={cx(
                          "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors",
                        )}
                      >
                        <TableCell className={cx("py-3 px-4 pl-8")}>
                          <div className={cx("flex items-center space-x-2.5")}>
                            <Icon
                              className={cx(
                                "w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0",
                              )}
                            />
                            <span
                              className={cx(
                                "font-bold text-xs text-slate-900 dark:text-slate-100",
                              )}
                            >
                              {item.label}
                            </span>
                          </div>
                        </TableCell>

                        {ALL_ROLES.map((r) => {
                          const activePerm =
                            rolePermissions[r.role] ||
                            DEFAULT_ROLE_PERMISSIONS[r.role];
                          const isAllowed =
                            activePerm.management &&
                            (activePerm.allowedViews || []).includes(item.id);

                          return (
                            <TableCell
                              key={r.role}
                              className={cx(
                                "py-3 px-3 text-center border-l border-slate-200 dark:border-slate-800/80",
                              )}
                            >
                              <Button
                                type="button"
                                onClick={() =>
                                  handleToggleViewPermission(r.role, item.id)
                                }
                                disabled={!activePerm.management}
                                className={cx(
                                  `w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all ${
                                    !activePerm.management
                                      ? "bg-slate-100 dark:bg-slate-800/40 opacity-40 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                                      : isAllowed
                                        ? "bg-emerald-600 text-white shadow-2xs cursor-pointer hover:bg-emerald-500"
                                        : "bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500 cursor-pointer"
                                  }`,
                                )}

                                title={`${isAllowed ? "Disable" : "Enable"} ${item.label} for ${r.role}`}
                              >
                                <Check className={cx("w-4 h-4 stroke-[3]")} />
                              </Button>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Bottom Save Changes Footer */}
            <div className={cx("hidden")}>
              <div className={cx("text-xs text-slate-500 font-medium")}>
                Changes applied here dynamically update the navigation sidebar
                for all active user accounts.
              </div>

              <div className={cx("flex items-center space-x-3")}>
                <Button
                  type="button"
                  onClick={handleResetRolePermissions}
                  className={cx(
                    "px-3.5 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-xs cursor-pointer",
                  )}
                >
                  Cancel / Reset
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    ALL_ROLES.forEach((r) =>
                      handleApplyRolePermissionsToUsers(r.role, false),
                    );
                    alert(
                      "🎉 Save complete! All user role permissions updated across personnel accounts.",
                    );
                  }}
                  className={cx(
                    "px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg shadow-sm transition-all flex items-center space-x-2 cursor-pointer",
                  )}
                >
                  <Save className={cx("w-4 h-4")} />
                  <span>Save Changes</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Create Personnel */}
      {showCreateModal && (
        <div
          className={cx(
            "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4",
          )}
        >
          <div
            className={cx(
              "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-xl text-slate-900 dark:text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar",
            )}
          >
            <h3
              className={cx(
                "font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2",
              )}
            >
              <UserPlus className={cx("w-5 h-5 text-slate-600")} />
              <span>Create New Regional Office Personnel</span>
            </h3>

            <form
              onSubmit={handleCreateSubmit}
              className={cx("space-y-3 text-xs")}
            >
              <div>
                <label
                  className={cx(
                    "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                  )}
                >
                  Full Name
                </label>
                <FormInput
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                  )}
                />
              </div>

              <div className={cx("grid grid-cols-1 gap-2 sm:grid-cols-2")}>
                <div>
                  <label
                    className={cx(
                      "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                    )}
                  >
                    Username
                  </label>
                  <FormInput
                    type="text"
                    required
                    placeholder="e.g. msantos"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={cx(
                      "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                    )}
                  />
                </div>

                <div>
                  <label
                    className={cx(
                      "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                    )}
                  >
                    Account Password
                  </label>
                  <div className={cx("relative")}>
                    <FormInput
                      type={showCreatePassword ? "text" : "password"}
                      required
                      placeholder="Initial password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cx(
                        "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                      )}
                    />

                    <Button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className={cx(
                        "absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer",
                      )}
                    >
                      {showCreatePassword ? (
                        <EyeOff className={cx("w-4 h-4")} />
                      ) : (
                        <Eye className={cx("w-4 h-4")} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label
                  className={cx(
                    "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                  )}
                >
                  Email Address
                </label>
                <FormInput
                  type="email"
                  placeholder="Leave blank to save as N/A"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                  )}
                />
              </div>

              <div>
                <label
                  className={cx(
                    "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                  )}
                >
                  Account Role
                </label>
                <FormSelect
                  value={role}
                  onChange={(e) => {
                    const nextRole = e.target.value as Role;
                    setRole(nextRole);
                    if (nextRole === "ORD") setDivisionCode("ORD");
                    if (nextRole === "SYSTEM_ADMIN") setDivisionCode("ITMS");
                    if (nextRole === "ADMIN") setDivisionCode("AD");
                    setFormPermissions(
                      rolePermissions[nextRole] ||
                        DEFAULT_ROLE_PERMISSIONS[nextRole],
                    );
                  }}
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold",
                  )}
                >
                  {ALL_ROLES.map((item) => (
                    <option key={item.role} value={item.role}>
                      {item.label} ({item.role})
                    </option>
                  ))}
                </FormSelect>
                <p
                  className={cx(
                    "mt-1 text-[10px] text-slate-500 dark:text-slate-400",
                  )}
                >
                  {ALL_ROLES.find((item) => item.role === role)?.description}
                </p>
              </div>

              <div>
                <label
                  className={cx(
                    "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                  )}
                >
                  Division Assignment
                </label>
                <FormSelect
                  value={divisionCode}
                  onChange={(e) =>
                    setDivisionCode(e.target.value as DivisionCode)
                  }
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold",
                  )}
                >
                  <option value="ITMS">
                    Information Technology Management System (ITMS)
                  </option>
                  <option value="ORD">Office of Regional Director (ORD)</option>
                  <option value="AD">Administrative Division (AD)</option>
                  <option value="LAOD">
                    Local Assessment Operations (LAOD)
                  </option>
                  <option value="LTOD">Local Treasury Operations (LTOD)</option>
                  <option value="FD">Financial Division (FD)</option>
                  <option value="LU">Legal Division / Unit (LU)</option>
                </FormSelect>
              </div>

              <div>
                <label
                  className={cx(
                    "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                  )}
                >
                  Designation Title
                </label>
                <FormInput
                  type="text"
                  placeholder="e.g. Senior Treasury Operations Specialist"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                  )}
                />
              </div>

              {/* Menu Access Section Toggles */}
              <div
                className={cx(
                  "bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2",
                )}
              >
                <div
                  className={cx(
                    "text-[11px] font-black uppercase text-slate-700 dark:text-slate-300",
                  )}
                >
                  Menu Section Access Permissions for this User:
                </div>
                <div className={cx("grid grid-cols-1 gap-2 sm:grid-cols-2")}>
                  <label
                    className={cx(
                      "flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer",
                    )}
                  >
                    <FormInput
                      type="checkbox"
                      checked={formPermissions.mainMenu}
                      onChange={(e) =>
                        setFormPermissions((prev) => ({
                          ...prev,
                          mainMenu: e.target.checked,
                        }))
                      }
                      className={cx("w-4 h-4 text-slate-600 rounded")}
                    />

                    <span className={cx("font-bold text-xs")}>
                      Allow Main Menu
                    </span>
                  </label>

                  <label
                    className={cx(
                      "flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer",
                    )}
                  >
                    <FormInput
                      type="checkbox"
                      checked={formPermissions.management}
                      onChange={(e) =>
                        setFormPermissions((prev) => ({
                          ...prev,
                          management: e.target.checked,
                        }))
                      }
                      className={cx("w-4 h-4 text-purple-600 rounded")}
                    />

                    <span className={cx("font-bold text-xs")}>
                      Allow Management
                    </span>
                  </label>
                </div>
              </div>

              <div
                className={cx(
                  "flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800",
                )}
              >
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={cx(
                    "px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-bold",
                  )}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={cx(
                    "px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg text-white shadow-2xs cursor-pointer",
                  )}
                >
                  Create User Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal to Edit Personnel */}
      {editingUser && (
        <div
          className={cx(
            "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4",
          )}
        >
          <div
            className={cx(
              "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-xl text-slate-900 dark:text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar",
            )}
          >
            <h3
              className={cx(
                "font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2",
              )}
            >
              <Edit className={cx("w-4 h-4 text-slate-600")} />
              <span>Edit Account & Access ({editingUser.username})</span>
            </h3>

            <form
              onSubmit={handleEditSubmit}
              className={cx("space-y-3 text-xs")}
            >
              <div>
                <label
                  className={cx(
                    "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                  )}
                >
                  Full Name
                </label>
                <FormInput
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white",
                  )}
                />
              </div>

              <div className={cx("grid grid-cols-1 gap-2 sm:grid-cols-2")}>
                <div>
                  <label
                    className={cx(
                      "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                    )}
                  >
                    Username
                  </label>
                  <FormInput
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={cx(
                      "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white",
                    )}
                  />
                </div>

                <div>
                  <label
                    className={cx(
                      "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                    )}
                  >
                    Set New / Temporary Password
                  </label>
                  <div className={cx("relative")}>
                    <FormInput
                      type={showEditPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••• (unchanged)"
                      autoComplete="new-password"
                      className={cx(
                        "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 pr-10 text-slate-900 dark:text-white",
                      )}
                    />

                    <Button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className={cx(
                        "absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer",
                      )}
                      title={
                        showEditPassword
                          ? "Hide temporary password"
                          : "Show temporary password"
                      }
                      aria-label={
                        showEditPassword
                          ? "Hide temporary password"
                          : "Show temporary password"
                      }
                    >
                      {showEditPassword ? (
                        <EyeOff className={cx("w-4 h-4")} />
                      ) : (
                        <Eye className={cx("w-4 h-4")} />
                      )}
                    </Button>
                  </div>
                  <p
                    className={cx(
                      "mt-1 text-[9px] leading-snug text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    If the user forgot the password, enter a replacement here.
                    Use the eye button to show or hide it before saving.
                  </p>
                  <Button
                    type="button"
                    onClick={generateTemporaryPassword}
                    className={cx(
                      "mt-2 text-[10px] font-bold text-slate-600 hover:underline dark:text-slate-400",
                    )}
                  >
                    Generate Temporary Password
                  </Button>
                </div>
              </div>

              <div>
                <label
                  className={cx(
                    "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                  )}
                >
                  Email Address
                </label>
                <FormInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white",
                  )}
                />
              </div>

              <div>
                <label
                  className={cx(
                    "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                  )}
                >
                  Account Role
                </label>
                <FormSelect
                  value={role}
                  onChange={(e) => {
                    const nextRole = e.target.value as Role;
                    setRole(nextRole);
                    if (nextRole === "ORD") setDivisionCode("ORD");
                    if (nextRole === "SYSTEM_ADMIN") setDivisionCode("ITMS");
                    if (nextRole === "ADMIN") setDivisionCode("AD");
                    setFormPermissions(
                      rolePermissions[nextRole] ||
                        DEFAULT_ROLE_PERMISSIONS[nextRole],
                    );
                  }}
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold",
                  )}
                >
                  {ALL_ROLES.map((item) => (
                    <option key={item.role} value={item.role}>
                      {item.label} ({item.role})
                    </option>
                  ))}
                </FormSelect>
                <p
                  className={cx(
                    "mt-1 text-[10px] text-slate-500 dark:text-slate-400",
                  )}
                >
                  {ALL_ROLES.find((item) => item.role === role)?.description}
                </p>
              </div>

              <div>
                <label
                  className={cx(
                    "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                  )}
                >
                  Division
                </label>
                <FormSelect
                  value={divisionCode}
                  onChange={(e) =>
                    setDivisionCode(e.target.value as DivisionCode)
                  }
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold",
                  )}
                >
                  <option value="ITMS">
                    Information Technology Management System (ITMS)
                  </option>
                  <option value="ORD">Office of Regional Director (ORD)</option>
                  <option value="AD">Administrative Division (AD)</option>
                  <option value="LAOD">
                    Local Assessment Operations (LAOD)
                  </option>
                  <option value="LTOD">Local Treasury Operations (LTOD)</option>
                  <option value="FD">Financial Division (FD)</option>
                  <option value="LU">Legal Division / Unit (LU)</option>
                </FormSelect>
              </div>

              <div>
                <label
                  className={cx(
                    "block font-bold mb-1 text-slate-700 dark:text-slate-300",
                  )}
                >
                  Designation Title
                </label>
                <FormInput
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white",
                  )}
                />
              </div>

              {/* Menu Access Section Toggles */}
              <div
                className={cx(
                  "bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2",
                )}
              >
                <div
                  className={cx(
                    "text-[11px] font-black uppercase text-slate-700 dark:text-slate-300",
                  )}
                >
                  Custom Menu Access Permissions for this Account:
                </div>
                <div
                  className={cx(
                    "text-[10px] font-bold text-slate-700 dark:text-slate-300",
                  )}
                >
                  Current Role: {role} — these menu permissions apply to this
                  account in addition to the selected role defaults.
                </div>
                <div className={cx("grid grid-cols-1 gap-2 sm:grid-cols-2")}>
                  <label
                    className={cx(
                      "flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer",
                    )}
                  >
                    <FormInput
                      type="checkbox"
                      checked={formPermissions.mainMenu}
                      onChange={(e) =>
                        setFormPermissions((prev) => ({
                          ...prev,
                          mainMenu: e.target.checked,
                        }))
                      }
                      className={cx("w-4 h-4 text-slate-600 rounded")}
                    />

                    <span className={cx("font-bold text-xs")}>
                      Allow Main Menu
                    </span>
                  </label>

                  <label
                    className={cx(
                      "flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer",
                    )}
                  >
                    <FormInput
                      type="checkbox"
                      checked={formPermissions.management}
                      onChange={(e) =>
                        setFormPermissions((prev) => ({
                          ...prev,
                          management: e.target.checked,
                        }))
                      }
                      className={cx("w-4 h-4 text-purple-600 rounded")}
                    />

                    <span className={cx("font-bold text-xs")}>
                      Allow Management
                    </span>
                  </label>
                </div>
              </div>

              <div
                className={cx(
                  "flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800",
                )}
              >
                <Button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className={cx(
                    "px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-bold",
                  )}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={cx(
                    "px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg text-white shadow-2xs cursor-pointer",
                  )}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
