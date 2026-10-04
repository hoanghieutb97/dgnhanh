export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const limit = searchParams.get("limit") || 100;
  const offset = searchParams.get("offset") || 0;

  // Lấy token từ header
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return Response.json({ error: "No token provided" }, { status: 401 });
  }

  try {
    const apiUrl = `https://vendor.printway.io/api/v1/orders?limit=${limit}&offset=${offset}&search=${search}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("API error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
