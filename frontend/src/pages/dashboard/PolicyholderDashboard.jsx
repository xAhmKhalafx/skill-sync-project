import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../utils/api";

export default function PolicyholderDashboard(){
  const [claims, setClaims] = useState([]);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ fullName:"", email:"", phone:"", description:"", amount:"" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadClaims(){
    try { const data = await apiGet("/api/claims"); setClaims(data); } catch {}
  }
  useEffect(()=>{ loadClaims(); },[]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if(!file){ setMessage("Please attach your bill (PDF/JPG/PNG)"); return; }
    const fd = new FormData();
    fd.append("fullName", form.fullName);
    fd.append("email", form.email);
    fd.append("phone", form.phone);
    fd.append("description", form.description);
    fd.append("amount", Number(form.amount || 0));
    fd.append("file", file);
    setSubmitting(true); setMessage("");
    try {
      await apiPost("/api/submit", fd, true);
      setMessage("Claim submitted successfully.");
      setForm({ fullName:"", email:"", phone:"", description:"", amount:"" });
      setFile(null);
      loadClaims();
    } catch (e){ setMessage("Submission failed. Try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Your dashboard</h1>

      {/* Submit card */}
      <div className="mt-6 grid md:grid-cols-2 gap-8 items-start">
        <form onSubmit={onSubmit} className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <h2 className="font-semibold text-gray-900">Submit a new claim</h2>
          <p className="text-sm text-gray-600">Upload your bill and provide a few details.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm text-gray-700">Full name</label>
              <input className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" value={form.fullName} onChange={(e)=>setForm({...form, fullName:e.target.value})} required />
            </div>
            <div>
              <label className="text-sm text-gray-700">Email</label>
              <input type="email" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} required />
            </div>
            <div>
              <label className="text-sm text-gray-700">Phone</label>
              <input className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-700">Claim amount (AUD)</label>
              <input type="number" step="0.01" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" value={form.amount} onChange={(e)=>setForm({...form, amount:e.target.value})} required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-gray-700">Procedure / description</label>
              <textarea rows={3} className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500" value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-gray-700">Upload bill (PDF/JPG/PNG)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e)=> setFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-600" />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="mt-5 w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{submitting?"Submitting…":"Submit claim"}</button>
          {message && <div className="mt-3 text-sm text-gray-700">{message}</div>}
        </form>

        {/* Recent claims */}
        <div className="">
          <h2 className="font-semibold text-gray-900">Recent claims</h2>
          <div className="mt-3 grid gap-3">
            {claims.length === 0 && <div className="text-sm text-gray-600">No claims yet.</div>}
            {claims.map(c => (
              <div key={c.id} className="p-4 rounded-xl bg-white border border-gray-200 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{c.procedure || "Claim"}</div>
                  <div className="text-sm text-gray-600">Amount: ${c.amount?.toFixed?.(2) || c.amount}</div>
                </div>
                <div className="text-sm font-medium">
                  <span className={c.status === 'Approved' ? 'text-green-600' : c.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}