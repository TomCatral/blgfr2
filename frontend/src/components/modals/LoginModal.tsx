// LoginModal
// Data, events, layout, at kasalukuyang inline design ng component.

// IMPORTS: Mga component, helper, at library na ginagamit dito.
import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  User as UserIcon,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../services/api";
import { User } from "../../types";

// DATA: Mga props at uri ng data na ginagamit ng component.
interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: User) => void;
  onClose?: () => void;
}

// LOGIC: State, events, at pagproseso ng data.
export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  onClose,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      onLoginSuccess((await api.login(username.trim(), password)).user);
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const result = await api.forgotAdminPassword(resetIdentifier.trim());
      setSuccessMsg(result.message);
      setResetIdentifier("");
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Unable to reset the administrator password.",
      );
    } finally {
      setLoading(false);
    }
  };

  // LAYOUT: Ang nakikita sa screen.
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="login-title"
      slotProps={{
        paper: { sx: { overflow: "auto", maxHeight: "calc(100dvh - 32px)" } },
        backdrop: {
          sx: {
            backdropFilter: "blur(4px)",
            background:
              "rgba(24,24,27,.5)",
          },
        },
      }}
    >
      <Box sx={{ p: { xs: 3, sm: 4 } }}>
        <Box
          sx={{
            mb: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 1,
          }}
        >
          <Avatar
            src="/blgflogo.jpg"
            alt="BLGF Region II Logo"
            sx={{
              width: 64,
              height: 64,
              mb: 1,
              bgcolor: "#fff",
              border: "5px solid white",
              boxShadow: "0 12px 32px rgba(24,24,27,.18)",
            }}
          />
          <Typography id="login-title" variant="h5">
            BLGF Region II
          </Typography>
          <Typography
            variant="overline"
            color="primary"
            sx={{ lineHeight: 1.2, fontWeight: 800, letterSpacing: ".14em" }}
          >
            Document Tracking System
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter your official credentials to access the records workspace.
          </Typography>
        </Box>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMsg}
          </Alert>
        )}
        {showForgotPassword ? (
          <Box
            component="form"
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            onSubmit={handleForgotPassword}
          >
            <TextField
              id="administrator-identifier"
              label="Administrator username or email"
              required
              autoFocus
              value={resetIdentifier}
              onChange={(event) => setResetIdentifier(event.target.value)}
              placeholder="Enter username or email"
              helperText="A temporary password will be sent to the email saved on the account."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyRound size={18} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              disabled={loading}
              variant="contained"
              size="large"
              startIcon={
                loading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <KeyRound size={16} />
                )
              }
            >
              {loading ? "Sending…" : "Email Temporary Password"}
            </Button>
            <Button
              onClick={() => {
                setShowForgotPassword(false);
                setErrorMsg("");
              }}
            >
              Back to sign in
            </Button>
          </Box>
        ) : (
          <Box
            component="form"
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            onSubmit={handleSubmit}
          >
            <TextField
              id="login-username"
              label="Username"
              required
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <UserIcon size={18} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              id="login-password"
              label="Password"
              required
              autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={18} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              {onClose && (
                <Button variant="outlined" onClick={onClose}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                fullWidth
                disabled={loading}
                variant="contained"
                size="large"
                startIcon={
                  loading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <LogIn size={17} />
                  )
                }
              >
                {loading ? "Authenticating…" : "Sign In to System"}
              </Button>
            </Box>
            <Button
              size="small"
              onClick={() => {
                setShowForgotPassword(true);
                setResetIdentifier(username);
                setErrorMsg("");
                setSuccessMsg("");
              }}
            >
              Forgot administrator password?
            </Button>
          </Box>
        )}
        <Typography
          component="footer"
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            textAlign: "center",
            mt: 3,
            pt: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          Bureau of Local Government Finance • Regional Office No. II
        </Typography>
      </Box>
    </Dialog>
  );
};
