// ============================================================
// DoctorPending Page — Shown to newly registered doctors
// awaiting admin approval to start accepting bookings
// ============================================================

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DoctorPending() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f0f9ff, #f0fdf4)",
      padding: "24px",
    }}>
      <div className="card animate-fade-up" style={{
        maxWidth: 480,
        width: "100%",
        padding: "48px 40px",
        textAlign: "center",
      }}>
        {/* Pending icon */}
        <div style={{ fontSize: "4rem", marginBottom: 16 }}>🩺</div>

        <div className="badge badge-yellow" style={{ fontSize: "0.85rem", marginBottom: 20, display: "inline-flex" }}>
          ⏳ Pending Approval
        </div>

        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--navy)", marginBottom: 12 }}>
          Registration Submitted!
        </h1>

        <p style={{ color: "var(--gray-500)", lineHeight: 1.7, marginBottom: 24 }}>
          Welcome, <strong>{userProfile?.name || "Doctor"}</strong>! Your registration as a <strong>{userProfile?.specialty || "specialist"}</strong> has been received.
          <br /><br />
          Our admin team will review and approve your profile within <strong>24–48 hours</strong>. You'll be able to log in and start accepting appointments once approved.
        </p>

        {/* What happens next */}
        <div style={{
          background: "#f0f9ff",
          border: "1px solid #bfdbfe",
          borderRadius: 14,
          padding: "20px",
          marginBottom: 24,
          textAlign: "left",
        }}>
          <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 12 }}>📋 What happens next?</div>
          {[
            { step: "1", text: "Admin reviews your profile and credentials" },
            { step: "2", text: "You get notified once approved" },
            { step: "3", text: "Set your availability and time slots" },
            { step: "4", text: "Start accepting patient bookings!" },
          ].map((s) => (
            <div key={s.step} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
              <div style={{
                width: 22, height: 22,
                background: "var(--teal)",
                borderRadius: "50%",
                color: "white",
                fontSize: "0.7rem",
                fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>{s.step}</div>
              <span style={{ fontSize: "0.88rem", color: "var(--gray-600)" }}>{s.text}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn btn-outline" onClick={() => navigate("/")}>
            Home
          </button>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Check Status
          </button>
        </div>

        <p style={{ marginTop: 20, fontSize: "0.8rem", color: "var(--gray-400)" }}>
          Registered as: {currentUser?.email}
        </p>
      </div>
    </div>
  );
}
