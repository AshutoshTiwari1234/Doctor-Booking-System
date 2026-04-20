// ============================================================
// Admin Panel — Full system management dashboard
// Fix 3: Added "Add Doctor" tab with form submission
// Fix 6: Replaced DataConnect imports with localStorage only
// Only accessible to admin role users
// ============================================================

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { doctors as seedDoctors } from "../data/doctors";
import "./AdminPanel.css";

const APPT_KEY = "medibook_appointments";
const DOCTORS_KEY = "medibook_doctors";

// ─── localStorage helpers ─────────────────────────────────
const readAppointments = () => {
  try { return JSON.parse(localStorage.getItem(APPT_KEY) || "[]"); }
  catch { return []; }
};

const readDoctors = () => {
  try {
    const stored = localStorage.getItem(DOCTORS_KEY);
    if (stored) return JSON.parse(stored);
    // First run: seed from static data and persist
    const initial = seedDoctors.map((d) => ({
      uid: String(d.id),
      name: d.name,
      email: `${d.name.toLowerCase().replace(/\s+/g, ".")}@docbridge.in`,
      specialty: d.specialty,
      hospital: d.hospital,
      fee: d.fee,
      location: d.location,
      experience: d.experience,
      role: "doctor",
      approved: true,
    }));
    localStorage.setItem(DOCTORS_KEY, JSON.stringify(initial));
    return initial;
  } catch { return []; }
};

const writeDoctors = (docs) => {
  try { localStorage.setItem(DOCTORS_KEY, JSON.stringify(docs)); }
  catch (e) { console.warn("[AdminPanel] localStorage write failed:", e); }
};

// ─── Default add-doctor form state ───────────────────────
const BLANK_DOCTOR = {
  name: "", email: "", specialty: "", hospital: "",
  location: "", experience: "", fee: "", about: "",
};

export default function AdminPanel() {
  const { userProfile } = useAuth();

  const [users, setUsers]           = useState([]);
  const [doctors, setDoctors]       = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab]   = useState("overview");
  const [loading, setLoading]       = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  // Fix 3: Add Doctor state
  const [addDoctorForm, setAddDoctorForm] = useState(BLANK_DOCTOR);
  const [addDoctorErrors, setAddDoctorErrors] = useState({});
  const [addDoctorSubmitting, setAddDoctorSubmitting] = useState(false);
  const [addDoctorSuccess, setAddDoctorSuccess] = useState(false);

  // ─── Load all data on mount ───────────────────────────────
  useEffect(() => {
    setLoading(true);
    const appts   = readAppointments();
    const docs    = readDoctors();
    setAppointments(appts);
    setDoctors(docs);

    // Build user list: doctors + unique patients from appointments
    const patientMap = {};
    appts.forEach((a) => {
      if (!patientMap[a.patientId]) {
        patientMap[a.patientId] = {
          uid: a.patientId, name: a.patientName,
          email: a.patientEmail, phone: a.patientPhone, role: "patient",
          createdAt: a.createdAt,
        };
      }
    });
    setUsers([...docs, ...Object.values(patientMap)]);
    setLoading(false);
  }, []);

  // ─── Derived stats ────────────────────────────────────────
  const patients       = users.filter((u) => u.role === "patient");
  const pendingDoctors = doctors.filter((d) => !d.approved);
  const confirmedCount = appointments.filter((a) => a.status === "Confirmed").length;
  const completedCount = appointments.filter((a) => a.status === "Completed").length;
  const cancelledCount = appointments.filter((a) => a.status === "Cancelled").length;
  const totalRevenue = appointments
    .filter((a) => a.status === "Completed")
    .reduce((sum, a) => sum + (Number(a.doctorFee) || Number(a.fee) || 0), 0);

  // Busiest doctors
  const doctorApptCounts = appointments.reduce((acc, a) => {
    acc[a.doctorId] = (acc[a.doctorId] || 0) + 1;
    return acc;
  }, {});
  const busiestDoctors = [...doctors]
    .map((d) => ({ ...d, apptCount: doctorApptCounts[d.uid] || 0 }))
    .sort((a, b) => b.apptCount - a.apptCount)
    .slice(0, 5);

  // Bookings per day (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const bookingsPerDay = last7Days.map((date) => ({
    date,
    count: appointments.filter((a) => a.date === date).length,
  }));
  const maxBookings = Math.max(...bookingsPerDay.map((d) => d.count), 1);

  // ─── Approve / revoke doctor ──────────────────────────────
  const handleApproval = (doctorUid, approved) => {
    setApprovingId(doctorUid);
    const updated = doctors.map((d) =>
      d.uid === doctorUid ? { ...d, approved } : d
    );
    writeDoctors(updated);
    setDoctors(updated);
    setUsers((prev) =>
      prev.map((u) => (u.uid === doctorUid ? { ...u, approved } : u))
    );
    setApprovingId(null);
  };

  // ─── Fix 3: Validate & submit new doctor ──────────────────
  const validateAddDoctor = () => {
    const errs = {};
    if (!addDoctorForm.name.trim())       errs.name       = "Name is required";
    if (!addDoctorForm.email.trim())      errs.email      = "Email is required";
    if (!addDoctorForm.specialty.trim())  errs.specialty  = "Specialty is required";
    if (!addDoctorForm.hospital.trim())   errs.hospital   = "Hospital is required";
    if (!addDoctorForm.fee || isNaN(Number(addDoctorForm.fee))) errs.fee = "Valid fee required";
    return errs;
  };

  const handleAddDoctorSubmit = (e) => {
    e.preventDefault();
    const errs = validateAddDoctor();
    if (Object.keys(errs).length > 0) { setAddDoctorErrors(errs); return; }

    setAddDoctorSubmitting(true);
    setAddDoctorErrors({});

    const newDoc = {
      uid: crypto.randomUUID(),
      ...addDoctorForm,
      fee: Number(addDoctorForm.fee),
      role: "doctor",
      approved: true,       // Admin-added doctors are auto-approved
      avatar: "👨‍⚕️",
      color: "#dbeafe",
      createdAt: new Date().toISOString(),
    };

    const updated = [newDoc, ...doctors];
    writeDoctors(updated);
    setDoctors(updated);
    setUsers((prev) => [newDoc, ...prev]);
    setAddDoctorForm(BLANK_DOCTOR);
    setAddDoctorSubmitting(false);
    setAddDoctorSuccess(true);
    setTimeout(() => setAddDoctorSuccess(false), 3000);
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="auth-spinner"></div>
          <p>Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="admin-header">
        <div className="admin-header-inner">
          <div>
            <div className="section-label">🛡️ Admin Portal</div>
            <h1 className="section-title">System Dashboard</h1>
            <p className="section-subtitle">Manage users, doctors, appointments and analytics</p>
          </div>
          <div className="badge badge-blue" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
            👑 {userProfile?.name}
          </div>
        </div>
      </div>

      <div className="admin-inner">
        {/* ─── Overview Stats ───────────────────────────── */}
        <div className="admin-stats">
          {[
            { icon: "👥", val: users.length,           label: "Total Users",       color: "#dbeafe" },
            { icon: "👨‍⚕️", val: doctors.length,         label: "Doctors",           color: "#dcfce7" },
            { icon: "🧑‍💼", val: patients.length,         label: "Patients",          color: "#fce7f3" },
            { icon: "📅", val: appointments.length,      label: "Total Bookings",    color: "#ede9fe" },
            { icon: "✅", val: completedCount,           label: "Completed",         color: "#d1fae5" },
            { icon: "💰", val: `₹${totalRevenue}`,       label: "Total Revenue",     color: "#dcfce7" },
            { icon: "⏳", val: pendingDoctors.length,   label: "Pending Approvals", color: "#fef3c7" },
          ].map((s, i) => (
            <div key={i} className="as-card card">
              <div className="as-icon" style={{ background: s.color }}>{s.icon}</div>
              <div className="as-val">{s.val}</div>
              <div className="as-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ─── Tabs ────────────────────────────────────── */}
        <div className="admin-tabs">
          {["overview", "doctors", "add-doctor", "patients", "appointments"].map((t) => (
            <button
              key={t}
              id={`admin-tab-${t}`}
              className={`dash-tab ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t === "overview"     ? "📊 Analytics" :
               t === "doctors"      ? `👨‍⚕️ Doctors (${pendingDoctors.length} pending)` :
               t === "add-doctor"   ? "➕ Add Doctor" :
               t === "patients"     ? `🧑‍💼 Patients (${patients.length})` :
               "📋 Appointments"}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ──────────────────────────── */}
        {activeTab === "overview" && (
          <div className="admin-overview">
            {/* Bookings chart */}
            <div className="card admin-chart-card">
              <h3 className="admin-section-title">📈 Bookings – Last 7 Days</h3>
              <div className="bar-chart">
                {bookingsPerDay.map((d) => (
                  <div key={d.date} className="bar-col">
                    <div className="bar-fill" style={{ height: `${(d.count / maxBookings) * 120}px` }}>
                      <span className="bar-count">{d.count}</span>
                    </div>
                    <div className="bar-label">
                      {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Busiest doctors */}
            <div className="card admin-chart-card">
              <h3 className="admin-section-title">🏆 Busiest Doctors</h3>
              <div className="busiest-list">
                {busiestDoctors.length === 0 ? (
                  <p style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>No data yet.</p>
                ) : (
                  busiestDoctors.map((d, i) => (
                    <div key={d.uid} className="busiest-row">
                      <span className="busiest-rank">#{i + 1}</span>
                      <span className="busiest-avatar">{d.avatar || "👨‍⚕️"}</span>
                      <div className="busiest-info">
                        <div className="busiest-name">{d.name}</div>
                        <div className="busiest-spec">{d.specialty}</div>
                      </div>
                      <div className="busiest-count">{d.apptCount} bookings</div>
                      <div
                        className="busiest-bar"
                        style={{ width: `${(d.apptCount / (busiestDoctors[0]?.apptCount || 1)) * 100}%` }}
                      ></div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="card admin-chart-card">
              <h3 className="admin-section-title">📊 Appointment Status Breakdown</h3>
              <div className="status-breakdown">
                {[
                  { label: "Confirmed", count: confirmedCount, color: "#10b981" },
                  { label: "Completed", count: completedCount, color: "#3b82f6" },
                  { label: "Cancelled", count: cancelledCount, color: "#ef4444" },
                ].map((s) => (
                  <div key={s.label} className="sb-row">
                    <span className="sb-label">{s.label}</span>
                    <div className="sb-bar-wrap">
                      <div
                        className="sb-bar"
                        style={{
                          width: `${(s.count / Math.max(appointments.length, 1)) * 100}%`,
                          background: s.color,
                        }}
                      ></div>
                    </div>
                    <span className="sb-count">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── DOCTORS TAB ─────────────────────────────── */}
        {activeTab === "doctors" && (
          <div className="admin-table-wrap card">
            <h3 className="admin-section-title">👨‍⚕️ All Doctors ({doctors.length})</h3>
            <div className="admin-table">
              <div className="at-header">
                <span>Doctor</span>
                <span>Specialty</span>
                <span>Hospital</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {doctors.map((d) => (
                <div key={d.uid} className="at-row">
                  <div className="at-cell at-doctor">
                    <span>{d.avatar || "👨‍⚕️"}</span>
                    <div>
                      <div className="at-name">{d.name}</div>
                      <div className="at-email">{d.email}</div>
                    </div>
                  </div>
                  <div className="at-cell">{d.specialty}</div>
                  <div className="at-cell">{d.hospital}</div>
                  <div className="at-cell">
                    <span className={`badge ${d.approved ? "badge-green" : "badge-yellow"}`}>
                      {d.approved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <div className="at-cell at-actions">
                    {!d.approved ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApproval(d.uid, true)}
                        disabled={approvingId === d.uid}
                      >
                        {approvingId === d.uid ? "..." : "✅ Approve"}
                      </button>
                    ) : (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleApproval(d.uid, false)}
                        disabled={approvingId === d.uid}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── FIX 3: ADD DOCTOR TAB ───────────────────── */}
        {activeTab === "add-doctor" && (
          <div className="card" style={{ padding: "40px", maxWidth: 700 }}>
            <h3 className="admin-section-title" style={{ marginBottom: 8 }}>➕ Add New Doctor</h3>
            <p style={{ color: "var(--gray-600)", marginBottom: 28, fontSize: "0.9rem" }}>
              Doctors added here are auto-approved and appear in the listings immediately.
            </p>

            {addDoctorSuccess && (
              <div className="badge badge-green" style={{ fontSize: "0.9rem", padding: "12px 20px", marginBottom: 20, display: "block", textAlign: "center" }}>
                ✅ Doctor added successfully!
              </div>
            )}

            <form onSubmit={handleAddDoctorSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Name */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    id="add-doctor-name"
                    className="form-input"
                    placeholder="Dr. Jane Smith"
                    value={addDoctorForm.name}
                    onChange={(e) => setAddDoctorForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  {addDoctorErrors.name && <div className="form-error">{addDoctorErrors.name}</div>}
                </div>

                {/* Email */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Email *</label>
                  <input
                    id="add-doctor-email"
                    type="email"
                    className="form-input"
                    placeholder="jane@hospital.com"
                    value={addDoctorForm.email}
                    onChange={(e) => setAddDoctorForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  {addDoctorErrors.email && <div className="form-error">{addDoctorErrors.email}</div>}
                </div>

                {/* Specialty */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Specialty *</label>
                  <input
                    id="add-doctor-specialty"
                    className="form-input"
                    placeholder="Cardiologist"
                    value={addDoctorForm.specialty}
                    onChange={(e) => setAddDoctorForm((f) => ({ ...f, specialty: e.target.value }))}
                  />
                  {addDoctorErrors.specialty && <div className="form-error">{addDoctorErrors.specialty}</div>}
                </div>

                {/* Hospital */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Hospital *</label>
                  <input
                    id="add-doctor-hospital"
                    className="form-input"
                    placeholder="Apollo Hospital"
                    value={addDoctorForm.hospital}
                    onChange={(e) => setAddDoctorForm((f) => ({ ...f, hospital: e.target.value }))}
                  />
                  {addDoctorErrors.hospital && <div className="form-error">{addDoctorErrors.hospital}</div>}
                </div>

                {/* Location */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Location</label>
                  <input
                    id="add-doctor-location"
                    className="form-input"
                    placeholder="Delhi"
                    value={addDoctorForm.location}
                    onChange={(e) => setAddDoctorForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </div>

                {/* Experience */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Experience</label>
                  <input
                    id="add-doctor-experience"
                    className="form-input"
                    placeholder="10 years"
                    value={addDoctorForm.experience}
                    onChange={(e) => setAddDoctorForm((f) => ({ ...f, experience: e.target.value }))}
                  />
                </div>

                {/* Fee */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Consultation Fee (₹) *</label>
                  <input
                    id="add-doctor-fee"
                    type="number"
                    className="form-input"
                    placeholder="800"
                    value={addDoctorForm.fee}
                    onChange={(e) => setAddDoctorForm((f) => ({ ...f, fee: e.target.value }))}
                  />
                  {addDoctorErrors.fee && <div className="form-error">{addDoctorErrors.fee}</div>}
                </div>

                {/* About — full width */}
                <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
                  <label className="form-label">About (optional)</label>
                  <textarea
                    id="add-doctor-about"
                    className="form-textarea"
                    placeholder="Brief description of the doctor's expertise..."
                    rows={3}
                    value={addDoctorForm.about}
                    onChange={(e) => setAddDoctorForm((f) => ({ ...f, about: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
                <button
                  id="add-doctor-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={addDoctorSubmitting}
                >
                  {addDoctorSubmitting ? "Adding..." : "➕ Add Doctor"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setAddDoctorForm(BLANK_DOCTOR); setAddDoctorErrors({}); }}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── PATIENTS TAB ───────────────────────────── */}
        {activeTab === "patients" && (
          <div className="admin-table-wrap card">
            <h3 className="admin-section-title">🧑‍💼 All Patients ({patients.length})</h3>
            <div className="admin-table">
              <div className="at-header">
                <span>Patient</span>
                <span>Phone</span>
                <span>Bookings</span>
                <span>Joined</span>
              </div>
              {patients.map((p) => (
                <div key={p.uid} className="at-row">
                  <div className="at-cell at-doctor">
                    <span>🧑</span>
                    <div>
                      <div className="at-name">{p.name}</div>
                      <div className="at-email">{p.email}</div>
                    </div>
                  </div>
                  <div className="at-cell">{p.phone || "—"}</div>
                  <div className="at-cell">
                    {appointments.filter((a) => a.patientId === p.uid).length}
                  </div>
                  <div className="at-cell" style={{ fontSize: "0.8rem", color: "var(--gray-400)" }}>
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── APPOINTMENTS TAB ───────────────────────── */}
        {activeTab === "appointments" && (
          <div className="admin-table-wrap card">
            <h3 className="admin-section-title">📋 All Appointments ({appointments.length})</h3>
            <div className="admin-table">
              <div className="at-header">
                <span>Booking ID</span>
                <span>Patient</span>
                <span>Doctor</span>
                <span>Date &amp; Time</span>
                <span>Status</span>
              </div>
              {appointments.map((a) => (
                <div key={a.id} className="at-row">
                  <div className="at-cell" style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                    {a.bookingId}
                  </div>
                  <div className="at-cell">
                    <div className="at-name">{a.patientName}</div>
                    <div className="at-email">{a.patientPhone}</div>
                  </div>
                  <div className="at-cell">
                    <div className="at-name">{a.doctorName}</div>
                    <div className="at-email">{a.doctorSpecialty}</div>
                  </div>
                  <div className="at-cell" style={{ fontSize: "0.83rem" }}>
                    {a.date} · {a.slot}
                  </div>
                  <div className="at-cell">
                    <span className={`badge ${
                      a.status === "Confirmed"  ? "badge-green" :
                      a.status === "Completed"  ? "badge-blue"  : "badge-red"
                    }`}>{a.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
