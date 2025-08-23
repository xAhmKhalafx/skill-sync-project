import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { CheckCircle, AlertTriangle } from "lucide-react";

function StatusLabel({ status }) {
  const ok = String(status).toLowerCase() === "approved";
  const bad = String(status).toLowerCase() === "rejected";
  if (ok) return <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle className="w-4 h-4" /> Approved</span>;
  if (bad) return <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="w-4 h-4" /> Rejected</span>;
  return <span className="text-gray-700">Processing</span>;
}

export default function ClaimDetailsPage() {
  const { claimId } = useParams();
  const [claim, setClaim] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    api(`/api/claims/${encodeURIComponent(claimId)}`, { token })
      .then(setClaim)
      .catch((e) => setError(e.message));
  }, [claimId]);

  if (error) return <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>;
  if (!claim) return <div>Loading claim…</div>;

  return (
    <div className="space-y-6">
      <Link to="/" className="text-blue-600 hover:text-blue-800">← Back to Dashboard</Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold mb-4">Claim Details</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded p-4">
            <div className="text-xs text-gray-500">Claim ID</div>
            <div className="text-lg font-semibold font-mono">{claim.id}</div>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <div className="text-xs text-gray-500">Procedure</div>
            <div className="text-lg font-semibold">{claim.procedure || "—"}</div>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <div className="text-xs text-gray-500">Amount</div>
            <div className="text-lg font-semibold">${Number(claim.amount || 0).toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm text-gray-500 mb-1">Processing Status</div>
          <div className="text-base font-medium"><StatusLabel status={claim.status} /></div>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <div><span className="font-medium">Prediction:</span> {claim.ai_prediction || claim.status}</div>
          {claim.nlp_extracted_amount != null && (
            <div><span className="font-medium">NLP Extracted Amount:</span> ${Number(claim.nlp_extracted_amount).toFixed(2)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
