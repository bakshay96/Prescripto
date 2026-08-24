import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useTheme } from "../components/ThemeContext";
import RoleGuard from "../components/RoleGuard";
import { TransliteratedInput, TransliteratedTextArea } from "../components/TransliteratedInput";
import VerticalSidebarNav from "../components/VerticalSidebarNav";
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
  AdminPlanConfig,
  getAdminPlans,
  saveAdminPlan,
  setCustomHospitalSubscription,
  listAdminUsers,
  UserLoginVitals,
} from "../utils/api";

type AdminTab = "overview" | "hospitals" | "users" | "trials" | "plans" | "broadcast" | "queries";

function formatIndianDateTime(isoStr?: string | null): string {
  if (!isoStr) return "N/A";
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return "N/A";
    return dt.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }) + " IST";
  } catch {
    return "N/A";
  }
}

function AdminContent() {
  const router = useRouter();
  const { theme, themeId } = useTheme();
  const isDark = themeId !== "light";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [userVitals, setUserVitals] = useState<UserLoginVitals[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [plans, setPlans] = useState<AdminPlanConfig[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  // Hospital Detail Modal Inspector State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailHospital, setSelectedDetailHospital] = useState<Hospital | null>(null);

  // Plan Config Form State
  const [editingPlan, setEditingPlan] = useState<AdminPlanConfig | null>(null);
  const [planKeyInput, setPlanKeyInput] = useState("");
  const [planLabelInput, setPlanLabelInput] = useState("");
  const [planPriceInput, setPlanPriceInput] = useState<number>(999);
  const [planDurationInput, setPlanDurationInput] = useState<number>(30);
  const [planFeaturesInput, setPlanFeaturesInput] = useState("");

  // Custom Hospital Price Modal State
  const [customSubModalOpen, setCustomSubModalOpen] = useState(false);
  const [selectedHospForCustomSub, setSelectedHospForCustomSub] = useState<Hospital | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState<number>(499);
  const [customPlanNameInput, setCustomPlanNameInput] = useState<string>("PRO");
  const [customDurationInput, setCustomDurationInput] = useState<number>(30);

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
      const [anData, hosData, bData, qData, pData, uData] = await Promise.all([
        getAdminAnalytics().catch(() => null),
        listHospitals().catch(() => []),
        listBroadcastMessages().catch(() => []),
        listSupportQueries().catch(() => []),
        getAdminPlans().catch(() => []),
        listAdminUsers().catch(() => []),
      ]);
      setAnalytics(anData);
      setHospitals(hosData);
      setBroadcasts(bData);
      setQueries(qData);
      setPlans(pData);
      setUserVitals(uData);
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
      
      // Dispatch real-time audio sound chime & notification panel event
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("admin-broadcast", {
            detail: {
              subject: `📢 ${msgSubject}`,
              message: msgBody,
              priority: msgPriority,
            },
          })
        );
      }

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
        className="ux4g-theme-govblue flex h-[calc(100vh-76px)] overflow-hidden"
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, Arial, sans-serif",
        }}
      >
        {/* Left Vertical Navigation Panel */}
        <VerticalSidebarNav
          mode="ADMIN"
          activeTab={activeTab}
          onTabSelect={(t) => setActiveTab(t as AdminTab)}
          adminBadges={{
            hospitals: hospitals.length,
            users: userVitals.length ? `${userVitals.filter((u) => u.is_online).length} Live` : null,
            plans: plans.length,
            trials: hospitals.filter((h) => h.subscription_plan === "TRIAL" || (h.trial_days_remaining ?? 0) > 0).length,
            broadcast: broadcasts.length,
            queries: queries.filter((q) => q.status === "OPEN").length ? `${queries.filter((q) => q.status === "OPEN").length} Open` : null,
          }}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto space-y-6 min-w-0">
          
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
                <span className="ux4g-badge ux4g-badge-gov">MASTER ADMIN</span>
                <span className="ux4g-badge ux4g-badge-saffron">VERIFIED PLATFORM</span>
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
                        METRIC
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
                              <span
                                onClick={() => {
                                  setSelectedDetailHospital(h);
                                  setDetailModalOpen(true);
                                }}
                                style={{ fontSize: 18, fontWeight: 900, color: theme.text, cursor: "pointer" }}
                                title="Click to view full hospital details"
                              >
                                {h.name} {h.name_mr ? `(${h.name_mr})` : ""}
                              </span>
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
                              {h.custom_price_inr && (
                                <span className="ux4g-badge ux4g-badge-saffron">CUSTOM: ₹{h.custom_price_inr}/mo</span>
                              )}
                            </div>

                            {/* Date & Active From Badges (Indian Standard Time) */}
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, fontSize: 11, fontWeight: 800 }}>
                              <span style={{ padding: "3px 10px", borderRadius: 6, background: isDark ? "rgba(16,185,129,0.15)" : "#ecfdf5", border: "1px solid #10b981", color: isDark ? "#6ee7b7" : "#046a38" }}>
                                ⚡ Active From: {formatIndianDateTime(h.active_from || h.created_at)}
                              </span>
                              <span style={{ padding: "3px 10px", borderRadius: 6, background: isDark ? "rgba(59,130,246,0.15)" : "#eff6ff", border: "1px solid #3b82f6", color: isDark ? "#93c5fd" : "#1d4ed8" }}>
                                📅 Created On: {formatIndianDateTime(h.created_at)}
                              </span>
                              {h.owner_info && (
                                <span style={{ padding: "3px 10px", borderRadius: 6, background: isDark ? "rgba(139,92,246,0.15)" : "#f5f3ff", border: "1px solid #8b5cf6", color: isDark ? "#c084fc" : "#6d28d9" }}>
                                  👨‍⚕️ Owner: {h.owner_info.name} ({h.owner_info.role})
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>
                              📧 {h.email} · 📞 {h.phone || "N/A"} · 📜 Reg: {h.registration_number || "REG-N/A"} · 📍 {h.address || "Location N/A"}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            {/* View Details Modal Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDetailHospital(h);
                                setDetailModalOpen(true);
                              }}
                              className="ux4g-btn ux4g-btn-primary"
                              style={{ padding: "6px 12px", fontSize: 11 }}
                            >
                              ℹ️ Hospital Details
                            </button>

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

          {/* ════ TAB: USER ACCOUNTS & LIVE LOGIN VITALS ════ */}
          {activeTab === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header card */}
              <div className="ux4g-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="ux4g-card-title">👥 Master Admin: User Accounts &amp; Live Login Vitals Tracking</div>
                  <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
                    Track currently logged-in users, device platforms (Chrome/Desktop), client IP addresses, and last login timestamps across all hospitals in Indian Standard Time (IST).
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="ux4g-badge ux4g-badge-green" style={{ fontSize: 12, padding: "6px 12px" }}>
                    🟢 {userVitals.filter((u) => u.is_online).length} Active Live Sessions
                  </span>
                  <span className="ux4g-badge ux4g-badge-gov" style={{ fontSize: 12, padding: "6px 12px" }}>
                    👥 {userVitals.length} Total Registered Users
                  </span>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <TransliteratedInput
                    placeholder="Search user by name, email or hospital…"
                    value={userSearch}
                    onChange={(val) => setUserSearch(val)}
                    className="ux4g-input"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: isDark ? "#020617" : "#ffffff",
                    border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
                    color: theme.text,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  <option value="ALL">All User Roles</option>
                  <option value="DOCTOR">👨‍⚕️ Doctors Only</option>
                  <option value="PHARMACIST">💊 Pharmacists Only</option>
                  <option value="CLINIC_ADMIN">🏥 Hospital Admins</option>
                  <option value="MASTER_ADMIN">🏛️ Master Admin</option>
                </select>
              </div>

              {/* User Vitals Table */}
              <div className="ux4g-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: isDark ? "#020617" : "#f1f5f9", borderBottom: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}` }}>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>User &amp; Role</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Associated Hospital</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Session Status</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Logged In Platform &amp; Device</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Last Login Time (IST)</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>IP &amp; Client Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userVitals
                      .filter((u) => {
                        const matchQuery =
                          u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.hospital_name.toLowerCase().includes(userSearch.toLowerCase());
                        const matchRole = userRoleFilter === "ALL" || u.role.toUpperCase() === userRoleFilter;
                        return matchQuery && matchRole;
                      })
                      .map((u) => (
                        <tr key={u.id} style={{ borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}` }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 900, color: theme.text }}>{u.full_name}</div>
                            <div style={{ fontSize: 11, color: theme.textMuted }}>
                              📧 {u.email} {u.license_number ? `· Reg: ${u.license_number}` : ""}
                            </div>
                            <span className="ux4g-badge ux4g-badge-gov" style={{ fontSize: 9, marginTop: 4 }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 800, color: "#005691" }}>
                            🏥 {u.hospital_name}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "3px 10px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 900,
                                background: u.is_online ? "rgba(16,185,129,0.15)" : isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
                                color: u.is_online ? "#10b981" : theme.textMuted,
                                border: `1px solid ${u.is_online ? "#10b981" : isDark ? "#334155" : "#cbd5e1"}`,
                              }}
                            >
                              <span style={{ height: 8, width: 8, borderRadius: "50%", background: u.is_online ? "#10b981" : "#94a3b8", display: "inline-block" }}></span>
                              {u.is_online ? "ONLINE" : "OFFLINE"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 800 }}>
                            💻 {u.last_platform}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: "#ff671f", fontWeight: 800 }}>
                            ⏰ {formatIndianDateTime(u.last_login_at)}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 11, color: theme.textMuted }}>
                            🌐 {u.last_ip}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
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

          {/* ════ TAB 3: PLANS & CUSTOM PRICING CONTROL ════ */}
          {activeTab === "plans" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="ux4g-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="ux4g-card-title">💳 Master Admin Subscription Plans &amp; Custom Pricing Control</div>
                  <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
                    Configure platform-wide subscription plan prices (₹), durations, features, or override pricing for specific hospitals.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlan({
                      plan_key: "",
                      label: "",
                      amount_inr: 499,
                      duration_days: 30,
                      features: ["OPD Prescription Writer", "Inventory Sync"],
                      is_active: true,
                    });
                    setPlanKeyInput("");
                    setPlanLabelInput("");
                    setPlanPriceInput(499);
                    setPlanDurationInput(30);
                    setPlanFeaturesInput("OPD Prescription Writer, Inventory Sync, WhatsApp Sharing");
                  }}
                  className="ux4g-btn ux4g-btn-saffron"
                >
                  ➕ Create New Subscription Plan
                </button>
              </div>

              {/* Configure Plan Form Modal / Card */}
              {editingPlan && (
                <div className="ux4g-card" style={{ border: "2px solid #ff671f", background: isDark ? "#0f172a" : "#fff" }}>
                  <div className="ux4g-card-title" style={{ color: "#ff671f" }}>
                    {editingPlan.plan_key ? `✏️ Edit Plan Pricing: ${editingPlan.plan_key}` : "➕ Create Custom Subscription Plan"}
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const feats = planFeaturesInput.split(",").map((s) => s.trim()).filter(Boolean);
                        const res = await saveAdminPlan({
                          plan_key: planKeyInput || editingPlan.plan_key,
                          label: planLabelInput || editingPlan.label,
                          amount_inr: planPriceInput,
                          duration_days: planDurationInput,
                          features: feats,
                          is_active: true,
                        });
                        setActionMsg(res.message);
                        setEditingPlan(null);
                        loadAdminData();
                      } catch (err: any) {
                        setError(err.message || "Failed to save subscription plan.");
                      }
                    }}
                    style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 16 }}
                  >
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 900, color: theme.textMuted }}>Plan Key *</label>
                      <input
                        type="text"
                        required
                        disabled={!!editingPlan.plan_key}
                        value={planKeyInput || editingPlan.plan_key}
                        onChange={(e) => setPlanKeyInput(e.target.value.toUpperCase())}
                        placeholder="e.g. PRO, GOLD_ANNUAL"
                        style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`, background: isDark ? "#020617" : "#fff", color: theme.text, fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 900, color: theme.textMuted }}>Display Label *</label>
                      <input
                        type="text"
                        required
                        value={planLabelInput || editingPlan.label}
                        onChange={(e) => setPlanLabelInput(e.target.value)}
                        placeholder="e.g. PRO Plan (Monthly)"
                        style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`, background: isDark ? "#020617" : "#fff", color: theme.text, fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 900, color: theme.textMuted }}>Customizable Price (₹ INR) *</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        required
                        value={planPriceInput}
                        onChange={(e) => setPlanPriceInput(Number(e.target.value))}
                        style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`, background: isDark ? "#020617" : "#fff", color: theme.text, fontSize: 13, fontWeight: 900 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 900, color: theme.textMuted }}>Validity Duration (Days) *</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={planDurationInput}
                        onChange={(e) => setPlanDurationInput(Number(e.target.value))}
                        style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`, background: isDark ? "#020617" : "#fff", color: theme.text, fontSize: 13 }}
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: 11, fontWeight: 900, color: theme.textMuted }}>Features List (Comma Separated)</label>
                      <input
                        type="text"
                        value={planFeaturesInput}
                        onChange={(e) => setPlanFeaturesInput(e.target.value)}
                        placeholder="Unlimited Prescriptions, Inventory Sync, WhatsApp Sharing"
                        style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`, background: isDark ? "#020617" : "#fff", color: theme.text, fontSize: 13 }}
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => setEditingPlan(null)} className="ux4g-btn ux4g-btn-outline">Cancel</button>
                      <button type="submit" className="ux4g-btn ux4g-btn-green">💾 Save Plan Config</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Plans Table */}
              <div className="ux4g-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: isDark ? "#020617" : "#f1f5f9", borderBottom: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}` }}>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Plan Key</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Label</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Customized Price (₹)</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Duration</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Status</th>
                      <th style={{ padding: "12px 16px", fontWeight: 900 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.plan_key} style={{ borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}` }}>
                        <td style={{ padding: "12px 16px", fontWeight: 900, color: "#ff671f" }}>{p.plan_key}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 800 }}>{p.label}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 900, color: "#046a38", fontSize: 15 }}>
                          ₹{p.amount_inr.toFixed(2)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>{p.duration_days} Days</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className={p.is_active ? "ux4g-badge ux4g-badge-green" : "ux4g-badge ux4g-badge-red"}>
                            {p.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlan(p);
                              setPlanKeyInput(p.plan_key);
                              setPlanLabelInput(p.label);
                              setPlanPriceInput(p.amount_inr);
                              setPlanDurationInput(p.duration_days);
                              setPlanFeaturesInput((p.features || []).join(", "));
                            }}
                            className="ux4g-btn ux4g-btn-outline"
                            style={{ padding: "4px 10px", fontSize: 11 }}
                          >
                            ✏️ Edit Price
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Set Custom Price Per Hospital Section */}
              <div className="ux4g-card space-y-3">
                <div className="ux4g-card-title">🎯 Custom Pricing Override per Hospital</div>
                <p style={{ fontSize: 12, color: theme.textMuted }}>
                  Assign custom prices or tailored subscription plans to specific hospitals.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                  {hospitals.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                        background: isDark ? "#020617" : "#f8fafc",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: theme.text }}>{h.name}</div>
                        <div style={{ fontSize: 11, color: theme.textMuted }}>Plan: {h.subscription_plan}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHospForCustomSub(h);
                          setCustomPriceInput(499);
                          setCustomPlanNameInput("PRO");
                          setCustomDurationInput(30);
                          setCustomSubModalOpen(true);
                        }}
                        className="ux4g-btn ux4g-btn-saffron"
                        style={{ padding: "4px 10px", fontSize: 11 }}
                      >
                        🏷️ Set Custom Price
                      </button>
                    </div>
                  ))}
                </div>
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

      {/* ════ MODAL 1.5: OVERRIDE CUSTOM SUBSCRIPTION PRICE PER HOSPITAL ════ */}
      {customSubModalOpen && selectedHospForCustomSub && (
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
          <div className="ux4g-card" style={{ width: 460, maxWidth: "100%", background: isDark ? "#0f172a" : "#ffffff" }}>
            <div className="ux4g-card-header">
              <div className="ux4g-card-title">🏷️ Override Custom Subscription Price</div>
              <button
                type="button"
                onClick={() => setCustomSubModalOpen(false)}
                style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 16, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await setCustomHospitalSubscription(selectedHospForCustomSub.id, {
                    plan: customPlanNameInput,
                    custom_price_inr: customPriceInput,
                    duration_days: customDurationInput,
                    notes: "Master Admin Custom Discounted Plan",
                  });
                  setActionMsg(res.message);
                  setCustomSubModalOpen(false);
                  loadAdminData();
                } catch (err: any) {
                  setError(err.message || "Failed to set custom hospital subscription price.");
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted }}>Target Hospital:</label>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#ff671f", marginTop: 2 }}>{selectedHospForCustomSub.name}</div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted }}>Assigned Plan Name *</label>
                <input
                  type="text"
                  required
                  value={customPlanNameInput}
                  onChange={(e) => setCustomPlanNameInput(e.target.value.toUpperCase())}
                  placeholder="e.g. PRO, ENTERPRISE, RURAL_SPECIAL"
                  style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`, background: isDark ? "#020617" : "#fff", color: theme.text, fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted }}>Custom Total Price (₹ INR) *</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={customPriceInput}
                  onChange={(e) => setCustomPriceInput(Number(e.target.value))}
                  placeholder="e.g. 499"
                  style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`, background: isDark ? "#020617" : "#fff", color: theme.text, fontSize: 14, fontWeight: 900 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted }}>Validity Duration (Days) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={customDurationInput}
                  onChange={(e) => setCustomDurationInput(Number(e.target.value))}
                  style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`, background: isDark ? "#020617" : "#fff", color: theme.text, fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setCustomSubModalOpen(false)} className="ux4g-btn ux4g-btn-outline" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="ux4g-btn ux4g-btn-saffron" style={{ flex: 1 }}>🏷️ Assign Custom Price</button>
              </div>
            </form>
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

      {/* ════ MODAL 0: DETAILED HOSPITAL INSPECTOR MODAL ════ */}
      {detailModalOpen && selectedDetailHospital && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="ux4g-card"
            style={{
              width: 720,
              maxWidth: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              background: isDark ? "#0f172a" : "#ffffff",
              border: `2px solid ${isDark ? "#3b82f6" : "#005691"}`,
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                paddingBottom: 16,
                marginBottom: 16,
                borderBottom: `2px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 24 }}>🏥</span>
                  <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: theme.text }}>
                    {selectedDetailHospital.name}
                  </h2>
                  {selectedDetailHospital.name_mr && (
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#ff671f" }}>
                      ({selectedDetailHospital.name_mr})
                    </span>
                  )}
                  <span
                    className={`ux4g-badge ${
                      selectedDetailHospital.subscription_active ? "ux4g-badge-green" : "ux4g-badge-red"
                    }`}
                  >
                    {selectedDetailHospital.subscription_active ? "VERIFIED ACTIVE" : "BLOCKED"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
                  Registration ID: <strong>{selectedDetailHospital.registration_number || "CL-SUYOG-001"}</strong> · Clinic ID: {selectedDetailHospital.id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: theme.textMuted,
                  fontSize: 20,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* SECTION 1: TIMELINE & DATES (INDIAN STANDARD TIME) */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: isDark ? "#020617" : "#f8fafc",
                  border: `1.5px solid ${isDark ? "#1e293b" : "#cbd5e1"}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: "#ff671f", textTransform: "uppercase", marginBottom: 10 }}>
                  🕒 Registration &amp; Activation Timeline (Indian Standard Time - IST)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted }}>📅 Created / Registered Date &amp; Time:</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: theme.text, marginTop: 2 }}>
                      {formatIndianDateTime(selectedDetailHospital.created_at)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted }}>⚡ Subscription Active From:</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#10b981", marginTop: 2 }}>
                      {formatIndianDateTime(selectedDetailHospital.active_from || selectedDetailHospital.created_at)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted }}>⏳ Subscription Valid Until:</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#3b82f6", marginTop: 2 }}>
                      {formatIndianDateTime(selectedDetailHospital.subscription_valid_until)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted }}>⭐ Trial Days Remaining:</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#d97706", marginTop: 2 }}>
                      {selectedDetailHospital.trial_days_remaining ?? 0} Days Left
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: OWNER & DOCTOR USER DETAILS */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: isDark ? "#020617" : "#f8fafc",
                  border: `1.5px solid ${isDark ? "#1e293b" : "#cbd5e1"}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: "#005691", textTransform: "uppercase", marginBottom: 10 }}>
                  👨‍⚕️ Primary Admin &amp; Owner Doctor Information
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted }}>Doctor / Admin Full Name:</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: theme.text, marginTop: 2 }}>
                      {selectedDetailHospital.owner_info?.name || selectedDetailHospital.name}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted }}>Email Address:</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: theme.text, marginTop: 2 }}>
                      📧 {selectedDetailHospital.owner_info?.email || selectedDetailHospital.email}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted }}>Contact Phone:</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: theme.text, marginTop: 2 }}>
                      📞 {selectedDetailHospital.owner_info?.phone || selectedDetailHospital.phone || "7757003800"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted }}>MMC Medical Reg. Number:</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#8b5cf6", marginTop: 2 }}>
                      📜 {selectedDetailHospital.owner_info?.registration_number || selectedDetailHospital.registration_number || "MMC 2012/03/0842"}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SUBSCRIPTION & PLAN PRICING */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: isDark ? "#020617" : "#f8fafc",
                  border: `1.5px solid ${isDark ? "#1e293b" : "#cbd5e1"}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: "#046a38", textTransform: "uppercase", marginBottom: 10 }}>
                  💳 Active Plan &amp; Billing Details
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted }}>Currently Active Plan:</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#046a38", marginTop: 2 }}>
                      {selectedDetailHospital.subscription_plan} PLAN
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted }}>Billing Status:</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: selectedDetailHospital.subscription_active ? "#10b981" : "#f43f5e", marginTop: 2 }}>
                      {selectedDetailHospital.subscription_active ? "✅ ACTIVE & VERIFIED" : "🚫 SUSPENDED"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted }}>Monthly Price / Override:</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#ff671f", marginTop: 2 }}>
                      ₹{selectedDetailHospital.custom_price_inr ?? (selectedDetailHospital.subscription_plan === "PRO" ? 999 : 0)} / mo
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: OPERATIONAL VITALS & STATS */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: isDark ? "#020617" : "#f8fafc",
                  border: `1.5px solid ${isDark ? "#1e293b" : "#cbd5e1"}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 10 }}>
                  📊 Hospital Operational Vitals &amp; Pharmacy Revenue
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                  <div style={{ padding: 10, borderRadius: 8, background: isDark ? "#0f172a" : "#fff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted }}>👨‍⚕️ Doctors</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#005691" }}>{selectedDetailHospital.doctor_count}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: isDark ? "#0f172a" : "#fff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted }}>💊 Pharmacists</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#046a38" }}>{selectedDetailHospital.pharmacist_count ?? 1}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: isDark ? "#0f172a" : "#fff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted }}>📄 Prescriptions</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#ff671f" }}>{selectedDetailHospital.prescription_count ?? 0}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: isDark ? "#0f172a" : "#fff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted }}>👤 Patients</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#8b5cf6" }}>{selectedDetailHospital.patient_count ?? 0}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: isDark ? "#0f172a" : "#fff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted }}>🧾 Pharmacy Bills</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#d97706" }}>{selectedDetailHospital.bill_count ?? 0}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: isDark ? "#0f172a" : "#fff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted }}>💰 Total Revenue</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#10b981" }}>
                      ₹{(selectedDetailHospital.total_revenue ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: ADDRESS & CLINIC FACILITIES */}
              <div style={{ fontSize: 12, color: theme.textMuted, display: "flex", flexDirection: "column", gap: 4 }}>
                <div>📍 <strong>Full Address:</strong> {selectedDetailHospital.address || "Tahsil Samore, Buldhana Road, Motala"}</div>
                <div>⏰ <strong>Operating Hours:</strong> {selectedDetailHospital.clinic_hours || "Morning 9:00 AM to 1:00 PM | Evening 5:00 PM to 9:00 PM"}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                  {(selectedDetailHospital.facilities || ["General OPD", "ICU Facility", "Pharmacy Counter", "Pathology Lab"]).map((f, i) => (
                    <span key={i} className="ux4g-badge ux4g-badge-gov" style={{ fontSize: 10 }}>
                      🏥 {f}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="ux4g-btn ux4g-btn-primary"
                  style={{ padding: "8px 24px" }}
                >
                  Close Hospital Details Inspector
                </button>
              </div>
            </div>
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
