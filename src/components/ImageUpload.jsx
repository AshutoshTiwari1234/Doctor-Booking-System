// ============================================================
// ImageUpload Component — Circular avatar photo uploader
// Used in: Doctor profile, Patient profile
// Features: drag-over, click-to-select, progress ring, preview
// ============================================================

import React, { useState, useRef } from "react";
import { uploadWithProgress, formatFileSize, isCloudinaryConfigured } from "../utils/cloudinary";
import "./CloudinaryUpload.css";

/**
 * Props:
 *   folder       — Cloudinary folder e.g. "medibook/doctors"
 *   publicId     — Cloudinary public_id override e.g. "doctor_abc123"
 *   currentUrl   — Existing image URL to display as default
 *   onUpload     — (result) => void  called with { url, publicId, ... }
 *   size         — Avatar size in px (default 100)
 *   placeholder  — Emoji or label to show when no image
 *   label        — Label text below the avatar
 */
export default function ImageUpload({
  folder = "medibook/avatars",
  publicId,
  currentUrl,
  onUpload,
  size = 100,
  placeholder = "👤",
  label = "Upload Photo",
}) {
  const [preview, setPreview] = useState(currentUrl || null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef();

  const handleFileSelect = async (file) => {
    if (!file) return;
    setError(null);
    setDone(false);

    // Check Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      setError("Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME in .env.local");
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadWithProgress(
        file,
        { folder, publicId, resourceType: "image" },
        (pct) => setProgress(pct)
      );
      setPreview(result.secure_url);
      setDone(true);

      if (onUpload) {
        onUpload({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          size: formatFileSize(result.bytes),
        });
      }
    } catch (err) {
      setError(err.message);
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const triggerInput = () => inputRef.current?.click();

  return (
    <div className="img-upload-wrap">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleInputChange}
      />

      {/* Progress ring shown during upload */}
      {uploading ? (
        <div className="upload-progress-circle">
          <div
            className="progress-ring"
            style={{ "--pct": `${progress}%` }}
          >
            <div className="progress-ring-label">{progress}%</div>
          </div>
          <div className="img-upload-hint">Uploading...</div>
        </div>
      ) : preview ? (
        /* Existing preview with hover overlay */
        <div
          className="img-upload-preview"
          style={{ width: size, height: size }}
          onClick={triggerInput}
          title="Click to change photo"
        >
          <img className="img-preview-img" src={preview} alt="Profile" />
          <div className="img-preview-overlay">
            <span>📷</span>
            <span>Change</span>
          </div>
        </div>
      ) : (
        /* Placeholder click zone */
        <div
          className="img-upload-placeholder"
          style={{ width: size, height: size }}
          onClick={triggerInput}
          title="Click to upload photo"
        >
          <div className="img-upload-placeholder-icon">{placeholder}</div>
          <div>{label}</div>
        </div>
      )}

      {/* Status messages */}
      {error && <div className="img-upload-error">⚠️ {error}</div>}
      {done && !error && <div className="img-upload-success">✅ Photo uploaded!</div>}
      {!uploading && !error && (
        <div className="img-upload-hint">
          JPEG · PNG · WEBP · Max 5MB
        </div>
      )}
    </div>
  );
}
