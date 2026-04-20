// ============================================================
// AppointmentsContext — Local State (no Firebase DataConnect)
// Firebase Auth is untouched — only DB layer replaced with
// localStorage so that doctor + patient share the same store.
//
// Changes:
//   Fix 5: completeAppointment() sets status = "Completed"
//          in both state + localStorage (patient sees it too)
//   Fix 4: Each appointment has a `token` field (queue number)
//   Fix 6: No Firestore / DataConnect imports
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";

const AppointmentsContext = createContext();

const STORAGE_KEY = "medibook_appointments";

// ─── localStorage helpers ────────────────────────────────────
const readAll = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
};

const writeAll = (appts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appts));
  } catch (e) {
    console.warn("[Appointments] localStorage write failed:", e);
  }
};

// ─── Merge helper — update or insert by id ───────────────────
const mergeInto = (existing, incoming) => {
  const map = {};
  existing.forEach((a) => (map[a.id] = a));
  incoming.forEach((a) => (map[a.id] = { ...map[a.id], ...a }));
  return Object.values(map);
};

export function AppointmentsProvider({ children }) {
  const { currentUser } = useAuth();

  // Full list used by admin / doctor (all patients)
  const [allAppointments, setAllAppointments] = useState([]);
  // Filtered list for current patient
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // ─── Load from localStorage on user change ────────────────
  const loadAppointments = useCallback(
    (showLoading = true) => {
      if (!currentUser) {
        setAppointments([]);
        setAllAppointments([]);
        return;
      }
      if (showLoading) setLoading(true);
      const all = readAll();
      setAllAppointments(all);
      setAppointments(all.filter((a) => a.patientId === currentUser.uid));
      if (showLoading) setLoading(false);
    },
    [currentUser]
  );

  useEffect(() => {
    loadAppointments(true);
  }, [loadAppointments]);

  // ─── Book appointment ─────────────────────────────────────
  const addAppointment = (apptData) => {
    if (!currentUser) throw new Error("Must be logged in to book");

    const all = readAll();
    // Assign queue token for this doctor+date slot
    const slotAppts = all.filter(
      (a) =>
        a.doctorId === apptData.doctorId &&
        a.date === apptData.date &&
        a.slot === apptData.slot &&
        a.status !== "Cancelled"
    );
    const token = slotAppts.length + 1;

    const newAppt = {
      ...apptData,
      id: crypto.randomUUID(),
      bookingId: "MB" + Math.floor(100000 + Math.random() * 900000),
      patientId: currentUser.uid,
      status: "Confirmed",
      reviewed: false,
      token,
      queueNumber: token,
      createdAt: new Date().toISOString(),
    };

    const updated = [newAppt, ...all];
    writeAll(updated);
    setAllAppointments(updated);
    setAppointments(updated.filter((a) => a.patientId === currentUser.uid));
    return newAppt;
  };

  // ─── Cancel appointment ───────────────────────────────────
  const cancelAppointment = (appointmentId) => {
    const all = readAll().map((a) =>
      a.id === appointmentId ? { ...a, status: "Cancelled" } : a
    );
    writeAll(all);
    setAllAppointments(all);
    if (currentUser) {
      setAppointments(all.filter((a) => a.patientId === currentUser.uid));
    }
  };

  // ─── Fix 5: Complete appointment (doctor marks done) ─────
  // Writes to shared localStorage so patient sees "Completed" too
  const completeAppointment = (appointmentId) => {
    const all = readAll().map((a) =>
      a.id === appointmentId ? { ...a, status: "Completed" } : a
    );
    writeAll(all);
    setAllAppointments(all);
    if (currentUser) {
      setAppointments(all.filter((a) => a.patientId === currentUser.uid));
    }
  };

  // ─── Fix 4: Generic status update (queue: In-Progress / Skipped)
  const updateAppointmentStatus = (appointmentId, status) => {
    const all = readAll().map((a) =>
      a.id === appointmentId ? { ...a, status } : a
    );
    writeAll(all);
    setAllAppointments(all);
    if (currentUser) {
      setAppointments(all.filter((a) => a.patientId === currentUser.uid));
    }
  };

  // ─── Reschedule appointment ───────────────────────────────────
  const rescheduleAppointment = (appointmentId, newDate, newSlot) => {
    const all = readAll();
    const appt = all.find(a => a.id === appointmentId);
    if (!appt) throw new Error("Appointment not found");

    // Assign new queue token for the new date and slot
    const slotAppts = all.filter(
      (a) =>
        a.doctorId === appt.doctorId &&
        a.date === newDate &&
        a.slot === newSlot &&
        a.status !== "Cancelled"
    );
    const newToken = slotAppts.length + 1;

    const updatedAll = all.map((a) =>
      a.id === appointmentId ? { ...a, date: newDate, slot: newSlot, token: newToken, queueNumber: newToken, status: "Confirmed" } : a
    );

    writeAll(updatedAll);
    setAllAppointments(updatedAll);
    if (currentUser) {
      setAppointments(updatedAll.filter((a) => a.patientId === currentUser.uid));
    }
    return { success: true };
  };

  // ─── Get Queue Info ──────────────────────────────────────────
  const getQueueInfo = (doctorId, date, slot, myToken) => {
    const slotAppts = allAppointments.filter(
      (a) => a.doctorId === doctorId && a.date === date && a.slot === slot && a.status !== "Cancelled"
    );
    const inProgress = slotAppts.find((a) => a.status === "In-Progress");
    let currentToken = 0;
    if (inProgress) {
      currentToken = inProgress.token;
    } else {
      const completedOrSkipped = slotAppts.filter(a => a.status === "Completed" || a.status === "Skipped");
      if (completedOrSkipped.length > 0) {
        currentToken = Math.max(...completedOrSkipped.map(a => a.token));
      }
    }
    const tokensAhead = Math.max(0, myToken - currentToken - 1);
    const estimatedWait = tokensAhead * 10; // 10 mins per patient (6 per hour)
    return { currentToken, tokensAhead, estimatedWait };
  };

  // ─── Mark reviewed ────────────────────────────────────────
  const markReviewed = (appointmentId) => {
    const all = readAll().map((a) =>
      a.id === appointmentId ? { ...a, reviewed: true } : a
    );
    writeAll(all);
    setAllAppointments(all);
    if (currentUser) {
      setAppointments(all.filter((a) => a.patientId === currentUser.uid));
    }
  };

  return (
    <AppointmentsContext.Provider
      value={{
        appointments,
        allAppointments,
        loading,
        loadError: null,
        dbConnected: false,
        addAppointment,
        cancelAppointment,
        completeAppointment,
        updateAppointmentStatus,
        rescheduleAppointment,
        getQueueInfo,
        markReviewed,
        refreshAppointments: loadAppointments,
        appointmentsCount: appointments.filter((a) => a.status === "Confirmed").length,
      }}
    >
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentsContext);
  if (!context) throw new Error("useAppointments must be used within AppointmentsProvider");
  return context;
}