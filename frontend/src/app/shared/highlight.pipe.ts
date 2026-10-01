import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true,
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: unknown, query: string | null | undefined): SafeHtml {
    if (value === null || value === undefined) return '';
    const text = String(value);
    const q = (query || '').trim();
    if (!q) return text;

    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return text;

    const escapedTokens = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');

    const safeText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const highlighted = safeText.replace(
      regex,
      '<mark class="search-highlight match is-highlighted">$1</mark>',
    );

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
