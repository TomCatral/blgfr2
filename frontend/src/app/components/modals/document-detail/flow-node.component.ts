import { Component, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgClass } from '@angular/common';
import { ClsPipe } from '../../../shared/cls.pipe';
import type { DocumentRouteStep } from '../../../types';
import type { DocumentDetailComponent } from './document-detail.component';

@Component({
  selector: 'app-flow-node',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgClass, ClsPipe, FlowNodeComponent],
  templateUrl: './flow-node.component.html',
  styleUrl: './flow-node.component.scss',
})
export class FlowNodeComponent {
  @Input({ required: true }) recipient!: DocumentRouteStep;
  @Input({ required: true }) flowNumber = '1';
  @Input({ required: true }) parent!: DocumentDetailComponent;
}
