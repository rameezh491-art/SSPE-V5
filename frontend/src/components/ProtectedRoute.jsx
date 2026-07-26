import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === null) {
    return (
      <div className="h-screen flex items-center justify-center text-[#5C6D68]" data-testid="auth-checking">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role)) return <Navigate to="/" replace />;
  }
  return children;
}
