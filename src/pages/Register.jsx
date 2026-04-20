// ============================================================
// Register Page — Simple Patient Sign-Up
//
// All accounts are created as "patient" by default.
// Role is auto-assigned based on email (see roleConfig.js):
//   • Admin emails  → admin  (e.g. divyanshu.2428cse15@kiet.edu)
//   • Doctor emails → doctor (pre-configured list)
//   • Everyone else → patient
//
// No role selector shown — users just create an account.
// ============================================================

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../firebase/auth";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Register() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", phone: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  };

  // ─── Validation ───────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password || form.password.length < 6) e.password = "Password must be 6+ characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter valid 10-digit number";
    return e;
  };

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { role } = await registerUser(
        form.email,
        form.password,
        form.name,
        { phone: form.phone }
      );

      // Redirect based on auto-assigned role
      if (role === "admin") navigate("/admin");
      else if (role === "doctor") navigate("/doctor-dashboard");
      else navigate("/");
    } catch (err) {
      const map = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/weak-password": "Password is too weak.",
      };
      setErrors({ general: map[err.code] || "Registration failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Redirect if already logged in
  React.useEffect(() => {
    if (userProfile) {
      if (userProfile.role === "admin") navigate("/admin");
      else if (userProfile.role === "doctor") navigate("/doctor-dashboard");
      else navigate("/");
    } else if (currentUser) {
      navigate("/");
    }
  }, [currentUser, userProfile]);

  return (
    <div className="auth-page">
      <div className="auth-bg-shapes">
        <div className="auth-shape s1"></div>
        <div className="auth-shape s2"></div>
      </div>

      <div className="auth-card card animate-fade-up" style={{ maxWidth: 480 }}>
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon">+</div>
          <span className="logo-main">DocBridge</span>
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join MediBook to book appointments and manage your health</p>

        {errors.general && <div className="auth-error-banner">{errors.general}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              id="reg-name"
              className={`form-input ${errors.name ? "input-error" : ""}`}
              placeholder="Raj Kumar"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              autoComplete="name"
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              id="reg-email"
              className={`form-input ${errors.email ? "input-error" : ""}`}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              autoComplete="email"
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          {/* Phone (optional) */}
          <div className="form-group">
            <label className="form-label">Phone Number <span style={{ opacity: 0.5 }}>(optional)</span></label>
            <input
              id="reg-phone"
              className={`form-input ${errors.phone ? "input-error" : ""}`}
              placeholder="9876543210"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              maxLength={10}
            />
            {errors.phone && <div className="form-error">{errors.phone}</div>}
          </div>

          {/* Passwords */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                id="reg-password"
                className={`form-input ${errors.password ? "input-error" : ""}`}
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                autoComplete="new-password"
              />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input
                id="reg-confirm-password"
                className={`form-input ${errors.confirmPassword ? "input-error" : ""}`}
                type="password"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
            </div>
          </div>

          {/* Submit */}
          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary btn-lg auth-btn"
            disabled={loading}
          >
            {loading ? <span className="spinner"></span> : "Create Account →"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
