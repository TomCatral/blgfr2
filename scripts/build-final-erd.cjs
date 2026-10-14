const fs = require('node:fs');
const path = require('node:path');

const out = path.resolve('output/diagrams/final-physical-erd.svg');
const entities = [
  { x: 60, y: 155, w: 410, h: 245, color: '#2563EB', name: 'divisions', rows: ['PK  id : VARCHAR(64)', 'UQ  code : VARCHAR(20)', 'name : VARCHAR(255)', 'chief_name : VARCHAR(255)', 'email : VARCHAR(150) NULL'] },
  { x: 695, y: 110, w: 410, h: 330, color: '#0F766E', name: 'users', rows: ['PK  id : VARCHAR(64)', 'UQ  username : VARCHAR(50)', 'division_code : VARCHAR(20)', 'full_name : VARCHAR(150)', 'email : VARCHAR(150)', 'role : VARCHAR(50)', 'permissions : JSON NULL', 'active : BOOLEAN'] },
  { x: 1330, y: 155, w: 410, h: 245, color: '#0891B2', name: 'employee_profiles', rows: ['PK  id : VARCHAR(64)', 'FK/UQ  user_id : VARCHAR(64) NULL', 'full_name : VARCHAR(255)', 'office / office_type', 'division_code : VARCHAR(20) NULL'] },
  { x: 60, y: 545, w: 410, h: 265, color: '#7C3AED', name: 'document_routes', rows: ['PK  id : VARCHAR(64)', 'FK  document_id : VARCHAR(64)', 'FK  from_user_id : VARCHAR(64) NULL', 'FK  to_user_id : VARCHAR(64) NULL', 'step_number : INT', 'from/to_division : VARCHAR(20)', 'status_before / status_after'] },
  { x: 575, y: 505, w: 650, h: 355, color: '#15803D', name: 'documents', rows: ['PK  id : VARCHAR(64)', 'UQ  tracking_number : VARCHAR(100)', 'FK  assigned_user_id : VARCHAR(64) NULL', 'FK  created_by_user_id : VARCHAR(64) NULL', 'direction / category / priority', 'title / subject', 'originating_office / destination_office', 'current_status / current_division', 'date_received / target / completed dates'] },
  { x: 1330, y: 545, w: 410, h: 265, color: '#C2410C', name: 'document_attachments', rows: ['PK  id : VARCHAR(64)', 'FK  document_id : VARCHAR(64)', 'file_name : VARCHAR(255)', 'file_type / file_size', 'file_data : LONGTEXT NULL', 'uploaded_by_user_id : VARCHAR(64) NULL', 'uploaded_for_route_id : VARCHAR(64) NULL'] },
  { x: 60, y: 955, w: 410, h: 225, color: '#475569', name: 'audit_logs', rows: ['PK  id : VARCHAR(64)', 'user_id : VARCHAR(64)', 'document_tracking_number : VARCHAR(100)', 'action : VARCHAR(100)', 'timestamp : DATETIME(3)'] },
  { x: 695, y: 955, w: 410, h: 225, color: '#DB2777', name: 'envelope_logs', rows: ['PK  id : VARCHAR(64)', 'user_id : VARCHAR(64)', 'document_tracking_number : VARCHAR(100)', 'action : VARCHAR(100)', 'timestamp : DATETIME(3)'] },
  { x: 1330, y: 955, w: 410, h: 205, color: '#0369A1', name: 'directory_sections', rows: ['PK  id : VARCHAR(64)', 'label : VARCHAR(255)', 'office_types : JSON', 'color : VARCHAR(50) NULL'] },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const card = (e) => {
  const rows = e.rows.map((row, i) => `<text x="${e.x + 22}" y="${e.y + 90 + i * 28}" class="row">${esc(row)}</text>`).join('');
  return `<g filter="url(#shadow)"><rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="16" class="card"/><path d="M${e.x + 16},${e.y} H${e.x + e.w - 16} Q${e.x + e.w},${e.y} ${e.x + e.w},${e.y + 16} V${e.y + 58} H${e.x} V${e.y + 16} Q${e.x},${e.y} ${e.x + 16},${e.y}" fill="${e.color}"/><text x="${e.x + 22}" y="${e.y + 39}" class="name">${e.name}</text>${rows}</g>`;
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1320" viewBox="0 0 1800 1320">
<defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#0F172A" flood-opacity=".12"/></filter><marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#334155"/></marker></defs>
<style>.title{font:700 38px Arial;fill:#0F2942}.subtitle{font:18px Arial;fill:#64748B}.group{font:700 17px Arial;letter-spacing:1.5px;fill:#475569}.card{fill:#FFF;stroke:#CBD5E1;stroke-width:2}.name{font:700 24px Arial;fill:#FFF}.row{font:18px Consolas,monospace;fill:#1E293B}.rel{fill:none;stroke:#334155;stroke-width:4;marker-end:url(#arrow)}.logical{fill:none;stroke:#EA580C;stroke-width:3;stroke-dasharray:10 8;marker-end:url(#arrow)}.label{font:700 16px Arial;fill:#334155}.note{font:16px Arial;fill:#475569}</style>
<rect width="1800" height="1320" fill="#F8FAFC"/><rect width="1800" height="12" fill="#0F2942"/>
<text x="900" y="65" text-anchor="middle" class="title">PHYSICAL ENTITY–RELATIONSHIP DIAGRAM</text><text x="900" y="98" text-anchor="middle" class="subtitle">Implemented WDTMP database • MySQL / Prisma schema • key fields and enforced relationships</text>
<text x="60" y="138" class="group">ORGANIZATION AND ACCESS</text><text x="60" y="520" class="group">DOCUMENT WORKFLOW</text><text x="60" y="930" class="group">SUPPORTING DATA</text>
<path d="M470 260 H580 Q610 260 610 290 V300 H695" class="logical"/><text x="510" y="246" class="label">1 : 0..N</text>
<path d="M1105 270 H1330" class="rel"/><text x="1160" y="253" class="label">1 : 0..1</text>
<path d="M805 440 V475 Q805 495 825 505" class="rel"/><text x="818" y="480" class="label">1 : 0..N</text>
<path d="M995 440 V475 Q995 495 975 505" class="rel"/><text x="1008" y="480" class="label">1 : 0..N</text>
<path d="M575 650 H470" class="rel"/><text x="490" y="633" class="label">1 : 0..N</text>
<path d="M1225 650 H1330" class="rel"/><text x="1243" y="633" class="label">1 : 0..N</text>
<path d="M695 365 C560 420 400 470 300 545" class="rel"/><text x="455" y="444" class="label">1 : 0..N</text>
<path d="M1105 365 C1240 420 1400 470 1490 545" class="logical"/><text x="1260" y="444" class="label">logical uploader / route ref.</text>
<path d="M760 860 C650 910 490 960 470 1045" class="logical"/><text x="520" y="931" class="label">tracking no. / user id</text>
<path d="M1040 860 C1110 910 1050 930 1010 955" class="logical"/><text x="1070" y="920" class="label">tracking no. / user id</text>
${entities.map(card).join('')}
<g transform="translate(60 1245)"><path d="M0 0 H90" class="rel"/><text x="110" y="6" class="note">Database-enforced relation</text><path d="M430 0 H520" class="logical"/><text x="540" y="6" class="note">Application-level reference</text><text x="1020" y="6" class="note">PK Primary Key • FK Foreign Key • UQ Unique Key</text></g>
</svg>`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, svg);
console.log(out);
