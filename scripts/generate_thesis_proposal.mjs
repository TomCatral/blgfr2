import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

const outputDir = path.resolve("output");
const outputFile = path.join(
  outputDir,
  "CATRAL_TOM_TOM_G_CSU_FORMATTED_FINAL.docx",
);

const navy = "17365D";
const blue = "1F4E78";
const lightBlue = "D9EAF7";
const gray = "E7E6E6";

const txt = (text, opts = {}) =>
  new TextRun({ text, font: "Century Gothic", size: 22, ...opts });

const para = (text = "", opts = {}) =>
  new Paragraph({
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    spacing: { line: 360, after: opts.after ?? 0, before: opts.before ?? 0 },
    indent: opts.noIndent ? undefined : { firstLine: 720 },
    keepNext: opts.keepNext,
    pageBreakBefore: opts.pageBreakBefore,
    children: [txt(text, opts.run || {})],
  });

const center = (text, opts = {}) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 360, after: opts.after ?? 0, before: opts.before ?? 0 },
    children: [txt(text, opts.run || {})],
  });

const heading = (text, level = HeadingLevel.HEADING_1, pageBreakBefore = false) =>
  new Paragraph({
    text,
    heading: level,
    pageBreakBefore,
    keepNext: true,
    spacing: { before: 0, after: 0 },
  });

const bullet = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { line: 360, after: 0 },
    children: [txt(text)],
  });

const numbered = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { line: 360, after: 0 },
    children: [txt(text)],
  });

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const cell = (text, header = false) =>
  new TableCell({
    shading: header
      ? { fill: blue, type: ShadingType.CLEAR, color: "auto" }
      : undefined,
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: header ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          txt(text, {
            bold: header,
            color: header ? "FFFFFF" : "000000",
            size: 18,
          }),
        ],
      }),
    ],
  });

const table = (headers, rows, widths) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h) => cell(h, true)) }),
      ...rows.map((row) => new TableRow({ children: row.map((v) => cell(String(v))) })),
    ],
  });

const questionnaireCell = (
  text,
  { header = false, align = AlignmentType.CENTER, span = 1, fill } = {},
) =>
  new TableCell({
    columnSpan: span,
    verticalAlign: VerticalAlign.CENTER,
    shading: {
      fill: fill || (header ? blue : "FFFFFF"),
      type: ShadingType.CLEAR,
      color: "auto",
    },
    margins: { top: 100, bottom: 100, left: 90, right: 90 },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { after: 0, line: 240 },
        children: [
          txt(text, {
            bold: header,
            color: header ? "FFFFFF" : "000000",
            size: 20,
          }),
        ],
      }),
    ],
  });

const criterionDescriptions = {
  "A. Functional Suitability":
    "Measures whether the system provides correct, complete, and appropriate functions for the intended document workflow.",
  "B. Performance Efficiency":
    "Measures responsiveness and efficient operation during normal document-processing activities.",
  "C. Compatibility":
    "Measures operation with the approved browser, device, file formats, and office environment.",
  "D. Usability":
    "Measures clarity, learnability, ease of operation, error prevention, and interface readability.",
  "E. Reliability":
    "Measures consistent operation, preservation of confirmed transactions, and useful error feedback.",
  "F. Security":
    "Measures authentication, role-based access, accountability, and protection of records and files.",
  "G. Maintainability":
    "Measures how readily authorized technical personnel can analyze, modify, and retest the system.",
  "H. Portability":
    "Measures adaptability and operation within approved server, storage, and browser environments.",
};

const questionnaireTable = (category, statements, startNumber) => [
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    keepNext: true,
    spacing: { before: 220, after: 100 },
    children: [txt(category.toUpperCase(), { bold: true, color: blue })],
  }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [600, 5200, 520, 520, 520, 520, 520],
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          questionnaireCell(criterionDescriptions[category], {
            align: AlignmentType.LEFT,
            span: 7,
            fill: lightBlue,
          }),
        ],
      }),
      new TableRow({
        tableHeader: true,
        children: ["No.", "Evaluation Statement", "5", "4", "3", "2", "1"].map(
          (h) => questionnaireCell(h, { header: true }),
        ),
      }),
      ...statements.map(
        (statement, index) =>
          new TableRow({
            cantSplit: true,
            children: [
              questionnaireCell(String(startNumber + index)),
              questionnaireCell(statement, { align: AlignmentType.LEFT }),
              questionnaireCell("☐"),
              questionnaireCell("☐"),
              questionnaireCell("☐"),
              questionnaireCell("☐"),
              questionnaireCell("☐"),
            ],
          }),
      ),
    ],
  }),
];

const diagramFiles = {
  "Conceptual Framework": "conceptual-framework.png",
  "Research Paradigm": "research-paradigm.png",
  "System Architecture": "system-architecture.png",
  "Use-Case Diagram": "use-case.png",
  "Context-Level Data Flow Diagram": "context-dfd.png",
  "Hierarchical Input Process Output": "hipo.png",
  "Input-Process-Output Diagram": "ipo.png",
  "Entity Relationship Diagram": "erd.png",
};

const figureNumbers = {
  "Conceptual Framework": 1,
  "Research Paradigm": 2,
  "System Architecture": 3,
  "Use-Case Diagram": 4,
  "Context-Level Data Flow Diagram": 5,
  "Hierarchical Input Process Output": 6,
  "Input-Process-Output Diagram": 7,
  "Entity Relationship Diagram": 8,
};

const diagram = (title, lines) => [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 180, after: 80 },
    keepNext: true,
    children: [
      new ImageRun({
        data: fs.readFileSync(
          path.resolve("output", "diagrams", diagramFiles[title]),
        ),
        transformation:
          title === "Conceptual Framework" ||
          title === "Research Paradigm" ||
          title === "Hierarchical Input Process Output" ||
          title === "Entity Relationship Diagram"
            ? { width: 545, height: 694 }
            : { width: 575, height: 337 },
        type: "png",
        altText: {
          title,
          description: lines.join("; "),
          name: title,
        },
      }),
    ],
  }),
  center(`Figure ${figureNumbers[title]}. ${title}`, {
    run: { bold: true, size: 18 },
    after: 0,
  }),
];

const children = [];

// Title Page
children.push(
  center("WEB-BASED DOCUMENT TRACKING AND RECORDS MANAGEMENT SYSTEM", {
    run: { bold: true, size: 22 },
  }),
  center("FOR THE BUREAU OF LOCAL GOVERNMENT FINANCE – REGION II", {
    run: { bold: true, size: 22 },
  }),
  center("_____________________", { before: 300 }),
  center("A Thesis Presented to"),
  center("the Faculty of the Graduate School"),
  center("Cagayan State University – Carig Campus"),
  center("Tuguegarao City"),
  center("_____________________", { before: 300 }),
  center("In Partial Fulfillment of the"),
  center("Academic Requirements for the degree"),
  center("MASTER OF SCIENCE IN INFORMATION TECHNOLOGY", {
    run: { bold: false },
  }),
  center("_____________________", { before: 300 }),
  center("By:"),
  center("TOM TOM G. CATRAL", { run: { bold: true } }),
  center("JULY 2026", { before: 300 }),
  pageBreak(),
);

// Approval
children.push(
  heading("APPROVAL SHEET", HeadingLevel.HEADING_1),
  para(
    "This thesis proposal entitled “Web-Based Document Tracking and Records Management System for the Bureau of Local Government Finance – Region II,” prepared and submitted by TOM TOM G. CATRAL in partial fulfillment of the requirements for the degree MASTER OF SCIENCE IN INFORMATION TECHNOLOGY, has been examined and is recommended for proposal defense.",
  ),
  center("\n\n____________________________________", { after: 20 }),
  center("[NAME OF THESIS ADVISER]", { run: { bold: true }, after: 20 }),
  center("Thesis Adviser"),
  center("\n\nApproved by the Thesis Committee:", { run: { bold: true }, after: 300 }),
  table(
    ["Panel Member", "Signature", "Date"],
    [
      ["[NAME OF CHAIRPERSON]", "________________", "________________"],
      ["[NAME OF PANEL MEMBER]", "________________", "________________"],
      ["[NAME OF PANEL MEMBER]", "________________", "________________"],
    ],
    [3400, 2200, 2200],
  ),
  pageBreak(),
);

children.push(
  heading("ACKNOWLEDGEMENT", HeadingLevel.HEADING_1),
  para(
    "The researcher expresses sincere gratitude to the Almighty for the strength and wisdom to undertake this study; to the thesis adviser and panel members for their guidance; to the officials and personnel of the Bureau of Local Government Finance – Region II for sharing their workflow requirements and operational insights; and to family, colleagues, and friends whose encouragement made this work possible.",
  ),
  para(
    "The researcher also recognizes the value of the open-source community whose technologies made the development of the proposed system feasible. Any remaining errors or limitations are solely the responsibility of the researcher.",
  ),
  pageBreak(),
  heading("DEDICATION", HeadingLevel.HEADING_1),
  center("\n\nThis work is dedicated to my family, mentors, colleagues, and the public servants whose commitment to accountable and efficient records management inspired this study.", {
    run: { italic: true },
  }),
  pageBreak(),
);

children.push(
  heading("TABLE OF CONTENTS", HeadingLevel.HEADING_1),
  new TableOfContents("Table of Contents", {
    hyperlink: true,
    headingStyleRange: "1-3",
  }),
  pageBreak(),
  heading("LIST OF TABLES", HeadingLevel.HEADING_1),
  para("Table 1. Functional Scope of the Developed System", { noIndent: true }),
  para("Table 2. Software and Hardware Requirements", { noIndent: true }),
  para("Table 3. Data Model and Major Entities", { noIndent: true }),
  para("Table 4. ISO/IEC 25010 Evaluation Matrix", { noIndent: true }),
  para("Table 5. Summary of Findings Template", { noIndent: true }),
  pageBreak(),
  heading("LIST OF FIGURES", HeadingLevel.HEADING_1),
  para("Figure 1. Conceptual Framework", { noIndent: true }),
  para("Figure 2. Research Paradigm", { noIndent: true }),
  para("Figure 3. System Architecture", { noIndent: true }),
  para("Figure 4. Use-Case Diagram", { noIndent: true }),
  para("Figure 5. Context-Level Data Flow Diagram", { noIndent: true }),
  para("Figure 6. Hierarchical Input Process Output", { noIndent: true }),
  para("Figure 7. Input-Process-Output Diagram", { noIndent: true }),
  para("Figure 8. Entity Relationship Diagram", { noIndent: true }),
  pageBreak(),
);

children.push(
  heading("ABSTRACT", HeadingLevel.HEADING_1),
  para(
    "This study presents the design and development of a Web-Based Document Tracking and Records Management System for the Bureau of Local Government Finance – Region II (BLGF Region II). The system responds to operational challenges commonly associated with manual or fragmented document handling, including delayed routing, limited visibility of document status, duplicate route numbers, difficulty locating records, inconsistent accountability, and time-consuming report preparation. The developed application centralizes the registration of incoming and outgoing documents, routing and transfer history, attachments, notifications, employee records, audit logs, outgoing-envelope logs, QR code generation and scanning, document slips, storage configuration, and database export.",
  ),
  para(
    "The project uses a developmental research approach and an iterative software development process. Its implementation employs React and TypeScript for the client interface, Express and TypeScript for the application programming interface, and MySQL for persistent storage with a JSON fallback mechanism. Role-based access controls regulate the information and functions available to administrators, records personnel, division chiefs, staff, and other authorized users. The proposed evaluation adopts the ISO/IEC 25010 product-quality model, focusing on functional suitability, performance efficiency, compatibility, usability, reliability, security, maintainability, and portability.",
  ),
  para(
    "Based on functional inspection of the implemented modules, the system provides a traceable document lifecycle from registration through routing, receipt, action, completion, storage, and audit. Actual user-acceptance scores and statistical findings must be entered after pilot testing with authorized BLGF Region II respondents. The study is expected to support faster retrieval, clearer accountability, better records integrity, and more consistent document-processing practices.",
  ),
  para(
    "Keywords: document tracking, records management, workflow automation, role-based access control, QR code, audit trail, BLGF Region II, ISO/IEC 25010",
    { noIndent: true },
  ),
);

// Chapter I
children.push(
  heading("CHAPTER I. THE PROBLEM AND ITS BACKGROUND", HeadingLevel.HEADING_1, true),
  heading("1.1 Introduction", HeadingLevel.HEADING_2),
  para(
    "Government offices create and receive a continuous stream of memoranda, endorsements, requests, reports, communications, and supporting records. Each document may pass through several offices and personnel before a final action is completed. When the process depends heavily on handwritten logbooks, isolated spreadsheets, email threads, or verbal follow-ups, personnel may have difficulty determining where a document is located, who currently holds it, what action is required, and whether a deadline has been met.",
  ),
  para(
    "Records management is not limited to storing files. It includes the controlled creation, receipt, classification, routing, use, retention, retrieval, and disposition of records. A tracking mechanism therefore needs to preserve both the document and its chain of custody. The ability to view a reliable routing history is especially important in public service, where transparency, accountability, and timely action directly affect organizational performance.",
  ),
  para(
    "The Bureau of Local Government Finance – Region II requires a practical mechanism for managing incoming and outgoing documents across organizational units. The developed Web-Based Document Tracking and Records Management System provides a centralized interface for document registration, status monitoring, routing, attachments, notifications, audit trails, employee records, storage, QR-enabled identification, and report-related functions. The project is designed around the office’s workflow rather than as a generic file repository.",
  ),
  para(
    "This study documents the analysis, design, development, and proposed evaluation of the system. It examines how an integrated web application may reduce fragmented records, improve document visibility, support faster retrieval, and strengthen responsibility at each routing step.",
  ),
  heading("1.2 Conceptual Framework", HeadingLevel.HEADING_2),
  para(
    "Figure 1 presents the detailed conceptual framework of the study using the Input–Process–Output (IPO) model. The framework connects the evidence gathered from the existing BLGF Region II document workflow, the development and evaluation activities performed by the researcher, and the operational and measurable results expected from the Web-Based Document Tracking and Records Management System.",
  ),
  para(
    "The input component covers both organizational and technical information. Organizational inputs include data gathered from BLGF offices, records personnel, division users, and system administrators; the procedures used to register, route, monitor, retrieve, and store documents; and observed delays, document misplacement, duplicate entries, and limitations in status visibility. Technical inputs include functional and security requirements, organizational roles, document metadata, hardware and software resources, storage requirements, office policies, and the ISO/IEC 25010 quality model.",
  ),
  para(
    "The process component has two related parts. System development follows an Iterative and Incremental Development Model. The first increments establish authentication, document registration, and basic storage; succeeding increments add routing, multi-routing, transfer, status history, notifications, attachments, QR and printing tools, employee records, logs, configuration, and administration. Each increment is analyzed, designed, implemented, tested, and refined before integration. Research data are gathered through interviews, structured questionnaires, workflow observation, functional testing, and user evaluation. Frequency, percentage, weighted mean, and qualitative thematic grouping support the descriptive analysis.",
  ),
  para(
    "The output component is an operational system that centralizes incoming and outgoing document records; preserves route and status history; controls access by role; and provides notifications, QR tools, routing slips, attachments, employee records, audit logs, envelope logs, configurable storage, and export functions. Expected organizational outcomes include faster processing and retrieval, fewer duplicate or unlocated records, improved monitoring, stronger accountability, and better information availability. These outcomes are verified through actual task measurements and respondent evaluation rather than assumed from implementation alone.",
  ),
  ...diagram("Conceptual Framework", [
    "PEOPLE + DOCUMENTS + OFFICE POLICIES",
    "                    ↓",
    "WEB-BASED TRACKING AND RECORDS MANAGEMENT",
    "                    ↓",
    "TRACEABILITY • TIMELINESS • ACCOUNTABILITY • RETRIEVAL",
    "                    ↺",
    "USER FEEDBACK AND CONTINUOUS IMPROVEMENT",
  ]),
  heading("1.3 Research Paradigm", HeadingLevel.HEADING_2),
  para(
    "Figure 2 presents the research paradigm that links the study inputs, system-development activities, evaluation procedures, and intended outcomes. Unlike the conceptual framework, which summarizes how resources are transformed into outputs, the research paradigm specifies the evidence, implementation components, and measurements used to answer the study objectives.",
  ),
  para(
    "Research inputs consist of the existing BLGF Region II document workflow and office rules; incoming and outgoing document forms and metadata; route information, attachments, and logs; authorized user roles and division responsibilities; observed delays, errors, and retrieval problems; functional, access-control, notification, file-storage, and reporting requirements; the selected React, TypeScript, Express, MySQL, and file-storage technologies; and the ISO/IEC 25010 product-quality criteria.",
  ),
  para(
    "The development component applies an Iterative and Incremental Development Model. Requirements are organized into functional increments; each increment undergoes workflow and interface design, database and API implementation, frontend and backend development, functional testing, integration, and refinement. These activities produce the actual modules verified in the project: authentication and role-based access; incoming and outgoing registration; unique route-number validation; routing, multi-routing, transfer, receipt, and completion; status and route history; notifications; attachments; QR and document-slip tools; employee records; audit and envelope logs; configurable storage; user administration; and database export.",
  ),
  para(
    "The evaluation component combines functional verification, role and access testing, task-based user testing, the 30-item ISO/IEC 25010 questionnaire, and analysis of user comments and encountered issues. The resulting outcomes are an operational system, centralized and searchable records, verified task results, software-quality ratings, documented user feedback, evidence concerning visibility and accountability, a user manual, and recommendations for controlled improvement. Evaluation results feed back into the next development increment so that identified defects or usability issues can be corrected.",
  ),
  ...diagram("Research Paradigm", [
    "INPUT",
    "Workflow • Requirements • Users • Documents • Technology",
    "                         ↓",
    "PROCESS",
    "Analyze • Design • Develop • Test • Evaluate",
    "                         ↓",
    "OUTPUT",
    "BLGF Region II Document Tracking and Records Management System",
  ]),
  heading("1.4 Objectives of the Study", HeadingLevel.HEADING_2),
  heading("1.4.1 General Objective", HeadingLevel.HEADING_3),
  para(
    "To design, develop, and evaluate a web-based document tracking and records management system that supports the secure, timely, and traceable processing of official documents at BLGF Region II.",
  ),
  heading("1.4.2 Specific Objectives", HeadingLevel.HEADING_3),
  numbered("To document the existing practices and problems in registering, routing, monitoring, retrieving, and storing official documents."),
  numbered("To identify challenges encountered by users in both the existing workflow and the developed system."),
  numbered("To develop centralized modules for incoming and outgoing document registration, unique route-number validation, status monitoring, routing, transfer, and completion."),
  numbered("To provide role-based access, user and employee management, notifications, audit trails, envelope dispatch logs, and attachment management."),
  numbered("To support QR code generation/scanning, document slips, configurable file storage, search, filtering, dashboard summaries, and database export."),
  numbered("To evaluate the system using the ISO/IEC 25010 product-quality characteristics."),
  numbered("To recommend operational and technical improvements based on testing and user feedback."),
  heading("1.5 Scope and Limitation of the Study", HeadingLevel.HEADING_2),
  para(
    "The study covers the document lifecycle supported by the implemented application: user authentication; incoming and outgoing document registration; division and user assignment; routing and multi-routing; transfer and receiving actions; document statuses and priorities; attachments; notifications; searchable lists and dashboards; official routing slips; outgoing-envelope recording; QR generation/scanning; employee profiles and folders; audit logs; configurable storage directories; MySQL export; and administrative user management.",
  ),
  para(
    "The application is intended for authorized BLGF Region II personnel and is designed for use through a modern web browser on a networked computer. Access is controlled by predefined roles and permissions. The current implementation uses a React/TypeScript client, an Express/TypeScript server, and MySQL persistent storage, with local JSON files available as a fallback in supported deployments.",
  ),
  para(
    "The study does not claim to replace national records-disposition policies, digital-signature infrastructure, or a full enterprise content-management platform. System effectiveness depends on correct data entry, reliable network and server availability, proper user-account administration, backup procedures, and staff compliance with approved workflows. Actual ISO/IEC 25010 scores cannot be finalized until the prescribed respondents complete pilot testing and the evaluation questionnaire.",
  ),
  heading("1.6 Significance of the Study", HeadingLevel.HEADING_2),
  bullet("BLGF Region II Management. Consolidated operational information can support oversight, workload monitoring, accountability, and process improvement."),
  bullet("Records and Administrative Personnel. Centralized registration, storage, search, routing history, and logs can reduce repetitive encoding and manual follow-up."),
  bullet("Division Chiefs and Staff. Notifications and document-status visibility can clarify assigned actions, deadlines, and responsibility."),
  bullet("Clients and Partner Offices. More consistent internal processing may improve response time and service delivery."),
  bullet("System Administrators. Role management, storage configuration, audit trails, and database export provide tools for controlled system operation."),
  bullet("Future Researchers and Developers. The study provides a reference for workflow-oriented records systems in comparable public-sector environments."),
  heading("1.7 Definition of Terms", HeadingLevel.HEADING_2),
  table(
    ["Term", "Operational Definition"],
    [
      ["Audit Trail", "A chronological record of system and user activities related to documents and administrative operations."],
      ["Document Route Number", "A unique identifier used by the system to register, locate, and distinguish an official document."],
      ["Document Routing", "The controlled forwarding of a document to one or more authorized users or divisions for action."],
      ["Incoming Document", "A record received by BLGF Region II from an external or internal source."],
      ["Outgoing Document", "A record released or transmitted by BLGF Region II to an intended recipient."],
      ["QR Code", "A machine-readable code used to represent or retrieve document-identifying information."],
      ["Records Management", "The systematic control of records throughout their creation, use, storage, retrieval, and disposition."],
      ["Role-Based Access Control", "A security approach in which system permissions depend on a user’s assigned organizational role."],
      ["Routing History", "The ordered record of offices, users, dates, actions, remarks, statuses, and attachments associated with document movement."],
      ["ISO/IEC 25010", "A software product-quality model used in this study as the basis for system evaluation."],
    ],
    [2200, 6500],
  ),
);

// Chapter II
children.push(
  heading("CHAPTER II. REVIEW OF RELATED LITERATURE AND STUDIES", HeadingLevel.HEADING_1, true),
  heading("2.1 Foreign Literature", HeadingLevel.HEADING_2),
  para(
    "International records-management literature treats records as evidence of organizational activity and emphasizes their authenticity, reliability, integrity, and usability throughout the records lifecycle. This perspective supports the inclusion of unique identifiers, metadata, controlled access, routing history, audit logs, and systematic storage in an electronic tracking system.",
  ),
  para(
    "Workflow information systems coordinate tasks, people, and business rules so that work items move through defined stages. In document-intensive organizations, workflow automation can reduce uncertainty by recording assignment, receipt, action, transfer, and completion events. Dashboards and notifications further convert stored transaction data into actionable information.",
  ),
  para(
    "Role-based access control limits operations according to organizational responsibility. Applied to document tracking, it helps ensure that users see only the records and functions required by their duties, while administrators retain controlled capabilities for account, configuration, and audit management. Logging complements access control by establishing who performed an action and when it occurred.",
  ),
  para(
    "QR codes provide a compact method for connecting physical documents to digital identifiers. When a printed routing slip or folder bears a QR code, scanning can accelerate lookup and reduce errors associated with manually typing long identifiers. The value of the code nevertheless depends on authoritative records and secure access in the underlying application.",
  ),
  para(
    "Software-quality evaluation should be multidimensional. ISO/IEC 25010 identifies characteristics such as functional suitability, performance efficiency, compatibility, usability, reliability, security, maintainability, and portability. These characteristics provide a structured basis for evaluating whether the developed system meets both functional and quality expectations.",
  ),
  heading("2.2 Local Literature", HeadingLevel.HEADING_2),
  para(
    "Philippine public offices operate within an environment that values accountability, efficient public service, data protection, and proper records custody. The Electronic Commerce Act recognizes electronic data messages and documents in transactions, while the Data Privacy Act establishes responsibilities for the lawful and secure processing of personal information. These principles make controlled access, accurate records, and appropriate safeguards important in government information systems.",
  ),
  para(
    "The Ease of Doing Business and Efficient Government Service Delivery Act reinforces the need for simplified and timely government procedures. Although document tracking alone cannot resolve every service delay, accurate visibility into pending records, assigned personnel, target dates, and completed actions can help offices identify bottlenecks and establish responsibility.",
  ),
  para(
    "The National Archives of the Philippines provides the institutional context for government records management. Local digitalization initiatives commonly seek to improve retrieval and reduce dependence on fragmented paper logs. However, successful implementation also requires approved classification, retention, backup, access, and disposition procedures, together with staff training and management support.",
  ),
  heading("2.3 Synthesis", HeadingLevel.HEADING_2),
  para(
    "The reviewed concepts converge on five requirements: reliable document identification, explicit workflow states, controlled access, traceable actions, and usable retrieval. Records-management principles explain what must be preserved; workflow systems explain how tasks move; security models govern who may act; QR technology connects physical and digital records; and ISO/IEC 25010 supplies an evaluation structure.",
  ),
  para(
    "The proposed system integrates these requirements in a single application tailored to BLGF Region II. Its contribution is not the isolated use of a database or web interface, but the combination of registration, role-based routing, status history, attachments, alerts, storage, employee records, dispatch logs, QR-assisted lookup, and audit functions around the office’s operational document lifecycle.",
  ),
);

// Chapter III
children.push(
  heading("CHAPTER III. RESEARCH METHODOLOGY", HeadingLevel.HEADING_1, true),
  heading("3.1 Research Design", HeadingLevel.HEADING_2),
  para(
    "The study uses developmental research with descriptive evaluation. Developmental research is appropriate because the main output is an information system created in response to an identified organizational need. The descriptive-evaluative component records workflow observations, encountered challenges, functional-test results, and user perceptions of the completed system using the ISO/IEC 25010 quality characteristics.",
  ),
  para(
    "System development follows an Iterative and Incremental Development Model. Requirements are divided into manageable functional increments. Each increment passes through analysis, design, implementation, testing, integration, and review. Feedback from a completed increment informs the next one, allowing the system to progress from core authentication and document registration to routing, notifications, attachments, reporting tools, records functions, storage configuration, and administration.",
  ),
  heading("3.2 System Architecture", HeadingLevel.HEADING_2),
  para(
    "The system follows a web-based client–server architecture. The browser client renders the React interface and calls REST-style endpoints. The Express server performs validation, workflow processing, authentication, file handling, and data access. MySQL stores structured operational data, while configured directories preserve uploaded files. A JSON fallback supports selected local deployments. Production assets are generated through Vite and esbuild.",
  ),
  ...diagram("System Architecture", [
    "AUTHORIZED USER / WEB BROWSER",
    "React 19 + TypeScript + Vite",
    "               ⇅ HTTPS / REST-style JSON API",
    "Express 4 + TypeScript Application Server",
    "      ⇙                 ↓                  ⇘",
    "MySQL Database   Configured File Storage   JSON Fallback",
  ]),
  heading("3.3 Use-Case Diagram", HeadingLevel.HEADING_2),
  para(
    "The principal actors are Administrator, Records Personnel, Division Chief, Staff/User, and Authorized Viewer. Available functions vary according to role permissions configured in the application.",
  ),
  ...diagram("Use-Case Diagram", [
    "ADMIN ── Manage users, settings, storage, audit, all documents",
    "RECORDS ── Register, route, scan, attach, print slips, dispatch",
    "CHIEF ── View division documents, route/assign, monitor status",
    "STAFF ── Receive assigned documents, act, transfer, complete",
    "VIEWER ── View permitted dashboards and document information",
    "ALL AUTHORIZED USERS ── Login, search, view alerts and history",
  ]),
  heading("3.4 Context Level – Data Flow Diagram", HeadingLevel.HEADING_2),
  ...diagram("Context-Level Data Flow Diagram", [
    "External Offices / Senders ── Document data ──▶",
    "BLGF DOCUMENT TRACKING AND RECORDS MANAGEMENT SYSTEM",
    "◀── Status / acknowledgment ── BLGF Personnel",
    "Administrator ── Users / configuration ──▶ SYSTEM",
    "SYSTEM ── Dashboards / logs / slips / notifications ──▶ Users",
    "SYSTEM ⇄ MySQL Database and File Storage",
  ]),
  heading("3.5 Software and Hardware Requirements", HeadingLevel.HEADING_2),
  table(
    ["Category", "Minimum / Required", "Recommended"],
    [
      ["Client Hardware", "Dual-core CPU, 4 GB RAM, 1366×768 display", "Modern multi-core CPU, 8 GB RAM or higher"],
      ["Server Hardware", "4-core CPU, 8 GB RAM, 20 GB available storage", "Scalable server/VM with monitored backups"],
      ["Client Software", "Modern Chromium, Firefox, or Edge browser", "Current supported browser with JavaScript enabled"],
      ["Server Software", "Node.js-compatible runtime, npm, MySQL", "Current LTS Node.js, managed MySQL/TiDB, TLS"],
      ["Frontend", "React 19, TypeScript, Vite", "Production build served over HTTPS"],
      ["Backend", "Express 4, TypeScript, mysql2, Multer", "Process manager, logging, health monitoring"],
      ["Network", "Reliable LAN/Internet connectivity", "Redundant connection and secure network controls"],
      ["Backup", "Periodic database and attachment copy", "Automated encrypted, tested, off-site backup"],
    ],
    [1800, 3400, 3400],
  ),
  heading("3.6 Respondents of the Study", HeadingLevel.HEADING_2),
  para(
    "The proposed respondents are authorized BLGF Region II personnel who participate in document receipt, registration, routing, action, release, records storage, supervision, or system administration. Purposive sampling is recommended because respondents must have direct knowledge of the workflow being evaluated.",
  ),
  para(
    "Final respondent profile: [INSERT APPROVED NUMBER OF RESPONDENTS], consisting of [INSERT GROUPS, SUCH AS RECORDS PERSONNEL, DIVISION CHIEFS, STAFF, AND ADMINISTRATORS]. The final manuscript must report the actual distribution and selection criteria after approval by the adviser and participating office.",
  ),
  heading("3.7 Research Instrument", HeadingLevel.HEADING_2),
  para(
    "The primary instrument is a structured questionnaire based on the eight ISO/IEC 25010 product-quality characteristics. Respondents rate statements on a five-point Likert scale: 5 – Strongly Agree, 4 – Agree, 3 – Neither Agree nor Disagree, 2 – Disagree, and 1 – Strongly Disagree. The instrument also includes respondent profile items and open-ended questions for observed issues and recommendations. A functional-test checklist records whether required use cases, validation rules, permissions, files, notifications, histories, and administrative functions operate as intended.",
  ),
  para(
    "Content validation should be performed by the thesis adviser, an information-technology expert, and a records/process representative. A pilot test should verify clarity, completion time, and internal consistency before the main administration.",
  ),
  heading("3.8 Locale of the Study", HeadingLevel.HEADING_2),
  para(
    "The study is intended for the Bureau of Local Government Finance – Region II. Data gathering, workflow validation, pilot testing, and user evaluation should be conducted with permission from the authorized regional office and in accordance with its operational and information-security requirements. Insert the approved office address here: [COMPLETE BLGF REGION II OFFICE ADDRESS].",
  ),
  heading("3.9 Data Gathering", HeadingLevel.HEADING_2),
  numbered("Secure written permission from BLGF Region II and approval of the research instrument."),
  numbered("Interview or consult process owners to document existing registration, routing, follow-up, storage, and reporting practices."),
  numbered("Review non-confidential forms, log formats, routing slips, and metadata requirements."),
  numbered("Configure a controlled test environment using non-sensitive or properly authorized sample data."),
  numbered("Orient respondents and conduct task-based pilot testing of relevant system modules."),
  numbered("Administer the ISO/IEC 25010 questionnaire and collect open-ended feedback."),
  numbered("Encode, verify, analyze, and securely retain the resulting data."),
  numbered("Revise the system and manuscript based on validated findings."),
  heading("3.10 Data Analysis", HeadingLevel.HEADING_2),
  para(
    "Frequency and percentage will describe respondent groups and recurring workflow issues. The weighted mean will summarize each ISO/IEC 25010 statement and quality characteristic. Where appropriate, standard deviation may describe response dispersion. Open-ended responses will be grouped by recurring theme.",
  ),
  center("Weighted Mean = Σ(f × w) / N", { run: { bold: true }, after: 160 }),
  table(
    ["Weighted Mean Range", "Verbal Interpretation"],
    [
      ["4.21–5.00", "Strongly Agree / Excellent"],
      ["3.41–4.20", "Agree / Very Good"],
      ["2.61–3.40", "Neither Agree nor Disagree / Good"],
      ["1.81–2.60", "Disagree / Fair"],
      ["1.00–1.80", "Strongly Disagree / Poor"],
    ],
    [3000, 5600],
  ),
);

// Chapter IV
children.push(
  heading("CHAPTER IV. RESULTS AND DISCUSSIONS", HeadingLevel.HEADING_1, true),
  para(
    "This chapter documents the system output already verifiable from the implemented application. Survey-dependent tables remain explicitly marked for completion after formal pilot testing; no respondent score is fabricated in this proposal draft.",
  ),
  heading("4.1 Problems Encountered in the Existing System", HeadingLevel.HEADING_2),
  para(
    "The requirements addressed by the system indicate recurring risks in a manual or fragmented workflow: difficulty locating a document after endorsement; dependence on personal follow-up; inconsistent route-number recording; duplicate entries; limited visibility of pending actions and target dates; attachments stored separately from transaction records; incomplete chain-of-custody information; and delayed preparation of logs or reports.",
  ),
  para(
    "These conditions may result in unnecessary processing time, uncertainty regarding responsibility, weak auditability, and difficulty retrieving historical records. They also make continuity dependent on individual knowledge instead of shared and controlled organizational information.",
  ),
  heading("4.2 The Developed System", HeadingLevel.HEADING_2),
  para(
    "The developed application centralizes the document lifecycle and exposes functions according to user role. Incoming and outgoing documents can be registered with metadata, priority, status, target dates, source/recipient information, assigned users or divisions, and attachments. Route numbers are checked for duplication. Routing, multi-routing, transfer, receipt, and status transitions are recorded as ordered history.",
  ),
  table(
    ["Module", "Implemented Capability"],
    [
      ["Authentication and Access", "User login, active-account checking, role-based views and action permissions"],
      ["Dashboard", "Operational summaries and access-aware document information"],
      ["Incoming / Outgoing", "Registration, unique route number, metadata, priority, target date, attachments"],
      ["Routing", "Single and multiple recipients, transfer, receipt/action status, remarks, route history"],
      ["Notifications", "Action-required and routing alerts tied to users and documents"],
      ["Document Slip", "Selection and printing of official routing information"],
      ["QR Tools", "QR generation and camera-based scanning support"],
      ["Envelope Dispatch", "Outgoing recipient/releasing details and separate envelope logs"],
      ["Employee Records", "Employee profiles, folders, and supporting files"],
      ["Audit", "Chronological user/system activity records"],
      ["Storage", "Configurable document directories and controlled file access"],
      ["Administration", "Users, divisions, settings, deletion rights, database export"],
    ],
    [2400, 6200],
  ),
  heading("4.2.1 Hierarchical Input Process Output (HIPO)", HeadingLevel.HEADING_3),
  para(
    "Figure 6 presents the Hierarchical Input Process Output (HIPO) model of the developed system. At Level 0, the complete BLGF Region II Document Tracking and Records Management System acts as the parent function. Level 1 decomposes the system into six major modules that correspond to the active functions implemented in the frontend and backend: authentication and role authorization; document registration; routing and status tracking; file and employee-record storage; search, notification, QR, and printing; and administration, audit, and export.",
  ),
  para(
    "The lower portion of the figure provides an IPO summary for every Level 1 module. Each row identifies the data accepted by a module, the principal validation or transformation performed by the application, and the resulting record, view, history entry, notification, file, or administrative output. This structure shows both the functional hierarchy and the flow of information without treating unsupported legacy schema tables as active system modules.",
  ),
  ...diagram("Hierarchical Input Process Output", [
    "0.0 DOCUMENT TRACKING AND RECORDS MANAGEMENT",
    "├── 1.0 Authenticate and Authorize Users",
    "├── 2.0 Register Incoming/Outgoing Documents",
    "├── 3.0 Route, Transfer, Receive, and Complete",
    "├── 4.0 Store Attachments and Employee Records",
    "├── 5.0 Notify, Search, Monitor, and Print",
    "└── 6.0 Audit, Configure, Export, and Administer",
  ]),
  heading("4.2.2 Input Process Output (IPO) Diagram", HeadingLevel.HEADING_3),
  ...diagram("Input-Process-Output Diagram", [
    "INPUT: credentials, metadata, route number, files, routing decision",
    "                              ↓",
    "PROCESS: validate → authorize → store → route → log → notify",
    "                              ↓",
    "OUTPUT: status, history, alert, dashboard, slip, QR, audit/export",
  ]),
  heading("4.2.3 Entity Relationship Diagram (ERD)", HeadingLevel.HEADING_3),
  para(
    "Figure 8 presents the active data relationships used by the developed system. The core workflow centers on the documents entity, which stores the unique tracking number, direction, subject and classification data, current status, current division, assignment, and relevant dates. A document may have many routing steps and attachments. Notifications may refer to a document and are assigned to a user. Users are grouped by division and their significant actions are recorded in audit logs.",
  ),
  para(
    "Employee records form a related but distinct branch: one employee profile may contain many folders, and one folder may contain many files. Solid relationship lines identify foreign keys explicitly enforced in the current MySQL schema. Dashed lines identify application-level logical references such as division_code, user_id, and notification document_id, which are used by the application but are not declared as foreign-key constraints in the schema. This distinction prevents the diagram from claiming database constraints that do not exist.",
  ),
  ...diagram("Entity Relationship Diagram", [
    "DIVISION 1 ──── * USER",
    "USER 1 ──── * DOCUMENT_ROUTE * ──── 1 DOCUMENT",
    "DOCUMENT 1 ──── * ATTACHMENT",
    "DOCUMENT 1 ──── * NOTIFICATION * ──── 1 USER",
    "USER 1 ──── * AUDIT_LOG",
    "EMPLOYEE 1 ──── * EMPLOYEE_FOLDER 1 ──── * FOLDER_FILE",
  ]),
  heading("4.2.3.1 User’s View", HeadingLevel.HEADING_3),
  para(
    "After authentication, the user sees only permitted navigation items and accessible documents. Administrators can view all documents and manage users, settings, storage, and logs. Records-oriented roles can register and route documents. Division-level users see records assigned or routed to them and can perform authorized actions. The interface provides modals for document details, creation, routing, and status handling, together with dashboards, notifications, search, and responsive navigation.",
  ),
  heading("4.2.3.2 Data Model", HeadingLevel.HEADING_3),
  table(
    ["Entity", "Purpose / Key Data"],
    [
      ["divisions", "Organizational units and codes"],
      ["users", "Credentials, role, division, active state, profile details"],
      ["documents", "Route number, direction, subject, dates, sender/recipient, priority, status"],
      ["document_routes", "Origin, destination, action, status transition, remarks, timestamps"],
      ["document_attachments", "File metadata and relationship to a document or route"],
      ["notifications", "User-specific document alerts and read/action state"],
      ["audit_logs", "Actor, action, description, timestamp, contextual data"],
      ["employee_profiles", "Employee identity, appointment, division, and profile metadata"],
      ["employee_folders/files", "Organized employee supporting records"],
    ],
    [2600, 6000],
  ),
  heading("4.2.4 Table Design", HeadingLevel.HEADING_3),
  para(
    "The relational design uses primary keys to uniquely identify records and foreign-key relationships to connect documents, routes, users, divisions, attachments, and notifications. Route numbers require uniqueness at the application level and should also be protected by a database constraint in production. Timestamps support chronological reconstruction. Enumerated status, direction, priority, role, and document-type values promote consistency.",
  ),
  para(
    "File contents are stored in configured directories while structured file metadata and relationships remain in the application data model. This separation keeps operational queries manageable while allowing controlled retrieval. Database export and backup procedures should always include both structured data and referenced file storage so that restored records remain complete.",
  ),
  heading("4.3 The Extent of Compliance of the Developed System to ISO 25010 Software Quality Standards", HeadingLevel.HEADING_2),
  para(
    "Complete this section after pilot testing. The table below is intentionally prepared as an encoding template. Replace each blank with the computed weighted mean and verbal interpretation from actual respondents.",
  ),
  table(
    ["Quality Characteristic", "Indicators", "Weighted Mean", "Interpretation"],
    [
      ["Functional Suitability", "Completeness, correctness, appropriateness", "[   ]", "[   ]"],
      ["Performance Efficiency", "Response time, resource use, capacity", "[   ]", "[   ]"],
      ["Compatibility", "Co-existence and interoperability", "[   ]", "[   ]"],
      ["Usability", "Learnability, operability, accessibility, error protection", "[   ]", "[   ]"],
      ["Reliability", "Availability, fault tolerance, recoverability", "[   ]", "[   ]"],
      ["Security", "Confidentiality, integrity, accountability, authenticity", "[   ]", "[   ]"],
      ["Maintainability", "Modularity, analyzability, modifiability, testability", "[   ]", "[   ]"],
      ["Portability", "Adaptability, installability, replaceability", "[   ]", "[   ]"],
      ["Overall", "Grand weighted mean", "[   ]", "[   ]"],
    ],
    [2200, 3600, 1400, 1400],
  ),
);

// Chapter V
children.push(
  heading("CHAPTER V. SUMMARY OF FINDINGS AND RECOMMENDATIONS", HeadingLevel.HEADING_1, true),
  heading("5.1 Summary of Findings", HeadingLevel.HEADING_2),
  para(
    "The requirements analysis identified a need for centralized registration, unique document identification, transparent routing, timely notifications, attachment management, retrieval, and auditability. Functional inspection confirms that the developed system implements the major modules required to address these needs. It captures incoming and outgoing documents, route histories, status transitions, assignments, attachments, dispatch information, employee records, and logs in an integrated interface.",
  ),
  para(
    "Final user-evaluation findings must be added after approved pilot testing. Report the number and profile of respondents, weighted mean for each ISO/IEC 25010 characteristic, overall mean, strongest and weakest indicators, observed task issues, and recurring qualitative feedback.",
  ),
  heading("5.2 Conclusions", HeadingLevel.HEADING_2),
  para(
    "The developed system demonstrates that BLGF Region II’s document workflow can be represented in a centralized web application with explicit roles, statuses, routing events, attachments, and audit information. The implementation is technically capable of supporting traceability and organized retrieval. Its organizational effectiveness, however, must be confirmed through controlled deployment, user evaluation, reliable infrastructure, and approved operating procedures.",
  ),
  para(
    "A defensible final conclusion regarding ISO/IEC 25010 compliance should be written only after actual evaluation data have been collected and analyzed. The present manuscript therefore treats compliance as an evaluation objective rather than an unsupported claim.",
  ),
  heading("5.3 Recommendations", HeadingLevel.HEADING_2),
  numbered("Conduct formal pilot testing with approved representatives from each relevant user group."),
  numbered("Enforce HTTPS, strong password practices, least-privilege accounts, session controls, and periodic access reviews."),
  numbered("Automate encrypted backups of both database records and attachment directories, and test restoration regularly."),
  numbered("Establish written rules for route-number issuance, metadata quality, status updates, retention, and disposition."),
  numbered("Provide user orientation, a designated support contact, and periodic refresher training."),
  numbered("Add automated tests, structured error monitoring, and deployment health checks before wider rollout."),
  numbered("Consider future integration with official email, digital signatures, retention schedules, and enterprise identity services subject to policy and budget."),
  numbered("Repeat ISO/IEC 25010 evaluation after major revisions and compare results over time."),
);

// Bibliography
children.push(
  heading("BIBLIOGRAPHY", HeadingLevel.HEADING_1, true),
  para("International Organization for Standardization. (2015). ISO 15489-1:2016 Information and documentation—Records management—Part 1: Concepts and principles.", { noIndent: true }),
  para("International Organization for Standardization. (2011). ISO/IEC 25010:2011 Systems and software engineering—Systems and software Quality Requirements and Evaluation (SQuaRE)—System and software quality models.", { noIndent: true }),
  para("National Archives of the Philippines. (n.d.). Government records management policies, standards, and guidance.", { noIndent: true }),
  para("Republic Act No. 8792. (2000). Electronic Commerce Act of 2000. Republic of the Philippines.", { noIndent: true }),
  para("Republic Act No. 10173. (2012). Data Privacy Act of 2012. Republic of the Philippines.", { noIndent: true }),
  para("Republic Act No. 11032. (2018). Ease of Doing Business and Efficient Government Service Delivery Act of 2018. Republic of the Philippines.", { noIndent: true }),
  para("Sommerville, I. (2016). Software Engineering (10th ed.). Pearson.", { noIndent: true }),
  para("Pressman, R. S., & Maxim, B. R. (2020). Software Engineering: A Practitioner’s Approach (9th ed.). McGraw-Hill.", { noIndent: true }),
  para("React Team. (n.d.). React documentation. https://react.dev/", { noIndent: true }),
  para("OpenJS Foundation. (n.d.). Node.js documentation. https://nodejs.org/", { noIndent: true }),
  para("Express.js. (n.d.). Express web framework documentation. https://expressjs.com/", { noIndent: true }),
  para("Oracle Corporation. (n.d.). MySQL reference manual. https://dev.mysql.com/doc/", { noIndent: true }),
);

// Appendices
children.push(
  heading("APPENDICES", HeadingLevel.HEADING_1, true),
  heading("Appendix A. Request Letter for Gathering Data", HeadingLevel.HEADING_2),
  para("[DATE]", { noIndent: true }),
  para("[NAME OF REGIONAL DIRECTOR / AUTHORIZED OFFICIAL]\n[POSITION]\nBureau of Local Government Finance – Region II\n[OFFICE ADDRESS]", { noIndent: true }),
  para("Dear Sir/Madam:", { noIndent: true }),
  para(
    "I am TOM TOM G. CATRAL, a student of [PROGRAM] at [SCHOOL]. I am conducting a study entitled “Web-Based Document Tracking and Records Management System for the Bureau of Local Government Finance – Region II.” In this connection, I respectfully request permission to gather non-confidential workflow requirements, consult authorized personnel, and conduct system testing and evaluation at your office.",
  ),
  para(
    "All information will be used solely for academic purposes and handled in accordance with applicable privacy, security, and office policies. No confidential document content will be reproduced in the manuscript without written authorization.",
  ),
  para("Respectfully yours,", { noIndent: true }),
  para("\nTOM TOM G. CATRAL\nResearcher", { noIndent: true }),
  heading("Appendix B. Request for Pilot Testing", HeadingLevel.HEADING_2, true),
  para("[DATE]", { noIndent: true }),
  para(
    "May I respectfully request permission to conduct pilot testing of the Web-Based Document Tracking and Records Management System with selected authorized personnel. The activity will involve task-based use of a controlled test environment and completion of an ISO/IEC 25010 questionnaire. Testing will use non-sensitive or expressly authorized sample data. Participation will be voluntary, and responses will be summarized without unnecessary personal identifiers.",
  ),
  para("Proposed schedule: [DATE / TIME]\nVenue or access method: [LOCATION / URL]\nEstimated duration: [MINUTES]", { noIndent: true }),
  para("Respectfully yours,\n\nTOM TOM G. CATRAL\nResearcher", { noIndent: true }),
  heading("Appendix C. Users Manual", HeadingLevel.HEADING_2, true),
  heading("C.1 Accessing the System", HeadingLevel.HEADING_3),
  numbered("Open the authorized system address in a supported web browser."),
  numbered("Enter the assigned username and password."),
  numbered("Select Login. Contact the administrator if the account is inactive or credentials are unavailable."),
  heading("C.2 Registering a Document", HeadingLevel.HEADING_3),
  numbered("Open Incoming Documents or Outgoing Documents."),
  numbered("Select the command to add/register a document."),
  numbered("Enter the unique Document Route Number and required metadata."),
  numbered("Choose priority, status, dates, sender/recipient, and initial assignment as applicable."),
  numbered("Attach only authorized files, review the entries, and submit."),
  heading("C.3 Routing and Acting on a Document", HeadingLevel.HEADING_3),
  numbered("Open the document details and verify its current status and history."),
  numbered("Select Route, Transfer, Receive, or the permitted action."),
  numbered("Choose the destination user/division, action required, remarks, and target date."),
  numbered("Confirm the transaction and verify that the new route appears in history."),
  heading("C.4 Search, Notifications, QR, and Slips", HeadingLevel.HEADING_3),
  numbered("Use list filters or search to locate a route number, subject, sender, recipient, or related metadata."),
  numbered("Open the notification bell to review documents requiring attention."),
  numbered("Use the QR module to generate or scan document-identifying information."),
  numbered("Open Document Slip, select the record, review the routing details, and print using the browser dialog."),
  heading("C.5 Administrative Functions", HeadingLevel.HEADING_3),
  numbered("Manage user accounts and roles only when authorized."),
  numbered("Review audit and outgoing-envelope logs for accountability."),
  numbered("Configure storage directories carefully and test file retrieval."),
  numbered("Export and back up the database according to the approved schedule."),
  heading("C.6 Basic Troubleshooting", HeadingLevel.HEADING_3),
  bullet("Refresh the page and confirm network connectivity if information does not load."),
  bullet("Verify route-number uniqueness when registration is rejected."),
  bullet("Check role permissions if a menu or action is unavailable."),
  bullet("Do not repeatedly submit the same transaction after an error; verify document history first."),
  bullet("Report persistent errors with the route number, time, action attempted, and a screenshot that contains no unnecessary sensitive data."),
  heading("Appendix D. ISO 25010 Questionnaire", HeadingLevel.HEADING_2, true),
  center("SYSTEM QUALITY EVALUATION QUESTIONNAIRE", {
    run: { bold: true, size: 26, color: navy },
    after: 120,
  }),
  para(
    "Research Title: Web-Based Document Tracking and Records Management System for the Bureau of Local Government Finance – Region II",
    { noIndent: true },
  ),
  para(
    "Purpose and Confidentiality. This questionnaire evaluates the developed system using the ISO/IEC 25010 software product-quality model. Participation is voluntary. Responses will be summarized for academic purposes and will not be used to identify individual respondents unnecessarily. Do not write passwords or confidential document contents on this form.",
    { noIndent: true },
  ),
  para(
    "Instructions. Complete the assigned pilot-testing tasks before answering. Read every statement and place exactly one check mark (✓) under 5, 4, 3, 2, or 1. Base each answer only on the system functions you actually used or verified. If clarification is needed, ask the researcher without disclosing passwords or confidential document contents.",
    { noIndent: true },
  ),
  heading("D.1 Respondent Profile", HeadingLevel.HEADING_3),
  para(
    "Privacy reminder: Do not write your name, username, password, personal contact details, or confidential document information. The researcher will assign the respondent code.",
    { noIndent: true },
  ),
  table(
    ["Information", "Response"],
    [
      ["Respondent Code", "____________________________     Date: ____________________________"],
      ["Position / Designation", "____________________________________________________________"],
      ["Division / Unit", "☐ ORD   ☐ AD   ☐ LTOD   ☐ LAOD   ☐ FD   ☐ LU   ☐ Other: __________"],
      ["Primary System Role", "☐ Administrator   ☐ Records Officer   ☐ Division Chief\n☐ Action Officer   ☐ Staff / Authorized User   ☐ Other: __________"],
      ["Length of Service", "☐ Less than 1 year   ☐ 1–5 years   ☐ 6–10 years   ☐ More than 10 years"],
      ["Document-Handling Frequency", "☐ Daily   ☐ Several times weekly   ☐ Weekly   ☐ Occasionally"],
      ["System-Use Experience", "☐ First-time/pilot user   ☐ Less than 1 month   ☐ 1–6 months   ☐ More than 6 months"],
      ["Pilot Modules Used", "☐ Login/dashboard   ☐ Registration   ☐ Routing/tracking\n☐ Search/QR/slip   ☐ Records/files   ☐ Administration/logs"],
    ],
    [2300, 6300],
  ),
  para(
    "Consent to participate: ☐ I voluntarily agree to participate in this system evaluation and understand that my responses will be reported in summarized form.",
    { noIndent: true },
  ),
  heading("D.2 Rating Scale", HeadingLevel.HEADING_3),
  table(
    ["Rating", "Response", "Meaning"],
    [
      ["5", "Strongly Agree", "The quality requirement is fully evident."],
      ["4", "Agree", "The quality requirement is generally evident."],
      ["3", "Neither Agree nor Disagree", "The respondent is uncertain or the result is mixed."],
      ["2", "Disagree", "The quality requirement is generally not evident."],
      ["1", "Strongly Disagree", "The quality requirement is not evident."],
    ],
    [1100, 2900, 4600],
  ),
  heading("D.3 System Quality Evaluation", HeadingLevel.HEADING_3),
  para(
    "Response columns: 5 – Strongly Agree; 4 – Agree; 3 – Neither Agree nor Disagree; 2 – Disagree; 1 – Strongly Disagree. Check one response per statement.",
    { noIndent: true },
  ),
  ...questionnaireTable("A. Functional Suitability", [
    "The system provides the functions needed to register incoming and outgoing documents.",
    "The system correctly records document status, routing history, assignments, dates, remarks, and attachments.",
    "Search, filtering, notifications, QR tools, routing slips, and logs support the intended office tasks.",
    "The available functions are appropriate for the responsibilities of my assigned user role.",
  ], 1),
  ...questionnaireTable("B. Performance Efficiency", [
    "The login, dashboard, document lists, and detail pages load within an acceptable time.",
    "Saving, routing, transferring, receiving, and completing a document respond within an acceptable time.",
    "Search and filtering return results promptly during normal use.",
    "The system remains responsive while processing the expected number of records and users.",
  ], 5),
  ...questionnaireTable("C. Compatibility", [
    "The system works correctly with the web browser and computer approved for office use.",
    "The system can upload, retrieve, display, or download supported document attachments correctly.",
    "Database export and stored records can be used with the approved office environment.",
  ], 9),
  ...questionnaireTable("D. Usability", [
    "The labels, icons, menus, forms, and status indicators are clear and understandable.",
    "I can learn the tasks relevant to my role with reasonable orientation.",
    "The steps for registering, routing, locating, and reviewing a document are easy to follow.",
    "Validation messages and confirmations help prevent or correct user errors.",
    "Text, controls, tables, and dialogs remain readable on the devices approved for office use.",
  ], 12),
  ...questionnaireTable("E. Reliability", [
    "The system is available and operates consistently during the evaluation period.",
    "Confirmed document transactions remain saved after refresh, logout, or subsequent login.",
    "The displayed status and routing history remain consistent with completed user actions.",
    "The system provides understandable feedback when an operation cannot be completed.",
  ], 17),
  ...questionnaireTable("F. Security", [
    "The system requires valid user credentials before protected information can be accessed.",
    "Users can view only the documents and functions permitted by their assigned roles.",
    "Routing history and audit logs identify accountable users and actions.",
    "The system handles document attachments and personal information with appropriate access controls.",
  ], 21),
  ...questionnaireTable("G. Maintainability", [
    "The system modules and error information allow technical personnel to identify affected functions.",
    "A change in one module can be introduced without unnecessary impact on unrelated functions.",
    "The system can be retested after corrections, configuration changes, or enhancements.",
  ], 25),
  ...questionnaireTable("H. Portability", [
    "The system can be installed and configured in the approved server environment.",
    "The application operates on current supported web browsers without requiring specialized client software.",
    "Database and file-storage settings can be adapted to an approved deployment environment.",
  ], 28),
  heading("D.4 Evaluation Summary (For Researcher Use)", HeadingLevel.HEADING_3),
  table(
    ["ISO/IEC 25010 Characteristic", "Item Numbers", "No. of Items", "Total Score", "Mean", "Interpretation"],
    [
      ["Functional Suitability", "1–4", "4", "", "", ""],
      ["Performance Efficiency", "5–8", "4", "", "", ""],
      ["Compatibility", "9–11", "3", "", "", ""],
      ["Usability", "12–16", "5", "", "", ""],
      ["Reliability", "17–20", "4", "", "", ""],
      ["Security", "21–24", "4", "", "", ""],
      ["Maintainability", "25–27", "3", "", "", ""],
      ["Portability", "28–30", "3", "", "", ""],
      ["Overall System Quality", "1–30", "30", "", "", ""],
    ],
    [2500, 1200, 1100, 1300, 900, 1800],
  ),
  para(
    "Computation: Mean per characteristic = total score for the characteristic ÷ number of answered items. Overall mean = total score for Items 1–30 ÷ 30. Do not compute a mean when an item is unanswered; return the form for completion whenever practical.",
    { noIndent: true },
  ),
  heading("D.5 Overall Assessment and Comments", HeadingLevel.HEADING_3),
  para("Overall, I am satisfied with the developed system.     ☐ 5   ☐ 4   ☐ 3   ☐ 2   ☐ 1", { noIndent: true }),
  para("Most useful feature(s):\n____________________________________________________________________\n____________________________________________________________________", { noIndent: true }),
  para("Problem(s) encountered:\n____________________________________________________________________\n____________________________________________________________________", { noIndent: true }),
  para("Suggested improvement(s):\n____________________________________________________________________\n____________________________________________________________________", { noIndent: true }),
  para("Respondent Signature (optional): _________________________", { noIndent: true }),
  heading("Appendix E. Source Code", HeadingLevel.HEADING_2, true),
  para(
    "The complete source code is maintained in the project repository. For printed submission, include only representative excerpts required by the institution; attach the full source electronically or provide repository access according to adviser and office approval.",
  ),
  table(
    ["Path", "Contents"],
    [
      ["frontend/src/", "React/TypeScript user interface, components, types, services, and utilities"],
      ["backend/server.ts", "Express API, workflow logic, storage, authentication, and data operations"],
      ["backend/schema.sql", "MySQL relational schema"],
      ["backend/utils/", "Database export and supporting utilities"],
      ["package.json", "Dependencies and build, development, lint, and start commands"],
      ["README.md", "Project structure and operating instructions"],
    ],
    [2600, 6000],
  ),
  para("Repository: https://github.com/TomCatral/blgfr2-doctract", { noIndent: true }),
  heading("CURRICULUM VITAE", HeadingLevel.HEADING_1, true),
  table(
    ["Field", "Information"],
    [
      ["Name", "TOM TOM G. CATRAL"],
      ["Address", "[COMPLETE ADDRESS]"],
      ["Email / Contact", "[EMAIL ADDRESS / CONTACT NUMBER]"],
      ["Program", "[DEGREE / PROGRAM]"],
      ["School", "[NAME OF SCHOOL / UNIVERSITY]"],
      ["Educational Background", "[DEGREE, SCHOOL, YEAR]"],
      ["Employment / Experience", "[POSITION, ORGANIZATION, YEARS]"],
      ["Training / Certifications", "[RELEVANT TRAINING OR CERTIFICATIONS]"],
      ["Technical Skills", "Web application development, document workflow analysis, database and records-system implementation"],
    ],
    [2600, 6000],
  ),
);

const doc = new Document({
  creator: "TOM TOM G. CATRAL",
  title: "Web-Based Document Tracking and Records Management System for BLGF Region II",
  subject: "Thesis Proposal",
  description: "Prepared thesis proposal/manuscript draft based on the implemented BLGF Region II system.",
  styles: {
    default: {
      document: {
        run: { font: "Century Gothic", size: 22, color: "000000" },
        paragraph: { spacing: { line: 360, after: 0 } },
      },
    },
    paragraphStyles: [
      {
        id: "Title",
        name: "Title",
        basedOn: "Normal",
        next: "Normal",
        run: { font: "Century Gothic", size: 22, bold: true, color: "000000" },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 0, line: 360 } },
      },
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: "Century Gothic", size: 22, bold: true, color: "000000", allCaps: true },
        paragraph: {
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0, line: 360 },
          keepNext: true,
          outlineLevel: 0,
        },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: "Century Gothic", size: 22, bold: true, color: "000000" },
        paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 0, line: 360 }, keepNext: true, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: "Century Gothic", size: 22, bold: true, italic: false },
        paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 0, line: 360 }, keepNext: true, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1800, right: 1016, bottom: 1440, left: 2132 },
        },
        titlePage: true,
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [txt("Page ", { size: 18 }), new TextRun({ children: [PageNumber.CURRENT], font: "Century Gothic", size: 18 })],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

fs.mkdirSync(outputDir, { recursive: true });
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outputFile, buffer);
console.log(outputFile);
