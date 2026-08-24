"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme, THEMES, ThemeId, Lang, FontSizeScale } from "./ThemeContext";
import { TypingLang } from "../utils/transliteration";
import Link from "next/link";
import { useRouter } from "next/router";
import { getUser, clearToken, StoredUser } from "../utils/api";

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "mr", label: "मराठी" },
  { value: "hi", label: "हिंदी" },
  { value: "en", label: "EN" },
];

const TYPING_LANG_OPTIONS: { value: TypingLang; label: string; badge: string }[] = [
  { value: "E", label: "English", badge: "E" },
  { value: "M", label: "मराठी (Marathi)", badge: "M" },
  { value: "H", label: "हिंदी (Hindi)", badge: "H" },
];

export default function UtilityBar() {
  const {
    themeId,
    theme,
    setTheme,
    lang,
    setLang,
    typingLang,
    setTypingLang,
    fontSizeScale,
    setFontSizeScale,
    isFullViewMode,
    toggleFullViewMode,
  } = useTheme();

  const { pathname, push } = useRouter();
  const [userOpen, setUserOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const syncUser = () => setUser(getUser());
    syncUser();

    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > 40 && currentY > lastScrollY.current) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    };

    // Auto-close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("storage", syncUser);
    window.addEventListener("auth-change", syncUser);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("auth-change", syncUser);
    };
  }, []);

  useEffect(() => {
    if (mounted) {
      setUser(getUser());
    }
  }, [pathname, mounted]);

  let navLinks: Array<{ href: string; label: string }> = [];

  if (mounted && user) {
    if (user.role === "MASTER_ADMIN") {
      navLinks = [
        { href: "/admin", label: "🛡️ Admin Dashboard" },
        { href: "/prescription", label: "✍️ Prescriptions" },
        { href: "/inventory", label: "💊 Store Inventory" },
      ];
    } else if (user.role === "PHARMACIST") {
      navLinks = [
        { href: "/inventory", label: "💊 Store Inventory" },
      ];
    } else {
      // DOCTOR
      navLinks = [
        { href: "/prescription", label: "✍️ Prescriptions" },
        { href: "/doctor-profile", label: "🏥 Profile" },
      ];
    }
  } else {
    navLinks = [
      { href: "/prescription", label: "✍️ Prescriptions" },
      { href: "/inventory", label: "💊 Store" },
    ];
  }

  const handleLogout = () => {
    clearToken();
    push("/login");
  };

  return (
    <>
      {/* Floating Exit Button when Full View Mode is active */}
      {isFullViewMode && (
        <button
          type="button"
          onClick={toggleFullViewMode}
          title="Exit Full View Mode (Restore Top Navigation Bars)"
          style={{
            position: "fixed",
            top: 8,
            right: 16,
            zIndex: 10001,
            padding: "5px 12px",
            borderRadius: 20,
            background: "#ff671f",
            color: "#ffffff",
            fontWeight: 900,
            fontSize: 10,
            border: "none",
            boxShadow: "0 4px 14px rgba(255,103,31,0.5)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span>🖥️ Exit Full View</span>
        </button>
      )}

      {/* ══ Top Strip 1: UX4G Government Accessibility & Font Scale Bar ══ */}
      <div
        id="ux4g-top-accessibility-strip"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 28,
          zIndex: 10000,
          background: "#0b192c",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          color: "#90caf9",
          fontSize: 10,
          fontFamily: "'Inter', sans-serif",
          transform: isFullViewMode || !visible ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Left: Branding & Full View Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 800, color: "#ff671f", letterSpacing: "0.5px" }}>
            ⚕️ PRESCRIPTO HEALTHCARE PLATFORM
          </span>
          <button
            type="button"
            onClick={toggleFullViewMode}
            title="Auto-hide top navigation bars for 100% full view screen"
            style={{
              padding: "1px 7px",
              border: "1px solid #ff671f",
              borderRadius: 4,
              background: isFullViewMode ? "#ff671f" : "rgba(255,103,31,0.15)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 9,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <span>🖥️</span>
            <span>Full View</span>
          </button>
        </div>

        {/* Right: Accessibility Controls (A-, A, A+ font scale, Transliteration Mode, UI Lang) */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Transliteration Mode Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "#90caf9", fontWeight: 700 }}>⌨️ Input Mode:</span>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
              {TYPING_LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTypingLang(opt.value)}
                  title={`Global Typing Language: ${opt.label}`}
                  style={{
                    padding: "1px 6px",
                    border: "none",
                    background: typingLang === opt.value ? "#ff671f" : "transparent",
                    color: typingLang === opt.value ? "#ffffff" : "#cccccc",
                    fontWeight: 900,
                    cursor: "pointer",
                    fontSize: 9,
                  }}
                >
                  {opt.badge}
                </button>
              ))}
            </div>
          </div>

          <span style={{ opacity: 0.4 }}>|</span>

          {/* Font Resizing Controls A- A A+ */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "#90caf9", fontWeight: 700 }}>Text Size:</span>
            {(
              [
                { label: "A-", scale: 0.9 },
                { label: "A", scale: 1.0 },
                { label: "A+", scale: 1.15 },
              ] as const
            ).map((f) => (
              <button
                key={f.label}
                onClick={() => setFontSizeScale(f.scale as FontSizeScale)}
                title={`Scale font size to ${f.scale * 100}%`}
                style={{
                  padding: "1px 5px",
                  border: "none",
                  borderRadius: 3,
                  background: fontSizeScale === f.scale ? "#046a38" : "rgba(255,255,255,0.1)",
                  color: fontSizeScale === f.scale ? "#ffffff" : "#cccccc",
                  fontWeight: 800,
                  fontSize: 9,
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ Top Strip 2: Main Application Navigation Bar ══ */}
      <div
        id="utility-bar"
        style={{
          position: "fixed",
          top: isFullViewMode ? 0 : 28,
          left: 0,
          right: 0,
          zIndex: 9999,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          gap: 10,
          backgroundColor: theme.surface,
          borderBottom: `1px solid ${theme.border}`,
          boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
          backdropFilter: "blur(16px)",
          fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
          fontSize: `${13 * fontSizeScale}px`,
          transform: isFullViewMode || !visible ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), top 0.3s ease",
        }}
      >
        {/* Left: Logo + Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 7, marginRight: 6 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg,#c41e3a,#e53e3e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(196,30,58,0.4)",
              }}
            >
              ⚕
            </div>
            <span style={{ fontSize: 14, fontWeight: 900, color: theme.text, letterSpacing: "-0.3px" }}>
              Prescripto
            </span>
          </Link>

          {navLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href} style={{ textDecoration: "none" }}>
                <span
                  style={{
                    padding: "5px 11px",
                    borderRadius: 8,
                    fontSize: `${11 * fontSizeScale}px`,
                    fontWeight: active ? 800 : 600,
                    color: active ? theme.accent : theme.textMuted,
                    background: active ? `${theme.accent}18` : "transparent",
                    border: active ? `1px solid ${theme.accent}40` : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "inline-block",
                  }}
                >
                  {l.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right: UI Language + Themes + User */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* UI Language Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: theme.inputBg,
              border: `1px solid ${theme.border}`,
              borderRadius: 9,
              overflow: "hidden",
            }}
          >
            {LANG_OPTIONS.map((opt) => {
              const active = lang === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value)}
                  title={opt.label}
                  style={{
                    padding: "3px 9px",
                    border: "none",
                    borderRadius: 8,
                    background: active ? theme.accent : "transparent",
                    color: active ? "#fff" : theme.textMuted,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 11,
                    transition: "all 0.15s",
                    fontFamily: "'Noto Sans Devanagari','Inter',Arial,sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Centralized UI Theme Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: "rgba(0,0,0,0.3)",
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              padding: 2,
            }}
          >
            {[
              { id: "govblue", label: "UX4G Gov", emoji: "🏛️" },
              { id: "dark", label: "Dark", emoji: "🌙" },
              { id: "light", label: "Light", emoji: "☀️" },
              { id: "forest", label: "Emerald", emoji: "🌿" },
            ].map((t) => {
              const active = themeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as ThemeId)}
                  title={`Switch to ${t.label} Theme`}
                  style={{
                    padding: "3px 7px",
                    border: "none",
                    borderRadius: 6,
                    background: active ? theme.accent : "transparent",
                    color: active ? "#ffffff" : theme.textMuted,
                    fontWeight: active ? 900 : 600,
                    cursor: "pointer",
                    fontSize: 10,
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* User Profile / Logout Dropdown (SSR safe via mounted check) */}
          {mounted && user ? (
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setUserOpen(!userOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px 4px 6px",
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  background: theme.inputBg,
                  color: theme.text,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg,${theme.accent},${theme.accent}99)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#fff",
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {user.full_name?.slice(0, 1).toUpperCase() || "U"}
                </div>
                <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.full_name?.split(" ")[0] || "User"}
                </span>
                <span style={{ fontSize: 9, color: theme.textMuted }}>▼</span>
              </button>

              {userOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    background: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 12,
                    padding: 8,
                    minWidth: 160,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                    zIndex: 99999,
                  }}
                >
                  <div
                    style={{
                      padding: "6px 10px",
                      fontSize: 10,
                      color: theme.textMuted,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {user.role?.replace("_", " ")}
                  </div>
                  <div
                    style={{
                      padding: "4px 10px 6px",
                      fontSize: 11,
                      color: theme.text,
                      borderBottom: `1px solid ${theme.border}`,
                      marginBottom: 4,
                    }}
                  >
                    {user.email}
                  </div>
                  {user.role === "MASTER_ADMIN" && (
                    <Link href="/admin" style={{ textDecoration: "none" }}>
                      <div
                        style={{
                          padding: "7px 10px",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          color: theme.text,
                          cursor: "pointer",
                        }}
                      >
                        🛡️ Master Admin Portal
                      </div>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: "transparent",
                      color: "#ef4444",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" style={{ textDecoration: "none" }}>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 9,
                  background: "linear-gradient(135deg,#c41e3a,#e53e3e)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Sign In
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Double Bar Spacer so page content starts cleanly under both fixed top bars (28px + 48px = 76px) */}
      <div style={{ height: 76 }} />

      <style>{`
        #utility-bar a { text-decoration: none; }
        @media (max-width: 720px) {
          #ux4g-top-accessibility-strip { display: none; }
          #utility-bar { top: 0 !important; }
        }
      `}</style>
    </>
  );
}
