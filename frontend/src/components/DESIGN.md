# Isang file bawat component

Buksan ang `.tsx` file ng screen sa `components/`, o sa `components/modals/` para sa modal. Nandoon na ang design, logic, at layout.

```text
components/
  modals/
    CreateDocumentModal.tsx
    DocumentDetailModal.tsx
    RouteDocumentModal.tsx
    LoginModal.tsx
    AppDialogHost.tsx
  DashboardView.tsx
  ui/
    FormControls.tsx
    ModalLayer.tsx
```

## Saan mag-eedit

- [Create Document](./modals/CreateDocumentModal.tsx)
- [Document Details](./modals/DocumentDetailModal.tsx)
- [Route Document](./modals/RouteDocumentModal.tsx)
- [Dashboard at cards](./DashboardView.tsx)

Gamitin ang Ctrl+F para hanapin ang label:

| Label          | Babaguhin dito                                |
| -------------- | --------------------------------------------- |
| DESIGN / THEME | Kulay, laki, spacing, borders, at card styles |
| MOBILE         | Design sa maliit na screen                    |
| DATA           | Props at uri ng data                          |
| LOGIC          | State, events, at pagproseso                  |
| LAYOUT         | Cards, fields, buttons, at laman ng screen    |

Hanapin ang component file sa `components/`. Ang design ng bawat section ay nasa mismong JSX `div`, `section`, o button sa pamamagitan ng `className`. Ang `ui/` folder ay para lamang sa shared controls na ginagamit ng maraming screens.

Ang `src/theme.ts`, `src/styles/`, at `components/ui/` ay shared defaults at reusable controls. Hindi na kailangan ng hiwalay na `styles.ts` para baguhin ang isang component.

## Transaction at routing flow

1. **New document** — ilagay ang document information at recipients.
2. **Document details** — tingnan ang status, assigned handler, at next expected action.
3. **Route / Forward** — piliin ang recipients, action, at status.
4. **Review this transaction** — suriin ang names at outcome bago mag-send.
5. **Document Routing & Audit History** — sundan ang numbered handoffs; i-expand para sa handler activity, remarks, at files.

Sa `DocumentDetailModal.tsx`, hanapin ang `TRACKING PROGRESS SECTION`, `RECIPIENTS`, `Routing History Timeline`, at `AUDIT LOG`. Sa `RouteDocumentModal.tsx`, hanapin ang `FLOW GUIDE` at `REVIEW`.

Ang `Recipients & responses` ay may sariling response/activity para sa bawat recipient. Ang `Sent together` ay mga recipient sa parehong dispatch. Ang document status at assigned handler sa overview ay mula sa document record; hindi ibig sabihin na natapos na ang lahat dahil may isang recipient na nag-approve o nag-forward.
