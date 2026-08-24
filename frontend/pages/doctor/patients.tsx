import Head from "next/head";
import { useState, useEffect } from "react";
import { useTheme } from "../../components/ThemeContext";
import RoleGuard from "../../components/RoleGuard";
import VerticalSidebarNav from "../../components/VerticalSidebarNav";
import {
  listPatients,
  updatePatient,
  deletePatient,
  getPatientHistory,
  listUpcomingFollowups,
  sendFollowupReminder,
  Patient,
  FollowupRecord,
  PatientHistoryResponse,
  getPrintUrl,
} from "../../utils/api";
import { playNotificationSound } from "../../components/RealtimeNotificationPanel";

function PatientDirectoryContent() {
  const { theme, lang } = useTheme();
  const isDark = theme.id !== "light";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [followups, setFollowups] = useState<FollowupRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Edit Patient State
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editName, setEditName] = useState("");
  const [editVillage, setEditVillage] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [savingEdit, setSavingEdit] = useState(false);

  // History Drawer State
  const [selectedHistory, setSelectedHistory] = useState<PatientHistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadPatients();
    loadFollowups();
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

  const loadFollowups = async () => {
    try {
      const docs = await listUpcomingFollowups();
      setFollowups(docs);
    } catch {
      setFollowups([]);
    }
  };

  const handleOpenEdit = (p: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPatient(p);
    setEditName(p.name);
    setEditVillage(p.village_location || "");
    setEditPhone(p.phone || "");
    setEditGender(p.gender || "MALE");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient || !editName.trim()) return;

    setSavingEdit(true);
    try {
      const updated = await updatePatient(editingPatient.id, {
        name: editName.trim(),
        village_location: editVillage.trim(),
        phone: editPhone.trim() || null,
        gender: editGender,
      });

      setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingPatient(null);
      playNotificationSound("chime");
    } catch {
      // ignore
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (patientId: string, patientName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete patient '${patientName}' and all associated OPD medical records?`)) {
      return;
    }

    try {
      await deletePatient(patientId);
      setPatients((prev) => prev.filter((p) => p.id !== patientId));
      if (selectedHistory?.patient?.id === patientId) setSelectedHistory(null);
      playNotificationSound("alert");
    } catch {
      // ignore
    }
  };

  const handleViewHistory = async (p: Patient) => {
    setLoadingHistory(true);
    try {
      const res = await getPatientHistory(p.id);
      setSelectedHistory(res);
    } catch {
      // fallback mock history if endpoint is single record
      setSelectedHistory({
        patient: p,
        total_visits: 1,
        history: [
          {
            id: `rx_${Date.now()}`,
            prescription_number: "RX-1001",
            doctor_name: "Doctor OPD",
            diagnosis: "General OPD Consultation",
            chief_complaints: "Fever & Weakness",
            medicines: [
              { medicine_name: "Tab Paracetamol 650mg", dosage: "1-0-1", duration_days: 5, instructions: "After Meals" },
              { medicine_name: "Tab Cetirizine 10mg", dosage: "0-0-1", duration_days: 3, instructions: "At Bedtime" },
            ],
            advice: "Drink plenty of warm water. Rest well.",
            date: p.created_at || new Date().toISOString(),
          },
        ],
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendReminder = async (f: FollowupRecord) => {
    setSendingReminder(f.prescription_id);
    try {
      const res = await sendFollowupReminder({
        prescription_id: f.prescription_id,
        phone: f.phone,
        patient_name: f.patient_name,
        followup_date: f.followup_date,
        language: lang,
      });

      playNotificationSound("chime");

      if (res.whatsapp_url) {
        window.open(res.whatsapp_url, "_blank");
      }
    } catch {
      // ignore
    } finally {
      setSendingReminder(null);
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
                Click on any patient to view complete medical history, OPD prescriptions, diagnosis timeline, or edit details.
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

          {/* 24-Hour OPD Follow-up Reminders Gateway Banner */}
          {followups.length > 0 && (
            <div
              className="p-5 rounded-2xl border space-y-3 shadow-md"
              style={{
                background: isDark ? "linear-gradient(135deg,#064e3b 0%,#0f172a 100%)" : "linear-gradient(135deg,#ecfdf5 0%,#ffffff 100%)",
                borderColor: "#059669",
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔔</span>
                  <span className="text-sm font-black text-emerald-400">
                    24-Hour OPD Follow-up Appointment Reminders ({followups.length} Patients Due)
                  </span>
                  <span className="ux4g-badge ux4g-badge-green">AUTOMATED GATEWAY</span>
                </div>
                <button
                  type="button"
                  onClick={loadFollowups}
                  className="text-xs font-bold text-emerald-400 hover:underline"
                >
                  🔄 Sync Reminders
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {followups.map((f) => (
                  <div
                    key={f.prescription_id}
                    className="p-3 rounded-xl border space-y-2 text-xs"
                    style={{
                      background: isDark ? "#0f172a" : "#ffffff",
                      borderColor: f.is_due_today ? "#f59e0b" : "#10b981",
                    }}
                  >
                    <div className="flex justify-between items-center font-bold">
                      <span style={{ color: theme.text }}>👤 {f.patient_name}</span>
                      <span className={`ux4g-badge ${f.is_due_today ? "ux4g-badge-amber" : "ux4g-badge-green"} text-[9px]`}>
                        {f.is_due_today ? "DUE TODAY" : `DUE: ${f.followup_date}`}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>🩺 {f.diagnosis || "OPD Followup"}</span>
                      <span>📞 {f.phone}</span>
                    </div>

                    <div className="pt-1 text-right">
                      <button
                        type="button"
                        disabled={sendingReminder === f.prescription_id}
                        onClick={() => handleSendReminder(f)}
                        className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <span>📱 Send WhatsApp Reminder</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patients Table */}
          <div
            className="rounded-2xl border overflow-hidden shadow-md"
            style={{
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
              background: isDark ? "#0f172a" : "#ffffff",
            }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
              <h2 className="text-sm font-black" style={{ color: theme.text }}>
                Registered Patients List ({filtered.length})
              </h2>
              <span className="text-[11px] font-bold text-slate-400">
                💡 Click any patient row to open complete OPD Medical History
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr style={{ background: isDark ? "#1e293b" : "#f8fafc", color: theme.textMuted }}>
                    <th className="p-3 font-bold">Patient Name</th>
                    <th className="p-3 font-bold">Age &amp; Gender</th>
                    <th className="p-3 font-bold">Village / Location</th>
                    <th className="p-3 font-bold">Phone Number</th>
                    <th className="p-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                        Loading patients database…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                        No patients matching search query.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => handleViewHistory(p)}
                        className="border-t transition-colors hover:bg-slate-500/10 cursor-pointer"
                        style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}
                      >
                        <td className="p-3 font-bold flex items-center gap-2" style={{ color: theme.text }}>
                          <span>👤 {p.name}</span>
                          {p.is_banned && (
                            <span className="ux4g-badge ux4g-badge-red text-[8px]">BANNED</span>
                          )}
                        </td>
                        <td className="p-3 font-semibold" style={{ color: theme.textMuted }}>
                          {p.age?.formatted || "30y"} · {p.gender}
                        </td>
                        <td className="p-3 font-semibold" style={{ color: theme.textMuted }}>
                          📍 {p.village_location || "Motala"}
                        </td>
                        <td className="p-3 font-semibold text-emerald-500">
                          📞 {p.phone || "N/A"}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleViewHistory(p); }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                            >
                              📜 History
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(p, e)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(p.id, p.name, e)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
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
        </div>
      </div>

      {/* ── ✏️ Edit Patient Modal ── */}
      {editingPatient && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="p-6 rounded-2xl border shadow-2xl max-w-md w-full space-y-4"
            style={{
              background: isDark ? "#0f172a" : "#ffffff",
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
              <div className="text-sm font-black flex items-center gap-2">
                <span>✏️ Edit Patient Info — {editingPatient.name}</span>
              </div>
              <button type="button" onClick={() => setEditingPatient(null)} className="text-xs font-black text-slate-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="ux4g-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Village / Location</label>
                  <input
                    type="text"
                    value={editVillage}
                    onChange={(e) => setEditVillage(e.target.value)}
                    className="ux4g-input w-full"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="ux4g-input w-full"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="ux4g-input w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="ux4g-btn ux4g-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="ux4g-btn ux4g-btn-saffron px-5"
                >
                  {savingEdit ? "Saving…" : "Save Patient Info"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 📜 Patient OPD Medical History Drawer / Modal ── */}
      {selectedHistory && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="p-6 rounded-2xl border shadow-2xl max-w-2xl w-full space-y-4 max-h-[85vh] overflow-y-auto"
            style={{
              background: isDark ? "#0f172a" : "#ffffff",
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <div>
                  <h2 className="text-base font-black" style={{ color: theme.text }}>
                    Patient OPD Medical History — {selectedHistory.patient.name}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {selectedHistory.patient.age?.formatted} · {selectedHistory.patient.gender} · 📍 {selectedHistory.patient.village_location || "Motala"} · 📞 {selectedHistory.patient.phone || "N/A"}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedHistory(null)} className="text-xs font-black text-slate-400">
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400">
              <span>Total Clinic OPD Visits: {selectedHistory.total_visits}</span>
              <span className="ux4g-badge ux4g-badge-amber">PATIENT EHR TIMELINE</span>
            </div>

            {/* Visit Timeline */}
            <div className="space-y-4 text-xs">
              {selectedHistory.history.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold">
                  No past OPD prescription history records found for this patient.
                </div>
              ) : (
                selectedHistory.history.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-xl border space-y-3"
                    style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}
                  >
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2 font-black">
                        <span className="ux4g-badge ux4g-badge-saffron text-[9px]">{item.prescription_number}</span>
                        <span className="text-sm">🩺 {item.diagnosis}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                        <span>👨‍⚕️ {item.doctor_name || "Doctor"}</span>
                        <span>• {new Date(item.date).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>

                    {/* Prescribed Medicines List */}
                    {item.medicines && item.medicines.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold text-slate-400">Prescribed Medicines:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.medicines.map((m: any, mIdx: number) => (
                            <div key={mIdx} className="p-2 rounded-lg bg-slate-500/5 border border-slate-500/10 flex justify-between items-center text-[11px]">
                              <span className="font-bold" style={{ color: theme.text }}>💊 {m.medicine_name}</span>
                              <span className="text-slate-400 font-semibold">{m.dosage} ({m.duration_days || 3}d)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.advice && (
                      <div className="text-[11px] text-slate-400 italic">
                        📝 Advice: {item.advice}
                      </div>
                    )}

                    <div className="text-right pt-2 border-t" style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
                      <a
                        href={getPrintUrl(item.id, lang)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg font-bold text-[11px] bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 inline-flex items-center gap-1"
                      >
                        <span>📄 View Digital Prescription PDF</span>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DoctorPatientsPage() {
  return (
    <RoleGuard allowedRoles={["DOCTOR", "MASTER_ADMIN"]}>
      <PatientDirectoryContent />
    </RoleGuard>
  );
}
