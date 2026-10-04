// API Endpoints
export const API_BASE_URL = "https://vendor.printway.io/api/v1";
export const AUTH_ENDPOINT = `${API_BASE_URL}/auth/login`;

// Authentication Credentials
export const AUTH_CREDENTIALS = {
  email: "hieudzsupplier@gmail.com",
  password: "hieudzsupplier@123",
};

// Token constants
export const TOKEN_STORAGE_KEY = "auth_token";
export const TOKEN_EXPIRY_KEY = "auth_token_expiry";
export const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // Refresh 30 minutes before expiry
export const TOKEN_WARNING_TIME = 5 * 60 * 1000; // Warn 5 minutes before expiry

// Donggoi constants
export const DONGGOI_TITLE = "Đóng Gói";
export const DONGGOI_DESCRIPTION = "Trang quản lý đóng gói";

export const DONGGOI_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const DONGGOI_TYPES = {
  BOX: "box",
  PALLET: "pallet",
  CONTAINER: "container",
};
