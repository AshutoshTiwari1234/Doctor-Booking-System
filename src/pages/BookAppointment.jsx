import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppointments } from "../context/AppointmentsContext";
import "./BookAppointment.css";

const reasons = [
  "General Consultation",
  "Follow-up Visit",
  "Second Opinion",
  "Test Results Discussion",
  "Prescription Renewal",
  "New Symptoms",
  "Chronic Disease Management",
  "Other",
];

const today = new Date();
const formatDate = (date) => date.toISOString().split("T")[0];
const getDateLabel = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d - new Date(formatDate(today) + "T00:00:00")) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

const getDemoSlots = () => {
  const slots = {};
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = formatDate(d);
    const allSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];
    const count = 3 + Math.floor(Math.random() * 4);
    const shuffled = allSlots.sort(() => 0.5 - Math.random()).slice(0, count).sort();
    slots[key] = shuffled;
  }
  return slots;
};

export default function BookAppointment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addAppointment } = useAppointments();
  const doctor = location.state?.doctor;

  if (!doctor) {
    return (
      <div className="book-page">
        <div className="book-inner">
          <div className="card" style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚠️</div>
            <h2 style={{ color: "var(--navy)", marginBottom: 8 }}>No Doctor Selected</h2>
            <p style={{ color: "var(--gray-600)", marginBottom: 24 }}>Please go back and select a doctor first.</p>
            <button className="btn btn-primary" onClick={() => navigate("/doctors")}>Browse Doctors →</button>
          </div>
        </div>
      </div>
    );
  }

  const handleNavigate = (p) => {
    navigate(p === "home" ? "/" : "/" + p);
    window.scrollTo(0, 0);
  };

  const allSlots = doctor.slots || getDemoSlots();
  const availableDates = Object.keys(allSlots).sort();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(availableDates[0] || "");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [form, setForm] = useState({ name: "", age: "", gender: "", phone: "", email: "", reason: "", notes: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      addAppointment({
        doctor,
        date: selectedDate,
        slot: selectedSlot,
        patient: form,
        status: "Confirmed",
        bookingId: "MB" + Math.floor(100000 + Math.random() * 900000),
      });
      setSubmitting(false);
      setDone(true);
    }, 1500);
  };

  if (done) {
    return (
      <div className="book-page">
        <div className="book-inner">
          <div className="success-card card animate-fade-up">
            <div className="success-icon">✅</div>
            <h2 className="success-title">Appointment Confirmed!</h2>
            <p className="success-sub">Your appointment has been booked successfully. You will receive a confirmation shortly.</p>
            <div className="success-details">
              <div className="sd-row">
                <span>Doctor</span>
                <strong>{doctor.name}</strong>
              </div>
              <div className="sd-row">
                <span>Specialty</span>
                <strong>{doctor.specialty}</strong>
              </div>
              <div className="sd-row">
                <span>Date & Time</span>
                <strong>{getDateLabel(selectedDate)}, {selectedSlot}</strong>
              </div>
              <div className="sd-row">
                <span>Patient</span>
                <strong>{form.name}</strong>
              </div>
              <div className="sd-row">
                <span>Consultation Fee</span>
                <strong>₹{doctor.fee}</strong>
              </div>
            </div>
            <div className="success-actions">
              <button className="btn btn-primary" onClick={() => handleNavigate("appointments")}>View My Appointments →</button>
              <button className="btn btn-outline" onClick={() => handleNavigate("doctors")}>Book Another</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="stars" style={{ justifyContent: "center", marginBottom: 6 }}>
              {"★★★★★".split("").map((s, si) => (
                <span key={si} className={si < Math.floor(doctor.rating) ? "star" : "star-empty"}>{s}</span>
              ))}
            </div>
            <div style={{ color: "var(--gray-400)", fontSize: "0.82rem", textAlign: "center", marginBottom: 16 }}>
              {doctor.rating} ({doctor.reviews} reviews)
            </div>
            <div className="bdc-fee-box">
              <div className="bdc-fee-label">Consultation Fee</div>
              <div className="bdc-fee">₹{doctor.fee}</div>
            </div>
          </div>

          {/* RIGHT: STEPS */}
          <div className="book-form-area">
            {/* STEP 1: SLOT */}
            {step === 1 && (
              <div className="book-step card animate-fade-up">
                <h2 className="step-title">Choose Your Appointment Slot</h2>
                <p className="step-sub">Select a date and time that works best for you.</p>

                <div className="date-selector">
                  <label className="form-label">📅 Select Date</label>
                  <div className="date-tabs">
                    {availableDates.map((d) => (
                      <button
                        key={d}
                        className={`date-tab ${selectedDate === d ? "active" : ""}`}
                        onClick={() => { setSelectedDate(d); setSelectedSlot(""); }}
                      >
                        {getDateLabel(d)}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedDate && (
                  <div className="slot-selector">
                    <label className="form-label">⏰ Available Time Slots</label>
                    <div className="slots-grid">
                      {(allSlots[selectedDate] || []).map((slot) => (
                        <button
                          key={slot}
                          className={`slot-btn ${selectedSlot === slot ? "active" : ""}`}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    {(allSlots[selectedDate] || []).length === 0 && (
                      <p style={{ color: "var(--gray-400)", fontSize: "0.9rem" }}>No slots available on this date.</p>
                    )}
                  </div>
                )}

                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%", justifyContent: "center", marginTop: 24 }}
                  onClick={handleNext}
                  disabled={!selectedDate || !selectedSlot}
                >
                  Continue to Patient Info →
                </button>
              </div>
            )}

            {/* STEP 2: PATIENT INFO */}
            {step === 2 && (
              <div className="book-step card animate-fade-up">
                <h2 className="step-title">Patient Information</h2>
                <p className="step-sub">Please provide accurate details for your appointment.</p>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className={`form-input ${errors.name ? "input-error" : ""}`} placeholder="Raj Kumar" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
                    {errors.name && <div className="form-error">{errors.name}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Age *</label>
                    <input className={`form-input ${errors.age ? "input-error" : ""}`} type="number" placeholder="25" value={form.age} onChange={(e) => handleChange("age", e.target.value)} />
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
                    <input className={`form-input ${errors.phone ? "input-error" : ""}`} placeholder="9876543210" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} maxLength={10} />
                    {errors.phone && <div className="form-error">{errors.phone}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input className={`form-input ${errors.email ? "input-error" : ""}`} placeholder="raj@example.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
                    {errors.email && <div className="form-error">{errors.email}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Visit *</label>
                  <select className={`form-select ${errors.reason ? "input-error" : ""}`} value={form.reason} onChange={(e) => handleChange("reason", e.target.value)}>
                    <option value="">Select a reason...</option>
                    {reasons.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  {errors.reason && <div className="form-error">{errors.reason}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Additional Notes (Optional)</label>
                  <textarea className="form-textarea" placeholder="Describe your symptoms or any specific concerns..." value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} />
                </div>

                <div className="step-footer">
                  <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn btn-primary btn-lg" onClick={handleNext}>
                    Review Appointment →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CONFIRM */}
            {step === 3 && (
              <div className="book-step card animate-fade-up">
                <h2 className="step-title">Confirm Your Appointment</h2>
                <p className="step-sub">Please review all details before confirming.</p>

                <div className="confirm-section">
                  <h4 className="confirm-label">📅 Appointment Details</h4>
                  <div className="confirm-grid">
                    <div className="confirm-row"><span>Doctor</span><strong>{doctor.name}</strong></div>
                    <div className="confirm-row"><span>Specialty</span><strong>{doctor.specialty}</strong></div>
                    <div className="confirm-row"><span>Hospital</span><strong>{doctor.hospital}</strong></div>
                    <div className="confirm-row"><span>Date</span><strong>{getDateLabel(selectedDate)}</strong></div>
                    <div className="confirm-row"><span>Time</span><strong>{selectedSlot}</strong></div>
                  </div>
                </div>

                <div className="confirm-section">
                  <h4 className="confirm-label">👤 Patient Details</h4>
                  <div className="confirm-grid">
                    <div className="confirm-row"><span>Name</span><strong>{form.name}</strong></div>
                    <div className="confirm-row"><span>Age / Gender</span><strong>{form.age} yrs / {form.gender}</strong></div>
                    <div className="confirm-row"><span>Mobile</span><strong>{form.phone}</strong></div>
                    <div className="confirm-row"><span>Email</span><strong>{form.email}</strong></div>
                    <div className="confirm-row"><span>Reason</span><strong>{form.reason}</strong></div>
                    {form.notes && <div className="confirm-row"><span>Notes</span><strong>{form.notes}</strong></div>}
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
                  <button className="btn btn-teal btn-lg" onClick={handleSubmit} disabled={submitting}>
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
