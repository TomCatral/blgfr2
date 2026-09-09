# Document tracking design

The tracking view now answers three questions in order:

A simple stage indicator shows **Received → Processing → For approval → Completed**. The current stage is labeled explicitly. Returned and on-hold documents display their exception under Processing. This indicates the document's stage, not the percentage of recipients who have finished.

1. **What is the document's overall status?** The stored status, assigned person on the document record, target date, and plain-language next action appear first. A fixed percentage is not shown here because it does not measure each recipient's work.
2. **What has each recipient done?** A separate row shows the latest assignment, sender, action, response/activity, and timestamp for every recorded recipient. Forwarding and approval are distinct. No recorded response is reported explicitly rather than being treated as approval or completion.
3. **How did it move?** Dispatch groups show recipients sent the document together. Expand a recipient for a simple sequence of their actions and subsequent recipient decisions. Details, original audit records, and attachments remain available on demand.

## Basis

- [GOV.UK summary lists](https://design-system.service.gov.uk/components/summary-list/): readable labels and values for recorded information.
- [GOV.UK task lists](https://design-system.service.gov.uk/components/task-list/): clear individual statuses. This view borrows the per-item status presentation; it does not turn sequential routing into an unordered task workflow.
- [DocuSign signing order guidance](https://community.docusign.com/tips-from-docusign-155/how-to-set-esignature-signing-order-26299): distinguish recipients receiving together from later sequential handoffs. Existing application dispatch records determine grouping; this update does not add a new signing engine.

## Verification

A synthetic shared dispatch included Jamie, who forwarded to Morgan, and Taylor, who approved. The recipient list correctly showed Jamie as Forwarded, Taylor as Approved, and Morgan as No response recorded. The timeline displayed the same response labels. The scenario also passed with legacy route records lacking user IDs. Desktop and mobile dark-mode layouts were inspected.

The named assignment on the document record is shown separately from recipient response history. It is not presented as an exhaustive list of current physical holders. Missing historical events cannot be reconstructed from the design alone. Live database writes and notification delivery were not tested in the isolated preview.

Implementation and component-specific design: `frontend/src/components/modals/DocumentDetailModal.tsx`.

- [Desktop tracking preview](recipient-tracking.png)
- [Mobile tracking preview](recipient-tracking-mobile.png)
