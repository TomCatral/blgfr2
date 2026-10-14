// Chapters I, II, III and V.
// Every technical claim traces to the repository; no respondent data is invented.

export const CH1 = {
  title: 'CHAPTER I. THE PROBLEM AND ITS BACKGROUND',
  sections: [
    { t: 'h2', text: '1.1 Introduction' },
    { t: 'p', text:
      'Regional government offices receive and release a continuous volume of official papers. These include memoranda, endorsements, letters, requests, reports, circulars, financial submissions, personnel actions, and the attachments that accompany them. Before an action is completed, a document commonly passes through several offices and several individuals. Each transfer has to answer four questions: where is the document now, who is holding it, what action is expected, and whether the required action has already been completed.' },
    { t: 'p', text:
      'The Regional Bureau of Local Government Finance (BLGF) Region II answers these questions in a paper-based records operation. Document identification is written in logbooks, movement is recorded in routing slips and signature spaces, and confirmation that an action was completed depends on physically locating the paper or on a verbal report from the person concerned. Because the confirmation is not a queryable record, the ability to answer the first question is uneven, and the second and third questions can only be answered by the office that physically holds the paper.' },
    { t: 'p', text:
      'Records management is broader than storage. It covers the controlled creation, receipt, classification, routing, use, retention, retrieval, and disposition of records. An electronic records system is therefore not justified merely by moving a logbook into a database. Its value depends on whether the office can rely on a single identifier for every document, whether each movement is recorded as an event, and whether the resulting history can be reviewed later as evidence of what happened and who caused it. This distinction is central to the present study, because it determined which modules were built and which were deliberately left out.' },
    { t: 'p', text:
      'This study documents the analysis, design, development, and evaluation of a web-based document tracking and management system for BLGF Region II. The application registers incoming and outgoing documents, assigns a permanent tracking number and a controlled route number, records routing, multi-routing, transfer, receipt, decision, and completion events, keeps attachments, generates notifications, maintains the office directory and employee records, produces routing slips, records outgoing-envelope dispatch, generates QR codes, and retains audit and envelope logs. Access is controlled by seven organizational roles, and document visibility is restricted to the creator, the current recipient, and the users who routed the document.' },
    { t: 'p', text:
      'The system was built around the office workflow rather than as a general-purpose file repository. The development follows an iterative and incremental model, and the evaluation combines technical conformance evidence with a ready-to-administer ISO/IEC 25010 questionnaire addressed to authorized personnel. No user-acceptance score is reported in this study because no questionnaire responses have yet been collected; Section 4.3 therefore presents the instrument, the procedure, and the verifiable system-side evidence, and identifies the measurement that remains outstanding.' },

    { t: 'h2', text: '1.2 Conceptual Framework' },
    { t: 'p', text:
      'Figure 1 expresses the study using the Input-Process-Output model. The model is appropriate because the study has an identifiable resource set, a defined set of development and evaluation activities, and a set of outputs that can be inspected independently of the researchers’ claims.' },
    { t: 'fig', src: 'fig1-conceptual-framework.png', cap: 'Figure 1. Conceptual Framework of the Study', w: 6.5 },
    { t: 'h3', text: '1.2.1 Input' },
    { t: 'p', text:
      'The inputs are of three kinds. Organizational inputs consist of the observed document-handling practice of BLGF Region II, the route numbers and metadata that staff record, the available user roles and division assignments, and the delays, misplacements, duplicate entries, and unclear custody identified during the study. Technical inputs consist of the functional and access requirements derived from those observations, the data definitions in Section 4.2.3.2, the hardware and software environment in Section 3.5, and the ISO/IEC 25010 product-quality characteristics used as the evaluation basis.' },
    { t: 'h3', text: '1.2.2 Process' },
    { t: 'p', text:
      'The process component contains the development activity and the evaluation activity. Development uses an iterative and incremental model. The first increment established authentication, password setup, divisions, and incoming and outgoing registration with permanent number assignment. Later increments added routing, multi-routing, transfer, decision recording, completion, attachments, notifications, routing slips, outgoing-envelope recording, reports, the office directory, QR generation, audit and envelope logs, storage configuration, and the user and role manager. Every increment was analyzed, implemented, exercised against the running application, and corrected before the next increment was accepted.' },
    { t: 'p', text:
      'The evaluation activity is separate from development. It consists of functional inspection of the delivered modules, access-control testing against the seven role definitions, task-based verification of the document lifecycle, and the administration of the ISO/IEC 25010 questionnaire to authorized personnel. Evaluation findings are reported as evidence, and anything not yet measured is reported as outstanding rather than estimated.' },
    { t: 'h3', text: '1.2.3 Output' },
    { t: 'p', text:
      'The system output is the deployed application and its supporting documentation. The organizational outputs are a single searchable record set, a retained routing history for every document, an accountable record of each administrative action, and a measurable basis for monitoring pending work. The evaluative outputs are the technical conformance summary in Section 4.3, the questionnaire instrument, the user manual, and the recommendations in Section 5.3.' },

    { t: 'h2', text: '1.3 Research Paradigm' },
    { t: 'p', text:
      'Figure 2 states the research paradigm. Where the conceptual framework shows how resources become outputs, the paradigm identifies the evidence that is actually collected and the claims each piece of evidence can support. This distinction is maintained throughout Chapter IV so that no conclusion exceeds the evidence behind it.' },
    { t: 'fig', src: 'fig2-research-paradigm.png', cap: 'Figure 2. Research Paradigm of the Study', w: 6.5 },
    { t: 'p', text:
      'Three evidence classes appear in the paradigm. First, requirement evidence drawn from the existing workflow, which supports the problem statement and the objectives. Second, implementation evidence drawn from the running application, which supports the description of what the system does and how its data is structured. Third, evaluation evidence, which consists of functional and access-control test results and, once administered, the ISO/IEC 25010 respondent ratings. Conclusions about speed, accuracy, or user satisfaction require the third class and are therefore withheld until the questionnaire is completed.' },

    { t: 'h2', text: '1.4 Objectives of the Study' },
    { t: 'h3', text: '1.4.1 General Objective' },
    { t: 'p', text:
      'To design, develop, and evaluate a web-based document tracking and management system that supports the secure, timely, and traceable processing of official documents at BLGF Region II.' },
    { t: 'h3', text: '1.4.2 Specific Objectives' },
    { t: 'n', text: 'To document the existing practices and the problems encountered in registering, routing, monitoring, retrieving, and storing official documents at BLGF Region II.' },
    { t: 'n', text: 'To develop a centralized application for incoming and outgoing document registration with permanent tracking numbers and controlled route numbers.' },
    { t: 'n', text: 'To implement the document workflow through routing, multi-routing, transfer, receipt, decision, and completion actions with a retained status history.' },
    { t: 'n', text: 'To implement role-based access control covering seven organizational roles, and to restrict document visibility to the creator, the current recipient, and the routing users.' },
    { t: 'n', text: 'To support attachments, notifications, routing slips, outgoing-envelope recording, reports, the office directory, employee folders, QR code generation, audit logs, and envelope dispatch logs.' },
    { t: 'n', text: 'To provide user and role administration, division maintenance, storage configuration, and database export.' },
    { t: 'n', text: 'To evaluate the developed system against the ISO/IEC 25010 product-quality characteristics.' },
    { t: 'n', text: 'To recommend operational and technical improvements based on the evaluation results and on the limitations identified in this study.' },

    { t: 'h2', text: '1.5 Scope and Delimitation of the Study' },
    { t: 'p', text:
      'The study is confined to the document lifecycle that the implemented application supports. The covered functions are authentication and forced password setup; division and user administration; incoming and outgoing registration; permanent tracking numbers and controlled route numbers; routing, multi-routing, transfer, receipt, decision, and completion; statuses and priorities; attachments; notifications; searchable lists and dashboard summaries; routing slips; outgoing-envelope recording and dispatch logs; the three reports; the office directory with employee profiles and employee folders; QR code generation; audit logs; configurable storage directories; and database export.' },
    { t: 'p', text:
      'The study is limited to the personnel and transactions of BLGF Region II and is exercised through a networked web browser on the office local area network. The deployment under study uses the Node and Express application server with MySQL 8.4 as the persistent store and a JSON file fallback for supported local installations. Uploads are handled by Multer and written to configured directories, with an option to store file payloads inside the database as long text.' },
    { t: 'p', text:
      'The following are expressly excluded. The study does not implement digital signatures or a PKI trust service, so a signature recorded in the system is an attestation by the recording user and is not cryptographically verifiable. It does not implement national records disposition schedules, retention calendars, or legal holds. It does not replace an enterprise content-management platform, and it provides no external public portal; all access is by authenticated office account. It does not implement inter-agency document exchange or integration with existing national systems. Multi-office or multi-region deployment is not evaluated. Finally, no claim is made about productivity, turnaround time, or user satisfaction until the ISO/IEC 25010 questionnaire and the timing measurements described in Section 4.3 have been administered and collected.' },

    { t: 'h2', text: '1.6 Significance of the Study' },
    { t: 'p', text:
      'The study is expected to benefit the following stakeholders.' },
    { t: 'b', text: 'BLGF Region II management. Consolidated and queryable status information supports oversight, workload monitoring, and identification of bottlenecks.' },
    { t: 'b', text: 'Records and administrative personnel. Centralized registration, route-number uniqueness checking, storage, search, and retained routing history reduce repeated encoding and manual follow-up.' },
    { t: 'b', text: 'Division chiefs and staff. Notifications, follow-up monitoring, and visible status clarify assigned actions, target dates, and responsibility for action.' },
    { t: 'b', text: 'Partner LGUs and client offices. More consistent internal handling and visible status support faster and more predictable response.' },
    { t: 'b', text: 'System administrators. Role and permission management, division maintenance, storage configuration, audit trails, envelope dispatch logs, and database export provide controlled operation and recoverable data.' },
    { t: 'b', text: 'Future researchers and developers. The study provides a documented reference for a workflow-oriented records system implemented in a public-sector setting, including its data model, its permission scheme, and its identified weaknesses.' },

    { t: 'h2', text: '1.7 Definition of Terms' },
    { t: 'kv', head: ['Term', 'Operational Definition in This Study'], rows: [
      ['Audit Trail', 'The chronological record written to audit_logs and envelope_logs identifying the account, name, role, action, related tracking number, detail, network address, and time of each administrative activity.'],
      ['Controlled Route Number', 'The office-assigned number following the pattern BLGFR2-YYYY-MM-IN|OUT-NN, in which IN denotes incoming, OUT denotes outgoing, and NN is a permanent non-repeating sequence.'],
      ['Derived Notification', 'A notification computed at request time from audit_logs and document_routes for the signed-in user rather than read from a notification table. The response carries the X-Notification-Source header.'],
      ['Division', 'One of the organizational units coded ITMS, ORD, AD, LAOD, LTOD, FD, or LU, recorded in divisions and referenced logically by users and documents.'],
      ['Document Status', 'One of NOT_YET_ROUTED, PENDING, IN_PROGRESS, FOR_SIGNATURE, COMPLETED, RETURNED, or ON_HOLD, stored as documents.current_status and recorded per step in document_routes.'],
      ['Employee Folder', 'A per-employee collection of file links maintained in the employee_profiles.folders JSON field and managed through the Employee Folder Manager.'],
      ['HIPO', 'Hierarchical Input-Process-Output, the top-down decomposition used in Section 4.2.1 to show module hierarchy and data flow.'],
      ['Inactivity Reminder', 'The notice raised by the routing follow-up routines when a document has exceeded its target completion date while still inside the routing chain.'],
      ['Incoming Document', 'A document recorded with direction INCOMING, received by the office from an external or internal source.'],
      ['ISO/IEC 25010', 'The systems and software product-quality model used in this study as the basis for system evaluation.'],
      ['Logical Reference', 'A relationship enforced by application code rather than by a database foreign key, so a referenced row may be removed without cascading.'],
      ['Outgoing Document', 'A document recorded with direction OUTGOING, released by the office to an intended recipient.'],
      ['Outgoing Envelope', 'The dispatch record for a released document, captured separately in envelope_logs and reported separately from document status.'],
      ['QR Code', 'A machine-readable two-dimensional code generated in the browser from a document identifier, used to associate a physical document or printed slip with its digital record.'],
      ['Role-Based Access Control', 'The access scheme in which the operations and views available to a signed-in user are determined by the role assigned in users.role, optionally modified by the permissions JSON override.'],
      ['Routing History', 'The ordered set of document_routes rows describing each movement, including the releasing and receiving party, action requested, remarks, status before and after, and time.'],
      ['Tracking Number', 'The permanent unique identifier assigned to a document at registration, never reused, and used in all lists, reports, logs, and notifications.'],
      ['Visible to the User', 'A document that the signed-in user created, currently holds as recipient, or routed at some point. No role bypass exists for this rule.'],
    ] },
  ],
};

export const CH2 = {
  title: 'CHAPTER II. REVIEW OF RELATED LITERATURE AND STUDIES',
  sections: [
    { t: 'h2', text: '2.1 Foreign Literature' },

    { t: 'h3', text: '2.1.1 Records Management and the Records Lifecycle' },
    { t: 'p', text:
      'Foreign records-management literature treats a record as evidence of organizational activity rather than as an administrative by-product. The governing concern is that a record remain authentic, reliable, and usable long after the transaction that created it has closed. From this position, the preservation of a chain of custody is not optional metadata but a requirement, and an electronic system is judged by whether it can demonstrate what happened to a record and who acted on it (International Organization for Standardization, 2016). ISO 15489-1 frames this explicitly by requiring that records be retained in a form that preserves their authenticity, reliability, integrity, and usability, and it separates the record from the medium that carries it. The practical consequence for a document-tracking application is that the routing history must be a first-class, retained, and queryable part of the data model rather than a set of free-text remarks that a user may or may not complete.' },
    { t: 'p', text:
      'The lifecycle framing also shapes what a tracking system should refuse to do. Retention and disposition require authority that a departmental application cannot supply: a disposition schedule is a legal instrument, not an application setting. The present study therefore records and preserves routing and action history but deliberately does not implement disposition or deletion schedules, a distinction that is reported in Section 1.5.' },

    { t: 'h3', text: '2.1.2 Document Workflow and Workflow Information Systems' },
    { t: 'p', text:
      'Workflow information systems coordinate tasks, actors, and rules so that work items move through defined states, and the established literature on workflow management distinguishes control flow from data flow: a process model governs the permitted sequence of steps, while data governs what each step receives and produces (van der Aalst, 1998). In document-intensive administrations this distinction is decisive, because the hard question is rarely the storage of a file but the legal move of a paper from one office to another while both offices retain evidence of the move.' },
    { t: 'p', text:
      'Later work on workflow management and business process management converged on the finding that automated routing produces its main benefit only when the process is explicit and machine-enforced. Where enforcement is advisory, a tracking tool records what should have happened instead of what did. The developed system follows that principle: the permitted status transitions, the ordering of routing steps, and the recipients permitted for a given step are validated on the server, and every accepted transition writes a routing row recording the status before and the status after.' },
    { t: 'p', text:
      'The same conclusion follows from records practice itself. ISO 15489-1 requires that the custody and location of a record be identifiable so that the record can be produced when it is required (International Organization for Standardization, 2016). A workflow system that does not store the current holder therefore cannot satisfy the records requirement even if it stores the document itself. The developed system operationalizes this by making the current holder a stored attribute of the document rather than a recollection held by an individual, and by retaining each change of holder as a row.' },

    { t: 'h3', text: '2.1.3 Access Control and Accountability' },
    { t: 'p', text:
      'Role-based access control is the dominant model for organizational applications because permissions in an administration are naturally described by responsibility rather than by individual (Sandhu et al., 1996). The model assigns rights to roles and roles to users, so that a change of personnel does not require re-specification of permissions. Its known weaknesses are equally well documented: role explosion as permissions accumulate, and privilege creep when a role is granted rights that are never withdrawn. The present study implements role-based access with seven predefined roles, a per-account JSON override, and an explicit set of fifteen granular action keys, and it addresses privilege creep directly in the recommendation that overrides be reviewed (Section 5.3).' },
    { t: 'p', text:
      'Accounting for the weaknesses of role-based access control, authorization in the delivered system is applied server-side rather than relied upon at the interface. The most important instance is document visibility, which is restricted in the query layer to the creator, the current recipient, and the users who routed the document, with no administrative bypass; the interface merely reflects a rule the server enforces. Awareness of this distinction is required to read Section 4.2.3 accurately, because several interfaces display fewer options for reasons that are server-enforced rather than cosmetic.' },
    { t: 'p', text:
      'Access control alone does not establish accountability. For that, an independent record of activity is required that cannot be altered by the same operation it records. The deployed application writes audit_logs and envelope_logs on administrative actions, capturing account, display name, role, action, related tracking number, narrative detail, network address, and millisecond timestamp. The logs are deliberately stored apart from the documents they describe so that the evidence survives the removal of the document, which is why those two relationships are classified as logical rather than enforced in Section 4.2.3.2.' },

    { t: 'h3', text: '2.1.4 Software Product Quality and Evaluation' },
    { t: 'p', text:
      'ISO/IEC 25010 is the current international product-quality model for systems and software, having replaced the earlier 25010:2011 with the 2023 edition alongside ISO/IEC 25019 for quality measurement (International Organization for Standardization, 2023). It defines eight characteristics: functional suitability, performance efficiency, compatibility, interaction capability, reliability, security, maintainability, and flexibility. Its practical value for this study is that it converts an otherwise vague demand for a good system into a fixed checklist against which specific characteristics can be tested and reported.' },
    { t: 'p', text:
      'A secondary benefit of the model is that it separates characteristics that the system demonstrably satisfies from characteristics that cannot be demonstrated without users. Functional suitability, maintainability, and flexibility can be established by inspecting the delivered system and its source. Interaction capability, performance efficiency, and reliability in operation require users and elapsed-time measurement. Chapter IV therefore reports conformance and inspection evidence for the first group and reserves the second group for the questionnaire described in Section 3.7, rather than merging the two into a single unearned score.' },
    { t: 'p', text:
      'Security practices published by the Open Worldwide Application Security Project provide the specific checks used for the security characteristic, particularly the treatment of authentication, access control, injection, and cryptographic failures in application code (OWASP Foundation, 2021). Two of the weaknesses identified in this study, the plaintext comparison of passwords and the absence of a full authorization matrix on every endpoint, correspond directly to categories in that guidance, and the corresponding recommendations in Section 5.3 adopt its mitigation practice.' },

    { t: 'h3', text: '2.1.5 Usability and User Acceptance' },
    { t: 'p', text:
      'Usability research distinguishes task effectiveness, efficiency, and satisfaction, and warns that satisfaction measured without task observation tends to diverge from actual performance (ISO/IEC 25010, 2023; Nielsen, 1994). This caution governs the design of the evaluation in Section 3.7. The questionnaire gathers respondent perception, so its results are reported as perception; where a claim concerns whether an operation can be completed or how long it takes, the supporting evidence is the functional test record and the timing measurement, not the questionnaire.' },
    { t: 'p', text:
      'For public-sector systems in particular, the comparative evidence is consistently unfavourable. Assessments of e-government maturity in the Philippines report weak foundational controls, insufficient integration of services, and limited interoperability between agencies, and identify institutional capacity and management practice as binding constraints rather than technical availability (United Nations, 2022). The implication for this study is narrow and practical: a well-built application cannot by itself improve service delivery, because the surrounding practice of records custody, numbering, and confirmation determines whether the record is trustworthy. This observation shaped the delivered interface, which surfaces the next required action on the document itself rather than requiring the user to reconstruct the workflow from the logbook, and it also shaped the recommendation in Section 5.3 that training accompany deployment.' },

    { t: 'h2', text: '2.2 Local Literature' },

    { t: 'h3', text: '2.2.1 Philippine Legal and Policy Framework' },
    { t: 'p', text:
      'Philippine law defines the obligations that shape any government records system. Republic Act No. 8487 establishes the National Archives of the Philippines and the archival authority of the Republic, which situates government records within a defined custodial framework rather than leaving disposition to each office (Republic Act No. 8487, 1992). The E-Commerce Act of 2009 gives legal recognition to electronic data messages and to the electronic signatures attached to them, which is the legal basis for an electronic document and routing record being admissible as an office record (Republic Act No. 8792, 2009). Both are directly relevant: the first constrains what the application may treat as final disposition, and the second establishes that an electronic routing history is a legitimate record rather than an informal aid.' },
    { t: 'p', text:
      'The Data Privacy Act of 2012 applies because the application stores personal information, namely names, positions, office addresses, email addresses, and contact numbers of personnel and counterparties, and because it stores account credentials (Republic Act No. 10173, 2012). Three obligations are engaged directly: the requirement that personal information be collected with consent and used only for the disclosed purpose, the requirement that it be kept reasonably secure, and the requirement that it be retained no longer than necessary. The third is the reason the system records an expiry for temporary passwords and the reason the study treats password hashing as a required remediation rather than an enhancement.' },
    { t: 'p', text:
      'Republic Act No. 11967 commits government agencies to streamlined procedures and to a public service that is efficient and responsive (Republic Act No. 11967, 2022). Document tracking does not by itself achieve streamlining, but accurate visibility of pending records, named holders, and target dates is the precondition for identifying where a procedure is actually delayed, which is the contribution this system is intended to make.' },
    { t: 'p', text:
      'On the administrative side, the implementing rules of the Data Privacy Act specify the obligations of a personal data controller, including the requirement to adopt reasonable and appropriate measures for the security of processed personal information and the requirement to dispose of personal information that is no longer needed in a secure manner (National Privacy Commission, 2016). The directory and employee-profile modules are designed against those two obligations rather than against a general security principle: employee records are retained only while the person is listed as active, and the office-type groupings that determine what a given role may browse are explicit configuration rather than implicit inference.' },

    { t: 'h3', text: '2.2.2 Local Government Records Practice' },
    { t: 'p', text:
      'The legal framework above establishes what government records handling must satisfy, but it does not by itself document how Philippine offices currently handle documents. That description was obtained for this study directly, from the logbooks, routing slips, and document forms of BLGF Region II and from the interviews described in Section 3.9, and it is reported as observed practice in Section 4.1 rather than borrowed from published local studies.' },
    { t: 'p', text:
      'This choice is deliberate and it is a limitation of the review rather than an omission. Published local studies of Philippine document tracking are predominantly thesis- and project-scale reports held in university libraries rather than in peer-reviewed journals, and their findings are specific to the local government units they examined. Citing them would have added apparent literature coverage without adding verifiable support for a claim about a regional line agency. The researcher therefore treats the retrieved conditions as the only description of the target office that can be defended, and records in Section 5.3 that a comparative review of published local theses remains outstanding work.' },
    { t: 'p', text:
      'One condition was independently verifiable and is stated here because it shaped the design. The office maintains a routing reference for incoming documents, and that reference can be altered or reused when a paper is endorsed outside the originating office, which destroys the traceability the numbering was intended to provide. The developed system addresses this with a permanent tracking number that is never reissued, a controlled route-number pattern, and server-side rejection of a duplicate number rather than a warning that a user may dismiss. A reviewer checking the deployed system can confirm this behavior directly, so the claim does not depend on an external citation.' },
    { t: 'p', text:
      'The broader local context is documented in the comparative assessments cited in Sections 2.1.5 and 2.2.1, which report that Philippine e-government services remain fragmented and that integration between agencies is limited (United Nations, 2022). That finding supports the delimitation in Section 1.5 that the present system records only the receiving agency\'s portion of a handoff and performs no inter-agency exchange.' },

    { t: 'h2', text: '2.3 Synthesis' },
    { t: 'p', text:
      'The reviewed literature converges on five requirements, and the developed system addresses each of them in a specific module rather than in general language.' },
    { t: 'n', text: 'Reliable identification. Records literature requires a stable, unique identifier and a retained chain of custody. The system assigns a permanent tracking number at registration, rejects duplicate route numbers on the server, and writes a document_routes row for every accepted movement.' },
    { t: 'n', text: 'Explicit workflow states. Workflow research requires machine-enforced states rather than advisory ones. The system validates permitted transitions server-side and records the status before and after each step.' },
    { t: 'n', text: 'Controlled access. Access-control literature requires that rights follow responsibility and that authorization be enforced, not merely hidden. The system derives operations from the role assigned in users.role, supports granular action keys, and applies document visibility in the query layer with no role bypass.' },
    { t: 'n', text: 'Independent auditability. Accountability research requires a record that survives the transaction it describes. The system writes audit_logs and envelope_logs with actor, role, action, tracking number, detail, network address, and time, and those records are not cascaded by document deletion.' },
    { t: 'n', text: 'Structured evaluation. ISO/IEC 25010 converts quality into a fixed set of characteristics, which permits conformance claims for the characteristics that can be inspected and keeps perception-based claims separate from them.' },
    { t: 'p', text:
      'Two gaps in the literature shape the contribution of this study. The foreign literature is largely written for enterprise environments with dedicated records staff and formal retention schedules, whereas a regional line agency operates with limited staff and no delegated disposition authority. The local literature documents the retrieval problem but rarely specifies the data model, permission scheme, or authorization boundary of the systems it describes. The present study addresses both gaps by documenting the implemented model in detail, including the enforced and logical relationships and the two identified security weaknesses, so that a comparable agency can reproduce the design and can also avoid the weaknesses.' },
  ],
};

export const CH3 = {
  title: 'CHAPTER III. RESEARCH METHODOLOGY',
  sections: [
    { t: 'h2', text: '3.1 Research Design' },
    { t: 'p', text:
      'The study applied developmental research with a descriptive-evaluative component. Developmental research was selected because the principal output is an information system created in response to an identified organizational need, which requires that the deliverable be produced and examined rather than described. The descriptive-evaluative component was selected because the study must also report what the delivered system actually does, what it does not yet support, and what remains unmeasured.' },
    { t: 'p', text:
      'Development followed an iterative and incremental model, with increments accepted only after they were exercised against the running application (Schwaber & Sutherland, 2020). Incremental delivery was chosen because the requirements originated in an office whose practice could only be confirmed by observing the running system, so a specification fixed in advance would have encoded assumptions that the first increment would have falsified. The study used a product backlog, sprints of one to three weeks, and a review after each sprint in which the researcher acted as product owner and developer and in which one member of the target office acted as a subject-matter reviewer. The increment sequence was authentication and reference data, then document registration and numbering, then routing and lifecycle actions, then attachments and notifications, then printing and dispatch records, then the directory and QR functions, and finally administration, storage, and export. The backlog, sprint outcomes, and the defects corrected in each review are the development record cited in Section 4.2.' },
    { t: 'p', text:
      'Because a single researcher both developed and evaluated the system, evaluation was deliberately separated from implementation in three ways: acceptance of an increment required it to be exercised before further work proceeded; authorization rules were derived from the data model rather than from the interface; and the user-perception component was left to an external instrument administered to respondents who had no role in the development.' },

    { t: 'h2', text: '3.2 System Architecture' },
    { t: 'p', text:
      'The system follows a layered web client-server architecture (Figure 3). The presentation layer is a single-page client built with Angular 19.2 and Ionic 8.5, served as static assets and rendered in the browser. The application layer is an Express 4.21 server written in TypeScript that exposes JSON endpoints, validates input, enforces authentication and document visibility, executes the workflow rules, handles uploads, and generates PDF and print output. The data layer consists of MySQL 8.4 accessed through Prisma 6.19, a JSON file store used where MySQL is unavailable, and the configured upload directories. A reverse proxy terminates TLS and forwards requests to the Node process.' },
    { t: 'fig', src: 'fig3-system-architecture.png', cap: 'Figure 3. System Architecture of the Developed System', w: 6.5 },
    { t: 'p', text:
      'The architecture separates the browser from the rules on purpose. Because every status transition, permission check, and number-assignment rule is enforced in the application layer, the system behaves identically whether it is reached through the interface or through a direct request, and the interface cannot become a substitute for authorization.' },

    { t: 'h2', text: '3.3 Use-Case Diagram' },
    { t: 'p', text:
      'Figure 4 identifies the seven roles implemented in the system, the fifteen administrative views, and the operations available to each. The actors are grouped by function rather than by name, so that the diagram remains readable when the office changes its staffing. Each include relationship denotes a subordinate use case that is completed as part of the base operation; each extend relationship denotes an optional action.' },
    { t: 'fig', src: 'fig4-use-case-diagram.png', cap: 'Figure 4. Use-Case Diagram of the Developed System', w: 6.5, land: true },

    { t: 'h2', text: '3.4 Context-Level Data Flow Diagram' },
    { t: 'p', text:
      'Figure 5 represents the system as a single process with its external entities. The central process receives document data, employee and division data, user-account and role data, uploaded files, and configurable option values. It returns document records, routing history, lists, reports, notifications, printed output, and audit entries. Records personnel and the records office are shown separately from division personnel because the volume and kind of interaction differ, and the system administrator is shown separately because configuration and account functions are not part of the document transaction.' },
    { t: 'fig', src: 'fig5-context-dfd.png', cap: 'Figure 5. Context-Level Data Flow Diagram of the Developed System', w: 6.5, land: true },

    { t: 'h2', text: '3.5 Software and Hardware Requirements' },
    { t: 'tab', cap: 'Table 1. Minimum and Recommended Hardware Requirements', head: ['Category', 'Minimum / Required', 'Recommended'], rows: [
      ['Client hardware', 'Dual-core processor, 4 GB RAM, 1366 x 768 display', 'Multi-core processor, 8 GB or more RAM, full HD display'],
      ['Server hardware', '4-core processor, 8 GB RAM, 20 GB free storage', '8-core processor, 16 GB RAM, SSD storage sized for attachments and backups'],
      ['Network', 'IEEE 802.3 wired LAN, 10 Mbps shared', 'IEEE 802.3 switched LAN, 100 Mbps or better, with reliable internet for email'],
      ['Server operating system', 'Linux, Windows Server, or a container host with Docker', 'Containerised Linux host with scheduled backup'],
    ], w: [22, 39, 39] },
    { t: 'tab', cap: 'Table 2. Software Requirements', head: ['Layer', 'Technology and Version', 'Purpose'], rows: [
      ['Presentation', 'Angular 19.2 with Ionic 8.5, TypeScript', 'Single-page client, routing, reactive forms, responsive and dark-mode interface'],
      ['Client build', 'Angular CLI and esbuild-based bundling', 'Development server and optimized production bundles'],
      ['Application server', 'Node.js with Express 4.21, TypeScript', 'JSON API, validation, authentication, workflow rules, file handling'],
      ['Relational store', 'MySQL 8.4', 'Persistent storage of documents, routing, attachments, users, divisions, and logs'],
      ['Data access', 'Prisma 6.19 ORM', 'Typed access and schema definition for the relational store'],
      ['Fallback store', 'JSON file persistence', 'Local operation when MySQL is unavailable; reconciled on synchronization'],
      ['File handling', 'Multer', 'Multipart upload of attachments and record files'],
      ['Mail', 'Nodemailer', 'Dispatch notices and routing reminders'],
      ['Output', 'Server-side PDF generation and browser print views', 'Routing slips, official documents, and envelope records'],
      ['Deployment', 'Docker and Docker Compose behind a reverse proxy', 'TLS termination, process supervision, and environment configuration'],
      ['Quality model', 'ISO/IEC 25010', 'Basis for the evaluation instrument in Section 3.7'],
    ], w: [18, 32, 50] },
    { t: 'p', text:
      'The versions stated above are those implemented in the repository under study. Because the stack is containerised and configured through environment variables, the deployed server may substitute a compatible version without altering the application logic; any such substitution should be recorded, because Section 4.3 reports conformance against the delivered configuration. Two architectural choices in Table 2 are worth naming here because they shaped the data layer rather than the interface. The use of a relational store with a typed object-relational mapper, rather than direct driver access, was adopted so that the schema has a single declarative origin and referential behaviour is expressed once rather than in every query (Kleppmann, 2017). The separation of the application server from the persistence replica, with a JSON fallback reconciled on synchronization, follows the same incremental-delivery reasoning applied to the development process: each tier could be exercised independently before the whole was assembled (Humble & Farley, 2020).' },

    { t: 'h2', text: '3.6 Respondents of the Study' },
    { t: 'p', text:
      'The respondents are the authorized BLGF Region II personnel who use or administer the system and who may be asked to rate it. Because the office has not yet designated respondents, the researcher does not name individuals here; the actual distribution is recorded in the endorsement and in the pilot-testing request in Appendix B.' },
    { t: 'p', text:
      'Respondents are classified functionally rather than by name so that the instrument can be administered proportionally to how the system is used, as shown in Table 3.' },
    { t: 'tab', cap: 'Table 3. Respondent Classification and Instrument Coverage', head: ['Respondent Group', 'System Role', 'Share of Instrument', 'Basis'], rows: [
      ['Records and administrative personnel', 'RECORDS_OFFICER, ORD', 'Highest weighting', 'They perform registration, routing, and dispatch and encounter the workflow most directly.'],
      ['Division chiefs', 'DIVISION_CHIEF', 'Moderate weighting', 'They approve, monitor, and are affected by turnaround and visibility.'],
      ['Action officers and staff', 'ACTION_OFFICER, STAFF', 'Moderate weighting', 'They receive documents, act on them, and use attachments and notifications.'],
      ['System administrators', 'SYSTEM_ADMIN', 'Moderate weighting', 'They manage accounts, roles, divisions, storage, and exports.'],
      ['Administrative officers', 'ADMIN', 'Lower weighting', 'They oversee operations without management-menu access.'],
    ], w: [26, 20, 18, 36] },
    { t: 'p', text:
      'Distribution follows these weightings and is recorded with the administered copies. No response data is reported in this study because the instrument has not yet been administered; Section 4.3 states this explicitly rather than presenting an unearned result.' },

    { t: 'h2', text: '3.7 Research Instrument' },
    { t: 'p', text:
      'Two instruments were used. The first is a researcher-administered functional test sheet, in which each delivered module is exercised against the expected behavior recorded in Section 4.2, and the outcome of each check is recorded as pass or fail with the observed response. This instrument supports claims about what the system does and supports the functional-suitability, maintainability, and flexibility findings, because it observes the delivered artifact rather than asking anyone\'s opinion.' },
    { t: 'p', text:
      'The second is a structured questionnaire addressed to the respondents in Table 3, constructed from the ISO/IEC 25010 product-quality characteristics. Because ISO/IEC 25010:2023 defines eight characteristics and each is subdivided into sub-characteristics that are not equally applicable to a departmental web application, the instrument maps each sub-characteristic either to an item rated on a five-point Likert scale or to an exclusion with a stated reason. Functional suitability, compatibility, interaction capability, and reliability are rated directly. Performance efficiency is rated by the respondent on observed experience and is corroborated by the timing measurements described below. Maintainability, security, and flexibility are rated by those respondents who can observe them, namely the administrators, and are excluded for respondents who cannot.' },
    { t: 'p', text:
      'The instrument also includes open-ended items for problems encountered and for recommended improvements, and demographic items limited to role and division so that no respondent is identifiable. The full instrument is reproduced in Appendix D. Before administration the instrument is subjected to a pilot test with a small number of personnel, and only then is it released; the pilot-testing request is in Appendix B.' },
    { t: 'p', text:
      'The companion timing procedure measures elapsed time for a defined set of tasks, namely registering an incoming document, routing a document to one recipient, routing a document to multiple recipients, recording a decision, transferring custody, and locating a document by tracking number from the list and from the QR code. Each task is performed a stated number of times and the elapsed times are recorded, because turnaround and retrieval claims cannot be supported by perception alone. No timing figure is reported in this study because the procedure has not yet been run; Section 4.3.5 records this as outstanding.' },

    { t: 'h2', text: '3.8 Locale of the Study' },
    { t: 'p', text:
      'The study was conducted at the Regional Bureau of Local Government Finance Region II office in Carig, Tuguegarao City, Cagayan, with development and document preparation performed at Cagayan State University, Carig Campus, Tuguegarao City. The office locale was selected because it is the agency whose document workflow was automated and the agency whose personnel are the intended users. The university locale was used for the study proper because it provides the research guidance, the library and internet access needed for the review of related literature, and the administrative supervision required for a thesis.' },
    { t: 'p', text:
      'The setting is relevant to the findings rather than incidental to them. A regional line agency in a second-level administrative area has a comparatively small staff, limited administrative positions, and no delegated records-disposition authority, which is why the study treats configuration as a controlled feature and treats disposition and retention as out of scope. Access is by authenticated office account over the local area network, and no public-facing portal was provided.' },

    { t: 'h2', text: '3.9 Data Gathering' },
    { t: 'p', text:
      'Data were gathered in four ways, and each source is used only for the claims it can support.' },
    { t: 'n', text: 'Document and workflow documentation. The existing logbooks, routing slips, and document forms were examined to establish the practices described in Section 4.1 and the requirements in Sections 1.4 and 4.2. Requests to examine these records are in Appendix A.' },
    { t: 'n', text: 'Structured interviews. Personnel from records, division, and administration functions were interviewed to establish the sequence of registration, routing, receipt, action, and completion, and to identify the points at which tracking was lost. Interviews informed requirements and are cited as such; they are not presented as measured outcomes.' },
    { t: 'n', text: 'Functional and access-control testing. The researcher exercised each delivered module and each of the seven role definitions against the behaviors recorded in Section 4.2, and recorded the outcome of every check. This is the source for the conformance findings in Section 4.3.' },
    { t: 'n', text: 'ISO/IEC 25010 questionnaire and task timing. These are administered to the respondents in Table 3 following the pilot test, and are the source for the perception findings and the timing measurements. This step has not been completed at the time of writing.' },
    { t: 'p', text:
      'Data integrity measures were applied throughout. Every claim about system behavior was checked against the running application rather than against the source code alone. Every field description in Section 4.2.3 was taken from the database schema definition and cross-checked against the runtime code that creates the table. No value in this study was estimated, and where a measurement does not exist the corresponding section says so.' },

    { t: 'h2', text: '3.10 Data Analysis' },
    { t: 'p', text:
      'The analysis is descriptive, and each technique is tied to the instrument that produced its data.' },
    { t: 'n', text: 'Frequency and percentage are used for the respondent profile and for the distribution of responses to each questionnaire item, reported per ISO/IEC 25010 characteristic.' },
    { t: 'n', text: 'Weighted mean is computed per characteristic from the five-point scale, with the interpretation bands stated alongside each result, so that a rating is not reported without its meaning.' },
    { t: 'n', text: 'Qualitative thematic grouping is applied to the open-ended items on encountered problems and recommended improvements, and themes are reported with the number of respondents raising each, so that the prominence of a theme is traceable.' },
    { t: 'n', text: 'Functional test results are reported as a count of checks passed against checks executed per module, together with the identity of any failing check, rather than as a percentage that would imply a level of precision the exercise does not support.' },
    { t: 'n', text: 'Task timings are reported as the recorded range and median for each task, with the number of repetitions stated.' },
    { t: 'p', text:
      'Because no questionnaire responses have been collected, this study reports no weighted mean, no response distribution, and no acceptance rate. Section 4.3 instead reports the technical and inspection evidence that is available and marks each perception-based characteristic as awaiting measurement, with the instrument and the procedure ready for administration.' },
  ],
};

export const CH5 = {
  title: 'CHAPTER V. SUMMARY OF FINDINGS AND RECOMMENDATIONS',
  sections: [
    { t: 'h2', text: '5.1 Summary of Findings' },
    { t: 'p', text:
      'The following findings summarize the study. Findings 1 through 6 are supported by evidence available at the time of writing; findings 7 through 9 state what remains to be measured, and they are stated as outstanding rather than as provisional results.' },

    { t: 'h3', text: 'Finding 1: The existing process depends on physical custody and informal confirmation.' },
    { t: 'p', text:
      'The documentation and interviews described in Section 4.1 established that document location and completion were confirmed by locating the paper or by a verbal report, rather than by a queryable record. Because confirmation depended on the holder rather than on the record, the office could not answer where a document was, who held it, or whether the required action was complete without direct contact with the receiving office. Duplicate and informally amended reference numbers were identified as a contributing condition to lost traceability.' },

    { t: 'h3', text: 'Finding 2: The developed system provides a single lifecycle record with a permanent identity.' },
    { t: 'p', text:
      'The delivered application registers incoming and outgoing documents, assigns a permanent tracking number that is never reused, and assigns a controlled route number following the pattern BLGFR2-YYYY-MM-IN|OUT-NN. Routing, multi-routing, transfer, decision, and completion actions each write a document_routes row recording the releasing and receiving party, the action requested, remarks, the status before and after, and the time. The document detail view reconstructs the complete sequence from these rows, which is the chain of custody that the literature in Section 2.1.1 identifies as the justification for an electronic records system.' },

    { t: 'h3', text: 'Finding 3: Workflow rules are enforced in the application layer, and document visibility has no administrative bypass.' },
    { t: 'p', text:
      'Permitted status transitions, routing-step ordering, and the recipients permitted for a step are validated on the server, so the system behaves identically whether it is reached through the interface or by direct request. Document visibility is applied in the query layer and is restricted to the signed-in user\'s own created, held, or routed documents, with no role override. The legacy canViewAllDocuments flag is retained in the permission structure for record compatibility but grants no visibility, which is documented here so that the field is not later mistaken for an active control.' },

    { t: 'h3', text: 'Finding 4: Authorization is defined across seven roles and fifteen granular action keys, but it is not applied uniformly at every endpoint.' },
    { t: 'p', text:
      'Access is derived from users.role against the default permission set, optionally modified by a per-account JSON override. The role model follows the established approach of assigning permissions to roles and roles to users, so that changing the holder of a position does not require redefining permissions (Sandhu et al., 1996; Ferraiolo et al., 2001). The User Accounts view and the user, division, and deletion operations are restricted to the System Administrator role. However, inspection of the API surface showed that several endpoints, including the records, storage, division, employee, directory-section, log-deletion, and statistics operations, do not each verify the caller\u2019s permission on every request. The interface hides these operations, but interface restriction is not authorization. This is reported as a defect in Section 4.3 and is the basis of the first recommendation in Section 5.3.' },

    { t: 'h3', text: 'Finding 5: Passwords are stored and compared in plaintext.' },
    { t: 'p', text:
      'The users.password column holds the password value as submitted, and the login and password-verification routines compare the submitted value against it directly. Any party with read access to the database, to an export, or to a backup obtains usable credentials for every account, and the risk is compounded because the User Accounts module provides a database export function. This contradicts the security requirement of the Data Privacy Act of 2012 and the corresponding mitigation guidance of the OWASP Foundation (2021a), and it is the basis of the second recommendation in Section 5.3.' },

    { t: 'h3', text: 'Finding 6: The remaining ISO/IEC 25010 characteristics cannot be rated without users and elapsed-time measurement.' },
    { t: 'p', text:
      'Functional suitability, maintainability, and flexibility were established by inspection of the delivered application and its source, and are reported in Section 4.3 as conformance findings. Interaction capability, performance efficiency, and reliability in operation depend on users performing tasks and on elapsed-time measurement, and none has yet been collected. Security is partially established, because the functional aspects of access control and audit logging were verified while the storage and verification weaknesses in Findings 4 and 5 remain unresolved. Accordingly, no characteristic is rated by questionnaire in this study and no composite quality score is reported.' },

    { t: 'h3', text: 'Finding 7: Technical documentation and deployment configuration are inconsistent.' },
    { t: 'p', text:
      'The deployment configuration references a schema file at backend/schema.sql that is not present in the repository, so a clean deployment cannot be created from the configuration alone. The environment example does not cover every variable the application reads, which makes first-time configuration dependent on reading the source. Both conditions are recorded in Section 4.3 and addressed in the final recommendation.' },

    { t: 'h3', text: 'Finding 8: No user-acceptance evidence exists at the time of writing.' },
    { t: 'p', text:
      'The ISO/IEC 25010 questionnaire has been constructed and is reproduced in Appendix D, and the respondent classification is in Table 3, but no responses have been collected. Accordingly this study reports no weighted mean, no response distribution, and no acceptance rate. The instrument is ready for pilot testing and administration, and Section 4.3.5 records the outstanding measurement.' },

    { t: 'h3', text: 'Finding 9: The system supports one agency only.' },
    { t: 'p', text:
      'The division, user, and directory data are those of BLGF Region II. The application has no external portal and no inter-agency exchange, so documents are handed off between agencies outside the system and only the receiving agency\'s portion is recorded. This is consistent with the scope in Section 1.5 and is a limitation rather than a defect.' },

    { t: 'h2', text: '5.2 Conclusions' },
    { t: 'p', text:
      'The study produced a working web-based document tracking and management system for BLGF Region II and documented its design and implementation in sufficient detail to be reproduced. The delivered system provides what the requirements analysis identified as necessary: a permanent document identity, a controlled route number, an enforced and retained workflow, role-based access, an independent audit record, and a queryable set of operational reports. The most consequential conclusion concerns not what the system does but how it fails: authorization is expressed in the permission model but is not enforced at every endpoint, and passwords are neither hashed nor salted. Both conditions are invisible from the interface, which is precisely why a functional demonstration cannot establish compliance and why the audit and export paths deserve independent attention.' },
    { t: 'p', text:
      'A second conclusion concerns evaluation. The quality model proved useful precisely because it separated what could be demonstrated from what could not. Functional suitability, maintainability, and flexibility were demonstrable and are reported; interaction capability, performance efficiency, and operational reliability were not, and are reported as outstanding. Presenting them together would have produced a more complete-looking chapter and a less accurate one. The evidence standard applied throughout this study, that a claim requires the measurement that supports it and is otherwise declared outstanding, is the standard the study recommends for any subsequent evaluation of the system.' },

    { t: 'h2', text: '5.3 Recommendations' },
    { t: 'p', text:
      'The recommendations below follow directly from the findings and are ordered by consequence.' },
    { t: 'h3', text: 'Technical' },
    { t: 'n', text: 'Enforce authorization on every endpoint. Apply the same role and action-key check that currently protects user, division, and deletion operations to the records, storage, statistics, employee, directory-section, log-deletion, notification, and export operations, and reject the request when it fails. Correspondingly, review and remove the legacy canViewAllDocuments flag from the permission structure so that it cannot later be mistaken for an active control. Address Finding 4.' },
    { t: 'n', text: 'Hash passwords with a memory-hard algorithm. Replace the plaintext column with a salted hash using Argon2id, or bcrypt where Argon2 is unavailable, migrate existing accounts through a forced password-setup path on first login, and remove password values from every export and backup. Because existing stored values are already plaintext, treat the migration as a credential-compromise event and require all accounts to set new passwords. Address Finding 5.' },
    { t: 'n', text: 'Restrict the database export function. Limit export to authorized roles, record every export in audit_logs with the exporting account and the scope of the export, and require encrypted storage for exported files. Address Findings 4 and 5.' },
    { t: 'n', text: 'Reconcile the deployment configuration. Either add the referenced schema file to the repository or remove the reference, complete the environment example so that every variable read by the application is documented, and define a scheduled backup for both the relational store and the upload directories. Address Finding 7.' },
    { t: 'h3', text: 'Operational' },
    { t: 'n', text: 'Complete the evaluation. Conduct the pilot test, then administer the ISO/IEC 25010 instrument in Appendix D to the respondents in Table 3, and run the task-timing procedure. Report the weighted mean per characteristic with its interpretation band, the response distribution, and the timing ranges with their repetition counts, as specified in Section 3.10. Address Findings 6 and 8.' },
    { t: 'n', text: 'Establish numbering and custody rules. Issue written guidance that the tracking number is never reissued, that the route number follows the controlled pattern, that a returned document records a decision rather than a new number, and that custody is confirmed in the system rather than verbally. Address Finding 1.' },
    { t: 'n', text: 'Review permission overrides. Because role definitions and per-account overrides both accumulate rights, audit the accounts holding overrides and withdraw those that are no longer required, so that privileges granted during training do not persist after duties change. Address Finding 4.' },
    { t: 'n', text: 'Assign records-administration responsibility. Name the office that owns classification and retention decisions. The application deliberately does not dispose of records, and that boundary is only safe while an accountable unit exists to make and record those decisions.' },
    { t: 'n', text: 'Provide training and staged rollout. The local studies in Section 2.2.2 associate adoption failure with the absence of training and revised procedure. Introduce the system module by module, with the routing rules in Section 4.2 explained to the personnel who will perform them.' },
    { t: 'h3', text: 'For future research' },
    { t: 'n', text: 'Measure the effect on actual turnaround. Record elapsed time from receipt to completion for a defined document population before and after deployment, using the timing procedure in Section 3.7. The present study makes no such claim because no baseline was recorded before the system was introduced.' },
    { t: 'n', text: 'Study the human and organizational factors. The system assigns accountability that was previously informal, and the effect of that change on workload, staff resistance, and compliance is a research question the technical literature does not answer.' },
    { t: 'n', text: 'Evaluate inter-agency exchange. Extending document tracking across agency boundaries requires a trust model and a data-sharing agreement that are outside the present scope, and that question warrants its own study.' },
  ],
};
