"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import { TypingLang } from "../utils/transliteration";

const LANGS: { value: TypingLang; label: string; sublabel: string; color: string; glyph: string }[] = [
  {
    value: "E",
    label: "English",
    sublabel: "English Input",
    color: "#2563eb",
    glyph: "A",
  },
  {
    value: "M",
    label: "मराठी",
    sublabel: "Marathi Input",
    color: "#ff671f",
    glyph: "म",
  },
  {
    value: "H",
    label: "हिंदी",
    sublabel: "Hindi Input",
    color: "#046a38",
    glyph: "ह",
  },
];

/**
 * GlobalTransliterationFAB
 * A floating action button visible on every page that lets users switch
 * the global input language (English / Marathi / Hindi) in one click.
 */
export function GlobalTransliterationFAB() {
  const { typingLang, setTypingLang, themeId } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [justSwitched, setJustSwitched] = useState<TypingLang | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render server-side
  if (!mounted) return null;

  const current = LANGS.find((l) => l.value === typingLang) || LANGS[0];
  const isDark = themeId !== "light";

  const handlePick = (lang: TypingLang) => {
    setTypingLang(lang);
    setJustSwitched(lang);
    setOpen(false);
    setTimeout(() => setJustSwitched(null), 2000);
  };

  const cycleNext = () => {
    const idx = LANGS.findIndex((l) => l.value === typingLang);
    const next = LANGS[(idx + 1) % LANGS.length];
    handlePick(next.value);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 24,
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, Arial, sans-serif",
      }}
    >
      {/* Flash toast when lang switches */}
      {justSwitched && (
        <div
          style={{
            background: LANGS.find((l) => l.value === justSwitched)?.color || "#333",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 900,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            animation: "fadeInUp 0.2s ease",
            whiteSpace: "nowrap",
          }}
        >
          ⌨️ Input switched to {LANGS.find((l) => l.value === justSwitched)?.sublabel}
        </div>
      )}

      {/* Language Picker Popover */}
      {open && (
        <div
          style={{
            background: isDark ? "#0f172a" : "#ffffff",
            border: `1.5px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
            borderRadius: 16,
            padding: "8px 0",
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
            minWidth: 200,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "6px 14px 8px",
              fontSize: 9,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: isDark ? "#64748b" : "#94a3b8",
              borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
            }}
          >
            ⌨️ Global Input Language
          </div>
          {LANGS.map((lang) => {
            const isActive = typingLang === lang.value;
            return (
              <button
                key={lang.value}
                type="button"
                onClick={() => handlePick(lang.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "10px 14px",
                  background: isActive
                    ? isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)"
                    : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: lang.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {lang.glyph}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: isDark ? "#f1f5f9" : "#0f172a",
                    }}
                  >
                    {lang.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: isDark ? "#64748b" : "#94a3b8",
                    }}
                  >
                    {lang.sublabel}
                  </div>
                </div>
                {isActive && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: lang.color,
                      boxShadow: `0 0 8px ${lang.color}`,
                    }}
                  />
                )}
              </button>
            );
          })}
          <div
            style={{
              padding: "6px 14px 2px",
              fontSize: 9,
              color: isDark ? "#334155" : "#cbd5e1",
              borderTop: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
            }}
          >
            Click the button to cycle: E → मराठी → हिंदी
          </div>
        </div>
      )}

      {/* Main FAB Button */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Label tag */}
        {!open && (
          <div
            style={{
              background: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
              border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: 800,
              color: isDark ? "#94a3b8" : "#64748b",
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={cycleNext}
            title="Click to cycle language"
          >
            ⌨️ {current.sublabel}
          </div>
        )}

        {/* Circular FAB */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title={`Input: ${current.sublabel} — Click to change`}
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: current.color,
            color: "#fff",
            border: "3px solid rgba(255,255,255,0.2)",
            fontSize: 20,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: `0 4px 20px ${current.color}80, 0 2px 6px rgba(0,0,0,0.3)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            transform: open ? "rotate(45deg) scale(1.1)" : "scale(1)",
            outline: "none",
            fontFamily: "'Noto Sans Devanagari', system-ui",
          }}
        >
          {open ? "✕" : current.glyph}
        </button>
      </div>

      {/* Keyframe CSS */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
