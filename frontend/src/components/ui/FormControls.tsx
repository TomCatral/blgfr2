import { styled } from "@mui/material/styles";

const controlStyles = ({ theme }: { theme: any }) => ({
  width: "100%",
  minHeight: 44,
  padding: "10px 12px",
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 10,
  font: "inherit",
  fontSize: 13,
  lineHeight: 1.45,
  outline: 0,
  transition:
    "border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease",
  "&:hover:not(:disabled)": {
    borderColor: theme.palette.mode === "dark" ? "#52627a" : "#a1a1aa",
  },
  "&:focus": {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${theme.palette.primary.main}22`,
  },
  "&:disabled": {
    opacity: 0.62,
    cursor: "not-allowed",
    backgroundColor: theme.palette.action.disabledBackground,
  },
  "&::placeholder": { color: theme.palette.text.secondary, opacity: 0.75 },
});

export const FormInput = styled("input")(({ theme }) => ({
  ...controlStyles({ theme }),
  '&[type="checkbox"], &[type="radio"]': {
    width: 18,
    height: 18,
    minHeight: 18,
    padding: 0,
    borderRadius: 4,
    accentColor: theme.palette.primary.main,
    boxShadow: "none",
  },
  '&[type="file"]': {
    padding: 7,
    "&::file-selector-button": {
      minHeight: 30,
      marginRight: 10,
      padding: "6px 11px",
      color: theme.palette.primary.main,
      background: `${theme.palette.primary.main}12`,
      border: 0,
      borderRadius: 8,
      fontWeight: 700,
      cursor: "pointer",
    },
  },
  '&[type="range"]': {
    paddingInline: 0,
    border: 0,
    background: "transparent",
    boxShadow: "none",
  },
}));

export const FormSelect = styled("select")(({ theme }) => ({
  ...controlStyles({ theme }),
  paddingRight: 36,
  cursor: "pointer",
}));

export const FormTextarea = styled("textarea")(({ theme }) => ({
  ...controlStyles({ theme }),
  minHeight: 104,
  resize: "vertical",
}));
