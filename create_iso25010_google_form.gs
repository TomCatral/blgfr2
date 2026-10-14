function createISO25010Survey() {
  const form = FormApp.create(
    'ISO/IEC 25010 Software Quality Evaluation – WDTMP'
  );

  form
    .setDescription(
      'This questionnaire evaluates the extent to which the Web-Based Document Tracking and Management Platform (WDTMP) complies with the ISO/IEC 25010:2011 software product quality characteristics. Please use or review the system before answering. Responses will be summarized for academic purposes and treated confidentially.\n\n' +
      'Rating scale:\n' +
      '5 – Very Great Extent\n' +
      '4 – Great Extent\n' +
      '3 – Moderate Extent\n' +
      '2 – Little Extent\n' +
      '1 – No Extent'
    )
    .setConfirmationMessage(
      'Thank you. Your evaluation has been recorded successfully.'
    )
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setProgressBar(true)
    .setShuffleQuestions(false)
    .setAcceptingResponses(true);

  form.addSectionHeaderItem()
    .setTitle('Informed Consent')
    .setHelpText(
      'Participation is voluntary. Do not include confidential document contents, passwords, or other sensitive information in your answers.'
    );

  form.addMultipleChoiceItem()
    .setTitle('Do you voluntarily agree to participate in this system evaluation?')
    .setChoiceValues(['Yes, I agree'])
    .setRequired(true);

  form.addPageBreakItem().setTitle('Part I. Profile of the Respondent');

  form.addTextItem()
    .setTitle('Respondent Code (optional)')
    .setHelpText('You may use a non-identifying code such as EMP-01 or IT-01. Do not enter your full name.');

  form.addMultipleChoiceItem()
    .setTitle('Respondent Type')
    .setChoiceValues(['BLGF Employee', 'IT Expert'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Age Group')
    .setChoiceValues([
      '30 years old or below',
      '31–40 years old',
      '41–50 years old',
      '51–60 years old',
      'Above 60 years old'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Sex')
    .setChoiceValues(['Male', 'Female', 'Prefer not to say'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Highest Educational Attainment')
    .setChoiceValues(['College', 'Postgraduate', 'Other'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Years of Relevant Work or IT Experience')
    .setChoiceValues([
      'Below 1 year',
      '1–5 years',
      '6–10 years',
      'More than 10 years'
    ])
    .setRequired(true);

  const scale = [
    '5 – Very Great Extent',
    '4 – Great Extent',
    '3 – Moderate Extent',
    '2 – Little Extent',
    '1 – No Extent'
  ];

  addQualityGrid_(form, 'A. Functional Suitability', [
    'The system provides the functions required for registering, routing, monitoring, retrieving, and archiving documents.',
    'The system produces correct and appropriate information for document-processing tasks.',
    'The available functions help users complete document-related tasks and address workflow problems.',
    'The system applies the appropriate functions and access permissions for each authorized user role.'
  ], scale);

  addQualityGrid_(form, 'B. Reliability', [
    'The system performs consistently during normal document-processing operations.',
    'The system remains usable when recoverable errors occur.',
    'The system preserves or restores document data and transaction history after an interruption or failure.'
  ], scale);

  addQualityGrid_(form, 'C. Usability', [
    'The user interface is easy to understand and learn.',
    'Labels, instructions, notifications, and system-generated information are clear.',
    'The user documentation provides sufficient guidance for operating the system.',
    'Users can complete common tasks through a straightforward sequence of steps.'
  ], scale);

  addQualityGrid_(form, 'D. Performance Efficiency', [
    'The system responds promptly to user commands, searches, and document transactions.',
    'The system uses available computing and network resources efficiently.',
    'The system can support the expected number of users and document transactions without unacceptable slowdown.'
  ], scale);

  addQualityGrid_(form, 'E. Compatibility', [
    'The system performs correctly in its supported browsers, devices, and operating environment.',
    'The system modules exchange and use document, routing, notification, and user information correctly.'
  ], scale);

  addQualityGrid_(form, 'F. Security', [
    'The system restricts functions and records according to authorized user roles and permissions.',
    'The system protects document data, attachments, credentials, and associated records from unauthorized access or modification.',
    'The system provides traceable records of significant user and document-processing actions.'
  ], scale);

  addQualityGrid_(form, 'G. Maintainability', [
    'System components and errors can be analyzed and corrected efficiently.',
    'The system can be modified or enhanced without unnecessarily affecting unrelated functions.',
    'The system continues to operate correctly after controlled changes are introduced.',
    'System functions can be tested to verify that requirements are satisfied.'
  ], scale);

  addQualityGrid_(form, 'H. Portability', [
    'The system can operate in another compatible deployment environment with minimal adjustment.',
    'The system can be installed or deployed using clear and manageable procedures.',
    'The system can adapt to supported changes in hardware, software, or configuration.',
    'The system can replace the relevant manual document-tracking activities within the defined scope of the study.'
  ], scale);

  form.addPageBreakItem().setTitle('Part III. Open-Ended Assessment');

  form.addParagraphTextItem()
    .setTitle('What are the best features or strengths of the developed system?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('What limitations or areas of the system need to be addressed?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Please provide other suggestions or recommendations.')
    .setRequired(false);

  const spreadsheet = SpreadsheetApp.create(
    'WDTMP ISO 25010 Survey Responses'
  );
  form.setDestination(
    FormApp.DestinationType.SPREADSHEET,
    spreadsheet.getId()
  );

  console.log('FORM EDIT LINK: ' + form.getEditUrl());
  console.log('FORM RESPONDENT LINK: ' + form.getPublishedUrl());
  console.log('RESPONSE SHEET LINK: ' + spreadsheet.getUrl());
}

function addQualityGrid_(form, title, statements, scale) {
  form.addPageBreakItem()
    .setTitle(title)
    .setHelpText(
      'Select one rating for every statement: 5 – Very Great Extent, 4 – Great Extent, 3 – Moderate Extent, 2 – Little Extent, or 1 – No Extent.'
    );

  form.addGridItem()
    .setTitle(title + ' Evaluation')
    .setRows(statements)
    .setColumns(scale)
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle(title + ' – Comments (optional)')
    .setRequired(false);
}
