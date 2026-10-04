import { AUTH_CREDENTIALS } from "@/constants";

const TOKEN_KEY = "auth_token";

export async function login(email, password) {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.token) {
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, data.token);
      }
      return { success: true, token: data.token, user: data.user };
    }
    throw new Error("No token in response");
  } catch (error) {
    console.error("Login error:", error.message);
    return { success: false, error: error.message };
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function refreshToken() {
  clearToken();
  return login(AUTH_CREDENTIALS.email, AUTH_CREDENTIALS.password);
}
