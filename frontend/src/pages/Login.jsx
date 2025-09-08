import React, { useState } from "react";
import { api } from "../api";
import { useNavigate, Link } from "react-router-dom";

export default function Login({ onAuthed }){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function submit(e){
    e.preventDefault();
    setErr("");
    try {
      const data = await api.login(email, password);
      onAuthed(data.role);
      if (data.role === "insurer") navigate("/insurer");
      else navigate("/user/dashboard");
    } catch (ex) { setErr(ex.message); }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center bg-gray-50">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl p-8 shadow border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Member login</h1>
        {err && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{err}</div>}
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-gray-700">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required className="mt-1 w-full border rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="text-sm text-gray-700">Password</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required className="mt-1 w-full border rounded-lg px-3 py-2"/>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-semibold rounded-lg py-2 hover:bg-blue-700">Sign in</button>
          <p className="text-sm text-gray-600">No account? <Link to="/register" className="text-blue-700 font-medium">Join now</Link></p>
        </div>
      </form>
    </div>
  );
}