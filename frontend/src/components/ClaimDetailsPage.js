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
  return <span className="text-yellow-700">Manual Review</span>;
}

function InfoCard({ title, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="text-xs uppercase text-gray-500">{title}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
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

  const reasons = (claim.decision_reason || "").split(";").map(s => s.trim()).filter(Boolean);
  const eob = claim.eob || {};

  return (
    <div className="space-y-6">
      <Link to="/user/dashboard" className="text-blue-600 hover:text-blue-800">← Back to Dashboard</Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <h1 className="text-2xl font-bold">Claim Details</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <InfoCard title="Claim ID" value={<span className="font-mono">{claim.claimId}</span>} />
          <InfoCard title="Procedure" value={claim.procedure_code || "—"} />
          <InfoCard title="Amount" value={`$${Number(claim.claim_amount || 0).toFixed(2)}`} />
          <InfoCard title="Status" value={<StatusLabel status={claim.status} />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <section className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Assessment</h3>
              <div className="text-sm text-gray-700">
                Risk Score: <span className="font-semibold">{(claim.risk_score ?? 0).toFixed(2)}</span>
              </div>
              {reasons.length > 0 && (
                <ul className="list-disc ml-5 mt-2 text-sm text-gray-700">
                  {reasons.map((r,i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </section>
          </div>

          {eob && (eob.allowed_amount != null) && (
            <section className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold mb-2">EOB</h3>
              <div className="text-sm text-gray-700">
                Allowed Amount: <span className="font-semibold">${Number(eob.allowed_amount).toFixed(2)}</span>
              </div>
            </section>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Blockchain</h3>
          {claim.blockchain_tx ? (
            <div className="text-sm break-all">{claim.blockchain_tx}</div>
          ) : (
            <div className="text-sm text-gray-600">No transaction recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
