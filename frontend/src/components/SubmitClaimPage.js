import React, { useState } from "react";
import { api } from "../api";
import { getToken } from "../auth";

export default function SubmitClaimPage() {
  const [form, setForm] = useState({
    claimant_name: "",
    procedure_code: "",
    claim_amount: "",
    file: null,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file") setForm((f) => ({ ...f, file: files?.[0] || null }));
    else setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("claimant_name", form.claimant_name);
      fd.append("procedure_code", form.procedure_code);
      fd.append("claim_amount", form.claim_amount);
      if (form.file) fd.append("file", form.file);

      const data = await api("/api/submit", { method: "POST", body: fd, token: getToken() });
      setResult(data);
      setForm({ claimant_name: "", procedure_code: "", claim_amount: "", file: null });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h1 className="text-2xl font-bold mb-2">Submit a Claim</h1>
          <p className="text-gray-500 mb-6">Upload your document and provide details. We’ll analyze it with OCR + AI.</p>

          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
          {result && (
            <div className={`p-4 rounded mb-4 ${result.prediction === "Approved" ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
              <div className="font-semibold">Submitted!</div>
              <div>Claim ID: <span className="font-mono">{result.claimId || result.claim_id}</span></div>
              <div>Prediction: <span className="font-semibold">{result.prediction}</span></div>
              {result.reason && <div>Reason: {result.reason}</div>}
            </div>
          )}

          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Claimant Name</label>
                <input name="claimant_name" value={form.claimant_name} onChange={onChange} className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Procedure Code</label>
                <input name="procedure_code" value={form.procedure_code} onChange={onChange} className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Claim Amount</label>
                <input name="claim_amount" value={form.claim_amount} onChange={onChange} className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">File (PDF/PNG/JPG)</label>
                <input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff" onChange={onChange} className="w-full" />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" className="btn btn-primary">Submit</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
