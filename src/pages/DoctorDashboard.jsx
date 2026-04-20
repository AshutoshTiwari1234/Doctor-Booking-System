// ============================================================
// Doctor Dashboard — Full daily appointment management + Live Queue
// Fix 6: No Firebase DataConnect — all data via localStorage
// Fix 5: markComplete writes to shared localStorage → patient sees it
// Fix 4: Queue token stored per appointment during booking
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useAppointments } from "../context/AppointmentsContext";
import { generateDaySlots, getDateLabel, generateAvailableDates } from "../utils/slotUtils";
import "./DoctorDashboard.css";

const APPT_KEY = "medibook_appointments";
const SLOTS_KEY = "medibook_doctor_slots";

const readAll  = () => { try { return JSON.parse(localStorage.getItem(APPT_KEY) || "[]"); } catch { return []; } };
const writeAll = (a) => { try { localStorage.setItem(APPT_KEY, JSON.stringify(a)); } catch {} };
const readSlots  = () => { try { return JSON.parse(localStorage.getItem(SLOTS_KEY) || "[]"); } catch { return []; } };
const writeSlots = (s) => { try { localStorage.setItem(SLOTS_KEY, JSON.stringify(s)); } catch {} };

const todayStr = new Date().toISOString().split("T")[0];

const statusColors = {
  Confirmed: "badge-green",
  Completed: "badge-blue",
  Cancelled: "badge-red",
  Pending:   "badge-yellow",
  Rejected:  "badge-red",
  "In-Progress": "badge-blue",
};

const DAY_SLOTS = generateDaySlots();

export default function DoctorDashboard() {
  const { currentUser, userProfile } = useAuth();
  const { completeAppointment, updateAppointmentStatus } = useAppointments();

  const [appointments, setAppointments]   = useState([]);
  const [activeTab, setActiveTab]         = useState("today");
  const [loadingId, setLoadingId]         = useState(null);

  // Queue state
  const [queueDate, setQueueDate]   = useState(todayStr);

  // Auto-detect the current slot based on current time, fallback to first slot
  const [queueSlot, setQueueSlot]   = useState(() => {
    const h = new Date().getHours();
    const active = DAY_SLOTS.find(s => {
      let startHour = parseInt(s.split(":")[0], 10);
      if (s.includes("PM") && startHour !== 12) startHour += 12;
      if (s.includes("AM") && startHour === 12) startHour = 0;
      return h === startHour;
    });
    return active || DAY_SLOTS[0];
  });

  const [queueList, setQueueList]   = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Slot manager state
  const [disabledSlots, setDisabledSlots] = useState([]);
  const [manageDate, setManageDate] = useState(todayStr);

  const uid = currentUser?.uid;

  // ─── Fix 6: Load from shared localStorage ─────────────────
  const loadData = useCallback(() => {
    if (!uid) return;
    const all = readAll();
    // Match by uid OR by doctor name (for seed doctors without Firebase UID)
    const doctorAppts = all.filter(a => {
      if (a.doctorId === uid || a.doctorId === String(uid)) return true;
      if (userProfile?.name) {
        const last = userProfile.name.split(" ").slice(1).join(" ").toLowerCase();
        return last && a.doctorName?.toLowerCase().includes(last);
      }
      return false;
    });
    setAppointments(doctorAppts);
    setDisabledSlots(readSlots());
  }, [uid, userProfile]);

  // Poll every 3 s so doctor sees new bookings without refresh
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ─── Refresh queue whenever appointments change ────────────────
  useEffect(() => {
    // Filter for chosen date and slot, sort by token (queue number)
    const slotList = appointments
      .filter((a) => a.date === queueDate && a.slot === queueSlot && a.status !== "Cancelled")
      .sort((a, b) => (a.token || 0) - (b.token || 0));
    
    setQueueList(slotList);

    // Current patient index - find "In-Progress" first, or default to first waiting
    const inProgressIdx = slotList.findIndex(a => a.status === "In-Progress");
    if (inProgressIdx !== -1) {
      setCurrentIdx(inProgressIdx);
    } else {
      // Find first waiting (Confirmed) patient to mark as In-Progress
      const firstWaitingIdx = slotList.findIndex(a => a.status === "Confirmed");
      if (firstWaitingIdx !== -1 && slotList.length > 0) {
        // Auto-mark first waiting as In-Progress for the doctor
        updateAppointmentStatus(slotList[firstWaitingIdx].id, "In-Progress");
      }
    }
  }, [queueDate, queueSlot, appointments]);

  // ─── Slot Manager Logic ────────────────────────────────────
  // Slots stored as [{date, time, id}] in localStorage
  const handleDisableSlot = (date, time) => {
    const existing = readSlots();
    if (existing.some(s => s.date === date && s.time === time)) return;
    const updated = [...existing, { id: crypto.randomUUID(), date, time }];
    writeSlots(updated);
    setDisabledSlots(updated);
  };

  const handleEnableSlot = (slotId) => {
    const updated = readSlots().filter(s => s.id !== slotId);
    writeSlots(updated);
    setDisabledSlots(updated);
  };

  const handleCancelDay = (date) => {
    const existing = readSlots().filter(s => !(s.date === date));
    const withAll  = [...existing, { id: crypto.randomUUID(), date, time: "ALL" }];
    writeSlots(withAll);
    setDisabledSlots(withAll);
  };

  const handleEnableDay = (date) => {
    const updated = readSlots().filter(s => s.date !== date);
    writeSlots(updated);
    setDisabledSlots(updated);
  };

  // ─── Filtered appointment lists ───────────────────────────────
  const todayAppts    = appointments.filter((a) => a.date === todayStr);
  const upcomingAppts = appointments.filter((a) => a.date > todayStr && a.status !== "Cancelled");
  const displayAppts  =
    activeTab === "today"    ? todayAppts :
    activeTab === "upcoming" ? upcomingAppts :
    appointments;

  // ─── Fix 5: Mark appointment as completed ─────────────────
  // completeAppointment() writes to shared localStorage → patient sees it
  const handleMarkComplete = (apptId) => {
    setLoadingId(apptId);
    completeAppointment(apptId);   // context writes to localStorage
    setAppointments(prev => prev.map(a =>
      a.id === apptId ? { ...a, status: "Completed" } : a
    ));
    setLoadingId(null);
  };

  // ─── Cancel appointment ─────────────────────────────────────
  const handleCancel = (apptId) => {
    const all = readAll().map(a =>
      a.id === apptId ? { ...a, status: "Cancelled" } : a
    );
    writeAll(all);
    setAppointments(prev => prev.map(a =>
      a.id === apptId ? { ...a, status: "Cancelled" } : a
    ));
  };

// ─── Fix 4: Queue controls (only doctor can call these) ────
  const handleQueueMarkDone = () => {
    const appt = queueList[currentIdx];
    if (!appt) return;
    completeAppointment(appt.id);
    setAppointments(prev => prev.map(a =>
      a.id === appt.id ? { ...a, status: "Completed" } : a
    ));
    // Auto-advance to next patient
    const nextAppt = queueList[currentIdx + 1];
    if (nextAppt) {
      updateAppointmentStatus(nextAppt.id, "In-Progress");
      setAppointments(prev => prev.map(a =>
        a.id === nextAppt.id ? { ...a, status: "In-Progress" } : a
      ));
    }
  };

  const handleQueueSkip = () => {
    const appt = queueList[currentIdx];
    if (!appt) return;
    updateAppointmentStatus(appt.id, "Skipped");
    setAppointments(prev => prev.map(a =>
      a.id === appt.id ? { ...a, status: "Skipped" } : a
    ));
    // Auto-advance to next patient
    const nextAppt = queueList[currentIdx + 1];
    if (nextAppt) {
      updateAppointmentStatus(nextAppt.id, "In-Progress");
      setAppointments(prev => prev.map(a =>
        a.id === nextAppt.id ? { ...a, status: "In-Progress" } : a
      ));
    }
    setCurrentIdx(p => p + 1);
  };

  const handleQueueNext = () => {
    const current = queueList[currentIdx];
    const next = queueList[currentIdx + 1];
    if (current) {
      completeAppointment(current.id);
      setAppointments(prev => prev.map(a =>
        a.id === current.id ? { ...a, status: "Completed" } : a
      ));
    }
    if (next) {
      updateAppointmentStatus(next.id, "In-Progress");
      setAppointments(prev => prev.map(a =>
        a.id === next.id ? { ...a, status: "In-Progress" } : a
      ));
      notifyTurn(next);
    }
    setCurrentIdx(p => p + 1);
  };

  const stats = {
    total:     todayAppts.length,
    completed: todayAppts.filter((a) => a.status === "Completed").length,
    pending:   todayAppts.filter((a) => a.status === "Confirmed").length,
    upcoming:  upcomingAppts.length,
  };

  // Helper to determine if a day is completely disabled
  const isDayCancelled = (date) => {
    return disabledSlots.some(s => s.date === date && s.time === "ALL");
  };

  return (
    <div className="dash-page">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="dash-header">
        <div className="dash-header-inner">
          <div>
            <div className="section-label">👨‍⚕️ Doctor Portal</div>
            <h1 className="section-title">
              Good {getGreeting()}, Dr. {userProfile?.name?.split(" ")[1] || userProfile?.name}!
            </h1>
            <p className="section-subtitle">
              {getDateLabel(todayStr)} · 6 patients per hour · Real-time queue active
            </p>
          </div>
          <div className="badge badge-green" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
            ✅ Approved
          </div>
        </div>
      </div>

      <div className="dash-inner">
        {/* ─── Stats ──────────────────────────────────────── */}
        <div className="dash-stats">
          {[
            { icon: "📋", val: stats.total,     label: "Today's Appointments", bg: "#dbeafe" },
            { icon: "✅", val: stats.completed, label: "Completed Today",       bg: "#dcfce7" },
            { icon: "⏳", val: stats.pending,   label: "Pending Today",         bg: "#fef3c7" },
            { icon: "📅", val: stats.upcoming,  label: "Upcoming",              bg: "#ede9fe" },
          ].map(({ icon, val, label, bg }) => (
            <div key={label} className="ds-card card">
              <div className="ds-icon" style={{ background: bg }}>{icon}</div>
              <div className="ds-val">{val}</div>
              <div className="ds-label">{label}</div>
            </div>
          ))}
        </div>

        {/* ─── Tabs ───────────────────────────────────────── */}
        <div className="dash-tabs">
          {[
            { id: "today",    label: "📅 Today" },
            { id: "upcoming", label: "🗓️ Upcoming" },
            { id: "all",      label: "📋 All History" },
            { id: "queue",    label: "🔢 Live Queue" },
            { id: "slots",    label: "⏰ Manage Slots" },
          ].map(({ id, label }) => (
            <button
              key={id}
              id={`dash-tab-${id}`}
              className={`dash-tab ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ─── Appointments List ───────────────────────────── */}
        {["today", "upcoming", "all"].includes(activeTab) && (
          <div className="dash-list">
            {displayAppts.length === 0 ? (
              <div className="dash-empty card">
                <div style={{ fontSize: "2.5rem" }}>🗓️</div>
                <h3>No appointments {activeTab === "today" ? "today" : "found"}</h3>
                <p style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>
                  {activeTab === "today" ? "Enjoy your free day!" : "Nothing to show here."}
                </p>
              </div>
            ) : (
              displayAppts.map((appt) => (
                <div key={appt.id} className="dash-appt-card card">
                  <div className="dac-left">
                    <div className="dac-time">{appt.slot}</div>
                    <div className="dac-date">{getDateLabel(appt.date)}</div>
                    {appt.queueNumber && (
                      <div className="dac-queue-num">#{appt.queueNumber} in slot</div>
                    )}
                  </div>
                  <div className="dac-center">
                    <div className="dac-patient-name">
                      👤 {appt.patientName}
                      <span style={{ marginLeft: 8, fontWeight: 400, fontSize: "0.82rem", color: "var(--gray-500)" }}>
                        {appt.patientAge}y · {appt.patientGender}
                      </span>
                    </div>
                    <div className="dac-reason">📋 {appt.reason}</div>
                    {appt.notes && <div className="dac-notes">💬 {appt.notes}</div>}
                    <div className="dac-contact">
                      📞 {appt.patientPhone} &nbsp;|&nbsp; ✉️ {appt.patientEmail}
                    </div>
                    <div className="dac-id">ID: {appt.bookingId}</div>
                  </div>
                  <div className="dac-right">
                    <div className={`badge ${statusColors[appt.status] || "badge-blue"}`}>
                      {appt.status}
                    </div>
                    <div className="dac-fee">₹{appt.doctorFee}</div>
                    <div className="dac-actions">
                      {appt.status === "Confirmed" && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleMarkComplete(appt.id)}
                          disabled={loadingId === appt.id}
                        >
                          {loadingId === appt.id ? "..." : "✅ Mark Done"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Live Queue Tab ──────────────────────────────── */}
        {activeTab === "queue" && (
          <div className="queue-panel card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h2 className="step-title" style={{ marginBottom: '8px' }}>🔢 Real-Time Patient Queue</h2>
                <p className="step-sub" style={{ margin: 0 }}>
                  Live flow for: <strong>{getDateLabel(queueDate)}</strong> • <strong>{queueSlot}</strong>
                </p>
              </div>

              {/* 3. QUEUE STATS (SMALL BUT USEFUL) */}
              <div className="queue-stats-small" style={{ display: 'flex', gap: '24px', background: 'var(--gray-50)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--gray-200)', boxShadow: 'Inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{queueList.length}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 700, letterSpacing: '0.05em', marginTop: '6px' }}>TOTAL WAITING</div>
                </div>
                <div style={{ width: '1px', background: 'var(--gray-300)' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{queueList.filter(a => a.status === "Completed").length}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 700, letterSpacing: '0.05em', marginTop: '6px' }}>COMPLETED</div>
                </div>
                <div style={{ width: '1px', background: 'var(--gray-300)' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{Math.max(0, queueList.length - currentIdx)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 700, letterSpacing: '0.05em', marginTop: '6px' }}>REMAINING</div>
                </div>
              </div>
            </div>

            {queueList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--gray-400)", background: 'var(--gray-50)', borderRadius: '16px', border: '2px dashed var(--gray-200)' }}>
                <div style={{ fontSize: "3rem", marginBottom: 12 }}>🪑</div>
                <h3 style={{ color: 'var(--gray-500)' }}>No patients booked for this slot yet.</h3>
              </div>
            ) : (
              <div className="queue-split-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '32px' }}>
                {/* 1. CURRENT PATIENT (TOP - MOST IMPORTANT) */}
                <div className="queue-main-col">
                  {queueList[currentIdx] ? (
                    <div className="current-patient-hero card" style={{ background: 'linear-gradient(145deg, #ffffff, #f4faff)', border: '2px solid #bfdbfe', padding: '40px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2563eb', fontWeight: 800, fontSize: '0.9rem', marginBottom: '24px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 0 4px rgba(59,130,246,0.2)' }}></span>
                        NOW SERVING
                      </div>
                      
                      <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '8px' }}>
                        Token #{queueList[currentIdx].queueNumber || currentIdx + 1}
                      </div>
                      <div style={{ fontSize: '3.8rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1, marginBottom: '16px', wordBreak: 'break-word' }}>
                        {queueList[currentIdx].patientName}
                      </div>
                      <div style={{ color: 'var(--gray-500)', fontSize: '1.1rem', marginBottom: '40px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <span>⏱️ Time started: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>{queueList[currentIdx].patientAge}y / {queueList[currentIdx].patientGender}</span>
                      </div>
                      
                      {/* 4. ACTION BUTTONS */}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn-lg" 
                          style={{ flex: '1', minWidth: '200px', padding: '20px 24px', fontSize: '1.15rem', background: '#10b981', color: '#ffffff', border: 'none', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }} 
                          onClick={handleQueueMarkDone}
                          disabled={queueList[currentIdx].status === "Completed"}
                        >
                          {queueList[currentIdx].status === "Completed" ? "✅ Completed" : "✅ Mark Completed"}
                        </button>
                        <button 
                          className="btn btn-primary btn-lg" 
                          style={{ flex: '1', minWidth: '200px', padding: '20px 24px', fontSize: '1.15rem', boxShadow: '0 4px 12px rgba(59,130,246,0.2)' }} 
                          onClick={handleQueueNext}
                        >
                          ⏭️ Next Patient
                        </button>
                        <button 
                          className="btn btn-outline btn-lg" 
                          style={{ padding: '20px 32px', fontSize: '1.15rem', color: '#ef4444', borderColor: '#fca5a5', background: '#fffcfc' }} 
                          onClick={handleQueueSkip}
                        >
                          Skip 🏃
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="current-patient-hero card" style={{ padding: '60px', textAlign: 'center', background: '#f8fafc', border: '2px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏁</div>
                      <h2 style={{ color: 'var(--navy)', marginBottom: '8px' }}>Queue Completed</h2>
                      <p style={{ color: 'var(--gray-500)', fontSize: '1.1rem' }}>You have seen all patients for this slot!</p>
                    </div>
                  )}
                </div>

                {/* 2. NEXT PATIENTS (QUEUE PREVIEW) */}
                <div className="queue-side-col">
                  <div className="card" style={{ padding: '24px', height: '100%' }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>👥</span> Next in Queue
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {queueList.slice(currentIdx + 1, currentIdx + 6).length > 0 ? (
                        queueList.slice(currentIdx + 1, currentIdx + 6).map((appt, i) => (
                          <div key={appt.id} className="next-patient-row" style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--gray-50)', padding: '16px', borderRadius: '12px', border: '1px solid var(--gray-100)' }}>
                            <div style={{ fontWeight: 800, color: 'var(--gray-400)', fontSize: '1.3rem', width: '32px', textAlign: 'center' }}>
                              #{appt.queueNumber || currentIdx + 2 + i}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {appt.patientName}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                                {appt.reason || "General Visit"}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--gray-500)', fontSize: '0.95rem', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
                          No upcoming patients.
                        </div>
                      )}
                    </div>
                    
                    {queueList.length - currentIdx - 6 > 0 && (
                      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--blue)', fontWeight: 700, background: '#eff6ff', padding: '12px', borderRadius: '8px' }}>
                        + {queueList.length - currentIdx - 6} more waiting
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Slot Manager ────────────────────────────────── */}
        {activeTab === "slots" && (
          <div className="slot-manager card">
            <h2 className="step-title">⏰ Manage Your Availability</h2>
            <p className="step-sub">
              Your calendar is open by default. You can toggle specific slots or toggle entire days if you are unavailable.
            </p>

            <div className="slot-controls" style={{ marginTop: '24px', marginBottom: '32px', display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '1', minWidth: '200px', maxWidth: '300px', margin: 0 }}>
                <label className="form-label">📅 Select Date to Manage</label>
                <input
                  type="date"
                  className="form-input"
                  value={manageDate}
                  min={todayStr}
                  onChange={(e) => setManageDate(e.target.value)}
                />
              </div>
            </div>

            <div className="slot-display mt-8">
              {(() => {
                const dayCancelled = isDayCancelled(manageDate);
                
                return (
                  <div className="slot-date-group" style={{ marginBottom: "16px" }}>
                    <div className="slot-date-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px dashed var(--gray-200)', marginBottom: '24px' }}>
                      <span style={{ fontSize: "1.1rem", color: dayCancelled ? "var(--gray-500)" : "inherit", textDecoration: dayCancelled ? "line-through" : "none" }}>
                        Overview for: {getDateLabel(manageDate)} ({manageDate})
                      </span>
                      
                      <div className="toggle-wrapper" style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '50px', border: '1px solid var(--gray-200)' }}>
                        <span className="toggle-label-text" style={{ color: dayCancelled ? '#ef4444' : '#10b981' }}>
                          {dayCancelled ? "Day Cancelled" : "Day Active"}
                        </span>
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={!dayCancelled} 
                            onChange={() => {
                              if (dayCancelled) {
                                handleEnableDay(manageDate);
                              } else {
                                handleCancelDay(manageDate);
                              }
                            }} 
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                    
                    {!dayCancelled && (
                      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "16px" }}>
                        {DAY_SLOTS.map((time) => {
                          const disabledSlot = disabledSlots.find(s => s.date === manageDate && s.time === time);
                          const isDisabled = !!disabledSlot;
                          
                          const slotAppts = appointments.filter(
                            (a) => a.date === manageDate && a.slot === time && a.status !== "Cancelled"
                          );
                          const hasBookings = slotAppts.length > 0;
                          
                          return (
                            <div key={time} className={`card ${isDisabled ? 'disabled-card' : ''}`} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--gray-200)', minWidth: '180px', background: isDisabled ? 'var(--gray-50)' : 'var(--white)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', opacity: isDisabled ? 0.7 : 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: isDisabled ? 'var(--gray-500)' : 'var(--navy)' }}>{time}</div>
                                <label className="toggle-switch">
                                  <input 
                                    type="checkbox" 
                                    checked={!isDisabled} 
                                    onChange={() => {
                                      if (isDisabled) {
                                        handleEnableSlot(disabledSlot.id);
                                      } else {
                                        handleDisableSlot(manageDate, time);
                                      }
                                    }} 
                                  />
                                  <span className="toggle-slider"></span>
                                </label>
                              </div>
                              
                              <div style={{ fontSize: '0.82rem', color: isDisabled ? '#ef4444' : 'var(--gray-500)', fontWeight: isDisabled ? '600' : 'normal', marginTop: 'auto' }}>
                                {isDisabled ? "Slot Disabled" : (
                                  <>Booked: <strong style={{ color: hasBookings ? 'var(--blue)' : 'inherit' }}>{slotAppts.length}/6</strong></>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

function notifyTurn(appt) {
  if (Notification.permission === "granted") {
    new Notification("🏥 It's Your Turn!", {
      body: `${appt.patientName}, the doctor is ready to see you now. Please proceed.`,
      icon: "/favicon.ico",
      tag: "queue-turn",
    });
  }
}
