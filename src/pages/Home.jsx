import React from "react";
import { useNavigate } from "react-router-dom";
import { doctors } from "../data/doctors";
import SymptomChecker from "../components/SymptomChecker";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  const handleNavigate = (p, data = null) => {
    if (p === "book" && data) {
      navigate("/book", { state: { doctor: data } });
    } else {
      navigate(p === "home" ? "/" : "/" + p);
    }
    window.scrollTo(0, 0);
  };

  const stats = [
  { value: "50+", label: "Specialist Doctors" },
  { value: "10k+", label: "Happy Patients" },
  { value: "15+", label: "Specialties" },
  { value: "4.9★", label: "Average Rating" },
];

const features = [
  {
    icon: "🔍",
    title: "Find the Right Doctor",
    desc: "Search by specialty, location, or name. Read reviews and compare profiles to make the best choice.",
  },
  {
    icon: "📅",
    title: "Book Instantly",
    desc: "View real-time availability and book your preferred slot within seconds. Instant confirmation.",
  },
  {
    icon: "💬",
    title: "Share Your Concerns",
    desc: "Describe your symptoms and medical history before the appointment so your doctor is prepared.",
  },
  {
    icon: "🔔",
    title: "Appointment Reminders",
    desc: "Never miss an appointment. Manage, reschedule or cancel with just a tap from your dashboard.",
  },
];

const specialtiesGrid = [
  { icon: "❤️", name: "Cardiology", count: "8 Doctors" },
  { icon: "🧠", name: "Neurology", count: "5 Doctors" },
  { icon: "🦴", name: "Orthopedics", count: "7 Doctors" },
  { icon: "🌸", name: "Gynecology", count: "6 Doctors" },
  { icon: "👶", name: "Pediatrics", count: "9 Doctors" },
  { icon: "🔬", name: "Dermatology", count: "5 Doctors" },
  { icon: "👁️", name: "Ophthalmology", count: "4 Doctors" },
  { icon: "🦷", name: "Dentistry", count: "6 Doctors" },
];

const topDoctors = doctors.slice(0, 3);

  return (
    <div className="home">
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        <div className="hero-inner">
          <div className="hero-content animate-fade-up">
            <div className="section-label" style={{ animationDelay: "0.1s" }}>
              🏥 Trusted Healthcare Platform
            </div>
            <h1 className="hero-title">
              Your Health,<br />
              <span className="hero-title-accent">Our Priority</span>
            </h1>
            <p className="hero-subtitle">
              Connect with India's top specialists in minutes. Book appointments, manage your health journey, and get expert care — all in one place.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => handleNavigate("doctors")}>
                Find a Doctor →
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => handleNavigate("appointments")}>
                My Appointments
              </button>
            </div>
            <div className="hero-trust">
              <div className="trust-avatars">
                {["👨", "👩", "🧑", "👴"].map((e, i) => (
                  <span key={i} className="trust-avatar">{e}</span>
                ))}
              </div>
              <p className="trust-text"><strong>10,000+</strong> patients trust us every month</p>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card-main card">
              <div className="hc-header">
                <div className="hc-avatar">👩‍⚕️</div>
                <div>
                  <div className="hc-name">Dr. Priya Sharma</div>
                  <div className="hc-spec">Cardiologist • Apollo Hospital</div>
                </div>
                <div className="badge badge-green">Available</div>
              </div>
              <div className="hc-slots">
                <div className="hc-slot-label">Available Today</div>
                <div className="hc-slot-row">
                  {["2:00 PM", "3:00 PM", "4:30 PM"].map((s) => (
                    <div key={s} className="hc-slot">{s}</div>
                  ))}
                </div>
              </div>
              <div className="hc-rating">
                <span className="star">★★★★★</span>
                <span className="hc-rating-text">4.9 (312 reviews)</span>
              </div>
            </div>
            <div className="hero-card-float card fc-1">
              <span>✅</span>
              <span>Appointment Confirmed!</span>
            </div>
            <div className="hero-card-float card fc-2">
              <span>⏱️</span>
              <span>Est. wait: 5 mins</span>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-bar">
          {stats.map((s, i) => (
            <div className="stat-item" key={i}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SPECIALTIES */}
      <section className="section">
        <div className="section-inner">
          <div className="text-center mb-32">
            <div className="section-label" style={{ display: "inline-flex" }}>🩺 Browse by Category</div>
            <h2 className="section-title">Find Your Specialist</h2>
            <p className="section-subtitle" style={{ margin: "0 auto" }}>
              Choose from our wide range of medical specialties and connect with experts in minutes.
            </p>
          </div>
          <div className="specialties-grid">
            {specialtiesGrid.map((sp, i) => (
              <div
                className="specialty-card card"
                key={i}
onClick={() => handleNavigate("doctors")}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="sp-icon">{sp.icon}</div>
                <div className="sp-name">{sp.name}</div>
                <div className="sp-count">{sp.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SYMPTOM CHECKER — AI-powered specialty recommender */}
      <section className="section section-alt">
        <div className="section-inner">
          <div className="text-center mb-32">
            <div className="section-label" style={{ display: "inline-flex" }}>🧠 Smart Feature</div>
            <h2 className="section-title">Not Sure Which Doctor to See?</h2>
            <p className="section-subtitle" style={{ margin: "0 auto" }}>
              Describe your symptoms and our intelligent checker will recommend the right specialist for you.
            </p>
          </div>
          <div style={{ maxWidth: 660, margin: "0 auto" }}>
            <SymptomChecker />
          </div>
        </div>
      </section>

      {/* TOP DOCTORS */}
      <section className="section section-alt">
        <div className="section-inner">
          <div className="section-row-header">
            <div>
              <div className="section-label">⭐ Top Rated</div>
              <h2 className="section-title">Meet Our Doctors</h2>
            </div>
            <button className="btn btn-outline" onClick={() => handleNavigate("doctors")}>
              View All →
            </button>
          </div>
          <div className="doctors-preview-grid">
            {topDoctors.map((doc, i) => (
              <div
                className="doc-preview-card card"
                key={doc.id}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="dpc-avatar" style={{ background: doc.color }}>
                  {doc.avatar}
                </div>
                <div className="dpc-info">
                  <h3 className="dpc-name">{doc.name}</h3>
                  <div className="badge badge-blue">{doc.specialty}</div>
                  <div className="dpc-meta">
                    <span>🏥 {doc.hospital}</span>
                    <span>⏱️ {doc.experience}</span>
                  </div>
                  <div className="dpc-footer">
                    <div>
                      <div className="stars">
                        {"★★★★★".split("").map((s, si) => (
                          <span key={si} className={si < Math.floor(doc.rating) ? "star" : "star-empty"}>{s}</span>
                        ))}
                      </div>
                      <span className="dpc-reviews">({doc.reviews})</span>
                    </div>
                    <div className="dpc-fee">₹{doc.fee}</div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => handleNavigate("book", doc)}
                  >
                    Book Appointment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="section-inner">
          <div className="text-center mb-32">
            <div className="section-label" style={{ display: "inline-flex" }}>📋 Simple Process</div>
            <h2 className="section-title">How MediBook Works</h2>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div className="feature-card card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="feature-step">0{i + 1}</div>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Ready to take care of your health?</h2>
          <p className="cta-sub">Book your appointment today and connect with top specialists near you.</p>
          <button className="btn btn-ghost btn-lg" onClick={() => navigate("doctors")}>
            Book Appointment Now →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <div className="logo-icon" style={{ width: 36, height: 36, fontSize: "1.1rem" }}>+</div>
            <span className="logo-main" style={{ fontSize: "1.1rem" }}>MediBook</span>
          </div>
          <p className="footer-copy">© 2025 DocBridge Healthcare. Built with ❤️ for better health.</p>
        </div>
      </footer>
    </div>
  );
}
