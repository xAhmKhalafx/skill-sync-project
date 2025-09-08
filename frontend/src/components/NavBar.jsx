import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Container from "./Container";

export default function Navbar({ authed, role, onSignout }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200">
      <Container className="flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">SS</span>
          <span className="font-semibold text-gray-900">SkillSync Health</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/plans" className={({isActive})=> isActive?"text-blue-600 font-medium":"text-gray-700 hover:text-gray-900"}>Plans</NavLink>
          <NavLink to="/claims" className={({isActive})=> isActive?"text-blue-600 font-medium":"text-gray-700 hover:text-gray-900"}>Claims</NavLink>
          <a href="https://www.privatehealth.gov.au/" className="text-gray-700 hover:text-gray-900" target="_blank" rel="noreferrer">Compare policies</a>
        </nav>
        <div className="flex items-center gap-3">
          {!authed ? (
            <>
              <Link to="/login" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Log in</Link>
              <Link to="/register" className="px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Join now</Link>
            </>
          ) : (
            <>
              {role === "insurer" ? (
                <Link to="/insurer" className="px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Insurer Console</Link>
              ) : (
                <Link to="/user/dashboard" className="px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">My Dashboard</Link>
              )}
              <button onClick={()=>{onSignout(); navigate("/");}} className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Sign out</button>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}