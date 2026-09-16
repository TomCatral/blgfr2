import { Pipe, PipeTransform } from '@angular/core';
import { cx } from './class-utils';

@Pipe({ name: 'cls', standalone: true })
export class ClsPipe implements PipeTransform {
  transform(...values: unknown[]): string {
    return cx(...values);
  }
}