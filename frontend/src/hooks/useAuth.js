import { useEffect, useMemo, useState } from "react";

export function useAuth() {
  const [role, setRole] = useState(() => localStorage.getItem("role") || "");
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");

  const isAuthed = !!token;

  const login = ({ role: r, access_token }) => {
    localStorage.setItem("role", r || "policyholder");
    localStorage.setItem("token", access_token || "session");
    setRole(r || "policyholder");
    setToken(access_token || "session");
  };

  const logout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    setRole("");
    setToken("");
  };

  const value = useMemo(() => ({ isAuthed, role, token, login, logout }), [isAuthed, role, token]);
  return value;
}
