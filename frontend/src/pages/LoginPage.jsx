import React, { useState } from "react";
import { Shield } from "lucide-react";
import { apiPost } from "../utils/api";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiPost("/api/login", { email, password });
      onLogin({ role: data.role, access_token: data.access_token });
    } catch (err) {
      setError("Login failed. Check email and password.");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] bg-gray-50">
      <div className="p-8 max-w-md w-full bg-white rounded-2xl shadow border border-gray-200">
        <div className="flex justify-center mb-6">
          <Shield className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Sign in</h2>
        {error && <p className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-60">
            {loading? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}