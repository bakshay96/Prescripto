import Head from "next/head";
import { useState, useEffect } from "react";
import { useTheme } from "../../components/ThemeContext";
import RoleGuard from "../../components/RoleGuard";
import VerticalSidebarNav from "../../components/VerticalSidebarNav";
import { listPatients, Patient } from "../../utils/api";

function PatientDirectoryContent() {
  const { theme, lang } = useTheme();
  const isDark = theme.id !== "light";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await listPatients();
      setPatients(data);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.village_location?.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone && p.phone.includes(search))
  );

  return (
    <>
      <Head>
        <title>Patient Directory — Prescripto Doctor OPD</title>
        <meta name="description" content="View all registered clinic patients, medical history logs, age, village location, and OPD visit records." />
      </Head>

      <div
        className="flex h-[calc(100vh-76px)] overflow-hidden"
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
          transition: "background-color 0.3s, color 0.3s",
        }}
      >
        <VerticalSidebarNav mode="DOCTOR" />
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto space-y-6 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.text, margin: 0 }}>
                  {lang === "mr" ? "रुग्ण नोंदणी व डिरेक्टरी" : "Patient Directory & Records"}
                </h1>
                <span className="ux4g-badge ux4g-badge-gov">{patients.length} PATIENTS</span>
              </div>
              <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
                Complete list of registered clinic patients, age, village location, and medical visit history.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="🔍 Search name, village, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ux4g-input"
                style={{ width: 260, fontSize: 12, padding: "7px 12px" }}
              />
              <button type="button" onClick={loadPatients} className="ux4g-btn ux4g-btn-outline">
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Patients Table */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: isDark ? "#0f172a" : "#ffffff",
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
            }}
          >
            {loading ? (
              <div className="p-12 text-center text-xs font-bold" style={{ color: theme.textMuted }}>
                Loading Patient Directory…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold" style={{ color: theme.textMuted }}>
                No registered patients found. Patients added during prescription writing appear here automatically.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      style={{
                        background: isDark ? "#020617" : "#f8fafc",
                        borderBottom: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                        color: theme.textMuted,
                      }}
                    >
                      <th className="p-3.5 font-bold">Patient Full Name</th>
                      <th className="p-3.5 font-bold">Age / Gender</th>
                      <th className="p-3.5 font-bold">Village / Location</th>
                      <th className="p-3.5 font-bold">Contact Phone</th>
                      <th className="p-3.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-800/20 transition-colors"
                        style={{ color: theme.text }}
                      >
                        <td className="p-3.5 font-black text-sm text-emerald-400">
                          👤 {p.name}
                        </td>
                        <td className="p-3.5 font-bold">
                          {p.age?.formatted || "N/A"} · {p.gender}
                        </td>
                        <td className="p-3.5 font-semibold" style={{ color: theme.textMuted }}>
                          📍 {p.village_location || "Motala"}
                        </td>
                        <td className="p-3.5 font-semibold">
                          {p.phone || "N/A"}
                        </td>
                        <td className="p-3.5">
                          <span className="ux4g-badge ux4g-badge-green">● ACTIVE</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function PatientsPage() {
  return (
    <RoleGuard allowedRoles={["DOCTOR", "MASTER_ADMIN"]}>
      <PatientDirectoryContent />
    </RoleGuard>
  );
}
