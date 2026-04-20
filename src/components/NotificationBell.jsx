// ============================================================
// NotificationBell Component
// Shows unread notification count badge in the Navbar.
// Clicking opens a dropdown with the notification list.
// Handles:
//   • FCM permission request on first click
//   • Foreground message toasts while app is open
//   • Persistent notification list (from Data Connect DB)
//   • Mark all read / mark individual read
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  requestNotificationPermission,
  onForegroundMessage,
  isFCMSupported,
  getNotificationPermissionStatus,
} from "../firebase/messaging";
import { useAuth } from "../context/AuthContext";
import "./NotificationBell.css";

export default function NotificationBell() {
  const { currentUser } = useAuth();

  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(getNotificationPermissionStatus());
  const [fcmToken, setFcmToken] = useState(null);
  const [requesting, setRequesting] = useState(false);

  // Local notification list (populated by foreground messages and any stored ones)
  const [notifications, setNotifications] = useState([
    // Default welcome notification shown on first open
    {
      id: "welcome",
      title: "Welcome to MediBook! 👋",
      body: "Enable notifications to get appointment reminders and updates.",
      time: "Just now",
      read: false,
      type: "info",
    },
  ]);

  const bellRef = useRef(null);

  // ─── Close dropdown on outside click ─────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Foreground message listener (app is open) ───────────
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onForegroundMessage((payload) => {
      const notif = payload.notification || {};
      const data = payload.data || {};

      // Add to notification list
      const newNotif = {
        id: Date.now().toString(),
        title: notif.title || "New Notification",
        body: notif.body || "",
        time: "Just now",
        read: false,
        type: data.type || "info",
        url: data.url || "/",
      };

      setNotifications((prev) => [newNotif, ...prev]);

      // Also show a toast inside the app
      toast.info(`🔔 ${notif.title}: ${notif.body}`, {
        onClick: () => setOpen(true),
      });
    });

    return unsubscribe;
  }, [currentUser]);

  // ─── Request FCM permission ───────────────────────────────
  const handleEnableNotifications = async () => {
    if (!isFCMSupported()) {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }
    setRequesting(true);
    try {
      const { token } = await requestNotificationPermission();
      setFcmToken(token);
      setPermission("granted");

      // Add success notification
      setNotifications((prev) => [
        {
          id: "enabled",
          title: "✅ Notifications Enabled!",
          body: "You'll now receive appointment reminders and updates.",
          time: "Just now",
          read: false,
          type: "success",
        },
        ...prev.filter((n) => n.id !== "welcome"),
      ]);

      // Log the token for the user (they can send this to their server)
      console.group("📲 FCM Token Retrieved");
      console.log("Token:", token);
      console.log("Use this token to send test notifications from Firebase Console:");
      console.log("Firebase Console → Cloud Messaging → Send test message → Token");
      console.groupEnd();

      toast.success("🔔 Push notifications enabled!");
    } catch (err) {
      setPermission(Notification.permission);
      if (err.message.includes("denied")) {
        toast.error("Notifications blocked. Allow them in your browser settings.");
      } else if (err.message.includes("VAPID")) {
        toast.warning("⚠️ VAPID key not configured. See console for instructions.");
        console.error("[FCM Setup Required]", err.message);
      } else {
        toast.error("Failed to enable notifications: " + err.message);
      }
    } finally {
      setRequesting(false);
    }
  };

  // ─── Mark a notification as read ─────────────────────────
  const markRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => setNotifications([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Type to icon mapping
  const typeIcon = { success: "✅", info: "ℹ️", warning: "⚠️", error: "❌" };

  if (!currentUser) return null;

  return (
    <div className="notif-bell-wrap" ref={bellRef}>
      {/* Bell button */}
      <button
        id="notification-bell"
        className="bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${unreadCount} unread notifications`}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {/* Notification dropdown */}
      {open && (
        <div className="notif-dropdown animate-fade-up">
          {/* Header */}
          <div className="nd-header">
            <div className="nd-title">Notifications</div>
            <div className="nd-actions">
              {unreadCount > 0 && (
                <button className="nd-action-btn" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button className="nd-action-btn nd-clear" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Enable notifications CTA (if not granted) */}
          {permission !== "granted" && (
            <div className="nd-enable-cta">
              <div className="nd-cta-icon">🔔</div>
              <div>
                <div className="nd-cta-title">Enable Push Notifications</div>
                <div className="nd-cta-sub">Get appointment reminders and updates</div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleEnableNotifications}
                disabled={requesting || permission === "denied"}
              >
                {requesting ? "..." : permission === "denied" ? "Blocked" : "Enable"}
              </button>
            </div>
          )}

          {/* FCM token display (for dev/testing) */}
          {fcmToken && permission === "granted" && (
            <div className="nd-token-box">
              <div className="nd-token-label">
                📲 FCM Token <span className="nd-token-hint">(for testing)</span>
              </div>
              <div className="nd-token-val" title={fcmToken}>
                {fcmToken.slice(0, 30)}...
              </div>
              <button
                className="nd-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(fcmToken);
                  toast.success("Token copied to clipboard!");
                }}
              >
                📋 Copy
              </button>
            </div>
          )}

          {/* Notification list */}
          <div className="nd-list">
            {notifications.length === 0 ? (
              <div className="nd-empty">
                <div className="nd-empty-icon">🎉</div>
                <div>You're all caught up!</div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`nd-item ${n.read ? "read" : "unread"}`}
                  onClick={() => { markRead(n.id); n.url && window.location.assign(n.url); }}
                >
                  <div className="nd-item-icon">{typeIcon[n.type] || "🔔"}</div>
                  <div className="nd-item-body">
                    <div className="nd-item-title">{n.title}</div>
                    {n.body && <div className="nd-item-desc">{n.body}</div>}
                    <div className="nd-item-time">{n.time}</div>
                  </div>
                  {!n.read && <div className="nd-unread-dot"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
