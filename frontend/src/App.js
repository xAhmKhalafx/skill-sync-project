import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { Shield, LogIn, LayoutDashboard, PlusCircle } from "lucide-react";

import LoginPage from "./components/LoginPage";
import UserDashboardPage from "./components/UserDashboardPage";
import SubmitClaimPage from "./components/SubmitClaimPage";
import ClaimDetailsPage from "./components/ClaimDetailsPage";
import InsurerDashboardPage from "./components/InsurerDashboardPage";
import InsurerClaimDetailsPage from "./components/InsurerClaimDetailsPage";
import { getRole, getToken, clearAuth } from "./auth";

function Header({ isAuthenticated, role, onLogout }) {
  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <span className="font-semibold text-lg">AI Claims</span>
        </Link>
        <nav className="flex items-center gap-4">
          {role === "insurer" ? (
            <Link to="/insurer/dashboard" className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1">
              <LayoutDashboard className="w-4 h-4" /> Insurer Dashboard
            </Link>
          ) : (
            <>
              <Link to="/user/dashboard" className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link to="/user/submit" className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1">
                <PlusCircle className="w-4 h-4" /> Submit Claim
              </Link>
            </>
          )}
          {isAuthenticated ? (
            <button onClick={onLogout} className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
              <LogIn className="w-4 h-4 rotate-180" /> Logout
            </button>
          ) : (
            <Link to="/login" className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
              <LogIn className="w-4 h-4" /> Logout
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

function ProtectedRoute({ children }) {
  const authed = !!getToken() || !!getRole();
  if (!authed) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ children, allow }) {
  const role = getRole();
  if (!allow.includes(role)) {
    return <Navigate to={role === "insurer" ? "/insurer/dashboard" : "/user/dashboard"} replace />;
  }
  return children;
}

export default function App() {
const token = getToken();
const role = token ? getRole() : null;   // only load role if authed
const isAuthenticated = !!token;

  const handleLogout = () => {
    clearAuth();
    window.location.assign("/login");
  };

  return (
    <BrowserRouter>
      <Header isAuthenticated={isAuthenticated} role={role} onLogout={handleLogout} />
      <main className="container mx-auto px-6 py-8">
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to={role === "insurer" ? "/insurer/dashboard" : "/user/dashboard"} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Policyholder */}
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute allow={["policyholder"]}>
                  <UserDashboardPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/submit"
            element={
              <ProtectedRoute>
                <RoleRoute allow={["policyholder"]}>
                  <SubmitClaimPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/claim/:claimId"
            element={
              <ProtectedRoute>
                <RoleRoute allow={["policyholder"]}>
                  <ClaimDetailsPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* Insurer */}
          <Route
            path="/insurer/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute allow={["insurer"]}>
                  <InsurerDashboardPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/insurer/claim/:claimId"
            element={
              <ProtectedRoute>
                <RoleRoute allow={["insurer"]}>
                  <InsurerClaimDetailsPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
