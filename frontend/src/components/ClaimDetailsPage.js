import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { getToken } from "../auth";
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
    api(`/api/claims/${encodeURIComponent(claimId)}`, { token: getToken() })
      .then(setClaim)
      .catch((e) => setError(e.message));
  }, [claimId]);

  if (error) return <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>;
  if (!claim) return <div>Loading claim…</div>;

  return (
    <div className="space-y-6">
      <Link to="/user/dashboard" className="text-blue-600 hover:text-blue-800">← Back to Dashboard</Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold mb-4">Claim Details</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <InfoCard title="Claim ID" value={<span className="font-mono">{claim.id}</span>} />
          <InfoCard title="Procedure" value={claim.procedure || "—"} />
          <InfoCard title="Amount" value={`$${Number(claim.amount || 0).toFixed(2)}`} />
          <InfoCard title="Status" value={<StatusLabel status={claim.status} />} />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <InfoCard title="Prediction" value={claim.ai_prediction || claim.status} />
          {claim.nlp_extracted_amount != null && (
            <InfoCard title="NLP Extracted Amount" value={`$${Number(claim.nlp_extracted_amount).toFixed(2)}`} />
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
