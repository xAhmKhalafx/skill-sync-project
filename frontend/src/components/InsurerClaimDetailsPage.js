import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { getToken } from "../auth";
import { CheckCircle, AlertTriangle } from "lucide-react";
import RiskBar from "./RiskBar";

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

  const reasons = useMemo(
    () => (claim?.decision_reason || "").split(";").map(s => s.trim()).filter(Boolean),
    [claim]
  );
  const eob = claim?.eob || {};
  const signals = claim?.signals || {};

  const onDecision = async (decision, note) => {
    setMessage("");
    try {
      await api(`/api/claims/${encodeURIComponent(claimId)}/decision`, {
        method: "POST",
        body: { decision, note },
        token: getToken(),
      });
      const updated = await api(`/api/claims/${encodeURIComponent(claimId)}`, { token: getToken() });
      setClaim(updated);
      setMessage(`Updated: ${decision}`);
    } catch (e) {
      setMessage(e.message);
    }
  };

  if (error) return <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>;
  if (!claim) return <div>Loading claim…</div>;

  const ok = String(claim.status).toLowerCase() === "approved";
  const bad = String(claim.status).toLowerCase() === "rejected";

  return (
    <div className="space-y-6">
      <Link to="/insurer/dashboard" className="text-blue-600 hover:text-blue-800">← Back to Insurer Dashboard</Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Claim info + assessment */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <h1 className="text-2xl font-bold">Claim Review</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Info title="Claim ID" value={<span className="font-mono">{claim.id}</span>} />
            <Info title="Procedure" value={claim.procedure || "—"} />
            <Info title="Amount" value={`$${Number(claim.amount || 0).toFixed(2)}`} />
            <Info
              title="Status"
              value={
                ok ? <span className="text-green-700 inline-flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Approved</span>
                  : bad ? <span className="text-red-700 inline-flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Rejected</span>
                  : <span className="text-yellow-700">Manual Review</span>
              }
            />
          </div>

          {/* Assessment */}
          <section className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Assessment</h2>
              <div className="text-sm text-gray-600">
                Decision: <span className="font-medium">{claim.ai_prediction || claim.status}</span>
              </div>
            </div>
            <RiskBar score={claim.risk_score} />
            {reasons.length > 0 && (
              <ul className="list-disc ml-5 text-sm text-gray-700">
                {reasons.map((r, idx) => (<li key={idx}>{r}</li>))}
              </ul>
            )}
          </section>

          {/* Signals */}
          <section className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold mb-1">Signals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <Sig label="Policy Bucket" value={signals.policy_bucket} />
              <Sig label="Service Type" value={signals.service_type} />
              <Sig label="In Network" value={signals.in_network ? "Yes" : "No"} />
              <Sig label="Hospital Tier" value={signals.hospital_tier} />
              <Sig label="Country" value={signals.country} />
              <Sig label="Emergency" value={signals.is_emergency ? "Yes" : "No"} />
            </div>
          </section>

          {/* EOB */}
          {eob && (eob.allowed_amount != null) && (
            <section className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold mb-3">Explanation of Benefits</h3>
              <div className="space-y-2 text-sm">
                <Row label="Allowed Amount" value={`$${Number(eob.allowed_amount || 0).toFixed(2)}`} />
                <Row label="Plan Payable" value={`$${Number(eob.plan_payable || 0).toFixed(2)}`} />
                <Row label="Member Liability" value={`$${Number(eob.member_liability || 0).toFixed(2)}`} />
              </div>
            </section>
          )}
        </div>

        {/* Right: Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-fit">
          <div className="text-lg font-semibold mb-4">Actions</div>
          <div className="space-y-3">
            <button onClick={() => onDecision("approve", "Reviewed & approved")} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl">
              Approve Claim
            </button>
            <button onClick={() => onDecision("reject", "Rejected due to policy rules")} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl">
              Reject Claim
            </button>
            <button onClick={() => onDecision("manual_review", "Needs more documents")} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-xl">
              Flag for Manual Review
            </button>
            {message && <div className="text-xs text-gray-600">{message}</div>}
          </div>
          <div className="mt-6 text-xs text-gray-500">
            Decision writes to <code>/api/claims/:id/decision</code> (make sure backend route is live).
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

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-gray-600">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Sig({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-gray-800">{String(value ?? "—")}</div>
    </div>
  );
}
