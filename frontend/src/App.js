import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";

import HomePage from "./pages/HomePage";
import PlansPage from "./pages/PlansPage";
import ClaimsInfoPage from "./pages/ClaimsInfoPage";
import ProvidersPage from "./pages/ProvidersPage";
import SupportPage from "./pages/SupportPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PolicyholderDashboard from "./pages/dashboard/PolicyholderDashboard";
import InsurerDashboard from "./pages/dashboard/InsurerDashboard";

export default function App(){
  const auth = useAuth();
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-white">
        <NavBar isAuthed={auth.isAuthed} role={auth.role} onLogout={auth.logout} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/claims" element={<ClaimsInfoPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/login" element={!auth.isAuthed ? <LoginPage onLogin={auth.login} /> : <Navigate to={auth.role === 'insurer' ? '/insurer/dashboard' : '/user/dashboard'} replace />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/user/dashboard" element={
              <ProtectedRoute isAuthed={auth.isAuthed}>
                <PolicyholderDashboard />
              </ProtectedRoute>
            } />
            <Route path="/insurer/dashboard" element={
              <ProtectedRoute isAuthed={auth.isAuthed}>
                <InsurerDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
