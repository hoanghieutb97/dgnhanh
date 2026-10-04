// Fetch sub-barcode info with token refresh on 401
export async function fetchSubBarcodeInfo(barcode, token, onTokenRefresh = null) {
  try {
    console.log("📡 Fetching sub-barcode:", barcode);
    const response = await fetch(
      `/api/sub-barcodes?limit=20&offset=0&q=${barcode}`,
      {
        method: "GET",
        headers: {
          "authorization": `Bearer ${token}`,
        },
      }
    );

    console.log("Sub-barcode response status:", response.status);

    const data = await response.json();
    console.log("Sub-barcode response data:", data);

    // Check token invalid in response body hoặc status 401
    if (response.status === 401 || data.error === "Invalid token") {
      console.log("⚠️ Token invalid, refreshing...");
      if (onTokenRefresh) {
        const newToken = await onTokenRefresh();
        if (newToken) {
          console.log("✅ New token received, retrying...");
          return fetchSubBarcodeInfo(barcode, newToken, null);
        }
      }
      return null;
    }

    if (response.ok && data.rows) {
      const barcodeData = data.rows[0];
      if (!barcodeData) {
        console.warn("⚠️ Barcode not found in response. Rows:", data.rows);
      }
      return barcodeData;
    } else {
      console.error("❌ Sub-barcode API error:", response.status, data);
      return null;
    }
  } catch (error) {
    console.error("Sub-barcode fetch error:", error);
    return null;
  }
}

// Fetch order by pwOrderId (search) with token refresh on 401
export async function fetchOrder(pwOrderId, token, onTokenRefresh = null) {
  try {
    console.log("📡 Fetching order:", pwOrderId);
    const response = await fetch(
      `/api/orders?limit=100&offset=0&search=${pwOrderId}`,
      {
        method: "GET",
        headers: {
          "authorization": `Bearer ${token}`,
        },
      }
    );

    console.log("Order response status:", response.status);
    const data = await response.json();
    console.log("Order response data:", data);

    // Check token invalid in response body hoặc status 401
    if (response.status === 401 || data.error === "Invalid token") {
      console.log("⚠️ Token invalid, refreshing...");
      if (onTokenRefresh) {
        const newToken = await onTokenRefresh();
        if (newToken) {
          console.log("✅ New token received, retrying...");
          return fetchOrder(pwOrderId, newToken, null);
        }
      }
      return null;
    }

    if (response.ok) {
      // Response format: {orders: [...], total, limit, offset}
      if (data.orders && data.orders.length > 0) {
        const orderData = data.orders[0];
        console.log("Order info:", orderData);
        return orderData;
      } else {
        console.error("No order found in response");
        return null;
      }
    } else {
      console.error("Order API error:", response.status, data);
      return null;
    }
  } catch (error) {
    console.error("Order fetch error:", error);
    return null;
  }
}

// Fetch sub-barcodes (units) for a specific order item
export async function fetchSubBarcodes(orderItemId, token, onTokenRefresh = null) {
  try {
    console.log("📡 Fetching sub-barcodes for order item:", orderItemId);
    const response = await fetch(
      `/api/order-items?orderId=${orderItemId}`,
      {
        method: "GET",
        headers: {
          "authorization": `Bearer ${token}`,
        },
      }
    );

    console.log("Sub-barcodes response status:", response.status);
    const data = await response.json();

    // Check token invalid in response body hoặc status 401
    if (response.status === 401 || data.error === "Invalid token") {
      console.log("⚠️ Token invalid, refreshing...");
      if (onTokenRefresh) {
        const newToken = await onTokenRefresh();
        if (newToken) {
          console.log("✅ New token received, retrying...");
          return fetchSubBarcodes(orderItemId, newToken, null);
        }
      }
      return null;
    }

    if (response.ok) {
      console.log("Sub-barcodes info:", data);
      return data;
    } else {
      console.error("Sub-barcodes API error:", response.status);
      return null;
    }
  } catch (error) {
    console.error("Sub-barcodes fetch error:", error);
    return null;
  }
}

// Scan unit print
export async function scanUnitPrint(unitCode, stepId, token, onTokenRefresh = null) {
  return scanUnitStep(unitCode, stepId, token, onTokenRefresh);
}

// Scan unit cut
export async function scanUnitCut(unitCode, stepId, token, onTokenRefresh = null) {
  return scanUnitStep(unitCode, stepId, token, onTokenRefresh);
}

// Scan unit package
export async function scanUnitPackage(unitCode, stepId, token, onTokenRefresh = null) {
  return scanUnitStep(unitCode, stepId, token, onTokenRefresh);
}

// Scan unit QC Pass (with special QC payload)
export async function scanUnitQC(unitCode, stepId, token, onTokenRefresh = null) {
  try {
    console.log("✔️ Scanning QC pass for unit:", unitCode, "stepId:", stepId);
    const response = await fetch(
      `/api/sub-barcodes-scan`,
      {
        method: "POST",
        headers: {
          "authorization": `Bearer ${token}`,
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({
          code: unitCode,
          stepId: stepId,
          qc: {
            result: "pass",
            blameStepId: stepId,
          },
        }),
      }
    );

    console.log("QC scan response status:", response.status);
    const data = await response.json();

    if (response.status === 401 || data.error === "Invalid token") {
      console.log("⚠️ Token invalid, refreshing...");
      if (onTokenRefresh) {
        const newToken = await onTokenRefresh();
        if (newToken) {
          console.log("✅ New token received, retrying...");
          return scanUnitQC(unitCode, stepId, newToken, null);
        }
      }
      return null;
    }

    if (response.ok) {
      console.log("QC scan success:", data);
      return { success: true, data };
    } else {
      console.error("QC scan API error:", response.status, data);
      return { success: false, error: data.error || "QC scan failed", status: response.status, data };
    }
  } catch (error) {
    console.error("QC scan error:", error);
    return null;
  }
}

// Core scan function (shared by print, cut, qc, etc.)
async function scanUnitStep(unitCode, stepId, token, onTokenRefresh = null) {
  try {
    console.log("📸 Scanning unit:", unitCode, "for step:", stepId);
    const response = await fetch(
      `/api/sub-barcodes-scan`,
      {
        method: "POST",
        headers: {
          "authorization": `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: unitCode,
          stepId: stepId,
        }),
      }
    );

    console.log("Scan response status:", response.status);
    const data = await response.json();

    // Check token invalid in response body hoặc status 401
    if (response.status === 401 || data.error === "Invalid token") {
      console.log("⚠️ Token invalid, refreshing...");
      if (onTokenRefresh) {
        const newToken = await onTokenRefresh();
        if (newToken) {
          console.log("✅ New token received, retrying...");
          return scanUnitStep(unitCode, stepId, newToken, null);
        }
      }
      return null;
    }

    if (response.ok) {
      console.log("Scan success:", data);
      return { success: true, data };
    } else {
      console.error("Scan API error:", response.status, data);
      return { success: false, error: data.error || "Scan failed", status: response.status, data };
    }
  } catch (error) {
    console.error("Scan error:", error);
    return null;
  }
}
