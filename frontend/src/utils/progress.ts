import { DocumentRecord } from '../types';

export interface ProgressInfo {
  percentage: number;
  stageName: string;
  stageStep: number; // 1 to 5
  colorClass: string;
  barBgClass: string;
}

export function calculateDocumentProgress(doc: DocumentRecord): ProgressInfo {
  const status = doc.currentStatus;
  const routeCount = doc.routes?.length || 1;

  switch (status) {
    case 'COMPLETED':
      return {
        percentage: 100,
        stageName: 'Completed & Released',
        stageStep: 5,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        barBgClass: 'bg-emerald-500'
      };

    case 'FOR_SIGNATURE':
      return {
        percentage: 80,
        stageName: 'For Signature / Final Approval',
        stageStep: 4,
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        barBgClass: 'bg-indigo-500'
      };

    case 'IN_PROGRESS': {
      // Dynamic progress between 40% and 75% based on routing steps
      const dynamicPct = Math.min(75, 40 + Math.min(routeCount * 10, 35));
      return {
        percentage: dynamicPct,
        stageName: 'Under Review / Active Routing',
        stageStep: 3,
        colorClass: 'text-blue-600 dark:text-blue-400',
        barBgClass: 'bg-blue-500'
      };
    }

    case 'RETURNED':
      return {
        percentage: 35,
        stageName: 'Returned for Revision / Clarification',
        stageStep: 2,
        colorClass: 'text-rose-600 dark:text-rose-400',
        barBgClass: 'bg-rose-500'
      };

    case 'ON_HOLD':
      return {
        percentage: 30,
        stageName: 'Processing Suspended / On Hold',
        stageStep: 2,
        colorClass: 'text-amber-600 dark:text-amber-400',
        barBgClass: 'bg-amber-500'
      };

    case 'PENDING':
    default:
      return {
        percentage: 20,
        stageName: 'Received & Logged',
        stageStep: 1,
        colorClass: 'text-amber-600 dark:text-amber-400',
        barBgClass: 'bg-amber-400'
      };
  }
}
