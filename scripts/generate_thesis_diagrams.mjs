import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = path.resolve("output", "diagrams");
fs.mkdirSync(out, { recursive: true });

const W = 1400;
const H = 820;
const PW = 1100;
const PH = 1400;
const navy = "#17365D";
const blue = "#1F4E78";
const pale = "#EAF2F8";
const gold = "#F4B183";
const green = "#E2F0D9";
const gray = "#F2F2F2";

const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const text = (x, y, value, size = 25, anchor = "middle", weight = "400") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="#17202A">${esc(value)}</text>`;
const multiline = (x, y, lines, size = 23, gap = 31, weight = "400") =>
  lines
    .map((line, i) => text(x, y + i * gap, line, size, "middle", weight))
    .join("");
const leftLines = (x, y, lines, size = 20, gap = 28, weight = "400") =>
  lines
    .map((item, i) =>
      text(x, y + i * gap, `${item.bullet ? "•  " : ""}${item.text}`, size, "start", item.bold ? "700" : weight),
    )
    .join("");
const detailPanel = (x, y, w, h, title, items, fill = "#FFFFFF") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${blue}" stroke-width="4"/>` +
  `<rect x="${x}" y="${y}" width="${w}" height="70" rx="12" fill="${blue}"/><rect x="${x}" y="${y + 58}" width="${w}" height="14" fill="${blue}"/>` +
  text(x + w / 2, y + 47, title, 27, "middle", "700").replace('fill="#17202A"', 'fill="#FFFFFF"') +
  leftLines(x + 24, y + 112, items, 19, 27);
const portraitPanel = (x, y, w, h, title, items, fill = "#FFFFFF", fontSize = 24) => {
  const midpoint = Math.ceil(items.length / 2);
  const columns = [items.slice(0, midpoint), items.slice(midpoint)];
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${fill}" stroke="${blue}" stroke-width="5"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="76" rx="16" fill="${blue}"/><rect x="${x}" y="${y + 62}" width="${w}" height="16" fill="${blue}"/>` +
    text(x + w / 2, y + 51, title, 30, "middle", "700").replace('fill="#17202A"', 'fill="#FFFFFF"') +
    leftLines(x + 30, y + 125, columns[0], fontSize, fontSize + 13) +
    leftLines(x + w / 2 + 12, y + 125, columns[1], fontSize, fontSize + 13)
  );
};
const portraitSinglePanel = (x, y, w, h, title, items, fill = "#FFFFFF", fontSize = 22) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${fill}" stroke="${blue}" stroke-width="5"/>` +
  `<rect x="${x}" y="${y}" width="${w}" height="76" rx="16" fill="${blue}"/><rect x="${x}" y="${y + 62}" width="${w}" height="16" fill="${blue}"/>` +
  text(x + w / 2, y + 51, title, 29, "middle", "700").replace('fill="#17202A"', 'fill="#FFFFFF"') +
  leftLines(x + 28, y + 125, items, fontSize, fontSize + 17);
const hipoModule = (x, y, code, lines, fill = pale) =>
  `<rect x="${x}" y="${y}" width="430" height="105" rx="14" fill="${fill}" stroke="${blue}" stroke-width="4"/>` +
  text(x + 52, y + 62, code, 23, "middle", "700") +
  multiline(x + 255, y + 44, lines, 21, 27, "600");
const hipoCell = (x, y, w, h, lines, fill = "#FFFFFF", header = false) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${blue}" stroke-width="2"/>` +
  multiline(
    x + w / 2,
    y + h / 2 - ((lines.length - 1) * (header ? 13 : 11)) + 7,
    lines,
    header ? 22 : 17,
    header ? 27 : 22,
    header ? "700" : "400",
  );
const entityBox = (x, y, w, h, title, fields, fill = "#FFFFFF") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${blue}" stroke-width="4"/>` +
  `<rect x="${x}" y="${y}" width="${w}" height="54" rx="12" fill="${blue}"/><rect x="${x}" y="${y + 42}" width="${w}" height="14" fill="${blue}"/>` +
  text(x + w / 2, y + 37, title, 22, "middle", "700").replace('fill="#17202A"', 'fill="#FFFFFF"') +
  fields.map((field, i) => text(x + 18, y + 86 + i * 25, field, 16, "start", field.startsWith("PK") ? "700" : "400")).join("");
const relation = (x1, y1, x2, y2, leftCard = "1", rightCard = "M", dashed = false) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${navy}" stroke-width="3" ${dashed ? 'stroke-dasharray="9 7"' : ""}/>` +
  text(x1 + (x2 >= x1 ? 12 : -12), y1 - 8, leftCard, 17, x2 >= x1 ? "start" : "end", "700") +
  text(x2 + (x2 >= x1 ? -12 : 12), y2 - 8, rightCard, 17, x2 >= x1 ? "end" : "start", "700");
const rect = (x, y, w, h, label, fill = pale, lines) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${fill}" stroke="${blue}" stroke-width="4"/>${multiline(
    x + w / 2,
    y + h / 2 - ((lines?.length || 1) - 1) * 15 + 8,
    lines || [label],
    23,
    31,
    "600",
  )}`;
const ellipse = (cx, cy, rx, ry, lines) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${pale}" stroke="${blue}" stroke-width="4"/>${multiline(
    cx,
    cy - ((lines.length - 1) * 15) + 8,
    lines,
    21,
    29,
    "600",
  )}`;
const arrow = (x1, y1, x2, y2, label = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${navy}" stroke-width="4" marker-end="url(#arrow)"/>${
    label ? text((x1 + x2) / 2, (y1 + y2) / 2 - 10, label, 18) : ""
  }`;
const line = (x1, y1, x2, y2) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${navy}" stroke-width="3"/>`;
const defs = `<defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto"><path d="M0,0 L0,8 L11,4 z" fill="${navy}"/></marker></defs>`;
const wrap = (title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="white"/>${defs}${text(
    W / 2,
    48,
    title,
    30,
    "middle",
    "700",
  )}${body}</svg>`;
const wrapPortrait = (title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}"><rect width="100%" height="100%" fill="white"/>${defs}${text(
    PW / 2,
    55,
    title,
    36,
    "middle",
    "700",
  )}${body}</svg>`;

const diagrams = {
  "conceptual-framework": wrapPortrait(
    "Conceptual Framework",
    portraitPanel(50, 95, 1000, 335, "INPUT", [
      { bullet: true, text: "BLGF workflow and office rules" },
      { bullet: true, text: "Incoming/outgoing document data" },
      { bullet: true, text: "User roles and division assignments" },
      { bullet: true, text: "Observed tracking and retrieval gaps" },
      { bullet: true, text: "Security and access requirements" },
      { bullet: true, text: "Routing and notification needs" },
      { bullet: true, text: "Attachment and storage needs" },
      { bullet: true, text: "QR, slip, log, and export needs" },
      { bullet: true, text: "React, Express, TypeScript, MySQL" },
      { bullet: true, text: "ISO/IEC 25010 quality criteria" },
    ], gray, 24) +
      arrow(550, 430, 550, 485) +
      portraitPanel(50, 485, 1000, 400, "PROCESS", [
        { bold: true, text: "Iterative and Incremental Development" },
        { bullet: true, text: "Analyze requirements by module" },
        { bullet: true, text: "Design workflow, UI, API, and data" },
        { bullet: true, text: "Implement frontend and backend" },
        { bullet: true, text: "Test each functional increment" },
        { bullet: true, text: "Integrate, review, and refine" },
        { bold: true, text: "Evaluation Activities" },
        { bullet: true, text: "Functional and access testing" },
        { bullet: true, text: "Task-based pilot testing" },
        { bullet: true, text: "ISO/IEC 25010 questionnaire" },
        { bullet: true, text: "Frequency and weighted mean" },
        { bullet: true, text: "User comments and issue analysis" },
    ], pale, 23) +
      arrow(550, 885, 550, 940) +
      portraitPanel(50, 940, 1000, 380, "OUTPUT", [
        { bullet: true, text: "Operational BLGF tracking system" },
        { bullet: true, text: "Centralized document records" },
        { bullet: true, text: "Traceable routing and status history" },
        { bullet: true, text: "Role-based document access" },
        { bullet: true, text: "Notifications and attachments" },
        { bullet: true, text: "QR codes and routing slips" },
        { bullet: true, text: "Employee records and files" },
        { bullet: true, text: "Audit and envelope logs" },
        { bullet: true, text: "Storage settings and data export" },
        { bullet: true, text: "ISO/IEC 25010 evaluation findings" },
        { bullet: true, text: "User manual and recommendations" },
    ], green, 23),
  ),
  "research-paradigm": wrapPortrait(
    "Research Paradigm",
    portraitSinglePanel(45, 95, 485, 510, "RESEARCH INPUTS", [
      { bullet: true, text: "BLGF workflow and rules" },
      { bullet: true, text: "Document metadata and files" },
      { bullet: true, text: "User roles and divisions" },
      { bullet: true, text: "Tracking and retrieval gaps" },
      { bullet: true, text: "Functional requirements" },
      { bullet: true, text: "Security and storage needs" },
      { bullet: true, text: "Selected technology stack" },
      { bullet: true, text: "ISO/IEC 25010 criteria" },
    ], gray, 22) +
      arrow(530, 350, 570, 350) +
      portraitSinglePanel(570, 95, 485, 510, "DEVELOPMENT", [
      { bold: true, text: "Iterative and Incremental Model" },
      { bullet: true, text: "Plan module requirements" },
      { bullet: true, text: "Design workflow and interface" },
      { bullet: true, text: "Design API and database" },
      { bullet: true, text: "Code frontend and backend" },
      { bullet: true, text: "Test functional increments" },
      { bullet: true, text: "Integrate and review modules" },
      { bullet: true, text: "Refine and deploy system" },
    ], pale, 22) +
      arrow(815, 605, 815, 660) +
      portraitSinglePanel(570, 660, 485, 510, "EVALUATION", [
      { bullet: true, text: "Use-case verification" },
      { bullet: true, text: "Validation-rule testing" },
      { bullet: true, text: "Role and access testing" },
      { bullet: true, text: "File and history testing" },
      { bullet: true, text: "Task-based pilot testing" },
      { bullet: true, text: "ISO/IEC 25010 survey" },
      { bullet: true, text: "Weighted mean analysis" },
      { bullet: true, text: "User feedback analysis" },
    ], "#FFF2CC", 22) +
      arrow(570, 915, 530, 915) +
      portraitSinglePanel(45, 660, 485, 510, "OUTCOMES", [
      { bullet: true, text: "Verified operational system" },
      { bullet: true, text: "Centralized records" },
      { bullet: true, text: "Searchable route history" },
      { bullet: true, text: "Controlled user access" },
      { bullet: true, text: "Quality evaluation ratings" },
      { bullet: true, text: "Documented user feedback" },
      { bullet: true, text: "User manual" },
      { bullet: true, text: "Improvement recommendations" },
    ], green, 22) +
      `<path d="M285 1170 C285 1280 815 1280 815 1170" fill="none" stroke="${navy}" stroke-width="4" marker-end="url(#arrow)"/>` +
      text(550, 1330, "Evaluation feedback guides the next system increment", 24),
  ),
  "system-architecture": wrap(
    "Three-Tier System Architecture",
    rect(380, 85, 640, 120, "", gray, ["AUTHORIZED USERS", "Desktop / Laptop / Mobile Browser"]) +
      arrow(700, 205, 700, 270, "HTTPS / JSON") +
      rect(300, 270, 800, 150, "", pale, ["PRESENTATION LAYER", "React 19 • TypeScript • Vite"]) +
      arrow(700, 420, 700, 485, "REST-style API") +
      rect(300, 485, 800, 145, "", gold, ["APPLICATION LAYER", "Express 4 • TypeScript • Validation • Workflow • RBAC"]) +
      arrow(520, 630, 350, 700) +
      arrow(700, 630, 700, 700) +
      arrow(880, 630, 1050, 700) +
      rect(80, 700, 420, 90, "", green, ["MySQL Database"]) +
      rect(510, 700, 380, 90, "", green, ["Configured File Storage"]) +
      rect(900, 700, 420, 90, "", green, ["JSON Fallback"]),
  ),
  "use-case": wrap(
    "Use-Case Diagram",
    // Actors and a clear two-column responsibility layout.
    `<circle cx="105" cy="310" r="28" fill="white" stroke="${navy}" stroke-width="4"/><line x1="105" y1="338" x2="105" y2="430" stroke="${navy}" stroke-width="4"/><line x1="60" y1="370" x2="150" y2="370" stroke="${navy}" stroke-width="4"/><line x1="105" y1="430" x2="67" y2="485" stroke="${navy}" stroke-width="4"/><line x1="105" y1="430" x2="143" y2="485" stroke="${navy}" stroke-width="4"/>${text(105, 525, "Administrator", 21)}` +
      `<circle cx="1295" cy="310" r="28" fill="white" stroke="${navy}" stroke-width="4"/><line x1="1295" y1="338" x2="1295" y2="430" stroke="${navy}" stroke-width="4"/><line x1="1250" y1="370" x2="1340" y2="370" stroke="${navy}" stroke-width="4"/><line x1="1295" y1="430" x2="1257" y2="485" stroke="${navy}" stroke-width="4"/><line x1="1295" y1="430" x2="1333" y2="485" stroke="${navy}" stroke-width="4"/>${text(1295, 525, "Authorized Personnel", 20)}` +
      `<rect x="245" y="75" width="910" height="680" rx="24" fill="none" stroke="${navy}" stroke-width="3" stroke-dasharray="10 8"/>` +
      ellipse(700, 140, 175, 48, ["Authenticate"]) +
      `<rect x="280" y="220" width="360" height="470" rx="22" fill="${gray}" stroke="${blue}" stroke-width="3"/>` +
      text(460, 260, "ADMINISTRATIVE FUNCTIONS", 20, "middle", "700") +
      ellipse(460, 350, 145, 52, ["Manage Users", "and Roles"]) +
      ellipse(460, 500, 145, 52, ["Review Audit and", "Envelope Logs"]) +
      ellipse(460, 630, 145, 46, ["Configure Storage", "and Export"]) +
      `<rect x="760" y="220" width="360" height="470" rx="22" fill="${pale}" stroke="${blue}" stroke-width="3"/>` +
      text(940, 260, "DOCUMENT WORKFLOW", 20, "middle", "700") +
      ellipse(940, 325, 150, 48, ["Register Document"]) +
      ellipse(940, 435, 150, 52, ["Route / Transfer /", "Receive / Complete"]) +
      ellipse(940, 550, 150, 52, ["Search / Monitor /", "View History"]) +
      ellipse(940, 650, 150, 38, ["Attach • QR • Print"]) +
      line(150, 370, 280, 370) +
      line(1120, 370, 1250, 370) +
      line(105, 280, 525, 155) +
      line(1295, 280, 875, 155) +
      text(700, 782, "System boundary: BLGF Region II Document Tracking and Records Management System", 19),
  ),
  "context-dfd": wrap(
    "Context-Level Data Flow Diagram",
    rect(40, 165, 300, 130, "", gray, ["External Offices", "and Senders"]) +
      rect(40, 540, 300, 130, "", gray, ["System", "Administrator"]) +
      ellipse(700, 410, 300, 175, ["0.0", "BLGF DOCUMENT TRACKING", "AND RECORDS MANAGEMENT", "SYSTEM"]) +
      rect(1060, 165, 300, 130, "", gray, ["Authorized BLGF", "Personnel"]) +
      rect(1060, 540, 300, 130, "", green, ["Database and", "File Storage"]) +
      arrow(340, 230, 505, 335, "document data") +
      arrow(895, 335, 1060, 230, "status / acknowledgment") +
      arrow(1060, 270, 895, 370, "routing / actions") +
      arrow(340, 605, 500, 485, "users / configuration") +
      arrow(900, 485, 1060, 605, "records / files") +
      arrow(1060, 640, 900, 520, "retrieved data"),
  ),
  hipo: wrapPortrait(
    "Hierarchical Input Process Output (HIPO)",
    `<rect x="150" y="85" width="800" height="105" rx="16" fill="${blue}" stroke="${navy}" stroke-width="4"/>` +
      multiline(550, 130, ["0.0  BLGF REGION II", "DOCUMENT TRACKING AND RECORDS MANAGEMENT SYSTEM"], 25, 31, "700")
        .replaceAll('fill="#17202A"', 'fill="#FFFFFF"') +
      text(550, 230, "LEVEL 1 — MAJOR SYSTEM MODULES", 23, "middle", "700") +
      `<line x1="550" y1="190" x2="550" y2="680" stroke="${navy}" stroke-width="4"/>` +
      [342, 502, 662].map((y) => `<line x1="500" y1="${y}" x2="600" y2="${y}" stroke="${navy}" stroke-width="4"/>`).join("") +
      hipoModule(70, 290, "1.0", ["Authentication and", "Role Authorization"], gray) +
      hipoModule(600, 290, "2.0", ["Document", "Registration"], gray) +
      hipoModule(70, 450, "3.0", ["Routing and", "Status Tracking"], pale) +
      hipoModule(600, 450, "4.0", ["File and Employee", "Records Storage"], pale) +
      hipoModule(70, 610, "5.0", ["Search, Notification,", "QR, and Printing"], green) +
      hipoModule(600, 610, "6.0", ["Administration,", "Audit, and Export"], green) +
      text(550, 770, "INPUT–PROCESS–OUTPUT SUMMARY BY MODULE", 24, "middle", "700") +
      hipoCell(50, 800, 300, 60, ["INPUT"], blue, true).replaceAll('fill="#17202A"', 'fill="#FFFFFF"') +
      hipoCell(350, 800, 400, 60, ["PROCESS"], blue, true).replaceAll('fill="#17202A"', 'fill="#FFFFFF"') +
      hipoCell(750, 800, 300, 60, ["OUTPUT"], blue, true).replaceAll('fill="#17202A"', 'fill="#FFFFFF"') +
      hipoCell(50, 860, 300, 78, ["1. Credentials and", "assigned user role"], gray) +
      hipoCell(350, 860, 400, 78, ["Validate login; apply", "role permissions"], gray) +
      hipoCell(750, 860, 300, 78, ["Authorized session", "and permitted views"], gray) +
      hipoCell(50, 938, 300, 78, ["2. Metadata, route", "number, attachments"], "#FFFFFF") +
      hipoCell(350, 938, 400, 78, ["Validate uniqueness;", "create and store record"], "#FFFFFF") +
      hipoCell(750, 938, 300, 78, ["Registered incoming", "or outgoing document"], "#FFFFFF") +
      hipoCell(50, 1016, 300, 78, ["3. Document, recipient,", "action, and remarks"], pale) +
      hipoCell(350, 1016, 400, 78, ["Route or transfer; update", "status, history, and alert"], pale) +
      hipoCell(750, 1016, 300, 78, ["Updated route history,", "status, and notification"], pale) +
      hipoCell(50, 1094, 300, 78, ["4. Employee data,", "folders, and files"], "#FFFFFF") +
      hipoCell(350, 1094, 400, 78, ["Validate file; store data;", "update file metadata"], "#FFFFFF") +
      hipoCell(750, 1094, 300, 78, ["Organized employee and", "document file records"], "#FFFFFF") +
      hipoCell(50, 1172, 300, 78, ["5. Query, filter,", "document selection"], green) +
      hipoCell(350, 1172, 400, 78, ["Search/filter; generate", "QR code or routing slip"], green) +
      hipoCell(750, 1172, 300, 78, ["Search results, QR,", "dashboard, printed slip"], green) +
      hipoCell(50, 1250, 300, 78, ["6. Users, settings,", "logs, and database"], "#FFFFFF") +
      hipoCell(350, 1250, 400, 78, ["Manage configuration;", "audit and export data"], "#FFFFFF") +
      hipoCell(750, 1250, 300, 78, ["Updated accounts/settings,", "logs, and export file"], "#FFFFFF"),
  ),
  ipo: wrap(
    "Input–Process–Output Diagram",
    rect(45, 190, 370, 440, "", gray, [
      "INPUT",
      "User credentials",
      "Document metadata",
      "Unique route number",
      "Files and attachments",
      "Routing decision",
      "Status and remarks",
    ]) +
      arrow(415, 410, 515, 410) +
      rect(515, 190, 370, 440, "", pale, [
        "PROCESS",
        "Authenticate / authorize",
        "Validate and classify",
        "Store and index",
        "Route and transfer",
        "Update status",
        "Log and notify",
      ]) +
      arrow(885, 410, 985, 410) +
      rect(985, 190, 370, 440, "", green, [
        "OUTPUT",
        "Document record",
        "Routing history",
        "Notification",
        "Dashboard / search result",
        "QR / routing slip",
        "Audit and export",
      ]),
  ),
  erd: wrapPortrait(
    "Entity Relationship Diagram",
    text(550, 90, "CORE DOCUMENT WORKFLOW DATA", 22, "middle", "700") +
      entityBox(40, 120, 300, 210, "DIVISIONS", [
        "PK  id",
        "UQ  code",
        "name",
        "chief_name",
        "room_number",
      ], gray) +
      entityBox(400, 120, 300, 215, "USERS", [
        "PK  id",
        "UQ  username",
        "role",
        "division_code (logical ref.)",
        "active",
      ], pale) +
      entityBox(760, 120, 300, 215, "AUDIT_LOGS", [
        "PK  id",
        "user_id (logical ref.)",
        "action",
        "document_tracking_number",
        "timestamp",
      ], gray) +
      relation(340, 215, 400, 215, "1", "M", true) +
      relation(700, 215, 760, 215, "1", "M", true) +
      entityBox(330, 400, 440, 265, "DOCUMENTS", [
        "PK  id",
        "UQ  tracking_number / route_no",
        "direction • title • category",
        "originating_office • destination_office",
        "priority • current_status",
        "current_division • assigned_user",
        "date_received • target/completed dates",
      ], gold) +
      entityBox(35, 730, 310, 215, "DOCUMENT_ROUTES", [
        "PK  id",
        "FK  document_id",
        "step_number",
        "from/to division and user",
        "status_before / status_after",
      ], pale) +
      entityBox(395, 730, 310, 215, "DOCUMENT_ATTACHMENTS", [
        "PK  id",
        "FK  document_id",
        "file_name",
        "file_size • file_type",
        "upload_date",
      ], green) +
      entityBox(755, 730, 310, 215, "NOTIFICATIONS", [
        "PK  id",
        "user_id (logical ref.)",
        "document_id (logical ref.)",
        "tracking_number",
        "type • created_at",
      ], "#FFF2CC") +
      relation(440, 665, 190, 730, "1", "M") +
      relation(550, 665, 550, 730, "1", "M") +
      relation(660, 665, 910, 730, "1", "M", true) +
      `<path d="M700 275 C900 300 980 540 910 730" fill="none" stroke="${navy}" stroke-width="3" stroke-dasharray="9 7"/>` +
      text(720, 300, "1", 17, "start", "700") +
      text(920, 710, "M", 17, "start", "700") +
      text(550, 1005, "EMPLOYEE RECORDS DATA", 22, "middle", "700") +
      entityBox(40, 1040, 300, 210, "EMPLOYEE_PROFILES", [
        "PK  id",
        "full_name • position",
        "office • office_type",
        "division_code (logical ref.)",
        "active",
      ], gray) +
      entityBox(400, 1040, 300, 210, "EMPLOYEE_FOLDERS", [
        "PK  id",
        "FK  employee_id",
        "name",
        "description",
        "created_at",
      ], pale) +
      entityBox(760, 1040, 300, 210, "EMPLOYEE_FOLDER_FILES", [
        "PK  id",
        "FK  folder_id",
        "file_name",
        "file_url",
        "uploaded_at",
      ], green) +
      relation(340, 1135, 400, 1135, "1", "M") +
      relation(700, 1135, 760, 1135, "1", "M") +
      text(550, 1305, "LEGEND", 19, "middle", "700") +
      `<line x1="245" y1="1340" x2="355" y2="1340" stroke="${navy}" stroke-width="3"/>` +
      text(370, 1346, "Database-enforced foreign key", 17, "start") +
      `<line x1="650" y1="1340" x2="760" y2="1340" stroke="${navy}" stroke-width="3" stroke-dasharray="9 7"/>` +
      text(775, 1346, "Application-level logical reference", 17, "start"),
  ),
};

for (const [name, svg] of Object.entries(diagrams)) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(out, `${name}.png`));
}

console.log(`Generated ${Object.keys(diagrams).length} diagrams in ${out}`);
