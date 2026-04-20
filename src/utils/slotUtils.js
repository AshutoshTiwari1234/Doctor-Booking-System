// ============================================================
// slotUtils.js — Slot generation and capacity management
//
// Business rules:
//   • Working hours: 09:00 AM – 05:00 PM (9 hourly slots)
//   • Capacity: 6 patients per hour slot
//   • Queue: Patients within a slot are numbered 1–6
// ============================================================

export const PATIENTS_PER_HOUR = 6;

// All bookable hour slots in a day (09:00 AM – 05:00 PM, 1-2 PM Break)
const SLOT_HOURS = [9, 10, 11, 12, 14, 15, 16, 17];

function formatHour(h) {
  const hh = h % 12 || 12;
  const ampm = h < 12 || h === 24 ? "AM" : "PM";
  return `${String(hh).padStart(2, "0")}:00 ${ampm}`;
}

// Returns ["09:00 AM - 10:00 AM", ...]
export const generateDaySlots = () =>
  SLOT_HOURS.map((h) => `${formatHour(h)} - ${formatHour(h + 1)}`);

// Returns { slot: "09:00 AM - 10:00 AM", label: "09:00 AM - 10:00 AM" }
// (for display purposes)
export const generateSlotLabels = () =>
  SLOT_HOURS.map((h) => {
    const range = `${formatHour(h)} - ${formatHour(h + 1)}`;
    return {
      slot: range,
      label: range,
    };
  });

// How many non-cancelled appointments exist for this slot
export const getSlotBookedCount = (appointments, date, slot) =>
  appointments.filter(
    (a) => a.date === date && a.slot === slot && a.status !== "Cancelled"
  ).length;

// How many spots are still open
export const getAvailableCount = (appointments, date, slot) =>
  Math.max(0, PATIENTS_PER_HOUR - getSlotBookedCount(appointments, date, slot));

// True if the slot is at 6/6 capacity
export const isSlotFull = (appointments, date, slot) =>
  getSlotBookedCount(appointments, date, slot) >= PATIENTS_PER_HOUR;

// True if ALL slots on a given date are full
export const isDayFull = (appointments, date) =>
  generateDaySlots().every((slot) => isSlotFull(appointments, date, slot));

// Queue position (1-indexed) of a specific appointment within its slot
export const getQueueNumber = (appointments, date, slot, apptId) => {
  const slotAppts = appointments
    .filter(
      (a) =>
        a.date === date &&
        a.slot === slot &&
        a.status !== "Cancelled"
    )
    .sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0));
  const idx = slotAppts.findIndex((a) => a.id === apptId);
  return idx >= 0 ? idx + 1 : null;
};

// Generate available dates (today + next N days)
export const generateAvailableDates = (days = 14) => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
};

// Human-readable date label
export const getDateLabel = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const diff = Math.round(
    (d - new Date(today.toISOString().split("T")[0] + "T00:00:00")) / 86400000
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

// True if the slot has passed based on current time
export const isSlotPassed = (dateStr, slotTimeStr) => {
  const todayStr = new Date().toISOString().split("T")[0];
  if (dateStr > todayStr) return false;
  if (dateStr < todayStr) return true;
  
  // It's today
  const currentHour = new Date().getHours();
  // Assuming slot format like "09:00 AM - 10:00 AM"
  const startTimeStr = slotTimeStr.split(" - ")[0];
  let [timeStr, modifier] = startTimeStr.split(" ");
  let [hourStr] = timeStr.split(":");
  let startHour = parseInt(hourStr, 10);
  
  if (modifier === "PM" && startHour !== 12) startHour += 12;
  if (modifier === "AM" && startHour === 12) startHour = 0;
  
  // Disable if current hour is greater than or equal to the start hour of the slot
  // (Meaning if it's 3:xx PM, the 3:00 PM slot is already in progress/closed for new bookings)
  return currentHour >= startHour;
};
