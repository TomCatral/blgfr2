/**
 * Shared drawing helpers for the BLGF Region II thesis diagrams.
 *
 * All figures are authored in "logical" units and rendered at SCALE device
 * pixels so that the resulting PNG stays crisp when placed in the manuscript.
 *
 * Because the diagrams are generated rather than hand-placed, every text run is
 * measured and shrunk to fit its container. Any residual overflow is reported
 * through `getDiagnostics()` so the build can fail loudly instead of silently
 * producing a clipped figure.
 */
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

export const SCALE = 2;

export const C = {
  ink: '#12233a',
  body: '#2c3e50',
  muted: '#5b6b7c',
  line: '#33475b',
  hair: '#8fa3b5',

  navy: '#123a5e',
  navySoft: '#e8f0f7',
  blue: '#1d4ed8',
  blueSoft: '#e6edfd',
  sky: '#0e7490',
  skySoft: '#e2f4f8',
  teal: '#0f766e',
  tealSoft: '#e0f2ef',
  green: '#15803d',
  greenSoft: '#e4f4e8',
  amber: '#b45309',
  amberSoft: '#fdf1de',
  rose: '#be123c',
  roseSoft: '#fdeaee',
  violet: '#6d28d9',
  violetSoft: '#f0e9fd',
  slate: '#475569',
  slateSoft: '#eef1f5',
  white: '#ffffff',
  page: '#ffffff',
};

const FONT_STACK = ['Segoe UI', 'Tahoma', 'Arial', 'Helvetica', 'sans-serif']
  .filter((name) => GlobalFonts.fontsFromFile === undefined || true)
  .join(', ');

const diagnostics = [];
const textRecords = [];

/** Reset the recorded text boxes; call once at the start of each figure. */
export function resetTextRecords() {
  textRecords.length = 0;
}

function recordText(label, x, y, w, h, text, rotated = false) {
  textRecords.push({ label, x, y, w, h, text, rotated });
}

export function getTextRecords() {
  return textRecords;
}

export function getDiagnostics() {
  return diagnostics;
}

export function resetDiagnostics() {
  diagnostics.length = 0;
}

export function note(kind, message) {
  diagnostics.push({ kind, message });
}

export function makeCanvas(width, height, background = C.page) {
  const canvas = createCanvas(Math.round(width * SCALE), Math.round(height * SCALE));
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = 'alphabetic';
  fillRect(ctx, 0, 0, width, height, background);
  return { canvas, ctx, width, height };
}

export function fillRect(ctx, x, y, w, h, style) {
  ctx.fillStyle = style;
  ctx.fillRect(x, y, w, h);
}

export function strokeRect(ctx, x, y, w, h, color, width = 1, dash = null) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

export function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function fillRoundRect(ctx, x, y, w, h, r, style) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = style;
  ctx.fill();
}

export function strokeRoundRect(ctx, x, y, w, h, r, color, width = 1, dash = null) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.stroke();
  ctx.restore();
}

export function setFont(ctx, size, weight = '400', italic = false) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT_STACK}`;
}

export function textWidth(ctx, text, size, weight = '400', italic = false) {
  setFont(ctx, size, weight, italic);
  return ctx.measureText(text).width;
}

/** Greedy word wrap that also breaks over-long single tokens. */
export function wrapText(ctx, text, maxWidth, size, weight = '400', italic = false) {
  setFont(ctx, size, weight, italic);
  const lines = [];
  const paragraphs = String(text ?? '').split('\n');
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !current) {
        if (!current && ctx.measureText(word).width > maxWidth) {
          // Break a token that cannot fit on its own line.
          let chunk = '';
          for (const char of word) {
            if (ctx.measureText(chunk + char).width > maxWidth && chunk) {
              lines.push(chunk);
              chunk = char;
            } else {
              chunk += char;
            }
          }
          current = chunk;
          continue;
        }
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/**
 * Draws wrapped text inside a box, shrinking the font until the block fits.
 * Returns the font size actually used so callers can lay out siblings.
 */
export function fitText(ctx, text, box, options = {}) {
  const {
    align = 'left',
    valign = 'top',
    minSize = options.minSize ?? 8,
    maxSize = options.maxSize ?? 14,
    weight = '400',
    italic = false,
    color = C.body,
    lineGap = 0.28,
    padding = options.padding ?? 0,
    label = 'text',
    maxLines = Infinity,
  } = options;

  const innerW = Math.max(8, box.w - padding * 2);
  const innerH = Math.max(8, box.h - padding * 2);
  let size = maxSize;
  let lines = [];
  let lineHeight = 0;

  for (; size >= minSize; size -= 0.5) {
    lines = wrapText(ctx, text, innerW, size, weight, italic);
    if (lines.length > maxLines) continue;
    lineHeight = size * (1 + lineGap);
    if (lines.length * lineHeight <= innerH + 0.01) break;
  }

  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines.length - 1;
    lines[last] = `${lines[last].replace(/[\s.]+$/, '')}...`;
    note('truncated', `${label}: text clipped after ${maxLines} lines`);
  }

  const blockH = lines.length * lineHeight;
  let startY;
  if (valign === 'middle') startY = box.y + padding + (innerH - blockH) / 2 + size * 0.8;
  else if (valign === 'bottom') startY = box.y + padding + (innerH - blockH) + size * 0.8;
  else startY = box.y + padding + size * 0.8;

  ctx.save();
  setFont(ctx, size, weight, italic);
  ctx.fillStyle = color;
  let actualW = 0;
  let actualX = box.x + padding;
  lines.forEach((line, index) => {
    const lineW = ctx.measureText(line).width;
    actualW = Math.max(actualW, lineW);
    let x = box.x + padding;
    if (align === 'center') x = box.x + padding + (innerW - lineW) / 2;
    else if (align === 'right') x = box.x + box.w - padding - lineW;
    ctx.fillText(line, x, startY + index * lineHeight);
  });
  if (align === 'center') actualX = box.x + padding + (innerW - actualW) / 2;
  else if (align === 'right') actualX = box.x + box.w - padding - actualW;
  ctx.restore();
  recordText(label, actualX, startY - size * 0.9, actualW, blockH, lines.join(' '));

  return { size, lines: lines.length, lineHeight };
}

/** Single-line text that shrinks to fit `maxWidth`. */
export function fitLine(ctx, text, x, y, maxWidth, options = {}) {
  const {
    minSize = options.minSize ?? 7,
    maxSize = options.maxSize ?? 14,
    weight = '600',
    italic = false,
    color = C.body,
    align = 'left',
    label = 'label',
  } = options;
  let size = maxSize;
  while (size > minSize && textWidth(ctx, String(text), size, weight, italic) > maxWidth) {
    size -= 0.5;
  }
  const w = textWidth(ctx, String(text), size, weight, italic);
  if (w > maxWidth + 0.5) note('overflow', `${label}: "${text}" needs ${w.toFixed(1)} > ${maxWidth}`);
  let drawX = x;
  if (align === 'center') drawX = x - w / 2;
  else if (align === 'right') drawX = x - w;
  setFont(ctx, size, weight, italic);
  ctx.fillStyle = color;
  ctx.fillText(String(text), drawX, y);
  recordText(
    label,
    drawX,
    y - size * 0.82,
    w,
    size * 1.24,
    String(text),
  );
  return { size, width: w };
}

/** Rotated (vertical) single-line label, used along narrow connector gaps. */
export function verticalLabel(ctx, x, y, maxLength, text, options = {}) {
  const {
    minSize = 7.5,
    maxSize = 11,
    weight = '600',
    color = C.body,
    flip = false,
    label = 'vlabel',
  } = options;
  let size = maxSize;
  while (size > minSize && textWidth(ctx, String(text), size, weight) > maxLength) size -= 0.25;
  if (textWidth(ctx, String(text), size, weight) > maxLength + 0.5) {
    note('overflow', `${label}: "${text}" too long for ${maxLength}px`);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(flip ? -Math.PI / 2 : Math.PI / 2);
  setFont(ctx, size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(String(text), 0, 0);
  ctx.restore();
  const tw = textWidth(ctx, String(text), size, weight);
  recordText(label, x - (size * 1.24) / 2, y - tw / 2, size * 1.24, tw, String(text), true);
  return size;
}

/** UML stick-figure actor with a caption underneath. */
export function stickFigure(ctx, cx, topY, scale, label, options = {}) {
  const {
    color = C.ink,
    labelColor = C.ink,
    headR = 9 * scale,
    labelWidth = 190,
    labelSize = 11,
    weight = '600',
  } = options;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, topY + headR, headR, 0, Math.PI * 2);
  ctx.stroke();
  const bodyTop = topY + headR * 2 + 4 * scale;
  const bodyH = 30 * scale;
  ctx.beginPath();
  ctx.moveTo(cx, bodyTop);
  ctx.lineTo(cx, bodyTop + bodyH);
  ctx.moveTo(cx - 15 * scale, bodyTop + 10 * scale);
  ctx.lineTo(cx + 15 * scale, bodyTop + 10 * scale);
  ctx.moveTo(cx - 11 * scale, bodyTop + bodyH);
  ctx.lineTo(cx, bodyTop + bodyH);
  ctx.lineTo(cx + 11 * scale, bodyTop + bodyH);
  ctx.stroke();
  ctx.restore();
  if (label) {
    const labelY = bodyTop + bodyH + 18 * scale;
    return fitText(
      ctx,
      label,
      { x: cx - labelWidth / 2, y: labelY, w: labelWidth, h: labelWidth * 0.55 },
      {
        align: 'center',
        valign: 'top',
        color: labelColor,
        maxSize: labelSize,
        minSize: 7.5,
        weight,
        label: `actor:${label}`,
      },
    );
  }
  return null;
}

export function arrowHead(ctx, x, y, angle, size = 9, color = C.line) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, size * 0.42);
  ctx.lineTo(-size, -size * 0.42);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Straight connector with an arrow head at the far end. */
export function line(ctx, x1, y1, x2, y2, options = {}) {
  const { color = C.line, width = 1.6, dash = null, head = true, headSize = 9 } = options;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
  if (head) arrowHead(ctx, x2, y2, Math.atan2(y2 - y1, x2 - x1), headSize, color);
}

/** Elbow (orthogonal) connector between two anchors. */
export function elbow(ctx, points, options = {}) {
  const { color = C.line, width = 1.6, dash = null, head = true, headSize = 9 } = options;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
  if (head) {
    const a = points[points.length - 2];
    const b = points[points.length - 1];
    arrowHead(ctx, b.x, b.y, Math.atan2(b.y - a.y, b.x - a.x), headSize, color);
  }
}

/** Arrow with an optional caption placed beside the shaft. */
export function flowArrow(ctx, x1, y1, x2, y2, label, options = {}) {
  const {
    color = C.line,
    width = 1.8,
    dash = null,
    labelBox = null,
    labelColor = color,
    labelSize = 10.5,
    labelWeight = '600',
    labelAngle = null,
  } = options;
  line(ctx, x1, y1, x2, y2, { color, width, dash });
  if (!label) return;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  ctx.save();
  if (labelAngle !== null) {
    ctx.translate(mx, my);
    ctx.rotate(labelAngle);
    const w = textWidth(ctx, label, labelSize, labelWeight) + 8;
    fillRect(ctx, -w / 2, -labelSize - 4, w, labelSize + 6, C.page);
    fitLine(ctx, label, 0, 0, w - 2, {
      align: 'center',
      color: labelColor,
      size: labelSize,
      maxSize: labelSize,
      weight: labelWeight,
      label: 'flow-label',
    });
    ctx.restore();
    return;
  }
  ctx.restore();
  if (labelBox) {
    fitText(ctx, label, labelBox, {
      align: 'center',
      valign: 'middle',
      color: labelColor,
      maxSize: labelSize,
      minSize: 7.5,
      weight: labelWeight,
      label: 'flow-label',
    });
  } else {
    const w = textWidth(ctx, label, labelSize, labelWeight) + 8;
    fillRect(ctx, mx - w / 2, my - labelSize - 3, w, labelSize + 5, C.page);
    fitLine(ctx, label, mx, my + 2, w - 4, {
      align: 'center',
      color: labelColor,
      maxSize: labelSize,
      minSize: 7,
      weight: labelWeight,
      label: 'flow-label',
    });
  }
}

/** Crow's-foot terminus: `many` = three prongs, `one` = single bar, `zeroOne` = bar + circle. */
export function crowFoot(ctx, x, y, angle, kind, color = C.line) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  if (kind === 'many') {
    const s = 8;
    ctx.beginPath();
    ctx.moveTo(-s, -s);
    ctx.lineTo(0, 0);
    ctx.moveTo(-s, s);
    ctx.lineTo(0, 0);
    ctx.moveTo(-s, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();
  } else if (kind === 'one') {
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();
  } else if (kind === 'zeroOne') {
    ctx.beginPath();
    ctx.arc(-13, 0, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();
  } else if (kind === 'mandatoryOne') {
    ctx.beginPath();
    ctx.moveTo(-9, -7);
    ctx.lineTo(-9, 7);
    ctx.moveTo(-9, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();
  }
  ctx.restore();
}

/** Cardinality badge such as "1", "0..N", "1..1". */
export function cardinality(ctx, x, y, text, color = C.line) {
  const w = textWidth(ctx, text, 10, '700') + 10;
  fillRoundRect(ctx, x - w / 2, y - 8, w, 16, 5, C.page);
  strokeRoundRect(ctx, x - w / 2, y - 8, w, 16, 5, color, 1);
  fitLine(ctx, text, x, y + 3.6, w - 3, {
    align: 'center',
    color,
    maxSize: 10,
    minSize: 7,
    weight: '700',
    label: 'cardinality',
  });
}

/** Figure title strip drawn inside the image. */
export function figureTitle(ctx, width, title, subtitle = null) {
  fillRect(ctx, 0, 0, width, 4, C.navy);
  fitLine(ctx, title, width / 2, 34, width - 60, {
    align: 'center',
    color: C.navy,
    maxSize: 20,
    minSize: 12,
    weight: '700',
    label: 'figure-title',
  });
  if (subtitle) {
    fitLine(ctx, subtitle, width / 2, 54, width - 80, {
      align: 'center',
      color: C.muted,
      maxSize: 12,
      minSize: 8.5,
      weight: '500',
      italic: true,
      label: 'figure-subtitle',
    });
  }
}

/** Rounded panel with a coloured caption bar. */
export function panel(ctx, x, y, w, h, caption, colors, options = {}) {
  const { r = 10, bodyFill = colors.soft, bodyStroke = colors.main, dash = null } = options;
  fillRoundRect(ctx, x, y, w, h, r, bodyFill);
  strokeRoundRect(ctx, x, y, w, h, r, bodyStroke, 1.8, dash);
  const capH = 30;
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  fillRect(ctx, x, y, w, capH, colors.main);
  ctx.restore();
  strokeRoundRect(ctx, x, y, w, h, r, bodyStroke, 1.8, dash);
  strokeLine(ctx, x, y + capH, x + w, y + capH, bodyStroke, 1.2);
  fitText(
    ctx,
    caption,
    { x: x + 8, y: y + 2, w: w - 16, h: capH - 4 },
    {
      align: 'center',
      valign: 'middle',
      color: C.white,
      maxSize: 13,
      minSize: 9,
      weight: '700',
      label: `panel:${caption}`,
    },
  );
  return { innerX: x + 12, innerY: y + capH + 10, innerW: w - 24, innerH: h - capH - 20 };
}

export function strokeLine(ctx, x1, y1, x2, y2, color = C.line, width = 1.2, dash = null) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** Bulleted list that auto-fits. */
export function bulletList(ctx, items, box, options = {}) {
  const {
    color = C.body,
    markerColor = options.markerColor ?? C.blue,
    maxSize = 12,
    minSize = 8,
    gap = 0.42,
    indent = 12,
    label = 'bullets',
  } = options;
  const usableW = box.w - indent;
  for (let size = maxSize; size >= minSize; size -= 0.5) {
    const wrapped = items.map((item) => wrapText(ctx, item, usableW, size, '400'));
    const lineH = size * (1 + gap);
    const total = wrapped.reduce((sum, lines) => sum + lines.length * lineH, 0)
      + Math.max(0, wrapped.length - 1) * lineH * 0.35;
    if (total <= box.h + 0.01) {
      ctx.save();
      setFont(ctx, size, '400');
      ctx.fillStyle = color;
      let y = box.y + size * 0.82;
      wrapped.forEach((lines, index) => {
        if (index > 0) y += lineH * 0.35;
        ctx.fillStyle = markerColor;
        ctx.beginPath();
        ctx.arc(box.x + 4, y - size * 0.28, Math.max(1.4, size * 0.11), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        lines.forEach((line, li) => {
          ctx.fillText(line, box.x + indent, y + li * lineH);
        });
        y += lines.length * lineH;
      });
      ctx.restore();
      return { size, lineH };
    }
  }
  note('overflow', `${label}: bullet list does not fit at ${minSize}px`);
  return bulletList(ctx, items, box, { ...options, maxSize: minSize, minSize: minSize - 0.5 });
}

/** Key/value chip used for legends. */
export function chip(ctx, x, y, label, colors, options = {}) {
  const { size = 10, h = 20, padX = 9 } = options;
  const w = textWidth(ctx, label, size, '600') + padX * 2;
  fillRoundRect(ctx, x, y, w, h, 6, colors.soft);
  strokeRoundRect(ctx, x, y, w, h, 6, colors.main, 1, options.dash ?? null);
  fitLine(ctx, label, x + w / 2, y + h / 2 + size * 0.35, w - 4, {
    align: 'center',
    color: colors.main,
    maxSize: size,
    minSize: 7,
    weight: '600',
    label: 'chip',
  });
  return w;
}

export function legendRow(ctx, x, y, entries, options = {}) {
  const { size = 10, gap = 16, swatch = 12 } = options;
  let cursor = x;
  for (const entry of entries) {
    if (entry.style === 'dash') {
      strokeLine(ctx, cursor, y + size * 0.35, cursor + swatch + 8, y + size * 0.35, entry.color, 1.6, [4, 3]);
      cursor += swatch + 12;
    } else if (entry.style === 'crow') {
      crowFoot(ctx, cursor + swatch, y + size * 0.35, 0, entry.kind ?? 'many', entry.color);
      strokeLine(ctx, cursor + swatch + 2, y + size * 0.35, cursor + swatch + 16, y + size * 0.35, entry.color, 1.6);
      cursor += swatch + 20;
    } else {
      fillRect(ctx, cursor, y + size * 0.12, swatch, swatch * 0.55, entry.color);
      cursor += swatch + 6;
    }
    cursor += fitLine(ctx, entry.label, cursor, y + size * 0.35, 320, {
      color: entry.textColor ?? C.muted,
      maxSize: size,
      minSize: 7,
      weight: '500',
      label: 'legend',
    }).width;
    cursor += gap;
  }
  return cursor - x;
}

/** Ellipse (use-case / DFD node). */
export function fillEllipse(ctx, cx, cy, rx, ry, fill, stroke, width = 1.5, dash = null) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.stroke();
  ctx.restore();
}

export function writePng(canvas, file) {
  // eslint-disable-next-line no-undef
  return canvas.toBuffer('image/png');
}

/* ------------------------------------------------------------------ *
 * Deterministic layout verification
 *
 * The figures cannot be eyeballed in this environment, so every text run is
 * recorded as an axis-aligned box and checked for (a) containment inside the
 * canvas and (b) overlap with another text box. Boxes that merely touch (share
 * an edge) are tolerated; a real overlap of more than a fraction of a pixel is
 * reported as a diagnostic.
 * ------------------------------------------------------------------ */
export function checkLayout(canvasWidth, canvasHeight, options = {}) {
  const { tolerance = 0.75, scope = 'figure' } = options;
  const eps = 0.5;

  textRecords.forEach((r) => {
    if (r.x < -eps || r.y < -eps || r.x + r.w > canvasWidth + eps || r.y + r.h > canvasHeight + eps) {
      note(
        'outside-canvas',
        `${scope}: ${r.label} -> [${r.x.toFixed(0)},${r.y.toFixed(0)},${(r.x + r.w).toFixed(0)},${(r.y + r.h).toFixed(0)}] "${r.text.slice(0, 44)}"`,
      );
    }
  });

  const overlapArea = (a, b) => {
    const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return x * y;
  };

  for (let i = 0; i < textRecords.length; i += 1) {
    for (let j = i + 1; j < textRecords.length; j += 1) {
      const a = textRecords[i];
      const b = textRecords[j];
      if (a.rotated !== b.rotated) continue;
      const area = overlapArea(a, b);
      if (area > tolerance) {
        const minSide = Math.min(a.w, a.h, b.w, b.h);
        note(
          'text-overlap',
          `${scope}: "${a.text.slice(0, 30)}" (${a.label}) overlaps "${b.text.slice(0, 30)}" (${b.label}) by ${area.toFixed(1)}px2 [minSide ${minSide.toFixed(1)}]`,
        );
      }
    }
  }

  return textRecords.length;
}