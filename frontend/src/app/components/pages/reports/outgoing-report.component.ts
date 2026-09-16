import { Component, Input } from '@angular/core';
import { AuditLog, DocumentRecord } from '../../../types';
import { ReportsViewComponent } from './reports-view.component';

@Component({
  selector: 'app-outgoing-report',
  standalone: true,
  imports: [ReportsViewComponent],
  templateUrl: './outgoing-report.component.html',
})
export class OutgoingReportComponent {
  @Input() documents: DocumentRecord[] = [];
  @Input() envelopeLogs: AuditLog[] = [];
  @Input() auditLogs: AuditLog[] = [];
}