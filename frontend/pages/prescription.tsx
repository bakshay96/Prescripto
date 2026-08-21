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
  const [profile, setProfile] = useState<ClinicProfile | null>(null);

  const [payModalOpen, setPayModalOpen] = useState(false);

  useEffect(() => {
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

            <button
              type="button"
              onClick={() => setPayModalOpen(true)}
              className="ux4g-btn ux4g-btn-saffron"
            >
              💳 Upgrade Plan / Pay via Razorpay
            </button>
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
                <div className="ux4g-card-title">👥 Registered OPD Patients Directory</div>
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
                      <th style={{ padding: "10px 14px", fontWeight: 900 }}>Patient Name</th>
                      <th style={{ padding: "10px 14px", fontWeight: 900 }}>Village / Location</th>
                      <th style={{ padding: "10px 14px", fontWeight: 900 }}>Age &amp; Gender</th>
                      <th style={{ padding: "10px 14px", fontWeight: 900 }}>Phone</th>
                      <th style={{ padding: "10px 14px", fontWeight: 900 }}>Action</th>
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
                          <td style={{ padding: "10px 14px", fontWeight: 800 }}>{p.name}</td>
                          <td style={{ padding: "10px 14px", color: theme.textMuted }}>{p.village_location || "N/A"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {p.age?.formatted || "N/A"} · {p.gender}
                          </td>
                          <td style={{ padding: "10px 14px", color: theme.textMuted }}>{p.phone || "N/A"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <button
                              type="button"
                              onClick={() => setActiveTab("writer")}
                              className="ux4g-btn ux4g-btn-saffron"
                              style={{ padding: "4px 10px", fontSize: 11 }}
                            >
                              ✍️ Write Rx
                            </button>
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
            <div className="ux4g-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="ux4g-card-header">
                <div className="ux4g-card-title">💳 Doctor Subscription &amp; Payment Gateway</div>
              </div>
              <p style={{ fontSize: 13, color: theme.textMuted, margin: 0 }}>
                Manage your prescription writing subscription. Upgrade to PRO or ENTERPRISE via Razorpay secure checkout.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setPayModalOpen(true)}
                  className="ux4g-btn ux4g-btn-saffron"
                >
                  💳 Open Razorpay Checkout Modal
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <SubscriptionPaymentModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onSuccess={() => setPayModalOpen(false)}
      />
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
