import React from "react";

export default function StatCard({ label, value, hint }) {
  return (
    <div className="p-6 rounded-2xl bg-white shadow-sm border border-gray-200">
      <div className="text-3xl font-semibold text-gray-900">{value}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
      {hint && <div className="mt-2 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}
