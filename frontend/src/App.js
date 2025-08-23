import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { Shield, LogIn, FileText, PlusCircle, LayoutDashboard } from "lucide-react";

import LoginPage from "./components/LoginPage";
import DashboardPage from "./components/DashboardPage";
import SubmitClaimPage from "./components/SubmitClaimPage";
import ClaimDetailsPage from "./components/ClaimDetailsPage";

function Header({ isAuthenticated, onLogout }) {
  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <span className="font-semibold text-lg">AI Claims</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/" className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link to="/submit" className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1">
            <PlusCircle className="w-4 h-4" /> Submit Claim
          </Link>
          {isAuthenticated ? (
            <button onClick={onLogout} className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
              <LogIn className="w-4 h-4 rotate-180" /> Logout
            </button>
          ) : (
            <Link to="/login" className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1">
              <LogIn className="w-4 h-4" /> Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="container mx-auto px-6 py-6 text-sm text-gray-500">
        © {new Date().getFullYear()} AI Claims System — Demo
      </div>
    </footer>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState("policyholder"); // or 'insurer'

  const handleLoginSuccess = (r) => {
    setRole(r || "policyholder");
    setIsAuthenticated(true);
  };
  const handleLogout = () => {
    setIsAuthenticated(false);
    setRole("policyholder");
    localStorage.removeItem("token");
  };

  return (
    <BrowserRouter>
      <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <main className="container mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<DashboardPage role={role} />} />
          <Route path="/submit" element={<SubmitClaimPage />} />
          <Route path="/claim/:claimId" element={<ClaimDetailsPage />} />
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
