import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { getToken } from "../auth";
import { CheckCircle, AlertTriangle } from "lucide-react";

function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();
  const base = "px-3 py-1 rounded-full text-sm inline-flex items-center gap-1";
  if (s === "approved") return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle className="w-4 h-4" /> Approved</span>;
  if (s === "rejected") return <span className={`${base} bg-red-100 text-red-700`}><AlertTriangle className="w-4 h-4" /> Rejected</span>;
  return <span className={`${base} bg-yellow-100 text-yellow-700`}>Manual Review</span>;
}

export default function InsurerDashboardPage() {
  const [claims, setClaims] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/claims", { token: getToken() })
      .then(setClaims)
      .catch((e) => {
        // Treat 404 as "no claims yet"
        if (e.status === 404) setClaims([]);
        else setError(e.message);
      });
  }, []);

  const rows = useMemo(() => {
    let list = claims;
    if (filter !== "All") {
      list = list.filter(c => String(c.status).toLowerCase() === filter.toLowerCase());
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(c =>
        String(c.claimId || "").toLowerCase().includes(needle) ||
        String(c.procedure_code || "").toLowerCase().includes(needle)
      );
    }
    return list;
  }, [claims, q, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Insurer Dashboard</h1>
        <p className="text-gray-500">Review and triage incoming claims.</p>
      </div>

      <div className="flex items-center gap-3">
        <input
          className="w-72 px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by ID or Procedure"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="px-3 py-2 rounded-xl border border-gray-300"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option>All</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>Manual Review</option>
        </select>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Procedure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((c) => (
                <tr key={c.claimId}>
                  <td className="px-6 py-4 whitespace-nowrap font-mono">{c.claimId || "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{c.procedure_code || "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${Number(c.claim_amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><StatusPill status={c.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link to={`/insurer/claim/${encodeURIComponent(c.claimId)}`} className="text-blue-600 hover:text-blue-800">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No claims yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
