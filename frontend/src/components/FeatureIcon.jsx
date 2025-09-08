import React from "react";
export default function FeatureIcon({ title, text, icon }) {
  return (
    <div className="bg-white/70 backdrop-blur rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="text-3xl mb-3" aria-hidden>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600 mt-1 text-sm leading-6">{text}</p>
    </div>
  );
}
