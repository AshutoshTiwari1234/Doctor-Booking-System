// ============================================================
// Role Configuration — Email-based Role Assignment
//
// All new users default to "patient".
// Emails listed here are auto-assigned "doctor" or "admin"
// on first signup / first Google sign-in.
//
// To add a new doctor: add their email to DOCTOR_EMAILS below.
// To add a new admin:  add their email to ADMIN_EMAILS below.
// ============================================================

// ─── Admin Emails ─────────────────────────────────────────────
export const ADMIN_EMAILS = [
  "divyanshu.2428cse15@kiet.edu",
];

// ─── Pre-approved Doctor Emails ───────────────────────────────
// These accounts are created as "doctor" and auto-approved.
export const DOCTOR_EMAILS = [
  "dr.sharma@medibook.com",
  "dr.priya@medibook.com",
  "dr.rahul@medibook.com",
  "dr.anita@medibook.com",
  "dr.vikram@medibook.com",
  "dr.sunita@medibook.com",
];

// ─── Role resolver ────────────────────────────────────────────
// Returns "admin" | "doctor" | "patient" based on email
export const getRoleForEmail = (email = "") => {
  const normalized = email.toLowerCase().trim();
  if (ADMIN_EMAILS.includes(normalized)) return "admin";
  if (DOCTOR_EMAILS.includes(normalized)) return "doctor";
  return "patient";
};
