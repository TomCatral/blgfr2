// NotificationDrawer: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { Button, IconButton, Tooltip } from "@mui/material";
import React, { useEffect } from "react";
import {
  ArrowRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  Eye,
  X,
  XCircle,
} from "lucide-react";
import { NotificationItem } from "../types";
import { formatDate } from "../utils/statusUtils";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// Design for NotificationDrawer.
// BASE CSS: Pangunahing design ng component.
const notificationDrawerCss = `/* NotificationDrawer.module.css */
.mui-notificationdrawer-overlay { position: fixed; inset: 0; z-index: 50; display: flex; justify-content: flex-end; background: rgb(15 23 42 / 32%); backdrop-filter: blur(1px); animation: notification-backdrop-in 160ms ease-out; }
.mui-notificationdrawer-drawer { display: flex; flex-direction: column; width: min(100%, 26rem); height: 100%; color: #27272a; background: #fff; border-left: 1px solid #e4e4e7; box-shadow: -.75rem 0 2rem rgb(15 23 42 / 12%); font-family: Inter, "Segoe UI", Roboto, Arial, sans-serif; animation: notification-drawer-in 220ms cubic-bezier(.2,.8,.2,1); }
.mui-notificationdrawer-header { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; min-height: 4.5rem; gap: .75rem; padding: .75rem 1rem; background: rgb(255 255 255 / 96%); border-bottom: 1px solid #e8edf4; }
.mui-notificationdrawer-headingGroup, .mui-notificationdrawer-headerActions, .mui-notificationdrawer-titleRow, .mui-notificationdrawer-itemActions, .mui-notificationdrawer-viewButton, .mui-notificationdrawer-dismissButton { display: flex; align-items: center; }
.mui-notificationdrawer-headingGroup { min-width: 0; gap: .7rem; }
.mui-notificationdrawer-headerActions { gap: .25rem; }
.mui-notificationdrawer-bellIcon { flex: 0 0 auto; display: grid; place-items: center; width: 2rem; height: 2rem; color: #3f3f46; background: #fafafa; border-radius: .65rem; }
.mui-notificationdrawer-titleRow { gap: .4rem; }
.mui-notificationdrawer-title { margin: 0; color: #27272a; font-size: .9rem; font-weight: 750; letter-spacing: -.01em; }
.mui-notificationdrawer-subtitle { margin: .15rem 0 0; overflow: hidden; color: #7a8699; font-size: .65rem; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
.mui-notificationdrawer-count { min-width: 1.25rem; padding: .1rem .4rem; color: #27272a; background: #eaf2ff; border-radius: 999px; font-size: .6rem; font-weight: 800; text-align: center; }
.mui-notificationdrawer-dismissAll, .mui-notificationdrawer-closeButton, .mui-notificationdrawer-viewButton, .mui-notificationdrawer-dismissButton, .mui-notificationdrawer-approveButton, .mui-notificationdrawer-disapproveButton { border: 0; cursor: pointer; font-weight: 700; }
.mui-notificationdrawer-dismissAll { display: flex; align-items: center; gap: .3rem; min-width: auto; padding: .4rem .5rem; color: #3f3f46; background: transparent; border-radius: .5rem; font-size: .66rem; white-space: nowrap; }
.mui-notificationdrawer-dismissAll:hover { background: #fafafa; }
.mui-notificationdrawer-closeButton { width: 2rem; height: 2rem; padding: 0; color: #7a8699; background: transparent; border-radius: .5rem; }
.mui-notificationdrawer-closeButton:hover { color: #3f3f46; background: #f4f4f5; }
.mui-notificationdrawer-list { flex: 1; display: grid; align-content: start; gap: .5rem; padding: .65rem; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #d4d4d8 transparent; background: #f7f9fc; }
.mui-notificationdrawer-empty { margin: 1rem; padding: 3rem 1rem; color: #7a8699; background: #fff; border: 1px dashed #d8e0eb; border-radius: .75rem; font-size: .75rem; font-weight: 500; text-align: center; }
.mui-notificationdrawer-notification { position: relative; padding: .8rem .85rem .65rem; color: #27272a; background: #fff; border: 1px solid #e4eaf2; border-radius: .7rem; box-shadow: 0 1px 2px rgb(15 23 42 / 3%); transition: border-color 150ms ease, box-shadow 150ms ease; }
.mui-notificationdrawer-notification:hover { border-color: #cbd8e8; box-shadow: 0 .25rem .7rem rgb(15 23 42 / 6%); }
.mui-notificationdrawer-approved { border-left: 3px solid #10b981; }
.mui-notificationdrawer-disapproved { border-left: 3px solid #f43f5e; }
.mui-notificationdrawer-itemHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.mui-notificationdrawer-notification .mui-notificationdrawer-titleRow { min-width: 0; align-items: flex-start; flex-direction: column; gap: .25rem; }
.mui-notificationdrawer-notificationTitle { color: #27272a; font-size: .72rem; font-weight: 750; line-height: 1.4; }
.mui-notificationdrawer-date { flex-shrink: 0; padding-top: .1rem; color: #8b96a8; font-size: .58rem; line-height: 1.4; white-space: nowrap; }
.mui-notificationdrawer-decisionBadge { display: inline-flex; align-items: center; padding: .15rem .5rem; border-radius: 999px; font-size: .56rem; font-weight: 900; }
.mui-notificationdrawer-approvedBadge { color: #047857; background: #d1fae5; }
.mui-notificationdrawer-disapprovedBadge { color: #be123c; background: #ffe4e6; }
.mui-notificationdrawer-message { margin: .4rem 0 0; color: #536176; font-size: .67rem; font-weight: 450; line-height: 1.55; }
.mui-notificationdrawer-itemActions { flex-wrap: wrap; gap: .35rem; min-height: 2rem; margin-top: .5rem; padding-top: .5rem; border-top: 1px solid #edf1f6; }
.mui-notificationdrawer-approveButton, .mui-notificationdrawer-disapproveButton { min-height: 1.8rem; padding: .3rem .65rem; color: #fff; border-radius: .45rem; font-size: .6rem; box-shadow: none; }
.mui-notificationdrawer-approveButton { background: #059669; } .mui-notificationdrawer-approveButton:hover { background: #10b981; }
.mui-notificationdrawer-disapproveButton { background: #e11d48; } .mui-notificationdrawer-disapproveButton:hover { background: #f43f5e; }
.mui-notificationdrawer-approveButton:disabled, .mui-notificationdrawer-disapproveButton:disabled { cursor: wait; opacity: .5; }
.mui-notificationdrawer-viewButton, .mui-notificationdrawer-dismissButton { gap: .25rem; min-width: auto; background: transparent; border-radius: .4rem; font-size: .62rem; }
.mui-notificationdrawer-viewButton { max-width: calc(100% - 2.4rem); padding: .32rem .45rem; color: #3f3f46; } .mui-notificationdrawer-viewButton:hover { background: #fafafa; }
.mui-notificationdrawer-viewButton span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mui-notificationdrawer-dismissButton { width: 1.85rem; height: 1.85rem; margin-left: auto; padding: 0; color: #8b96a8; } .mui-notificationdrawer-dismissButton:hover { color: #dc2626; background: #fef2f2; }

@keyframes notification-backdrop-in { from { background: rgb(15 23 42 / 0%); } }
@keyframes notification-drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
@media (max-width: 36rem) {
  .mui-notificationdrawer-drawer { width: 100%; max-width: none; border-left: 0; }
  .mui-notificationdrawer-header { padding-inline: .85rem; }
  .mui-notificationdrawer-list { padding: .5rem; }
  .mui-notificationdrawer-dismissAll span { display: none; }
}

.dark .mui-notificationdrawer-drawer, .dark .mui-notificationdrawer-header, .dark .mui-notificationdrawer-notification { color: #fafafa; background: #18181b; border-color: #3f3f46; }
.dark .mui-notificationdrawer-list { background: #020617; }
.dark .mui-notificationdrawer-title, .dark .mui-notificationdrawer-notificationTitle { color: #fff; }
.dark .mui-notificationdrawer-subtitle { color: #a1a1aa; }
.dark .mui-notificationdrawer-message { color: #d4d4d8; }
.dark .mui-notificationdrawer-itemActions { border-color: #27272a; }
.dark .mui-notificationdrawer-closeButton:hover { color: #fff; background: #27272a; }
.dark .mui-notificationdrawer-approved { border-color: #047857; }
.dark .mui-notificationdrawer-disapproved { border-color: #be123c; }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const notificationDrawerStyles = {
  approveButton: "mui-notificationdrawer-approveButton",
  approved: "mui-notificationdrawer-approved",
  approvedBadge: "mui-notificationdrawer-approvedBadge",
  bellIcon: "mui-notificationdrawer-bellIcon",
  closeButton: "mui-notificationdrawer-closeButton",
  count: "mui-notificationdrawer-count",
  date: "mui-notificationdrawer-date",
  decisionBadge: "mui-notificationdrawer-decisionBadge",
  disapproveButton: "mui-notificationdrawer-disapproveButton",
  disapproved: "mui-notificationdrawer-disapproved",
  disapprovedBadge: "mui-notificationdrawer-disapprovedBadge",
  dismissAll: "mui-notificationdrawer-dismissAll",
  dismissButton: "mui-notificationdrawer-dismissButton",
  drawer: "mui-notificationdrawer-drawer",
  empty: "mui-notificationdrawer-empty",
  header: "mui-notificationdrawer-header",
  headerActions: "mui-notificationdrawer-headerActions",
  headingGroup: "mui-notificationdrawer-headingGroup",
  itemActions: "mui-notificationdrawer-itemActions",
  itemHeader: "mui-notificationdrawer-itemHeader",
  list: "mui-notificationdrawer-list",
  message: "mui-notificationdrawer-message",
  notification: "mui-notificationdrawer-notification",
  notificationTitle: "mui-notificationdrawer-notificationTitle",
  overlay: "mui-notificationdrawer-overlay",
  subtitle: "mui-notificationdrawer-subtitle",
  title: "mui-notificationdrawer-title",
  titleRow: "mui-notificationdrawer-titleRow",
  viewButton: "mui-notificationdrawer-viewButton",
} as const;

const styles = notificationDrawerStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// DATA: Mga props at uri ng data na ginagamit ng component.
interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onSelectDoc: (trackingNumber: string) => void;
  onDecision: (
    notification: NotificationItem,
    decision: "APPROVED" | "DISAPPROVED",
  ) => void;
  decisionSubmittingId?: string | null;
}

// LOGIC: State, events, at pagproseso ng data.
export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onSelectDoc,
  onDecision,
  decisionSubmittingId,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dismissAll = () =>
    notifications.forEach((notification) => onMarkRead(notification.id));

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <NotificationDrawerDesign />
      {
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <aside
            className={styles.drawer}
            aria-label="Notifications"
            aria-modal="true"
            role="dialog"
          >
            <header className={styles.header}>
              <div className={styles.headingGroup}>
                <span className={styles.bellIcon}>
                  <Bell size={18} aria-hidden="true" />
                </span>
                <div>
                  <div className={styles.titleRow}>
                    <h2 className={styles.title}>Notifications</h2>
                    {notifications.length > 0 ? (
                      <span className={styles.count}>
                        {notifications.length}
                      </span>
                    ) : null}
                  </div>
                  <p className={styles.subtitle}>
                    Recent document activity and approvals
                  </p>
                </div>
              </div>
              <div className={styles.headerActions}>
                {notifications.length > 0 ? (
                  <Button
                    type="button"
                    onClick={dismissAll}
                    className={styles.dismissAll}
                    title="Dismiss all notifications"
                  >
                    <CheckCheck size={16} aria-hidden="true" />
                    <span>Dismiss All</span>
                  </Button>
                ) : null}
                <Tooltip title="Close">
                  <IconButton
                    type="button"
                    onClick={onClose}
                    className={styles.closeButton}
                    aria-label="Close notifications"
                  >
                    <X size={18} />
                  </IconButton>
                </Tooltip>
              </div>
            </header>

            <div className={styles.list}>
              {notifications.length === 0 ? (
                <div className={styles.empty}>No recent notifications</div>
              ) : (
                notifications.map((notification) => {
                  const isApproved = notification.decisionStatus === "APPROVED";
                  const isDisapproved =
                    notification.decisionStatus === "DISAPPROVED";
                  return (
                    <article
                      key={notification.id}
                      className={`${styles.notification} ${isApproved ? styles.approved : ""} ${isDisapproved ? styles.disapproved : ""}`}
                    >
                      <div className={styles.itemHeader}>
                        <div className={styles.titleRow}>
                          <span className={styles.notificationTitle}>
                            {notification.title}
                          </span>
                          {notification.decisionStatus ? (
                            <span
                              className={`${styles.decisionBadge} ${isApproved ? styles.approvedBadge : styles.disapprovedBadge}`}
                            >
                              {isApproved ? (
                                <CheckCircle2 size={12} aria-hidden="true" />
                              ) : (
                                <XCircle size={12} aria-hidden="true" />
                              )}
                              {notification.decisionStatus}
                            </span>
                          ) : null}
                        </div>
                        <time className={styles.date}>
                          {formatDate(notification.createdAt)}
                        </time>
                      </div>

                      <p className={styles.message}>{notification.message}</p>

                      <div className={styles.itemActions}>
                        {notification.requiresDecision &&
                        !notification.decisionStatus ? (
                          <>
                            <Button
                              type="button"
                              disabled={
                                decisionSubmittingId === notification.id
                              }
                              onClick={() =>
                                onDecision(notification, "APPROVED")
                              }
                              className={styles.approveButton}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              disabled={
                                decisionSubmittingId === notification.id
                              }
                              onClick={() =>
                                onDecision(notification, "DISAPPROVED")
                              }
                              className={styles.disapproveButton}
                            >
                              Disapprove
                            </Button>
                          </>
                        ) : null}

                        {notification.trackingNumber ? (
                          <Button
                            type="button"
                            onClick={() => {
                              onSelectDoc(notification.trackingNumber!);
                              onClose();
                            }}
                            className={styles.viewButton}
                          >
                            <Eye size={12} aria-hidden="true" />
                            <span>View {notification.trackingNumber}</span>
                            <ArrowRight size={12} aria-hidden="true" />
                          </Button>
                        ) : null}

                        <Tooltip title="Dismiss notification">
                          <IconButton
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onMarkRead(notification.id);
                            }}
                            className={styles.dismissButton}
                            aria-label={`Dismiss ${notification.title}`}
                          >
                            <X size={15} aria-hidden="true" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function NotificationDrawerDesign() {
  const theme = useComponentTheme();
  return (
    <ComponentGlobalStyles
      styles={[notificationDrawerCss]}
    />
  );
}
