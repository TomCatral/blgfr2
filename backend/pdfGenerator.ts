export interface DocumentPdfDetails {
  trackingNumber?: string;
  category?: string;
  date?: string;
  sender?: string;
  recipient?: string;
  remarks?: string;
  status?: string;
}

function escapePdf(text: string): string {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function generateOfficialPdfBuffer(
  title: string,
  details: DocumentPdfDetails = {},
): Buffer {
  const cleanTitle = escapePdf(title || 'BLGF Official Document');
  const docNo = escapePdf(details.trackingNumber || 'BLGF2-OFFICIAL-RECORD');
  const cat = escapePdf(details.category || 'Official Document / Attachment');
  const dateStr = escapePdf(
    details.date ||
      new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
  );
  const sender = escapePdf(
    details.sender || 'Bureau of Local Government Finance - Regional Office No. II',
  );
  const recipient = escapePdf(
    details.recipient || 'All Concerned Offices and Division Units',
  );
  const remarks = escapePdf(
    details.remarks || 'Standard document logging and routing compliance.',
  );
  const status = escapePdf(details.status || 'VERIFIED & REGISTERED');

  const stream = `
0.05 0.23 0.40 rg
50 715 512 45 re f

1 1 1 rg
BT
/F1 13 Tf
60 742 Td
(BUREAU OF LOCAL GOVERNMENT FINANCE - REGION II) Tj
ET
BT
/F2 8 Tf
60 727 Td
(Department of Finance | Regional Government Center, Carig Sur, Tuguegarao City, Cagayan) Tj
ET

0.85 0.65 0.13 rg
50 712 512 3 re f

0.05 0.23 0.40 rg
BT
/F1 13 Tf
50 680 Td
(${cleanTitle}) Tj
ET

0.80 0.82 0.85 rg
50 668 512 1 re f

0.15 0.18 0.22 rg
BT
/F1 10 Tf
50 645 Td
(DOCUMENT SPECIFICATIONS & TRACKING DETAILS) Tj
ET

BT
/F1 9 Tf
50 622 Td
(Tracking Number: ) Tj
/F2 9 Tf
( ${docNo} ) Tj
ET

BT
/F1 9 Tf
50 604 Td
(Classification: ) Tj
/F2 9 Tf
( ${cat} ) Tj
ET

BT
/F1 9 Tf
50 586 Td
(Date Logged: ) Tj
/F2 9 Tf
( ${dateStr} ) Tj
ET

BT
/F1 9 Tf
50 568 Td
(Originating Office: ) Tj
/F2 9 Tf
( ${sender} ) Tj
ET

BT
/F1 9 Tf
50 550 Td
(Intended Recipient: ) Tj
/F2 9 Tf
( ${recipient} ) Tj
ET

BT
/F1 9 Tf
50 532 Td
(Action / Remarks: ) Tj
/F2 9 Tf
( ${remarks} ) Tj
ET

0.94 0.96 0.99 rg
50 365 512 145 re f
0.15 0.35 0.60 RG
1 w
50 365 512 145 re S

0.05 0.23 0.40 rg
BT
/F1 11 Tf
65 482 Td
(OFFICIAL ATTACHMENT VERIFICATION NOTICE) Tj
ET

0.20 0.20 0.20 rg
BT
/F2 9 Tf
65 458 Td
(This digital file serves as an authenticated system attachment under the BLGF Region II) Tj
ET
BT
/F2 9 Tf
65 442 Td
(Document Tracking System, preserving the integrity of all routed communications.) Tj
ET
BT
/F2 9 Tf
65 422 Td
(Governing Policy: Republic Act No. 12001 - Real Property Valuation and Assessment Reform Act) Tj
ET
BT
/F2 9 Tf
65 406 Td
(Administrative Circulars and Regional Guidelines for Local Treasury and Assessment Services.) Tj
ET
BT
/F1 9 Tf
65 384 Td
(Authentication Status: ) Tj
/F2 9 Tf
( ${status} ) Tj
ET

0.80 0.80 0.80 rg
50 95 512 1 re f
0.45 0.45 0.45 rg
BT
/F2 8 Tf
50 80 Td
(Confidential & Official Document - Bureau of Local Government Finance Region II) Tj
ET
BT
/F2 8 Tf
465 80 Td
(Page 1 of 1) Tj
ET
`;

  const streamBuf = Buffer.from(stream.trim(), 'utf8');
  const streamLen = streamBuf.length;

  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n';
  const obj4 =
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';
  const obj5 =
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj6Head = `6 0 obj\n<< /Length ${streamLen} >>\nstream\n`;
  const obj6Tail = '\nendstream\nendobj\n';

  const parts = [
    Buffer.from(header, 'ascii'),
    Buffer.from(obj1, 'ascii'),
    Buffer.from(obj2, 'ascii'),
    Buffer.from(obj3, 'ascii'),
    Buffer.from(obj4, 'ascii'),
    Buffer.from(obj5, 'ascii'),
    Buffer.from(obj6Head, 'ascii'),
    streamBuf,
    Buffer.from(obj6Tail, 'ascii'),
  ];

  let offset = header.length;
  const offsets: number[] = [];
  offsets.push(offset);
  offset += obj1.length;
  offsets.push(offset);
  offset += obj2.length;
  offsets.push(offset);
  offset += obj3.length;
  offsets.push(offset);
  offset += obj4.length;
  offsets.push(offset);
  offset += obj5.length;
  offsets.push(offset);

  const preStreamLen =
    header.length +
    obj1.length +
    obj2.length +
    obj3.length +
    obj4.length +
    obj5.length +
    obj6Head.length +
    streamLen +
    obj6Tail.length;

  let xref = `xref\n0 7\n0000000000 65535 f \r\n`;
  for (let i = 0; i < 6; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \r\n';
  }
  xref += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${preStreamLen}\n%%EOF\n`;

  parts.push(Buffer.from(xref, 'ascii'));
  return Buffer.concat(parts);
}
