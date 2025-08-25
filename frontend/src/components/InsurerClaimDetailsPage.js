import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { getToken } from "../auth";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function InsurerClaimDetailsPage() {
  const { claimId } = useParams();
  const [claim, setClaim] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api(`/api/claims/${encodeURIComponent(claimId)}`, { token: getToken() })
      .then(setClaim)
      .catch((e) => setError(e.message));
  }, [claimId]);

  const onApprove = () => setMessage("Approve/Reject endpoints not wired yet. (We can add /api/claims/:id/decision)");
  const onReject = () => setMessage("Approve/Reject endpoints not wired yet. (We can add /api/claims/:id/decision)");

  if (error) return <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>;
  if (!claim) return <div>Loading claim…</div>;

  const ok = String(claim.status).toLowerCase() === "approved";
  const bad = String(claim.status).toLowerCase() === "rejected";

  return (
    <div className="space-y-6">
      <Link to="/insurer/dashboard" className="text-blue-600 hover:text-blue-800">← Back to Insurer Dashboard</Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Claim info */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold mb-4">Claim Review</h1>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Info title="Claim ID" value={<span className="font-mono">{claim.id}</span>} />
            <Info title="Procedure" value={claim.procedure || "—"} />
            <Info title="Amount" value={`$${Number(claim.amount || 0).toFixed(2)}`} />
            <Info title="Status" value={
              ok ? <span className="text-green-700 inline-flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Approved</span>
                 : bad ? <span className="text-red-700 inline-flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Rejected</span>
                 : <span className="text-yellow-700">Processing</span>
            } />
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <Info title="AI Prediction" value={claim.ai_prediction || claim.status} />
            {claim.nlp_extracted_amount != null && (
              <Info title="NLP Extracted Amount" value={`$${Number(claim.nlp_extracted_amount).toFixed(2)}`} />
            )}
          </div>

          <div className="mt-6 text-sm text-gray-600">
            <div className="font-semibold mb-1">Original Document</div>
            <div className="text-gray-500">Download link can be added if you expose a secure download endpoint.</div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-fit">
          <div className="text-lg font-semibold mb-4">Actions</div>
          <div className="space-y-3">
            <button onClick={onApprove} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl">
              Approve Claim
            </button>
            <button onClick={onReject} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl">
              Reject Claim
            </button>
            {message && <div className="text-xs text-gray-600">{message}</div>}
          </div>
          <div className="mt-6 text-xs text-gray-500">
            (We can wire these to a POST <code>/api/claims/:id/decision</code> endpoint that updates status + writes to blockchain.)
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ title, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
