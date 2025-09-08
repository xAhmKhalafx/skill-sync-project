import React from "react";
import Container from "./Container";

export default function Footer(){
  return (
    <footer className="mt-24 border-t border-gray-200 bg-white">
      <Container className="py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">SS</span>
            <span className="font-semibold text-gray-900">SkillSync Health</span>
          </div>
          <p className="text-gray-600">Smart health cover with AI-powered claims and fraud protection.</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Products</h4>
          <ul className="space-y-2 text-gray-600">
            <li><a href="/plans" className="hover:text-gray-900">Hospital cover</a></li>
            <li><a href="/plans" className="hover:text-gray-900">Extras cover</a></li>
            <li><a href="/plans" className="hover:text-gray-900">Combined</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Support</h4>
          <ul className="space-y-2 text-gray-600">
            <li><a href="/claims" className="hover:text-gray-900">How to claim</a></li>
            <li><a href="https://www.privatehealth.gov.au/" className="hover:text-gray-900" target="_blank" rel="noreferrer">Compare policies</a></li>
            <li><a href="/login" className="hover:text-gray-900">Member login</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Contact</h4>
          <p className="text-gray-600">Mon–Fri 9am–6pm AEST</p>
          <p className="text-gray-900 font-medium mt-1">1300 000 000</p>
        </div>
      </Container>
      <div className="border-t border-gray-200 py-6">
        <Container className="flex items-center justify-between text-xs text-gray-500">
          <p>© {new Date().getFullYear()} SkillSync Health Pty Ltd. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Accessibility</a>
          </div>
        </Container>
      </div>
    </footer>
  );
}
