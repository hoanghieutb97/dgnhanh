import { AUTH_ENDPOINT, AUTH_CREDENTIALS } from "@/constants";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    console.log("🔐 Auth API route called for:", email);

    const response = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    console.log("📡 External API status:", response.status);

    const data = await response.json();
    console.log("📦 External API response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return Response.json(
        { error: `Login failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    console.log("✅ Returning user data:", data.user ? "YES" : "NO");
    return Response.json(data);
  } catch (error) {
    console.error("❌ Auth route error:", error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
