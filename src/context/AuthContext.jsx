// ============================================================
// AuthContext — Global Authentication State
// Provides: currentUser, userProfile (role), loading state
//
// Role resolution priority:
//   1. PostgreSQL profile from Data Connect (when SDK is generated)
//   2. Email-based role fallback from roleConfig.js (works always)
// ============================================================

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserProfile } from "../firebase/auth";
import { getRoleForEmail } from "../firebase/roleConfig";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Try to fetch full profile from PostgreSQL via Data Connect
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
            console.log("[Auth] Loaded profile from PostgreSQL:", profile.role);
          } else {
            // DB returned nothing — fall back to email-based role
            const fallback = buildProfileFromUser(user);
            setUserProfile(fallback);
            console.log("[Auth] No DB profile, using email-based role:", fallback.role);
          }
        } catch (err) {
          // Data Connect SDK not generated yet or DB not set up
          console.warn("[Auth] Data Connect error:", err.message);
          console.warn("[Auth] Falling back to email-based role");
          setUserProfile(buildProfileFromUser(user));
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Re-fetch profile (e.g., after admin approves a doctor)
  const refreshProfile = async () => {
    if (currentUser) {
      try {
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile || buildProfileFromUser(currentUser));
      } catch {
        setUserProfile(buildProfileFromUser(currentUser));
      }
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    refreshProfile,
    isPatient: userProfile?.role === "patient",
    isDoctor:  userProfile?.role === "doctor",
    isAdmin:   userProfile?.role === "admin",
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// ─── Build a minimal profile from Firebase Auth user + email role ─
// Used as fallback when Data Connect DB is unavailable
function buildProfileFromUser(user) {
  return {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "User",
    email: user.email,
    role: getRoleForEmail(user.email),
    phone: "",
    approved: true,
  };
}

// Custom hook for consuming AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
