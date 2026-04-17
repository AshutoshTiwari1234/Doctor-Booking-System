import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ page, appointmentCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentPage = () => {
    const path = location.pathname.replace("/", "");
    if (!path) return "home";
    if (path === "doctors") return "doctors";
    if (path === "book") return "book";
    if (path === "appointments") return "appointments";
    return "home";
  };

  const handleNavigate = (p) => {
    navigate(p === "home" ? "/" : "/" + p);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { key: "home", label: "Home" },
    { key: "doctors", label: "Find Doctors" },
    { key: "appointments", label: "My Appointments" },
  ];

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-inner">
        <div className="navbar-logo" onClick={() => handleNavigate("home")}>
          <div className="logo-icon">
            <span>+</span>
          </div>
          <div className="logo-text">
            <span className="logo-main">DocBridge</span>
            <span className="logo-sub">Healthcare</span>
          </div>
        </div>

        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          {links.map((l) => (
            <button
              key={l.key}
              className={`nav-link ${currentPage() === l.key ? "active" : ""}`}
              onClick={() => { handleNavigate(l.key); setMenuOpen(false); }}
            >
              {l.label}
              {l.key === "appointments" && appointmentCount > 0 && (
                <span className="nav-badge">{appointmentCount}</span>
              )}
            </button>
          ))}
          <button className="btn btn-primary btn-sm nav-cta" onClick={() => { handleNavigate("doctors"); setMenuOpen(false); }}>
            Book Now
          </button>
        </div>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <span className={menuOpen ? "open" : ""}></span>
          <span className={menuOpen ? "open" : ""}></span>
          <span className={menuOpen ? "open" : ""}></span>
        </button>
      </div>
    </nav>
  );
}
