import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import { Box, CircularProgress, CssBaseline, Typography } from "@mui/material";
import { theme } from "./styles/theme";
import "./styles/App.scss";
import HomePage from "./pages/HomePage";
import MainApp from "./components/MainApp";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./hooks/useAuth";

const App: React.FC = () => {
  const { currentUser, isLoggedIn, isAuthLoading, handleLogin, handleRegister, handleLogout } =
    useAuth();

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: "100vh" }}>
          {isAuthLoading && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
                bgcolor: "background.default",
                gap: 3,
              }}
            >
              <CircularProgress size={60} thickness={4} />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: "primary.main",
                }}
              >
                Treasury
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Loading your workspace...
              </Typography>
            </Box>
          )}

          {!isAuthLoading && !isLoggedIn && (
            <HomePage onLogin={handleLogin} onRegister={handleRegister} />
          )}

          {!isAuthLoading && isLoggedIn && currentUser && (
            <MainApp currentUser={currentUser} onLogout={handleLogout} />
          )}
        </Box>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
