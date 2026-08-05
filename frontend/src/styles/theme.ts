import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#5b2c87",
    },
    secondary: {
      main: "#00897b",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
    divider: '#e0e0e0',
    grey: {
      50: '#fafafa',
      300: '#cccccc',
    },
  },
  typography: {
    fontFamily: '"Arial", "Helvetica", sans-serif',
    h5: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
});
