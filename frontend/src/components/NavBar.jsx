import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Shield, LogIn, LogOut, LayoutDashboard } from "lucide-react";

export default function NavBar({ isAuthed, role, onLogout }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-gray-900">Skill Sync Health</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/plans" className={({isActive})=> isActive?"text-blue-600 font-medium":"text-gray-700 hover:text-gray-900"}>Plans</NavLink>
          <NavLink to="/claims" className={({isActive})=> isActive?"text-blue-600 font-medium":"text-gray-700 hover:text-gray-900"}>Claims</NavLink>
          <NavLink to="/providers" className={({isActive})=> isActive?"text-blue-600 font-medium":"text-gray-700 hover:text-gray-900"}>Providers</NavLink>
          <NavLink to="/support" className={({isActive})=> isActive?"text-blue-600 font-medium":"text-gray-700 hover:text-gray-900"}>Support</NavLink>
        </nav>
        <div className="flex items-center gap-3">
          {!isAuthed ? (
            <Link to="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50">
              <LogIn className="w-4 h-4"/>
              <span>Sign in</span>
            </Link>
          ) : (
            <>
              <button onClick={()=> navigate(role === 'insurer' ? '/insurer/dashboard' : '/user/dashboard')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                <LayoutDashboard className="w-4 h-4"/>
                <span>Dashboard</span>
              </button>
              <button onClick={onLogout} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50">
                <LogOut className="w-4 h-4"/>
                <span>Sign out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}