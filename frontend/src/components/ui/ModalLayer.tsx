import React from "react";
import { Box, Modal } from "@mui/material";

/** Keep dialogs outside page stacking contexts, with focus and scroll managed by MUI. */
export function ModalLayer({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={(_event, reason) => {
        if (reason === "escapeKeyDown") onClose();
      }}
      hideBackdrop
    >
      <Box
        className="mui-systemdesign-system app-modal-layer"
        tabIndex={-1}
        sx={{
          position: "fixed",
          inset: 0,
          outline: 0,
          fontFamily: (theme) => theme.typography.fontFamily,
          color: "text.primary",
          // Shared modal controls: readable text, touch targets, and visible focus.
          '& .MuiButton-root': { minHeight: 44, whiteSpace: 'normal' },
          '& input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), & select, & textarea': { fontSize: '16px !important' },
          '& button:focus-visible, & a:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
          '& .modal-reminder-panel': { display: 'flex', flexDirection: 'column', maxHeight: 'calc(100dvh - 32px)', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' },
          '& .modal-reminder-header': { p: 2.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0, '& h2': { fontSize: 20, lineHeight: 1.4, mt: 0.5 }, '& > div': { color: 'text.secondary', fontSize: 13 } },
          '& .modal-reminder-content': { p: 2.5, overflowY: 'auto', minHeight: 0, '& p': { fontSize: 15, lineHeight: 1.7 }, '& button': { fontSize: 14 } },
        }}
      >
        {children}
      </Box>
    </Modal>
  );
}
