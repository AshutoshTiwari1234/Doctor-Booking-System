// ============================================================
// BookAppointment — 3-step booking with slot capacity management
//
// Step 1: Calendar (red = full day) + slot selector with
//         live capacity bar (X/6 taken) + "Full 🔴" state
// Step 2: Patient info
// Step 3: Confirm + queue number shown on success
// ============================================================

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppointments } from "../context/AppointmentsContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  generateDaySlots,
  generateSlotLabels,
  generateAvailableDates,
  getDateLabel,
  isSlotFull,
  isDayFull,
  getSlotBookedCount,
  getAvailableCount,
  PATIENTS_PER_HOUR,
  isSlotPassed,
} from "../utils/slotUtils";
import "./BookAppointment.css";

const reasons = [
  "General Consultation", "Follow-up Visit", "Second Opinion",
  "Test Results Discussion", "Prescription Renewal", "New Symptoms",
  "Chronic Disease Management", "Other",
];

const AVAILABLE_DATES = generateAvailableDates(14);
const DAY_SLOTS = generateDaySlots();
const SLOT_LABELS = generateSlotLabels();

export default function BookAppointment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addAppointment, allAppointments } = useAppointments();
  const { currentUser, userProfile } = useAuth();
  const doctor = location.state?.doctor;

  // Disabled slots set by doctor
  const [disabledSlots, setDisabledSlots] = useState([]);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  
  // Fix 6: Load disabled slots from localStorage (set by doctor)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("medibook_doctor_slots");
      if (stored) setDisabledSlots(JSON.parse(stored));
    } catch { /* ignore */ }
    setSlotsLoaded(true);
  }, [doctor]);

  // Fix 6: Build slotsMap from DAY_SLOTS minus any disabled slots set by doctor in localStorage
  const slotsMap = useMemo(() => {
    const map = {};
    AVAILABLE_DATES.forEach((d) => {
      const disabledTimesForDay = disabledSlots
        .filter((s) => s.date === d)
        .map((s) => s.time);
      if (disabledTimesForDay.includes("ALL")) {
        map[d] = []; // day is fully disabled
      } else {
        map[d] = DAY_SLOTS.filter((t) => !disabledTimesForDay.includes(t));
      }
    });
    return map;
  }, [disabledSlots]);

  const docAvailableDates = useMemo(() => {
    return AVAILABLE_DATES.filter((d) => {
      const activeSlots = (slotsMap[d] || []).filter((slot) => !isSlotPassed(d, slot));
      return activeSlots.length > 0;
    });
  }, [slotsMap]);

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  // Auto-select the first available date when loaded
  useEffect(() => {
    if (docAvailableDates.length > 0 && !selectedDate) {
      setSelectedDate(docAvailableDates[0]);
    }
  }, [docAvailableDates, selectedDate]);

  const [form, setForm] = useState({
    name: userProfile?.name || "",
    age: "",
    gender: "",
    phone: userProfile?.phone || "",
    email: currentUser?.email || "",
    reason: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [bookedAppt, setBookedAppt] = useState(null);

  // ─── Slot capacity (memoized from all appointments) ────────────
  const slotInfo = useMemo(() => {
    const info = {};
    const activeSlots = (slotsMap[selectedDate] || []).filter(
      (slot) => !isSlotPassed(selectedDate, slot)
    );
    activeSlots.forEach((slot) => {
      const booked = getSlotBookedCount(allAppointments, selectedDate, slot);
      const available = Math.max(0, PATIENTS_PER_HOUR - booked);
      const full = booked >= PATIENTS_PER_HOUR;
      info[slot] = { booked, available, full };
    });
    return info;
  }, [allAppointments, selectedDate, slotsMap]);

  const dayFull = useMemo(() => {
    if (!selectedDate) return false;
    const activeSlots = (slotsMap[selectedDate] || []).filter(
      (slot) => !isSlotPassed(selectedDate, slot)
    );
    if (activeSlots.length === 0) return true;
    return activeSlots.every(
      (slot) => getSlotBookedCount(allAppointments, selectedDate, slot) >= PATIENTS_PER_HOUR
    );
  }, [allAppointments, selectedDate, slotsMap]);

  if (!doctor) {
    return (
      <div className="book-page">
        <div className="book-inner">
          <div className="card" style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚠️</div>
            <h2 style={{ color: "var(--navy)", marginBottom: 8 }}>No Doctor Selected</h2>
            <p style={{ color: "var(--gray-600)", marginBottom: 24 }}>
              Please go back and select a doctor first.
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/doctors")}>
              Browse Doctors →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.age || form.age < 1 || form.age > 120) e.age = "Enter a valid age";
    if (!form.gender) e.gender = "Please select gender";
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter valid 10-digit mobile number";
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.reason) e.reason = "Please select a reason";
    return e;
  };

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedDate || !selectedSlot) return;
      setStep(2);
    } else if (step === 2) {
      const e = validate();
      if (Object.keys(e).length > 0) { setErrors(e); return; }
      setStep(3);
    }
  };

  // ─── Submit booking ─────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (!currentUser?.uid) {
        throw new Error("Auth session expired. Please refresh.");
      }

      console.log("[BookAppointment] Submitting appointment with patient UID:", currentUser.uid);

      const result = await addAppointment({
        doctorId: String(doctor.id || doctor.uid),
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty,
        doctorHospital: doctor.hospital,
        doctorFee: doctor.fee,
        date: selectedDate,
        slot: selectedSlot,
        patientId: currentUser.uid,
        patientName: form.name,
        patientAge: Number(form.age),
        patientGender: form.gender,
        patientPhone: form.phone,
        patientEmail: form.email,
        reason: form.reason,
        notes: form.notes,
      });
      // Schedule appointment-day reminder notification (if permission granted)
      scheduleAppointmentReminder(form.name, doctor.name, selectedDate, selectedSlot);

      // Navigate to appointments with a success flag
      navigate("/appointments", { 
        state: { 
          bookingSuccess: true, 
          newApptId: result.bookingId || result.id,
          doctorName: doctor.name
        } 
      });
    } catch (err) {
      toast.error(err.message || "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };



  const slotLabelForSelected = SLOT_LABELS.find((s) => s.slot === selectedSlot);

  return (
    <div className="book-page">
      <div className="book-inner">
        {/* PROGRESS */}
        <div className="book-progress card">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`progress-step ${step >= s ? "active" : ""} ${step > s ? "done" : ""}`}>
              <div className="ps-circle">{step > s ? "✓" : s}</div>
              <div className="ps-label">
                {s === 1 ? "Select Slot" : s === 2 ? "Patient Info" : "Confirm"}
              </div>
              {s < 3 && <div className={`ps-line ${step > s ? "filled" : ""}`}></div>}
            </div>
          ))}
        </div>

        <div className="book-grid">
          {/* LEFT: DOCTOR INFO */}
          <div className="book-doctor-card card">
            <div className="bdc-avatar" style={{ background: doctor.color }}>{doctor.avatar}</div>
            <h3 className="bdc-name">{doctor.name}</h3>
            <div className="badge badge-blue" style={{ marginBottom: 12 }}>{doctor.specialty}</div>
            <div className="bdc-detail">🏥 {doctor.hospital}</div>
            <div className="bdc-detail">📍 {doctor.location}</div>
            <div className="bdc-detail">⏳ {doctor.experience} experience</div>
            <div className="bdc-detail">🎓 {doctor.education}</div>
            <div className="divider"></div>
            <div style={{ display: "flex", justifyContent: "center", gap: 2, marginBottom: 6 }}>
              {"★★★★★".split("").map((s, si) => (
                <span key={si} className={si < Math.floor(doctor.rating) ? "star" : "star-empty"}>{s}</span>
              ))}
            </div>
            <div style={{ color: "var(--gray-400)", fontSize: "0.82rem", textAlign: "center", marginBottom: 16 }}>
              {doctor.rating} ({doctor.reviews || doctor.reviewCount} reviews)
            </div>
            <div className="bdc-fee-box">
              <div className="bdc-fee-label">Consultation Fee</div>
              <div className="bdc-fee">₹{doctor.fee}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 4 }}>
                6 patients per hour · 10 min each
              </div>
            </div>
          </div>

          {/* RIGHT: STEPS */}
          <div className="book-form-area">
            {/* ── STEP 1: DATE + SLOT ── */}
            {step === 1 && (
              <div className="book-step card animate-fade-up">
                <h2 className="step-title">Choose Your Appointment Slot</h2>
                <p className="step-sub">
                  Select an available date and time. Each slot takes up to 6 patients.
                </p>

                {/* Date selector */}
                <div className="date-selector">
                  <label className="form-label">📅 Select Date</label>
                  <div className="date-tabs">
                    {docAvailableDates.length === 0 ? (
                      <div style={{ color: "var(--gray-500)", fontStyle: "italic", padding: "10px" }}>
                        This doctor hasn't opened any dates right now.
                      </div>
                    ) : (
                      docAvailableDates.map((d) => {
                        const disabledTimesForDate = disabledSlots.filter(s => s.date === d).map(s => s.time);
                        const activeSlots = DAY_SLOTS.filter(slot => !disabledTimesForDate.includes(slot) && !isSlotPassed(d, slot));
                        const activeSlotsCount = activeSlots.length;
                        const full = !disabledTimesForDate.includes("ALL") && activeSlotsCount > 0 && activeSlots.every(slot => {
                          return getSlotBookedCount(allAppointments, d, slot) >= PATIENTS_PER_HOUR;
                        });
                        return (
                          <button
                            key={d}
                            className={`date-tab ${selectedDate === d ? "active" : ""} ${full ? "day-full" : ""}`}
                            onClick={() => { setSelectedDate(d); setSelectedSlot(""); }}
                            title={full ? "All open slots booked on this day" : ""}
                          >
                            {getDateLabel(d)}
                            {full && <span className="date-full-dot">●</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Day fully booked warning */}
                {dayFull && selectedDate && docAvailableDates.length > 0 && (
                  <div className="day-full-banner">
                    📵 All open slots on this day are fully booked. Please select another date.
                  </div>
                )}

                {/* Slot selector with capacity */}
                {selectedDate && !dayFull && (
                  <div className="slot-selector">
                    <label className="form-label">⏰ Available Time Slots</label>
                    <div className="slots-grid-capacity">
                      {SLOT_LABELS.filter(sl => (slotsMap[selectedDate] || []).includes(sl.slot) && !isSlotPassed(selectedDate, sl.slot)).map(({ slot, label }) => {
                        const { booked, available, full } = slotInfo[slot] || {};
                        const pct = Math.round((booked / PATIENTS_PER_HOUR) * 100);
                        return (
                          <button
                            key={slot}
                            className={`slot-cap-btn
                              ${selectedSlot === slot ? "active" : ""}
                              ${full ? "full" : ""}
                            `}
                            onClick={() => !full && setSelectedSlot(slot)}
                            disabled={full}
                            aria-label={full ? `${slot} full` : `${slot} — ${available} spots left`}
                          >
                            <div className="scb-time">{slot}</div>
                            {full ? (
                              <div className="scb-full">🔴 Full</div>
                            ) : (
                              <>
                                <div className="scb-count">
                                  {available}/{PATIENTS_PER_HOUR} open
                                </div>
                                <div className="scb-bar">
                                  <div
                                    className="scb-fill"
                                    style={{
                                      width: `${pct}%`,
                                      background: pct >= 80 ? "#ef4444" : pct >= 50 ? "#f59e0b" : "#10b981",
                                    }}
                                  />
                                </div>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selected slot info */}
                {selectedSlot && slotLabelForSelected && (
                  <div className="selected-slot-info">
                    ✅ Selected: <strong>{slotLabelForSelected.label}</strong>
                    &nbsp;·&nbsp; You will be patient <strong>
                      #{(slotInfo[selectedSlot]?.booked || 0) + 1}
                    </strong> in this slot
                  </div>
                )}

                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%", justifyContent: "center", marginTop: 24 }}
                  onClick={handleNext}
                  disabled={!selectedDate || !selectedSlot || dayFull}
                >
                  Continue to Patient Info →
                </button>
              </div>
            )}

            {/* ── STEP 2: PATIENT INFO ── */}
            {step === 2 && (
              <div className="book-step card animate-fade-up">
                <h2 className="step-title">Patient Information</h2>
                <p className="step-sub">Please provide accurate details for your appointment.</p>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      className={`form-input ${errors.name ? "input-error" : ""}`}
                      placeholder="Raj Kumar"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                    />
                    {errors.name && <div className="form-error">{errors.name}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Age *</label>
                    <input
                      className={`form-input ${errors.age ? "input-error" : ""}`}
                      type="number"
                      placeholder="25"
                      value={form.age}
                      onChange={(e) => handleChange("age", e.target.value)}
                    />
                    {errors.age && <div className="form-error">{errors.age}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <div className="gender-options">
                    {["Male", "Female", "Other"].map((g) => (
                      <button
                        key={g}
                        className={`gender-btn ${form.gender === g ? "active" : ""}`}
                        onClick={() => handleChange("gender", g)}
                        type="button"
                      >
                        {g === "Male" ? "♂" : g === "Female" ? "♀" : "⚧"} {g}
                      </button>
                    ))}
                  </div>
                  {errors.gender && <div className="form-error">{errors.gender}</div>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      className={`form-input ${errors.phone ? "input-error" : ""}`}
                      placeholder="9876543210"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      maxLength={10}
                    />
                    {errors.phone && <div className="form-error">{errors.phone}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      className={`form-input ${errors.email ? "input-error" : ""}`}
                      placeholder="raj@example.com"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                    />
                    {errors.email && <div className="form-error">{errors.email}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Visit *</label>
                  <select
                    className={`form-select ${errors.reason ? "input-error" : ""}`}
                    value={form.reason}
                    onChange={(e) => handleChange("reason", e.target.value)}
                  >
                    <option value="">Select a reason...</option>
                    {reasons.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  {errors.reason && <div className="form-error">{errors.reason}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Additional Notes (Optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe your symptoms or any specific concerns..."
                    value={form.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                  />
                </div>

                <div className="step-footer">
                  <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn btn-primary btn-lg" onClick={handleNext}>
                    Review Appointment →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: CONFIRM ── */}
            {step === 3 && (
              <div className="book-step card animate-fade-up">
                <h2 className="step-title">Confirm Your Appointment</h2>
                <p className="step-sub">Please review all details before confirming.</p>

                <div className="confirm-section">
                  <h4 className="confirm-label">📅 Appointment Details</h4>
                  <div className="confirm-grid">
                    {[
                      ["Doctor", doctor.name],
                      ["Specialty", doctor.specialty],
                      ["Hospital", doctor.hospital],
                      ["Date", getDateLabel(selectedDate)],
                      ["Time Slot", selectedSlot],
                      ["Your Position", `#${(slotInfo[selectedSlot]?.booked || 0) + 1} in queue`],
                    ].map(([label, val]) => (
                      <div className="confirm-row" key={label}>
                        <span>{label}</span><strong>{val}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="confirm-section">
                  <h4 className="confirm-label">👤 Patient Details</h4>
                  <div className="confirm-grid">
                    {[
                      ["Name", form.name],
                      ["Age / Gender", `${form.age} yrs / ${form.gender}`],
                      ["Mobile", form.phone],
                      ["Email", form.email],
                      ["Reason", form.reason],
                      ...(form.notes ? [["Notes", form.notes]] : []),
                    ].map(([label, val]) => (
                      <div className="confirm-row" key={label}>
                        <span>{label}</span><strong>{val}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="fee-summary">
                  <div className="fs-row"><span>Consultation Fee</span><span>₹{doctor.fee}</span></div>
                  <div className="fs-row"><span>Platform Fee</span><span>₹0</span></div>
                  <div className="fs-divider"></div>
                  <div className="fs-row total"><span>Total Payable</span><strong>₹{doctor.fee}</strong></div>
                </div>

                <div className="terms-note">
                  <span>ℹ️</span>
                  <span>By confirming, you agree to our cancellation policy. Free cancellation up to 2 hours before your appointment.</span>
                </div>

                <div className="step-footer">
                  <button className="btn btn-outline" onClick={() => setStep(2)}>← Edit Info</button>
                  <button
                    className="btn btn-teal btn-lg"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Booking..." : "✅ Confirm Booking"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule appointment-day FCM reminder ─────────────────────
function scheduleAppointmentReminder(patientName, doctorName, date, slot) {
  try {
    const apptDate = new Date(date + "T08:00:00");
    const now = new Date();
    const delay = apptDate - now;
    if (delay > 0 && delay < 7 * 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification("📅 Appointment Reminder", {
            body: `You have an appointment with ${doctorName} today at ${slot}. Please be on time!`,
            icon: "/favicon.ico",
          });
        }
      }, delay);
    }
  } catch { /* ignore */ }
}
