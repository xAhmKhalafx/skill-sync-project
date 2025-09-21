import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function PlansPage() {
  const tiers = [
    { name:"Hospital Basic", price:19, features:["Emergency ambulance","Public hospitals","Day surgery"] },
    { name:"Extras Everyday", price:15, features:["General dental","Physio & chiro","Optical allowance"] },
    { name:"Complete Care", price:39, features:["Private hospitals","Major dental","Higher annual limits"] },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Compare plans</h1>
      <p className="text-gray-600 mt-2">Choose a cover that matches your life. Prices indicative per week.</p>
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {tiers.map(t => (
          <div key={t.name} className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="flex items-baseline justify-between">
              <div className="font-semibold text-gray-900">{t.name}</div>
              <div className="text-2xl font-bold text-blue-600">${t.price}<span className="text-sm font-medium text-gray-500">/wk</span></div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {t.features.map(f => (
                <li key={f} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600"/>{f}</li>
              ))}
            </ul>
            <button className="mt-6 w-full px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">Get a quote</button>
          </div>
        ))}
      </div>
    </div>
  );
}
