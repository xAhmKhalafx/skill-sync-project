export function saveAuth({ token, role, email }) {
  if (token) localStorage.setItem("token", token);
  if (role) localStorage.setItem("role", role);
  if (email) localStorage.setItem("email", email);
}
export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("email");
}
export function getToken() {
  return localStorage.getItem("token");
}
export function getRole() {
  return localStorage.getItem("role") || "policyholder";
}
export function isAuthed() {
  return !!getRole(); // if you add JWT later, check token as well
}
