// ============================================================
// FileUpload Component — Drag-and-drop file uploader
// Used in: Medical report upload, Prescription upload
// Supports: PDF, JPEG, PNG
// Features: drag-over highlight, progress bar, file preview,
//           download link for existing uploaded files
// ============================================================

import React, { useState, useRef } from "react";
import { uploadWithProgress, formatFileSize, isCloudinaryConfigured, getDownloadUrl } from "../utils/cloudinary";
import "./CloudinaryUpload.css";

/**
 * Props:
 *   folder        — Cloudinary folder path
 *   publicId      — Optional publicId override
 *   accept        — File accept string (default: pdf + images)
 *   maxMB         — Maximum file size in MB (default: 10)
 *   existingUrl   — Existing file URL (shown as download link)
 *   existingName  — Filename for existing file
 *   onUpload      — (result) => void
 *   label         — Title label (default: "Upload File")
 *   hint          — Subtitle hint text
 */
export default function FileUpload({
  folder = "medibook/reports",
  publicId,
  accept = "application/pdf,image/jpeg,image/png",
  maxMB = 10,
  existingUrl,
  existingName,
  onUpload,
  label = "Upload File",
  hint = "Drag & drop or click to browse",
}) {
  const [file, setFile] = useState(null);
  const [uploadedResult, setUploadedResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const getFileIcon = (filename = "", mimeType = "") => {
    if (mimeType === "application/pdf" || filename.endsWith(".pdf")) return "📄";
    if (mimeType.startsWith("image/")) return "🖼️";
    return "📁";
  };

  const validateFile = (f) => {
    const allowedMime = accept.split(",").map((a) => a.trim());
    if (!allowedMime.includes(f.type) && f.type !== "") {
      throw new Error(`File type not allowed. Accepted: ${accept}`);
    }
    const maxBytes = maxMB * 1024 * 1024;
    if (f.size > maxBytes) {
      throw new Error(`File is too large (${formatFileSize(f.size)}). Max: ${maxMB}MB`);
    }
  };

  const handleFile = async (f) => {
    setError(null);
    try {
      validateFile(f);
    } catch (err) {
      setError(err.message);
      return;
    }

    if (!isCloudinaryConfigured()) {
      setError("Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME in .env.local");
      return;
    }

    setFile(f);
    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadWithProgress(
        f,
        { folder, publicId, resourceType: "auto" },
        (pct) => setProgress(pct)
      );

      const uploadResult = {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
        size: formatFileSize(result.bytes),
        pages: result.pages || 1,
        resourceType: result.resource_type,
        originalName: f.name,
        uploadedAt: new Date().toISOString(),
      };

      setUploadedResult(uploadResult);
      if (onUpload) onUpload(uploadResult);
    } catch (err) {
      setError(err.message);
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  // Drag-and-drop handlers
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  };

  const handleInputChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const removeFile = () => {
    setFile(null);
    setUploadedResult(null);
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="file-upload-component">
      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={handleInputChange}
      />

      {/* Drop zone — only shown if no file yet */}
      {!uploadedResult && !uploading && (
        <div
          className={`file-upload-zone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="fuz-icon">📂</div>
          <div className="fuz-title">{label}</div>
          <div className="fuz-hint">{hint}</div>
          <div className="fuz-types">PDF · JPEG · PNG · Max {maxMB}MB</div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="file-upload-zone" style={{ cursor: "default" }}>
          <div className="fuz-icon">⏳</div>
          <div className="fuz-title">Uploading {file?.name}...</div>
          <div className="upload-progress-bar">
            <div className="upload-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="fuz-hint">{progress}%</div>
        </div>
      )}

      {/* Uploaded file preview */}
      {uploadedResult && !uploading && (
        <div className="file-preview">
          <div className="file-preview-icon">
            {getFileIcon(uploadedResult.originalName, uploadedResult.resourceType)}
          </div>
          <div className="file-preview-info">
            <div className="file-preview-name">{uploadedResult.originalName}</div>
            <div className="file-preview-meta">
              {uploadedResult.size}
              {uploadedResult.pages > 1 ? ` · ${uploadedResult.pages} pages` : ""}
              {" · "}
              <a
                className="file-download-link"
                href={getDownloadUrl(uploadedResult.url, uploadedResult.originalName)}
                target="_blank"
                rel="noreferrer"
              >
                📥 Download
              </a>
            </div>
          </div>
          <button className="file-preview-remove" onClick={removeFile} title="Remove file">×</button>
        </div>
      )}

      {/* Show existing uploaded file (e.g. from DB) */}
      {existingUrl && !uploadedResult && (
        <div className="file-preview">
          <div className="file-preview-icon">{getFileIcon(existingName)}</div>
          <div className="file-preview-info">
            <div className="file-preview-name">{existingName || "Uploaded file"}</div>
            <div className="file-preview-meta">
              <a
                className="file-download-link"
                href={existingUrl}
                target="_blank"
                rel="noreferrer"
              >
                📥 View / Download
              </a>
            </div>
          </div>
          <button
            className="file-preview-remove"
            onClick={() => inputRef.current?.click()}
            title="Replace file"
          >
            ✏️
          </button>
        </div>
      )}

      {/* Error messages */}
      {error && (
        <div className="img-upload-error" style={{ textAlign: "left", marginTop: 8 }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
