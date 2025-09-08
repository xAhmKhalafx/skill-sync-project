import { useEffect, useState } from "react";

export function useAuth() {
  const [role, setRole] = useState(() => localStorage.getItem("role") || "");
  const [authed, setAuthed] = useState(() => localStorage.getItem("authed") === "1");

  useEffect(() => {
    if (authed) localStorage.setItem("authed", "1");
    else localStorage.removeItem("authed");
    if (role) localStorage.setItem("role", role);
    else localStorage.removeItem("role");
  }, [authed, role]);

  function signin(nextRole) { setRole(nextRole); setAuthed(true); }
  function signout() { setRole(""); setAuthed(false); }

  return { authed, role, signin, signout };
}
