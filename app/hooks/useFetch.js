"use client";

import { useAuth } from "@/app/context/AuthContext";
import { getToken, refreshToken } from "@/app/lib/auth";
import { useState } from "react";

export function useFetch() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWithAuth = async (url, options = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      let currentToken = token || getToken();

      if (!currentToken) {
        throw new Error("No token available");
      }

      const headers = {
        "content-type": "application/json",
        ...options.headers,
        "authorization": `Bearer ${currentToken}`,
      };

      let response = await fetch(url, {
        ...options,
        headers,
      });

      // Nếu 401, refresh token và retry
      if (response.status === 401) {
        console.log("🔄 Token expired, refreshing...");
        const refreshResult = await refreshToken();

        if (refreshResult.success) {
          currentToken = refreshResult.token;
          headers.authorization = `Bearer ${currentToken}`;

          response = await fetch(url, {
            ...options,
            headers,
          });
        } else {
          throw new Error("Token refresh failed");
        }
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setIsLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  return { fetchWithAuth, isLoading, error };
}
