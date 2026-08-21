import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useTheme } from "../components/ThemeContext";
import RoleGuard from "../components/RoleGuard";
import { TransliteratedInput, TransliteratedTextArea } from "../components/TransliteratedInput";
import {
  getUser,
  getAdminAnalytics,
  listHospitals,
  blockHospital,
  unblockHospital,
  updateSubscription,
  grantSubscriptionTrial,
  sendBroadcastMessage,
  listBroadcastMessages,
  listSupportQueries,
  respondSupportQuery,
  PlatformAnalytics,
  Hospital,
  BroadcastMessage,
  SupportQuery,
} from "../utils/api";

type AdminTab = "overview" | "hospitals" | "trials" | "broadcast" | "queries";

function AdminContent() {
  const router = useRouter();
  const { theme, themeId } = useTheme();
  const isDark = themeId !== "light";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  // Trial Modal State
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [selectedHospitalForTrial, setSelectedHospitalForTrial] = useState<Hospital | null>(null);
  const [trialDaysInput, setTrialDaysInput] = useState<number>(14);

  // Broadcast Message State
  const [msgModalOpen, setMsgModalOpen] = useState(false);
  const [msgTargetGroup, setMsgTargetGroup] = useState<string>("ALL");
  const [msgTargetClinicId, setMsgTargetClinicId] = useState<string>("");
  const [msgSubject, setMsgSubject] = useState<string>("");
  const [msgBody, setMsgBody] = useState<string>("");
  const [msgPriority, setMsgPriority] = useState<string>("INFO");
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [anData, hosData, bData, qData] = await Promise.all([
        getAdminAnalytics().catch(() => null),
        listHospitals().catch(() => []),
        listBroadcastMessages().catch(() => []),
        listSupportQueries().catch(() => []),
      ]);
      setAnalytics(anData);
      setHospitals(hosData);
      setBroadcasts(bData);
      setQueries(qData);
    } catch (err: any) {
      setError(err.message || "Failed to load Master Admin control center.");
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (hId: string, isBlocked: boolean) => {
    try {
      if (isBlocked) {
        const res = await unblockHospital(hId);
        setActionMsg(res.message);
      } else {
        const res = await blockHospital(hId);
        setActionMsg(res.message);
      }
      loadAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePlanChange = async (hId: string, plan: string) => {
    try {
      await updateSubscription(hId, plan);
      setActionMsg(`Updated subscription plan to ${plan} successfully!`);
      loadAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGrantTrial = async () => {
    if (!selectedHospitalForTrial) return;
    try {
      const res = await grantSubscriptionTrial(selectedHospitalForTrial.id, trialDaysInput);
      setActionMsg(res.message);
      setTrialModalOpen(false);
      setSelectedHospitalForTrial(null);
      loadAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSubject.trim() || !msgBody.trim()) {
      setError("Please provide a subject and message body.");
      return;
    }
    setSendingMsg(true);
    try {
      const res = await sendBroadcastMessage({
        target_group: msgTargetGroup,
        target_clinic_id: msgTargetClinicId || undefined,
        subject: msgSubject,
        message: msgBody,
        priority: msgPriority,
      });
      setActionMsg(res.message);
      setMsgModalOpen(false);
      setMsgSubject("");
      setMsgBody("");
      loadAdminData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleReply = async (queryId: string) => {
    const text = replyText[queryId];
    if (!text) return;
    try {
      await respondSupportQuery(queryId, text);
      setActionMsg("Responded to support query successfully!");
      setReplyText((prev) => ({ ...prev, [queryId]: "" }));
      loadAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.email.toLowerCase().includes(search.toLowerCase()) ||
      h.registration_number.toLowerCase().includes(search.toLowerCase()) ||
      (h.phone && h.phone.includes(search))
  );

  return (
    <>
      <Head>
        <title>Master Admin Control Center — UX4G Prescripto</title>
      </Head>

      <div
        className="ux4g-theme-govblue"
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, Arial, sans-serif",
          padding: "24px 16px 100px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          
          {/* ══ UX4G Header Strip ══ */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: `2px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 28 }}>🏛️</span>
                <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: theme.text }}>
                  Master Admin Control Center
                </h1>
                <span className="ux4g-badge ux4g-badge-gov">UX4G MASTER ADMIN</span>
                <span className="ux4g-badge ux4g-badge-saffron">GOVT COMPLIANT</span>
              </div>
              <p style={{ fontSize: 13, color: theme.textMuted, margin: "4px 0 0" }}>
                Platform-wide Healthcare Control • Hospital Medical Inspector • Subscription Trials • Multi-User Broadcasts
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => setMsgModalOpen(true)}
                className="ux4g-btn ux4g-btn-saffron"
              >
                📢 Broadcast Message
              </button>
              <button
                type="button"
                onClick={loadAdminData}
                className="ux4g-btn ux4g-btn-outline"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Action & Error Banners */}
          {actionMsg && (
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 12,
                background: "rgba(4,106,56,0.15)",
                border: "1.5px solid #046a38",
                color: isDark ? "#6ee7b7" : "#046a38",
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>✅ {actionMsg}</span>
              <button
                type="button"
                onClick={() => setActionMsg(null)}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 900 }}
              >
                ✕
              </button>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 12,
                background: "rgba(225,29,72,0.15)",
                border: "1.5px solid #e11d48",
                color: "#f43f5e",
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 20,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* ══ UX4G Navigation Tabs ══ */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { id: "overview", label: "📊 System Analytics", badge: analytics ? `${analytics.total_hospitals} Hosp` : null },
              { id: "hospitals", label: "🏥 Hospitals & Medical Stores", badge: `${hospitals.length}` },
              { id: "trials", label: "⭐ Subscription & Trial Manager", badge: `${hospitals.filter((h) => h.subscription_plan === "TRIAL" || (h.trial_days_remaining ?? 0) > 0).length}` },
              { id: "broadcast", label: "📢 Broadcast Messages", badge: `${broadcasts.length}` },
              { id: "queries", label: "💬 Support Desk", badge: queries.filter((q) => q.status === "OPEN").length ? `${queries.filter((q) => q.status === "OPEN").length} Open` : null },
            ].map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as AdminTab)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    border: `1.5px solid ${isActive ? "#ff671f" : isDark ? "#334155" : "#cbd5e1"}`,
                    background: isActive
                      ? "linear-gradient(135deg,#005691 0%,#0b192c 100%)"
                      : isDark
                      ? "#0f172a"
                      : "#ffffff",
                    color: isActive ? "#ffffff" : theme.textMuted,
                    boxShadow: isActive ? "0 4px 14px rgba(0,86,145,0.3)" : "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{t.label}</span>
                  {t.badge && (
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 900,
                        background: isActive ? "#ff671f" : isDark ? "rgba(255,255,255,0.1)" : "#f1f5f9",
                        color: "#fff",
                      }}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ════ TAB 1: SYSTEM ANALYTICS ════ */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Analytics Metric Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {[
                  { label: "Registered Hospitals", value: analytics?.total_hospitals ?? 0, icon: "🏥", color: "#005691", sub: "Active clinics" },
                  { label: "Total Platform Users", value: analytics?.total_users ?? 0, icon: "👥", color: "#ff671f", sub: "Doctors & Pharmacists" },
                  { label: "Total Prescriptions", value: analytics?.total_prescriptions ?? 0, icon: "📄", color: "#046a38", sub: "Generated across app" },
                  { label: "Medicines Cataloged", value: analytics?.total_medicines ?? 0, icon: "💊", color: "#8b5cf6", sub: "In medical stores" },
                  { label: "Active Subscriptions", value: analytics?.active_subscriptions ?? 0, icon: "⭐", color: "#d97706", sub: "Paid & Trial plans" },
                  { label: "Open Support Tickets", value: analytics?.open_queries ?? 0, icon: "💬", color: "#e11d48", sub: "Awaiting response" },
                ].map((card, idx) => (
                  <div
                    key={idx}
                    className="ux4g-card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      borderLeft: `4px solid ${card.color}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 28 }}>{card.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 900, color: card.color, textTransform: "uppercase" }}>
                        UX4G METRIC
                      </span>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: theme.text, lineHeight: 1 }}>{card.value}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: theme.text }}>{card.label}</div>
                    <div style={{ fontSize: 11, color: theme.textMuted }}>{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Quick Actions Panel */}
              <div className="ux4g-card">
                <div className="ux4g-card-header">
                  <div className="ux4g-card-title">⚡ Master Admin Quick Operations</div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab("hospitals")}
                    className="ux4g-btn ux4g-btn-primary"
                  >
                    🏥 View Hospital Medical Stats
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("trials")}
                    className="ux4g-btn ux4g-btn-saffron"
                  >
                    ⭐ Manage Subscription Trials
                  </button>
                  <button
                    type="button"
                    onClick={() => setMsgModalOpen(true)}
                    className="ux4g-btn ux4g-btn-green"
                  >
                    📢 Broadcast Multi-User Announcement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════ TAB 2: HOSPITALS & MEDICAL STORES ════ */}
          {activeTab === "hospitals" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Search Filter Bar */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <TransliteratedInput
                    placeholder="Search hospital by name, email, reg number or phone…"
                    value={search}
                    onChange={(val) => setSearch(val)}
                    className="ux4g-input"
                  />
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted }}>
                  Showing {filteredHospitals.length} of {hospitals.length} Hospitals
                </div>
              </div>

              {/* Hospital Cards List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredHospitals.length === 0 ? (
                  <div className="ux4g-card" style={{ textAlign: "center", padding: 40, color: theme.textMuted }}>
                    No hospitals found matching "{search}".
                  </div>
                ) : (
                  filteredHospitals.map((h) => {
                    const isTrial = h.subscription_plan === "TRIAL" || (h.trial_days_remaining ?? 0) > 0;
                    return (
                      <div key={h.id} className="ux4g-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Hospital Header info */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 18, fontWeight: 900, color: theme.text }}>{h.name}</span>
                              <span
                                className={`ux4g-badge ${
                                  h.subscription_active
                                    ? isTrial
                                      ? "ux4g-badge-saffron"
                                      : "ux4g-badge-green"
                                    : "ux4g-badge-gov"
                                }`}
                              >
                                {h.subscription_active ? (isTrial ? `TRIAL (${h.trial_days_remaining}D LEFT)` : h.subscription_plan) : "BLOCKED"}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
                              📧 {h.email} · 📞 {h.phone || "N/A"} · 📜 Reg: {h.registration_number || "REG-N/A"} · 📍 {h.address || "Location N/A"}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            {/* Plan Selector */}
                            <select
                              value={h.subscription_plan}
                              onChange={(e) => handlePlanChange(h.id, e.target.value)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                background: isDark ? "#020617" : "#ffffff",
                                border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
                                color: theme.text,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              <option value="FREE">FREE Plan</option>
                              <option value="TRIAL">TRIAL Plan</option>
                              <option value="PRO">PRO Plan</option>
                              <option value="ENTERPRISE">ENTERPRISE Plan</option>
                            </select>

                            {/* Add Trial Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHospitalForTrial(h);
                                setTrialModalOpen(true);
                              }}
                              className="ux4g-btn ux4g-btn-saffron"
                              style={{ padding: "6px 12px", fontSize: 11 }}
                            >
                              ⭐ Add Trial
                            </button>

                            {/* Block / Unblock */}
                            <button
                              type="button"
                              onClick={() => handleBlock(h.id, !h.subscription_active)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 900,
                                border: "none",
                                cursor: "pointer",
                                background: h.subscription_active ? "rgba(225,29,72,0.2)" : "rgba(4,106,56,0.2)",
                                color: h.subscription_active ? "#f43f5e" : "#10b981",
                              }}
                            >
                              {h.subscription_active ? "🚫 Block" : "✅ Unblock"}
                            </button>
                          </div>
                        </div>

                        {/* Medical Stats Breakdown Row */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                            gap: 10,
                            padding: 12,
                            borderRadius: 12,
                            background: isDark ? "rgba(2,6,23,0.6)" : "#f8fafc",
                            border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted, textTransform: "uppercase" }}>👨‍⚕️ Doctors</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#005691" }}>{h.doctor_count ?? 1} Registered</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted, textTransform: "uppercase" }}>💊 Medical Shops</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#046a38" }}>{h.pharmacist_count ?? 1} Connected</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted, textTransform: "uppercase" }}>📄 Prescriptions</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#ff671f" }}>{h.prescription_count ?? 0} Issued</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted, textTransform: "uppercase" }}>👤 Patients</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#8b5cf6" }}>{h.patient_count ?? 0} Patients</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted, textTransform: "uppercase" }}>🧪 Medicines in Inventory</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#d97706" }}>{h.medicine_count ?? 0} Items</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ════ TAB 3: SUBSCRIPTION & TRIAL MANAGER ════ */}
          {activeTab === "trials" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="ux4g-card">
                <div className="ux4g-card-header">
                  <div className="ux4g-card-title">⭐ Subscription Trial Management</div>
                </div>
                <p style={{ fontSize: 13, color: theme.textMuted, margin: 0 }}>
                  Master Admin can assign 7-day, 14-day, 30-day or custom trial periods to any registered hospital or clinic.
                  Hospitals on trial get full access to prescription writing, inventory tools, and patient history.
                </p>
              </div>

              {/* Table of Trials */}
              <div className="ux4g-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: isDark ? "#020617" : "#f1f5f9", borderBottom: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}` }}>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Hospital Name</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Plan</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Trial Days Left</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Valid Until</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hospitals.map((h) => {
                      const trialDays = h.trial_days_remaining ?? 0;
                      return (
                        <tr key={h.id} style={{ borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}` }}>
                          <td style={{ padding: "12px 16px", fontWeight: 800 }}>{h.name}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span className="ux4g-badge ux4g-badge-gov">{h.subscription_plan}</span>
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 900, color: trialDays > 0 ? "#ff671f" : theme.textMuted }}>
                            {trialDays > 0 ? `⭐ ${trialDays} Days` : "Expired / No Trial"}
                          </td>
                          <td style={{ padding: "12px 16px", color: theme.textMuted, fontSize: 12 }}>
                            {h.subscription_valid_until ? new Date(h.subscription_valid_until).toLocaleDateString("en-IN") : "N/A"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHospitalForTrial(h);
                                setTrialModalOpen(true);
                              }}
                              className="ux4g-btn ux4g-btn-saffron"
                              style={{ padding: "4px 10px", fontSize: 11 }}
                            >
                              + Grant Trial
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════ TAB 4: BROADCAST MESSAGING ════ */}
          {activeTab === "broadcast" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="ux4g-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="ux4g-card-title">📢 Multi-User &amp; Targeted Broadcast Center</div>
                  <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
                    Send announcements, system updates, or emergency notifications to all users, doctors, or pharmacies.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMsgModalOpen(true)}
                  className="ux4g-btn ux4g-btn-saffron"
                >
                  ➕ New Broadcast Message
                </button>
              </div>

              {/* Sent Broadcasts History */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {broadcasts.length === 0 ? (
                  <div className="ux4g-card" style={{ textAlign: "center", padding: 40, color: theme.textMuted }}>
                    No broadcast messages sent yet. Click "New Broadcast Message" to compose one.
                  </div>
                ) : (
                  broadcasts.map((b) => (
                    <div key={b.id} className="ux4g-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 900, color: theme.text }}>{b.subject}</span>
                          <span
                            className={`ux4g-badge ${
                              b.priority === "CRITICAL_ALERT"
                                ? "ux4g-badge-saffron"
                                : b.priority === "WARNING"
                                ? "ux4g-badge-gov"
                                : "ux4g-badge-green"
                            }`}
                          >
                            {b.priority}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: theme.textMuted }}>
                          Target: <strong>{b.target_group}</strong> · Sent {new Date(b.created_at).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: theme.textMuted, margin: 0 }}>{b.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ════ TAB 5: SUPPORT QUERIES ════ */}
          {activeTab === "queries" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {queries.length === 0 ? (
                <div className="ux4g-card" style={{ padding: 40, textAlign: "center", color: theme.textMuted }}>
                  No open support tickets.
                </div>
              ) : (
                queries.map((q) => (
                  <div key={q.id} className="ux4g-card">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: theme.text }}>{q.subject}</span>
                      <span
                        className={`ux4g-badge ${q.status === "OPEN" ? "ux4g-badge-saffron" : "ux4g-badge-green"}`}
                      >
                        {q.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: theme.textMuted, margin: "0 0 12px" }}>{q.message}</p>

                    {q.admin_response ? (
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          background: isDark ? "#020617" : "#f1f5f9",
                          fontSize: 12,
                          borderLeft: "3px solid #046a38",
                        }}
                      >
                        <span style={{ fontWeight: 800, color: "#046a38" }}>Admin Reply: </span>
                        {q.admin_response}
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <TransliteratedInput
                          placeholder="Type resolution reply..."
                          value={replyText[q.id] || ""}
                          onChange={(val) => setReplyText({ ...replyText, [q.id]: val })}
                          className="ux4g-input"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => handleReply(q.id)}
                          className="ux4g-btn ux4g-btn-primary"
                        >
                          Reply &amp; Resolve
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* ════ MODAL 1: GRANT SUBSCRIPTION TRIAL ════ */}
      {trialModalOpen && selectedHospitalForTrial && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="ux4g-card"
            style={{ width: 440, maxWidth: "100%", background: isDark ? "#0f172a" : "#ffffff" }}
          >
            <div className="ux4g-card-header">
              <div className="ux4g-card-title">⭐ Grant Subscription Trial</div>
              <button
                type="button"
                onClick={() => setTrialModalOpen(false)}
                style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 16, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted }}>Hospital / Clinic Target:</label>
                <div style={{ fontSize: 16, fontWeight: 900, color: theme.text, marginTop: 2 }}>
                  {selectedHospitalForTrial.name}
                </div>
                <div style={{ fontSize: 11, color: theme.textMuted }}>
                  Current Plan: {selectedHospitalForTrial.subscription_plan}
                </div>
              </div>

              {/* Pre-set trial buttons */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted, display: "block", marginBottom: 6 }}>
                  Select Trial Duration:
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[7, 14, 30, 60].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setTrialDaysInput(days)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: 8,
                        border: `1.5px solid ${trialDaysInput === days ? "#ff671f" : isDark ? "#334155" : "#cbd5e1"}`,
                        background: trialDaysInput === days ? "#ff671f" : "transparent",
                        color: trialDaysInput === days ? "#ffffff" : theme.text,
                        fontWeight: 900,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom days input */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted, display: "block", marginBottom: 4 }}>
                  Or enter custom trial days:
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={trialDaysInput}
                  onChange={(e) => setTrialDaysInput(parseInt(e.target.value) || 7)}
                  className="ux4g-input"
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setTrialModalOpen(false)}
                  className="ux4g-btn ux4g-btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGrantTrial}
                  className="ux4g-btn ux4g-btn-saffron"
                  style={{ flex: 1 }}
                >
                  Activate Trial
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL 2: COMPOSE BROADCAST MESSAGE ════ */}
      {msgModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="ux4g-card"
            style={{ width: 520, maxWidth: "100%", background: isDark ? "#0f172a" : "#ffffff" }}
          >
            <div className="ux4g-card-header">
              <div className="ux4g-card-title">📢 Compose Multi-User Broadcast</div>
              <button
                type="button"
                onClick={() => setMsgModalOpen(false)}
                style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 16, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted, display: "block", marginBottom: 4 }}>
                  Target Recipients *
                </label>
                <select
                  value={msgTargetGroup}
                  onChange={(e) => setMsgTargetGroup(e.target.value)}
                  className="ux4g-input"
                >
                  <option value="ALL">🌐 All Registered Users (Multi-User Broadcast)</option>
                  <option value="DOCTORS">👨‍⚕️ All Doctors</option>
                  <option value="PHARMACISTS">💊 All Pharmacists &amp; Medical Shops</option>
                  <option value="HOSPITALS">🏥 All Registered Hospitals</option>
                  <option value="SPECIFIC">🎯 Specific Target Hospital</option>
                </select>
              </div>

              {msgTargetGroup === "SPECIFIC" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted, display: "block", marginBottom: 4 }}>
                    Select Specific Target Hospital *
                  </label>
                  <select
                    value={msgTargetClinicId}
                    onChange={(e) => setMsgTargetClinicId(e.target.value)}
                    className="ux4g-input"
                    required
                  >
                    <option value="">-- Choose Target Hospital --</option>
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted, display: "block", marginBottom: 4 }}>
                    Subject *
                  </label>
                  <TransliteratedInput
                    required
                    placeholder="e.g. System Maintenance Notice / दिवाळीच्या हार्दिक शुभेच्छा"
                    value={msgSubject}
                    onChange={(val) => setMsgSubject(val)}
                    className="ux4g-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted, display: "block", marginBottom: 4 }}>
                    Priority
                  </label>
                  <select
                    value={msgPriority}
                    onChange={(e) => setMsgPriority(e.target.value)}
                    className="ux4g-input"
                  >
                    <option value="INFO">ℹ️ INFO</option>
                    <option value="WARNING">⚠️ WARNING</option>
                    <option value="CRITICAL_ALERT">🚨 ALERT</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted, display: "block", marginBottom: 4 }}>
                  Message Body / संदेश *
                </label>
                <TransliteratedTextArea
                  required
                  rows={4}
                  placeholder="Type broadcast message in English, Marathi or Hindi…"
                  value={msgBody}
                  onChange={(val) => setMsgBody(val)}
                  className="ux4g-input"
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setMsgModalOpen(false)}
                  className="ux4g-btn ux4g-btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingMsg}
                  className="ux4g-btn ux4g-btn-saffron"
                  style={{ flex: 1 }}
                >
                  {sendingMsg ? "Sending…" : "🚀 Send Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={["MASTER_ADMIN"]}>
      <AdminContent />
    </RoleGuard>
  );
}
