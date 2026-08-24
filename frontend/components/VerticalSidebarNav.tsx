"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTheme } from "./ThemeContext";
import { getUser, clearToken, StoredUser } from "../utils/api";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href?: string;
  badge?: string | number | null;
  badgeColor?: string;
  onClick?: () => void;
}

interface VerticalSidebarNavProps {
  mode: "DOCTOR" | "PHARMACIST" | "ADMIN";
  activeTab?: string;
  onTabSelect?: (tabId: string) => void;
  onSubscriptionClick?: () => void;
  adminBadges?: {
    hospitals?: number;
    users?: string | number | null;
    plans?: number;
    trials?: number;
    broadcast?: number;
    queries?: string | number | null;
  };
}

export default function VerticalSidebarNav({
  mode,
  activeTab,
  onTabSelect,
  onSubscriptionClick,
  adminBadges,
}: VerticalSidebarNavProps) {
  const { pathname, push } = useRouter();
  const { theme, themeId, lang } = useTheme();
  const isDark = themeId !== "light";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);

  const accentColor = mode === "ADMIN" ? "#005691" : "#c41e3a";
  const accentGlow = mode === "ADMIN" ? "rgba(0,86,145,0.5)" : "rgba(196,30,58,0.5)";
  const accentGrad = mode === "ADMIN"
    ? "linear-gradient(135deg,#005691,#0b192c)"
    : "linear-gradient(135deg,#c41e3a,#e53e3e)";

  useEffect(() => {
    setUser(getUser());
    try {
      const saved = localStorage.getItem("prescripto_sidebar_collapsed");
      if (saved !== null) setCollapsed(saved === "true");
    } catch {}
  }, [pathname]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("prescripto_sidebar_collapsed", String(next)); } catch {}
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    push("/login");
  };

  const doctorItems: NavItem[] = [
    { id: "prescription", label: lang === "mr" ? "प्रिस्क्रिप्शन लिहा" : "Prescription Writer", icon: "✍️", href: "/prescription" },
    { id: "patients", label: lang === "mr" ? "रुग्ण नोंदणी" : "Patient Directory", icon: "👥", href: "/doctor/patients" },
    { id: "messages", label: lang === "mr" ? "औषध दुकान चॅट" : "Doctor-Pharmacy Chat", icon: "💬", href: "/doctor/messages" },
    { id: "notifications", label: lang === "mr" ? "सूचना व अपडेट्स" : "Notifications & Alerts", icon: "🔔", href: "/notifications" },
    { id: "profile", label: lang === "mr" ? "डॉक्टर प्रोफाइल" : "Doctor Profile & Header", icon: "🏥", href: "/doctor-profile" },
    { id: "subscription", label: lang === "mr" ? "सबस्क्रिप्शन" : "Subscription & Payment", icon: "💳", href: "/billing", onClick: onSubscriptionClick },
  ];

  const pharmacistItems: NavItem[] = [
    { id: "inventory", label: lang === "mr" ? "औषध साठा व बिलिंग" : "Inventory & Billing Desk", icon: "📦", href: "/inventory" },
    { id: "messages", label: lang === "mr" ? "डॉक्टर संवाद चॅट" : "Doctor-Pharmacy Chat", icon: "💬", href: "/doctor/messages" },
    { id: "notifications", label: lang === "mr" ? "सूचना व अपडेट्स" : "Notifications & Alerts", icon: "🔔", href: "/notifications" },
  ];

  const adminItems: NavItem[] = [
    { id: "overview", label: "System Analytics", icon: "📊", badge: adminBadges?.hospitals ? `${adminBadges.hospitals} Hosp` : null, badgeColor: "ux4g-badge-gov" },
    { id: "hospitals", label: "Hospitals & Stores", icon: "🏥", badge: adminBadges?.hospitals, badgeColor: "ux4g-badge-saffron" },
    { id: "users", label: "Live User Vitals", icon: "👥", badge: adminBadges?.users, badgeColor: "ux4g-badge-green" },
    { id: "plans", label: "Plans & Pricing", icon: "💳", badge: adminBadges?.plans, badgeColor: "ux4g-badge-amber" },
    { id: "trials", label: "Subscriptions & Trials", icon: "⭐", badge: adminBadges?.trials, badgeColor: "ux4g-badge-blue" },
    { id: "broadcast", label: "Broadcast Messages", icon: "📢", badge: adminBadges?.broadcast, badgeColor: "ux4g-badge-saffron" },
    { id: "notifications", label: "Notification Hub", icon: "🔔", href: "/notifications" },
    { id: "queries", label: "Support Desk", icon: "💬", badge: adminBadges?.queries, badgeColor: "ux4g-badge-red" },
  ];

  const navItems = mode === "DOCTOR" ? doctorItems : mode === "PHARMACIST" ? pharmacistItems : adminItems;

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div
        className="md:hidden sticky top-0 z-50 px-3 py-2 border-b flex items-center justify-between"
        style={{ background: theme.surface, borderColor: theme.border }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: accentGrad, color: "white", padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}
        >
          <span style={{ transition: "transform 0.3s", transform: mobileOpen ? "rotate(90deg)" : "none" }}>☰</span>
          {mobileOpen ? "Close" : mode === "ADMIN" ? "Admin Menu" : "Doctor Menu"}
        </button>
        <span style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>
          {mode === "ADMIN" ? "🛡️ Master Admin" : "👨‍⚕️ Doctor OPD"}
        </span>
      </div>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 39, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          className="md:hidden"
        />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside
        style={{
          width: collapsed ? 68 : 256,
          minWidth: collapsed ? 68 : 256,
          background: isDark
            ? "linear-gradient(170deg,#0d1528 0%,#060d1e 100%)"
            : "linear-gradient(170deg,#ffffff 0%,#f4f7fb 100%)",
          borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
          boxShadow: isDark ? "4px 0 32px rgba(0,0,0,0.4)" : "4px 0 20px rgba(0,0,0,0.05)",
          backdropFilter: "blur(20px)",
          transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          overflow: "visible",
        }}
        className={`
          fixed md:sticky top-0 z-40 h-full flex flex-col justify-between shrink-0 overflow-y-auto overflow-x-visible
          ${mobileOpen ? "left-0 shadow-2xl !w-[256px]" : "-left-72 md:left-0"}
        `}
      >
        {/* ── Floating Toggle Button (right-edge pill) ── */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="hidden md:flex absolute items-center justify-center font-black text-white z-50 cursor-pointer select-none"
          style={{
            right: -14,
            top: 28,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: accentGrad,
            boxShadow: `0 0 0 3px ${isDark ? "#0d1528" : "#ffffff"}, 0 4px 16px ${accentGlow}`,
            fontSize: 13,
            lineHeight: 1,
            border: `2px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
            transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          ›
        </button>

        {/* ── Inner content ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: collapsed ? "12px 8px" : "12px" }}>

          {/* Brand Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : 10,
              paddingBottom: 10,
              marginBottom: 4,
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
              justifyContent: collapsed ? "center" : "flex-start",
              overflow: "hidden",
            }}
          >
            {/* Brand icon — always visible */}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: accentGrad,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
                boxShadow: `0 4px 12px ${accentGlow}`,
                transition: "transform 0.3s",
              }}
            >
              {mode === "ADMIN" ? "🛡️" : "⚕️"}
            </div>

            {/* Title — only in max mode */}
            {!collapsed && (
              <div style={{ overflow: "hidden", transition: "all 0.3s" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: theme.text, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                  {mode === "ADMIN" ? "Master Admin" : "Doctor OPD"}
                </div>
                <div style={{ fontSize: 9, fontWeight: 800, color: accentColor, letterSpacing: 1, textTransform: "uppercase" }}>
                  Navigation Panel
                </div>
              </div>
            )}
          </div>

          {/* Nav Items */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {navItems.map((item) => {
              const isActive = mode === "DOCTOR" ? pathname === item.href : activeTab === item.id;
              const isHovered = hoveredItem === item.id;

              const itemEl = (
                <div
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    else if (mode === "ADMIN" && onTabSelect) onTabSelect(item.id);
                    setMobileOpen(false);
                  }}
                  title={collapsed ? item.label : undefined}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    padding: collapsed ? "10px 0" : "10px 12px",
                    borderRadius: 12,
                    cursor: "pointer",
                    background: isActive
                      ? accentGrad
                      : isHovered
                        ? isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"
                        : "transparent",
                    color: isActive ? "#fff" : isHovered ? (isDark ? "#ffffff" : "#000000") : theme.textMuted,
                    boxShadow: isActive ? `0 4px 18px ${accentGlow}` : isHovered ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                    transform: isHovered && !isActive ? "translateX(3px)" : "none",
                    transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : 10, minWidth: 0 }}>
                    <span style={{
                      fontSize: 18,
                      flexShrink: 0,
                      display: "inline-block",
                      transition: "transform 0.25s",
                      transform: isHovered ? "scale(1.2) rotate(-5deg)" : "scale(1) rotate(0deg)",
                    }}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span style={{
                        fontSize: 12,
                        fontWeight: isActive ? 900 : 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        transition: "color 0.2s",
                      }}>
                        {item.label}
                      </span>
                    )}
                  </div>

                  {/* Badge (max mode only) */}
                  {!collapsed && item.badge !== undefined && item.badge !== null && (
                    <span
                      className={`ux4g-badge ${isActive ? "bg-white text-slate-900" : item.badgeColor || "ux4g-badge-gov"}`}
                      style={{ fontSize: 9, fontWeight: 900, flexShrink: 0 }}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Collapsed tooltip */}
                  {collapsed && (
                    <div
                      style={{
                        position: "absolute",
                        left: "calc(100% + 10px)",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: isDark ? "#0f172a" : "#1e293b",
                        color: "#ffffff",
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        opacity: isHovered ? 1 : 0,
                        transition: "opacity 0.2s",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                        zIndex: 9999,
                        border: `1px solid ${isDark ? "#334155" : "#1e293b"}`,
                      }}
                    >
                      {item.label}
                      {item.badge ? <span style={{ marginLeft: 6, opacity: 0.7 }}>({item.badge})</span> : null}
                    </div>
                  )}
                </div>
              );

              if ((mode === "DOCTOR" || mode === "PHARMACIST") && item.href && !item.onClick) {
                return (
                  <Link key={item.id} href={item.href} style={{ textDecoration: "none" }} onClick={() => setMobileOpen(false)}>
                    {itemEl}
                  </Link>
                );
              }
              return <React.Fragment key={item.id}>{itemEl}</React.Fragment>;
            })}
          </nav>
        </div>

        {/* ── Footer — User info + sign out ── */}
        <div
          style={{
            padding: collapsed ? "10px 6px" : "10px 12px",
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
          }}
        >
          {!collapsed ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.full_name || (mode === "ADMIN" ? "Master Admin" : "Doctor")}
                </div>
                <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                  ACTIVE SESSION
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"; }}
              >
                Exit
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 12,
                background: "transparent",
                border: "none",
                color: "#f87171",
                fontSize: 18,
                cursor: "pointer",
                transition: "background 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              🚪
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
