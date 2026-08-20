"use client";
import React, { useState } from "react";
import { useTheme, THEMES, ThemeId, Lang } from "./ThemeContext";
import Link from "next/link";
import { useRouter } from "next/router";
import { getUser, clearToken } from "../utils/api";

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "mr", label: "मराठी" },
  { value: "hi", label: "हिंदी" },
  { value: "en", label: "EN" },
];

export default function UtilityBar() {
  const { themeId, theme, setTheme, lang, setLang } = useTheme();
  const { pathname, push } = useRouter();
  const [userOpen, setUserOpen] = useState(false);

  const user = typeof window !== "undefined" ? getUser() : null;

  const navLinks = [
    { href: "/prescription",   label: "✍️ Prescriptions" },
    { href: "/doctor-profile", label: "🏥 Profile" },
    { href: "/inventory",      label: "💊 Store" },
  ];

  if (user?.role === "MASTER_ADMIN") {
    navLinks.push({ href: "/admin", label: "🛡️ Admin" });
  }

  const handleLogout = () => {
    clearToken();
    push("/login");
  };

  const bar: React.CSSProperties = {
    position: "fixed",
    top: 0, left: 0, right: 0,
    zIndex: 9999,
    height: 46,
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
  };

  return (
    <>
      <div style={bar} id="utility-bar">
        {/* Left: Logo + Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 7, marginRight: 6 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: "linear-gradient(135deg,#c41e3a,#e53e3e)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, flexShrink: 0,
            }}>⚕</div>
            <span style={{ fontSize: 13, fontWeight: 900, color: theme.text, letterSpacing: "-0.3px" }}>Prescripto</span>
          </Link>

          {navLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href} style={{ textDecoration: "none" }}>
                <span style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: active ? 800 : 600,
                  color: active ? theme.accent : theme.textMuted,
                  background: active ? `${theme.accent}18` : "transparent",
                  border: active ? `1px solid ${theme.accent}40` : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "inline-block",
                }}>
                  {l.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right: Lang + Theme + User */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

          {/* Language switcher */}
          <div style={{
            display: "flex", alignItems: "center",
            background: theme.inputBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 9, overflow: "hidden",
          }}>
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

          {/* Theme switcher */}
          <div style={{
            display: "flex", alignItems: "center",
            background: theme.inputBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 9, overflow: "hidden",
          }}>
            {Object.values(THEMES).map((t) => {
              const active = themeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as ThemeId)}
                  title={t.label}
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
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.emoji}
                </button>
              );
            })}
          </div>

          {/* User badge / login */}
          {user ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setUserOpen(!userOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 10px 4px 6px",
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  background: theme.inputBg,
                  color: theme.text,
                  cursor: "pointer",
                  fontSize: 11, fontWeight: 700,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: `linear-gradient(135deg,${theme.accent},${theme.accent}99)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "#fff", fontWeight: 900, flexShrink: 0,
                }}>
                  {user.full_name?.slice(0, 1).toUpperCase() || "U"}
                </div>
                <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.full_name?.split(" ")[0] || "User"}
                </span>
                <span style={{ fontSize: 9, color: theme.textMuted }}>▼</span>
              </button>

              {userOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0,
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12, padding: 8,
                  minWidth: 160,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  zIndex: 99999,
                }}>
                  <div style={{ padding: "6px 10px", fontSize: 10, color: theme.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {user.role?.replace("_", " ")}
                  </div>
                  <div style={{ padding: "4px 10px 6px", fontSize: 11, color: theme.text, borderBottom: `1px solid ${theme.border}`, marginBottom: 4 }}>
                    {user.email}
                  </div>
                  {user.role === "MASTER_ADMIN" && (
                    <Link href="/admin" style={{ textDecoration: "none" }}>
                      <div style={{
                        padding: "7px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        color: theme.text, cursor: "pointer"
                      }}>
                        🛡️ Master Admin Portal
                      </div>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "7px 10px", borderRadius: 8,
                      border: "none", background: "transparent",
                      color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" style={{ textDecoration: "none" }}>
              <span style={{
                padding: "4px 12px", borderRadius: 9,
                background: "linear-gradient(135deg,#c41e3a,#e53e3e)",
                color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer",
              }}>
                Sign In
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Spacer so pages don't go under the bar */}
      <div style={{ height: 46 }} />

      <style>{`
        #utility-bar a { text-decoration: none; }
        @media (max-width: 600px) {
          #utility-bar .nav-links-hide { display: none; }
        }
      `}</style>
    </>
  );
}
