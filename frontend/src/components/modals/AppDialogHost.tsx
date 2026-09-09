// AppDialogHost
// Data, events, layout, at kasalukuyang inline design ng component.

// IMPORTS: Mga component, helper, at library na ginagamit dito.
import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import {
  DialogRequest,
  subscribeToDialogs,
} from "../../services/dialogService";

// LOGIC: State, events, at pagproseso ng data.
export const AppDialogHost: React.FC = () => {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState("");

  useEffect(
    () =>
      subscribeToDialogs((nextRequest) => {
        setValue(nextRequest.defaultValue || "");
        setRequest(nextRequest);
      }),
    [],
  );

  if (!request) return null;

  const close = (result: boolean | string | null) => {
    request.resolve(result);
    setRequest(null);
  };
  const cancelResult = request.type === "confirm" ? false : null;
  const acceptResult = request.type === "confirm" ? true : value;

  // LAYOUT: Ang nakikita sa screen.
  return (
    <Dialog
      open
      onClose={() => close(cancelResult)}
      maxWidth="xs"
      fullWidth
      aria-labelledby="app-dialog-title"
      sx={{ zIndex: (theme) => theme.zIndex.modal + 100 }}
    >
      <DialogTitle id="app-dialog-title">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <AlertTriangle size={21} color="#d97706" aria-hidden="true" />
          {request.type === "confirm" ? "Please Confirm" : "Enter Details"}
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          sx={{ whiteSpace: "pre-wrap", mb: request.type === "prompt" ? 2 : 0 }}
        >
          {request.message}
        </DialogContentText>
        {request.type === "prompt" ? (
          <TextField
            label="Your response"
            autoFocus
            fullWidth
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") close(value);
            }}
          />
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => close(cancelResult)} color="inherit">
          Cancel
        </Button>
        <Button onClick={() => close(acceptResult)} variant="contained">
          {request.type === "confirm" ? "Confirm" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
