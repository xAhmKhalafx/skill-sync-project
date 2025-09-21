import React from "react";

export default function RiskBar({ score = 0 }) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  const color =
    s >= 70 ? "bg-red-500" : s >= 40 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>Risk</span>
        <span>{s}/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`${color} h-2.5 transition-all`}
          style={{ width: `${s}%` }}
        />
      </div>
    </div>
  );
}
