import React from "react";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="font-semibold mb-3">Products</h4>
          <ul className="space-y-2 text-gray-600">
            <li><a href="/plans" className="hover:text-gray-900">Hospital Cover</a></li>
            <li><a href="/plans" className="hover:text-gray-900">Extras Cover</a></li>
            <li><a href="/plans" className="hover:text-gray-900">Combined Cover</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Support</h4>
          <ul className="space-y-2 text-gray-600">
            <li><a href="/claims" className="hover:text-gray-900">Make a claim</a></li>
            <li><a href="/support" className="hover:text-gray-900">Help centre</a></li>
            <li><a href="/providers" className="hover:text-gray-900">Find a provider</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-gray-600">
            <li><a href="#" className="hover:text-gray-900">About</a></li>
            <li><a href="#" className="hover:text-gray-900">Careers</a></li>
            <li><a href="#" className="hover:text-gray-900">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Legal</h4>
          <ul className="space-y-2 text-gray-600">
            <li><a href="#" className="hover:text-gray-900">Privacy</a></li>
            <li><a href="#" className="hover:text-gray-900">Terms</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">© {new Date().getFullYear()} Skill Sync Health. All rights reserved.</div>
    </footer>
  );
}
