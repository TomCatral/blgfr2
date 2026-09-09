import { alpha, createTheme, type PaletteMode } from '@mui/material/styles';

export const createAppTheme = (mode: PaletteMode) => {
  const dark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: '#3f3f46', dark: '#27272a', light: '#a1a1aa' },
      secondary: { main: '#52525b' },
      warning: { main: '#d97706' },
      success: { main: '#059669' },
      error: { main: '#dc2626' },
      background: {
        default: dark ? '#101012' : '#f7f7f8',
        paper: dark ? '#18181b' : '#ffffff',
      },
      text: {
        primary: dark ? '#f4f4f5' : '#27272a',
        secondary: dark ? '#a1a1aa' : '#71717a',
      },
      divider: dark ? '#303036' : '#e4e4e7',
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
      fontSize: 14,
      body1: { fontSize: '0.875rem', lineHeight: 1.55 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.45 },
      h1: { fontWeight: 650, letterSpacing: '-0.025em' },
      h2: { fontWeight: 650, letterSpacing: '-0.025em' },
      h3: { fontWeight: 650, letterSpacing: '-0.02em' },
      h4: { fontWeight: 650, letterSpacing: '-0.02em' },
      h5: { fontWeight: 650, letterSpacing: '-0.02em' },
      h6: { fontWeight: 650, letterSpacing: '-0.015em' },
      button: { fontWeight: 650, textTransform: 'none', letterSpacing: 0 },
    },
    shadows: [
      'none',
      `0 1px 2px ${alpha('#18181b', dark ? 0.3 : 0.06)}`,
      `0 4px 14px ${alpha('#18181b', dark ? 0.34 : 0.08)}`,
      `0 10px 30px ${alpha('#18181b', dark ? 0.38 : 0.1)}`,
      ...Array(21).fill(`0 16px 40px ${alpha('#18181b', dark ? 0.42 : 0.12)}`),
    ] as any,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { scrollbarColor: `${dark ? '#3f3f46' : '#a9b8cc'} transparent` },
          '::selection': { background: '#3f3f46', color: '#fff' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 40,
            borderRadius: 8,
            paddingInline: 14,
            gap: 6,
            fontSize: 13,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            transition: 'background-color 140ms ease, border-color 140ms ease, color 140ms ease',
            '&.MuiButton-containedPrimary': {
              background: '#3f3f46',
              boxShadow: 'none',
              '&:hover': { background: '#27272a', boxShadow: 'none' },
            },
            '&.MuiButton-containedWarning': { color: '#fff', boxShadow: 'none' },
            '&.MuiButton-outlined': { borderColor: dark ? '#3f3f46' : '#d4d4d8', backgroundColor: dark ? '#27272a' : '#fff' },
            '&.MuiButton-outlinedPrimary, &.MuiButton-textPrimary': { color: dark ? '#e4e4e7' : '#3f3f46' },
          },
          sizeLarge: { minHeight: 44, paddingInline: 18, fontSize: 13 },
          sizeSmall: { minHeight: 34, paddingInline: 11, borderRadius: 7, fontSize: 12 },
        },
      },
      MuiIconButton: { styleOverrides: { root: { flex: '0 0 auto', width: 38, height: 38, borderRadius: 8, transition: 'background-color 140ms ease, color 140ms ease', '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 } } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        styleOverrides: {
          root: { border: `1px solid ${dark ? '#303036' : '#e4e4e7'}` },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: {
          borderRadius: 14, border: `1px solid ${dark ? '#303036' : '#e4e4e7'}`,
          maxHeight: 'calc(100dvh - 32px)', margin: 16,
          '& .MuiButton-root': { minHeight: 44, fontSize: 14, whiteSpace: 'normal' },
          '& input, & textarea': { fontSize: 16 },
          '@media (max-width: 600px)': { margin: 12, width: 'calc(100% - 24px)', maxHeight: 'calc(100dvh - 24px)' },
        } },
      },
      MuiDialogTitle: { styleOverrides: { root: { padding: '20px 24px', fontSize: 20, lineHeight: 1.4, borderBottom: `1px solid ${dark ? '#303036' : '#e4e4e7'}` } } },
      MuiDialogContent: { styleOverrides: { root: { padding: '24px', '&.MuiDialogContent-root': { paddingTop: 20 }, overflowWrap: 'anywhere' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${dark ? '#303036' : '#e4e4e7'}`, '& > :not(style) ~ :not(style)': { marginLeft: 0 } } } },
      MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiTableHead: { styleOverrides: { root: { background: dark ? '#151f31' : '#f5f8fc' } } },
      MuiTableCell: { styleOverrides: { head: { color: dark ? '#aebbd0' : '#52525b', fontSize: 11.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }, root: { borderColor: dark ? '#303036' : '#e4e4e7', padding: '13px 16px', fontSize: 12.5 } } },
      MuiTableRow: { styleOverrides: { root: { transition: 'background-color 140ms ease', 'tbody &:hover': { backgroundColor: dark ? 'rgba(51,65,85,.42)' : '#fafafa' } } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 700 } } },
      MuiTabs: { styleOverrides: { root: { minHeight: 42 } } },
      MuiTab: { styleOverrides: { root: { minHeight: 42, textTransform: 'none', fontWeight: 700 } } },
      MuiTooltip: { defaultProps: { arrow: true, enterDelay: 500 } },
    },
  });
};
