import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { getToken } from "../auth";

export default function InsurerClaimDetailsPage() {
  const { claimId } = useParams();
  const [claim, setClaim] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/api/claims/${encodeURIComponent(claimId)}`, { token: getToken() })
      .then(setClaim)
      .catch((e) => setErr(e.message));
  }, [claimId]);

  async function decide(decision) {
    try {
      setBusy(true);
      await api(`/api/claims/${encodeURIComponent(claimId)}/decision`, {
        method: "POST",
        body: { decision }, // backend expects: "approve" or "reject"
        token: getToken(),
      });
      const fresh = await api(`/api/claims/${encodeURIComponent(claimId)}`, { token: getToken() });
      setClaim(fresh);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (err) return <div className="bg-red-100 text-red-700 p-3 rounded">{err}</div>;
  if (!claim) return <div>Loading…</div>;

  const eob = claim.eob || {};
  const reasons = (claim.decision_reason || "").split(";").map(s=>s.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      <Link to="/insurer/dashboard" className="text-blue-600 hover:text-blue-800">← Back to Insurer Dashboard</Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Claim {claim.claimId}</h1>
            <div className="text-gray-500">Status: <span className="font-semibold">{claim.status}</span></div>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => decide("approve")} className="btn btn-primary disabled:opacity-50">Approve</button>
            <button disabled={busy} onClick={() => decide("reject")} className="btn btn-ghost disabled:opacity-50">Reject</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-xl p-4"><div className="text-xs uppercase text-gray-500">Procedure</div><div className="font-semibold">{claim.procedure_code || "—"}</div></div>
          <div className="bg-gray-50 rounded-xl p-4"><div className="text-xs uppercase text-gray-500">Amount</div><div className="font-semibold">${Number(claim.claim_amount || 0).toFixed(2)}</div></div>
          <div className="bg-gray-50 rounded-xl p-4"><div className="text-xs uppercase text-gray-500">Risk Score</div><div className="font-semibold">{(claim.risk_score ?? 0).toFixed(2)}</div></div>
          <div className="bg-gray-50 rounded-xl p-4"><div className="text-xs uppercase text-gray-500">Claimant</div><div className="font-semibold">{claim.claimant_name || "—"}</div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-gray-50 rounded-xl p-4 lg:col-span-2">
            <h3 className="font-semibold mb-2">Assessment</h3>
            {reasons.length ? (
              <ul className="list-disc ml-5 text-sm text-gray-700">{reasons.map((r,i)=><li key={i}>{r}</li>)}</ul>
            ) : (
              <div className="text-sm text-gray-600">No decision notes.</div>
            )}
          </section>
          {eob && (eob.allowed_amount != null) && (
            <section className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold mb-2">EOB</h3>
              <div className="text-sm text-gray-700">Allowed Amount: <span className="font-semibold">${Number(eob.allowed_amount).toFixed(2)}</span></div>
            </section>
          )}
        </div>

        <section className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Blockchain</h3>
          {claim.blockchain_tx ? (
            <div className="text-sm break-all">{claim.blockchain_tx}</div>
          ) : (
            <div className="text-sm text-gray-600">No transaction recorded yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}
