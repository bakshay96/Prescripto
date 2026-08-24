import Head from "next/head";
import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";
import RoleGuard from "../components/RoleGuard";
import VerticalSidebarNav from "../components/VerticalSidebarNav";
import {
  listApiNotifications,
  markApiNotificationsRead,
  sendApiBroadcastNotification,
  repingApiNotification,
  triggerWsBroadcastApi,
  SystemApiNotification,
  getUser,
} from "../utils/api";
import { playNotificationSound } from "../components/RealtimeNotificationPanel";

function NotificationsHubContent() {
  const { theme, lang } = useTheme();
  const isDark = theme.id !== "light";

  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<SystemApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Master Admin Broadcast Form state
  const [bCategory, setBCategory] = useState("FEATURE_ALERT");
  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [bTargetRole, setBTargetRole] = useState("ALL");
  const [bPriority, setBPriority] = useState("INFO");
  const [bExpiryHours, setBExpiryHours] = useState(168); // default 7 days
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  useEffect(() => {
    setUser(getUser());
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const docs = await listApiNotifications();
      setNotifications(docs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async () => {
    try {
      await markApiNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bTitle.trim() || !bMessage.trim()) return;

    setSendingBroadcast(true);
    setBroadcastSuccess(null);

    try {
      const res = await sendApiBroadcastNotification({
        category: bCategory,
        title: bTitle.trim(),
        message: bMessage.trim(),
        target_role: bTargetRole,
        priority: bPriority,
        expiry_hours: bExpiryHours,
      });

      setBroadcastSuccess(res.message);
      setBTitle("");
      setBMessage("");
      loadNotifications();

      // Play audio chime
      playNotificationSound(bPriority === "CRITICAL" ? "alert" : "chime");

      // Dispatch WebSocket & local events
      await triggerWsBroadcastApi({
        event: "broadcast_message",
        title: bTitle,
        message: bMessage,
        target_role: bTargetRole,
        priority: bPriority,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("admin-broadcast", {
            detail: {
              subject: bTitle,
              message: bMessage,
              priority: bPriority,
            },
          })
        );
      }
    } catch {
      // ignore
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleReping = async (n: SystemApiNotification) => {
    try {
      const res = await repingApiNotification(n.id);
      setBroadcastSuccess(res.message);
      loadNotifications();
      playNotificationSound("alert");

      // Trigger WS broadcast & local toast
      await triggerWsBroadcastApi({
        event: "reping_message",
        title: `🔁 [RE-PING] ${n.title}`,
        message: n.message,
        priority: "WARNING",
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("admin-broadcast", {
            detail: {
              subject: `🔁 [RE-PING] ${n.title}`,
              message: n.message,
              priority: "WARNING",
            },
          })
        );
      }
    } catch {
      // ignore
    }
  };

  const filtered = selectedCategory === "ALL"
    ? notifications
    : notifications.filter((n) => n.category === selectedCategory);

  const isMasterAdmin = user?.role === "MASTER_ADMIN";

  return (
    <>
      <Head>
        <title>Notifications &amp; Feature Alerts Hub — Prescripto</title>
        <meta name="description" content="View pricing updates, new feature alerts, system announcements and Master Admin broadcasts." />
      </Head>

      <div
        className="flex h-[calc(100vh-76px)] overflow-hidden"
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
        }}
      >
        <VerticalSidebarNav mode={isMasterAdmin ? "ADMIN" : "DOCTOR"} />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto space-y-6 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔔</span>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.text, margin: 0 }}>
                  {lang === "mr" ? "सूचना व नवीन वैशिष्ट्ये केंद्र" : "Notifications & Feature Alerts Hub"}
                </h1>
                <span className="ux4g-badge ux4g-badge-gov">REALTIME AUDIO NOTIFIED</span>
              </div>
              <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
                Stay updated with subscription pricing, platform features, Master Admin messages, and hospital vitals.
              </p>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={handleMarkRead} className="ux4g-btn ux4g-btn-outline">
                ✓ Mark All Read
              </button>
              <button type="button" onClick={loadNotifications} className="ux4g-btn ux4g-btn-saffron">
                🔄 Sync Alerts
              </button>
            </div>
          </div>

          {/* Master Admin Broadcast Composer & Configuration Panel */}
          {isMasterAdmin && (
            <div
              className="p-5 rounded-2xl border space-y-4 shadow-md"
              style={{
                background: isDark ? "linear-gradient(135deg,#005691 0%,#0b192c 100%)" : "linear-gradient(135deg,#e0f2fe 0%,#ffffff 100%)",
                borderColor: "#005691",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-black flex items-center gap-2" style={{ color: isDark ? "#ffffff" : "#005691" }}>
                  <span>📢 Master Admin Broadcast &amp; Notification Configuration Center</span>
                  <span className="ux4g-badge ux4g-badge-saffron">MASTER ADMIN ONLY</span>
                </div>
              </div>

              {broadcastSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-xs font-bold flex items-center justify-between">
                  <span>✅ {broadcastSuccess}</span>
                  <button type="button" onClick={() => setBroadcastSuccess(null)} className="font-black">✕</button>
                </div>
              )}

              <form onSubmit={handleSendBroadcast} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-bold block mb-1">Alert Category</label>
                    <select
                      value={bCategory}
                      onChange={(e) => setBCategory(e.target.value)}
                      className="ux4g-input w-full"
                    >
                      <option value="FEATURE_ALERT">✨ New Feature Alert</option>
                      <option value="PRICING">💳 Pricing &amp; Subscription Update</option>
                      <option value="BROADCAST">📢 System Announcement</option>
                      <option value="SYSTEM">⚠️ Hospital Vitals &amp; Maintenance</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold block mb-1">Target Portal Audience</label>
                    <select
                      value={bTargetRole}
                      onChange={(e) => setBTargetRole(e.target.value)}
                      className="ux4g-input w-full"
                    >
                      <option value="ALL">🌐 All Portals (Hospitals, Doctors, Pharmacies)</option>
                      <option value="DOCTOR">👨‍⚕️ Doctors Only</option>
                      <option value="PHARMACIST">💊 Medical Shops &amp; Pharmacies Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold block mb-1">Notification Priority</label>
                    <select
                      value={bPriority}
                      onChange={(e) => setBPriority(e.target.value)}
                      className="ux4g-input w-full"
                    >
                      <option value="INFO">ℹ️ Info Notification</option>
                      <option value="WARNING">⚠️ High Priority Alert</option>
                      <option value="CRITICAL">🚨 Critical Broadcast</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold block mb-1">Message Expiry Duration</label>
                    <select
                      value={bExpiryHours}
                      onChange={(e) => setBExpiryHours(Number(e.target.value))}
                      className="ux4g-input w-full"
                    >
                      <option value={24}>⏳ 24 Hours</option>
                      <option value={72}>⏳ 3 Days (72 Hours)</option>
                      <option value={168}>⏳ 7 Days (168 Hours)</option>
                      <option value={720}>⏳ 30 Days (720 Hours)</option>
                      <option value={0}>♾️ Never Expire</option>
                    </select>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Broadcast Subject / Title e.g. ✨ Unlimited Digital Prescriptions Unlocked!"
                    value={bTitle}
                    onChange={(e) => setBTitle(e.target.value)}
                    required
                    className="ux4g-input w-full"
                    style={{ fontSize: 12 }}
                  />
                </div>

                <div>
                  <textarea
                    placeholder="Broadcast Message Content for Doctors & Medical Stores..."
                    value={bMessage}
                    onChange={(e) => setBMessage(e.target.value)}
                    required
                    rows={2}
                    className="ux4g-input w-full"
                    style={{ fontSize: 12 }}
                  />
                </div>

                <div className="text-right">
                  <button
                    type="submit"
                    disabled={sendingBroadcast}
                    className="ux4g-btn ux4g-btn-saffron px-6 shadow-md"
                  >
                    {sendingBroadcast ? "Dispatching..." : "🚀 Send Broadcast Notification with Live Sound"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: "ALL", label: "🌟 All Alerts" },
              { id: "FEATURE_ALERT", label: "✨ New Feature Alerts" },
              { id: "PRICING", label: "💳 Pricing & Subscriptions" },
              { id: "BROADCAST", label: "📢 Master Admin Messages" },
              { id: "SYSTEM", label: "⚠️ System Updates" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  selectedCategory === cat.id ? "bg-amber-500 text-white border-amber-500" : "hover:scale-[1.02]"
                }`}
                style={{
                  background: selectedCategory === cat.id ? "#ff671f" : isDark ? "#0f172a" : "#ffffff",
                  borderColor: selectedCategory === cat.id ? "#ff671f" : isDark ? "#1e293b" : "#e2e8f0",
                  color: selectedCategory === cat.id ? "#ffffff" : theme.text,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div
            className="p-5 rounded-2xl border space-y-3"
            style={{
              background: isDark ? "#0f172a" : "#ffffff",
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
            }}
          >
            {loading ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">
                Loading notifications hub…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">
                No notifications matching selected filter.
              </div>
            ) : (
              filtered.map((n) => {
                const getCategoryBadge = (cat: string) => {
                  switch (cat) {
                    case "FEATURE_ALERT": return { badge: "✨ FEATURE", class: "ux4g-badge-blue" };
                    case "PRICING": return { badge: "💳 PRICING", class: "ux4g-badge-amber" };
                    case "BROADCAST": return { badge: "📢 BROADCAST", class: "ux4g-badge-saffron" };
                    default: return { badge: "ℹ️ SYSTEM", class: "ux4g-badge-gov" };
                  }
                };

                const catBadge = getCategoryBadge(n.category);

                return (
                  <div
                    key={n.id}
                    className={`p-4 rounded-xl border transition-all space-y-2 ${
                      !n.read ? "border-amber-500/50 bg-amber-500/5" : ""
                    }`}
                    style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`ux4g-badge ${catBadge.class} text-[9px]`}>
                          {catBadge.badge}
                        </span>
                        <span className="text-sm font-black" style={{ color: theme.text }}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="ux4g-badge ux4g-badge-red text-[8px] animate-pulse">NEW</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {isMasterAdmin && (
                          <button
                            type="button"
                            onClick={() => handleReping(n)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 transition-colors"
                            title="Re-Ping this notification to alert active users again with live audio sound!"
                          >
                            🔁 Re-Ping User {n.reping_count ? `(${n.reping_count})` : ""}
                          </button>
                        )}
                        <div className="text-[10px] font-bold text-slate-400">
                          {n.expires_at ? `⏳ Expires: ${new Date(n.expires_at).toLocaleDateString("en-IN")}` : "♾️ Permanent"} · {new Date(n.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-semibold leading-relaxed" style={{ color: theme.textMuted }}>
                      {n.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function NotificationsHubPage() {
  return (
    <RoleGuard allowedRoles={["DOCTOR", "PHARMACIST", "MASTER_ADMIN"]}>
      <NotificationsHubContent />
    </RoleGuard>
  );
}
