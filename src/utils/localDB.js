// ============================================================
// localDB.js — localStorage-based appointment store
//
// Acts as a fully functional DB fallback when Firebase Data
// Connect SDK is not yet generated. Provides the same API
// surface as the Data Connect functions so the rest of the
// app doesn't need to know which backend is in use.
// ============================================================

const APPTS_KEY = "medibook_appointments";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function bookingId() {
  return "MB" + Math.floor(100000 + Math.random() * 900000);
}

// ─── Core storage helpers ─────────────────────────────────────
export function _getAll() {
  try {
    return JSON.parse(localStorage.getItem(APPTS_KEY) || "[]");
  } catch {
    return [];
  }
}
function _save(appts) {
  localStorage.setItem(APPTS_KEY, JSON.stringify(appts));
}

// ─── Read ─────────────────────────────────────────────────────
export function getPatientAppointments(patientId) {
  return _getAll()
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getDoctorAppointments(doctorId) {
  return _getAll()
    .filter((a) => a.doctorId === doctorId)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.queueNumber || 0) - (b.queueNumber || 0);
    });
}

// All appointments (for capacity checks)
export function getAllAppointments() {
  return _getAll();
}

// ─── Write ────────────────────────────────────────────────────
export function addAppointment(data) {
  const all = _getAll();

  // Determine queue number within this slot
  const slotAppts = all.filter(
    (a) =>
      a.doctorId === data.doctorId &&
      a.date === data.date &&
      a.slot === data.slot &&
      a.status !== "Cancelled"
  );
  const queueNumber = slotAppts.length + 1;

  const appt = {
    id: uid(),
    bookingId: bookingId(),
    queueNumber,
    status: "Confirmed",
    createdAt: new Date().toISOString(),
    ...data,
  };

  all.push(appt);
  _save(all);
  return appt;
}

export function updateStatus(id, status) {
  const all = _getAll();
  const idx = all.findIndex((a) => a.id === id);
  if (idx >= 0) {
    all[idx].status = status;
    _save(all);
    return all[idx];
  }
  return null;
}

export function deleteAppointment(id) {
  const all = _getAll().filter((a) => a.id !== id);
  _save(all);
}

// ─── Queue state ──────────────────────────────────────────────
// currentQueueIndex: index in the sorted slot list the doctor is on
const queueKey = (doctorId, date, slot) =>
  `medibook_q_${doctorId}_${date}_${slot}`;

export function getCurrentQueueIndex(doctorId, date, slot) {
  return parseInt(localStorage.getItem(queueKey(doctorId, date, slot)) || "0", 10);
}

export function advanceQueue(doctorId, date, slot) {
  const key = queueKey(doctorId, date, slot);
  const cur = getCurrentQueueIndex(doctorId, date, slot);
  localStorage.setItem(key, String(cur + 1));
  return cur + 1;
}

export function resetQueue(doctorId, date, slot) {
  localStorage.removeItem(queueKey(doctorId, date, slot));
}

// ─── Today's queue for a doctor across all slots ───────────────
export function getDayQueue(doctorId, date) {
  const all = getDoctorAppointments(doctorId).filter(
    (a) => a.date === date && a.status !== "Cancelled"
  );
  // Sort by slot time then queue number
  return all.sort((a, b) => {
    if (a.slot !== b.slot) return a.slot < b.slot ? -1 : 1;
    return (a.queueNumber || 0) - (b.queueNumber || 0);
  });
}

// ─── Doctor Custom Slots ───────────────────────────────────────
const SLOTS_KEY = "medibook_custom_slots";

function _getAllSlots() {
  try {
    return JSON.parse(localStorage.getItem(SLOTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getCustomSlots(doctorId) {
  return _getAllSlots().filter((s) => s.doctorId === doctorId);
}

export function addCustomSlot(doctorId, date, time) {
  const all = _getAllSlots();
  if (!all.find((s) => s.doctorId === doctorId && s.date === date && s.time === time)) {
    all.push({ doctorId, date, time, id: uid() });
    localStorage.setItem(SLOTS_KEY, JSON.stringify(all));
  }
}

export function removeCustomSlot(slotId) {
  const all = _getAllSlots().filter((s) => s.id !== slotId);
  localStorage.setItem(SLOTS_KEY, JSON.stringify(all));
}

export function cancelSlotAndAppointments(doctorId, date, slotTime) {
  // 1. Remove the slot
  let slots = _getAllSlots();
  slots = slots.filter((s) => !(s.doctorId === doctorId && s.date === date && s.time === slotTime));
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));

  // 2. Cancel all pending/confirmed appointments
  let appts = _getAll();
  let changed = false;
  appts.forEach((a) => {
    if (a.doctorId === doctorId && a.date === date && a.slot === slotTime && a.status === "Confirmed") {
      a.status = "Cancelled";
      changed = true;
    }
  });
  if (changed) _save(appts);
}

export function cancelDayAndAppointments(doctorId, date) {
  // 1. Remove all slots for this date
  let slots = _getAllSlots();
  slots = slots.filter((s) => !(s.doctorId === doctorId && s.date === date));
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));

  // 2. Cancel all pending/confirmed appointments for this date
  let appts = _getAll();
  let changed = false;
  appts.forEach((a) => {
    if (a.doctorId === doctorId && a.date === date && a.status === "Confirmed") {
      a.status = "Cancelled";
      changed = true;
    }
  });
  if (changed) _save(appts);
}
