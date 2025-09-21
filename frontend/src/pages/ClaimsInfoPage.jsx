import React from "react";
import { FileText, Upload, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function ClaimsInfoPage() {
  const steps = [
    { icon: <FileText className="w-5 h-5"/>, title: "Collect your bill", desc: "Make sure your invoice shows item totals and date of service." },
    { icon: <Upload className="w-5 h-5"/>, title: "Submit online", desc: "Log in and upload a PDF or photo. We’ll parse it automatically." },
    { icon: <CheckCircle2 className="w-5 h-5"/>, title: "Decision", desc: "Most claims decided in minutes. Complex ones go to a specialist." },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900">How claims work</h1>
      <p className="text-gray-600 mt-2">We combine OCR with rules-based assessment to provide fast, fair outcomes.</p>
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {steps.map(s => (
          <div key={s.title} className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">{s.icon}</div>
            <div className="mt-3 font-semibold text-gray-900">{s.title}</div>
            <div className="mt-1 text-sm text-gray-600">{s.desc}</div>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <Link to="/login" className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700">Log in to make a claim</Link>
      </div>
    </div>
  );
}