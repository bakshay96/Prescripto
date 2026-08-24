"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeContext";
import { PRIMARY_BASE, getUser } from "../utils/api";

export interface SystemNotification {
  id: string;
  type: "SUBSCRIPTION" | "BROADCAST" | "PROFILE" | "SYSTEM" | "MESSAGE";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority?: "INFO" | "WARNING" | "CRITICAL";
  expires_at?: string | null;
  reping_count?: number;
}

/**
 * Synthesizes a crisp, pleasant two-tone audio chime notification using Web Audio API.
 * No external MP3 file or network dependency required!
 */
export function playNotificationSound(type: "chime" | "alert" = "chime") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "chime") {
      // Pleasant 2-tone harmonic chime (880Hz A5 -> 1318.5Hz E6)
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.5, now + 0.12);
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } else {
      // Alert sound
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch {
    // Audio context prevented by browser autoplay policy until first click
  }
}

export default function RealtimeNotificationPanel() {
  const { theme, themeId } = useTheme();
  const isDark = themeId !== "light";

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [activeToast, setActiveToast] = useState<SystemNotification | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Load initial stored notifications
    try {
      const saved = localStorage.getItem("prescripto_notifications");
      if (saved) setNotifications(JSON.parse(saved));
    } catch {}

    // Initialize Persistent WebSocket Connection
    connectWebSocket();

    // Event listener for subscription updates
    const handleSubUpdate = (e: any) => {
      const planName = e.detail?.plan || "PRO";
      addNotification({
        id: `sub_${Date.now()}`,
        type: "SUBSCRIPTION",
        title: "💳 Subscription Updated Live",
        message: `Your hospital subscription plan was successfully set to ${planName}. All features are unlocked!`,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        read: false,
        priority: "INFO",
      });
    };

    // Event listener for broadcast alerts
    const handleBroadcast = (e: any) => {
      const msg = e.detail?.message || "New message from Master Admin Control Center.";
      const title = e.detail?.subject || "📢 Master Admin Broadcast";
      addNotification({
        id: `bc_${Date.now()}`,
        type: "BROADCAST",
        title,
        message: msg,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        read: false,
        priority: e.detail?.priority || "WARNING",
      });
    };

    // Event listener for profile updates
    const handleProfileUpdate = (e: any) => {
      const docName = e.detail?.doctor_name_en || "Profile";
      addNotification({
        id: `prof_${Date.now()}`,
        type: "PROFILE",
        title: "🏥 Hospital Profile Synced",
        message: `Owner info updated for ${docName}. Changes live in Master Admin directory!`,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        read: false,
        priority: "INFO",
      });
    };

    window.addEventListener("subscription-updated", handleSubUpdate);
    window.addEventListener("admin-broadcast", handleBroadcast);
    window.addEventListener("profile-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("subscription-updated", handleSubUpdate);
      window.removeEventListener("admin-broadcast", handleBroadcast);
      window.removeEventListener("profile-updated", handleProfileUpdate);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const user = getUser();
      const clientId = user?.clinic_id || user?.role || `guest_${Date.now()}`;
      const wsProto = PRIMARY_BASE.startsWith("https") ? "wss" : "ws";
      const host = PRIMARY_BASE.replace(/^https?:\/\//, "");
      const wsUrl = `${wsProto}://${host}/api/v1/ws/${clientId}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === "broadcast_message" || payload.event === "reping_message" || payload.event === "chat_message") {
            addNotification({
              id: `ws_${Date.now()}`,
              type: payload.event === "chat_message" ? "MESSAGE" : "BROADCAST",
              title: payload.title || "📢 Live Broadcast Message",
              message: payload.message || "New message from Master Admin / Doctor / Medical Store.",
              timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
              read: false,
              priority: payload.priority || "WARNING",
              expires_at: payload.expires_at,
            });
          }
        } catch {
          // ignore ping
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        // Auto-reconnect after 4 seconds
        setTimeout(connectWebSocket, 4000);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      socketRef.current = ws;
    } catch {
      setWsConnected(false);
    }
  };

  const addNotification = (notif: SystemNotification) => {
    // Play sound chime
    playNotificationSound(notif.priority === "WARNING" || notif.priority === "CRITICAL" ? "alert" : "chime");

    // Display Toast overlay
    setActiveToast(notif);

    // Save to list
    setNotifications((prev) => {
      const updated = [notif, ...prev.slice(0, 24)];
      try { localStorage.setItem("prescripto_notifications", JSON.stringify(updated)); } catch {}
      return updated;
    });

    // Auto dismiss Toast after 6 seconds
    setTimeout(() => {
      setActiveToast((current) => (current?.id === notif.id ? null : current));
    }, 6000);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    try { localStorage.setItem("prescripto_notifications", JSON.stringify(updated)); } catch {}
  };

  return (
    <>
      {/* Real-time Sound & Floating Toast Popup */}
      {activeToast && (
        <div
          className="fixed top-14 right-4 z-[99999] max-w-sm w-full p-4 rounded-2xl border shadow-2xl backdrop-blur-md animate-bounce-short cursor-pointer"
          style={{
            background: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
            borderColor: activeToast.priority === "WARNING" || activeToast.priority === "CRITICAL" ? "#ff671f" : "#005691",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
          onClick={() => setActiveToast(null)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black flex items-center gap-2" style={{ color: activeToast.priority === "WARNING" ? "#ff671f" : "#005691" }}>
                <span>{activeToast.title}</span>
                <span className="ux4g-badge ux4g-badge-green text-[8px]">LIVE WS</span>
              </div>
              <div className="text-xs mt-1 font-semibold" style={{ color: theme.text }}>
                {activeToast.message}
              </div>
              <div className="text-[10px] text-slate-400 mt-2 font-bold flex items-center gap-2">
                <span>🔊 Audio Notified</span>
                <span>• {activeToast.timestamp}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveToast(null); }}
              className="text-xs font-black text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Floating Bell Trigger for Notification Panel */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setPanelOpen(!panelOpen)}
          className="relative p-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 hover:scale-110 transition-transform duration-200"
          title="Open Real-time Notifications Panel"
        >
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-900 animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Slide-up Panel */}
        {panelOpen && (
          <div
            className="absolute bottom-16 right-0 w-84 max-h-[440px] rounded-2xl border shadow-2xl overflow-hidden flex flex-col z-50 backdrop-blur-md"
            style={{
              background: isDark ? "#0f172a" : "#ffffff",
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
            }}
          >
            <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black" style={{ color: theme.text }}>🔔 Live Alerts &amp; Vitals</span>
                <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} title={wsConnected ? "WebSocket Connected" : "Connecting..."} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-sky-400 hover:underline"
                >
                  Mark read
                </button>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="text-xs font-black text-slate-400"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-2 space-y-2 overflow-y-auto flex-1 text-xs">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 font-semibold text-xs">
                  No notifications yet. Subscription updates, hospital name edits, and broadcasts appear here in real-time with sound!
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl border transition-all ${n.read ? "opacity-75" : "border-amber-500/40 bg-amber-500/5"}`}
                    style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}
                  >
                    <div className="flex justify-between items-center font-bold text-[11px]" style={{ color: theme.text }}>
                      <span>{n.title}</span>
                      <span className="text-[9px] text-slate-400 font-normal">{n.timestamp}</span>
                    </div>
                    <div className="text-[11px] mt-1" style={{ color: theme.textMuted }}>
                      {n.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
