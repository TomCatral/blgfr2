import { DocumentStatus, PriorityLevel, StatusConfig } from '../types';

export const STATUS_CONFIGS: Record<DocumentStatus, StatusConfig> = {
  PENDING: {
    label: 'Pending / Received',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700',
    bgHex: '#fef3c7',
    textHex: '#92400e',
    dotClass: 'bg-amber-500'
  },
  IN_PROGRESS: {
    label: 'In Progress / Under Review',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700',
    bgHex: '#dbeafe',
    textHex: '#1e40af',
    dotClass: 'bg-blue-500'
  },
  FOR_SIGNATURE: {
    label: 'For Signature / Approval',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700',
    bgHex: '#e0e7ff',
    textHex: '#3730a3',
    dotClass: 'bg-indigo-500'
  },
  COMPLETED: {
    label: 'Completed & Released',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700',
    bgHex: '#d1fae5',
    textHex: '#065f46',
    dotClass: 'bg-emerald-500'
  },
  RETURNED: {
    label: 'Returned for Revision',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700',
    bgHex: '#ffe4e6',
    textHex: '#9f1239',
    dotClass: 'bg-rose-500'
  },
  ON_HOLD: {
    label: 'On Hold / Suspended',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700',
    bgHex: '#ffedd5',
    textHex: '#9a3412',
    dotClass: 'bg-orange-500'
  }
};

export const PRIORITY_CONFIGS: Record<PriorityLevel, { label: string; badgeClass: string; animatePulse?: boolean }> = {
  ROUTINE: {
    label: 'Routine',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
  },
  URGENT: {
    label: 'Urgent',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300'
  },
  VERY_URGENT: {
    label: 'Very Urgent!',
    badgeClass: 'bg-rose-600 text-white border-rose-700 font-semibold',
    animatePulse: true
  },
  CONFIDENTIAL: {
    label: 'Confidential',
    badgeClass: 'bg-purple-900 text-purple-100 border-purple-800 font-medium'
  }
};

export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}
