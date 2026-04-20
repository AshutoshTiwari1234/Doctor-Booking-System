// ============================================================
// Firebase Cloud Messaging (FCM) — Push Notification Module
//
// Provides:
//   • requestNotificationPermission() — asks user permission + gets token
//   • getFCMToken()                   — get/refresh token
//   • onForegroundMessage()           — receive messages while app is open
//   • saveFCMToken()                  — store token to Data Connect DB
//   • deleteCurrentToken()            — revoke token on logout
//
// VAPID Key setup:
//   Firebase Console → Project Settings → Cloud Messaging
//   → Web Push certificates → Generate key pair
//   → Copy the key → paste as VITE_FIREBASE_VAPID_KEY in .env.local
// ============================================================

import { getMessaging, getToken, onMessage, deleteToken } from "firebase/messaging";
import app from "./config";

// Initialize FCM (only works in a browser with service worker support)
let messaging = null;

// Lazily initialize messaging (avoids SSR issues and unsupported browsers)
const getMessagingInstance = () => {
  if (!messaging) {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return null;
    }
    try {
      messaging = getMessaging(app);
    } catch (err) {
      console.warn("[FCM] Failed to initialize messaging:", err.message);
      return null;
    }
  }
  return messaging;
};

// VAPID key from environment (set VITE_FIREBASE_VAPID_KEY in .env.local)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// ─────────────────────────────────────────────────────────────
// REQUEST PERMISSION + GET TOKEN
// Call this from a user interaction (e.g. button click)
// Returns: { token, permission } or throws on error
// ─────────────────────────────────────────────────────────────
export const requestNotificationPermission = async () => {
  const msg = getMessagingInstance();
  if (!msg) {
    throw new Error("FCM is not supported in this browser.");
  }

  if (!VAPID_KEY || VAPID_KEY === "YOUR_VAPID_KEY") {
    throw new Error(
      "VITE_FIREBASE_VAPID_KEY is not set.\n" +
      "Go to: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair"
    );
  }

  // Request browser notification permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission denied by user.");
  }

  // Ensure service worker is registered before getting token
  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
    { scope: "/" }
  );

  // Get the FCM registration token
  const token = await getToken(msg, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  console.log("[FCM] Token obtained:", token);
  return { token, permission };
};

// ─────────────────────────────────────────────────────────────
// GET EXISTING FCM TOKEN (without re-requesting permission)
// Returns null if not permitted or not supported
// ─────────────────────────────────────────────────────────────
export const getFCMToken = async () => {
  const msg = getMessagingInstance();
  if (!msg || !VAPID_KEY) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token;
  } catch (err) {
    console.warn("[FCM] Could not get token:", err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// FOREGROUND MESSAGE LISTENER
// Called when app is OPEN (in focus) and a push arrives.
// Returns an unsubscribe function.
// ─────────────────────────────────────────────────────────────
export const onForegroundMessage = (callback) => {
  const msg = getMessagingInstance();
  if (!msg) return () => {};
  return onMessage(msg, (payload) => {
    console.log("[FCM] Foreground message:", payload);
    callback(payload);
  });
};

// ─────────────────────────────────────────────────────────────
// DELETE TOKEN (call on logout to stop receiving notifications)
// ─────────────────────────────────────────────────────────────
export const deleteCurrentToken = async () => {
  const msg = getMessagingInstance();
  if (!msg) return;
  try {
    await deleteToken(msg);
    console.log("[FCM] Token deleted.");
  } catch (err) {
    console.warn("[FCM] Failed to delete token:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// CHECK SUPPORT
// Returns true if FCM is supported in the current browser
// ─────────────────────────────────────────────────────────────
export const isFCMSupported = () => {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
};

// ─────────────────────────────────────────────────────────────
// GET PERMISSION STATUS (without requesting)
// Returns: "granted" | "denied" | "default"
// ─────────────────────────────────────────────────────────────
export const getNotificationPermissionStatus = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "granted" | "denied" | "default"
};
