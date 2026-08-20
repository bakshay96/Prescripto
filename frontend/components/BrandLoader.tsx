"use client";
import React from "react";
import { useTheme } from "./ThemeContext";

interface LoaderProps {
  role?: "DOCTOR" | "PHARMACIST" | "MASTER_ADMIN" | "SYSTEM";
  message?: string;
}

const ROLE_CONFIG = {
  DOCTOR: {
    icon: "⚕️",
    gradient: "linear-gradient(135deg, #c41e3a, #e53e3e, #be123c)",
    glow: "rgba(196,30,58,0.4)",
    ring: "#c41e3a",
    label: "Doctor Portal",
    dots: ["#c41e3a", "#e53e3e", "#fb7185"],
  },
  PHARMACIST: {
    icon: "💊",
    gradient: "linear-gradient(135deg, #059669, #10b981, #34d399)",
    glow: "rgba(16,185,129,0.4)",
    ring: "#10b981",
    label: "Pharmacist Portal",
    dots: ["#059669", "#10b981", "#34d399"],
  },
  MASTER_ADMIN: {
    icon: "🛡️",
    gradient: "linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)",
    glow: "rgba(124,58,237,0.4)",
    ring: "#8b5cf6",
    label: "Admin Portal",
    dots: ["#7c3aed", "#8b5cf6", "#a78bfa"],
  },
  SYSTEM: {
    icon: "⚡",
    gradient: "linear-gradient(135deg, #0ea5e9, #38bdf8, #7dd3fc)",
    glow: "rgba(14,165,233,0.4)",
    ring: "#0ea5e9",
    label: "Loading...",
    dots: ["#0ea5e9", "#38bdf8", "#7dd3fc"],
  },
};

export default function BrandLoader({ role = "SYSTEM", message }: LoaderProps) {
  const { theme } = useTheme();
  const cfg = ROLE_CONFIG[role];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backgroundColor: theme.bg,
      fontFamily: "'Inter','Noto Sans Devanagari',sans-serif",
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: "20%", left: "30%",
          width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
          animation: "breathe 3s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "20%", right: "25%",
          width: 200, height: 200, borderRadius: "50%",
          background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
          animation: "breathe 3s ease-in-out infinite 1.5s",
        }} />
      </div>

      {/* Spinning Ring */}
      <div style={{ position: "relative", width: 96, height: 96, marginBottom: 24 }}>
        {/* Outer ring spinner */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: `3px solid ${theme.border}`,
          borderTopColor: cfg.ring,
          animation: "spin 1s linear infinite",
        }} />
        {/* Inner ring counter-spinner */}
        <div style={{
          position: "absolute", inset: 10,
          borderRadius: "50%",
          border: `2px solid transparent`,
          borderBottomColor: cfg.dots[1],
          animation: "spin 0.7s linear infinite reverse",
        }} />

        {/* Center icon */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 34,
          animation: "pulse-scale 2s ease-in-out infinite",
        }}>
          {cfg.icon}
        </div>
      </div>

      {/* Brand wordmark */}
      <div style={{
        background: cfg.gradient,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        fontSize: 28, fontWeight: 900, letterSpacing: "-1px",
        marginBottom: 8,
      }}>
        Prescripto
      </div>

      {/* Role label */}
      <div style={{
        fontSize: 13, fontWeight: 700,
        color: theme.textMuted,
        marginBottom: 24,
        textTransform: "uppercase",
        letterSpacing: "2px",
      }}>
        {cfg.label}
      </div>

      {/* Bouncing dots */}
      <div style={{ display: "flex", gap: 8 }}>
        {cfg.dots.map((color, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%",
            backgroundColor: color,
            animation: `bounce 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>

      {/* Optional message */}
      {message && (
        <div style={{
          marginTop: 20, fontSize: 12, color: theme.textMuted,
          maxWidth: 280, textAlign: "center", lineHeight: 1.6,
        }}>
          {message}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-10px); opacity: 1; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
