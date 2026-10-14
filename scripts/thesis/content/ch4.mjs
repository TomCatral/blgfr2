// Chapter IV. The Data Model and Table Design sections are generated from
// schema-tables.mjs and the module inventory in modules.mjs so that no field or
// endpoint can drift from the verified source.

import { TABLE_DESIGN, RELATIONSHIPS, DERIVED_VIEWS } from './schema-tables.mjs';
import { MODULES, ACCESS_MATRIX, ROLE_ACTION_KEYS } from './modules.mjs';

const bullets = (items) => items.map((text) => ({ t: 'b', text }));
const nums = (items) => items.map((text) => ({ t: 'n', text }));

function dataModelSections() {
  const out = [];
  out.push({ t: 'h4', text: '4.2.3.2.1 Data Environment' });
  out.push({
    t: 'p',
    text:
      'The data environment of the system is relational. Nine entities are declared in the Prisma schema and a tenth, system_settings, is created at runtime by the server for settings that fall outside the schema. Table 8 states the environment in which these entities exist.',
  });
  out.push({
    t: 'tab',
    cap: 'Table 8. Data Environment of the Developed System',
    head: ['Property', 'Description'],
    rows: [
      ['Data model', 'Relational'],
      ['Declared entities', '9 (divisions, users, documents, document_routes, document_attachments, audit_logs, envelope_logs, employee_profiles, directory_sections)'],
      ['Runtime-created entities', '1 (system_settings)'],
      ['Effective total', '10'],
      ['Primary key strategy', 'Application-generated VARCHAR(64) identifier on every entity'],
      ['Natural keys', 'users.username (unique), documents.tracking_number (unique), divisions.code (unique), employee_profiles.user_id (unique), system_settings.setting_key (primary)'],
      ['Referential strategy', 'Mixed by design: enforced foreign keys for document and account relations, logical references for log and attachment attribution (Table 11)'],
      ['Delete strategy', 'CASCADE from documents to routes and attachments so a document has no orphan steps; SET NULL for user references so history survives account removal'],
      ['Collation and engine', 'InnoDB, utf8mb4, utf8mb4_unicode_ci'],
      ['Temporal precision', 'DATETIME(3), millisecond precision, on all timestamps'],
      ['Access technology', 'Prisma 6.19 ORM over MySQL 8.4'],
      ['Fallback', 'JSON file persistence with reconciliation to the relational store'],
      ['File storage', 'Configured upload directories, with optional LongText payload inside the relational store'],
    ],
    w: [26, 74],
  });
  out.push({
    t: 'p',
    text:
      'Figure 8 is the entity relationship diagram. It shows the ten entities with their principal attributes, marks the enforced foreign keys, and distinguishes the logical references. It also records the two views that are computed rather than stored, described in Table 12.',
  });
  out.push({ t: 'fig', src: 'fig8-entity-relationship-diagram.png', cap: 'Figure 8. Entity Relationship Diagram of the Developed System', w: 9.0, land: true });

  out.push({ t: 'h4', text: '4.2.3.2.2 Data Entry' });
  out.push({
    t: 'p',
    text:
      'Data entry is described below per entity, in the order in which a record is normally created. Each entry path names the interface that supplies the data and the rule the server applies. Where an entity has no direct entry path, because it is written only by the application, that is stated rather than implied.',
  });

  out.push({ t: 'h4', text: '4.2.3.2.3 Data Description' });
  out.push({
    t: 'p',
    text:
      'The data description follows in Table 13. Each table states the field dictionary used to build Figure 8 and the Table Design in Section 4.2.3.3, so that the diagram, the description, and the physical design are derived from one source.',
  });
  out.push({
    t: 'tab',
    cap: 'Table 13. Field Properties per Entity',
    head: ['Entity', 'Field count', 'Key columns', 'Delete behaviour'],
    rows: TABLE_DESIGN.map((t) => [
      t.table,
      String(t.design.length),
      (t.indexes[1] || t.indexes[0]).replace('KEY ', '').replace('INDEX ', ''),
      t.table === 'documents'
        ? 'CASCADE to routes and attachments; SET NULL for user references'
        : t.table === 'document_routes' || t.table === 'document_attachments'
          ? 'CASCADE from documents'
          : 'No dependent table',
    ]),
    w: [26, 12, 34, 28],
  });

  return out;
}

function userViewSections() {
  const out = [];
  out.push({
    t: 'p',
    text:
      'The user\'s view describes each module as the user encounters it: what the module is for, who can reach it, what can be done in it, which interface operations serve it, and what it reads and writes. It is written from the interface outward rather than from the code inward, because the point of the section is to establish what the system offers a user.',
  });
  out.push({
    t: 'tab',
    cap: 'Table 9. Modules of the Developed System',
    head: ['No.', 'Module', 'Component', 'Purpose'],
    rows: MODULES.map((m) => [m.no, m.nav, m.component, m.purpose]),
    w: [6, 20, 30, 44],
    fs: 15,
  });

  for (const m of MODULES) {
    out.push({ t: 'h5', text: `4.2.3.1 Module ${m.no}: ${m.nav}` });
    out.push({ t: 'p', text: `Purpose. ${m.purpose}` });
    out.push({ t: 'p', text: `Access. ${m.roles}.` });
    out.push({ t: 'p', text: `Operations. ${m.actions.join('; ')}.` });
    out.push({
      t: 'p',
      text: `Interface operations. ${m.endpoints.map((e) => e.split(' ')[0] + ' ' + e.split(' ')[1]).join('; ')}.`,
    });
    out.push({ t: 'p', text: `Data environment. ${m.env}` });
    for (const f of m.figures) {
      out.push({
        t: 'fig',
        src: f,
        cap: `Figure 9.${m.no} ${m.nav} Interface (${f.split('/').pop().replace('.png', '').replace(/-/g, ' ')})`,
        w: 5.9,
        raw: f,
      });
    }
  }

  out.push({ t: 'h4', text: '4.2.3.1.8 Access Control in the User Interface' });
  out.push({
    t: 'p',
    text:
      'Access in the interface is expressed through seven roles defined in Table 10. The navigation definition marks the User Accounts view as administrator-only and gates the Routing Follow-up view behind the routing-monitor permission, so a role without that permission does not see the entry at all. Other restrictions are expressed by omitting an action from a menu or disabling a control.',
  });
  out.push({
    t: 'p',
    text:
      'Table 10 must be read with the finding in Section 5.1. Hiding a control is a usability measure, not an authorization measure. Document visibility, by contrast, is genuinely enforced, because it is applied in the query layer on every document read and no role bypass exists for it. This distinction is the reason the interface in this section cannot by itself establish compliance, and it is the basis of the first recommendation in Section 5.3.',
  });
  out.push({
    t: 'tab',
    cap: 'Table 10. Role Definitions Implemented in the System',
    head: ['Role', 'May delete', 'May view full routing trail', 'Interface scope', 'Granular actions'],
    rows: ACCESS_MATRIX,
    w: [20, 10, 16, 40, 14],
    fs: 15,
  });
  out.push({
    t: 'p',
    text:
      'Fifteen granular action keys are defined and assigned per role: ' + ROLE_ACTION_KEYS.join(', ') + '. A role may hold an action key without holding the corresponding view, and the two sets are evaluated independently.',
  });
  return out;
}

function tableDesignSections() {
  const out = [];
  out.push({
    t: 'p',
    text:
      'The table design states, for each entity, the fields it holds, the properties of each field, and a plain description of what the field means. Properties are given as the key status, the storage type with its length, and whether the field accepts a null value, as read from the schema declaration and from the runtime table creation statement. No field below is inferred.',
  });
  let n = 14;
  for (const t of TABLE_DESIGN) {
    out.push({ t: 'h5', text: `4.2.3.3.${n - 13} ${t.table}` });
    out.push({ t: 'p', text: `Table: ${t.purpose}` });
    out.push({
      t: 'tab',
      cap: `Table ${n}. ${t.table} Table Design`,
      head: ['Entity', 'Field', 'Properties', 'Description'],
      rows: t.design,
      w: [20, 20, 24, 36],
      fs: 15,
    });
    out.push({
      t: 'tab',
      cap: `Table ${n + 1}. ${t.table} Keys and Entry Path`,
      head: ['Property', 'Value'],
      rows: [
        ['Keys and indexes', t.indexes.join('; ')],
        ['Entry path', t.sources],
        [
          'Referenced by',
          RELATIONSHIPS.filter((r) => r[0].startsWith(t.table + '.') || r[1].startsWith(t.table + '.'))
            .map((r) => `${r[0]} to ${r[1]} (${r[3].toLowerCase()})`)
            .join('; ') || 'None',
        ],
      ],
      w: [24, 76],
    });
    n += 2;
  }
  return out;
}

export const CH4 = {
  title: 'CHAPTER IV. RESULTS AND DISCUSSIONS',
  sections: [
    { t: 'h2', text: '4.1 Problems Encountered in the Existing System' },
    { t: 'p', text:
      'The existing process was documented through the logbooks, routing slips, and document forms of BLGF Region II and through structured interviews with records, division, and administration personnel, as described in Section 3.9. The problems below are reported as observed. Each is stated together with the consequence observed, because a problem that produces no operational effect would not justify an application feature.' },
    { t: 'tab', cap: 'Table 4. Problems Observed in the Existing Process', head: ['No.', 'Observed condition', 'Operational consequence', 'Feature that addresses it'], rows: [
      ['1', 'Document location is confirmed by locating the paper or by asking the holder.', 'Answering where a document is depends on the holder being reachable, and an unanswered request leaves the document unlocated.', 'Central document list and dashboard, searchable by tracking number, status, direction, and priority.'],
      ['2', 'A routing reference exists but can be altered or reused when a paper is endorsed outside the originating office.', 'The numbering no longer identifies one document, so history and accountability become unreliable.', 'Permanent tracking number never reissued, controlled route-number pattern, and server-side rejection of duplicates.'],
      ['3', 'Movement is recorded on the paper itself.', 'The history exists only where the paper is, so a lost or misfiled document also loses its history.', 'A document_routes row per movement, retained independently of the paper.'],
      ['4', 'Completion is confirmed verbally or by returning the paper.', 'There is no record that the requested action was completed, or when.', 'Decision, transfer, and completion actions that set the status and write a routing row with status before and after.'],
      ['5', 'Pending work is known only to the person holding it.', 'Work that stalls is not visible to the office, so it cannot be followed up.', 'Notifications derived from logs and routes, plus a Routing Follow-up view showing elapsed time against the target date.'],
      ['6', 'Attachments travel separately from the document record.', 'A supporting file cannot be tied to the document or to the step that required it.', 'Attachments linked to a document and optionally to a specific routing step.'],
      ['7', 'Report preparation is manual and is recompiled each time.', 'Reporting consumes staff time and different compilers produce different totals.', 'Incoming, outgoing, and envelope reports computed from the stored records.'],
      ['8', 'A paper-based trail does not record who accessed or altered what.', 'Disputes and irregularities cannot be investigated after the fact.', 'audit_logs and envelope_logs capturing account, name, role, action, tracking number, detail, network address, and time.'],
      ['9', 'Printing and physical preparation of slips and envelopes are repetitive.', 'Slip and envelope preparation is slow and inconsistent between operators.', 'Routing Slip and Outgoing Envelope views that produce the printable output from stored data.'],
      ['10', 'Personnel and office details are held in separate lists.', 'Recipients must be looked up before routing, and directory data drifts.', 'Office Directory with employee profiles, office-type groupings, and employee folders.'],
    ], w: [5, 27, 30, 38], fs: 15 },
    { t: 'p', text:
      'Two conditions were observed but deliberately not solved. First, the office has no delegated authority to approve records disposition, so the system records and retains history but never disposes of it. Second, documents handed to another agency leave the office\'s control at the point of handoff; the system records the sending office\'s portion and cannot record what happens afterwards. Both are stated as delimitations in Section 1.5 rather than presented as solved.' },

    { t: 'h2', text: '4.2 The Developed System' },
    { t: 'p', text:
      'The developed system is a web application that centralizes the document lifecycle of BLGF Region II. The remainder of this section describes it in the order prescribed by the methodology: the hierarchical decomposition, the detailed input-process-output, the data model, the user\'s view, and the table design.' },

    { t: 'h3', text: '4.2.1 Hierarchical Input-Process-Output (HIPO)' },
    { t: 'p', text:
      'Figure 6 presents the hierarchical decomposition. Level 0 states the system as a whole: it receives document, personnel, account, and configuration data, processes the document lifecycle and the supporting records, and produces registered documents, routing histories, notifications, printable output, reports, and logs. Level 1 divides the system into the four modules that carry distinct responsibilities: document management, directory and personnel, dispatch and printing, and administration and reporting. Level 2 further divides each of these into the routines the user actually invokes. The Level 2 input-process-output table beneath the diagram states the routine, its inputs, its processes, and its outputs.' },
    { t: 'fig', src: 'fig6-hipo-diagram.png', cap: 'Figure 6. Hierarchical Input-Process-Output Diagram of the Developed System', w: 6.5 },
    { t: 'p', text:
      'The decomposition follows the office\'s own vocabulary rather than the interface\'s. A document is registered, routed, received, acted upon, transferred, and completed; the modules exist to serve those steps, and a module was added only where a distinct set of responsibilities existed. This is why the office directory and the employee folder manager are separate modules, while the incoming and outgoing lists share one component: they differ only by a direction filter, and separating them would have duplicated the workflow without adding a capability.' },

    { t: 'h3', text: '4.2.2 Input-Process-Output (IPO) Diagram' },
    { t: 'p', text:
      'Figure 7 expands the Level 2 routines and states, for each, the input that triggers it, the processing rule it applies, the output it produces, and the tables it affects. The fourteen routines are the complete set of user-invocable operations, so the figure also serves as a completeness check against the module inventory in Table 9: every routine in Figure 7 belongs to a module in Table 9, and every module in Table 9 appears in Figure 7.' },
    { t: 'fig', src: 'fig7-ipo-diagram.png', cap: 'Figure 7. Input-Process-Output Diagram of the Developed System', w: 6.5 },
    { t: 'p', text:
      'The figure records which routines write. Registration writes to documents; routing, multi-routing, transfer, and decision write to documents and to document_routes; attachment upload writes to document_attachments; account and division administration write to users and divisions; and every administrative action writes to audit_logs. A user can therefore trace any change to the document record back to the routine that caused it and from there to the log entry that recorded it.' },

    { t: 'h3', text: '4.2.3 Entity Relationship Diagram (ERD)' },
    { t: 'p', text:
      'The entity relationship diagram appears as Figure 8 within Section 4.2.3.2.1, with the data environment it describes. It is presented there rather than here because the diagram, the data environment statement, the data entry description, and the data description are one argument: the entity set, where it exists, how it is populated, and what each field means. Placing the figure immediately before those statements avoids restating the same fields twice.' },

    ...userViewSections(),

    { t: 'h3', text: '4.2.3 Data Model' },
    ...dataModelSections(),
    {
      t: 'tab',
      cap: 'Table 11. Relationships in the Data Model',
      head: ['From', 'To', 'Cardinality', 'Integrity', 'Delete rule'],
      rows: RELATIONSHIPS,
      w: [24, 20, 14, 12, 30],
      fs: 15,
    },
    { t: 'p', text:
      'The integrity column of Table 11 records an intentional asymmetry. Document and account relations are enforced by database foreign keys so that a document can never reference a deleted account or a missing parent document. Log and attachment attribution is logical, because audit evidence must survive the deletion of the document or the account it refers to; an enforced cascade there would destroy the very record that exists to explain the deletion.' },
    {
      t: 'tab',
      cap: 'Table 12. Views Computed at Request Time Rather Than Stored',
      head: ['View', 'Served by', 'Basis'],
      rows: DERIVED_VIEWS,
      w: [22, 26, 52],
    },
    { t: 'p', text:
      'The derived notifications deserve emphasis because they affect how the ERD is read. There is no notification table, and the absence is deliberate. Notifications are computed when they are requested from audit_logs and document_routes, filtered to the signed-in user, and the response states its origin in the X-Notification-Source header. A consequence is that a notification cannot be stored and therefore cannot be marked as permanently read in the database; acknowledgement is per request. A second consequence is that notification text is reconstructed from events rather than composed at the time of the event, which is why the wording of a notification follows the wording of the log detail that produced it.' },

    { t: 'h3', text: '4.2.3.3 Table Design' },
    ...tableDesignSections(),

    { t: 'h2', text: '4.3 The Extent of Compliance of the Developed System to ISO 25010 Software Quality Standards' },
    { t: 'p', text:
      'This section reports what has been established and what has not. The eight characteristics of ISO/IEC 25010:2023 are used as the framework. For each characteristic the section states what was examined, what evidence was obtained, and what status the evidence supports. Status values are Conformance established, Partially established, and Awaiting measurement. No characteristic is rated by questionnaire in this study, and no composite quality score is reported, because no responses have been collected.' },

    { t: 'h3', text: '4.3.1 Functional Suitability' },
    { t: 'p', text:
      'Functional suitability was assessed by exercising each of the fifteen modules in Table 9 against the operations recorded for it, and by confirming that each documented operation is reachable in the interface and is implemented in the application layer rather than only in the presentation layer. The completeness of the decomposition was checked in both directions, by confirming that every routine in Figure 7 belongs to a module in Table 9 and that every module appears in Figure 7. The document lifecycle was traced end to end: registration produced a tracking number, routing wrote a routing row and changed the status, decision and transfer recorded the responsible party, completion closed the record, and every administrative action produced a log entry. This characteristic is reported as conformance established on the basis of functional inspection; it is a statement about coverage of the requirements, not about performance under load.' },

    { t: 'h3', text: '4.3.2 Performance Efficiency' },
    { t: 'p', text:
      'No performance measurement has been recorded, so this characteristic is awaiting measurement. The timing procedure defined in Section 3.7 covers six tasks, namely registering an incoming document, routing to one recipient, routing to multiple recipients, recording a decision, transferring custody, and locating a document from the list and from its QR code. Two structural observations are reported in the meantime, because they bound what a future measurement should expect. Document lists are queried with filters on status, direction, priority, and assigned account, and are indexed on assigned_user_id and created_by_user_id, which are the columns those filters and the visibility rule use. Routing history is retrieved by document_id, which is indexed, so reading the history of one document does not require a scan. A document list without filters returns the full set for the visible documents, and no pagination is applied, which is a likely limitation at the record volumes of a mature deployment and should be measured first.' },

    { t: 'h3', text: '4.3.3 Compatibility' },
    { t: 'p', text:
      'Compatibility is reported as conformance established for the browser and platform scope defined in Section 3.5, and not beyond it. The client is a single-page application using standard web platform features, and the layout is defined to reflow for narrow viewports and to render in a dark theme; the responsive and dark-mode states are documented in Appendix C and evidenced by the interface figures. The interface was designed with keyboard operability, sufficient contrast, and programmatic labels in mind, and the layout reflows rather than scrolling horizontally at narrow widths, which are the accessibility provisions most relevant to an office environment where personnel may have impaired vision (World Wide Web Consortium, 2018). The scope is bounded: the application is exercised through a current Chromium-based, Firefox, or Safari browser over the office network, and it is deployed behind a reverse proxy that terminates TLS. Compatibility with legacy browsers, with Internet Explorer, with mobile operating systems as a primary workplace device, or with an offline environment is not claimed, and no such test has been performed.' },

    { t: 'h3', text: '4.3.4 Interaction Capability' },
    { t: 'p', text:
      'This characteristic is awaiting measurement, because it depends on users performing tasks rather than on inspection. The interface provides a consistent application shell with a navigation menu, a header carrying the signed-in identity and notifications, and a notification drawer; lists share one search and filter pattern; and the routing slip and envelope outputs reuse the same data as the on-screen views so that the printed record cannot diverge from the stored record. These are design decisions that a usability evaluation can confirm or refute, and the instrument in Appendix D is the means of doing so. No usability score is reported here.' },

    { t: 'h3', text: '4.3.5 Reliability' },
    { t: 'p', text:
      'Reliability is partially established. The following were verified. Every accepted lifecycle action is written with the status before and the status after, so a partially applied transition can be detected by inspection of the stored rows. A tracking number and a route number are rejected on the server when they duplicate an existing one, so the numbering cannot silently collide. A failed workflow transition is refused rather than partially applied. Envelope dispatch is recorded separately from document status, so an incomplete dispatch is distinguishable from a completed document. Recovery is the part that is not established: backup and restore have not been exercised, and the absence of a tested backup is recorded as a limitation of the deployed configuration rather than as a property of the application.' },

    { t: 'h3', text: '4.3.6 Security' },
    { t: 'p', text:
      'Security is partially established, and the two unresolved items are the most consequential findings of the whole evaluation. Three weaknesses were identified in the delivered system.' },
    ...bullets([
      'Authorization is not enforced at every endpoint. The role and action-key check protects user, division, and deletion operations, but the records, storage, statistics, employee, directory-section, and log-deletion endpoints do not each verify the caller\'s permission on every request. The interface hides these operations from unauthorized roles, which is a usability measure rather than an authorization measure, so a direct request may succeed where the interface would have prevented it.',
      'Passwords are stored and compared in plaintext. The users.password column holds the submitted value and the verification routines compare against it directly. This contradicts the security obligation of the Data Privacy Act of 2012 and the mitigation guidance of the OWASP Foundation (2021a), and it is aggravated by the existence of a database export function in the same application.',
      'Request-level protections are incomplete. Session handling, upload validation, and file retrieval authorization were not verified to a standard sufficient to claim conformity, and the file-retrieval route deserves specific attention because its authorization could not be confirmed to follow the document-visibility rule. The established security controls for this class of application treat authentication, session management, access control, and cryptographic failures as distinct concerns requiring separate verification (OWASP Foundation, 2021b; Joint Task Force, 2020), and credential handling in particular requires that passwords be neither stored in recoverable form nor transmitted in the clear (Grassi & Garcia, 2017).',
    ]),
    { t: 'p', text:
      'The following were verified. Authentication requires a valid account, an account may be deactivated without deletion, and a temporary password carries an expiry enforced at the forced password-setup step, which is consistent with established guidance on credential lifecycle management (Grassi & Garcia, 2017). Document visibility is enforced in the query layer and limits a document to its creator, its current recipient, and the users who routed it, with no role bypass, and the legacy canViewAllDocuments flag grants no visibility. Administrative actions are written to audit_logs and envelope_logs with the acting account, display name, role, action, related tracking number, narrative detail, network address, and millisecond timestamp, and those records are not removed when a document or account is deleted. Because two of the three weaknesses are unresolved, this characteristic is reported as partially established and not as conformance.' },

    { t: 'h3', text: '4.3.7 Maintainability' },
    { t: 'p', text:
      'Maintainability was assessed by inspection and is reported as conformance established for the matters inspected. The client is separated into page components, modal components, shell components, shared utility modules, and services, so that a change to a page does not require editing the shell. Shared helpers for document status, visibility, progress, recipient flow, attachment visibility, and routing recipients hold the business rules in one place rather than duplicating them in templates. The server separates the application entry point, the document router, the user router, the mail service, the PDF generator, and the persistence replica. The data model is declared once in the Prisma schema and the types are declared once in the shared type module, so that a field change has a single origin. Counters, labels, and status colours are derived from configuration rather than repeated per view.' },
    { t: 'p', text:
      'Two maintenance weaknesses were observed. The client and the server maintain their own copies of the document and user shapes, so a field added to one must be added to the other; this duplication is precisely the risk that a single-schema contract is intended to remove, and consolidating the shapes into one generated package rather than maintaining both by hand is the corresponding remedy (Richardson, 2018; Newman, 2021; Sadalage & Fowler, 2020). The second weakness is that the bundled browser API file duplicates a large part of the server surface, which invites editing the wrong copy and was explicitly excluded as a source of truth in the course of this study. Beyond these two, the separation of concerns follows established practice for this class of system, in which transport, routing, and persistence are separated so that a change in one does not require altering another (Ford et al., 2020; Richards & Ford, 2020); the observed difficulty arose from the duplicated shapes rather than from that separation. The client-server deployment itself follows the same practice of isolating runtime concerns behind a stable interface (Fowler & Highsmith, 2018), and the API is implemented as conventional HTTP request and response semantics over JSON (Fielding & Reschke, 2014).' },

    { t: 'h3', text: '4.3.8 Flexibility' },
    { t: 'p', text:
      'Flexibility is established by inspection and by the configurability the interface exposes. Configurable items are the role permission set and the fifteen granular action keys, the per-account permission override, the division records and their codes, the workflow option values, the office-type groupings and their order and colour in the directory, the login background, the colour theme, and the storage directories and their file categories. Adding a document category, a division, an office type, or a directory grouping requires no code change. The declared limitations are that the role set and the action keys are fixed in the permission structure and cannot be created from the interface, and that notifications cannot be composed at the event time because they are derived rather than stored.' },

    { t: 'h3', text: '4.3.9 Summary of Conformance' },
    {
      t: 'tab',
      cap: 'Table 15. Extent of Conformance to ISO/IEC 25010 Characteristics',
      head: ['Characteristic', 'Evidence obtained', 'Status'],
      rows: [
        ['Functional suitability', 'All fifteen modules exercised; documented operations confirmed implemented in the application layer; lifecycle traced end to end; decomposition checked in both directions', 'Conformance established'],
        ['Performance efficiency', 'Index usage on the filtered and visibility columns identified; no measurement recorded; unpaginated list identified as the first item to measure', 'Awaiting measurement'],
        ['Compatibility', 'Responsive and dark-theme states documented; browser and network scope defined in Section 3.5; legacy and offline environments excluded and untested', 'Conformance established within the stated scope'],
        ['Interaction capability', 'Consistent shell, shared list pattern, printed output derived from stored data; no usability evaluation recorded', 'Awaiting measurement'],
        ['Reliability', 'Transitions written with status before and after; duplicate numbers rejected server-side; failed transitions refused; untested backup and restore identified', 'Partially established'],
        ['Security', 'Authentication, account deactivation, temporary-password expiry, query-layer document visibility, and audit logging verified; authorization not enforced at every endpoint; passwords stored and compared in plaintext; request-level protections unverified', 'Partially established'],
        ['Maintainability', 'Layered client and server structure, shared rule modules, single-source schema and types, configuration-derived labels; duplicated client-server shapes and a redundant bundled API file observed', 'Conformance established for the matters inspected'],
        ['Flexibility', 'Fifteen configurable items verified as changeable without code; fixed role set and action keys, and derived-notification wording, identified as constraints', 'Conformance established within the stated scope'],
      ],
      w: [20, 56, 24],
      fs: 15,
    },
    { t: 'p', text:
      'Of the eight characteristics, three are established for the matters inspected, two are established within a stated scope, two are partially established, and one awaits measurement. The two partially established characteristics are the two that a functional demonstration would most easily appear to satisfy, which is the principal methodological conclusion of this section. The questionnaire in Appendix D is the instrument for the three characteristics that remain outstanding, and the procedure that must be followed before any of them can be reported is stated in Sections 3.7 and 5.3.' },
  ],
};
