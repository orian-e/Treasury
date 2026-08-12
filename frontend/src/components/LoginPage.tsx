import React, { useState } from "react";
import { Box, TextField, Button, Typography, Alert } from "@mui/material";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    // Email format validation
    if (!emailRegex.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await onLogin(normalizedEmail, password);
      } else {
        await onRegister(
          name.trim(),
          normalizedEmail,
          password
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = () => {
    setIsLogin((current) => !current);
    setError("");
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 400,
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: 1,
        p: { xs: 3, sm: 4 },
      }}
    >
      <Typography
        variant="h5"
        component="h2"
        align="center"
        sx={{ fontWeight: 600 }}
      >
        {isLogin ? "Welcome back" : "Create your account"}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        sx={{ mt: 0.5, mb: 3 }}
      >
        {isLogin
          ? "Sign in to your Treasury account"
          : "Start sharing expenses in less than a minute"}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
            autoComplete="name"
          />
        )}

        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          required
          autoComplete="email"
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          required
          autoComplete={
            isLogin ? "current-password" : "new-password"
          }
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
          sx={{ mt: 3 }}
        >
          {loading
            ? isLogin
              ? "Signing in..."
              : "Creating account..."
            : isLogin
              ? "Sign in"
              : "Create account"}
        </Button>

        <Button
          type="button"
          fullWidth
          variant="text"
          onClick={handleModeChange}
          disabled={loading}
          sx={{
            mt: 1,
            textTransform: "none",
          }}
        >
          {isLogin
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </Button>
      </form>
    </Box>
  );
};

export default LoginPage;