import { api } from "./api";

const collectionPaths = {
  users: "/users",
  availablePlastic: "/plastic",
  orders: "/orders",
  deliveries: "/deliveries",
  transactions: "/transactions",
  ecoPoints: "/eco-points",
  notifications: "/notifications",
  pricing: "/pricing",
  plasticInventory: "/inventory"
};

export async function getProfile() {
  const r = await api("/auth/me");
  return r.profile;
}

export const getCurrentUser = getProfile;

export async function saveUserProfile(data) {
  return api("/users/me", { method: "PUT", body: JSON.stringify(data) });
}

export async function listCollection(name, field, value) {
  const path = collectionPaths[name] || `/${name}`;
  const qs = field && value !== undefined
    ? `?${encodeURIComponent(field)}=${encodeURIComponent(value)}`
    : "";
  return api(`${path}${qs}`);
}

export async function getPricing() {
  return api("/pricing");
}

export async function getInventory() {
  return api("/inventory");
}

export async function getPlasticListings(status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return api(`/plastic${qs}`);
}

export async function getOrders(params = {}) {
  const query = new URLSearchParams(params).toString();
  return api(query ? `/orders?${query}` : "/orders");
}

export async function createAvailablePlastic(data) {
  return api("/plastic", { method: "POST", body: JSON.stringify(data) });
}

export async function placeOrder(plastic, buyer, deliveryAddress) {
  return api("/orders", {
    method: "POST",
    body: JSON.stringify({
      plasticId: plastic.id || plastic._id,
      deliveryAddress
    })
  });
}

export async function advanceOrder(order) {
  const id = order.id || order._id;
  return api(`/orders/${id}/advance`, { method: "PATCH" });
}

export async function confirmCash(order) {
  const id = order.id || order._id;
  const r = await api(`/orders/${id}/confirm-cash`, { method: "PATCH" });
  return r.pointsEarned || 0;
}

export async function getNotifications() {
  return api("/notifications");
}

export async function markNotificationRead(id) {
  return api(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  return api("/notifications/read-all", { method: "PATCH" });
}

export async function getAdminStats() {
  return api("/admin/stats");
}

export async function updatePricing(id, data) {
  return api(`/pricing/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function toggleUserStatus(id, status) {
  return api(`/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}
