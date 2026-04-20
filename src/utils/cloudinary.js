// ============================================================
// Cloudinary Storage Utility
// Handles all image/file uploads for the MediBook platform
//
// Architecture: Unsigned uploads via upload preset
//   - No API secret needed on frontend (secure by design)
//   - Files go directly from browser → Cloudinary CDN
//   - Returns secure HTTPS URLs stored in PostgreSQL
//
// Upload types supported:
//   🖼️  Doctor profile photos    → folder: medibook/doctors/
//   📄  Medical reports (PDFs)   → folder: medibook/reports/
//   📁  Patient files            → folder: medibook/patients/
// ============================================================

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;

// Base endpoint for unsigned uploads (no secret required)
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

// ──────────────────────────────────────────────────────────────
// CORE: Upload a file to Cloudinary (unsigned)
// Returns the full Cloudinary response including secure_url
// ──────────────────────────────────────────────────────────────
const uploadToCloudinary = async (file, options = {}) => {
  if (!file) throw new Error("No file provided");
  if (!CLOUD_NAME) throw new Error("VITE_CLOUDINARY_CLOUD_NAME is not set in .env.local");
  if (!UPLOAD_PRESET) throw new Error("VITE_CLOUDINARY_UPLOAD_PRESET is not set in .env.local");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("api_key", API_KEY);

  // Optional: specify folder, public_id, tags, transformation
  if (options.folder) formData.append("folder", options.folder);
  if (options.publicId) formData.append("public_id", options.publicId);
  if (options.tags) formData.append("tags", options.tags);
  if (options.resourceType) formData.append("resource_type", options.resourceType);

  // Use resource_type=auto for PDFs/documents, image for photos
  const resourceType = options.resourceType || "auto";
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Cloudinary upload failed");
  }

  return response.json();
};

// ──────────────────────────────────────────────────────────────
// PROGRESS-AWARE: Upload with progress callback
// onProgress(percent) called during upload
// ──────────────────────────────────────────────────────────────
export const uploadWithProgress = (file, options = {}, onProgress) => {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(new Error("Cloudinary env vars not configured. Check .env.local"));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("api_key", API_KEY);
    if (options.folder) formData.append("folder", options.folder);
    if (options.publicId) formData.append("public_id", options.publicId);
    if (options.tags) formData.append("tags", options.tags);

    const resourceType = options.resourceType || "auto";
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);

    // Track upload progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        const err = JSON.parse(xhr.responseText);
        reject(new Error(err.error?.message || "Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
};

// ──────────────────────────────────────────────────────────────
// DOCTOR PROFILE PHOTO
// Uploads doctor avatar/photo → returns secure URL
// Recommended: JPEG/PNG/WEBP, max 5MB
// ──────────────────────────────────────────────────────────────
export const uploadDoctorPhoto = async (file, doctorUid, onProgress) => {
  validateImageFile(file, 5);

  const result = await uploadWithProgress(
    file,
    {
      folder: "medibook/doctors",
      publicId: `doctor_${doctorUid}`,
      tags: "doctor,profile",
      resourceType: "image",
    },
    onProgress
  );

  return {
    url: result.secure_url,      // HTTPS URL to store in DB
    publicId: result.public_id,  // For future delete/update
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
};

// ──────────────────────────────────────────────────────────────
// PATIENT PROFILE PHOTO
// Same as doctor but stored under medibook/patients/
// ──────────────────────────────────────────────────────────────
export const uploadPatientPhoto = async (file, patientUid, onProgress) => {
  validateImageFile(file, 5);

  const result = await uploadWithProgress(
    file,
    {
      folder: "medibook/patients",
      publicId: `patient_${patientUid}`,
      tags: "patient,profile",
      resourceType: "image",
    },
    onProgress
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
  };
};

// ──────────────────────────────────────────────────────────────
// MEDICAL REPORT UPLOAD (EHR Feature)
// Supports PDF, JPEG, PNG — any medical document
// Uploaded per appointment ID for organized storage
// ──────────────────────────────────────────────────────────────
export const uploadMedicalReport = async (file, { patientUid, appointmentId }, onProgress) => {
  validateReportFile(file, 10); // Allow up to 10MB for PDFs

  const timestamp = Date.now();
  const isPdf = file.type === 'application/pdf';
  const result = await uploadWithProgress(
    file,
    {
      folder: "medibook/reports",
      publicId: `report_${patientUid}_${appointmentId || timestamp}`,
      tags: `patient_${patientUid},medical_report`,
      resourceType: "auto", // Handles both images and PDFs
    },
    onProgress
  );

  // Ensure correct resource type in URL for PDFs
  let secureUrl = result.secure_url;
  if (isPdf && secureUrl.includes('/image/upload/')) {
    secureUrl = secureUrl.replace('/image/upload/', '/raw/upload/');
  }

  return {
    url: secureUrl,
    publicId: result.public_id,
    format: result.format,       // "pdf", "jpg", "png", etc.
    bytes: result.bytes,
    pages: result.pages || 1,    // Number of pages (PDF only)
    resourceType: result.resource_type,
    originalName: file.name,
    uploadedAt: new Date().toISOString(),
  };
};

// ──────────────────────────────────────────────────────────────
// PRESCRIPTION UPLOAD (Doctor → Patient)
// Doctor uploads prescription after consultation
// ──────────────────────────────────────────────────────────────
export const uploadPrescription = async (file, { doctorUid, appointmentId }, onProgress) => {
  validateReportFile(file, 10);

  const result = await uploadWithProgress(
    file,
    {
      folder: "medibook/prescriptions",
      publicId: `prescription_${appointmentId}`,
      tags: `doctor_${doctorUid},prescription`,
      resourceType: "auto",
    },
    onProgress
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
    originalName: file.name,
    uploadedAt: new Date().toISOString(),
  };
};

// ──────────────────────────────────────────────────────────────
// AUTO-TRANSFORMED URL HELPERS (Cloudinary URL builder)
// Use these to get resized/formatted versions without re-uploading
// ──────────────────────────────────────────────────────────────

// Get a thumbnail version of any uploaded image
export const getThumbnailUrl = (publicId, { width = 100, height = 100 } = {}) => {
  if (!publicId || !CLOUD_NAME) return null;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${width},h_${height},q_auto,f_auto/${publicId}`;
};

// Get a responsive image URL with quality auto
export const getOptimizedUrl = (publicId, { width = 400 } = {}) => {
  if (!publicId || !CLOUD_NAME) return null;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_limit,w_${width},q_auto,f_auto/${publicId}`;
};

// Get a direct download URL for a file (PDFs, etc.)
export const getDownloadUrl = (secureUrl, filename) => {
  if (!secureUrl) return null;
  let url = secureUrl;
  
  // Check if it's a PDF by filename, URL extension, or resource type in URL
  const isPdf = filename?.toLowerCase().endsWith('.pdf') || 
                url.toLowerCase().endsWith('.pdf') || 
                url.includes('/raw/upload/') ||
                !url.includes('/image/upload/');
  
  // Ensure raw resource type for PDFs (not image)
  if (isPdf && url.includes('/image/upload/')) {
    url = url.replace('/image/upload/', '/raw/upload/');
  }
  
  // Clean filename - remove special chars, use just basename
  const cleanName = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, '_') : 'document';
  
  // Add fl_attachment for forced download - handle both /upload/ and /upload/v12345/ patterns
  if (url.includes('/upload/v')) {
    // URL has version number: /upload/v12345/ -> /upload/fl_attachment:filename/v12345/
    url = url.replace('/upload/v', `/upload/fl_attachment:${cleanName}/v`);
  } else {
    // No version: /upload/ -> /upload/fl_attachment:filename/
    url = url.replace("/upload/", `/upload/fl_attachment:${cleanName}/`);
  }
  
  return url;
};

// Get a view URL for PDF or image
export const getViewUrl = (secureUrl, format) => {
  if (!secureUrl) return null;
  let url = secureUrl;
  // Ensure correct resource type for PDFs
  if (format === 'pdf' && url.includes('/image/upload/')) {
    url = url.replace('/image/upload/', '/raw/upload/');
  }
  return url;
};

// ──────────────────────────────────────────────────────────────
// VALIDATION HELPERS
// ──────────────────────────────────────────────────────────────

// Only allow image files for photo uploads
const validateImageFile = (file, maxMB) => {
  if (!file) throw new Error("No file provided");

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type "${file.type}". Only JPEG, PNG, WEBP allowed.`);
  }

  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: ${maxMB}MB`);
  }
};

// Allow images + PDFs for medical documents
const validateReportFile = (file, maxMB) => {
  if (!file) throw new Error("No file provided");

  const allowedTypes = [
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only PDF, JPEG, or PNG files are allowed for medical reports.");
  }

  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: ${maxMB}MB`);
  }
};

// ──────────────────────────────────────────────────────────────
// UTILITY: Format file size for display
// ──────────────────────────────────────────────────────────────
export const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// ──────────────────────────────────────────────────────────────
// UTILITY: Check if Cloudinary is properly configured
// ──────────────────────────────────────────────────────────────
export const isCloudinaryConfigured = () => {
  return !!(CLOUD_NAME && UPLOAD_PRESET && CLOUD_NAME !== "YOUR_CLOUD_NAME");
};

export default {
  uploadDoctorPhoto,
  uploadPatientPhoto,
  uploadMedicalReport,
  uploadPrescription,
  uploadWithProgress,
  getThumbnailUrl,
  getOptimizedUrl,
  getDownloadUrl,
  getViewUrl,
  formatFileSize,
  isCloudinaryConfigured,
};
