// Sidebar
// Data, events, layout, at kasalukuyang inline design ng component.

// IMPORTS: Mga component, helper, at library na ginagamit dito.
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BellRing,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  Mail,
  Printer,
  QrCode,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { DEFAULT_ROLE_PERMISSIONS, User } from "../types";
import {
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

// DATA: Mga props at uri ng data na ginagamit ng component.
interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  currentUser: User;
  pendingCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

type NavigationItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: string | number }>;
  section: "Main Menu" | "Reports" | "Management";
  actionPermission?: string;
  adminOnly?: boolean;
  showsPendingCount?: boolean;
};

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    section: "Main Menu",
  },
  {
    id: "incoming",
    label: "Incoming Documents",
    icon: ArrowDownLeft,
    section: "Main Menu",
    showsPendingCount: true,
  },
  {
    id: "outgoing",
    label: "Outgoing Documents",
    icon: ArrowUpRight,
    section: "Main Menu",
  },
  {
    id: "routing-followup",
    label: "Routing Follow-up",
    icon: BellRing,
    section: "Main Menu",
    actionPermission: "ROUTING_MONITOR_VIEW",
  },
  {
    id: "slip",
    label: "Document Routing Slip",
    icon: Printer,
    section: "Main Menu",
  },
  {
    id: "envelope",
    label: "Outgoing Envelope",
    icon: Mail,
    section: "Main Menu",
  },
  {
    id: "employees",
    label: "Office Directory",
    icon: UserCircle,
    section: "Main Menu",
  },
  { id: "qr", label: "QR Code Generator", icon: QrCode, section: "Main Menu" },
  {
    id: "incoming-report",
    label: "Incoming Report",
    icon: ArrowDownLeft,
    section: "Reports",
  },
  {
    id: "outgoing-report",
    label: "Outgoing Report",
    icon: ArrowUpRight,
    section: "Reports",
  },
  {
    id: "envelope-report",
    label: "Envelope Report",
    icon: FileSpreadsheet,
    section: "Reports",
  },
  {
    id: "audit",
    label: "Audit Logs",
    icon: ClipboardList,
    section: "Management",
  },
  {
    id: "envelope-logs",
    label: "Envelope Dispatch Logs",
    icon: Mail,
    section: "Management",
  },
  {
    id: "users",
    label: "User Accounts",
    icon: Users,
    section: "Management",
    adminOnly: true,
  },
];

const SECTIONS: NavigationItem["section"][] = [
  "Main Menu",
  "Reports",
  "Management",
];

// LOGIC: State, events, at pagproseso ng data.
export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  currentUser,
  pendingCount,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [displayedView, setDisplayedView] = useState(activeView);
  const firstNavigationFrame = useRef<number | null>(null);
  const secondNavigationFrame = useRef<number | null>(null);
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const desktop = useMediaQuery(theme.breakpoints.up("md"));
  const isCollapsed = externalIsCollapsed ?? internalCollapsed;
  const permissions =
    currentUser.permissions ||
    DEFAULT_ROLE_PERMISSIONS[currentUser.role] ||
    DEFAULT_ROLE_PERMISSIONS.STAFF;
  const allowedViews = permissions.allowedViews || [];

  const canViewItem = (item: NavigationItem) => {
    if (item.adminOnly && currentUser.role !== "SYSTEM_ADMIN") return false;
    if (item.section === "Management" && !permissions.management) return false;
    if (item.section !== "Management" && !permissions.mainMenu) return false;
    if (item.actionPermission) {
      return (
        currentUser.role === "SYSTEM_ADMIN" ||
        (permissions.allowedActions || []).includes(item.actionPermission)
      );
    }
    if (allowedViews.includes(item.id)) return true;
    if (item.id === "incoming-report")
      return (
        allowedViews.includes("reports") || allowedViews.includes("incoming")
      );
    if (item.id === "outgoing-report")
      return (
        allowedViews.includes("reports") || allowedViews.includes("outgoing")
      );
    if (item.id === "envelope-report")
      return (
        allowedViews.includes("reports") ||
        allowedViews.includes("envelope-logs")
      );
    return false;
  };

  const visibleItems = NAVIGATION_ITEMS.filter(canViewItem);

  useEffect(() => setDisplayedView(activeView), [activeView]);

  useEffect(
    () => () => {
      if (firstNavigationFrame.current !== null)
        cancelAnimationFrame(firstNavigationFrame.current);
      if (secondNavigationFrame.current !== null)
        cancelAnimationFrame(secondNavigationFrame.current);
    },
    [],
  );

  const handleToggle = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed((collapsed) => !collapsed);
  };

  const handleNavigate = (view: string) => {
    if (view === displayedView) {
      onCloseMobile?.();
      return;
    }

    setDisplayedView(view);
    onCloseMobile?.();
    if (firstNavigationFrame.current !== null)
      cancelAnimationFrame(firstNavigationFrame.current);
    if (secondNavigationFrame.current !== null)
      cancelAnimationFrame(secondNavigationFrame.current);
    firstNavigationFrame.current = requestAnimationFrame(() => {
      secondNavigationFrame.current = requestAnimationFrame(() =>
        setActiveView(view),
      );
    });
  };

  const content = (
    <Box
      component="aside"
      aria-label="Primary navigation"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        color: darkMode ? "#e4e4e7" : "#3f3f46",
        backgroundColor: darkMode ? "#111827" : "#ffffff",
      }}
    >
      <Box
        sx={{
          minHeight: 48,
          px: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
        }}
      >
        {!isCollapsed && (
          <Typography
            variant="overline"
            sx={{
              color: darkMode ? "#a1a1aa" : "#71717a",
              fontWeight: 800,
              letterSpacing: ".1em",
            }}
          >
            Workspace
          </Typography>
        )}
        {desktop ? (
          <Tooltip
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            placement="right"
          >
            <IconButton
              onClick={handleToggle}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              sx={{
                color: darkMode ? "#d4d4d8" : "#71717a",
                bgcolor: darkMode ? "rgba(255,255,255,.06)" : "#eef2f7",
                "&:hover": {
                  bgcolor: darkMode ? "rgba(255,255,255,.12)" : "#e4e4e7",
                },
              }}
            >
              {isCollapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </IconButton>
          </Tooltip>
        ) : (
          <IconButton
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            sx={{ ml: "auto", color: darkMode ? "#d4d4d8" : "#71717a" }}
          >
            <X size={20} />
          </IconButton>
        )}
      </Box>
      <Divider
        sx={{ borderColor: darkMode ? "rgba(148,163,184,.14)" : "#e4e4e7" }}
      />
      <Box
        component="nav"
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 0.75, py: 0.5 }}
      >
        {SECTIONS.map((section, sectionIndex) => {
          const items = visibleItems.filter((item) => item.section === section);
          if (items.length === 0) return null;
          return (
            <Box
              component="section"
              key={section}
              aria-label={section}
              sx={{
                mb: 0.75,
                pt: sectionIndex === 0 ? 0 : 0.75,
                borderTop:
                  sectionIndex === 0
                    ? 0
                    : `1px solid ${darkMode ? "rgba(148,163,184,.12)" : "#eef1f5"}`,
              }}
            >
              {!isCollapsed && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    px: 1.25,
                    py: 0.5,
                    color: darkMode ? "#71717a" : "#7890ad",
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: ".09em",
                    textTransform: "uppercase",
                  }}
                >
                  {section}
                </Typography>
              )}
              <List disablePadding>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = displayedView === item.id;
                  return (
                    <Tooltip
                      key={item.id}
                      title={isCollapsed ? item.label : ""}
                      placement="right"
                    >
                      <ListItemButton
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        selected={isActive}
                        aria-current={isActive ? "page" : undefined}
                        sx={{
                          position: "relative",
                          minHeight: 42,
                          mb: 0.125,
                          px: isCollapsed ? 1 : 1.25,
                          justifyContent: isCollapsed ? "center" : "flex-start",
                          borderRadius: 1.5,
                          color: isActive
                            ? darkMode
                              ? "#e4e4e7"
                              : "#27272a"
                            : darkMode
                              ? "#bdc8d8"
                              : "#52525b",
                          "&.Mui-selected": {
                            color: darkMode ? "#e4e4e7" : "#27272a",
                            bgcolor: darkMode
                              ? "rgba(63,63,70,.14)"
                              : "#fafafa",
                            boxShadow: "none",
                            "&::before": {
                              content: '""',
                              position: "absolute",
                              left: 0,
                              top: 8,
                              bottom: 8,
                              width: 3,
                              borderRadius: "0 3px 3px 0",
                              bgcolor: "primary.main",
                            },
                            "&:hover": {
                              bgcolor: darkMode
                                ? "rgba(63,63,70,.2)"
                                : "#f4f4f5",
                            },
                          },
                          "&:hover": {
                            bgcolor: darkMode
                              ? "rgba(148,163,184,.08)"
                              : "#f4f6f8",
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: isCollapsed ? 0 : 34,
                            color: isActive
                              ? darkMode
                                ? "#fff"
                                : "#3f3f46"
                              : darkMode
                                ? "#8796ac"
                                : "#718198",
                            justifyContent: "center",
                          }}
                        >
                          <Badge
                            color="warning"
                            badgeContent={
                              isCollapsed && item.showsPendingCount
                                ? pendingCount
                                : 0
                            }
                            max={99}
                          >
                            <Icon size={18} />
                          </Badge>
                        </ListItemIcon>
                        {!isCollapsed && (
                          <ListItemText
                            primary={item.label}
                            slotProps={{
                              primary: {
                                noWrap: true,
                                sx: {
                                  fontSize: 12.5,
                                  fontWeight: isActive ? 750 : 600,
                                },
                              },
                            }}
                          />
                        )}
                        {!isCollapsed &&
                          item.showsPendingCount &&
                          pendingCount > 0 && (
                            <Chip
                              label={pendingCount > 99 ? "99+" : pendingCount}
                              size="small"
                              color="warning"
                              sx={{
                                ml: "auto",
                                height: 22,
                                minWidth: 26,
                                "& .MuiChip-label": {
                                  px: 0.75,
                                  fontSize: 10,
                                  fontWeight: 800,
                                },
                              }}
                            />
                          )}
                      </ListItemButton>
                    </Tooltip>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>
      <Divider
        sx={{ borderColor: darkMode ? "rgba(148,163,184,.14)" : "#e4e4e7" }}
      />
      <ListItemButton
        onClick={() => handleNavigate("settings")}
        aria-label="Open account settings"
        sx={{
          flex: "0 0 auto",
          m: 0.75,
          minHeight: 48,
          px: isCollapsed ? 0.75 : 1,
          justifyContent: isCollapsed ? "center" : "flex-start",
          borderRadius: 1.5,
          "&:hover": {
            bgcolor: darkMode ? "rgba(148,163,184,.08)" : "#f4f6f8",
          },
        }}
      >
        <Avatar
          src={currentUser.avatarUrl}
          sx={{
            width: 30,
            height: 30,
            bgcolor: "primary.main",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {currentUser.fullName?.charAt(0) || "U"}
        </Avatar>
        {!isCollapsed && (
          <Box sx={{ minWidth: 0, ml: 1 }}>
            <Typography
              noWrap
              sx={{
                color: darkMode ? "#e4e4e7" : "#1f2937",
                fontSize: 12,
                fontWeight: 750,
              }}
            >
              {currentUser.fullName}
            </Typography>
            <Typography
              noWrap
              sx={{ color: darkMode ? "#a1a1aa" : "#71717a", fontSize: 10.5 }}
            >
              {currentUser.designation || currentUser.role.replaceAll("_", " ")}
            </Typography>
          </Box>
        )}
      </ListItemButton>
    </Box>
  );

  const drawerWidth = desktop ? (isCollapsed ? 64 : 248) : "min(280px, 84vw)";
  // LAYOUT: Ang nakikita sa screen.
  return (
    <Drawer
      variant={desktop ? "permanent" : "temporary"}
      open={desktop || isMobileOpen}
      onClose={onCloseMobile}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: drawerWidth,
        minWidth: desktop ? drawerWidth : 0,
        flex: "0 0 auto",
        zIndex: desktop ? 1 : theme.zIndex.drawer,
        "& .MuiDrawer-paper": {
          position: desktop ? "relative" : "fixed",
          zIndex: desktop ? 1 : theme.zIndex.drawer,
          width: drawerWidth,
          minWidth: desktop ? drawerWidth : 0,
          height: desktop ? "100%" : "100dvh",
          boxSizing: "border-box",
          overflow: "hidden",
          border: 0,
          borderRight: `1px solid ${theme.palette.divider}`,
          boxShadow: desktop ? "none" : "12px 0 36px rgba(24,24,27,.16)",
          transition: theme.transitions.create("width", {
            duration: theme.transitions.duration.shorter,
          }),
        },
      }}
    >
      {content}
    </Drawer>
  );
};
