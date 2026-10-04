export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  // Lấy token từ header
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || !orderId) {
    return Response.json({ error: "Missing orderId or token" }, { status: 400 });
  }

  try {
    const apiUrl = `https://vendor.printway.io/api/v1/order-items/${orderId}/sub-barcodes`;

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
