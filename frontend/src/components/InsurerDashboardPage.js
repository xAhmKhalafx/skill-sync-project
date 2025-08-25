import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { getToken } from "../auth";
import { CheckCircle, AlertTriangle } from "lucide-react";

function StatusPill({ status }) {
  const ok = String(status).toLowerCase() === "approved";
  const bad = String(status).toLowerCase() === "rejected";
  const base = "px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1";
  if (ok) return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle className="w-4 h-4" /> Approved</span>;
  if (bad) return <span className={`${base} bg-red-100 text-red-700`}><AlertTriangle className="w-4 h-4" /> Rejected</span>;
  return <span className={`${base} bg-yellow-50 text-yellow-700`}>Processing</span>;
}

export default function InsurerDashboardPage() {
  const [claims, setClaims] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/claims", { token: getToken() })
      .then(setClaims)
      .catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    return claims.filter((c) => {
      const matchesQ =
        !q ||
        (c.id && c.id.toLowerCase().includes(q.toLowerCase())) ||
        (c.procedure && c.procedure.toLowerCase().includes(q.toLowerCase()));
      const matchesStatus = statusFilter === "all" || String(c.status).toLowerCase() === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [claims, q, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insurer Dashboard</h1>
          <p className="text-gray-500">Review and triage incoming claims.</p>
        </div>
        <div className="flex gap-2">
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Search by ID or Procedure..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="processing">Processing</option>
          </select>
        </div>
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
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-mono">{c.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{c.procedure || "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${Number(c.amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><StatusPill status={c.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link to={`/insurer/claim/${encodeURIComponent(c.id)}`} className="text-blue-600 hover:text-blue-800">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No matching claims.
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
