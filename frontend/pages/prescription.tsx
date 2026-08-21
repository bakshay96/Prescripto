import Head from "next/head";
import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";
import PrescriptionWriter from "../components/PrescriptionWriter";
import DoctorProfilePanel from "../components/DoctorProfilePanel";
import SubscriptionPaymentModal from "../components/SubscriptionPaymentModal";
import { INITIAL_MEDICINES, MedicineItem } from "../components/InventoryDashboard";
import {
  listMedicines,
  Medicine,
  listPatients,
  Patient,
  getClinicProfile,
  ClinicProfile,
  getSubscriptionStatus,
  HospitalSubscriptionStatus,
  getPatientHistory,
  PatientHistoryRecord,
  searchPrescriptionByNumber,
  getPrintUrl,
  Prescription,
  banPatient,
  unbanPatient,
  deletePatient,
  deletePatientHistory,
  updatePatient,
} from "../utils/api";
import RoleGuard from "../components/RoleGuard";

type DoctorTab = "writer" | "history" | "patients" | "profile" | "subscription";

function DoctorDashboardContent() {
  const { theme, themeId, lang } = useTheme();
  const isDark = themeId !== "light";

  const [activeTab, setActiveTab] = useState<DoctorTab>("writer");
  const [inventoryMeds, setInventoryMeds] = useState<MedicineItem[]>(INITIAL_MEDICINES);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [rxSearchQuery, setRxSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Prescription[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inspectedRx, setInspectedRx] = useState<Prescription | null>(null);

  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [subStatus, setSubStatus] = useState<HospitalSubscriptionStatus | null>(null);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<PatientHistoryRecord | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);

  // 300ms Debouncing for Prescription Search (Patient Name, RX Number, Village)
  useEffect(() => {
    const q = rxSearchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      searchPrescriptionByNumber(q)
        .then((res) => {
          setSearchResults(res);
        })
        .catch(() => {
          setSearchResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [rxSearchQuery]);

  const loadSubStatus = () => {
    getSubscriptionStatus()
      .then((res) => setSubStatus(res))
      .catch(() => {});
  };

  useEffect(() => {
    loadSubStatus();

    listMedicines()
      .then((meds: Medicine[]) => {
        if (meds && meds.length > 0) {
          const mapped: MedicineItem[] = meds.map((m) => ({
            id: m.id,
            name: m.name,
            category: m.category || "General",
            dosageForm: (m.unit as any) || "Tablet",
            totalStock: m.stock_quantity,
            unitPrice: m.price || 0,
            expiryDate: m.expiry_date || "2027-12-31",
            batchNumber: m.batch_number || "",
            minStockAlert: m.min_stock_alert || 10,
            lastUpdated: new Date().toLocaleDateString(),
          }));
          setInventoryMeds(mapped);
        }
      })
      .catch(() => {});

    listPatients()
      .then((res) => setPatients(res))
      .catch(() => {});

    getClinicProfile()
      .then((p) => setProfile(p))
      .catch(() => {});
  }, []);

  const loadPatientsList = () => {
    listPatients()
      .then((res) => setPatients(res))
      .catch(() => {});
  };

  const handleBanToggle = async (p: Patient) => {
    if (p.is_banned) {
      if (confirm(`Restore patient '${p.name}' to ACTIVE OPD status?`)) {
        try {
          const res = await unbanPatient(p.id);
          alert(res.message);
          loadPatientsList();
        } catch (err: any) {
          alert(err.message || "Failed to unban patient.");
        }
      }
    } else {
      const reason = prompt(
        `Enter reason for banning/suspending '${p.name}' from OPD services:`,
        "Violated hospital OPD rules"
      );
      if (reason !== null) {
        try {
          const res = await banPatient(p.id, reason);
          alert(res.message);
          loadPatientsList();
        } catch (err: any) {
          alert(err.message || "Failed to ban patient.");
        }
      }
    }
  };

  const handleDeletePatientClick = async (p: Patient) => {
    if (
      confirm(
        `⚠️ Are you sure you want to PERMANENTLY DELETE patient '${p.name}' and all associated prescription history from MongoDB?`
      )
    ) {
      try {
        const res = await deletePatient(p.id);
        alert(res.message);
        loadPatientsList();
      } catch (err: any) {
        alert(err.message || "Failed to delete patient.");
      }
    }
  };

  const handleDeleteHistoryClick = async (p: Patient) => {
    if (confirm(`Clear all past OPD visit history and prescriptions for '${p.name}'?`)) {
      try {
        const res = await deletePatientHistory(p.id);
        alert(res.message);
        if (selectedPatientHistory?.patient?.id === p.id) {
          setSelectedPatientHistory(null);
        }
      } catch (err: any) {
        alert(err.message || "Failed to clear history.");
      }
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.village_location?.toLowerCase().includes(patientSearch.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Doctor Control Center &amp; Prescription Writer — Prescripto</title>
      </Head>

      <div
        className="ux4g-theme-govblue"
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, Arial, sans-serif",
          padding: "20px 16px 80px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "100%" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 14,
              borderBottom: `2px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 26 }}>👨‍⚕️</span>
                <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: theme.text }}>
                  Doctor OPD &amp; Clinical Dashboard
                </h1>
                <span className="ux4g-badge ux4g-badge-gov">DOCTOR PORTAL</span>
                <span className="ux4g-badge ux4g-badge-saffron">OPD ACTIVE</span>
              </div>
              <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
                {profile?.doctor_name_en || "Dr. Vikas Karande"} · {profile?.hospital_name_en || "Suyog Hospital"} · Reg: {profile?.reg_number || "MUHS NASIK"}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", position: "relative" }}>
              {/* Debounced Prescription Search Input */}
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="🔍 Search Patient, RX #, or Village…"
                  value={rxSearchQuery}
                  onChange={(e) => setRxSearchQuery(e.target.value)}
                  className="ux4g-input"
                  style={{ width: 280, fontSize: 12, padding: "7px 12px", borderRadius: 10 }}
                />

                {/* Debounced Live Dropdown Results */}
                {rxSearchQuery.trim().length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "110%",
                      left: 0,
                      right: 0,
                      zIndex: 9999,
                      background: isDark ? "#0f172a" : "#ffffff",
                      border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
                      borderRadius: 12,
                      padding: 6,
                      boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                      maxHeight: 280,
                      overflowY: "auto",
                    }}
                  >
                    {isSearching ? (
                      <div style={{ padding: 10, fontSize: 11, color: theme.textMuted, textAlign: "center" }}>
                        Searching database…
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div style={{ padding: 10, fontSize: 11, color: theme.textMuted, textAlign: "center" }}>
                        No prescriptions found matching "{rxSearchQuery}"
                      </div>
                    ) : (
                      searchResults.map((rx) => (
                        <div
                          key={rx.id}
                          onClick={() => {
                            setInspectedRx(rx);
                            setRxSearchQuery("");
                            setSearchResults([]);
                          }}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 12,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "#1e293b" : "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div>
                            <div style={{ fontWeight: 800, color: "#ff671f" }}>
                              {rx.prescription_number}
                            </div>
                            <div style={{ fontSize: 11, color: theme.text, marginTop: 2 }}>
                              👤 <strong>{rx.patient?.name || "Patient"}</strong> ({rx.patient?.village_location || "Location N/A"})
                            </div>
                          </div>
                          <div style={{ textAlign: "right", fontSize: 10, color: theme.textMuted }}>
                            <div>🩺 {rx.diagnosis}</div>
                            <div style={{ color: "#10b981", fontWeight: 700 }}>{rx.status}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPayModalOpen(true)}
                className="ux4g-btn ux4g-btn-saffron"
              >
                💳 Upgrade Plan / Pay via Razorpay
              </button>
            </div>
          </div>

          {/* Doctor Navigation Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { id: "writer", label: "✍️ Write Prescription", icon: "✍️" },
              { id: "patients", label: "👥 Patients Directory", count: patients.length },
              { id: "profile", label: "🏥 Doctor Profile & Header Setup" },
              { id: "subscription", label: "💳 Subscription & Payments" },
            ].map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as DoctorTab)}
                  style={{
                    padding: "9px 16px",
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
                  {t.count !== undefined && (
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
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: PRESCRIPTION WRITER */}
          {activeTab === "writer" && (
            <PrescriptionWriter
              inventoryMeds={inventoryMeds}
              isDark={isDark}
              userRole="DOCTOR"
            />
          )}

          {/* TAB 2: PATIENTS DIRECTORY */}
          {activeTab === "patients" && (
            <div className="ux4g-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="ux4g-card-header">
                <div className="ux4g-card-title">👥 Registered OPD Patients Directory &amp; Diagnosis Records</div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>Total {patients.length} Registered</div>
              </div>

              <input
                type="text"
                placeholder="Search patient by name or village location…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="ux4g-input"
              />

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: isDark ? "#020617" : "#f1f5f9", borderBottom: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}` }}>
                      <th style={{ padding: "10px 14px", fontWeight: 900 }}>Patient Name &amp; Status</th>
                      <th style={{ padding: "10px 14px", fontWeight: 900 }}>Village / Location</th>
                      <th style={{ padding: "10px 14px", fontWeight: 900 }}>Age &amp; Gender</th>
                      <th style={{ padding: "10px 14px", fontWeight: 900 }}>Phone</th>
                      <th style={{ padding: "10px 14px", fontWeight: 900, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 24, textAlign: "center", color: theme.textMuted }}>
                          No patient records found.
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.map((p) => (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}` }}>
                          <td style={{ padding: "10px 14px", fontWeight: 800 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: p.is_banned ? "#ef4444" : theme.text }}>{p.name}</span>
                              {p.is_banned ? (
                                <span className="ux4g-badge ux4g-badge-red" style={{ fontSize: 10 }}>🚫 BANNED</span>
                              ) : (
                                <span className="ux4g-badge ux4g-badge-green" style={{ fontSize: 10 }}>ACTIVE</span>
                              )}
                            </div>
                            {p.ban_reason && (
                              <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 600, marginTop: 2 }}>
                                Reason: {p.ban_reason}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "10px 14px", color: theme.textMuted }}>{p.village_location || "N/A"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {p.age?.formatted || "N/A"} · {p.gender}
                          </td>
                          <td style={{ padding: "10px 14px", color: theme.textMuted }}>{p.phone || "N/A"}</td>
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  getPatientHistory(p.id)
                                    .then((res) => setSelectedPatientHistory(res))
                                    .catch(() => {});
                                }}
                                className="ux4g-btn ux4g-btn-outline"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                              >
                                📜 EHR History
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingPatient(p)}
                                className="ux4g-btn ux4g-btn-outline"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                              >
                                ✏️ Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleBanToggle(p)}
                                className={`ux4g-btn ${p.is_banned ? "ux4g-btn-green" : "ux4g-btn-outline"}`}
                                style={{ padding: "4px 8px", fontSize: 11, color: p.is_banned ? undefined : "#ef4444", borderColor: p.is_banned ? undefined : "#ef4444" }}
                              >
                                {p.is_banned ? "🟢 Unban OPD" : "🚫 Ban OPD"}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteHistoryClick(p)}
                                className="ux4g-btn ux4g-btn-outline"
                                style={{ padding: "4px 8px", fontSize: 11, color: "#f59e0b", borderColor: "#f59e0b" }}
                              >
                                🧹 Clear History
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePatientClick(p)}
                                className="ux4g-btn ux4g-btn-outline"
                                style={{ padding: "4px 8px", fontSize: 11, color: "#dc2626", borderColor: "#dc2626" }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PROFILE SETUP */}
          {activeTab === "profile" && (
            <DoctorProfilePanel isDark={isDark} />
          )}

          {/* TAB 4: SUBSCRIPTION */}
          {activeTab === "subscription" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Active Plan Detail Card */}
              <div
                className="ux4g-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  background: isDark ? "linear-gradient(135deg,#005691 0%,#0b192c 100%)" : "linear-gradient(135deg,#e0f2fe 0%,#ffffff 100%)",
                  border: "1.5px solid #005691",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>⭐</span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: isDark ? "#ffffff" : "#005691" }}>
                        Active Subscription: PRO PLAN
                      </div>
                      <div style={{ fontSize: 12, color: isDark ? "#90caf9" : "#005691", marginTop: 2 }}>
                        Valid Until: <strong>2026-09-20</strong> (30 Days Remaining) · Status: <strong>ACTIVE</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPayModalOpen(true)}
                  className="ux4g-btn ux4g-btn-saffron"
                >
                  💳 Renew / Upgrade via Razorpay
                </button>
              </div>

              {/* Plan Benefits Grid */}
              <div className="ux4g-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="ux4g-card-header">
                  <div className="ux4g-card-title">✨ Hospital Features &amp; Capabilities Unlocked</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {[
                    { title: "📄 Digital Prescriptions", desc: "Unlimited A4 Multilingual Print (Mr/Hi/En)", active: true },
                    { title: "🧪 Pharmacy Inventory Sync", desc: "Real-time stock deduction with Medical Store", active: true },
                    { title: "👥 Patients EHR History", desc: "Lifetime patient records & village mapping", active: true },
                    { title: "🖊️ Digital Signature", desc: "Canvas drawing & uploaded stamp verification", active: true },
                    { title: "🏛️ UX4G Gov Theme", desc: "High-contrast accessibility & font scaling", active: true },
                    { title: "🔒 HMAC Security", desc: "256-bit Razorpay bank-grade encryption", active: true },
                  ].map((feat, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: isDark ? "#020617" : "#f8fafc",
                        border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 900, color: theme.text, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#046a38" }}>✓</span> {feat.title}
                      </div>
                      <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>{feat.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <SubscriptionPaymentModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onSuccess={() => {
          setPayModalOpen(false);
          loadSubStatus();
        }}
      />

      {/* Patient Medical & Diagnosis History Modal */}
      {selectedPatientHistory && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="ux4g-card ux4g-theme-govblue"
            style={{
              width: 680,
              maxWidth: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              background: isDark ? "#0f172a" : "#ffffff",
              border: `1.5px solid ${isDark ? "#1e293b" : "#cbd5e1"}`,
              borderRadius: 20,
              padding: 24,
            }}
          >
            <div className="ux4g-card-header" style={{ marginBottom: 16 }}>
              <div>
                <div className="ux4g-card-title" style={{ fontSize: 18 }}>
                  📜 Patient EHR &amp; Clinical Diagnosis History
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>
                  Patient: <strong>{selectedPatientHistory.patient.name}</strong> ({selectedPatientHistory.patient.village_location}) · Total {selectedPatientHistory.total_visits} OPD Visit(s)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientHistory(null)}
                style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {selectedPatientHistory.history.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: theme.textMuted, fontSize: 13 }}>
                  No previous OPD visits recorded for this patient.
                </div>
              ) : (
                selectedPatientHistory.history.map((h, i) => (
                  <div
                    key={h.id || i}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: isDark ? "#020617" : "#f8fafc",
                      border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
                      <span style={{ color: "#ff671f" }}>📋 {h.prescription_number}</span>
                      <span style={{ color: theme.textMuted }}>{new Date(h.date).toLocaleDateString("en-IN")}</span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 800, color: theme.text, marginBottom: 4 }}>
                      🩺 Diagnosis: {h.diagnosis}
                    </div>

                    {h.chief_complaints && (
                      <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 6 }}>
                        Complaints: {h.chief_complaints}
                      </div>
                    )}

                    {/* Prescribed Medicines List */}
                    {h.medicines && h.medicines.length > 0 && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${isDark ? "#334155" : "#e2e8f0"}` }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: theme.text, marginBottom: 4 }}>
                          💊 Prescribed Medicines:
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {h.medicines.map((m: any, idx: number) => (
                            <span
                              key={idx}
                              style={{
                                padding: "3px 8px",
                                borderRadius: 6,
                                background: isDark ? "#1e293b" : "#e2e8f0",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {m.medicine_name || m.name} ({m.dosage || "1-0-1"})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* Prescription Dedicated Inspector Modal */}
      {inspectedRx && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="ux4g-card ux4g-theme-govblue"
            style={{
              width: 720,
              maxWidth: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              background: isDark ? "#0f172a" : "#ffffff",
              border: `1.5px solid ${isDark ? "#1e293b" : "#cbd5e1"}`,
              borderRadius: 20,
              padding: 24,
            }}
          >
            <div className="ux4g-card-header" style={{ marginBottom: 16 }}>
              <div>
                <div className="ux4g-card-title" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}>
                  <span>📄 Prescription Details:</span>
                  <span style={{ color: "#ff671f" }}>{inspectedRx.prescription_number}</span>
                  <span className="ux4g-badge ux4g-badge-green">{inspectedRx.status}</span>
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  Issued: {new Date(inspectedRx.created_at).toLocaleString("en-IN")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedRx(null)}
                style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Patient Info Banner */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: isDark ? "#020617" : "#f8fafc",
                  border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <div>
                  <div>Patient Name: <strong>{inspectedRx.patient?.name || "OPD Patient"}</strong></div>
                  <div style={{ color: theme.textMuted, marginTop: 2 }}>Village: {inspectedRx.patient?.village_location || "Motala"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>Age: <strong>{inspectedRx.patient?.age?.formatted || "N/A"}</strong></div>
                  <div style={{ color: theme.textMuted, marginTop: 2 }}>Gender: {inspectedRx.patient?.gender}</div>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: theme.text }}>🩺 Clinical Diagnosis</div>
                <div style={{ fontSize: 13, color: "#005691", fontWeight: 800, marginTop: 4 }}>{inspectedRx.diagnosis}</div>
              </div>

              {/* Prescribed Items Table */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: theme.text, marginBottom: 8 }}>💊 Prescribed Medicines</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: isDark ? "#020617" : "#f1f5f9" }}>
                      <th style={{ padding: 8 }}>Medicine</th>
                      <th style={{ padding: 8 }}>Dosage</th>
                      <th style={{ padding: 8 }}>Frequency</th>
                      <th style={{ padding: 8 }}>Duration</th>
                      <th style={{ padding: 8 }}>Total Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectedRx.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}` }}>
                        <td style={{ padding: 8, fontWeight: 800 }}>{item.medicine?.name || item.instructions || "Medicine"}</td>
                        <td style={{ padding: 8 }}>{item.dosage}</td>
                        <td style={{ padding: 8 }}>{item.frequency}</td>
                        <td style={{ padding: 8 }}>{item.duration_days} days</td>
                        <td style={{ padding: 8, fontWeight: 800, color: "#ff671f" }}>{item.quantity_prescribed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Doctor Instructions */}
              {inspectedRx.notes && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: theme.text }}>📌 Doctor Advice &amp; Instructions</div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4, fontStyle: "italic" }}>{inspectedRx.notes}</div>
                </div>
              )}

              {/* Print Action */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    const printUrl = getPrintUrl(inspectedRx.id, "mr");
                    window.open(printUrl, "_blank");
                  }}
                  className="ux4g-btn ux4g-btn-saffron"
                >
                  🖨️ Print Prescription (A4)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Patient Modal */}
      {editingPatient && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="ux4g-card"
            style={{
              width: 480,
              maxWidth: "100%",
              background: isDark ? "#0f172a" : "#ffffff",
              border: `1.5px solid ${isDark ? "#1e293b" : "#cbd5e1"}`,
              borderRadius: 20,
              padding: 24,
            }}
          >
            <div className="ux4g-card-header" style={{ marginBottom: 16 }}>
              <div className="ux4g-card-title" style={{ fontSize: 16 }}>
                ✏️ Edit Patient Details: <strong>{editingPatient.name}</strong>
              </div>
              <button
                type="button"
                onClick={() => setEditingPatient(null)}
                style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const updated = await updatePatient(editingPatient.id, {
                    name: editingPatient.name,
                    village_location: editingPatient.village_location,
                    gender: editingPatient.gender,
                    phone: editingPatient.phone,
                  });
                  alert(`✅ Patient '${updated.name}' details updated successfully!`);
                  setEditingPatient(null);
                  loadPatientsList();
                } catch (err: any) {
                  alert(err.message || "Failed to update patient.");
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 12 }}
            >
              <div>
                <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingPatient.name}
                  onChange={(e) => setEditingPatient({ ...editingPatient, name: e.target.value })}
                  className="ux4g-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>Village / Location</label>
                <input
                  type="text"
                  value={editingPatient.village_location || ""}
                  onChange={(e) => setEditingPatient({ ...editingPatient, village_location: e.target.value })}
                  className="ux4g-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>Gender</label>
                  <select
                    value={editingPatient.gender}
                    onChange={(e) => setEditingPatient({ ...editingPatient, gender: e.target.value as any })}
                    className="ux4g-input"
                    style={{ width: "100%" }}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="9823000000"
                    value={editingPatient.phone || ""}
                    onChange={(e) => setEditingPatient({ ...editingPatient, phone: e.target.value })}
                    className="ux4g-input"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="ux4g-btn ux4g-btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="ux4g-btn ux4g-btn-saffron">
                  💾 Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function PrescriptionPage() {
  return (
    <RoleGuard allowedRoles={["DOCTOR", "MASTER_ADMIN"]}>
      <DoctorDashboardContent />
    </RoleGuard>
  );
}
