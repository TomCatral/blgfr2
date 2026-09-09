// EmployeeProfilesView
// Data, events, layout, at kasalukuyang inline design ng component.

// IMPORTS: Mga component, helper, at library na ginagamit dito.
import { FormInput, FormSelect, FormTextarea } from "./ui/FormControls";
import { Box, Button } from "@mui/material";
import { cx } from "../styles/muiClasses";
import React, { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Edit,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  X,
  CheckCircle2,
  XCircle,
  Save,
  FolderPlus,
  FileText,
  Folder,
  FoldersIcon,
  Paperclip,
  Eye,
  Download,
} from "lucide-react";
import {
  EmployeeProfile,
  DivisionCode,
  User,
  DEFAULT_ROLE_PERMISSIONS,
  EmployeeFolderRecord,
} from "../types";
import { api } from "../services/api";
import { showConfirm, showPrompt } from "../services/dialogService";

const DIVISION_OFFICE_NAMES: Record<DivisionCode, string> = {
  ITMS: "Information Technology Management System",
  ORD: "Office of the Regional Director",
  AD: "Administrative Division",
  LAOD: "Local Assessment Operations Division",
  LTOD: "Local Treasury Operations Division",
  FD: "Financial Division",
  LU: "Legal Division / Unit",
};

const getOfficeDepartmentName = (employee: EmployeeProfile) => {
  if (employee.divisionCode) {
    return DIVISION_OFFICE_NAMES[employee.divisionCode];
  }

  const office = employee.office?.trim();
  if (!office) return "Not specified";

  const normalizedOffice = office.toLowerCase();
  const aliases: Record<string, DivisionCode> = {
    itms: "ITMS",
    "information technology management system": "ITMS",
    ord: "ORD",
    "office of regional director": "ORD",
    "office of the regional director": "ORD",
    ad: "AD",
    administrative: "AD",
    "administrative division": "AD",
    laod: "LAOD",
    "local assessment operations": "LAOD",
    "local assessment operations division": "LAOD",
    ltod: "LTOD",
    "local treasury operations": "LTOD",
    "local treasury operations division": "LTOD",
    fd: "FD",
    financial: "FD",
    "financial division": "FD",
    lu: "LU",
    legal: "LU",
    "legal division": "LU",
    "legal division / unit": "LU",
  };
  const divisionCode = aliases[normalizedOffice];
  return divisionCode ? DIVISION_OFFICE_NAMES[divisionCode] : office;
};

// DATA: Mga props at uri ng data na ginagamit ng component.
type EmployeeFolder = EmployeeFolderRecord;

interface DirectorySection {
  id: string;
  label: string;
  officeTypes: string[];
}

const DEFAULT_DIRECTORY_SECTIONS: DirectorySection[] = [
  { id: "BLGF", label: "BLGF Personnel", officeTypes: ["BLGF"] },
  {
    id: "LGU_STAFF",
    label: "LGU Staff",
    officeTypes: ["PROVINCIAL_TREASURER", "MUNICIPAL_TREASURER", "LGU"],
  },
  {
    id: "OTHER_AGENCIES",
    label: "Other Agencies",
    officeTypes: ["OTHER_AGENCIES"],
  },
];

const INITIAL_EMPLOYEES: EmployeeProfile[] = [];

interface EmployeeProfilesViewProps {
  onSelectEmployee?: (employee: EmployeeProfile) => void;
  currentUser: User;
}

// LOGIC: State, events, at pagproseso ng data.
export const EmployeeProfilesView: React.FC<EmployeeProfilesViewProps> = ({
  onSelectEmployee,
  currentUser,
}) => {
  const [employees, setEmployees] =
    useState<EmployeeProfile[]>(INITIAL_EMPLOYEES);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeProfile | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selectedEmpForFolder, setSelectedEmpForFolder] =
    useState<EmployeeProfile | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [showOfficeManager, setShowOfficeManager] = useState(false);
  const [officeName, setOfficeName] = useState("");
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [directorySections, setDirectorySections] = useState<
    DirectorySection[]
  >(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("blgf_directory_sections") || "null") ||
        DEFAULT_DIRECTORY_SECTIONS
      );
    } catch {
      return DEFAULT_DIRECTORY_SECTIONS;
    }
  });
  // Folders state
  const [folders, setFolders] = useState<EmployeeFolder[]>(() => {
    try {
      const stored = localStorage.getItem("blgf_employee_folders");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<EmployeeFolder | null>(
    null,
  );
  const [viewingPdf, setViewingPdf] = useState<{
    name: string;
    dataUrl: string;
  } | null>(null);

  // Tab navigation: 'BLGF' | 'LGU_STAFF' | 'OTHER_AGENCIES' | 'ALL'
  const [activeTab, setActiveTab] = useState<string>("BLGF");

  const [formData, setFormData] = useState<Partial<EmployeeProfile>>({
    fullName: "",
    position: "",
    office: "",
    officeType: "BLGF",
    email: "",
    contactNo: "",
    address: "",
    active: true,
  });
  const canManage = (action: string) =>
    currentUser.role === "SYSTEM_ADMIN" ||
    (
      currentUser.permissions || DEFAULT_ROLE_PERMISSIONS[currentUser.role]
    ).allowedActions?.includes(action);
  const canViewAllPersonnel = currentUser.role === "SYSTEM_ADMIN";
  const canManageEmployeeFolder = (employee: EmployeeProfile) =>
    canManage("EMPLOYEE_FOLDER_MANAGE") || employee.userId === currentUser.id;
  const canManageFolder = (folder: EmployeeFolder) =>
    canManage("EMPLOYEE_FOLDER_MANAGE") || folder.userId === currentUser.id;
  const visibleEmployees = canViewAllPersonnel
    ? employees
    : employees.filter((employee) => employee.userId === currentUser.id);
  const persistFolders = (nextFolders: EmployeeFolder[]) => {
    setFolders(nextFolders);
    localStorage.setItem("blgf_employee_folders", JSON.stringify(nextFolders));
    for (const employee of employees) {
      const currentEmployeeFolders = folders.filter(
        (folder) =>
          folder.employeeId === employee.id ||
          Boolean(employee.userId && folder.userId === employee.userId),
      );
      const employeeFolders = nextFolders.filter(
        (folder) =>
          folder.employeeId === employee.id ||
          Boolean(employee.userId && folder.userId === employee.userId),
      );
      // Only write the profile whose folder contents actually changed. This
      // prevents an administrator's stale directory view from overwriting a
      // different user's newer folder data.
      if (
        JSON.stringify(currentEmployeeFolders) !==
        JSON.stringify(employeeFolders)
      ) {
        void api.updateEmployee(employee.id, { folders: employeeFolders });
      }
    }
    setEmployees((currentEmployees) =>
      currentEmployees.map((employee) => ({
        ...employee,
        folders: nextFolders.filter(
          (folder) =>
            folder.employeeId === employee.id ||
            Boolean(employee.userId && folder.userId === employee.userId),
        ),
      })),
    );
  };

  useEffect(() => {
    const profileFromUser = (user: User): EmployeeProfile => ({
      id: `emp-${user.id}`,
      userId: user.id,
      fullName: user.fullName,
      position: user.designation || user.role,
      office: "Bureau of Local Government Finance — Regional Office II",
      officeType: "BLGF",
      divisionCode: user.divisionCode,
      email: user.email || "N/A",
      contactNo: user.contactNo || "",
      address: "Regional Government Center, Carig Sur, Tuguegarao City",
      active: user.active,
      createdAt: user.createdAt,
    });

    Promise.all([
      api.getEmployees().catch(() => []),
      canViewAllPersonnel
        ? api.getUsers().catch(() => [])
        : Promise.resolve([]),
    ]).then(([loadedEmployees, loadedUsers]) => {
      // The authenticated user ID is the only ownership key. Merge account
      // records so a temporarily stale employee endpoint can never hide the
      // user's own folder or an administrator's directory cards.
      const accountUsers = canViewAllPersonnel ? loadedUsers : [currentUser];
      const mergedEmployees = [...loadedEmployees];
      for (const user of accountUsers) {
        if (!mergedEmployees.some((employee) => employee.userId === user.id)) {
          mergedEmployees.push(profileFromUser(user));
        }
      }
      // User-linked cards come exclusively from User & Role-Based Access
      // Control Manager. Keep manually created directory entries as well, but
      // collapse stale duplicate profile rows for the same SSO user ID.
      const linkedEmployees = accountUsers.map(
        (user) =>
          mergedEmployees.find((employee) => employee.userId === user.id) ||
          profileFromUser(user),
      );
      const manualEmployees = canViewAllPersonnel
        ? mergedEmployees.filter((employee) => !employee.userId)
        : [];
      const accessibleEmployees = [...linkedEmployees, ...manualEmployees];
      setEmployees(accessibleEmployees);
      setFolders((currentFolders) => {
        const databaseFolders = accessibleEmployees.flatMap(
          (employee) => employee.folders || [],
        );
        const nextFolders =
          databaseFolders.length > 0
            ? [...databaseFolders]
            : [...currentFolders];
        for (const employee of accessibleEmployees) {
          if (
            employee.officeType === "BLGF" &&
            employee.userId &&
            !nextFolders.some(
              (folder) =>
                folder.userId === employee.userId ||
                folder.employeeId === employee.id,
            )
          ) {
            nextFolders.push({
              id: `fld-auto-${employee.userId}`,
              name: "Personnel Records",
              description: "Automatically created personnel records folder.",
              employeeId: employee.id,
              userId: employee.userId,
              systemManaged: true,
              fileCount: 0,
              createdAt: new Date().toISOString(),
              files: [],
            });
          }
        }
        if (nextFolders.length !== currentFolders.length) {
          localStorage.setItem(
            "blgf_employee_folders",
            JSON.stringify(nextFolders),
          );
        }
        if (databaseFolders.length === 0 && nextFolders.length > 0) {
          for (const employee of accessibleEmployees) {
            const employeeFolders = nextFolders.filter(
              (folder) =>
                folder.employeeId === employee.id ||
                Boolean(employee.userId && folder.userId === employee.userId),
            );
            void api.updateEmployee(employee.id, { folders: employeeFolders });
          }
        }
        return nextFolders;
      });
    });
  }, [currentUser.id, canViewAllPersonnel]);

  const saveOffice = () => {
    const name = officeName.trim();
    if (!name) return;
    if (
      directorySections.some(
        (section) =>
          section.label.toLowerCase() === name.toLowerCase() &&
          section.id !== editingOfficeId,
      )
    ) {
      alert("This directory title already exists.");
      return;
    }
    const customId = `CUSTOM_${Date.now()}`;
    const next = editingOfficeId
      ? directorySections.map((section) =>
          section.id === editingOfficeId
            ? { ...section, label: name }
            : section,
        )
      : [
          ...directorySections,
          {
            id: customId,
            label: name,
            officeTypes: [customId],
          },
        ];

    setDirectorySections(next);
    localStorage.setItem("blgf_directory_sections", JSON.stringify(next));
    setOfficeName("");
    setEditingOfficeId(null);
  };

  // Employees filtered by active tab
  const tabFilteredEmployees = visibleEmployees.filter((e) => {
    if (activeTab === "ALL") return true;
    const section = directorySections.find((item) => item.id === activeTab);
    return section ? section.officeTypes.includes(e.officeType) : false;
  });

  const filtered = tabFilteredEmployees.filter((e) => {
    if (typeFilter !== "ALL" && e.officeType !== typeFilter) return false;
    const q = searchTerm.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.office.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    );
  });

  const handleSave = async () => {
    if (!formData.fullName || !formData.position || !formData.office) {
      alert("Please fill in Name, Position, and Office fields.");
      return;
    }
    try {
      const employeeData = {
        ...formData,
        email: formData.email?.trim() || "N/A",
      };
      if (editingEmp) {
        const updatedEmployee = await api.updateEmployee(
          editingEmp.id,
          employeeData,
        );
        setEmployees((current) =>
          current.map((e) => (e.id === editingEmp.id ? updatedEmployee : e)),
        );
        setEditingEmp(null);
      } else {
        const newEmployee = await api.createEmployee(employeeData);
        setEmployees((current) => [...current, newEmployee]);
      }
    } catch (err: any) {
      alert("Unable to save employee: " + err.message);
      return;
    }
    setShowForm(false);
    setFormData({
      fullName: "",
      position: "",
      office: "",
      officeType: "BLGF",
      email: "",
      contactNo: "",
      address: "",
      active: true,
    });
  };

  const handleEdit = (emp: EmployeeProfile) => {
    setFormData(emp);
    setEditingEmp(emp);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (await showConfirm("Delete this employee profile?")) {
      try {
        await api.deleteEmployee(id);
        setEmployees((current) => current.filter((e) => e.id !== id));
      } catch (err: any) {
        alert("Unable to delete employee: " + err.message);
      }
    }
  };

  const handleSelect = (emp: EmployeeProfile) => {
    if (onSelectEmployee) {
      onSelectEmployee(emp);
    }
  };

  const getOfficeTypeBadge = (type: string) => {
    switch (type) {
      case "BLGF":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "PROVINCIAL_TREASURER":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "MUNICIPAL_TREASURER":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "LGU":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // LAYOUT: Ang nakikita sa screen.
  return (
    <Box className="office-directory" sx={{ display: 'grid', gap: 2.5, minWidth: 0, '& .directory-card': { p: 2.5, display: 'grid', gap: 1.5, alignContent: 'start', minWidth: 0 }, '& .directory-card button': { minWidth: 36 }, '& .directory-card .employee-office-name': { lineHeight: 1.6, overflowWrap: 'anywhere' } }}>
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
            <span>Office Directory</span>
          </h2>
          <p
            className={cx(
              "text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium",
            )}
          >
            Find a person, check their office and contact details, or manage directory records.
          </p>
        </div>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, auto)" },
            gap: 1,
            width: { xs: "100%", md: "auto" },
          }}
        >
          <Button
            type="button"
            sx={{ width: { xs: "100%", sm: "auto" } }}
            onClick={() => setShowOfficeManager(true)}
            disabled={!canManage("EMPLOYEE_EDIT")}
            className={cx(
              "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs px-3 py-2 rounded-lg flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <Building2 className={cx("w-4 h-4")} />
            <span>Manage Directory Titles</span>
          </Button>
          <Button
            type="button"
            sx={{ width: { xs: "100%", sm: "auto" } }}
            onClick={() => {
              setEditingEmp(null);
              setFormData({
                fullName: "",
                position: "",
                office: "",
                officeType: "BLGF",
                email: "",
                contactNo: "",
                address: "",
                active: true,
              });
              setShowForm(true);
            }}
            disabled={!canManage("EMPLOYEE_CREATE")}
            className={cx(
              "bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <UserPlus className={cx("w-4 h-4")} />
            <span>Add Personnel / Staff</span>
          </Button>
        </Box>
      </div>

      {/* Category Tabs */}
      <div
        className={cx(
          "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-xs",
        )}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(auto-fit, minmax(150px, 1fr))",
            },
            gap: 0.75,
          }}
        >
          {[
            ...directorySections.map((section) => ({
              key: section.id,
              label: section.label,
              icon: "•",
              count: visibleEmployees.filter((employee) =>
                section.officeTypes.includes(employee.officeType),
              ).length,
            })),
            {
              key: "ALL",
              label: "All Combined",
              icon: "•",
              count: visibleEmployees.length,
            },
          ].map((tab) => (
            <Button
              key={tab.key}
              type="button"
              sx={{
                minHeight: 48,
                px: 1.5,
                justifyContent: "space-between",
                gap: 1,
              }}
              onClick={() => {
                setActiveTab(tab.key);
                setExpandedFolder(null);
              }}
              className={cx(
                `py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`,
              )}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: "normal",
                  lineHeight: 1.3,
                  textAlign: "left",
                }}
              >
                {tab.label}
              </span>
              <span
                className={cx(
                  `text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`,
                )}
              >
                {tab.count}
              </span>
            </Button>
          ))}
        </Box>
      </div>

      <div
        className={cx(
          "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-3",
        )}
      >
        <div className={cx("relative flex-1")} style={{ flex: "1 1 320px", minWidth: 0 }}>
          <Search
            className={cx("w-4 h-4 absolute left-3 top-2.5 text-slate-400")}
          />
          <FormInput
            type="text"
            placeholder="Search by name, office, position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cx(
              "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs",
            )}
           style={{ paddingLeft: 38 }} />
        </div>
        <FormSelect
          value={typeFilter}
          style={{ width: "auto", minWidth: 180, flex: "0 1 240px" }}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={cx(
            "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold",
          )}
        >
          <option value="ALL">All Types</option>
          <option value="BLGF">BLGF Personnel</option>
          <option value="PROVINCIAL_TREASURER">Provincial Treasurers</option>
          <option value="MUNICIPAL_TREASURER">Municipal Treasurers</option>
          <option value="LGU">LGU Staff</option>
          <option value="OTHER_AGENCIES">Other Agencies</option>
        </FormSelect>
      </div>

      <div
        className={cx("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3")}
      >
        {filtered.map((emp) => (
          <div
            key={emp.id}
            className={cx(
              "directory-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all space-y-2",
            )}
          >
            <div className={cx("flex items-start justify-between")}>
              <div className={cx("flex items-center space-x-3")}>
                <div
                  className={cx(
                    "w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm",
                  )}
                >
                  {emp.fullName.charAt(0)}
                </div>
                <div>
                  <div
                    className={cx(
                      "font-bold text-sm text-slate-900 dark:text-white",
                    )}
                  >
                    {emp.fullName}
                  </div>
                  <div className={cx("text-xs text-slate-500 font-medium")}>
                    {emp.position}
                  </div>
                </div>
              </div>
              <div className={cx("flex items-center space-x-1")}>
                <Button
                  type="button"
                  onClick={() => handleEdit(emp)}
                  aria-label={`Edit ${emp.fullName}`}
                  disabled={!canManage("EMPLOYEE_EDIT")}
                  className={cx(
                    "p-1 text-slate-600 hover:bg-slate-50 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-30",
                  )}
                >
                  <Edit className={cx("w-3.5 h-3.5")} />
                </Button>
                {!emp.userId && (
                  <Button
                    type="button"
                    onClick={() => handleDelete(emp.id)}
                    disabled={currentUser.role !== "SYSTEM_ADMIN"}
                    className={cx(
                      "p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-30",
                    )}
                    title="Delete manually added directory entry"
                  >
                    <Trash2 className={cx("w-3.5 h-3.5")} />
                  </Button>
                )}
              </div>
            </div>
            <div className={cx("flex items-center space-x-1")}>
              <span
                className={cx(
                  `px-2 py-0.5 rounded text-[10px] font-bold border ${getOfficeTypeBadge(emp.officeType)}`,
                )}
              >
                {emp.officeType.replace("_", " ")}
              </span>
              {emp.active ? (
                <CheckCircle2 className={cx("w-3 h-3 text-emerald-500")} />
              ) : (
                <XCircle className={cx("w-3 h-3 text-rose-500")} />
              )}
            </div>
            <div
              className={cx(
                "text-xs space-y-1 text-slate-600 dark:text-slate-400",
              )}
            >
              <div
                className={cx(
                  "employee-office-name flex items-start space-x-1.5",
                )}
              >
                <Building2
                  className={cx("mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600")}
                />
                <span className={cx("whitespace-pre-line")}>
                  <strong className={cx("text-slate-700 dark:text-slate-200")}>
                    Office / Department:
                  </strong>{" "}
                  {getOfficeDepartmentName(emp)}
                </span>
              </div>
              <div className={cx("flex items-center space-x-1")}>
                <MapPin className={cx("w-3 h-3")} />
                <span className={cx("whitespace-pre-line")}>{emp.address || 'Address not provided'}</span>
              </div>
              <div className={cx("flex items-center space-x-1")}>
                <Phone className={cx("w-3 h-3")} />
                <span>{emp.contactNo || 'Phone not provided'}</span>
              </div>
              <div className={cx("flex items-center space-x-1")}>
                <Mail className={cx("w-3 h-3")} />
                <span>{emp.email || 'Email not provided'}</span>
              </div>
            </div>
            <div
              className={cx(
                "flex items-center space-x-2 pt-1 border-t border-slate-100 dark:border-slate-800",
              )}
            >
              <Button
                type="button"
                onClick={() => {
                  setSelectedEmpForFolder(emp);
                  setExpandedFolder(expandedFolder === emp.id ? null : emp.id);
                }}
                className={cx(
                  "flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 cursor-pointer border border-slate-200",
                )}
              >
                <Folder className={cx("w-3 h-3")} />
                <span>
                  Manage Folders & Files (
                  {folders.filter((f) => f.employeeId === emp.id).length})
                </span>
              </Button>
            </div>
            {expandedFolder === emp.id && (
              <div className={cx("space-y-2 pt-2 border-t border-slate-100")}>
                <div className={cx("flex items-center justify-between gap-2")}>
                  <div
                    className={cx(
                      "text-[10px] font-bold text-slate-600 dark:text-slate-300",
                    )}
                  >
                    Separate document folders for {emp.fullName}
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setSelectedEmpForFolder(emp);
                      setShowFolderModal(true);
                      setFolderName("");
                      setFolderDescription("");
                    }}
                    disabled={!canManageEmployeeFolder(emp)}
                    className={cx(
                      "inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    <FolderPlus className={cx("h-3 w-3")} /> New Folder
                  </Button>
                </div>
                {folders
                  .filter((f) => f.employeeId === emp.id)
                  .map((fld) => (
                    <div
                      key={fld.id}
                      className={cx(
                        "rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-xs dark:border-slate-700 dark:bg-slate-800",
                      )}
                    >
                      <div className={cx("flex items-center justify-between")}>
                        <Button
                          type="button"
                          onClick={() =>
                            setOpenFolderId((current) =>
                              current === fld.id ? null : fld.id,
                            )
                          }
                          className={cx(
                            "flex min-w-0 flex-1 items-center gap-2 text-left font-bold text-slate-800 dark:text-slate-100",
                          )}
                        >
                          <FoldersIcon
                            className={cx("h-7 w-7 shrink-0 text-amber-500")}
                          />
                          <span className={cx("min-w-0 truncate")}>
                            {fld.name}
                          </span>
                        </Button>
                        <div className={cx("flex items-center gap-1")}>
                          <Button
                            type="button"
                            onClick={async () => {
                              const name = (
                                await showPrompt("Folder name:", fld.name)
                              )?.trim();
                              if (!name || name === fld.name) return;
                              const description =
                                (await showPrompt(
                                  "Folder details / description:",
                                  fld.description || "",
                                )) ?? fld.description;
                              const updated = folders.map((item) =>
                                item.id === fld.id
                                  ? { ...item, name, description }
                                  : item,
                              );
                              persistFolders(updated);
                            }}
                            disabled={!canManageFolder(fld)}
                            className={cx(
                              "p-0.5 text-slate-500 hover:text-slate-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30",
                            )}
                            title="Edit folder"
                          >
                            <Edit className={cx("w-3 h-3")} />
                          </Button>
                          {!fld.systemManaged &&
                            !fld.id.startsWith("fld-auto-") && (
                              <Button
                                type="button"
                                onClick={() => setFolderToDelete(fld)}
                                disabled={!canManageFolder(fld)}
                                className={cx(
                                  "p-0.5 text-rose-400 hover:text-rose-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30",
                                )}
                                title="Delete manually added folder"
                              >
                                <Trash2 className={cx("w-3 h-3")} />
                              </Button>
                            )}
                        </div>
                      </div>
                      {openFolderId === fld.id && (
                        <div
                          className={cx(
                            "mt-2 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700",
                          )}
                        >
                          {fld.description && (
                            <p className={cx("text-[10px] text-slate-500")}>
                              {fld.description}
                            </p>
                          )}
                          {fld.files.length > 0 ? (
                            <div className={cx("space-y-2")}>
                              {fld.files.map((file, idx) => (
                                <div
                                  key={idx}
                                  className={cx(
                                    "rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60",
                                  )}
                                >
                                  <div className={cx("flex items-start gap-2")}>
                                    <FileText
                                      className={cx(
                                        "mt-0.5 h-4 w-4 shrink-0 text-slate-500",
                                      )}
                                    />
                                    <div className={cx("min-w-0 flex-1")}>
                                      <div
                                        className={cx(
                                          "truncate text-xs font-bold text-slate-800 dark:text-slate-100",
                                        )}
                                      >
                                        {file.title ||
                                          file.name.replace(/\.[^.]+$/, "")}
                                      </div>
                                      <div
                                        className={cx(
                                          "mt-0.5 truncate text-[10px] text-slate-500",
                                        )}
                                      >
                                        {file.name}
                                      </div>
                                      <div
                                        className={cx(
                                          "mt-1 text-[9px] text-slate-400",
                                        )}
                                      >
                                        {file.type || "File"} · {file.size} ·
                                        Added{" "}
                                        {new Date(file.date).toLocaleString()}
                                      </div>
                                    </div>
                                    {file.dataUrl ? (
                                      <div
                                        className={cx(
                                          "flex items-center gap-1",
                                        )}
                                      >
                                        <Button
                                          type="button"
                                          onClick={() => {
                                            if (
                                              file.type === "application/pdf"
                                            ) {
                                              setViewingPdf({
                                                name: file.name,
                                                dataUrl: file.dataUrl!,
                                              });
                                            } else {
                                              window.open(
                                                file.dataUrl,
                                                "_blank",
                                                "noopener,noreferrer",
                                              );
                                            }
                                          }}
                                          className={cx(
                                            "inline-flex items-center gap-1 font-bold text-slate-700",
                                          )}
                                          title={`View ${file.name}`}
                                        >
                                          <Eye className={cx("h-3 w-3")} /> View
                                        </Button>
                                        <a
                                          href={file.dataUrl}
                                          download={file.name}
                                          className={cx(
                                            "inline-flex items-center gap-1 font-bold text-emerald-700",
                                          )}
                                        >
                                          <Download className={cx("h-3 w-3")} />{" "}
                                          Download
                                        </a>
                                      </div>
                                    ) : (
                                      <span
                                        className={cx(
                                          "text-[9px] italic text-slate-400",
                                        )}
                                        title="Reattach this file to enable PDF preview"
                                      >
                                        Preview unavailable
                                      </span>
                                    )}
                                    <div
                                      className={cx(
                                        "flex items-center gap-1 border-l border-slate-200 pl-1 dark:border-slate-700",
                                      )}
                                    >
                                      <Button
                                        type="button"
                                        disabled={!canManageFolder(fld)}
                                        onClick={async () => {
                                          const nextTitle = (
                                            await showPrompt(
                                              "Edit file title:",
                                              file.title ||
                                                file.name.replace(
                                                  /\.[^.]+$/,
                                                  "",
                                                ),
                                            )
                                          )?.trim();
                                          if (!nextTitle) return;
                                          const updated = folders.map(
                                            (folder) =>
                                              folder.id !== fld.id
                                                ? folder
                                                : {
                                                    ...folder,
                                                    files: folder.files.map(
                                                      (item, fileIndex) =>
                                                        fileIndex === idx
                                                          ? {
                                                              ...item,
                                                              title: nextTitle,
                                                            }
                                                          : item,
                                                    ),
                                                  },
                                          );
                                          persistFolders(updated);
                                        }}
                                        className={cx(
                                          "rounded p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-30 dark:hover:bg-blue-950",
                                        )}
                                        title="Edit file title"
                                      >
                                        <Edit className={cx("h-3 w-3")} />
                                      </Button>
                                      <Button
                                        type="button"
                                        disabled={!canManageFolder(fld)}
                                        onClick={async () => {
                                          if (
                                            !(await showConfirm(
                                              `Delete file “${file.title || file.name}”?`,
                                            ))
                                          )
                                            return;
                                          const updated = folders.map(
                                            (folder) => {
                                              if (folder.id !== fld.id)
                                                return folder;
                                              const nextFiles =
                                                folder.files.filter(
                                                  (_, fileIndex) =>
                                                    fileIndex !== idx,
                                                );
                                              return {
                                                ...folder,
                                                files: nextFiles,
                                                fileCount: nextFiles.length,
                                              };
                                            },
                                          );
                                          persistFolders(updated);
                                        }}
                                        className={cx(
                                          "rounded p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950",
                                        )}
                                        title="Delete file"
                                      >
                                        <Trash2 className={cx("h-3 w-3")} />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div
                              className={cx(
                                "text-[10px] text-slate-400 italic",
                              )}
                            >
                              No files yet
                            </div>
                          )}
                          <label
                            className={cx(
                              `inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 hover:text-slate-900 ${canManageFolder(fld) ? "cursor-pointer" : "pointer-events-none opacity-30"}`,
                            )}
                          >
                            <Paperclip className={cx("w-3 h-3")} /> Add Files
                            <FormInput
                              type="file"
                              multiple
                              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,.txt"
                              className={cx("hidden")}
                              onChange={async (event) => {
                                const selectedFiles = Array.from(
                                  event.target.files || [],
                                );
                                if (selectedFiles.length === 0) return;
                                try {
                                  const uploadedFiles: EmployeeFolder["files"] =
                                    [];
                                  for (const file of selectedFiles) {
                                    const defaultTitle = file.name.replace(
                                      /\.[^.]+$/,
                                      "",
                                    );
                                    const title = (
                                      await showPrompt(
                                        `File title for ${file.name}:`,
                                        defaultTitle,
                                      )
                                    )?.trim();
                                    if (!title) continue;
                                    const storedFile =
                                      await api.uploadToStorage(
                                        "documentAttachments",
                                        file,
                                      );
                                    uploadedFiles.push({
                                      title,
                                      name: file.name,
                                      size: `${(file.size / 1024).toFixed(1)} KB`,
                                      date: new Date().toISOString(),
                                      type:
                                        file.type || "application/octet-stream",
                                      dataUrl: storedFile.url,
                                    });
                                  }
                                  if (uploadedFiles.length === 0) {
                                    event.target.value = "";
                                    return;
                                  }
                                  const updated = folders.map((folder) =>
                                    folder.id !== fld.id
                                      ? folder
                                      : {
                                          ...folder,
                                          fileCount:
                                            folder.files.length +
                                            uploadedFiles.length,
                                          files: [
                                            ...folder.files,
                                            ...uploadedFiles,
                                          ],
                                        },
                                  );
                                  persistFolders(updated);
                                } catch (error: any) {
                                  alert(
                                    error.message ||
                                      "Could not store the selected files.",
                                  );
                                }
                                event.target.value = "";
                              }}
                            />
                          </label>
                          <div className={cx("text-[9px] text-slate-400")}>
                            Created {fld.createdAt.slice(0, 10)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                {folders.filter((f) => f.employeeId === emp.id).length ===
                  0 && (
                  <div
                    className={cx(
                      "rounded-lg border border-dashed border-slate-300 p-3 text-[10px] text-slate-400 text-center",
                    )}
                  >
                    No folders yet. Use Add Folder to organize this employee's
                    PDS and attachments.
                  </div>
                )}
              </div>
            )}
            {onSelectEmployee && (
              <Button
                type="button"
                onClick={() => handleSelect(emp)}
                className={cx(
                  "w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold cursor-pointer",
                )}
              >
                Select
              </Button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className={cx("col-span-full p-8 text-center text-slate-400")}>
            No employees found.
          </div>
        )}
      </div>

      {showOfficeManager && (
        <div
          className={cx(
            "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4",
          )}
        >
          <div
            className={cx(
              "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-lg p-5 space-y-4",
            )}
          >
            <div className={cx("flex items-center justify-between")}>
              <div>
                <h3 className={cx("font-extrabold text-base")}>
                  Manage Directory Titles
                </h3>
                <p className={cx("text-xs text-slate-500")}>
                  Add, edit, or delete table titles such as BLGF Personnel and
                  LGU Staff.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setShowOfficeManager(false);
                  setOfficeName("");
                  setEditingOfficeId(null);
                }}
                className={cx("p-1 text-slate-500 hover:text-slate-900")}
              >
                <X className={cx("w-5 h-5")} />
              </Button>
            </div>
            <div className={cx("flex gap-2")}>
              <FormInput
                value={officeName}
                onChange={(event) => setOfficeName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveOffice();
                }}
                placeholder="Directory title"
                className={cx(
                  "flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs",
                )}
              />

              <Button
                type="button"
                onClick={saveOffice}
                className={cx(
                  "px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold",
                )}
              >
                {editingOfficeId ? "Save" : "Add"}
              </Button>
            </div>
            <div className={cx("max-h-72 overflow-y-auto space-y-1")}>
              {directorySections.map((office) => (
                <div
                  key={office.id}
                  className={cx(
                    "flex items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-800 p-2",
                  )}
                >
                  <Building2 className={cx("w-4 h-4 text-slate-600")} />
                  <span className={cx("flex-1 text-xs font-bold")}>
                    {office.label}
                  </span>
                  <Button
                    type="button"
                    onClick={() => {
                      setOfficeName(office.label);
                      setEditingOfficeId(office.id);
                    }}
                    className={cx("p-1 text-slate-600")}
                    title="Edit directory title"
                  >
                    <Edit className={cx("w-3.5 h-3.5")} />
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (
                        !(await showConfirm(
                          `Delete directory title "${office.label}"? Personnel records will remain available under All Combined.`,
                        ))
                      )
                        return;
                      const next = directorySections.filter(
                        (item) => item.id !== office.id,
                      );
                      setDirectorySections(next);
                      localStorage.setItem(
                        "blgf_directory_sections",
                        JSON.stringify(next),
                      );
                      if (activeTab === office.id) setActiveTab("ALL");
                    }}
                    className={cx("p-1 text-rose-600")}
                    title="Delete directory title"
                  >
                    <Trash2 className={cx("w-3.5 h-3.5")} />
                  </Button>
                </div>
              ))}
              {directorySections.length === 0 && (
                <p className={cx("py-6 text-center text-xs text-slate-400")}>
                  No directory titles yet. Add one above.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div
          className={cx(
            "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4",
          )}
        >
          <div
            className={cx(
              "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4",
            )}
          >
            <h3
              className={cx(
                "font-extrabold text-base flex items-center space-x-2",
              )}
            >
              {editingEmp ? (
                <Edit className={cx("w-5 h-5 text-slate-600")} />
              ) : (
                <UserPlus className={cx("w-5 h-5 text-slate-600")} />
              )}
              <span>
                {editingEmp
                  ? "Edit Personnel / Staff"
                  : "Add Personnel / Staff"}
              </span>
            </h3>
            <div className={cx("space-y-3 text-xs")}>
              <div className={cx("grid grid-cols-1 gap-2 sm:grid-cols-2")}>
                <div className={cx("col-span-2")}>
                  <label className={cx("block font-bold mb-1")}>
                    Full Name
                  </label>
                  <FormInput
                    type="text"
                    value={formData.fullName || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className={cx(
                      "w-full bg-slate-50 dark:bg-slate-800 border rounded-lg p-2",
                    )}
                  />
                </div>
                <div>
                  <label className={cx("block font-bold mb-1")}>Position</label>
                  <FormInput
                    type="text"
                    value={formData.position || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    className={cx(
                      "w-full bg-slate-50 dark:bg-slate-800 border rounded-lg p-2",
                    )}
                  />
                </div>
                <div>
                  <label className={cx("block font-bold mb-1")}>
                    Office Type
                  </label>
                  <FormSelect
                    value={formData.officeType || "BLGF"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        officeType: e.target.value as any,
                      })
                    }
                    className={cx(
                      "w-full bg-slate-50 dark:bg-slate-800 border rounded-lg p-2 font-bold",
                    )}
                  >
                    <option value="BLGF">BLGF Personnel</option>
                    <option value="PROVINCIAL_TREASURER">
                      Provincial Treasurer
                    </option>
                    <option value="MUNICIPAL_TREASURER">
                      Municipal Treasurer
                    </option>
                    <option value="LGU">LGU Staff</option>
                    <option value="OTHER_AGENCIES">Other Agencies</option>
                    {directorySections
                      .filter((section) => section.id.startsWith("CUSTOM_"))
                      .map((section) => (
                        <option key={section.id} value={section.officeTypes[0]}>
                          {section.label}
                        </option>
                      ))}
                  </FormSelect>
                </div>
                <div className={cx("col-span-2")}>
                  <label className={cx("block font-bold mb-1")}>
                    Office / Department
                  </label>
                  <FormTextarea
                    rows={2}
                    value={formData.office || ""}
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={(e) =>
                      setFormData({ ...formData, office: e.target.value })
                    }
                    placeholder={"Line 1: Office\nLine 2: Department or unit"}
                    className={cx(
                      "min-h-16 w-full resize-y rounded-lg border bg-slate-50 p-2 dark:bg-slate-800",
                    )}
                  />
                </div>
                <div>
                  <label className={cx("block font-bold mb-1")}>Email</label>
                  <FormInput
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={cx(
                      "w-full bg-slate-50 dark:bg-slate-800 border rounded-lg p-2",
                    )}
                  />
                </div>
                <div>
                  <label className={cx("block font-bold mb-1")}>
                    Contact No
                  </label>
                  <FormInput
                    type="text"
                    value={formData.contactNo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, contactNo: e.target.value })
                    }
                    className={cx(
                      "w-full bg-slate-50 dark:bg-slate-800 border rounded-lg p-2",
                    )}
                  />
                </div>
                <div className={cx("col-span-2")}>
                  <label className={cx("block font-bold mb-1")}>Address</label>
                  <FormTextarea
                    rows={2}
                    value={formData.address || ""}
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder={"Address Line 1\nAddress Line 2"}
                    className={cx(
                      "min-h-16 w-full resize-y rounded-lg border bg-slate-50 p-2 dark:bg-slate-800",
                    )}
                  />
                </div>
              </div>
              <div className={cx("flex justify-end space-x-2 pt-3 border-t")}>
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEmp(null);
                  }}
                  className={cx(
                    "px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold cursor-pointer",
                  )}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className={cx(
                    "px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center space-x-1 cursor-pointer",
                  )}
                >
                  <Save className={cx("w-4 h-4")} />
                  <span>{editingEmp ? "Update" : "Save"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Folder Modal */}
      {showFolderModal && selectedEmpForFolder && (
        <div
          className={cx(
            "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4",
          )}
        >
          <div
            className={cx(
              "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4",
            )}
          >
            <h3
              className={cx(
                "font-extrabold text-base flex items-center space-x-2",
              )}
            >
              <FolderPlus className={cx("w-5 h-5 text-amber-600")} />
              <span>Add Folder for {selectedEmpForFolder.fullName}</span>
            </h3>
            <div className={cx("space-y-3 text-xs")}>
              <div>
                <label className={cx("block font-bold mb-1")}>
                  Folder Name
                </label>
                <FormInput
                  type="text"
                  placeholder="e.g. Tax Assessment Documents, Memos, etc."
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white",
                  )}
                />
              </div>
              <div>
                <label className={cx("block font-bold mb-1")}>
                  Folder Description
                </label>
                <FormInput
                  type="text"
                  placeholder="e.g. 2026 Personnel Records"
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  className={cx(
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white",
                  )}
                />
              </div>
              <div className={cx("flex justify-end space-x-2 pt-3 border-t")}>
                <Button
                  type="button"
                  onClick={() => {
                    setShowFolderModal(false);
                    setSelectedEmpForFolder(null);
                  }}
                  className={cx(
                    "px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold cursor-pointer",
                  )}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!canManageEmployeeFolder(selectedEmpForFolder)) return;
                    if (!folderName.trim()) {
                      alert("Please enter a folder name.");
                      return;
                    }
                    const newFolder: EmployeeFolder = {
                      id: `fld-${Date.now()}`,
                      name: folderName.trim(),
                      description: folderDescription.trim(),
                      employeeId: selectedEmpForFolder.id,
                      userId: selectedEmpForFolder.userId,
                      fileCount: 0,
                      createdAt: new Date().toISOString(),
                      files: [],
                    };
                    const updated = [...folders, newFolder];
                    persistFolders(updated);
                    setShowFolderModal(false);
                    setSelectedEmpForFolder(null);
                    setFolderName("");
                    setFolderDescription("");
                  }}
                  className={cx(
                    "px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold cursor-pointer",
                  )}
                >
                  Create Folder
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {folderToDelete && (
        <div
          className={cx(
            "fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs",
          )}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-folder-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFolderToDelete(null);
          }}
        >
          <div
            className={cx(
              "w-full max-w-sm rounded-2xl border border-rose-200 bg-white p-5 text-center shadow-2xl dark:border-rose-800 dark:bg-slate-900",
            )}
          >
            <div
              className={cx(
                "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
              )}
            >
              <Trash2 className={cx("h-5 w-5")} />
            </div>
            <h2
              id="delete-folder-title"
              className={cx(
                "mt-3 text-base font-extrabold text-slate-900 dark:text-white",
              )}
            >
              Delete Folder?
            </h2>
            <p
              className={cx(
                "mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300",
              )}
            >
              Delete <strong>“{folderToDelete.name}”</strong> and all files
              inside it? This action cannot be undone.
            </p>
            <div className={cx("mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2")}>
              <Button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className={cx(
                  "rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200",
                )}
              >
                Cancel
              </Button>
              <Button
                type="button"
                autoFocus
                onClick={() => {
                  if (!canManageFolder(folderToDelete)) return;
                  if (
                    folderToDelete.systemManaged ||
                    folderToDelete.id.startsWith("fld-auto-")
                  ) {
                    setFolderToDelete(null);
                    return;
                  }
                  const updated = folders.filter(
                    (folder) => folder.id !== folderToDelete.id,
                  );
                  persistFolders(updated);
                  setFolderToDelete(null);
                }}
                className={cx(
                  "rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-500",
                )}
              >
                Delete Folder
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewingPdf && (
        <div
          className={cx(
            "fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs",
          )}
        >
          <div
            className={cx(
              "flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900",
            )}
          >
            <div
              className={cx(
                "flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700",
              )}
            >
              <div className={cx("flex min-w-0 items-center gap-2")}>
                <FileText className={cx("h-5 w-5 shrink-0 text-rose-600")} />
                <h3 className={cx("truncate text-sm font-extrabold")}>
                  {viewingPdf.name}
                </h3>
              </div>
              <Button
                type="button"
                onClick={() => setViewingPdf(null)}
                className={cx(
                  "rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
                aria-label="Close PDF viewer"
              >
                <X className={cx("h-5 w-5")} />
              </Button>
            </div>
            <iframe
              src={viewingPdf.dataUrl}
              title={`PDF viewer: ${viewingPdf.name}`}
              className={cx("min-h-0 flex-1 bg-slate-100")}
            />
          </div>
        </div>
      )}
    </Box>
  );
};
