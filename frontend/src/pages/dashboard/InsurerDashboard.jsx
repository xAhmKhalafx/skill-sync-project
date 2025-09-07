import React from "react";
import StatCard from "../../components/StatCard";

export default function InsurerDashboard(){
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Insurer portal</h1>
      <p className="text-gray-600">Review flagged claims, adjust decisions, and monitor trends.</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Open reviews" value={12} />
        <StatCard label="Avg. decision time" value={"2.1 min"} />
        <StatCard label="Fraud blocks (30d)" value={7} />
      </div>
      <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-10 text-gray-500 text-sm">Claims review table coming soon.</div>
    </div>
  );
}