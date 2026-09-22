import { Component, Input } from '@angular/core';
import { AuditLog, DocumentRecord } from '../../../types';
import { ReportsViewComponent } from './reports-view.component';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-envelope-report',
  standalone: true,
  imports: [IonicModule, ReportsViewComponent],
  templateUrl: './envelope-report.component.html',
  styleUrl: './envelope-report.component.scss',
})
export class EnvelopeReportComponent {
  @Input() documents: DocumentRecord[] = [];
  @Input() envelopeLogs: AuditLog[] = [];
  @Input() auditLogs: AuditLog[] = [];
}
