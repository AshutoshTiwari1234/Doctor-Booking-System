// ============================================================
// Login Page — Firebase Email/Password & Google Sign-In
// Supports role-based redirect after login
// ============================================================

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, loginWithGoogle, resetPassword } from "../firebase/auth";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // ─── Field change handler ─────────────────────────────────
  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  };

  // ─── Form validation ──────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password || form.password.length < 6) e.password = "Password must be at least 6 characters";
    return e;
  };

  // ─── Redirect after successful login based on role ────────
  const redirectByRole = (profile) => {
    if (!profile) { navigate("/"); return; }
    if (profile.role === "admin") navigate("/admin");
    else if (profile.role === "doctor") navigate("/doctor-dashboard");
    else navigate("/");
  };

  // ─── Email/password login ─────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      await loginUser(form.email, form.password);
      // Auth state change will update userProfile, redirect in useEffect
    } catch (err) {
      setErrors({ general: getFirebaseError(err.code) });
    } finally {
      setLoading(false);
    }
  };

  // ─── Google login ─────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setErrors({ general: "Google sign-in failed. Please try again." });
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Password reset ───────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch {
      setErrors({ reset: "Could not send reset email. Check the address." });
    }
  };

  // Redirect if already logged in (role-based when profile is loaded,
  // fallback to home if profile fetch failed but auth succeeded)
  React.useEffect(() => {
    if (userProfile) {
      redirectByRole(userProfile);
    } else if (currentUser) {
      // Firebase Auth succeeded but DB profile not loaded yet
      // (e.g. Data Connect SDK not generated, or first-time Google login)
      navigate("/");
    }
  }, [currentUser, userProfile]);

  return (
    <div className="auth-page">
      <div className="auth-bg-shapes">
        <div className="auth-shape s1"></div>
        <div className="auth-shape s2"></div>
      </div>

      <div className="auth-card card animate-fade-up">
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon">+</div>
          <span className="logo-main">DocBridge</span>
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to manage your health appointments</p>

        {/* General error */}
        {errors.general && <div className="auth-error-banner">{errors.general}</div>}

        {/* Login Form */}
        {!showReset ? (
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email field */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="login-email"
                className={`form-input ${errors.email ? "input-error" : ""}`}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                autoComplete="email"
              />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            {/* Password field */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="login-password"
                className={`form-input ${errors.password ? "input-error" : ""}`}
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                autoComplete="current-password"
              />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>

            {/* Forgot password link */}
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => setShowReset(true)}
            >
              Forgot password?
            </button>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg auth-btn"
              disabled={loading}
            >
              {loading ? <span className="spinner"></span> : "Sign In →"}
            </button>

            {/* Divider */}
            <div className="auth-divider"><span>or continue with</span></div>

            {/* Google login */}
            <button
              id="login-google"
              type="button"
              className="btn btn-outline btn-lg auth-btn auth-google-btn"
              onClick={handleGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? <span className="spinner"></span> : (
                <>
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.6 20H24v8h11.1C33.5 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36.5 24 36.5c-5.2 0-9.6-3.5-11.2-8.2L6 33.5C9.4 39.5 16.2 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20H24v8h11.1c-.8 2.2-2.3 4.1-4.3 5.4l6.2 5.2C40.7 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </form>
        ) : (
          /* Password Reset Form */
          <form onSubmit={handleReset} className="auth-form">
            <p className="auth-subtitle" style={{ marginBottom: 16 }}>
              Enter your email and we'll send a reset link.
            </p>
            {resetSent ? (
              <div className="auth-success-banner">✅ Reset link sent! Check your inbox.</div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                  {errors.reset && <div className="form-error">{errors.reset}</div>}
                </div>
                <button type="submit" className="btn btn-primary btn-lg auth-btn">
                  Send Reset Link
                </button>
              </>
            )}
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => { setShowReset(false); setResetSent(false); }}
            >
              ← Back to login
            </button>
          </form>
        )}

        {/* Register link */}
        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register" className="auth-link">Create one free →</Link>
        </p>
      </div>
    </div>
  );
}

// ─── Map Firebase error codes to user-friendly messages ──────────────────────
function getFirebaseError(code) {
  const map = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "Invalid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment.",
    "auth/invalid-credential": "Incorrect email or password.",
  };
  return map[code] || "Login failed. Please try again.";
}
