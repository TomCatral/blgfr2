import { Component, signal, inject, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';
import { UiService } from '../../../services/ui.service';

@Component({
  selector: 'app-qr-code-generator',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, FormsModule],
  styleUrl: './qr-code-generator.component.scss',
  templateUrl: './qr-code-generator.component.html',
})
export class QRCodeGeneratorComponent implements OnInit {
  private ui = inject(UiService);
  routeDirection = signal<'IN' | 'OUT'>('IN');
  rangeStart = signal('1');
  rangeEnd = signal('10');
  manualQrValue = signal('');
  qrValue = signal('');
  qrSize = signal(200);
  copied = signal(false);
  generatedRange = signal<string[]>([]);
  generatedRangeDataUrls = signal<Array<{ value: string; dataUrl: string }>>([]);
  recentQrs = signal<string[]>([]);
  qrDataUrl = signal<string | null>(null);

  ngOnInit(): void {
    try {
      const stored = localStorage.getItem('blgf_recent_qrs');
      if (stored) this.recentQrs.set(JSON.parse(stored));
    } catch {}
  }


  private saveRecentCodes(values: string[]): void {
    const updated = [...new Set([...values, ...this.recentQrs()])].slice(0, 20);
    this.recentQrs.set(updated);
    localStorage.setItem('blgf_recent_qrs', JSON.stringify(updated));
  }

  private async updateQR(text: string): Promise<string | null> {
    if (!text) {
      this.qrDataUrl.set(null);
      return null;
    }
    try {
      const url = await QRCode.toDataURL(text, {
        width: Math.max(256, this.qrSize()),
        margin: 0,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      this.qrDataUrl.set(url);
      return url;
    } catch {
      this.qrDataUrl.set(null);
      return null;
    }
  }

  async generateQR(): Promise<void> {
    const value = this.manualQrValue().trim();
    if (!value) {
      this.ui.showError('Enter the text or code to include in the QR code.');
      return;
    }
    this.qrValue.set(value);
    this.saveRecentCodes([value]);
    await this.updateQR(value);
  }

  async generateRouteNumberRange(): Promise<void> {
    const start = Number(this.rangeStart());
    const end = Number(this.rangeEnd());
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      this.ui.showError('Enter whole numbers for both Start Number and End Number.');
      return;
    }
    if (start < 1 || start > 100 || end < 1 || end > 100) {
      this.ui.showError('Start Number and End Number must both be from 1 to 100.');
      return;
    }
    if (end < start) {
      this.ui.showError('Ending number must be greater than or equal to the starting number.');
      return;
    }
    if (end - start + 1 > 100) {
      this.ui.showError('Generate a maximum of 100 route numbers at one time.');
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const direction = this.routeDirection();
    const values = Array.from({ length: end - start + 1 }, (_, i) =>
      `BLGFR2-${year}-${month}-${direction}-${String(start + i).padStart(2, '0')}`,
    );
    this.qrValue.set(values[0]);
    this.generatedRange.set(values);
    this.saveRecentCodes(values);
    await this.updateQR(values[0]);
    await this.generateRangeDataUrls(values);
  }

  private async generateRangeDataUrls(values: string[]): Promise<Array<{ value: string; dataUrl: string }>> {
    const entries = await Promise.all(
      values.map(async (v) => {
        try {
          return {
            value: v,
            dataUrl: await QRCode.toDataURL(v, {
              width: 256,
              margin: 0,
              color: { dark: '#000000', light: '#ffffff' },
              errorCorrectionLevel: 'M',
            }),
          };
        } catch {
          return { value: v, dataUrl: '' };
        }
      }),
    );
    this.generatedRangeDataUrls.set(entries);
    return entries;
  }

  onSizeChange(val: number): void {
    const clamped = Math.min(400, Math.max(128, val || 128));
    this.qrSize.set(clamped);
    if (this.qrValue()) void this.updateQR(this.qrValue());
  }

  onSelectRecent(item: string): void {
    this.qrValue.set(item);
    void this.updateQR(item);
  }

  onRangeStartBlur(): void {
    if (this.rangeStart() === '') this.rangeStart.set('1');
  }

  onRangeEndBlur(): void {
    if (this.rangeEnd() === '') this.rangeEnd.set('100');
  }

  async handleDownload(): Promise<void> {
    if (!this.qrValue() || !this.qrDataUrl()) return;
    const size = this.qrSize();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = size;
      canvas.height = size + 40;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 20, size, size);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.qrValue(), canvas.width / 2, canvas.height - 8);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `BLGF_QR_${this.qrValue().replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = this.qrDataUrl()!;
  }

  async handleCopy(): Promise<void> {
    if (!this.qrValue()) return;
    try {
      await navigator.clipboard.writeText(this.qrValue());
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = this.qrValue();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  async handlePrint(): Promise<void> {
    const value = this.qrValue().trim();
    if (!value) {
      this.ui.showError('No QR code generated yet to print.');
      return;
    }
    let dataUrl = this.qrDataUrl();
    if (!dataUrl) {
      dataUrl = await this.updateQR(value);
    }
    if (!dataUrl) {
      this.ui.showError('QR code is not ready to print.');
      return;
    }
    this.openDuplicatePrintWindow([{ value, dataUrl }]);
  }

  async handlePrintRange(): Promise<void> {
    let items = this.generatedRangeDataUrls().filter((c) => c.value && c.dataUrl);
    if (items.length === 0 && this.generatedRange().length > 0) {
      items = await this.generateRangeDataUrls(this.generatedRange());
    }
    items = items.filter((c) => c.value && c.dataUrl);
    if (items.length === 0) {
      this.ui.showError('No QR codes generated yet to print.');
      return;
    }
    this.openDuplicatePrintWindow(items);
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>'"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c] || c,
    );
  }

  private openDuplicatePrintWindow(codes: Array<{ value: string; dataUrl: string }>): void {
    if (codes.length === 0) return;
    const html = this.buildPrintDocument(codes);

    // Prefer a new print window as it provides a fully rendered viewport and reliable image decoding
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      return;
    }

    // Fallback to invisible off-screen iframe if pop-up was blocked
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.left = '-9999px';
    frame.style.top = '-9999px';
    frame.style.width = '210mm';
    frame.style.height = '297mm';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';

    document.body.appendChild(frame);
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) {
      frame.remove();
      this.ui.showError('Unable to prepare print document.');
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const win = frame.contentWindow;
    if (!win) {
      frame.remove();
      return;
    }

    const cleanup = () => {
      try {
        frame.remove();
      } catch {}
    };

    win.onafterprint = cleanup;
    setTimeout(cleanup, 120000);
  }

  private buildPrintDocument(codes: Array<{ value: string; dataUrl: string }>): string {
    const printedQrSize = Math.min(36, Math.max(20, Math.round(this.qrSize() * 0.09)));
    const printedBoxHeight = printedQrSize + 14;
    const printedCopyWidth = printedQrSize + 8;
    const printedPairWidth = printedCopyWidth * 2 + 3;
    const pairsPerRow = printedPairWidth <= 62 ? 3 : 2;

    const sheets = codes
      .map(({ value, dataUrl }) => {
        const safeValue = this.escapeHtml(value);
        const copy = (copyType: string) => `
        <section class="copy">
          <div class="copy-type">${copyType}</div>
          <div class="qr-container"><img src="${dataUrl}" alt="QR code" /></div>
          <div class="route-number">${safeValue}</div>
        </section>`;
        return `<article class="sheet">${copy('ORIGINAL COPY')}${copy('FILE COPY')}</article>`;
      })
      .join('');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>BLGF QR Codes - Original and File Copies</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #fff; font-family: Arial, sans-serif; color: #111827; }
    body {
      width: 194mm;
      display: grid;
      grid-template-columns: repeat(${pairsPerRow}, ${printedPairWidth}mm);
      align-content: start;
      justify-content: center;
      column-gap: 3mm;
      row-gap: 2mm;
    }
    .sheet {
      width: ${printedPairWidth}mm;
      min-height: ${printedBoxHeight}mm;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2mm;
      break-inside: avoid;
      page-break-inside: avoid;
      padding: 1mm 0;
    }
    .copy {
      position: relative;
      width: ${printedCopyWidth}mm;
      flex: 0 0 ${printedCopyWidth}mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5mm 1mm;
      border: 1px dashed #94a3b8;
      border-radius: 2mm;
      text-align: center;
    }
    .copy-type {
      margin: 0 0 1mm;
      padding: 0;
      font-size: 6.5pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: .04em;
      color: #334155;
    }
    .qr-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${printedQrSize}mm;
      height: ${printedQrSize}mm;
    }
    .qr-container img {
      display: block;
      width: ${printedQrSize}mm !important;
      height: ${printedQrSize}mm !important;
      min-width: ${printedQrSize}mm;
      min-height: ${printedQrSize}mm;
      object-fit: contain;
      image-rendering: pixelated;
    }
    .route-number {
      margin-top: 1.2mm;
      font-family: Consolas, monospace;
      font-size: 6.5pt;
      line-height: 1.1;
      font-weight: 800;
      word-break: break-all;
      color: #0f172a;
    }
    @media screen {
      body { min-height: 281mm; padding: 12px; background: #f1f5f9; }
      .sheet { background: #fff; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
    }
  </style>
</head>
<body>
  ${sheets}
  <script>
    window.addEventListener('load', function() {
      const imgs = Array.from(document.querySelectorAll('img'));
      const promises = imgs.map(function(img) {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        if (img.decode) return img.decode().catch(function() {});
        return new Promise(function(resolve) {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });
      Promise.all(promises).then(function() {
        setTimeout(function() {
          window.focus();
          window.print();
        }, 150);
      });
    });
  <\/script>
</body>
</html>`;
  }

  clearRecent(): void {
    this.recentQrs.set([]);
    localStorage.removeItem('blgf_recent_qrs');
  }
}
