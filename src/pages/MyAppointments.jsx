import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppointments } from "../context/AppointmentsContext";
import "./MyAppointments.css";

const getDateLabel = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

export default function MyAppointments() {
  const navigate = useNavigate();
  const { appointments, cancelAppointment } = useAppointments();
  const [filter, setFilter] = useState("all");
  const [cancelId, setCancelId] = useState(null);

  const handleNavigate = (p) => {
    navigate(p === "home" ? "/" : "/" + p);
    window.scrollTo(0, 0);
  };

  const filtered = appointments.filter((a) => {
    if (filter === "confirmed") return a.status === "Confirmed";
    if (filter === "cancelled") return a.status === "Cancelled";
    return true;
  });

  const handleCancel = (id) => {
    cancelAppointment(id);
    setCancelId(null);
  };

  if (appointments.length === 0) {
    return (
      <div className="appts-page">
        <div className="appts-header">
          <div className="appts-header-inner">
            <div className="section-label">📋 Your Health Record</div>
            <h1 className="section-title">My Appointments</h1>
          </div>
        </div>
        <div className="appts-inner">
          <div className="appts-empty card">
            <div className="ae-icon">🗓️</div>
            <h2>No Appointments Yet</h2>
            <p>You haven't booked any appointments yet. Find a doctor and schedule your first consultation today!</p>
            <button className="btn btn-primary btn-lg" onClick={() => handleNavigate("doctors")}>
              Find a Doctor →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const confirmed = appointments.filter((a) => a.status === "Confirmed").length;
  const cancelled = appointments.filter((a) => a.status === "Cancelled").length;

  return (
    <div className="appts-page">
      <div className="appts-header">
        <div className="appts-header-inner">
          <div className="section-label">📋 Your Health Record</div>
          <h1 className="section-title">My Appointments</h1>
          <p className="section-subtitle">Manage all your upcoming and past appointments in one place.</p>
        </div>
      </div>

      <div className="appts-inner">
        {/* STATS */}
        <div className="appts-stats">
          <div className="astat-card card">
            <div className="astat-icon">📊</div>
            <div className="astat-val">{appointments.length}</div>
            <div className="astat-label">Total Booked</div>
          </div>
          <div className="astat-card card">
            <div className="astat-icon">✅</div>
            <div className="astat-val">{confirmed}</div>
            <div className="astat-label">Confirmed</div>
          </div>
          <div className="astat-card card">
            <div className="astat-icon">❌</div>
            <div className="astat-val">{cancelled}</div>
            <div className="astat-label">Cancelled</div>
          </div>
        </div>

        {/* FILTER TABS */}
        <div className="filter-tabs">
          {["all", "confirmed", "cancelled"].map((f) => (
            <button key={f} className={`filter-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* LIST */}
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--gray-600)" }}>
            <p>No {filter} appointments found.</p>
          </div>
        ) : (
          <div className="appts-list">
            {filtered.map((appt, i) => (
              <div
                key={appt.id}
                className={`appt-card card animate-fade-up ${appt.status === "Cancelled" ? "cancelled" : ""}`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="appt-left">
                  <div className="appt-avatar" style={{ background: appt.doctor?.color || "#dbeafe" }}>
                    {appt.doctor?.avatar || "👨‍⚕️"}
                  </div>
                </div>
                <div className="appt-center">
                  <div className="appt-top">
                    <div>
                      <h3 className="appt-doctor">{appt.doctor?.name}</h3>
                      <span className="badge badge-blue">{appt.doctor?.specialty}</span>
                    </div>
                    <div className={`badge ${appt.status === "Confirmed" ? "badge-green" : "badge-red"}`}>
                      {appt.status === "Confirmed" ? "✅ " : "❌ "}{appt.status}
                    </div>
                  </div>
                  <div className="appt-details">
                    <div className="appt-detail-item">
                      <span className="adi-icon">🏥</span>
                      <span>{appt.doctor?.hospital}</span>
                    </div>
                    <div className="appt-detail-item">
                      <span className="adi-icon">📅</span>
                      <span>{getDateLabel(appt.date)}</span>
                    </div>
                    <div className="appt-detail-item">
                      <span className="adi-icon">⏰</span>
                      <span>{appt.slot}</span>
                    </div>
                    <div className="appt-detail-item">
                      <span className="adi-icon">👤</span>
                      <span>{appt.patient?.name} | {appt.patient?.age}y | {appt.patient?.gender}</span>
                    </div>
                    <div className="appt-detail-item">
                      <span className="adi-icon">📋</span>
                      <span>{appt.patient?.reason}</span>
                    </div>
                  </div>
                </div>
                <div className="appt-right">
                  <div className="appt-fee">₹{appt.doctor?.fee}</div>
                  <div className="appt-fee-label">Consultation</div>
                  <div className="appt-id">ID: {appt.bookingId}</div>
                  {appt.status === "Confirmed" && (
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
                      onClick={() => setCancelId(appt.id)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="appts-cta">
          <button className="btn btn-primary" onClick={() => handleNavigate("doctors")}>+ Book New Appointment</button>
        </div>
      </div>

      {/* CANCEL MODAL */}
      {cancelId && (
        <div className="modal-overlay" onClick={() => setCancelId(null)}>
          <div className="modal-box card animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">⚠️</div>
            <h3 className="modal-title">Cancel Appointment?</h3>
            <p className="modal-sub">Are you sure you want to cancel this appointment? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setCancelId(null)}>Keep Appointment</button>
              <button className="btn btn-danger" onClick={() => handleCancel(cancelId)}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
