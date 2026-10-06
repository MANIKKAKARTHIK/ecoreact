import { api } from "./api";

export async function registerUser(data) {
  const result = await api("/auth/register", {
    method: "POST",
    body: JSON.stringify(data)
  });
  localStorage.setItem("ecoplastic_token", result.token);
  return result;
}

export async function loginUser(email, password) {
  const result = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  localStorage.setItem("ecoplastic_token", result.token);
  return result;
}

export function logoutUser() {
  localStorage.removeItem("ecoplastic_token");
  window.location.reload();
}

export async function getCurrentUser() {
  return api("/auth/me");
}

export async function resetPassword() {
  throw new Error("Password reset is not configured yet. Contact the administrator.");
}
