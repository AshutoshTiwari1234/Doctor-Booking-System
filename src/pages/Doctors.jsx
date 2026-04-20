// ============================================================
// Doctors Page — Search, filter and browse available doctors
// Fix 6: Loads from localStorage (merged with seed data)
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doctors as seedDoctors, specialties } from "../data/doctors";
import { useAuth } from "../context/AuthContext";
import StarRating from "../components/StarRating";
import SymptomChecker from "../components/SymptomChecker";
import "./Doctors.css";

const DOCTORS_KEY = "medibook_doctors";

// Merge seed doctors with any admin-added doctors from localStorage
const loadDoctors = () => {
  try {
    const stored = localStorage.getItem(DOCTORS_KEY);
    if (stored) return JSON.parse(stored);
    // First run: persist seed data
    const initial = seedDoctors.map((d) => ({ ...d, uid: String(d.id), role: "doctor", approved: true }));
    localStorage.setItem(DOCTORS_KEY, JSON.stringify(initial));
    return initial;
  } catch { return seedDoctors; }
};

// Locations derived from doctor data for filter dropdown
const LOCATIONS = ["All Locations", "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Noida", "Chennai", "Kolkata"];

export default function Doctors() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isDoctor, isAdmin } = useAuth();

  const [allDoctors, setAllDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSymptomChecker, setShowSymptomChecker] = useState(false);

  // ─── Search & Filter state ────────────────────────────────
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState(
    location.state?.filterSpecialty || "All Specialties"
  );
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [minRating, setMinRating] = useState(0);
  const [maxFee, setMaxFee] = useState(5000);
  const [sortBy, setSortBy] = useState("rating"); // "rating" | "fee-asc" | "fee-desc"

  // Fix 6: Load from localStorage (seed + admin-added doctors)
  useEffect(() => {
    setAllDoctors(loadDoctors());
    setLoading(false);
  }, []);

  // ─── Apply filters and search ─────────────────────────────
  const filtered = allDoctors
    .filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        d.name?.toLowerCase().includes(q) ||
        d.specialty?.toLowerCase().includes(q) ||
        d.hospital?.toLowerCase().includes(q) ||
        d.location?.toLowerCase().includes(q);

      const matchSpecialty =
        selectedSpecialty === "All Specialties" || d.specialty === selectedSpecialty;

      const matchLocation =
        selectedLocation === "All Locations" ||
        d.location?.toLowerCase().includes(selectedLocation.toLowerCase());

      const matchRating = (d.rating || 0) >= minRating;
      const matchFee = (d.fee || 0) <= maxFee;

      return matchSearch && matchSpecialty && matchLocation && matchRating && matchFee;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "fee-asc") return (a.fee || 0) - (b.fee || 0);
      if (sortBy === "fee-desc") return (b.fee || 0) - (a.fee || 0);
      return 0;
    });

  // ─── Reset all filters ────────────────────────────────────
  const resetFilters = () => {
    setSearch("");
    setSelectedSpecialty("All Specialties");
    setSelectedLocation("All Locations");
    setMinRating(0);
    setMaxFee(5000);
    setSortBy("rating");
  };

  // ─── Navigate to booking (require login for patients) ─────
  const handleBook = (doctor) => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (isDoctor || isAdmin) return; // Doctors/admins can't book
    navigate("/book", { state: { doctor } });
    window.scrollTo(0, 0);
  };

  return (
    <div className="doctors-page">
      {/* ─── Page Header ─────────────────────────────────── */}
      <div className="doctors-header">
        <div className="doctors-header-inner">
          <div className="section-label">🩺 Find Your Specialist</div>
          <h1 className="section-title">Our Doctors</h1>
          <p className="section-subtitle">Browse our network of verified, experienced specialists.</p>

          {/* ─── Search Bar ─────────────────────────────── */}
          <div className="search-bar-wrap">
            <div className="search-bar card">
              <span className="search-icon">🔍</span>
              <input
                id="doctor-search"
                className="search-input"
                placeholder="Search by name, specialty, hospital..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch("")}>×</button>
              )}
            </div>
            <button
              id="symptom-checker-toggle"
              className="btn btn-outline btn-sm"
              onClick={() => setShowSymptomChecker((v) => !v)}
            >
              {showSymptomChecker ? "✕ Close Checker" : "🧠 Symptom Checker"}
            </button>
          </div>

          {/* Symptom Checker toggle */}
          {showSymptomChecker && (
            <div style={{ maxWidth: 660, margin: "16px auto 0" }}>
              <SymptomChecker />
            </div>
          )}
        </div>
      </div>

      <div className="doctors-inner">
        {/* ─── Filters Sidebar Section ─────────────────── */}
        <div className="doctors-layout">
          <aside className="filters-panel card">
            <div className="filter-header">
              <h3 className="filter-title">Filters</h3>
              <button className="filter-reset-btn" onClick={resetFilters}>Reset All</button>
            </div>

            {/* Specialty filter */}
            <div className="filter-group">
              <label className="filter-label">🩺 Specialization</label>
              <select
                id="filter-specialty"
                className="form-select"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                {specialties.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Location filter */}
            <div className="filter-group">
              <label className="filter-label">📍 Location</label>
              <select
                id="filter-location"
                className="form-select"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>

            {/* Minimum rating filter */}
            <div className="filter-group">
              <label className="filter-label">⭐ Min Rating: {minRating > 0 ? minRating.toFixed(1) : "Any"}</label>
              <div className="rating-filter-row">
                {[0, 4.0, 4.5, 4.8].map((r) => (
                  <button
                    key={r}
                    className={`rating-chip ${minRating === r ? "active" : ""}`}
                    onClick={() => setMinRating(r)}
                  >
                    {r === 0 ? "Any" : `${r}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Max consultation fee filter */}
            <div className="filter-group">
              <label className="filter-label">💰 Max Fee: ₹{maxFee.toLocaleString()}</label>
              <input
                id="filter-fee"
                type="range"
                min={200}
                max={5000}
                step={100}
                value={maxFee}
                onChange={(e) => setMaxFee(Number(e.target.value))}
                className="fee-slider"
              />
              <div className="fee-range-labels">
                <span>₹200</span>
                <span>₹5000</span>
              </div>
            </div>

            {/* Sort */}
            <div className="filter-group">
              <label className="filter-label">↕️ Sort By</label>
              <select
                id="filter-sort"
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="rating">Highest Rated</option>
                <option value="fee-asc">Fee: Low to High</option>
                <option value="fee-desc">Fee: High to Low</option>
              </select>
            </div>
          </aside>

          {/* ─── Doctors Grid ────────────────────────── */}
          <div className="doctors-list-area">
            {/* Results count */}
            <div className="results-bar">
              <span className="results-count">
                {loading ? "Loading..." : `${filtered.length} doctor${filtered.length !== 1 ? "s" : ""} found`}
              </span>
              {(search || selectedSpecialty !== "All Specialties" || selectedLocation !== "All Locations" || minRating > 0) && (
                <button className="filter-reset-btn" onClick={resetFilters}>Clear filters</button>
              )}
            </div>

            {loading ? (
              /* Skeleton loading cards */
              <div className="doctors-grid">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="doc-card-skeleton card"></div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="doctors-empty card">
                <div style={{ fontSize: "2.5rem" }}>🔍</div>
                <h3>No doctors found</h3>
                <p>Try adjusting your search or filters.</p>
                <button className="btn btn-outline" onClick={resetFilters}>Reset Filters</button>
              </div>
            ) : (
              <div className="doctors-grid">
                {filtered.map((doc, i) => (
                  <div
                    key={doc.id || doc.uid}
                    className="doctor-card card animate-fade-up"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    {/* Availability badge */}
                    <div className={`availability-dot ${doc.available ? "available" : "unavailable"}`}>
                      <span></span>
                      {doc.available ? "Available Today" : "Next Available: " + (doc.nextSlot || "Check slots")}
                    </div>

                    {/* Doctor avatar */}
                    <div className="dc-avatar-wrap">
                      <div className="dc-avatar" style={{ background: doc.color || "#dbeafe" }}>
                        {doc.avatar}
                      </div>
                    </div>

                    {/* Info */}
                    <h3 className="dc-name">{doc.name}</h3>
                    <div className="badge badge-blue" style={{ marginBottom: 8 }}>{doc.specialty}</div>

                    {/* Rating */}
                    <div className="dc-rating-row">
                      <StarRating value={doc.rating || 0} size="sm" />
                      <span className="dc-rating-txt">
                        {(doc.rating || 0).toFixed(1)} ({doc.reviews || 0} reviews)
                      </span>
                    </div>

                    {/* Details */}
                    <div className="dc-details">
                      <div className="dc-detail"><span>🏥</span>{doc.hospital}</div>
                      <div className="dc-detail"><span>📍</span>{doc.location}</div>
                      <div className="dc-detail"><span>⏳</span>{doc.experience}</div>
                      {doc.languages?.length > 0 && (
                        <div className="dc-detail">
                          <span>🗣️</span>{doc.languages.slice(0, 3).join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Fee and Book button */}
                    <div className="dc-footer">
                      <div className="dc-fee-block">
                        <span className="dc-fee-label">Consultation</span>
                        <span className="dc-fee">₹{doc.fee}</span>
                      </div>
                      {!isDoctor && !isAdmin && (
                        <button
                          id={`book-btn-${doc.id || doc.uid}`}
                          className="btn btn-primary btn-sm"
                          onClick={() => handleBook(doc)}
                        >
                          Book →
                        </button>
                      )}
                    </div>

                    {/* About (truncated) */}
                    {doc.about && (
                      <p className="dc-about">{doc.about.slice(0, 100)}...</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
