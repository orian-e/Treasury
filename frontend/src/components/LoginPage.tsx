import React, { useState } from "react";
import { Box, TextField, Button, Typography, Alert } from "@mui/material";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>; // ← Add this
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
    setLoading(true);

    // Email format validation
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await onLogin(email.trim().toLowerCase(), password);
      } else {
        await onRegister(name, email.trim().toLowerCase(), password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 8, p: 3 }}>
      <Typography variant="h4" align="center" gutterBottom>
        {isLogin ? "Login" : "Register"}
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
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          required
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
          sx={{ mt: 3 }}
        >
          {loading ? "Loading..." : isLogin ? "Login" : "Register"}
        </Button>

        <Button
          fullWidth
          variant="text"
          onClick={() => setIsLogin(!isLogin)}
          sx={{ mt: 1 }}
        >
          {isLogin ? "Need an account? Register" : "Have an account? Login"}
        </Button>
      </form>
    </Box>
  );
};

export default LoginPage;
