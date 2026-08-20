"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getUser, clearToken, StoredUser } from "../utils/api";
import { useTheme } from "./ThemeContext";

const LINKS = [
  { href: "/", icon: "🏠", label: "Home", labelMr: "मुख्यपृष्ठ", labelHi: "होम" },
  { href: "/prescription", icon: "✍️", label: "Prescription", labelMr: "प्रिस्क्रिप्शन", labelHi: "पर्चा" },
  { href: "/inventory", icon: "💊", label: "Medical Store", labelMr: "औषध साठा", labelHi: "दवा स्टोर" },
  { href: "/doctor-profile", icon: "🏥", label: "Hospital Profile", labelMr: "प्रोफाइल", labelHi: "प्रोफाइल" },
];

export default function AppNav() {
  const { pathname, push } = useRouter();
  const { theme, lang } = useTheme();
  const [user, setUserState] = useState<StoredUser | null>(null);

  useEffect(() => {
    setUserState(getUser());
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    setUserState(null);
    push("/login");
  };

  const getLinkLabel = (l: typeof LINKS[0]) => {
    if (lang === "mr") return l.labelMr ?? l.label;
    if (lang === "hi") return l.labelHi ?? l.label;
    return l.label;
  };

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 24px",
      background: theme.surface,
      borderBottom: `1px solid ${theme.border}`,
      backdropFilter: "blur(16px)",
      position: "sticky", top: 46, zIndex: 90,
      fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
      transition: "background 0.3s, border-color 0.3s",
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "linear-gradient(135deg,#c41e3a,#e53e3e)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, boxShadow: "0 3px 10px rgba(196,30,58,0.4)",
        }}>
          ⚕
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: theme.text, letterSpacing: "-0.3px" }}>
          Prescripto
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {LINKS.map(l => {
          const active = pathname === l.href;
          return (
            <Link key={l.href} href={l.href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 10,
                fontSize: 12, fontWeight: active ? 800 : 600,
                backgroundColor: active ? `${theme.accent}18` : "transparent",
                border: active ? `1px solid ${theme.accent}40` : "1px solid transparent",
                color: active ? theme.accent : theme.textMuted,
                transition: "all 0.2s",
                cursor: "pointer",
              }}>
                <span>{l.icon}</span>
                <span style={{ fontFamily: "'Noto Sans Devanagari','Inter',Arial,sans-serif" }}>
                  {getLinkLabel(l)}
                </span>
              </div>
            </Link>
          );
        })}

        {/* User Auth state */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 12, paddingLeft: 12, borderLeft: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 11, textAlign: "right" }}>
              <div style={{ color: theme.text, fontWeight: 700 }}>{user.full_name || "Doctor"}</div>
              <div style={{ color: theme.accent, fontSize: 9.5, fontWeight: 800 }}>{user.role}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: theme.inputBg, border: `1px solid ${theme.border}`,
                color: theme.textMuted, padding: "6px 12px", borderRadius: 8, fontSize: 11,
                fontWeight: 700, cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link href="/login" style={{ textDecoration: "none", marginLeft: 8 }}>
            <div style={{
              background: "linear-gradient(135deg,#c41e3a,#e53e3e)",
              color: "white", padding: "7px 14px", borderRadius: 8, fontSize: 12,
              fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 8px rgba(196,30,58,0.3)",
            }}>
              Sign In
            </div>
          </Link>
        )}
      </div>
    </nav>
  );
}
