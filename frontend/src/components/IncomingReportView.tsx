// IncomingReportView
// Data, events, layout, at kasalukuyang inline design ng component.

// IMPORTS: Mga component, helper, at library na ginagamit dito.
import { cx } from "../styles/muiClasses";
import React from "react";
import { AuditLog, DocumentRecord } from "../types";
import { ReportsView } from "./ReportsView";

// DATA: Mga props at uri ng data na ginagamit ng component.
interface IncomingReportViewProps {
  documents: DocumentRecord[];
  envelopeLogs: AuditLog[];
  auditLogs: AuditLog[];
}

// LOGIC: State, events, at pagproseso ng data.
export const IncomingReportView: React.FC<IncomingReportViewProps> = (
  props,
) => <ReportsView {...props} reportType="INCOMING" />;
