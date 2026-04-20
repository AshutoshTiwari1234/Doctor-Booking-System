// ============================================================
// Firebase Cloud Messaging — Service Worker
// File MUST be at: public/firebase-messaging-sw.js
// (served at /firebase-messaging-sw.js by Vite)
//
// This service worker handles:
//   ✅ Background push notifications (when app is not focused)
//   ✅ Notification click → opens the app
//   ✅ Custom notification display with icon and badge
//
// ⚠️  IMPORTANT: This file runs in a service worker context.
//     It cannot use import.meta.env — paste your Firebase config below.
//     Keep this in sync with the values in your .env.local file.
// ============================================================

// Import Firebase scripts via CDN (service workers can't use ES modules)
importScripts("https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js");

// ─── Firebase Config ─────────────────────────────────────────
// Paste your actual values here (same as .env.local)
// Service workers don't have access to Vite's import.meta.env
const firebaseConfig = {
  apiKey: "AIzaSyD9uta-Tp7aTFBLpQJjxPsqYGgJqttOSO0",
  authDomain: "doctor-appointment-7705e.firebaseapp.com",
  projectId: "doctor-appointment-7705e",
  storageBucket: "doctor-appointment-7705e.firebasestorage.app",
  messagingSenderId: "914545253307",
  appId: "1:914545253307:web:63ab4bb4a9b868fad8429e",
};

// Initialize Firebase inside the service worker
firebase.initializeApp(firebaseConfig);

// Get the messaging instance
const messaging = firebase.messaging();

// ─── Background Message Handler ───────────────────────────────
// Called when a notification arrives while the app is NOT in focus
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload);

  const { title, body, icon, image, clickAction } = payload.notification || {};
  const data = payload.data || {};

  // Customize the notification display
  const notificationTitle = title || "MediBook Notification";
  const notificationOptions = {
    body: body || "You have a new notification from MediBook.",
    icon: icon || "/logo.png",           // App logo shown in notification
    badge: "/badge-icon.png",            // Small monochrome badge
    image: image || undefined,           // Large image (optional)
    tag: data.tag || "medibook-default", // Groups notifications (replaces duplicates)
    renotify: true,                      // Vibrate even if tag matches existing
    requireInteraction: false,           // Auto-dismiss after a few seconds
    data: {
      url: clickAction || data.url || "/",
      ...data,
    },
    actions: [
      { action: "view", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  // Show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ─── Notification Click Handler ───────────────────────────────
// Called when user clicks the notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || "/";

  if (action === "dismiss") return;

  // Open or focus the existing app window
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// ─── Service Worker Lifecycle ─────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Installing firebase-messaging-sw.js");
  self.skipWaiting(); // Activate immediately
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activated firebase-messaging-sw.js");
  event.waitUntil(clients.claim()); // Take control of all clients
});
