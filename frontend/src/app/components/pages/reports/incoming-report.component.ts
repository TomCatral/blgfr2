import { Component, Input } from '@angular/core';
import { AuditLog, DocumentRecord } from '../../../types';
import { ReportsViewComponent } from './reports-view.component';

@Component({
  selector: 'app-incoming-report',
  standalone: true,
  imports: [ReportsViewComponent],
  templateUrl: './incoming-report.component.html',
})
export class IncomingReportComponent {
  @Input() documents: DocumentRecord[] = [];
  @Input() envelopeLogs: AuditLog[] = [];
  @Input() auditLogs: AuditLog[] = [];
}