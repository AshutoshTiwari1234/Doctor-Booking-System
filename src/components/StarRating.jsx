// ============================================================
// StarRating Component — Interactive/readonly star rating
// Used in: doctor profiles, post-appointment review form
// ============================================================

import React, { useState } from "react";

/**
 * Props:
 *   value       — current rating (number 1-5)
 *   onChange    — callback(newRating) — omit to make read-only
 *   size        — "sm" | "md" | "lg" (default "md")
 *   showLabel   — show numeric rating label beside stars
 */
export default function StarRating({ value = 0, onChange, size = "md", showLabel = false }) {
  const [hover, setHover] = useState(0);
  const isInteractive = !!onChange;

  const sizeMap = { sm: "0.9rem", md: "1.2rem", lg: "1.6rem" };
  const fontSize = sizeMap[size] || "1.2rem";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hover || value) >= star;
        return (
          <span
            key={star}
            onClick={() => isInteractive && onChange(star)}
            onMouseEnter={() => isInteractive && setHover(star)}
            onMouseLeave={() => isInteractive && setHover(0)}
            style={{
              fontSize,
              cursor: isInteractive ? "pointer" : "default",
              color: filled ? "#f59e0b" : "#d1d5db",
              transition: "color 0.15s",
              userSelect: "none",
            }}
            aria-label={`${star} star`}
          >
            ★
          </span>
        );
      })}
      {showLabel && value > 0 && (
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginLeft: 4 }}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
