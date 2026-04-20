// ============================================================
// SymptomChecker Component — AI-style Symptom → Specialty Mapper
// Rule-based client-side system (no external API required)
// Helps patients identify which specialist to see
// ============================================================

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SymptomChecker.css";

// ─── Symptom → Specialty Mapping Database ────────────────────────────────────
// Maps common symptoms to medical specialties with confidence weights
const SYMPTOM_DATABASE = {
  // Cardiology
  "chest pain": { specialty: "Cardiologist", icon: "❤️", confidence: 95 },
  "heart palpitations": { specialty: "Cardiologist", icon: "❤️", confidence: 90 },
  "shortness of breath": { specialty: "Cardiologist", icon: "❤️", confidence: 80 },
  "high blood pressure": { specialty: "Cardiologist", icon: "❤️", confidence: 85 },
  "irregular heartbeat": { specialty: "Cardiologist", icon: "❤️", confidence: 92 },
  "swollen ankles": { specialty: "Cardiologist", icon: "❤️", confidence: 70 },

  // Dermatology
  "skin rash": { specialty: "Dermatologist", icon: "🔬", confidence: 90 },
  "acne": { specialty: "Dermatologist", icon: "🔬", confidence: 95 },
  "hair loss": { specialty: "Dermatologist", icon: "🔬", confidence: 88 },
  "itching": { specialty: "Dermatologist", icon: "🔬", confidence: 80 },
  "eczema": { specialty: "Dermatologist", icon: "🔬", confidence: 95 },
  "psoriasis": { specialty: "Dermatologist", icon: "🔬", confidence: 95 },
  "skin discoloration": { specialty: "Dermatologist", icon: "🔬", confidence: 85 },
  "moles": { specialty: "Dermatologist", icon: "🔬", confidence: 88 },

  // Neurology
  "headache": { specialty: "Neurologist", icon: "🧠", confidence: 75 },
  "migraine": { specialty: "Neurologist", icon: "🧠", confidence: 92 },
  "dizziness": { specialty: "Neurologist", icon: "🧠", confidence: 78 },
  "numbness": { specialty: "Neurologist", icon: "🧠", confidence: 85 },
  "memory loss": { specialty: "Neurologist", icon: "🧠", confidence: 88 },
  "seizures": { specialty: "Neurologist", icon: "🧠", confidence: 96 },
  "tremors": { specialty: "Neurologist", icon: "🧠", confidence: 90 },
  "paralysis": { specialty: "Neurologist", icon: "🧠", confidence: 95 },

  // Orthopedics
  "joint pain": { specialty: "Orthopedic Surgeon", icon: "🦴", confidence: 88 },
  "back pain": { specialty: "Orthopedic Surgeon", icon: "🦴", confidence: 85 },
  "knee pain": { specialty: "Orthopedic Surgeon", icon: "🦴", confidence: 90 },
  "fracture": { specialty: "Orthopedic Surgeon", icon: "🦴", confidence: 96 },
  "muscle pain": { specialty: "Orthopedic Surgeon", icon: "🦴", confidence: 80 },
  "arthritis": { specialty: "Orthopedic Surgeon", icon: "🦴", confidence: 88 },
  "sports injury": { specialty: "Orthopedic Surgeon", icon: "🦴", confidence: 92 },

  // Gynecology
  "menstrual irregularity": { specialty: "Gynecologist", icon: "🌸", confidence: 95 },
  "pelvic pain": { specialty: "Gynecologist", icon: "🌸", confidence: 90 },
  "pregnancy": { specialty: "Gynecologist", icon: "🌸", confidence: 98 },
  "vaginal discharge": { specialty: "Gynecologist", icon: "🌸", confidence: 92 },
  "fertility issues": { specialty: "Gynecologist", icon: "🌸", confidence: 95 },

  // Pediatrics
  "fever in child": { specialty: "Pediatrician", icon: "👶", confidence: 90 },
  "child development": { specialty: "Pediatrician", icon: "👶", confidence: 88 },
  "vaccination": { specialty: "Pediatrician", icon: "👶", confidence: 96 },
  "child rash": { specialty: "Pediatrician", icon: "👶", confidence: 85 },
  "childhood illness": { specialty: "Pediatrician", icon: "👶", confidence: 88 },

  // General
  "fever": { specialty: "General Physician", icon: "🌡️", confidence: 75 },
  "cough": { specialty: "General Physician", icon: "🌡️", confidence: 72 },
  "cold": { specialty: "General Physician", icon: "🌡️", confidence: 80 },
  "fatigue": { specialty: "General Physician", icon: "🌡️", confidence: 70 },
  "diabetes": { specialty: "General Physician", icon: "🌡️", confidence: 85 },
  "thyroid": { specialty: "General Physician", icon: "🌡️", confidence: 85 },

  // ENT
  "ear pain": { specialty: "ENT Specialist", icon: "👂", confidence: 88 },
  "hearing loss": { specialty: "ENT Specialist", icon: "👂", confidence: 92 },
  "sore throat": { specialty: "ENT Specialist", icon: "👂", confidence: 85 },
  "nasal congestion": { specialty: "ENT Specialist", icon: "👂", confidence: 82 },
  "sinusitis": { specialty: "ENT Specialist", icon: "👂", confidence: 90 },
  "tonsillitis": { specialty: "ENT Specialist", icon: "👂", confidence: 92 },

  // Ophthalmology
  "eye pain": { specialty: "Ophthalmologist", icon: "👁️", confidence: 90 },
  "blurred vision": { specialty: "Ophthalmologist", icon: "👁️", confidence: 88 },
  "red eyes": { specialty: "Ophthalmologist", icon: "👁️", confidence: 85 },
  "glasses": { specialty: "Ophthalmologist", icon: "👁️", confidence: 90 },
};

// Popular quick-pick symptoms shown as chips
const POPULAR_SYMPTOMS = [
  "headache", "chest pain", "skin rash", "joint pain", "fever",
  "back pain", "acne", "cough", "dizziness", "eye pain",
];

export default function SymptomChecker() {
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [result, setResult] = useState(null);
  const [checked, setChecked] = useState(false);

  // ─── Add a symptom to the selected list ──────────────────
  const addSymptom = (symptom) => {
    const s = symptom.trim().toLowerCase();
    if (s && !selectedSymptoms.includes(s)) {
      setSelectedSymptoms((prev) => [...prev, s]);
    }
    setInput("");
    setChecked(false);
    setResult(null);
  };

  // ─── Remove a symptom chip ────────────────────────────────
  const removeSymptom = (symptom) => {
    setSelectedSymptoms((prev) => prev.filter((s) => s !== symptom));
    setChecked(false);
    setResult(null);
  };

  // ─── Analyze symptoms and determine best specialty ────────
  const checkSymptoms = () => {
    if (selectedSymptoms.length === 0) return;

    // Score each specialty based on matched symptoms
    const scores = {};
    const specialtyMatches = {}; // Track which symptoms match each specialty

    for (const symptom of selectedSymptoms) {
      // Try direct match
      const match = SYMPTOM_DATABASE[symptom];
      if (match) {
        scores[match.specialty] = (scores[match.specialty] || 0) + match.confidence;
        if (!specialtyMatches[match.specialty]) {
          specialtyMatches[match.specialty] = [];
        }
        specialtyMatches[match.specialty].push({ symptom, confidence: match.confidence });
      } else {
        // Partial match — search for any symptom that contains the input
        for (const [key, val] of Object.entries(SYMPTOM_DATABASE)) {
          if (key.includes(symptom) || symptom.includes(key.split(" ")[0])) {
            scores[val.specialty] = (scores[val.specialty] || 0) + val.confidence * 0.7;
            if (!specialtyMatches[val.specialty]) {
              specialtyMatches[val.specialty] = [];
            }
            specialtyMatches[val.specialty].push({ symptom, confidence: val.confidence * 0.7 });
            break;
          }
        }
      }
    }

    if (Object.keys(scores).length === 0) {
      setResult({ notFound: true });
    } else {
      // Sort specialties by total score
      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      const topSpecialty = sorted[0][0];
      const topMatches = specialtyMatches[topSpecialty] || [];
      
      // Calculate confidence as average of matched symptoms for top specialty
      const avgConfidence = topMatches.length > 0 
        ? Math.round(topMatches.reduce((sum, m) => sum + m.confidence, 0) / topMatches.length)
        : 0;
      
      // Get alternatives (unique, excluding top specialty)
      const alternatives = sorted
        .slice(1, 4)
        .map(([s]) => s)
        .filter((s, idx, arr) => arr.indexOf(s) === idx); // Remove duplicates

      setResult({
        specialty: topSpecialty,
        icon: topMatches[0]?.specialty ? 
          Object.values(SYMPTOM_DATABASE).find(v => v.specialty === topSpecialty)?.icon || "🏥" 
          : "🏥",
        confidence: avgConfidence,
        alternatives: alternatives,
        matchedSymptoms: topMatches.map((m) => m.symptom),
      });
    }
    setChecked(true);
  };

  return (
    <div className="symptom-checker">
      <div className="sc-header">
        <div className="sc-icon">🧠</div>
        <div>
          <h3 className="sc-title">Symptom Checker</h3>
          <p className="sc-sub">Tell us your symptoms and we'll recommend the right specialist</p>
        </div>
      </div>

      {/* Input */}
      <div className="sc-input-row">
        <input
          className="form-input"
          placeholder="Type a symptom (e.g. 'headache', 'chest pain')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) addSymptom(input);
          }}
        />
        <button
          className="btn btn-outline btn-sm"
          onClick={() => input.trim() && addSymptom(input)}
          disabled={!input.trim()}
        >
          + Add
        </button>
      </div>

      {/* Popular symptoms quick-pick */}
      <div className="sc-quick-label">⚡ Popular symptoms:</div>
      <div className="sc-quick-chips">
        {POPULAR_SYMPTOMS.map((s) => (
          <button
            key={s}
            className={`sc-quick-chip ${selectedSymptoms.includes(s) ? "selected" : ""}`}
            onClick={() => addSymptom(s)}
            disabled={selectedSymptoms.includes(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Selected symptoms */}
      {selectedSymptoms.length > 0 && (
        <div className="sc-selected">
          <div className="sc-selected-label">Your symptoms:</div>
          <div className="sc-chips">
            {selectedSymptoms.map((s) => (
              <div key={s} className="sc-chip">
                {s}
                <button className="sc-chip-remove" onClick={() => removeSymptom(s)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Check button */}
      <button
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={checkSymptoms}
        disabled={selectedSymptoms.length === 0}
      >
        🔍 Find My Specialist
      </button>

      {/* Result */}
      {checked && result && (
        <div className="sc-result animate-fade-up">
          {result.notFound ? (
            <div className="sc-not-found">
              <span>🤔</span>
              <p>We couldn't identify a specialist for these symptoms. Please consult a <strong>General Physician</strong> first.</p>
              <button className="btn btn-outline btn-sm" onClick={() => navigate("/doctors")}>
                Find General Physician →
              </button>
            </div>
          ) : (
            <>
              <div className="sc-result-top">
                <div className="sc-result-icon">{result.icon}</div>
                <div>
                  <div className="sc-result-label">Recommended Specialist</div>
                  <div className="sc-result-specialty">{result.specialty}</div>
                  <div className="sc-confidence">
                    <div className="sc-conf-bar" style={{ width: `${result.confidence}%` }}></div>
                    <span>{result.confidence}% match confidence</span>
                  </div>
                </div>
              </div>
              {result.alternatives.length > 0 && (
                <div className="sc-alternatives">
                  <span>Also consider:</span>
                  {result.alternatives.map((a) => (
                    <span key={a} className="badge badge-blue" style={{ fontSize: "0.75rem" }}>{a}</span>
                  ))}
                </div>
              )}
              <button
                className="btn btn-primary btn-sm"
                style={{ alignSelf: "flex-start", marginTop: 8 }}
                onClick={() => navigate("/doctors", { state: { filterSpecialty: result.specialty } })}
              >
                Find {result.specialty} →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
