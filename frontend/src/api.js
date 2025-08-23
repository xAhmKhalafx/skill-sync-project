// Simple fetch wrapper. If you later add JWT, pass { token } to include Authorization.
export async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`http://localhost:5001${path}`, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}
