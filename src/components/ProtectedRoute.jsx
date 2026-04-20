// ============================================================
// ProtectedRoute Component
// Redirects unauthenticated users to /login
// Optionally restricts by role (patient / doctor / admin)
// ============================================================

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Props:
 *   children    — the component to render if access is allowed
 *   roles       — optional array of allowed roles e.g. ["admin", "doctor"]
 *   redirectTo  — where to redirect if unauthorized (default: "/login")
 */
export default function ProtectedRoute({ children, roles, redirectTo = "/login" }) {
  const { currentUser, userProfile, loading } = useAuth();

  // Wait for auth state to resolve before making a redirect decision
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner"></div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!currentUser) return <Navigate to={redirectTo} replace />;

  // Role check — if roles array provided, validate the user's role
  if (roles && userProfile && !roles.includes(userProfile.role)) {
    return <Navigate to="/" replace />;
  }

  // Doctor not yet approved → show pending page
  if (userProfile?.role === "doctor" && !userProfile?.approved && !roles?.includes("pending")) {
    return <Navigate to="/doctor-pending" replace />;
  }

  return children;
}
