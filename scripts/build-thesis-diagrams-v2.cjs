const fs = require('node:fs');
const path = require('node:path');
const outDir = path.resolve('output/diagrams');
fs.mkdirSync(outDir, { recursive: true });

const useCase = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1250" viewBox="0 0 1800 1250">
<defs><filter id="s"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#0F172A" flood-opacity=".10"/></filter></defs>
<style>.title{font:700 38px Arial;fill:#173A5E}.sub{font:18px Arial;fill:#64748B}.boundary{fill:#F8FAFC;stroke:#173A5E;stroke-width:4}.group{fill:#FFF;stroke:#CBD5E1;stroke-width:2}.gh{font:700 20px Arial;fill:#173A5E}.uc{fill:#FFF;stroke:#2563EB;stroke-width:2}.admin{stroke:#7C3AED}.origin{stroke:#0F766E}.recipient{stroke:#C2410C}.txt{font:18px Arial;fill:#172033}.actor{font:700 20px Arial;fill:#172033}.line{fill:none;stroke:#64748B;stroke-width:3}.hint{font:16px Arial;fill:#64748B}</style>
<rect width="1800" height="1250" fill="#FFF"/><rect width="1800" height="12" fill="#173A5E"/>
<text x="900" y="62" text-anchor="middle" class="title">USE-CASE DIAGRAM OF THE IMPLEMENTED WDTMP</text><text x="900" y="96" text-anchor="middle" class="sub">Role-based document registration, routing, action, monitoring, and administration</text>
<rect x="285" y="130" width="1230" height="1010" rx="24" class="boundary"/><text x="315" y="166" class="gh">WDTMP SYSTEM BOUNDARY</text>
<!-- actors -->
<g transform="translate(105 270)" stroke="#173A5E" stroke-width="5" fill="none"><circle cx="70" cy="35" r="28"/><path d="M70 63V145M20 92H120M70 145L25 210M70 145L115 210"/></g><text x="175" y="505" text-anchor="middle" class="actor">Records / Originating User</text>
<g transform="translate(1555 270)" stroke="#173A5E" stroke-width="5" fill="none"><circle cx="70" cy="35" r="28"/><path d="M70 63V145M20 92H120M70 145L25 210M70 145L115 210"/></g><text x="1625" y="505" text-anchor="middle" class="actor">Recipient / Authorized User</text>
<g transform="translate(105 810)" stroke="#173A5E" stroke-width="5" fill="none"><circle cx="70" cy="35" r="28"/><path d="M70 63V145M20 92H120M70 145L25 210M70 145L115 210"/></g><text x="175" y="1045" text-anchor="middle" class="actor">System Administrator</text>
<!-- shared -->
<g filter="url(#s)"><rect x="540" y="190" width="720" height="190" rx="18" class="group"/><text x="900" y="226" text-anchor="middle" class="gh">SHARED ACCESS</text>
<ellipse cx="720" cy="290" rx="145" ry="42" class="uc"/><text x="720" y="297" text-anchor="middle" class="txt">Sign in &amp; manage account</text><ellipse cx="1075" cy="290" rx="165" ry="42" class="uc"/><text x="1075" y="297" text-anchor="middle" class="txt">Dashboard, search &amp; alerts</text></g>
<!-- originator -->
<g filter="url(#s)"><rect x="345" y="430" width="520" height="420" rx="18" class="group"/><text x="605" y="468" text-anchor="middle" class="gh">ORIGINATING / RECORDS FUNCTIONS</text>
<ellipse cx="605" cy="535" rx="205" ry="42" class="uc origin"/><text x="605" y="542" text-anchor="middle" class="txt">Register incoming / outgoing document</text>
<ellipse cx="605" cy="640" rx="205" ry="42" class="uc origin"/><text x="605" y="647" text-anchor="middle" class="txt">Start, add, or continue a route</text>
<ellipse cx="605" cy="745" rx="205" ry="42" class="uc origin"/><text x="605" y="752" text-anchor="middle" class="txt">Track flow, files, and status</text></g>
<!-- recipient -->
<g filter="url(#s)"><rect x="935" y="430" width="520" height="420" rx="18" class="group"/><text x="1195" y="468" text-anchor="middle" class="gh">RECIPIENT / PARTICIPANT FUNCTIONS</text>
<ellipse cx="1195" cy="535" rx="205" ry="42" class="uc recipient"/><text x="1195" y="542" text-anchor="middle" class="txt">Receive and review assigned step</text>
<ellipse cx="1195" cy="640" rx="205" ry="42" class="uc recipient"/><text x="1195" y="647" text-anchor="middle" class="txt">Approve / disapprove / reply / forward</text>
<ellipse cx="1195" cy="745" rx="205" ry="42" class="uc recipient"/><text x="1195" y="752" text-anchor="middle" class="txt">Attach files, complete, give instruction</text></g>
<!-- admin and output -->
<g filter="url(#s)"><rect x="345" y="900" width="1110" height="185" rx="18" class="group"/><text x="900" y="938" text-anchor="middle" class="gh">AUTHORIZED MONITORING, OUTPUT, AND ADMINISTRATION</text>
<ellipse cx="545" cy="1008" rx="165" ry="42" class="uc admin"/><text x="545" y="1000" text-anchor="middle" class="txt">Monitor &amp; remind</text><text x="545" y="1023" text-anchor="middle" class="hint">unfinished branches only</text>
<ellipse cx="900" cy="1008" rx="170" ry="42" class="uc admin"/><text x="900" y="1000" text-anchor="middle" class="txt">QR, slips, envelopes</text><text x="900" y="1023" text-anchor="middle" class="hint">reports &amp; print outputs</text>
<ellipse cx="1255" cy="1008" rx="170" ry="42" class="uc admin"/><text x="1255" y="1000" text-anchor="middle" class="txt">Accounts &amp; configuration</text><text x="1255" y="1023" text-anchor="middle" class="hint">divisions, permissions, logs</text></g>
<!-- concise role associations -->
<path d="M230 360H430Q470 360 540 285" class="line"/><path d="M230 390H300Q325 390 345 535" class="line"/><path d="M1570 360H1360Q1310 360 1260 285" class="line"/><path d="M1570 390H1500Q1475 390 1455 535" class="line"/><path d="M230 920H345" class="line"/>
<text x="900" y="1192" text-anchor="middle" class="hint">The administrator monitors and configures the system but does not perform operational routing, approval, or completion.</text></svg>`;

const erd = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1250" viewBox="0 0 1800 1250">
<defs><filter id="s"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#0F172A" flood-opacity=".10"/></filter><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0L0 6L9 3z" fill="#35516D"/></marker></defs>
<style>.title{font:700 38px Arial;fill:#173A5E}.sub{font:18px Arial;fill:#64748B}.card{fill:#FFF;stroke:#AFC1D3;stroke-width:2}.head{fill:#173A5E}.core{fill:#0F766E}.name{font:700 22px Arial;fill:#FFF}.row{font:17px Consolas,monospace;fill:#1E293B}.rel{fill:none;stroke:#35516D;stroke-width:3;marker-end:url(#a)}.logical{fill:none;stroke:#C45A17;stroke-width:3;stroke-dasharray:9 7}.lbl{font:700 15px Arial;fill:#35516D}.section{font:700 17px Arial;letter-spacing:1.5px;fill:#64748B}.note{font:16px Arial;fill:#52677B}</style>
<rect width="1800" height="1250" fill="#FFF"/><rect width="1800" height="12" fill="#173A5E"/><text x="900" y="60" text-anchor="middle" class="title">DETAILED PHYSICAL ENTITY–RELATIONSHIP DIAGRAM</text><text x="900" y="94" text-anchor="middle" class="sub">Implemented MySQL / Prisma data model — principal fields, constraints, and relationships</text>
<!-- relationships behind cards -->
<path d="M460 285H665" class="logical"/><text x="525" y="268" class="lbl">1 : 0..N</text><path d="M1135 285H1340" class="rel"/><text x="1200" y="268" class="lbl">1 : 0..1</text>
<path d="M780 420V505" class="rel"/><text x="792" y="470" class="lbl">creator 1 : N</text><path d="M1010 420V505" class="rel"/><text x="1022" y="470" class="lbl">assignee 1 : N</text>
<path d="M650 690H460" class="rel"/><text x="505" y="674" class="lbl">1 : 0..N</text><path d="M1150 690H1340" class="rel"/><text x="1195" y="674" class="lbl">1 : 0..N</text>
<path d="M250 865V940" class="logical"/><path d="M900 865V940" class="logical"/><text x="920" y="915" class="lbl">historical route/user reference</text>
<text x="55" y="140" class="section">ORGANIZATION AND ACCESS</text><text x="55" y="490" class="section">CORE DOCUMENT WORKFLOW</text><text x="55" y="925" class="section">SUPPORT AND REFERENCE DATA</text>
${(() => { const cards=[
{x:55,y:165,w:405,h:255,n:'divisions',rows:['PK  id : VARCHAR(64)','UQ  code : VARCHAR(20)','name : VARCHAR(255)','chief_name : VARCHAR(255)','email : VARCHAR(150) NULL']},
{x:665,y:135,w:470,h:285,n:'users',rows:['PK  id : VARCHAR(64)','UQ  username : VARCHAR(50)','division_code : VARCHAR(20)','full_name / email / role','permissions : JSON NULL','active : BOOLEAN']},
{x:1340,y:165,w:405,h:255,n:'employee_profiles',rows:['PK  id : VARCHAR(64)','FK/UQ  user_id : VARCHAR(64) NULL','full_name / position','office / office_type','division_code : VARCHAR(20) NULL']},
{x:55,y:545,w:405,h:320,n:'document_routes',rows:['PK  id : VARCHAR(64)','FK  document_id : VARCHAR(64)','FK  from_user_id : VARCHAR(64) NULL','FK  to_user_id : VARCHAR(64) NULL','step_number : INT','from/to division and user','action / remarks','status_before / status_after']},
{x:650,y:505,w:500,h:360,n:'documents',core:true,rows:['PK  id : VARCHAR(64)','UQ  tracking_number : VARCHAR(100)','FK  assigned_user_id : VARCHAR(64) NULL','FK  created_by_user_id : VARCHAR(64) NULL','direction / title / category','origin / destination office','priority / current status','received / target / completed dates']},
{x:1340,y:545,w:405,h:320,n:'document_attachments',rows:['PK  id : VARCHAR(64)','FK  document_id : VARCHAR(64)','file_name : VARCHAR(255)','file_type / file_size','file_data : LONGTEXT NULL','attachment_scope','uploader / route reference']},
{x:55,y:960,w:405,h:215,n:'audit_logs',rows:['PK  id : VARCHAR(64)','user_id : VARCHAR(64)','document_tracking_number','action / details','timestamp / ip_address']},
{x:650,y:960,w:500,h:215,n:'envelope_logs',rows:['PK  id : VARCHAR(64)','user_id : VARCHAR(64)','document_tracking_number','action / details','timestamp / ip_address']},
{x:1340,y:960,w:405,h:195,n:'directory_sections',rows:['PK  id : VARCHAR(64)','label : VARCHAR(255)','office_types : JSON','color : VARCHAR(50) NULL']}
];return cards.map(c=>`<g filter="url(#s)"><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="13" class="card"/><path d="M${c.x+13} ${c.y}H${c.x+c.w-13}Q${c.x+c.w} ${c.y} ${c.x+c.w} ${c.y+13}V${c.y+54}H${c.x}V${c.y+13}Q${c.x} ${c.y} ${c.x+13} ${c.y}" class="${c.core?'core':'head'}"/><text x="${c.x+20}" y="${c.y+36}" class="name">${c.n}</text>${c.rows.map((r,i)=>`<text x="${c.x+20}" y="${c.y+88+i*27}" class="row">${r}</text>`).join('')}</g>`).join('')})()}
<g transform="translate(55 1215)"><path d="M0 0H85" class="rel"/><text x="105" y="6" class="note">Enforced foreign-key relationship</text><path d="M435 0H520" class="logical"/><text x="540" y="6" class="note">Application-level logical reference</text><text x="1040" y="6" class="note">PK Primary Key • FK Foreign Key • UQ Unique Key</text></g></svg>`;

fs.writeFileSync(path.join(outDir, 'final-use-case-v2.svg'), useCase);
fs.writeFileSync(path.join(outDir, 'final-physical-erd-v2.svg'), erd);
console.log('Generated final-use-case-v2.svg and final-physical-erd-v2.svg');
