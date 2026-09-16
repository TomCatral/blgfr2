import { Component, Input } from '@angular/core';
import { AuditLog, DocumentRecord } from '../../../types';
import { ReportsViewComponent } from './reports-view.component';

@Component({
  selector: 'app-envelope-report',
  standalone: true,
  imports: [ReportsViewComponent],
  templateUrl: './envelope-report.component.html',
})
export class EnvelopeReportComponent {
  @Input() documents: DocumentRecord[] = [];
  @Input() envelopeLogs: AuditLog[] = [];
  @Input() auditLogs: AuditLog[] = [];
}