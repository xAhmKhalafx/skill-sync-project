import React from "react";
import { Shield, CheckCircle2, FileText, Headphones } from "lucide-react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium">AI-powered claims • Fast decisions</div>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">Health insurance that actually <span className="text-blue-600">helps</span>.</h1>
            <p className="mt-5 text-gray-700 text-lg">Transparent cover, fair pricing, and a modern claims experience powered by AI. Join thousands who manage their health cover with confidence.</p>
            <div className="mt-8 flex items-center gap-3">
              <Link to="/plans" className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700">Get a quote</Link>
              <Link to="/claims" className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50">How claims work</Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="rounded-xl bg-white p-4 border border-gray-200">
                <div className="font-semibold text-gray-900">24/7 support</div>
                <div>Talk to a human when you need it.</div>
              </div>
              <div className="rounded-xl bg-white p-4 border border-gray-200">
                <div className="font-semibold text-gray-900">Fast approvals</div>
                <div>Most claims decided in minutes.</div>
              </div>
              <div className="rounded-xl bg-white p-4 border border-gray-200">
                <div className="font-semibold text-gray-900">Trusted network</div>
                <div>Thousands of providers nationwide.</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 -z-10 bg-blue-200/30 blur-3xl rounded-full"/>
            <div className="p-2 bg-white/70 backdrop-blur rounded-3xl shadow-lg border border-blue-100">
              <img alt="Happy family" src="https://images.unsplash.com/photo-1516726817505-f5ed825624d8?q=80&w=1600&auto=format&fit=crop" className="rounded-2xl object-cover aspect-[4/3]"/>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {icon: <Shield className="w-6 h-6 text-blue-600"/>, title: "Strong cover", desc: "Hospital, Extras, or Combined—pick the plan that suits you."},
            {icon: <FileText className="w-6 h-6 text-blue-600"/>, title: "Easy claims", desc: "Upload your bill, we parse it automatically and calculate benefits."},
            {icon: <Headphones className="w-6 h-6 text-blue-600"/>, title: "Human support", desc: "Real people available 24/7 if you need help."},
          ].map((it)=> (
            <div key={it.title} className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">{it.icon}</div>
              <h3 className="mt-4 font-semibold text-gray-900">{it.title}</h3>
              <p className="mt-1 text-gray-600 text-sm">{it.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANS PREVIEW */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Popular plans</h2>
          <p className="text-gray-600 mt-1">Clear inclusions, no surprises.</p>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {[{
              name: "Hospital Basic",
              price: "$19/wk",
              perks: ["Emergency ambulance","Public hospitals","No-gap with partners"],
            },{
              name: "Extras Everyday",
              price: "$15/wk",
              perks: ["Dental check-ups","Physio & chiro","Optical allowance"],
            },{
              name: "Complete Care",
              price: "$39/wk",
              perks: ["Private room","Major dental","Higher annual limits"],
            }].map((p)=> (
              <div key={p.name} className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <div className="text-blue-600 font-bold">{p.price}</div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {p.perks.map(x=> (
                    <li key={x} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600"/>{x}</li>
                  ))}
                </ul>
                <Link to="/plans" className="mt-6 inline-flex justify-center px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">Compare</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Questions, answered.</h2>
            <p className="mt-2 text-gray-600">Everything you need to know about cover, waiting periods, and claims.</p>
          </div>
          <div className="space-y-5">
            {[{
              q:"How fast are claims decided?", a:"Most straightforward claims are decided within minutes thanks to automated parsing and rules-based assessment. Complex cases go to a specialist."},
              {q:"Can I switch from my current fund?", a:"Yes. We’ll handle the paperwork and recognise equivalent waiting periods."},
              {q:"Do you have a provider network?", a:"Yes. Members get no-gap or known-gap with thousands of partners nationwide."}
            ].map(f=> (
              <div key={f.q} className="p-5 rounded-2xl border border-gray-200 bg-white">
                <div className="font-medium text-gray-900">{f.q}</div>
                <div className="mt-1 text-gray-600 text-sm">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}