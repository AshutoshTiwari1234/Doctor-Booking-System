// ============================================================
// App.jsx — Root Router with all application routes
// Protected routes enforce authentication and role checks
// ============================================================

import React from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Pages
import Home from "./pages/Home";
import Doctors from "./pages/Doctors";
import BookAppointment from "./pages/BookAppointment";
import MyAppointments from "./pages/MyAppointments";
import MedicalReports from "./pages/MedicalReports";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminPanel from "./pages/AdminPanel";
import DoctorPending from "./pages/DoctorPending";
import FCMDebug from "./pages/FCMDebug";

// Components
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

export default function App() {
  return (
    <div className="app">
      {/* Persistent Navbar shown on all pages */}
      <Navbar />

      <main className="main-content">
        <Routes>
          {/* ─── Public Routes ──────────────────────────── */}
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/doctor-pending" element={<DoctorPending />} />
          <Route path="/fcm-debug" element={<FCMDebug />} />

          {/* ─── Patient Protected Routes ─────────────── */}
          <Route
            path="/book"
            element={
              <ProtectedRoute roles={["patient"]}>
                <BookAppointment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute roles={["patient"]}>
                <MyAppointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medical-reports"
            element={
              <ProtectedRoute roles={["patient"]}>
                <MedicalReports />
              </ProtectedRoute>
            }
          />

          {/* ─── Doctor Protected Routes ──────────────── */}
          <Route
            path="/doctor-dashboard"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          {/* ─── Admin Protected Routes ───────────────── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* ─── Fallback 404 ─────────────────────────── */}
          <Route path="*" element={
            <div style={{ textAlign: "center", padding: "120px 24px" }}>
              <div style={{ fontSize: "4rem" }}>🏥</div>
              <h2 style={{ color: "var(--navy)", margin: "16px 0 8px" }}>Page Not Found</h2>
              <p style={{ color: "var(--gray-500)" }}>The page you're looking for doesn't exist.</p>
              <a href="/" className="btn btn-primary" style={{ marginTop: 24, display: "inline-flex" }}>
                Go to Home →
              </a>
            </div>
          } />
        </Routes>
      </main>

      {/* Global toast notification container */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
        style={{ marginTop: 80 }}
      />
    </div>
  );
}
