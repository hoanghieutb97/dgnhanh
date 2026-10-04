"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { login, getToken } from "@/app/lib/auth";
import { AUTH_CREDENTIALS } from "@/constants";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initToken = async () => {
      try {
        let currentToken = getToken();

        if (!currentToken) {
          const result = await login(AUTH_CREDENTIALS.email, AUTH_CREDENTIALS.password);
          if (result.success) {
            currentToken = result.token;
          }
        }

        setToken(currentToken);
      } catch (error) {
        console.error("Init token error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initToken();
  }, []);

  const value = {
    token,
    isLoading,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
