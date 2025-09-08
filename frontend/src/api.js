export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5001";

export const api = {
  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    return data; // { message, role, access_token }
  },
  async listClaims() {
    const res = await fetch(`${API_BASE}/api/claims`);
    if (!res.ok) throw new Error("Failed to load claims");
    return res.json();
  },
  async getClaim(id) {
    const res = await fetch(`${API_BASE}/api/claims/${id}`);
    if (!res.ok) throw new Error("Failed to load claim");
    return res.json();
  },
  async submitClaim(formData) {
    const res = await fetch(`${API_BASE}/api/submit`, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Submit failed");
    return data;
  },
};
