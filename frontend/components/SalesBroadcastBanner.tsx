"use client";

import React, { useState, useEffect } from "react";
import { getPlatformAnnouncements, PlatformAnnouncement } from "../utils/api";

export default function SalesBroadcastBanner() {
  const [announcement, setAnnouncement] = useState<PlatformAnnouncement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getPlatformAnnouncements()
      .then((res) => {
        if (res && res.active) setAnnouncement(res);
      })
      .catch(() => {});
  }, []);

  if (!announcement || dismissed) return null;

  return (
    <div
      className="ux4g-theme-govblue"
      style={{
        background: "linear-gradient(90deg, #005691 0%, #ff671f 50%, #005691 100%)",
        color: "#ffffff",
        padding: "8px 16px",
        fontSize: 12,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, Arial, sans-serif",
        zIndex: 9999,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          style={{
            background: "#ffffff",
            color: "#005691",
            padding: "2px 8px",
            borderRadius: 12,
            fontSize: 10,
            fontWeight: 900,
          }}
        >
          {announcement.discount_badge || "SPECIAL OFFER"}
        </span>
        <span>{announcement.message}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            background: "rgba(0,0,0,0.25)",
            padding: "3px 10px",
            borderRadius: 6,
            fontFamily: "monospace",
            letterSpacing: "0.5px",
          }}
        >
          Coupon: <strong>{announcement.coupon_code}</strong>
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            background: "none",
            border: "none",
            color: "#ffffff",
            fontSize: 16,
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
