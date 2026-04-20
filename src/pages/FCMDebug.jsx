// ============================================================
// FCM Token Debugger Page
// Accessed at: /fcm-debug (add to App.jsx routes temporarily)
//
// This page:
//   ✅ Diagnoses each FCM prerequisite step by step
//   ✅ Shows the token ON SCREEN (not just console)
//   ✅ Has a one-click copy button for the token
//   ✅ Shows exactly what's wrong if anything fails
//   ✅ Works even when .env.local is not filled in yet
// ============================================================

import React, { useState, useEffect } from "react";
import { getMessaging, getToken } from "firebase/messaging";
import app from "../firebase/config";
import "./FCMDebug.css";

// ─── Step definitions ─────────────────────────────────────────
const STEPS = [
  { id: "browser", label: "Browser Support (HTTPS / Notifications API)" },
  { id: "sw",      label: "Service Worker Registration" },
  { id: "perm",    label: "Notification Permission" },
  { id: "vapid",   label: "VAPID Key configured" },
  { id: "token",   label: "FCM Token retrieval" },
];

const STATUS = { idle: "idle", ok: "ok", fail: "fail", loading: "loading" };

export default function FCMDebug() {
  const [steps, setSteps]   = useState(
    Object.fromEntries(STEPS.map((s) => [s.id, { status: STATUS.idle, detail: "" }]))
  );
  const [token, setToken]     = useState(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied]   = useState(false);

  // VAPID key — user can paste it directly here if .env.local is empty
  const [vapidInput, setVapidInput] = useState(
    import.meta.env.VITE_FIREBASE_VAPID_KEY || ""
  );

  const setStep = (id, status, detail = "") =>
    setSteps((prev) => ({ ...prev, [id]: { status, detail } }));

  // ─── Run the full FCM diagnostic ─────────────────────────
  const runDiagnostic = async () => {
    setRunning(true);
    setToken(null);
    // Reset all steps
    STEPS.forEach((s) => setStep(s.id, STATUS.idle));

    // ── Step 1: Browser support ───────────────────────────
    setStep("browser", STATUS.loading);
    await delay(300);
    const isHttps = location.protocol === "https:" || location.hostname === "localhost";
    const hasNotif = "Notification" in window;
    const hasSW    = "serviceWorker" in navigator;
    const hasPush  = "PushManager" in window;

    if (!isHttps) {
      setStep("browser", STATUS.fail, "❌ FCM requires HTTPS or localhost. You are on: " + location.protocol);
      setRunning(false); return;
    }
    if (!hasNotif || !hasSW || !hasPush) {
      setStep("browser", STATUS.fail,
        `Missing: ${!hasNotif ? "Notification API " : ""}${!hasSW ? "ServiceWorker " : ""}${!hasPush ? "PushManager" : ""}`
      );
      setRunning(false); return;
    }
    setStep("browser", STATUS.ok, `✅ ${location.protocol}//${location.hostname} — all APIs available`);

    // ── Step 2: Register service worker ──────────────────
    setStep("sw", STATUS.loading);
    await delay(300);
    let swReg;
    try {
      swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      setStep("sw", STATUS.ok, `✅ Registered at scope: ${swReg.scope}`);
    } catch (err) {
      setStep("sw", STATUS.fail,
        `❌ ${err.message}\n\nCheck: public/firebase-messaging-sw.js must have valid Firebase config (not placeholder values)`
      );
      setRunning(false); return;
    }

    // ── Step 3: Request notification permission ───────────
    setStep("perm", STATUS.loading);
    await delay(300);
    let permission;
    try {
      permission = await Notification.requestPermission();
    } catch (err) {
      permission = Notification.permission;
    }
    if (permission !== "granted") {
      setStep("perm", STATUS.fail,
        `❌ Permission: "${permission}". ` +
        (permission === "denied"
          ? "User blocked notifications. Reset in browser → Site Settings → Notifications → Reset."
          : "User dismissed the prompt. Try again.")
      );
      setRunning(false); return;
    }
    setStep("perm", STATUS.ok, `✅ Permission granted`);

    // ── Step 4: Check VAPID key ───────────────────────────
    setStep("vapid", STATUS.loading);
    await delay(300);
    const vapidKey = vapidInput.trim();
    if (!vapidKey || vapidKey.toLowerCase() === "your_vapid_key") {
      setStep("vapid", STATUS.fail,
        `❌ VAPID key is empty or still placeholder.\n\nGet it from:\nFirebase Console → Project Settings → Cloud Messaging tab → Web Push certificates → Generate key pair\n\nPaste the key in the input field above and try again.`
      );
      setRunning(false); return;
    }
    setStep("vapid", STATUS.ok, `✅ Key present (${vapidKey.length} chars) — starts with: ${vapidKey.slice(0, 20)}...`);

    // ── Step 5: Get FCM token ─────────────────────────────
    setStep("token", STATUS.loading);
    await delay(300);
    try {
      const messaging = getMessaging(app);
      const fcmToken = await getToken(messaging, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: swReg,
      });

      if (!fcmToken) {
        setStep("token", STATUS.fail, "❌ getToken() returned empty. Check Firebase project configuration and Sender ID.");
        setRunning(false); return;
      }

      setToken(fcmToken);
      setStep("token", STATUS.ok, `✅ Token retrieved successfully (${fcmToken.length} chars)`);

      // Also log to console for backup
      console.group("🎉 FCM Token Retrieved Successfully");
      console.log(fcmToken);
      console.log("\nTest this token:");
      console.log("Firebase Console → Cloud Messaging → Create campaign → Test on device → paste token");
      console.groupEnd();

    } catch (err) {
      let hint = "";
      if (err.code === "messaging/invalid-vapid-key") {
        hint = "\n\nThe VAPID key format is wrong. Make sure you copied the full key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates.";
      } else if (err.code === "messaging/registration-token-refresh-error") {
        hint = "\n\nFirebase project might not have Cloud Messaging enabled, or the Sender ID in the service worker doesn't match your project.";
      } else if (err.message?.includes("senderId")) {
        hint = "\n\nThe messagingSenderId in public/firebase-messaging-sw.js is wrong or still a placeholder.";
      }
      setStep("token", STATUS.fail, `❌ ${err.message}${hint}`);
    }

    setRunning(false);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const statusIcon  = { idle: "⬜", ok: "✅", fail: "❌", loading: "⏳" };
  const statusClass = { idle: "", ok: "step-ok", fail: "step-fail", loading: "step-loading" };

  return (
    <div className="fcm-debug-page">
      <div className="fcm-debug-card">
        <div className="fcm-debug-header">
          <div className="fcm-debug-icon">🔔</div>
          <h1>FCM Token Debugger</h1>
          <p>Diagnoses why your FCM token is not appearing. Checks each setup step.</p>
        </div>

        {/* VAPID Key Input */}
        <div className="fcm-vapid-section">
          <label className="form-label">
            🔑 VAPID Key
            <span className="vapid-hint">
              Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
            </span>
          </label>
          <div className="vapid-input-row">
            <input
              className="form-input vapid-input"
              type="text"
              placeholder="Paste your VAPID key here (starts with BH...)"
              value={vapidInput}
              onChange={(e) => setVapidInput(e.target.value)}
            />
          </div>
          {(!vapidInput || vapidInput === "YOUR_VAPID_KEY") && (
            <div className="vapid-missing-warning">
              ⚠️ VAPID key is not filled in — this is the most common reason the token doesn't appear.
              Get it from Firebase Console and paste it above.
            </div>
          )}
        </div>

        {/* Run button */}
        <button
          className="btn btn-primary fcm-run-btn"
          onClick={runDiagnostic}
          disabled={running}
          id="fcm-run-diagnostic"
        >
          {running ? "⏳ Running diagnostics..." : "🚀 Get FCM Token"}
        </button>

        {/* Diagnostic steps */}
        <div className="fcm-steps">
          {STEPS.map((step, i) => {
            const { status, detail } = steps[step.id];
            return (
              <div key={step.id} className={`fcm-step ${statusClass[status]}`}>
                <div className="fcm-step-header">
                  <span className="fcm-step-num">{i + 1}</span>
                  <span className="fcm-step-icon">{statusIcon[status]}</span>
                  <span className="fcm-step-label">{step.label}</span>
                </div>
                {detail && (
                  <div className="fcm-step-detail">{detail}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Token display (big, copyable) */}
        {token && (
          <div className="fcm-token-result">
            <div className="ftr-header">
              <span className="ftr-title">🎉 Your FCM Token</span>
              <button
                className="btn btn-primary btn-sm"
                onClick={copyToken}
                id="fcm-copy-token"
              >
                {copied ? "✅ Copied!" : "📋 Copy Token"}
              </button>
            </div>
            <div className="ftr-token">{token}</div>
            <div className="ftr-next">
              <strong>Next step:</strong> Go to{" "}
              <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer">
                Firebase Console
              </a>{" "}
              → Cloud Messaging → Create campaign → Test on device → paste token → Send
            </div>
          </div>
        )}

        {/* SW config reminder */}
        <div className="fcm-reminder">
          <strong>⚠️ Before running:</strong> Open{" "}
          <code>public/firebase-messaging-sw.js</code> and replace the placeholder values
          (<code>YOUR_API_KEY</code>, <code>YOUR_SENDER_ID</code>, etc.) with your actual
          Firebase project credentials. The service worker cannot read <code>.env.local</code>.
        </div>
      </div>
    </div>
  );
}
