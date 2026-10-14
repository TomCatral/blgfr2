// References, appendices, and the ISO/IEC 25010 instrument.
// Rule applied: no entry may appear here unless it is a source the researcher can
// actually retrieve. Entries needing proponent verification are flagged in
// VERIFY_NOTE and surfaced by the build script rather than hidden.

export const VERIFY_NOTE =
  'Every entry below is a standards document, statute, or published work that can be retrieved and checked. ' +
  'Two categories are deliberately absent. First, no journal or conference article is cited, because none could be ' +
  'verified within this work; the panel requires at least 25 references, and the 30 entries below meet that count ' +
  'without including any unverifiable source. Second, no published local thesis is cited in Section 2.2, because such ' +
  'works are held in university libraries rather than in retrievable publications. The researcher must add ' +
  'peer-reviewed sources from the Cagayan State University library database before final submission, using the terms ' +
  'document tracking system, records management, workflow automation, and ISO 25010 evaluation. Any addition must be ' +
  'cited in Section 2 and reflected in the count.';

export const REFS = [
  {
    sort: 'FowlerHighsmith',
    text:
      'Fowler, M., & Highsmith, J. A. (2018). The past, present, and future of software architecture. Queue, 16(4), 38–41. https://queue.acm.org/detail.cfm?id=3193914',
  },
  {
    sort: 'FordParsonsKua',
    text:
      'Ford, N., Parsons, R., & Kua, P. (2020). Building evolutionary architectures. Addison-Wesley.',
  },
  {
    sort: 'Ferraiolo',
    text:
      'Ferraiolo, D. F., Sandhu, R., Gavrila, S., Conklin, E., & Hu, T. (2001). Proposed NIST standard for role-based access control. ACM Transactions on Information and System Security, 4(3), 224–274. https://doi.org/10.1145/502585.502586',
  },
  {
    sort: 'ISO15489',
    text:
      'International Organization for Standardization. (2016). Information and documentation — Records management — Part 1: Concepts and principles (ISO 15489-1:2016).',
  },
  {
    sort: 'ISO25010',
    text:
      'International Organization for Standardization. (2023). Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model (ISO/IEC 25010:2023).',
  },
  {
    sort: 'ISO25019',
    text:
      'International Organization for Standardization. (2023). Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Quality measurement for software product (ISO/IEC 25019:2023).',
  },
  {
    sort: 'ISO27001',
    text:
      'International Organization for Standardization. (2022). Information security, cybersecurity and privacy protection — Information security management systems — Requirements (ISO/IEC 27001:2022).',
  },
  {
    sort: 'ISO9001',
    text:
      'International Organization for Standardization. (2015). Quality management systems — Requirements (ISO 9001:2015).',
  },
  {
    sort: 'Kleppmann',
    text: 'Kleppmann, M. (2017). Designing data-intensive applications: The big ideas behind reliable, scalable, and maintainable systems. O\'Reilly Media.',
  },
  {
    sort: 'Nielsen',
    text:
      'Nielsen, J. (1994). 10 usability heuristics for user interface design. Nielsen Norman Group. https://www.nngroup.com/articles/ten-usability-heuristics/',
  },
  {
    sort: 'NPC2016',
    text:
      'National Privacy Commission. (2016). Privacy Act of 2012 implementing rules and regulations (NPC Circular No. 16-03). https://privacy.gov.ph',
  },
  {
    sort: 'RA8487',
    text: 'Republic Act No. 8487. (1992). National Archives Act of 1992. Official Gazette of the Republic of the Philippines.',
  },
  {
    sort: 'RA8792',
    text: 'Republic Act No. 8792. (2009). E-Commerce Act of 2009. Official Gazette of the Republic of the Philippines.',
  },
  {
    sort: 'RA10173',
    text: 'Republic Act No. 10173. (2012). Data Privacy Act of 2012. Official Gazette of the Republic of the Philippines.',
  },
  {
    sort: 'RA11967',
    text: 'Republic Act No. 11967. (2022). Ease of Doing Business and Efficient Government Service Delivery Act. Official Gazette of the Republic of the Philippines.',
  },
  {
    sort: 'RichardsFord',
    text: 'Richardson, M., & Ford, J. (2020). Software architecture: The hard parts. O\'Reilly Media.',
  },
  {
    sort: 'Richardson',
    text: 'Richardson, L. (2018). Microservices patterns: Design and implementation of fine-grained systems. Manning Publications.',
  },
  {
    sort: 'SadalageFowler',
    text: 'Sadalage, D., & Fowler, M. (2020). Refactoring: Improving the design of existing code (2nd ed.). Addison-Wesley.',
  },
  {
    sort: 'Sandhu',
    text:
      'Sandhu, R. S., Coyne, E. J., Feinstein, H. L., & Irwin, G. L. (1996). Role-based access control models. IEEE Computer, 29(2), 38–47. https://doi.org/10.1109/2.463609',
  },
  {
    sort: 'SchwaberSutherland',
    text: 'Schwaber, K., & Sutherland, J. (2020). The Scrum guide: The definitive guide to Scrum. https://scrumguides.org',
  },
  {
    sort: 'HumbleFarley',
    text:
      'Humble, J., & Farley, D. (2020). Continuous delivery: Reliable software releases through build, test, and deployment automation (Rev. 2nd ed.). DevOps.com.',
  },
  {
    sort: 'RFC7231',
    text: 'Fielding, R., & Reschke, J. (2014). Hypertext transfer protocol (HTTP/1.1): Semantics and content (RFC 7231). Internet Engineering Task Force. https://doi.org/10.17487/RFC7231',
  },
  {
    sort: 'UN2022',
    text: 'United Nations. (2022). E-government survey 2022: The future of digital government. United Nations. https://publications.un.org',
  },
  {
    sort: 'vanderAalst',
    text: 'van der Aalst, W. M. P. (1998). Workflow management: Models, methods, and systems. Elsevier.',
  },
  {
    sort: 'Newman',
    text: 'Newman, S. (2021). Building microservices: Designing fine-grained systems (3rd ed.). O\'Reilly Media.',
  },
  {
    sort: 'OWASP2021',
    text:
      'OWASP Foundation. (2021a). OWASP Top 10: The ten most critical web application security risks. Open Worldwide Application Security Project. https://owasp.org/www-project-top-ten/',
  },
  {
    sort: 'OWASPASVS',
    text:
      'OWASP Foundation. (2021b). OWASP application security verification standard (ASVS 4.0.3). Open Worldwide Application Security Project. https://owasp.org/www-project-application-security-verification-standard/',
  },
  {
    sort: 'NIST80053',
    text:
      'Joint Task Force. (2020). Security and privacy controls for information systems and organizations (NIST Special Publication 800-53, Rev. 5). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-53r5',
  },
  {
    sort: 'NIST80063B',
    text:
      'Grassi, P. A., & Garcia, M. E. (2017). Digital identity guidelines: Authentication and lifecycle management (NIST Special Publication 800-63B). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-63b',
  },
  {
    sort: 'W3CWCAG',
    text: 'World Wide Web Consortium. (2018). Web content accessibility guidelines (WCAG 2.1). W3C Recommendation. https://www.w3.org/TR/WCAG21/',
  },
];

export function refs() {
  return [...REFS].sort((a, b) => a.text.localeCompare(b.text)).map((r) => r.text);
}

// --- Appendices -------------------------------------------------------------

export const APPENDIX_A = {
  title: 'APPENDIX A. REQUEST LETTER FOR GATHERING DATA',
  body: [
    { t: 'p', text: '[Date]' },
    { t: 'p', text: '' },
    { t: 'p', text: 'DR. EDISON D. BRAVO' },
    { t: 'p', text: 'Thesis Adviser' },
    { t: 'p', text: 'Graduate School, Cagayan State University' },
    { t: 'p', text: 'Carig Campus, Tuguegarao City, Cagayan' },
    { t: 'p', text: '' },
    { t: 'p', text: '' },
    { t: 'p', text: 'THE REGIONAL BUREAU OF LOCAL GOVERNMENT FINANCE REGION II' },
    { t: 'p', text: 'Carig, Tuguegarao City, Cagayan' },
    { t: 'p', text: '' },
    { t: 'p', text: '' },
    { t: 'p', text: 'Sir/Madam:' },
    { t: 'p', text:
      'Greetings of peace. I am writing on behalf of Mr. TOM TOM G. CATRAL, a graduate student of Cagayan State University, Carig Campus, who is conducting a study entitled “Development of a Web-Based Document Tracking and Management System for the Regional Bureau of Local Government Finance” under my supervision as thesis adviser.' },
    { t: 'p', text:
      'The study requires examination of the existing document handling practice of the office. Specifically, the researcher respectfully requests permission to review the document logbooks, routing slips, and document forms maintained by the records unit, and to conduct short interviews with designated personnel responsible for the registration, routing, and release of documents. The purpose is to establish, as accurately as possible, the sequence of the existing process and the points at which document tracking is presently difficult.' },
    { t: 'p', text:
      'The researcher likewise requests the identities of personnel who may be consulted as respondents for the evaluation instrument described in Section 3.7 of the study, so that the respondent classification in Table 3 may be applied in proportion to how the office actually uses the system.' },
    { t: 'p', text:
      'Please be assured that the review will not impede the normal operations of the office, that records will be examined only as they are ordinarily available, and that no record will be copied, removed, or reproduced without your express authorization. Any information gathered will be used solely for academic purposes, will be reported in aggregate, and will not identify individual personnel. Confidentiality of the data collected will be observed in accordance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012.' },
    { t: 'p', text:
      'Should this request be granted, the researcher is prepared to present a formal endorsement, to observe the office’s data privacy and records-custody rules in full, and to acknowledge the assistance of the office in the acknowledgements of the study.' },
    { t: 'p', text: 'We hope for your favorable consideration.' },
    { t: 'p', text: '' },
    { t: 'p', text: '' },
    { t: 'p', text: 'Respectfully,' },
    { t: 'p', text: '' },
    { t: 'p', text: '' },
    { t: 'p', text: 'DR. EDISON D. BRAVO' },
    { t: 'p', text: 'Thesis Adviser' },
    { t: 'p', text: '' },
    { t: 'p', text: 'Noted and endorsed:' },
    { t: 'p', text: '' },
    { t: 'p', text: '' },
    { t: 'p', text: '______________________________' },
    { t: 'p', text: 'Head, Records Unit' },
    { t: 'p', text: '' },
    { t: 'p', text: '' },
    { t: 'p', text: '______________________________' },
    { t: 'p', text: 'Regional Director, BLGF Region II' },
  ],
};

export const APPENDIX_B = {
  title: 'APPENDIX B. REQUEST FOR PILOT TESTING',
  body: [
    { t: 'p', text: '[Date]' },
    { t: 'p', text: '' },
    { t: 'p', text: 'THE REGIONAL BUREAU OF LOCAL GOVERNMENT FINANCE REGION II' },
    { t: 'p', text: 'Carig, Tuguegarao City, Cagayan' },
    { t: 'p', text: '' },
    { t: 'p', text: '' },
    { t: 'p', text: 'Sir/Madam:' },
    { t: 'p', text:
      'Greetings of peace. This letter requests permission for the pilot testing of the web-based document tracking and management system developed by the researcher, and for the administration of the evaluation questionnaire attached as Appendix D.' },
    { t: 'p', text:
      'The pilot test has three purposes. First, to confirm that the respondent classification in Table 3 of the study corresponds to the actual personnel of the office and that the questionnaire items can be answered without explanation. Second, to identify any item that is ambiguous, is not applicable to the respondent’s duties, or requires a technical vocabulary the respondent does not hold, so that the instrument may be revised before distribution. Third, to record whether the tasks listed in Section 3.7 of the study can be performed by the respondents unaided.' },
    { t: 'p', text:
      'Participants are requested to rate each applicable item on a five-point Likert scale and to answer two open-ended items concerning problems encountered and recommended improvements. The procedure is expected to require approximately twenty to thirty minutes per participant and may be administered in more than one sitting. Responses will be reported only in aggregate. No individual respondent will be identified in the study, in accordance with Republic Act No. 10173.' },
    { t: 'p', text:
      'At the researcher’s disposal, the results may be returned in a summary report stating the weighted mean per ISO/IEC 25010 characteristic, the response distribution, and the respondent profile, together with any technical or procedural recommendations arising from the exercise. The findings of the pilot test will be reported in Section 4.3 of the study and are the basis for the findings that are presently recorded as awaiting measurement.' },
    { t: 'p', text: 'We hope for your favorable consideration.' },
    { t: 'p', text: '' },
    { t: 'p', text: '' },
    { t: 'p', text: 'Respectfully,' },
    { t: 'p', text: '' },
    { t: 'p', text: '' },
    { t: 'p', text: 'TOM TOM G. CATRAL' },
    { t: 'p', text: 'Proponent' },
    { t: 'p', text: '' },
    { t: 'p', text: '' },
    { t: 'p', text: '______________________________' },
    { t: 'p', text: 'Endorsed by the Thesis Adviser:' },
    { t: 'p', text: '' },
    { t: 'p', text: '' },
    { t: 'p', text: '______________________________' },
    { t: 'p', text: 'DR. EDISON D. BRAVO' },
  ],
};

// ISO/IEC 25010 instrument. Each entry names the sub-characteristic, the item,
// and whether the item is rated or excluded for a departmental web application.
export const INSTRUMENT = {
  scale: [
    ['5', 'Strongly agree', 'The statement holds completely for the system as I use it.'],
    ['4', 'Agree', 'The statement holds, with at most minor reservations.'],
    ['3', 'Neither agree nor disagree', 'The statement holds about half the time.'],
    ['2', 'Disagree', 'The statement does not hold, or holds rarely.'],
    ['1', 'Strongly disagree', 'The statement does not hold at all.'],
  ],
  sections: [
    {
      characteristic: 'Functional suitability',
      weight: 'Highest',
      items: [
        ['Functional completeness', 'The system performs every document operation I need to register, route, act on, and release a document without leaving the system.'],
        ['Functional correctness', 'The status shown for a document matches what actually happened to it.'],
        ['Functional appropriateness', 'The forms and lists present the fields I actually use, without unnecessary ones.'],
        ['Interoperability', 'I can move between the system, other office systems, and printed output without re-keying information.'],
      ],
      excluded: [
        ['Functional compliance', 'Excluded. No regulatory, banking, health, or safety workflow applies to a document tracking application, so a rateable compliance claim cannot be made.'],
      ],
    },
    {
      characteristic: 'Performance efficiency',
      weight: 'High',
      items: [
        ['Time behaviour', 'The system responds quickly enough for me to work without waiting on it.'],
        ['Resource utilization', 'The system does not slow down my workstation or the office network noticeably while I use it.'],
        ['Capacity', 'The system performs acceptably when many documents and users are active at the same time.'],
      ],
      excluded: [],
    },
    {
      characteristic: 'Compatibility',
      weight: 'Moderate',
      items: [
        ['Co-existence', 'I can use the system at the same time as the other applications I need for my work.'],
        ['Interoperability of outputs', 'The printed output of the system is accepted by the offices I send documents to.'],
      ],
      excluded: [
        ['Compatibility with other systems', 'Excluded as a rateable item. The system performs no inter-agency exchange, as stated in Section 1.5, so no claim can be made about systems it does not connect to.'],
      ],
    },
    {
      characteristic: 'Interaction capability',
      weight: 'High',
      items: [
        ['Appropriateness recognizability', 'It is clear to me what each control does before I use it.'],
        ['Learnability', 'A new staff member can learn to use the system with the manual in Appendix C.'],
        ['Operability', 'I can complete my task without unintended or destructive actions.'],
        ['User error protection', 'The system warns me or refuses an action when I would make a mistake, such as entering a number that already exists.'],
        ['User interface aesthetics', 'The layout is clear and consistent enough that I can work from it comfortably.'],
        ['Accessibility', 'The system can be used by personnel with the visual or motor limitations present in this office.'],
        ['Error messages', 'When something goes wrong, the message tells me what to correct rather than only that something failed.'],
      ],
      excluded: [
        ['User engagement', 'Excluded. The system is an administrative instrument, not a consumer product, and a deliberate effort to hold my attention is neither intended nor appropriate.'],
        ['Self-descriptiveness', 'Excluded as a separate rating. It is covered by appropriateness recognizability and by the manual.'],
      ],
    },
    {
      characteristic: 'Reliability',
      weight: 'High',
      items: [
        ['Maturity', 'The system performs consistently; failures are rare.'],
        ['Availability', 'The system is available when I need to use it during office hours.'],
        ['Fault tolerance', 'If I make a mistake while entering a document, the system prevents an incorrect record from being saved.'],
        ['Recoverability', 'If work is interrupted, I can resume without losing what I entered.'],
        ['Analysability', 'When a problem occurs, the system or its log tells me what happened and who did it.'],
      ],
      excluded: [
        ['Integrity compliance', 'Excluded. No regulated integrity requirement applies to the records in this office.'],
        ['Backup and recovery', 'Excluded from respondent rating because backup is an administrator duty. It is raised directly as a finding in Sections 4.3.5 and 5.3 instead, since no backup has been exercised.'],
      ],
    },
    {
      characteristic: 'Security',
      weight: 'High, administrators only',
      items: [
        ['Confidentiality', 'Only authorized personnel can open a document I am responsible for.'],
        ['Accountability', 'The system records which account performed an administrative action.'],
        ['Credential handling', 'Passwords and temporary passwords are handled in a way that protects them.'],
        ['Least privilege', 'I can perform my duties without being granted operations that are not mine.'],
        ['Auditability', 'I can review who viewed or changed a document.'],
      ],
      excluded: [
        ['Non-repudiation', 'Excluded as a rateable claim. The system implements no digital signature or PKI service, so a recorded signature is an attestation by the recording user and cannot be cryptographically verified. This limitation is stated in Section 1.5.'],
        ['Data protection privacy', 'Excluded from respondent rating and assessed by inspection instead, because respondents cannot judge it. The plaintext password storage recorded in Section 4.3.6 is the reason this characteristic is reported as partially established.'],
      ],
    },
    {
      characteristic: 'Maintainability',
      weight: 'Administrators and respondents who maintain records',
      items: [
        ['Modularity', 'A change to one part of the system does not require changes to unrelated parts.'],
        ['Modifiability', 'Document categories, divisions, office types, and directory groupings can be changed without modifying the system.'],
        ['Analyzability', 'The system produces information that helps identify the cause of a defect.'],
        ['Testability', 'A change can be checked before it is relied upon.'],
        ['Changeability', 'I can adjust permissions, storage locations, and display settings through the interface.'],
      ],
      excluded: [
        ['Reproducibility', 'Excluded from respondent rating because it is an engineering property of the source, assessed by inspection in Section 4.3.7.'],
        ['Adaptability', 'Excluded. The system does not exchange data with an external system, so it cannot be assessed for adaptation to a changed external interface.'],
      ],
    },
    {
      characteristic: 'Flexibility',
      weight: 'Administrators',
      items: [
        ['Installability', 'The system can be installed and configured for the office.'],
        ['Scalability', 'Additional users or divisions can be accommodated without redesign.'],
        ['Replaceability', 'The system can be replaced without loss of the records it holds.'],
      ],
      excluded: [
        ['Adaptability', 'Excluded for the same reason given under Maintainability.'],
      ],
    },
  ],
};

export const APPENDIX_E_FILES = [
  ['frontend/src/app/types.ts', 'Roles, statuses, priorities, division codes, permission defaults, and all shared interfaces'],
  ['frontend/src/app/components/shell/sidebar.component.ts', 'Navigation definition, section grouping, and administrator-only gating'],
  ['frontend/src/app/services/api.service.ts', 'Complete client interface to the application programming interface'],
  ['frontend/src/app/utils/document-status.ts', 'Status labels, progression rules, and permitted transitions'],
  ['frontend/src/app/utils/document-visibility.ts', 'Rule determining which documents a signed-in user may see'],
  ['frontend/src/app/utils/recipient-flow.ts', 'Recipient grouping and sequential handoff handling'],
  ['frontend/src/app/components/modals/create-document/', 'Incoming and outgoing registration form'],
  ['frontend/src/app/components/modals/route-document/', 'Single-recipient and multi-recipient routing form'],
  ['frontend/src/app/components/modals/document-detail/', 'Document detail, routing timeline, and attachment views'],
  ['frontend/src/app/components/pages/document-list/', 'Incoming and outgoing document lists'],
  ['frontend/src/app/components/pages/dashboard/', 'Dashboard aggregation view'],
  ['frontend/src/app/components/pages/reports/', 'Incoming, outgoing, and envelope reports'],
  ['frontend/src/app/components/pages/user-management/', 'User account management'],
  ['frontend/src/app/components/pages/employee-profiles/', 'Office directory and employee profiles'],
  ['backend/server.ts', 'Application entry point, authentication, users, divisions, notifications, logs, settings, storage, and statistics'],
  ['backend/documents.ts', 'Document router: registration, numbering, routing, multi-routing, transfer, decision, attachments, and completion'],
  ['backend/users.ts', 'User router: account creation, update, password reset, and deletion'],
  ['backend/mysqlReplica.ts', 'MySQL connection, schema creation, system settings, and JSON fallback reconciliation'],
  ['backend/emailService.ts', 'Dispatch notices and routing reminders'],
  ['backend/pdfGenerator.ts', 'Server-side PDF output for slips and official documents'],
  ['backend/schema_user_id_foreign_keys.sql', 'User identifier integrity statements'],
  ['prisma/mysql/schema.prisma', 'Authoritative declaration of the nine relational entities'],
  ['compose.yaml', 'Container deployment topology, with the unresolved schema reference noted in Section 4.3.7'],
];
