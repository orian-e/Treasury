import { useState, useEffect } from "react";
import { apiRequest, setAuthToken } from "../utils/api";

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setIsAuthLoading(true);
      try {
        // Cookie is sent automatically via credentials: 'include' in apiRequest;
        // falls back to the stored bearer token otherwise.
        const response = await apiRequest("/auth/verify");
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user.name);
          setIsLoggedIn(true);
        } else {
          setAuthToken(null);
        }
      } catch {
        // No valid session — stay logged out
      }
      setIsAuthLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      setAuthToken(data.token);
      setCurrentUser(data.user.name);
      setIsLoggedIn(true);
    } else {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const response = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      setAuthToken(data.token);
      setCurrentUser(data.user.name);
      setIsLoggedIn(true);
    } else {
      const error = await response.json();
      throw new Error(error.error || "Registration failed");
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      setAuthToken(null);
      setCurrentUser(null);
      setIsLoggedIn(false);
    }
  };

  return {
    currentUser,
    isLoggedIn,
    isAuthLoading,
    handleLogin,
    handleRegister,
    handleLogout,
  };
};
