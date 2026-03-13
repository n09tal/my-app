import { createTheme, alpha } from "@mui/material/styles";

// Duett Color Palette
export const colors = {
  // Primary teal palette
  primary: "#87c6c8",
  primaryLight: "#c7d5da",
  primaryDark: "#406c7a",
  
  // Secondary/accent colors
  coral: "#e87a42",
  coralLight: "#f4a574",
  magenta: "#d946ef",
  yellow: "#eab308",
  
  // Neutral colors
  text: "#1f2937",
  textMuted: "#6b7280",
  surface: "#ffffff",
  surfaceHover: "#f8f9fc",
  background: "#f5f7fa",
  
  // Border colors
  border: "#d1d5db",
  borderLight: "#e5e7eb",
  
  // Soft/transparent variants
  primarySoft: "rgba(135, 198, 200, 0.15)",
  primaryMuted: "rgba(135, 198, 200, 0.6)",
  coralSoft: "rgba(232, 122, 66, 0.15)",
  
  // Status colors
  closed: "#e5e7eb",
  
  // Standard gradient (teal to white)
  gradient: "linear-gradient(180deg, #87c6c8 0%, #ffffff 100%)",
  
  // Full page gradient (teal fading to background gray)
  pageGradient: "linear-gradient(180deg, #87c6c8 0%, #f5f7fa 35%, #f5f7fa 100%)",
} as const;

export type Colors = typeof colors;

const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: {
      main: "#87c6c8",
      light: "#c7d5da",
      dark: "#406c7a",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#e87a42",
      light: "#e7d89",
      dark: "#d1bf35",
      contrastText: "#ffffff",
    },
    error: {
      main: "#e67d89",
    },
    warning: {
      main: "#e87a42",
    },
    info: {
      main: "#87c6c8",
    },
    success: {
      main: "#406c7a",
    },
    background: {
      default: "#f9fafb",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: 'var(--font-inter), "Inter", sans-serif',
    h1: {
      fontFamily: 'var(--font-greycliff), "Greycliff CF", sans-serif',
      fontSize: "2rem",
      fontWeight: 600,
    },
    h2: {
      fontFamily: 'var(--font-greycliff), "Greycliff CF", sans-serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: 'var(--font-greycliff), "Greycliff CF", sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 500,
    },
    body1: {
      fontWeight: 400,
    },
    body2: {
      fontWeight: 400,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0px 0px 0px 0px transparent",
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          padding: "6px 12px",
          color: "#000000de",
          fontSize: "1rem",
          backgroundColor: alpha("#6b6b6bff", 0.15),
          "&:hover": {
            backgroundColor: "#bbbbbbff",
          },
        },
        containedPrimary: {
          backgroundColor: "primary.main",
          color: "#000000",
          "&:hover": {
            backgroundColor: "#c7d5da",
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'geometricPrecision',
        },
        html: {
          textSizeAdjust: '100%',
          WebkitTextSizeAdjust: '100%',
        },
        
      },
    },
  },
});

export default theme;
