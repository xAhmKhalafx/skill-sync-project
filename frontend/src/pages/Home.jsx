import React from "react";
import { Link } from "react-router-dom";
import Container from "../components/Container";
import FeatureIcon from "../components/FeatureIcon";

export default function Home(){
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <Container className="py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Health cover that’s clear, fair, and fast.
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-xl">
              Get cover that suits your life. Manage your membership, submit claims and track decisions easily.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/plans" className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">Explore plans</Link>
              <Link to="/login" className="px-5 py-3 rounded-xl bg-white text-gray-900 font-semibold border border-gray-300 hover:bg-gray-50">Member login</Link>
            </div>
            <div className="mt-6 text-gray-500 text-sm">
              Trusted by thousands of members across Australia.
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] rounded-3xl bg-white shadow-xl border border-gray-100 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-blue-100/70 p-4">
                  <p className="text-sm font-semibold text-blue-900">Fast claiming</p>
                  <p className="text-xs text-blue-900/80">Submit a claim in minutes</p>
                </div>
                <div className="rounded-xl bg-emerald-100/70 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Fraud protection</p>
                  <p className="text-xs text-emerald-900/80">AI-assisted checks</p>
                </div>
                <div className="rounded-xl bg-purple-100/70 p-4">
                  <p className="text-sm font-semibold text-purple-900">Track status</p>
                  <p className="text-xs text-purple-900/80">Real-time updates</p>
                </div>
                <div className="rounded-xl bg-amber-100/70 p-4">
                  <p className="text-sm font-semibold text-amber-900">Support</p>
                  <p className="text-xs text-amber-900/80">Here when you need us</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Value props */}
      <section className="py-16 bg-white">
        <Container>
          <h2 className="text-2xl font-bold text-gray-900">Why choose SkillSync Health</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <FeatureIcon title="Transparent plans" text="Simple tiers and clear inclusions so you can compare with confidence." icon={<span>🧭</span>} />
            <FeatureIcon title="Easy claims" text="Guided, step‑by‑step claiming with instant confirmation." icon={<span>✅</span>} />
            <FeatureIcon title="Member-first support" text="Local support and helpful guides when you need answers." icon={<span>💬</span>} />
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50">
        <Container>
          <h2 className="text-2xl font-bold text-gray-900">How claiming works</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="text-sm font-semibold text-gray-900">1. Submit</div>
              <p className="text-gray-600 text-sm mt-2">Upload your invoice and tell us what happened.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="text-sm font-semibold text-gray-900">2. Assess</div>
              <p className="text-gray-600 text-sm mt-2">Our rules + AI check your claim and calculate benefits.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="text-sm font-semibold text-gray-900">3. Track</div>
              <p className="text-gray-600 text-sm mt-2">See status, reasons and your Explanation of Benefits.</p>
            </div>
          </div>
          <div className="mt-8">
            <Link to="/claims" className="text-blue-700 font-semibold">View detailed claiming guide →</Link>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16">
        <Container>
          <div className="bg-blue-600 rounded-3xl p-8 md:p-12 text-white flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-bold">Find cover that fits your life</h3>
              <p className="mt-2 text-blue-100">Compare plans in minutes and join online.</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link to="/plans" className="inline-block px-5 py-3 rounded-xl bg-white text-blue-700 font-semibold hover:bg-blue-50">Compare plans</Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
