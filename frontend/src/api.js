const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (process.env.NODE_ENV === "production"
    ? "https://fyviazfv9b.ap-southeast-2.awsapprunner.com/"
    : "http://localhost:5001");

export async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
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
