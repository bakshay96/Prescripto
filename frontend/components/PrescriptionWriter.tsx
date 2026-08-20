"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  listPatients,
  quickCreatePatient,
  autocompleteMedicines,
  createPrescription,
  getPrintUrl,
  Patient as ApiPatient,
  MedicineAutocomplete,
  RxItem,
} from "../utils/api";
import { useDoctorProfile } from "./DoctorProfilePanel";
import PrescriptionPrintTemplate, {
  openPrintWindow,
  PrescriptionPrintData,
} from "./PrescriptionPrintTemplate";

export type MedType = "Tab" | "Cap" | "Syp" | "Inj" | "Oint" | "Drop";

export interface RxRow {
  id: string;
  medicineId?: string;
  medType: MedType;
  medicineName: string;
  isCustom: boolean;
  dosage: string;
  morning: string;
  afternoon: string;
  night: string;
  durationDays: number;
  timing: "After Meal" | "Before Meal";
  instructions: string;
}

const MED_TYPES: MedType[] = ["Tab", "Cap", "Syp", "Inj", "Oint", "Drop"];

const DOSE_OPTIONS = ["0", "½", "1", "2", "3"];

const QUICK_DOSE_PRESETS = [
  { label: "1-0-1", m: "1", a: "0", n: "1" },
  { label: "1-1-1", m: "1", a: "1", n: "1" },
  { label: "0-0-1", m: "0", a: "0", n: "1" },
  { label: "1-0-0", m: "1", a: "0", n: "0" },
  { label: "½-0-½", m: "½", a: "0", n: "½" },
  { label: "½-0-0", m: "½", a: "0", n: "0" },
  { label: "0-0-½", m: "0", a: "0", n: "½" },
  { label: "SOS",   m: "SOS", a: "", n: "" },
];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function newRow(): RxRow {
  return {
    id: uid(),
    medType: "Tab",
    medicineName: "",
    isCustom: false,
    dosage: "500mg",
    morning: "1",
    afternoon: "0",
    night: "1",
    durationDays: 3,
    timing: "After Meal",
    instructions: "",
  };
}

// ── Medicine Autocomplete Input Component ─────────────────────────────
function MedicineSearchInput({
  value,
  onChange,
  isDark = true,
}: {
  value: string;
  onChange: (name: string, medicineId?: string, isCustom?: boolean) => void;
  isDark?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MedicineAutocomplete[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useCallback(async (q: string) => {
    try {
      setLoading(true);
      const res = await autocompleteMedicines(q);
      setSuggestions(res);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  const handleSelect = (item: MedicineAutocomplete) => {
    setQuery(item.name);
    setOpen(false);
    onChange(item.name, item.id, false);
  };

  const handleCustom = (customName: string) => {
    setQuery(customName);
    setOpen(false);
    onChange(customName, undefined, true);
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onChange(e.target.value, undefined, true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search medicine or type custom name…"
        className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none transition-all ${
          isDark
            ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-red-500 placeholder-slate-600"
            : "bg-white border-slate-300 text-slate-900 focus:border-red-500"
        }`}
      />
      {open && query.trim().length > 0 && (
        <div
          className={`absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-2xl overflow-hidden max-h-56 overflow-y-auto ${
            isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
          }`}
        >
          {loading && (
            <div className="px-3 py-2 text-xs text-slate-500">Searching inventory…</div>
          )}
          {!loading && suggestions.length > 0 && (
            <div>
              <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500 bg-slate-950/50" : "text-slate-400 bg-slate-100"}`}>
                From Store Inventory
              </div>
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={() => handleSelect(item)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    isDark ? "hover:bg-slate-800 text-slate-100" : "hover:bg-slate-50 text-slate-900"
                  }`}
                >
                  <div>
                    <span className="font-bold">{item.name}</span>
                    <span className={`ml-2 text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      ({item.category})
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${item.is_low_stock ? "bg-amber-950 text-amber-400" : "bg-emerald-950 text-emerald-400"}`}>
                    Stock: {item.stock_quantity}
                  </span>
                </button>
              ))}
            </div>
          )}
          {!loading && (
            <button
              type="button"
              onMouseDown={() => handleCustom(query)}
              className={`w-full text-left px-3 py-2.5 text-xs font-bold flex items-center gap-2 border-t ${
                isDark
                  ? "bg-amber-950/20 text-amber-400 border-amber-900/40 hover:bg-amber-950/40"
                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              }`}
            >
              <span>➕</span>
              <span>Add &ldquo;<strong>{query}</strong>&rdquo; as Custom Drug</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Quick Add Patient Modal ───────────────────────────────────────────
function QuickAddPatientModal({
  isDark = true,
  onAdd,
  onClose,
}: {
  isDark?: boolean;
  onAdd: (patient: ApiPatient) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [dob, setDob] = useState("1990-01-01");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      const created = await quickCreatePatient({
        name: name.trim(),
        village_location: village.trim(),
        date_of_birth: dob,
        gender,
        phone: phone.trim() || undefined,
      });
      onAdd(created);
    } catch (e: any) {
      setErr(e.message || "Failed to create patient");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = `w-full rounded-xl border px-3 py-2 text-xs focus:outline-none transition-all ${
    isDark
      ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-red-500 placeholder-slate-600"
      : "bg-white border-slate-300 text-slate-900 focus:border-red-500"
  }`;
  const labelClass = `block text-xs font-semibold mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className={`rounded-2xl border w-full max-w-md shadow-2xl p-6 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>👤</span> Add New Patient to Database
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {err && <div className="mb-4 text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelClass}>Patient Name *</label>
            <input type="text" required placeholder="e.g. Akshay Bombatkar" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Village / Location</label>
            <input type="text" placeholder="e.g. Bhandari, Motala" value={village} onChange={e => setVillage(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date of Birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value as any)} className={inputClass}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <input type="tel" placeholder="e.g. 9823456789" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
          </div>

          <div className="flex justify-end gap-3 pt-3 mt-4 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/20">
              {submitting ? "Saving to DB…" : "Save & Select Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main PrescriptionWriter Component ─────────────────────────────────
export default function PrescriptionWriter({
  isDark = true,
}: {
  inventoryMeds?: any;
  isDark?: boolean;
  userRole?: string;
}) {
  const { profile } = useDoctorProfile();
  const [patients, setPatients] = useState<ApiPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [diagnosis, setDiagnosis] = useState("Viral Fever");
  const [notes, setNotes] = useState("");
  const [lang, setLang] = useState<"mr" | "en" | "hi">("mr");
  const [rows, setRows] = useState<RxRow[]>([newRow()]);

  const [showAddPatient, setShowAddPatient] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch patient list from DB
  const loadPatients = useCallback(async (search?: string) => {
    try {
      const res = await listPatients(search);
      setPatients(res);
      if (res.length > 0 && !selectedPatientId) {
        setSelectedPatientId(res[0].id);
      }
    } catch (e: any) {
      console.error(e);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handlePatientSearchChange = (val: string) => {
    setPatientSearch(val);
    loadPatients(val);
  };

  // Row update handlers
  const updateRow = (id: string, patch: Partial<RxRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  const addRow = () => setRows((rs) => [...rs, newRow()]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // ── Calculate total prescribed quantity (auto) ──
  const calculateTotalQty = (r: RxRow): number => {
    const parseVal = (v: string) => {
      if (v === "½") return 0.5;
      const parsed = parseFloat(v);
      return isNaN(parsed) ? 0 : parsed;
    };
    const dailyCount = parseVal(r.morning) + parseVal(r.afternoon) + parseVal(r.night);
    const total = Math.ceil(dailyCount * (r.durationDays || 1));
    return total > 0 ? total : 6;
  };

  // ── Construct Print Data shape ──
  const buildCurrentPrintData = (): PrescriptionPrintData => {
    const patName = selectedPatient ? selectedPatient.name : (patientSearch || "PATIENT NAME");
    const patLocation = selectedPatient ? selectedPatient.village_location : "Bhandari";
    const patAge = selectedPatient?.age?.formatted || "30y";
    const patGender = selectedPatient?.gender || "MALE";

    return {
      prescriptionNumber: `RX-${new Date().getFullYear()}-0001`,
      date: new Date().toLocaleDateString("en-IN"),
      uhid: "U.H.I.D.",
      doctorProfile: profile,
      patientName: patName,
      patientAgeFormatted: patAge,
      patientGender: patGender,
      patientLocation: patLocation,
      diagnosis,
      notes,
      items: rows.map((r) => ({
        medicineName: r.medicineName || "Paracetamol 500mg",
        medType: r.medType,
        dosage: r.dosage,
        morning: r.morning,
        afternoon: r.afternoon,
        night: r.night,
        durationDays: r.durationDays,
        timing: r.timing,
        isCustom: r.isCustom,
        instructions: r.instructions,
      })),
    };
  };

  // ── Direct Browser Window Print ──
  const handleDirectPrint = () => {
    const data = buildCurrentPrintData();
    openPrintWindow(data, lang);
  };

  // ── Save & Print Prescription via Server ──
  const handleSaveAndPrint = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.medicineName.trim().length > 0);
    if (validRows.length === 0) {
      setMessage({ type: "error", text: "Please add at least one medicine item." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      if (selectedPatientId) {
        const itemsPayload: RxItem[] = validRows.map((r) => {
          const qty = calculateTotalQty(r);
          const freqString = `${r.morning}-${r.afternoon}-${r.night} ${r.timing.toLowerCase()}`;
          return {
            medicine_id: r.medicineId || undefined,
            medicine_name: r.medicineName,
            dosage: r.dosage || "500mg",
            frequency: freqString,
            duration_days: r.durationDays,
            quantity_prescribed: qty,
            instructions: r.isCustom ? r.medicineName : r.instructions,
            is_custom: r.isCustom,
          };
        });

        const createdRx = await createPrescription({
          patient_id: selectedPatientId,
          diagnosis,
          notes,
          items: itemsPayload,
        });

        setMessage({
          type: "success",
          text: `✅ Prescription ${createdRx.prescription_number} saved to DB! Opening print window…`,
        });

        const printUrl = getPrintUrl(createdRx.id, lang);
        window.open(printUrl, "_blank");
      } else {
        // Direct print fallback
        handleDirectPrint();
      }
    } catch (err: any) {
      console.warn("DB save error, falling back to direct print window", err);
      // Fallback print directly
      handleDirectPrint();
      setMessage({
        type: "success",
        text: `🖨️ Opening print window directly for ${selectedPatient ? selectedPatient.name : "Patient"}…`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const cardClass = `rounded-2xl border p-5 space-y-4 ${
    isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
  }`;
  const labelClass = `block text-xs font-semibold mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`;
  const inputClass = `w-full rounded-xl border px-3 py-2 text-xs focus:outline-none transition-all ${
    isDark
      ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-red-500 placeholder-slate-600"
      : "bg-white border-slate-300 text-slate-900 focus:border-red-500"
  }`;

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", width: "100%" }}>
      {/* ── LEFT: Form ── */}
      <div style={{ flex: "1 1 0", minWidth: 0 }} className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
              : "bg-rose-950/40 border-rose-800 text-rose-300"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Action Header bar */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">⚕️</span>
          <div>
            <h2 className="text-sm font-extrabold" style={{ color: isDark ? "white" : "#0f172a" }}>Suyog Hospital Prescription Writer</h2>
            <p className="text-[11px]" style={{ color: isDark ? "#64748b" : "#475569" }}>Multilingual (Marathi / Hindi / English) • A4 Print Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDirectPrint}
            className="px-4 py-1.5 rounded-xl font-bold text-xs bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 transition-all"
          >
            📄 Quick Print Window
          </button>
        </div>
      </div>
      {/* ── Patient Selector ── */}
      <div className={cardClass}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-extrabold" style={{ color: isDark ? "white" : "#0f172a" }}>
            <span className="text-red-500">👤</span> 1. Select Patient
          </div>
          <button
            type="button"
            onClick={() => setShowAddPatient(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-red-600/10 text-red-400 border border-red-600/30 hover:bg-red-600/20 transition-all"
          >
            ➕ Add New Patient
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Search Patient by Name or Village</label>
            <input
              type="text"
              placeholder="Type patient name…"
              value={patientSearch}
              onChange={(e) => handlePatientSearchChange(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Select from Matching List *</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className={inputClass}
            >
              <option value="">-- Choose Patient ({patients.length} available) --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.village_location || "Location N/A"}) — Age: {p.age?.formatted || "N/A"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedPatient && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-extrabold text-white">{selectedPatient.name}</span>
              <span className="ml-2 text-slate-400">• {selectedPatient.village_location}</span>
            </div>
            <div className="text-emerald-400 font-bold">
              Age: {selectedPatient.age?.formatted} | Gender: {selectedPatient.gender}
            </div>
          </div>
        )}
      </div>

      {/* ── Diagnosis & Prescription Meta ── */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-sm font-extrabold text-white pb-3 border-b border-slate-800">
          <span className="text-red-500">🩺</span> 2. Diagnosis &amp; Language
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Clinical Diagnosis / निदान *</label>
            <input
              type="text"
              required
              placeholder="e.g. Viral Fever, Hypertension, Diabetes"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Prescription Language</label>
            <select value={lang} onChange={(e) => setLang(e.target.value as any)} className={inputClass}>
              <option value="mr">Marathi (मराठी)</option>
              <option value="en">English</option>
              <option value="hi">Hindi (हिंदी)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Medicines Table ── */}
      <div className={cardClass}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-extrabold text-white">
            <span className="text-red-500">💊</span> 3. Prescribed Medicines
          </div>
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-600/10 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/20 transition-all"
          >
            ➕ Add Medicine Row
          </button>
        </div>

        <div className="space-y-4">
          {rows.map((r, idx) => (
            <div key={r.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>

                {/* Med Type */}
                <select
                  value={r.medType}
                  onChange={(e) => updateRow(r.id, { medType: e.target.value as MedType })}
                  className="rounded-lg border border-slate-800 bg-slate-900 text-white px-2 py-1.5 text-xs font-bold"
                >
                  {MED_TYPES.map((t) => (
                    <option key={t} value={t}>{t}.</option>
                  ))}
                </select>

                {/* Medicine Search Autocomplete */}
                <div className="flex-1">
                  <MedicineSearchInput
                    value={r.medicineName}
                    isDark={isDark}
                    onChange={(name, medId, custom) =>
                      updateRow(r.id, { medicineName: name, medicineId: medId, isCustom: !!custom })
                    }
                  />
                </div>

                {/* Delete row */}
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  disabled={rows.length === 1}
                  className="text-rose-500 hover:text-rose-400 disabled:opacity-30 p-1"
                >
                  ✕
                </button>
              </div>

              {/* Doses with ½ option */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center text-xs">
                {/* Morning */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">सकाळी (Morning)</label>
                  <select
                    value={r.morning}
                    onChange={(e) => updateRow(r.id, { morning: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-xs font-bold"
                  >
                    {DOSE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Afternoon */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">दुपारी (Afternoon)</label>
                  <select
                    value={r.afternoon}
                    onChange={(e) => updateRow(r.id, { afternoon: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-xs font-bold"
                  >
                    {DOSE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Night */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">रात्री (Night)</label>
                  <select
                    value={r.night}
                    onChange={(e) => updateRow(r.id, { night: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-xs font-bold"
                  >
                    {DOSE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">दिवस (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={r.durationDays}
                    onChange={(e) => updateRow(r.id, { durationDays: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-xs font-bold text-center"
                  />
                </div>

                {/* Timing */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Meal Timing</label>
                  <select
                    value={r.timing}
                    onChange={(e) => updateRow(r.id, { timing: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-xs font-bold"
                  >
                    <option value="After Meal">जेवनानंतर (After)</option>
                    <option value="Before Meal">जेवनाआधी (Before)</option>
                  </select>
                </div>
              </div>

              {/* Quick Presets row */}
              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                <span className="text-slate-500 font-semibold">Quick Doses:</span>
                {QUICK_DOSE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => updateRow(r.id, { morning: p.m, afternoon: p.a, night: p.n })}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:border-red-500 hover:text-white"
                  >
                    {p.label}
                  </button>
                ))}
                <span className="ml-auto text-emerald-400 font-bold">
                  Total Qty: {calculateTotalQty(r)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Advice / Notes ── */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-sm font-extrabold text-white pb-3 border-b border-slate-800">
          <span className="text-red-500">📝</span> 4. Doctor Advice &amp; Notes / सूचना
        </div>
        <textarea
          rows={3}
          placeholder="e.g. Drink plenty of warm water. Avoid cold & oily food. / पुरेसे गरम पाणी प्या. तळलेले व थंड पदार्थ टाळा."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
          style={{ fontFamily: "'Noto Sans Devanagari', Arial, sans-serif" }}
        />
      </div>

      {/* ── Submit & Server Print ── */}
      <div className={`flex items-center justify-between p-4 rounded-2xl border flex-wrap gap-4 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="text-xs" style={{ color: isDark ? "#64748b" : "#475569" }}>
          💡 Save to generate a prescription number. Quick Print skips saving.
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDirectPrint}
            className="px-4 py-3 rounded-xl font-bold text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            📄 Instant Print Window
          </button>
          <button
            type="button"
            onClick={handleSaveAndPrint}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 shadow-lg shadow-red-500/25 transition-all"
          >
            {submitting ? "Saving & Generating Print…" : "🖨️ Save & Print Prescription (A4)"}
          </button>
        </div>
      </div>

      {showAddPatient && (
        <QuickAddPatientModal
          isDark={isDark}
          onAdd={(p) => {
            setPatients((prev) => [p, ...prev]);
            setSelectedPatientId(p.id);
            setShowAddPatient(false);
          }}
          onClose={() => setShowAddPatient(false)}
        />
      )}
      </div>{/* end left form */}

      {/* ── RIGHT: Always-visible Live A4 Preview ── */}
      <div style={{
        width: 380,
        flexShrink: 0,
        position: "sticky",
        top: 100,
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        <div className={`p-3 rounded-2xl border text-xs font-bold ${isDark ? "bg-amber-950/30 border-amber-800/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
          📄 Live A4 Preview — updates as you type
        </div>
        <div style={{ transform: "scale(0.72)", transformOrigin: "top left", width: "139%", pointerEvents: "none" }}>
          <PrescriptionPrintTemplate data={buildCurrentPrintData()} />
        </div>
      </div>
    </div>
  );
}
