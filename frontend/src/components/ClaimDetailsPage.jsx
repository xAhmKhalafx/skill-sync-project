import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { getToken } from "../auth";
import { CheckCircle, AlertTriangle } from "lucide-react";
import RiskBar from "./RiskBar";

function StatusLabel({ status }) {
  const ok = String(status).toLowerCase() === "approved";
  const bad = String(status).toLowerCase() === "rejected";
  if (ok) return <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle className="w-4 h-4" /> Approved</span>;
  if (bad) return <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="w-4 h-4" /> Rejected</span>;
  return <span className="text-yellow-700">Manual Review</span>;
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
  const eob = claim.eob || {}; // if you echoed it from backend; otherwise hide panel

  return (
    <div className="space-y-6">
      <Link to="/user/dashboard" className="text-blue-600 hover:text-blue-800">← Back to Dashboard</Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <h1 className="text-2xl font-bold">Claim Details</h1>

        {/* Top summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <InfoCard title="Claim ID" value={<span className="font-mono">{claim.id}</span>} />
          <InfoCard title="Procedure" value={claim.procedure || "—"} />
          <InfoCard title="Amount" value={`$${Number(claim.amount || 0).toFixed(2)}`} />
          <InfoCard title="Status" value={<StatusLabel status={claim.status} />} />
        </div>

        {/* Assessment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <section className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Assessment</h2>
                <div className="text-sm text-gray-600">Decision: <span className="font-medium">{claim.ai_prediction || claim.status}</span></div>
              </div>
              <RiskBar score={claim.risk_score} />
              {reasons.length > 0 && (
                <ul className="mt-3 list-disc ml-5 text-sm text-gray-700">
                  {reasons.map((r, idx) => (<li key={idx}>{r}</li>))}
                </ul>
              )}
            </section>

            {claim.nlp_extracted_amount != null && (
              <section className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold mb-2">OCR</h3>
                <div className="text-sm text-gray-700">
                  NLP Extracted Amount: <span className="font-semibold">${Number(claim.nlp_extracted_amount).toFixed(2)}</span>
                </div>
              </section>
            )}
          </div>

          {/* EOB (read-only for users) */}
          {eob && (eob.allowed_amount != null) && (
            <section className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold mb-3">Explanation of Benefits</h3>
              <div className="space-y-2 text-sm">
                <Row label="Allowed Amount" value={`$${Number(eob.allowed_amount || 0).toFixed(2)}`} />
                <Row label="Plan Payable" value={`$${Number(eob.plan_payable || 0).toFixed(2)}`} />
                <Row label="Your Responsibility" value={`$${Number(eob.member_liability || 0).toFixed(2)}`} />
              </div>
            </section>
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

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-gray-600">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
