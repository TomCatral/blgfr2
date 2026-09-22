import { Component, Input } from '@angular/core';
import { AuditLog, DocumentRecord } from '../../../types';
import { ReportsViewComponent } from './reports-view.component';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-outgoing-report',
  standalone: true,
  imports: [IonicModule, ReportsViewComponent],
  templateUrl: './outgoing-report.component.html',
  styleUrl: './outgoing-report.component.scss',
})
export class OutgoingReportComponent {
  @Input() documents: DocumentRecord[] = [];
  @Input() envelopeLogs: AuditLog[] = [];
  @Input() auditLogs: AuditLog[] = [];
}
