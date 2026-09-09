# Design and transaction review

See [the latest tracking design and research basis](TRACKING.md) for the recipient-by-recipient tracking view.

The interface uses neutral surfaces, charcoal actions, clearer spacing, and theme-aware controls. Status colors remain available to distinguish document outcomes.

The document transaction is organized as recipients → requested action and status → review → send. Document details show the current handler and expected next action. Routing history starts with registration, then numbered handoffs in chronological order. Each handoff expands to the existing handler activity, remarks, and attachments. Recorded audit events appear in a separate expandable list with actor, timestamp, and original details.

Component code and design remain together. See [the component editing guide](../../frontend/src/components/DESIGN.md).

## Preview

Latest improvements cover New document, Recent documents, Route Document, document records, Routing Monitoring, routing slips, and Office Directory. Expanded handler activities now use explicit spacing and separate information cards. Audit summaries show labeled fields, while the full original record remains available in a disclosure. Directory cards explain missing contact information, and document titles wrap for readability.

- [Expanded handler history](handler-history.png)
- [Structured audit fields](audit-fields.png)
- [New document](new-document.png)
- [Route document](route-form.png)
- [Document records](documents.png)
- [Routing monitoring](monitoring.png)
- [Routing slip](slip.png)
- [Office directory](directory.png)
- [Mobile handler history in dark mode](handler-mobile-dark.png)

- [Dashboard](dashboard.png)
- [Routing history](routing-history.png)
- [Transaction review](transaction-review.png)
- [Mobile dark-mode history](routing-mobile-dark.png)

Screenshots use synthetic data. Browser checks covered the main document screens, reports, directory, account screens, modal transitions, accordion expansion, audit matching by tracking/route number, chronological handoffs, and mobile/dark layouts. The mobile history check reported no horizontal page overflow and the final browser error log was empty.

Frontend and backend TypeScript checks pass. The frontend production build passes with a warning about the main bundle exceeding 500 kB. Live database saves, email delivery, camera access, and printer output were not verified in the isolated preview.

The routing form now groups Document Tracking, Document Details, Recipients, and Review before sending, with larger labels and controls. Previously delivered recipients show Already routed and cannot be selected again; bulk selection skips them. Single, multiple, and transfer routing endpoints reject duplicate deliveries. Approval decision records do not count as deliveries.

- [Updated routing form](already-routed-form.png)
- Six recipient matching tests pass: `node --import tsx --test tests/routingRecipients.test.ts`.
- Mock browser checks confirmed disabled previous recipients, Select All choosing only new recipients, one submission after two rapid submits, and preserving the form after a failed save. The mobile form had no horizontal overflow. Frontend and backend builds pass. Live database routing was not exercised.

Recipient progress now appears in separate cards, with an Ended marker only for the person who recorded completion. Completing one part keeps the document In Progress while other recipients still have work; a completed participant cannot route again. Forwarding moves responsibility to the next recipient. Approval alone does not finish a required handoff. The timeline wrapper is transparent, with backgrounds on individual transaction cards.

- [Independent recipient progress](recipient-progress.png)
- [Transparent timeline layout](recipient-timeline.png)
- Ten recipient matching and completion tests cover parallel completion and onward forwarding. A synthetic browser preview confirmed one completed recipient beside another still at Received, and no mobile horizontal overflow. Live database saves were not exercised.

Recipient progress now lives inside each handoff, with the progress bars visible and supporting activity collapsible. Each handoff shows its completed recipient count and each recipient has a next-action instruction. Onward deliveries now appear as subsequent handoffs instead of being hidden only in an earlier handler's activity.

The design uses explicit per-task status labels from [GOV.UK task lists](https://design-system.service.gov.uk/components/task-list/) and the distinction between parallel and sequential recipients described by [DocuSign signing order](https://www.docusign.com/en-gb/blog/quick-tip-setting-signing-order). These are design references, not a claim of DocuSign feature parity.

- [Progress within handoffs](handoff-progress.png)
- Browser checks verified two recipients in Handoff 1, an onward recipient in Handoff 2, independent Completed / Action recorded / Received indicators, expandable completed-recipient activity without a pending approval message, and no mobile horizontal overflow. The preview used synthetic records and did not exercise live database saves.

The latest [compact handoff layout](compact-handoff.png) uses a transparent outer handoff and flat recipient rows with thin separators. Progress lines are 2px, row padding is reduced, and long final instructions expand with recipient details. This adapts the concise name/status/hint presentation in the [GOV.UK task list](https://design-system.service.gov.uk/components/task-list/). Browser checks confirmed transparent computed background, 2px indicators, both recipient states, and no mobile page overflow. TypeScript checks and the frontend build pass.
