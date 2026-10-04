export async function POST(request) {
  const body = await request.json();
  const { code, stepId } = body;

  // Lấy token từ header
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || !code || !stepId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const response = await fetch("https://vendor.printway.io/api/v1/sub-barcodes/scan", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),  // Pass entire body (includes qc object if present)
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("API error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
