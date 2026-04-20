// ============================================================
// MedicalReports Page — Patient EHR (Electronic Health Records)
// Patients can upload, view, and manage their medical documents
// Files are stored on Cloudinary, URLs saved in Data Connect DB
// ============================================================

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import FileUpload from "../components/FileUpload";
import { uploadMedicalReport, formatFileSize } from "../utils/cloudinary";
import { fetchPatientReports, addReport, deleteReport } from "../firebase/dataconnect";
import { toast } from "react-toastify";
import "./MedicalReports.css";

// Supported report types (for categorization display)
const REPORT_TYPES = [
  { id: "lab", label: "Lab Report", icon: "🧪" },
  { id: "scan", label: "Scan / X-Ray", icon: "🩻" },
  { id: "prescription", label: "Prescription", icon: "💊" },
  { id: "discharge", label: "Discharge Summary", icon: "🏥" },
  { id: "other", label: "Other Document", icon: "📄" },
];

export default function MedicalReports() {
  const { currentUser, userProfile } = useAuth();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedType, setSelectedType] = useState("lab");
  const [reportName, setReportName] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ─── Fetch reports from Firestore ────────────────────────
  const REPORTS_STORAGE_KEY = "medibook_reports";

  const loadLocalReports = () => {
    try {
      const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
      if (!stored) return [];
      
      const allReports = JSON.parse(stored);

      // Add URL to reports that don't have it (backward compatibility)
      return allReports.map(r => {
        if (!r.url && r.publicId) {
          const publicId = r.publicId;
          const patientUid = r.patientId;
          const isPdf = r.format === 'pdf';
          const resourceType = isPdf ? 'raw' : 'image';
          // Build user-specific Cloudinary path (no /v1 in URL)
          const fullPublicId = publicId.includes('/') ? publicId : `medibook/patients/${patientUid}/reports/${publicId}`;
          // Fix: ensure raw URL for PDFs instead of image
          r.url = `https://res.cloudinary.com/dlxky9s7w/${resourceType}/upload/${fullPublicId}`;
          // Fix legacy URLs that still have /image/upload/ for PDFs
          if (isPdf && r.url.includes('/image/upload/')) {
            r.url = r.url.replace('/image/upload/', '/raw/upload/');
          }
        }
        return r;
      }).filter(r => r.patientId === currentUser.uid);
    } catch (e) {
      return [];
    }
  };

   const saveLocalReports = (newReports) => {
     try {
       const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
       const existing = stored ? JSON.parse(stored) : [];
       // Remove any old reports for this user, then merge
       const filtered = existing.filter(r => r.patientId !== currentUser.uid);
       const merged = [...newReports, ...filtered];
       localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(merged));
     } catch (e) {}
   };

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await fetchPatientReports(currentUser.uid);
        if (data && data.length > 0) {
          setReports(data);
        } else {
          const localData = loadLocalReports();
          setReports(localData);
        }
      } catch (err) {
        const localData = loadLocalReports();
        setReports(localData);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [currentUser]);

  // ─── Handle new report upload via Cloudinary ──────────────
  const handleUploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadMedicalReport(
        file,
        {
          patientUid: currentUser.uid,
          appointmentId: `manual_${Date.now()}`,
        },
        (pct) => setUploadProgress(pct)
      );

      setUploadedFile(result);
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ─── Save report metadata to Firestore ─────────────────────
  const handleSaveReport = async () => {
    if (!uploadedFile) {
      toast.warning("Please upload a file first.");
      return;
    }

    try {
      const newReportData = {
        name: reportName.trim() || uploadedFile.originalName,
        type: selectedType,
        url: uploadedFile.url || (() => {
          const isPdf = uploadedFile.format === 'pdf';
          const resourceType = isPdf ? 'raw' : 'image';
          const publicId = uploadedFile.publicId;
          const fullPublicId = publicId.includes('/') ? publicId : `medibook/patients/${currentUser.uid}/reports/${publicId}`;
          return `https://res.cloudinary.com/dlxky9s7w/${resourceType}/upload/${fullPublicId}`;
        })(),
        publicId: uploadedFile.publicId,
        format: uploadedFile.format,
        size: uploadedFile.size,
        pages: uploadedFile.pages || 1,
        originalName: uploadedFile.originalName,
        patientId: currentUser.uid,
      };

      try {
        const result = await addReport({
          ...newReportData,
          patientId: currentUser.uid,
        });
        setReports((prev) => [result, ...prev]);
        // Also persist to local storage as backup
        saveLocalReports([result, ...reports]);
      } catch (dbErr) {
        // Fallback to local storage
        console.warn("[MedicalReports] DB save failed, saving locally:", dbErr.message);
        const localReport = {
          ...newReportData,
          id: crypto.randomUUID(),
        };
        setReports((prev) => [localReport, ...prev]);
        saveLocalReports([localReport, ...reports]);
      }
      
      setShowUpload(false);
      setUploadedFile(null);
      setReportName("");
      setSelectedType("lab");
      toast.success("✅ Report saved to your health vault!");
    } catch (err) {
      toast.error("Failed to save report: " + err.message);
    }
  };

  // ─── Remove a report from Firestore ────────────────────────
  const handleRemove = async (id) => {
    if (!window.confirm("Are you sure you want to remove this report?")) return;
    try {
      try {
        await deleteReport(id);
      } catch (dbErr) {
        console.warn("[MedicalReports] DB delete failed, removing locally:", dbErr.message);
      }
      setReports((prev) => prev.filter((r) => r.id !== id));
      // Also remove from local storage
      const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
      if (stored) {
        const all = JSON.parse(stored).filter(r => r.id !== id);
        localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(all));
      }
      toast.info("Report removed from vault.");
    } catch (err) {
      toast.error("Failed to remove report.");
    }
  };

  const getTypeInfo = (id) =>
    REPORT_TYPES.find((t) => t.id === id) || REPORT_TYPES[4];

  return (
    <div className="reports-page">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="reports-header">
        <div className="reports-header-inner">
          <div className="section-label">🏥 Health Vault</div>
          <h1 className="section-title">Medical Records</h1>
          <p className="section-subtitle">
            Securely store and access your medical reports, prescriptions, and scan results.
          </p>
        </div>
      </div>

      <div className="reports-inner">
        {/* Loading state indicator */}
        {loading && (
          <div className="card" style={{ padding: 40, textAlign: "center", marginBottom: 24 }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
            <p style={{ color: "var(--gray-500)" }}>Fetching your health vault...</p>
          </div>
        )}

        {/* ─── Stats Bar ───────────────────────────────── */}
        <div className="reports-stats">
          <div className="rstat card">
            <span className="rstat-icon">📁</span>
            <span className="rstat-val">{reports.length}</span>
            <span className="rstat-label">Documents</span>
          </div>
          {REPORT_TYPES.map((t) => {
            const count = reports.filter((r) => r.type === t.id).length;
            if (count === 0) return null;
            return (
              <div key={t.id} className="rstat card">
                <span className="rstat-icon">{t.icon}</span>
                <span className="rstat-val">{count}</span>
                <span className="rstat-label">{t.label}</span>
              </div>
            );
          })}
          <button
            id="add-report-btn"
            className="btn btn-primary"
            style={{ marginLeft: "auto" }}
            onClick={() => setShowUpload(true)}
          >
            + Upload Report
          </button>
        </div>

        {/* ─── Upload Form ─────────────────────────────── */}
        {showUpload && (
          <div className="card upload-form animate-fade-up">
            <div className="upload-form-header">
              <h3 className="step-title">📤 Add New Document</h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { setShowUpload(false); setUploadedFile(null); }}
              >
                Cancel
              </button>
            </div>

            {/* Report type selection */}
            <div className="form-group">
              <label className="form-label">Document Type</label>
              <div className="report-type-grid">
                {REPORT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    className={`report-type-chip ${selectedType === t.id ? "active" : ""}`}
                    onClick={() => setSelectedType(t.id)}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Report name */}
            <div className="form-group">
              <label className="form-label">Report Name (optional)</label>
              <input
                id="report-name"
                className="form-input"
                placeholder={`e.g. Blood Test - April 2025`}
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>

            {/* File upload zone */}
            <div className="form-group">
              <label className="form-label">Upload Document</label>
              <FileUpload
                folder={`medibook/patients/${currentUser?.uid}/reports`}
                publicId={`report_${currentUser?.uid}_${Date.now()}`}
                label="Drop your report here"
                hint="PDF, JPEG, or PNG · Max 10MB"
                onUpload={setUploadedFile}
              />
            </div>

            {uploadedFile && (
              <button
                id="save-report-btn"
                className="btn btn-primary"
                onClick={handleSaveReport}
              >
                ✅ Save to Health Vault
              </button>
            )}
          </div>
        )}

        {/* ─── Reports List ─────────────────────────────── */}
        {reports.length === 0 ? (
          <div className="reports-empty card">
            <div style={{ fontSize: "3rem" }}>🗂️</div>
            <h3>No Documents Yet</h3>
            <p>Upload your medical reports, prescriptions, and lab results to keep them organized.</p>
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              + Upload First Report
            </button>
          </div>
        ) : (
          <div className="reports-grid">
            {reports.map((report) => {
              const typeInfo = getTypeInfo(report.type);
              return (
                <div key={report.id} className="report-card card animate-fade-up">
                  <div className="rc-top">
                    <div className="rc-type-badge">
                      {typeInfo.icon} {typeInfo.label}
                    </div>
                    <button
                      className="rc-remove"
                      onClick={() => handleRemove(report.id)}
                      title="Remove document"
                    >
                      ×
                    </button>
                  </div>

                  <div className="rc-icon">
                    {report.format === "pdf" ? "📄" : "🖼️"}
                  </div>

                  <div className="rc-name">{report.name}</div>
                  <div className="rc-meta">
                    {report.size}
                    {report.pages > 1 ? ` · ${report.pages} pages` : ""}
                    {" · "}{report.uploadedAt}
                  </div>

                  <div className="rc-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        try {
                          const response = await fetch(report.url);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = report.originalName || report.name || 'document';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          window.open(report.url, '_blank');
                        }
                      }}
                    >
                      📥 Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
