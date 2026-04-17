import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doctors, specialties } from "../data/doctors";
import "./Doctors.css";

export default function Doctors() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All Specialties");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("rating");
  const [expandedId, setExpandedId] = useState(null);

  const handleNavigate = (p, data = null) => {
    if (p === "book" && data) {
      navigate("/book", { state: { doctor: data } });
    } else {
      navigate("/" + p);
    }
    window.scrollTo(0, 0);
  };

  const filtered = doctors
    .filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.specialty.toLowerCase().includes(search.toLowerCase()) ||
        d.hospital.toLowerCase().includes(search.toLowerCase()) ||
        d.location.toLowerCase().includes(search.toLowerCase());
      const matchSpecialty = specialty === "All Specialties" || d.specialty === specialty;
      const matchAvail = !availableOnly || d.available;
      return matchSearch && matchSpecialty && matchAvail;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "fee_asc") return a.fee - b.fee;
      if (sortBy === "fee_desc") return b.fee - a.fee;
      if (sortBy === "experience") return parseInt(b.experience) - parseInt(a.experience);
      return 0;
    });

  return (
    <div className="doctors-page">
      {/* PAGE HEADER */}
      <div className="doctors-header">
        <div className="doctors-header-inner">
          <div className="section-label">🔍 Search & Book</div>
          <h1 className="section-title">Find Your Doctor</h1>
          <p className="section-subtitle">
            Browse through our verified specialists and book your appointment instantly.
          </p>
        </div>
      </div>

      <div className="doctors-layout">
        {/* FILTERS SIDEBAR */}
        <aside className="filters-panel card">
          <h3 className="filter-heading">Filters</h3>

          <div className="filter-group">
            <label className="form-label">🔍 Search</label>
            <input
              className="form-input"
              placeholder="Name, specialty, hospital..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="form-label">🩺 Specialty</label>
            <select
              className="form-select"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            >
              {specialties.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="form-label">📊 Sort By</label>
            <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="rating">Highest Rated</option>
              <option value="fee_asc">Fee: Low to High</option>
              <option value="fee_desc">Fee: High to Low</option>
              <option value="experience">Experience</option>
            </select>
          </div>

          <div className="filter-toggle">
            <label className="toggle-label">
              <span>Available Today Only</span>
              <div
                className={`toggle-switch ${availableOnly ? "on" : ""}`}
                onClick={() => setAvailableOnly(!availableOnly)}
              >
                <div className="toggle-thumb"></div>
              </div>
            </label>
          </div>

          <div className="filter-results-count">
            <span className="badge badge-blue">{filtered.length} doctors found</span>
          </div>
        </aside>

        {/* DOCTOR LIST */}
        <div className="doctor-list">
          {filtered.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-icon">🔍</div>
              <h3>No doctors found</h3>
              <p>Try adjusting your filters or search term.</p>
              <button className="btn btn-outline" onClick={() => { setSearch(""); setSpecialty("All Specialties"); setAvailableOnly(false); }}>
                Clear Filters
              </button>
            </div>
          ) : (
            filtered.map((doc, i) => (
              <div
                className="doctor-card card animate-fade-up"
                key={doc.id}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="dc-main">
                  <div className="dc-avatar" style={{ background: doc.color }}>
                    {doc.avatar}
                    <div className={`dc-status ${doc.available ? "online" : "offline"}`}></div>
                  </div>
                  <div className="dc-info">
                    <div className="dc-top">
                      <div>
                        <h2 className="dc-name">{doc.name}</h2>
                        <div className="dc-badges">
                          <span className="badge badge-blue">{doc.specialty}</span>
                          <span className="badge badge-gray">📍 {doc.location}</span>
                          {doc.available ? (
                            <span className="badge badge-green">● Available</span>
                          ) : (
                            <span className="badge badge-red">● Unavailable</span>
                          )}
                        </div>
                      </div>
                      <div className="dc-fee-block">
                        <div className="dc-fee">₹{doc.fee}</div>
                        <div className="dc-fee-label">per visit</div>
                      </div>
                    </div>

                    <div className="dc-details">
                      <span>🏥 {doc.hospital}</span>
                      <span>⏳ {doc.experience} exp.</span>
                      <span>🌐 {doc.languages.join(", ")}</span>
                    </div>

                    <div className="dc-rating">
                      <div className="stars">
                        {"★★★★★".split("").map((s, si) => (
                          <span key={si} className={si < Math.floor(doc.rating) ? "star" : "star-empty"}>{s}</span>
                        ))}
                      </div>
                      <span className="dc-rating-val">{doc.rating}</span>
                      <span className="dc-reviews">({doc.reviews} reviews)</span>
                    </div>

                    <div className="dc-slot-info">
                      <span className="dc-next-slot">🗓️ Next: {doc.nextSlot}</span>
                    </div>
                  </div>
                </div>

                {/* EXPANDED ABOUT */}
                {expandedId === doc.id && (
                  <div className="dc-expanded">
                    <div className="divider"></div>
                    <div className="dc-about">
                      <h4>About</h4>
                      <p>{doc.about}</p>
                      <div className="dc-edu">🎓 {doc.education}</div>
                    </div>
                  </div>
                )}

                <div className="dc-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                  >
                    {expandedId === doc.id ? "Less Info ↑" : "View Profile ↓"}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleNavigate("book", doc)}
                  >
                    Book Appointment →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
