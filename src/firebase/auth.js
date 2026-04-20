// ============================================================
// Firebase Authentication Helpers
// Auth itself (Firebase Auth) is unchanged.
// Profile reads/writes now go to PostgreSQL via Data Connect.
//
// Role assignment is EMAIL-BASED (see roleConfig.js):
//   • divyanshu.2428cse15@kiet.edu  → admin
//   • dr.*@medibook.com emails       → doctor (pre-approved)
//   • Everyone else                  → patient
// ============================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth } from "./config";
import { createUserProfile, getUserProfile as dcGetUserProfile } from "./dataconnect";
import { getRoleForEmail } from "./roleConfig";

const googleProvider = new GoogleAuthProvider();

// ─── Register a new user ──────────────────────────────────────
// 1. Creates Firebase Auth account
// 2. Role is auto-determined from email (no manual role selection)
// 3. Best-effort: writes profile to PostgreSQL via Data Connect
export const registerUser = async (email, password, name, extraData = {}) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  // Update display name in Firebase Auth
  await updateProfile(credential.user, { displayName: name });

  // Auto-assign role based on email
  const role = getRoleForEmail(email);

  // Best-effort DB write — a stub/DB failure must never block signup
  try {
    await createUserProfile({
      uid,
      name,
      email,
      role,
      phone: extraData.phone || "",
    });
    console.log("[Auth] Created user profile in PostgreSQL:", role);
  } catch (dbErr) {
    console.warn("[Auth] Could not write user profile to DB:", dbErr.message);
    // AuthContext will fall back to email-based role automatically
  }

  return { user: credential.user, role };
};

// ─── Email/password login ─────────────────────────────────────
export const loginUser = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

// ─── Google sign-in (popup) ───────────────────────────────────
// Uses a popup window — works correctly on localhost dev.
// Role is auto-determined from email on first sign-in.
// NOTE: DB operations are wrapped in try-catch — a Data Connect
//       failure must NEVER block the Firebase Auth login itself.
export const loginWithGoogle = async () => {
  const credential = await signInWithPopup(auth, googleProvider);
  const uid = credential.user.uid;
  const email = credential.user.email;

// Best-effort: create PostgreSQL profile on first Google sign-in.
    // onAuthStateChanged in AuthContext handles the UI update regardless.
    try {
      const existing = await dcGetUserProfile(uid);
      if (!existing) {
        const role = getRoleForEmail(email);
        await createUserProfile({
          uid,
          name: credential.user.displayName || "User",
          email,
          role,
          phone: "",
        });
        console.log("[Auth] Created Google user profile in PostgreSQL:", role);
      } else {
        console.log("[Auth] Google user profile exists in PostgreSQL:", existing.role);
      }
    } catch (dbErr) {
      // Log but don't throw — auth succeeded, profile sync can retry later
      console.warn("[Auth] Profile sync after Google login failed:", dbErr.message);
    }

  return credential.user;
};

// ─── Logout ───────────────────────────────────────────────────
export const logoutUser = () => signOut(auth);

// ─── Password reset ───────────────────────────────────────────
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

// ─── Get user profile from PostgreSQL via Data Connect ────────
export const getUserProfile = async (uid) => {
  return await dcGetUserProfile(uid);
};
