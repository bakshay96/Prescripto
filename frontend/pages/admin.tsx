import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useTheme } from "../components/ThemeContext";
import {
  getUser,
  getAdminAnalytics,
  listHospitals,
  blockHospital,
  unblockHospital,
  updateSubscription,
  listSupportQueries,
  respondSupportQuery,
  PlatformAnalytics,
  Hospital,
  SupportQuery,
} from "../utils/api";

export default function AdminPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "hospitals" | "queries">("overview");

  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== "MASTER_ADMIN") {
      // If not logged in as Master Admin, redirect or allow preview
    }
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [anData, hosData, qData] = await Promise.all([
        getAdminAnalytics().catch(() => null),
        listHospitals().catch(() => []),
        listSupportQueries().catch(() => []),
      ]);
      setAnalytics(anData);
      setHospitals(hosData);
      setQueries(qData);
    } catch (err: any) {
      setError(err.message || "Failed to load Master Admin dashboard.");
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
      setActionMsg(`Updated subscription to ${plan}`);
      loadAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReply = async (queryId: string) => {
    const text = replyText[queryId];
    if (!text) return;
    try {
      await respondSupportQuery(queryId, text);
      setActionMsg("Responded to support query successfully!");
      setReplyText(prev => ({ ...prev, [queryId]: "" }));
      loadAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredHospitals = hospitals.filter(
    h =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.email.toLowerCase().includes(search.toLowerCase()) ||
      h.registration_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Master Admin Control Center — Prescripto</title>
      </Head>

      <div style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
        padding: "24px 16px 80px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${theme.border}`
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>🛡️</span>
                <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: theme.text }}>
                  Master Admin Dashboard
                </h1>
                <span style={{
                  padding: "3px 9px", borderRadius: 12, fontSize: 10, fontWeight: 800,
                  background: "rgba(124,58,237,0.2)", color: "#a855f7", border: "1px solid rgba(124,58,237,0.4)"
                }}>
                  MASTER ADMIN
                </span>
              </div>
              <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
                Platform-wide controls, hospital provisioning, subscription plans, and support desk
              </p>
            </div>
            <button
              onClick={loadAdminData}
              style={{
                padding: "8px 16px", borderRadius: 10, border: `1px solid ${theme.border}`,
                background: theme.surface, color: theme.text, fontWeight: 700, cursor: "pointer", fontSize: 12
              }}
            >
              🔄 Refresh Data
            </button>
          </div>

          {/* Action / Error Banner */}
          {actionMsg && (
            <div style={{
              padding: "12px 16px", borderRadius: 12, background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.4)", color: "#10b981", fontSize: 13,
              fontWeight: 700, marginBottom: 20, display: "flex", justifyContent: "space-between"
            }}>
              <span>✅ {actionMsg}</span>
              <button onClick={() => setActionMsg(null)} style={{ background: "none", border: "none", color: "#10b981", cursor: "pointer", fontWeight: 800 }}>✕</button>
            </div>
          )}

          {error && (
            <div style={{
              padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", fontSize: 13,
              fontWeight: 700, marginBottom: 20
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Tabs Navigation */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {[
              { id: "overview", label: "📊 System Analytics", icon: "📈" },
              { id: "hospitals", label: "🏥 Hospitals & Clinics", icon: "🏢" },
              { id: "queries", label: "💬 Support Inbox", icon: "📬" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 800,
                  cursor: "pointer", border: "none", transition: "all 0.2s",
                  background: activeTab === t.id ? theme.accent : theme.surface,
                  color: activeTab === t.id ? "#fff" : theme.textMuted,
                  boxShadow: activeTab === t.id ? "0 4px 14px rgba(196,30,58,0.3)" : "none",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW ANALYTICS */}
          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {[
                { label: "Registered Hospitals", value: analytics?.total_hospitals ?? 0, icon: "🏥", color: "#3b82f6" },
                { label: "Total Users", value: analytics?.total_users ?? 0, icon: "👥", color: "#8b5cf6" },
                { label: "Total Prescriptions", value: analytics?.total_prescriptions ?? 0, icon: "📋", color: "#ec4899" },
                { label: "Medicines Cataloged", value: analytics?.total_medicines ?? 0, icon: "💊", color: "#10b981" },
                { label: "Open Support Tickets", value: analytics?.open_queries ?? 0, icon: "💬", color: "#f59e0b" },
                { label: "Active Subscriptions", value: analytics?.active_subscriptions ?? 0, icon: "⭐", color: "#6366f1" },
              ].map((card, idx) => (
                <div key={idx} style={{
                  padding: "24px", borderRadius: 16, background: theme.surface,
                  border: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", gap: 8
                }}>
                  <div style={{ fontSize: 28 }}>{card.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: theme.text }}>{card.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted }}>{card.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: HOSPITALS MANAGEMENT */}
          {activeTab === "hospitals" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Search hospital by name, email or reg number…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12,
                    background: theme.inputBg, border: `1px solid ${theme.border}`,
                    color: theme.text, fontSize: 13, outline: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredHospitals.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: theme.textMuted, background: theme.surface, borderRadius: 16 }}>
                    No hospitals registered yet.
                  </div>
                ) : (
                  filteredHospitals.map(h => (
                    <div key={h.id} style={{
                      padding: 20, borderRadius: 16, background: theme.surface,
                      border: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between",
                      alignItems: "center", flexWrap: "wrap", gap: 16
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: theme.text }}>{h.name}</span>
                          <span style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 8, fontWeight: 800,
                            background: h.subscription_active ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                            color: h.subscription_active ? "#10b981" : "#ef4444"
                          }}>
                            {h.subscription_active ? "ACTIVE" : "BLOCKED"}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
                          📧 {h.email} · 📞 {h.phone || "N/A"} · 📜 Reg: {h.registration_number}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <select
                          value={h.subscription_plan}
                          onChange={e => handlePlanChange(h.id, e.target.value)}
                          style={{
                            padding: "6px 12px", borderRadius: 8, background: theme.inputBg,
                            border: `1px solid ${theme.border}`, color: theme.text, fontSize: 12, fontWeight: 700
                          }}
                        >
                          <option value="FREE">FREE Plan</option>
                          <option value="PRO">PRO Plan</option>
                          <option value="ENTERPRISE">ENTERPRISE Plan</option>
                        </select>

                        <button
                          onClick={() => handleBlock(h.id, !h.subscription_active)}
                          style={{
                            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 800,
                            cursor: "pointer", border: "none",
                            background: h.subscription_active ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                            color: h.subscription_active ? "#ef4444" : "#10b981",
                          }}
                        >
                          {h.subscription_active ? "Block Hospital" : "Unblock Hospital"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SUPPORT QUERIES */}
          {activeTab === "queries" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {queries.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: theme.textMuted, background: theme.surface, borderRadius: 16 }}>
                  No support tickets open.
                </div>
              ) : (
                queries.map(q => (
                  <div key={q.id} style={{
                    padding: 20, borderRadius: 16, background: theme.surface,
                    border: `1px solid ${theme.border}`
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: theme.text }}>{q.subject}</span>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 8, fontWeight: 800,
                        background: q.status === "OPEN" ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)",
                        color: q.status === "OPEN" ? "#f59e0b" : "#10b981"
                      }}>
                        {q.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: theme.textMuted, margin: "0 0 12px" }}>{q.message}</p>

                    {q.admin_response ? (
                      <div style={{ padding: 12, borderRadius: 10, background: theme.inputBg, fontSize: 12, borderLeft: "3px solid #10b981" }}>
                        <span style={{ fontWeight: 800, color: "#10b981" }}>Admin Reply: </span>
                        {q.admin_response}
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <input
                          type="text"
                          placeholder="Type resolution reply..."
                          value={replyText[q.id] || ""}
                          onChange={e => setReplyText({ ...replyText, [q.id]: e.target.value })}
                          style={{
                            flex: 1, padding: "8px 12px", borderRadius: 8,
                            background: theme.inputBg, border: `1px solid ${theme.border}`,
                            color: theme.text, fontSize: 12
                          }}
                        />
                        <button
                          onClick={() => handleReply(q.id)}
                          style={{
                            padding: "8px 16px", borderRadius: 8, background: theme.accent,
                            color: "#fff", border: "none", fontWeight: 800, cursor: "pointer", fontSize: 12
                          }}
                        >
                          Reply & Resolve
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
    </>
  );
}
