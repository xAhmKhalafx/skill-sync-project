import React, { useState } from "react";
import { api } from "../api";
import { FileText } from "lucide-react";

export default function SubmitClaimPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    description: "",
    amount: "",
    file: null,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file") setForm((f) => ({ ...f, file: files[0] || null }));
    else setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); setResult(null);

    try {
      const fd = new FormData();
      fd.append("fullName", form.fullName);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("description", form.description);
      fd.append("amount", form.amount);
      if (form.file) fd.append("file", form.file);

      const token = localStorage.getItem("token");
      const data = await api("/api/submit", { method: "POST", body: fd, token });
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Submit a Claim</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {result && (
        <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
          <div className="font-semibold">Submitted!</div>
          <div>Claim ID: <span className="font-mono">{result.claim_id}</span></div>
          <div>Prediction: <span className="font-semibold">{result.prediction}</span></div>
          {result.reason && <div>Reason: {result.reason}</div>}
        </div>
      )}

      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input name="fullName" value={form.fullName} onChange={onChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={onChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input name="phone" value={form.phone} onChange={onChange} className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Procedure / Description</label>
          <input name="description" value={form.description} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <input type="number" step="0.01" name="amount" value={form.amount} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Supporting Document (PDF/JPG/PNG)</label>
          <div className="flex items-center gap-3">
            <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onChange} />
            <FileText className="w-5 h-5 text-gray-500" />
          </div>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Submit</button>
      </form>
    </div>
  );
}
