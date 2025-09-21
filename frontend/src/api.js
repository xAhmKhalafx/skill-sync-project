// src/api.js – works for CRA or Vite
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) ||
  "http://127.0.0.1:5001";

export async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const isForm = options.body instanceof FormData;

  const headers = { ...(options.headers || {}) };
  if (!isForm) headers["Content-Type"] = "application/json";
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  let body = options.body;
  if (!isForm && body && typeof body === "object") body = JSON.stringify(body);

  const res = await fetch(url, { ...options, headers, body });

  // Normal success path
  if (res.ok) return res.status === 204 ? null : res.json();

  // Friendly error objects (don’t splat raw JSON at the user)
  let msg = `${res.status} ${res.statusText}`;
  try {
    const t = await res.text();
    msg = t || msg;
    // If backend returned {"message":"..."} show that message
    try { msg = JSON.parse(t).message || msg; } catch {}
  } catch {}

  const err = new Error(msg);
  err.status = res.status;
  throw err;
}
