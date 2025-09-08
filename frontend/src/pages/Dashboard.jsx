import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function Dashboard(){
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const list = await api.listClaims();
        setClaims(list);
      } catch (e) { setError(String(e)); }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="py-10 max-w-5xl mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-900">My claims</h1>
      {loading && <p className="mt-6 text-gray-600">Loading…</p>}
      {error && <p className="mt-6 text-red-600">{error}</p>}
      <div className="mt-6 grid gap-4">
        {claims.map(c => (
          <div key={c.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{c.procedure || "Claim"}</div>
              <div className="text-sm text-gray-600">${c.amount?.toFixed ? c.amount.toFixed(2) : c.amount} · {c.status}</div>
            </div>
            <a href={`/user/dashboard/${c.id}`} className="text-blue-700 font-semibold">View details →</a>
          </div>
        ))}
        {claims.length === 0 && !loading && (
          <div className="text-gray-600">No claims yet. Use the button below to submit your first claim.</div>
        )}
      </div>

      {/* Simple uploader */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Submit a claim</h2>
        <ClaimForm />
      </div>
    </div>
  );
}

function ClaimForm(){
  const [file, setFile] = useState(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e){
    e.preventDefault();
    setMsg("");
    if (!file) { setMsg("Please attach your invoice/receipt."); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("amount", amount);
    fd.append("description", description);
    fd.append("fullName", name);
    fd.append("email", email);
    fd.append("phone", phone);
    setBusy(true);
    try {
      const res = await api.submitClaim(fd);
      setMsg(`Submitted! Decision: ${res.prediction} · Risk: ${res.risk_score}`);
    } catch (ex) {
      setMsg(String(ex));
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-4 bg-white rounded-xl border p-4 grid md:grid-cols-2 gap-4">
      <div>
        <label className="text-sm text-gray-700">Full name</label>
        <input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" required />
      </div>
      <div>
        <label className="text-sm text-gray-700">Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" required />
      </div>
      <div>
        <label className="text-sm text-gray-700">Phone</label>
        <input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
      </div>
      <div>
        <label className="text-sm text-gray-700">Amount ($)</label>
        <input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" required />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm text-gray-700">Description</label>
        <input value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="e.g., Knee MRI Scan" required />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm text-gray-700">Invoice / receipt file</label>
        <input type="file" onChange={e=>setFile(e.target.files?.[0] || null)} className="mt-1 w-full" accept=".pdf,.png,.jpg,.jpeg" required />
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <button disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">{busy?"Submitting…":"Submit claim"}</button>
        {msg && <span className="text-sm text-gray-700">{msg}</span>}
      </div>
    </form>
  );
}
