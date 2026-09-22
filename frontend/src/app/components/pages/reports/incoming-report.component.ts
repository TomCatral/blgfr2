import { Component, Input } from '@angular/core';
import { AuditLog, DocumentRecord } from '../../../types';
import { ReportsViewComponent } from './reports-view.component';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-incoming-report',
  standalone: true,
  imports: [IonicModule, ReportsViewComponent],
  templateUrl: './incoming-report.component.html',
  styleUrl: './incoming-report.component.scss',
})
export class IncomingReportComponent {
  @Input() documents: DocumentRecord[] = [];
  @Input() envelopeLogs: AuditLog[] = [];
  @Input() auditLogs: AuditLog[] = [];
}
