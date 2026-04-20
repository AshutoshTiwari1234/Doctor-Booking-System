// ============================================================
// MyAppointments — Upgraded patient appointment dashboard
// Features: filter by status, rating/review modal,
//           reschedule link, Firestore real-time sync
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppointments } from "../context/AppointmentsContext";
import { useAuth } from "../context/AuthContext";
import StarRating from "../components/StarRating";
import { toast } from "react-toastify";
import { generateAvailableDates, generateDaySlots, isSlotPassed, getSlotBookedCount, PATIENTS_PER_HOUR } from "../utils/slotUtils";
import "./MyAppointments.css";

function RescheduleModal({ appt, onClose, onReschedule, allAppointments }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today > appt.date ? today : appt.date);
  const [slot, setSlot] = useState("");
  const [error, setError] = useState("");

  const availableDates = generateAvailableDates(14);
  const daySlots = generateDaySlots();

  const handleConfirm = () => {
    if (!date || !slot) return setError("Please select a date and slot.");
    onReschedule(appt.id, date, slot);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box card animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">🔄</div>
        <h3 className="modal-title">Reschedule Appointment</h3>
        {error && <div className="form-error" style={{textAlign:"center", marginBottom: 12}}>{error}</div>}
        
        <div className="form-group">
          <label className="form-label">New Date</label>
          <select className="form-control" value={date} onChange={e => { setDate(e.target.value); setSlot(""); }}>
            {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">New Time Slot</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {daySlots.map(s => {
              const isPassed = isSlotPassed(date, s);
              const booked = getSlotBookedCount(allAppointments, date, s);
              const isFull = booked >= PATIENTS_PER_HOUR;
              const disabled = isPassed || isFull;
              return (
                <button 
                  key={s} 
                  className={`btn btn-sm ${slot === s ? "btn-primary" : "btn-outline"}`}
                  style={{ opacity: disabled ? 0.5 : 1, textDecoration: disabled ? "line-through" : "none" }}
                  onClick={() => !disabled && setSlot(s)}
                  disabled={disabled}
                >
                  {s} {isFull ? "(Full)" : ""}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!slot}>Confirm Reschedule</button>
        </div>
      </div>
    </div>
  );
}

function QueueInfo({ appt, getQueueInfo }) {
  const [queueData, setQueueData] = useState(null);
  const isToday = appt.date === new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!isToday || appt.status !== "Confirmed" || !appt.token) return;

    const fetchQueueInfo = () => {
      const info = getQueueInfo(appt.doctorId, appt.date, appt.slot, appt.token);
      setQueueData(info);
    };

    fetchQueueInfo();
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(fetchQueueInfo, 10000);
    return () => clearInterval(interval);
  }, [appt.doctorId, appt.date, appt.slot, appt.token, appt.status, isToday, getQueueInfo]);

  if (!isToday || appt.status !== "Confirmed" || !appt.token) return null;

  const info = queueData || { currentToken: null, tokensAhead: 0, estimatedWait: 0 };

  return (
    <div style={{ background: "var(--gray-50)", padding: "16px", borderRadius: "12px", marginTop: "16px", border: "1px solid var(--gray-200)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", textTransform: "uppercase" }}>Current Token</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--navy)" }}>{info.currentToken || "—"}</div>
        </div>
        <div style={{ width: "1px", height: "40px", background: "var(--gray-300)" }}></div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", textTransform: "uppercase" }}>Your Token</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--blue)" }}>#{appt.token}</div>
        </div>
        <div style={{ width: "1px", height: "40px", background: "var(--gray-300)" }}></div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", textTransform: "uppercase" }}>Ahead of You</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--orange)" }}>{info.tokensAhead}</div>
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: "0.9rem", fontWeight: 600, color: info.tokensAhead === 0 ? "var(--green)" : "var(--gray-600)", marginTop: "8px" }}>
        {info.tokensAhead === 0 ? "🔔 You're up next!" : `⏱ Estimated wait: ~${info.estimatedWait} mins`}
      </div>
    </div>
  );
}

// Format a date string for human-readable display
const getDateLabel = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
};

// Fix 2: Safely display doctor name — prevents "Dr. Dr. X" duplication.
// The doctorName field may already include the "Dr." prefix from the data source.
const formatDoctorName = (name) => {
  if (!name) return "";
  const trimmed = name.trim();
  // Strip leading "Dr." or "Dr " (case-insensitive) so we can prepend exactly once
  const withoutPrefix = trimmed.replace(/^Dr\.?\s*/i, "");
  return `Dr. ${withoutPrefix}`;
};

export default function MyAppointments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appointments, allAppointments, cancelAppointment, loading, loadError, refreshAppointments, dbConnected, markReviewed, getQueueInfo, rescheduleAppointment } = useAppointments();
  const { currentUser, userProfile } = useAuth();

  // ─── UI state ─────────────────────────────────────────────
  const [filter, setFilter] = useState("all");
  const [cancelId, setCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  
  // Check for navigation success state
  useEffect(() => {
    if (location.state?.bookingSuccess) {
      setSuccessInfo({
        apptId: location.state.newApptId,
        doctorName: location.state.doctorName
      });
      setShowSuccessModal(true);
      
      // Clean up state so refresh doesn't trigger modal again
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  const [reviewAppt, setReviewAppt] = useState(null);     // appointment being reviewed
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState(null);

  const handleRescheduleSubmit = (id, newDate, newSlot) => {
    try {
      rescheduleAppointment(id, newDate, newSlot);
      setRescheduleAppt(null);
      toast.success("Appointment rescheduled successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to reschedule.");
    }
  };

  const handleNavigate = (p) => {
    navigate(p === "home" ? "/" : "/" + p);
    window.scrollTo(0, 0);
  };

  // ─── Filter appointments by status ────────────────────────
  const filtered = appointments.filter((a) => {
    if (filter === "confirmed") return a.status === "Confirmed";
    if (filter === "completed") return a.status === "Completed";
    if (filter === "cancelled") return a.status === "Cancelled";
    return true;
  });

  // ─── Cancel appointment ───────────────────────────────────
  const handleCancel = async (id) => {
    setCancelling(true);
    try {
      await cancelAppointment(id);
      setCancelId(null); // Close modal on success
      toast.success("Appointment cancelled successfully.");
    } catch (err) {
      toast.error("Failed to cancel appointment. Please try again.");
    } finally {
      setCancelling(false);
      setCancelId(null); // Ensure modal closes even on failure to prevent stuck UI
    }
  };

  // ─── Submit a doctor review (stored locally) ────────────────
  const handleReviewSubmit = async () => {
    if (reviewRating === 0) { toast.warning("Please select a star rating."); return; }
    setReviewSubmitting(true);
    try {
      // Save review to localStorage
      const review = {
        id: crypto.randomUUID(),
        appointmentId: reviewAppt.id,
        patientId: currentUser.uid,
        doctorId: reviewAppt.doctorId,
        patientName: userProfile?.name || "Patient",
        rating: reviewRating,
        comment: reviewComment,
        createdAt: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("medibook_reviews") || "[]");
      localStorage.setItem("medibook_reviews", JSON.stringify([review, ...existing]));
      // Mark appointment as reviewed in shared state
      markReviewed(reviewAppt.id);
      setReviewAppt(null);
      setReviewRating(0);
      setReviewComment("");
      toast.success("✅ Review submitted! Thank you.");
    } catch {
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ─── Appointment stats ────────────────────────────────────
  const confirmed = appointments.filter((a) => a.status === "Confirmed").length;
  const completed = appointments.filter((a) => a.status === "Completed").length;
  const cancelled = appointments.filter((a) => a.status === "Cancelled").length;

  // ─── Error state (only show if DB connected and still failing) ───
  // If dbConnected is false, we use local fallback - no error needed
  if (loadError && dbConnected) {
    return (
      <div className="appts-page">
        <div className="appts-header">
          <div className="appts-header-inner">
            <div className="section-label">📋 Your Health Record</div>
            <h1 className="section-title">My Appointments</h1>
          </div>
        </div>
        <div className="appts-inner">
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⚠️</div>
            <h3 style={{ color: "var(--navy)", marginBottom: 8 }}>Couldn't Load Appointments</h3>
            <p style={{ color: "var(--gray-600)", marginBottom: 8, fontSize: "0.9rem" }}>
              Error: {loadError}
            </p>
            <p style={{ color: "var(--gray-500)", marginBottom: 24, fontSize: "0.82rem" }}>
              This may be a Firestore permissions error or network issue.<br />
              Open the browser console (F12) for more details.
            </p>
            <button className="btn btn-primary" onClick={refreshAppointments}>
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading state ────────────────────────────────────────
  if (loading && appointments.length === 0) {
    return (
      <div className="appts-page">
        <div className="appts-header">
          <div className="appts-header-inner">
            <div className="section-label">📋 Your Health Record</div>
            <h1 className="section-title">My Appointments</h1>
          </div>
        </div>
        <div className="appts-inner">
          <div className="card" style={{ padding: 60, textAlign: "center", color: "var(--gray-500)" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
            <p>Loading your appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────
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

  return (
    <div className="appts-page">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="appts-header">
        <div className="appts-header-inner">
          <div className="section-label">📋 Your Health Record</div>
          <h1 className="section-title">My Appointments</h1>
          <p className="section-subtitle">Manage all your upcoming and past appointments in one place.</p>
        </div>
      </div>

      <div className="appts-inner">
        {/* ─── Stats ───────────────────────────────────── */}
        {/* <div className="appts-stats">
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
            <div className="astat-icon">🏁</div>
            <div className="astat-val">{completed}</div>
            <div className="astat-label">Completed</div>
          </div>
          <div className="astat-card card">
            <div className="astat-icon">❌</div>
            <div className="astat-val">{cancelled}</div>
            <div className="astat-label">Cancelled</div>
          </div>
        </div> */}

        {/* ─── Filter Tabs ─────────────────────────────── */}
        <div className="filter-tabs">
          {["all", "confirmed", "completed", "cancelled"].map((f) => (
            <button
              key={f}
              id={`appt-filter-${f}`}
              className={`filter-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* ─── Appointments List ────────────────────────── */}
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
                  <div className="appt-avatar" style={{ background: "#dbeafe" }}>
                    👨‍⚕️
                  </div>
                </div>

                <div className="appt-center">
                  <div className="appt-top">
                    <div>
                      <h3 className="appt-doctor">{formatDoctorName(appt.doctorName)}</h3>
                      <span className="badge badge-blue">{appt.doctorSpecialty}</span>
                    </div>
                    <div className={`badge ${
                      appt.status === "Confirmed" ? "badge-green" :
                      appt.status === "Completed" ? "badge-blue" :
                      "badge-red"
                    }`}>
                      {appt.status === "Confirmed" ? "✅ " :
                       appt.status === "Completed" ? "🏁 " : "❌ "}
                      {appt.status}
                    </div>
                  </div>

                  <div className="appt-details">
                    <div className="appt-detail-item"><span className="adi-icon">🏥</span><span>{appt.doctorHospital}</span></div>
                    <div className="appt-detail-item"><span className="adi-icon">📅</span><span>{getDateLabel(appt.date)}</span></div>
                    <div className="appt-detail-item"><span className="adi-icon">⏰</span><span>{appt.slot}</span></div>
                    <div className="appt-detail-item"><span className="adi-icon">👤</span>
                      <span>{appt.patientName} | {appt.patientAge}y | {appt.patientGender}</span>
                    </div>
                    <div className="appt-detail-item"><span className="adi-icon">📋</span><span>{appt.reason}</span></div>

                    {/* Fix 4: Queue position — visible to patient, updated by doctor */}
                    {appt.status === "Confirmed" && appt.token && (
                      <div className="appt-detail-item" style={{ marginTop: 6 }}>
                        <span className="adi-icon">🔢</span>
                        <span style={{ fontWeight: 600, color: "var(--blue)" }}>
                          Queue Token #{appt.token}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <QueueInfo appt={appt} getQueueInfo={getQueueInfo} />

                  {/* Booking ID */}
                  <div style={{ fontSize: "0.75rem", color: "var(--gray-300)", fontFamily: "monospace", marginTop: 4 }}>
                    Booking ID: {appt.bookingId}
                  </div>
                </div>

                <div className="appt-right">
                  <div className="appt-fee">₹{appt.doctorFee}</div>
                  <div className="appt-fee-label">Consultation</div>

                  {/* Cancel button (only for confirmed appointments) */}
                  {appt.status === "Confirmed" && (
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
                      onClick={() => setCancelId(appt.id)}
                    >
                      Cancel
                    </button>
                  )}

                  {/* Reschedule (for confirmed) */}
                  {appt.status === "Confirmed" && (
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
                      onClick={() => setRescheduleAppt(appt)}
                    >
                      Reschedule
                    </button>
                  )}

                  {/* Leave a review (only for completed, not already reviewed) */}
                  {appt.status === "Completed" && !appt.reviewed && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
                      onClick={() => setReviewAppt(appt)}
                    >
                      ⭐ Rate Doctor
                    </button>
                  )}
                  {appt.status === "Completed" && appt.reviewed && (
                    <div className="badge badge-green" style={{ marginTop: 12, fontSize: "0.72rem", textAlign: "center" }}>
                      ✅ Reviewed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New booking CTA */}
        <div className="appts-cta">
          <button className="btn btn-primary" onClick={() => handleNavigate("doctors")}>
            + Book New Appointment
          </button>
        </div>
      </div>

      {/* ─── Cancel Confirmation Modal ───────────────────── */}
      {cancelId && (
        <div className="modal-overlay" onClick={() => !cancelling && setCancelId(null)}>
          <div className="modal-box card animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon" style={{ color: "var(--red)" }}>⚠️</div>
            <h3 className="modal-title">Cancel Appointment?</h3>
            <p className="modal-sub">
              Are you sure? This action cannot be undone and will restore the slot for other patients.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setCancelId(null)} disabled={cancelling}>
                Keep Appointment
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleCancel(cancelId)} 
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Booking Success Modal ───────────────────────── */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-box card animate-fade-up" style={{ textAlign: 'center', maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon" style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
            <h2 className="modal-title" style={{ color: 'var(--teal)', fontSize: '1.8rem' }}>Booking Successful!</h2>
            <p className="modal-sub" style={{ fontSize: '1.05rem', marginTop: '12px' }}>
              Your appointment with <strong>{formatDoctorName(successInfo?.doctorName)}</strong> is confirmed.
            </p>
            <div style={{ background: 'var(--gray-50)', padding: '16px', borderRadius: '12px', margin: '24px 0', border: '1px dashed var(--gray-300)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking ID</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--navy)', fontFamily: 'monospace' }}>{successInfo?.apptId}</div>
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowSuccessModal(false)}>
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      {/* ─── Review Modal ────────────────────────────────── */}
      {reviewAppt && (
        <div className="modal-overlay" onClick={() => setReviewAppt(null)}>
          <div className="modal-box card animate-fade-up" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">⭐</div>
            <h3 className="modal-title">Rate Your Experience</h3>
            <p className="modal-sub">
              How was your consultation with <strong>{formatDoctorName(reviewAppt.doctorName)}</strong>?
            </p>

            {/* Star rating */}
            <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
              <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
            </div>

            {/* Review text */}
            <div className="form-group">
              <label className="form-label">Your Review (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Share your experience with other patients..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setReviewAppt(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleReviewSubmit}
                disabled={reviewSubmitting || reviewRating === 0}
              >
                {reviewSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reschedule Modal ────────────────────────────── */}
      {rescheduleAppt && (
        <RescheduleModal
          appt={rescheduleAppt}
          allAppointments={allAppointments}
          onClose={() => setRescheduleAppt(null)}
          onReschedule={handleRescheduleSubmit}
        />
      )}
    </div>
  );
}
