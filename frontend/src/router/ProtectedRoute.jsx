import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ isAllowed, redirectTo = "/login", children }) {
  if (!isAllowed) return <Navigate to={redirectTo} replace />;
  return children;
}