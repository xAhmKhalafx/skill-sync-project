import React from "react";
import Container from "../components/Container";

const TIERS = [
  { name: "Basic Hospital", price: 21, perks: ["Standard ward", "Emergency only", "Public hospitals"], badge: "Starter" },
  { name: "Silver Plus", price: 42, perks: ["Private room where available", "Most clinical categories", "Extras add‑ons"], badge: "Popular" },
  { name: "Gold Complete", price: 69, perks: ["All clinical categories", "Lowest out‑of‑pocket", "Premium support"], badge: "Best" },
];

export default function Plans(){
  return (
    <section className="py-16">
      <Container>
        <h1 className="text-3xl font-bold text-gray-900">Plans & Pricing</h1>
        <p className="mt-2 text-gray-600">See what’s included at each tier. You can compare policies on privatehealth.gov.au too.</p>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {TIERS.map((t)=> (
            <div key={t.name} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">{t.name}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{t.badge}</span>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-gray-900">${t.price}<span className="text-base font-medium text-gray-500">/wk</span></div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-gray-700 list-disc list-inside">
                {t.perks.map(p=> <li key={p}>{p}</li>)}
              </ul>
              <button className="mt-6 w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">Choose {t.name}</button>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}