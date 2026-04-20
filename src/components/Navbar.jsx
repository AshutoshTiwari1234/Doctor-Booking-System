// ============================================================
// Upgraded Navbar — Role-aware, user avatar, auth state
// Shows: Home, Find Doctors, My Appointments (patient)
//        Doctor Dashboard (doctor), Admin Panel (admin)
//        Login/Register or user menu (auth state aware)
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppointments } from "../context/AppointmentsContext";
import { logoutUser } from "../firebase/auth";
import NotificationBell from "./NotificationBell";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, isDoctor, isAdmin } = useAuth();
  const { appointmentsCount } = useAppointments();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const userMenuRef = useRef(null);

  // ─── Network Status Detector ────────────────────────────
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ─── Scroll detector for navbar shadow ───────────────────
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ─── Close user dropdown on outside click ────────────────
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNavigate = (p) => {
    navigate(p === "home" ? "/" : "/" + p);
    window.scrollTo(0, 0);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUserMenuOpen(false);
    navigate("/");
  };

  const currentPath = location.pathname;

  // ─── Build navigation links based on role ────────────────
  const getLinks = () => {
    const base = [{ key: "", label: "Home" }];

    if (!isDoctor && !isAdmin) {
      // Patient links
      base.push(
        { key: "doctors", label: "Find Doctors" },
        { key: "appointments", label: "My Appointments", badge: appointmentsCount },
        { key: "medical-reports", label: "Health Vault" }
      );
    } else if (isDoctor) {
      // Doctor links
      base.push({ key: "doctor-dashboard", label: "My Dashboard" });
    } else if (isAdmin) {
      // Admin links
      base.push(
        { key: "admin", label: "Admin Panel" },
        { key: "doctors", label: "View Doctors" }
      );
    }
    return base;
  };

  const links = getLinks();

  // Get user initials for avatar
  const initials = userProfile?.name
    ? userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-inner">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => handleNavigate("home")}>
          <div className="logo-icon"><span>+</span></div>
          <div className="logo-text">
            <span className="logo-main">DocBridge</span>
            <span className="logo-sub">Healthcare</span>
          </div>
        </div>

        {/* Navigation links */}
        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          {links.map((l) => (
            <button
              key={l.key}
              id={`nav-${l.key || "home"}`}
              className={`nav-link ${currentPath === (l.key ? "/" + l.key : "/") ? "active" : ""}`}
              onClick={() => handleNavigate(l.key)}
            >
              {l.label}
              {/* Badge for appointment count */}
              {l.badge > 0 && <span className="nav-badge">{l.badge}</span>}
            </button>
          ))}

          {/* Auth section */}
          {!currentUser ? (
            /* Not logged in — show Login and Register */
            <div className="nav-auth-btns">
              {!isOnline && (
                <div className="badge badge-red" style={{ marginRight: 12, fontSize: '0.65rem' }}>
                  📡 OFFLINE
                </div>
              )}
              <button
                id="nav-login"
                className="btn btn-outline btn-sm"
                onClick={() => handleNavigate("login")}
              >
                Sign In
              </button>
              <button
                id="nav-register"
                className="btn btn-primary btn-sm"
                onClick={() => handleNavigate("register")}
              >
                Get Started
              </button>
            </div>
          ) : (
            /* Logged in — notification bell + user avatar dropdown */
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12 }}>
              {!isOnline && (
                <div className="badge badge-red" style={{ marginRight: 8, fontSize: '0.65rem' }}>
                  📡 OFFLINE
                </div>
              )}
              <NotificationBell />
              <div className="user-menu-wrap" ref={userMenuRef}>
              <button
                id="nav-user-menu"
                className="user-avatar-btn"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <div className="user-avatar">{initials}</div>
                <div className="user-avatar-info">
                  <span className="ua-name">{userProfile?.name?.split(" ")[0]}</span>
                  <span className="ua-role">{userProfile?.role}</span>
                </div>
                <span className="ua-chevron">▾</span>
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <div className="user-dropdown animate-fade-up">
                  <div className="ud-header">
                    <div className="ud-name">{userProfile?.name}</div>
                    <div className="ud-email">{currentUser.email}</div>
                    <span className={`badge ${
                      isAdmin ? "badge-blue" : isDoctor ? "badge-green" : "badge-blue"
                    }`} style={{ fontSize: "0.72rem" }}>
                      {userProfile?.role}
                    </span>
                  </div>
                  <div className="ud-links">
                    {isDoctor && (
                      <button onClick={() => { handleNavigate("doctor-dashboard"); setUserMenuOpen(false); }}>
                        📊 My Dashboard
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => { handleNavigate("admin"); setUserMenuOpen(false); }}>
                        🛡️ Admin Panel
                      </button>
                    )}
                    {!isDoctor && !isAdmin && (
                      <>
                        <button onClick={() => { handleNavigate("appointments"); setUserMenuOpen(false); }}>
                          📋 My Appointments
                        </button>
                        <button onClick={() => { handleNavigate("medical-reports"); setUserMenuOpen(false); }}>
                          🏥 Health Vault
                        </button>
                      </>
                    )}
                  </div>
                  <button className="ud-logout" onClick={handleLogout}>
                    🚪 Sign Out
                  </button>
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile hamburger menu */}
        <button
          id="nav-mobile-menu"
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className={menuOpen ? "open" : ""}></span>
          <span className={menuOpen ? "open" : ""}></span>
          <span className={menuOpen ? "open" : ""}></span>
        </button>
      </div>
    </nav>
  );
}
