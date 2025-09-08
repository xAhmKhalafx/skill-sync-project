import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Plans from "./pages/Plans";
import ClaimsGuide from "./pages/ClaimsGuide";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import InsurerConsole from "./pages/InsurerConsole";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./router/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";

export default function App(){
  const { authed, role, signin, signout } = useAuth();

  return (
    <BrowserRouter>
      <Navbar authed={authed} role={role} onSignout={signout} />
      <Routes>
        {/* Public site pages */}
        <Route path="/" element={<Home />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/claims" element={<ClaimsGuide />} />
        <Route path="/login" element={<Login onAuthed={signin} />} />
        <Route path="/register" element={<Register />} />

        {/* Member-only */}
        <Route path="/user/dashboard" element={
          <ProtectedRoute isAllowed={authed && role !== "insurer"}>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Insurer-only */}
        <Route path="/insurer" element={
          <ProtectedRoute isAllowed={authed && role === "insurer"}>
            <InsurerConsole />
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
