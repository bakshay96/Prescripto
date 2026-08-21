"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { TransliteratedInput, TransliteratedTextArea } from "./TransliteratedInput";

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
];

function newRow(): RxRow {
  return {
    id: Math.random().toString(36).substr(2, 9),
    medType: "Tab",
    medicineName: "",
    isCustom: false,
    dosage: "500mg",
    morning: "1",
    afternoon: "0",
    night: "1",
    durationDays: 5,
    timing: "After Meal",
    instructions: "जेवणानंतर घ्यावे (Take after food)",
  };
}

function parseDoseNum(val: string): number {
  if (val === "½") return 0.5;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
}

function calculateTotalQty(row: RxRow): number {
  const daily = parseDoseNum(row.morning) + parseDoseNum(row.afternoon) + parseDoseNum(row.night);
  return Math.ceil(daily * (row.durationDays || 1));
}

/**
 * Autocomplete Input Component for Medicines with Multi-Theme Support
 */
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
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchSuggestions = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await autocompleteMedicines(searchTerm);
      setSuggestions(res);
      setIsOpen(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange(val, undefined, true);
    fetchSuggestions(val);
  };

  const handleSelect = (item: MedicineAutocomplete) => {
    setQuery(item.name);
    onChange(item.name, item.id, false);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <TransliteratedInput
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          if (query.trim().length >= 1) fetchSuggestions(query);
        }}
        placeholder="Type medicine name (e.g. Paracetamol 500mg)…"
        className={`w-full rounded-lg border px-3 py-1.5 text-xs font-bold focus:outline-none transition-all ${
          isDark
            ? "bg-slate-900 border-slate-700 text-white focus:border-red-500 placeholder-slate-500"
            : "bg-white border-slate-300 text-slate-900 focus:border-red-500 placeholder-slate-400"
        }`}
      />

      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border shadow-2xl max-h-48 overflow-y-auto text-xs ${
            isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          {loading && <div className="p-2.5 text-slate-400 text-center">Searching pharmacy stock…</div>}

          {!loading && suggestions.length === 0 && (
            <div className="p-2.5 text-slate-400 text-center">
              No matching stock. <span className="text-red-500 font-bold">Press Enter to add "{query}" as custom entry</span>
            </div>
          )}

          {!loading &&
            suggestions.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelect(s)}
                className={`p-2.5 cursor-pointer flex items-center justify-between border-b last:border-0 transition-all ${
                  isDark ? "border-slate-800 hover:bg-slate-800" : "border-slate-100 hover:bg-slate-100"
                }`}
              >
                <div>
                  <span className={`font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>{s.name}</span>
                  <span className={`ml-2 text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>({s.category || "General"})</span>
                </div>
                <div className="text-right text-[10px]">
                  <span className={`font-bold ${s.stock_quantity > 10 ? "text-emerald-500" : "text-amber-500"}`}>
                    Stock: {s.stock_quantity}
                  </span>
                  <span className={`ml-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>₹{(s as any).price || 0}</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Quick Add New Patient Modal
 */
function QuickAddPatientModal({
  onAdd,
  onClose,
  isDark = true,
}: {
  onAdd: (patient: ApiPatient) => void;
  onClose: () => void;
  isDark?: boolean;
}) {
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [dob, setDob] = useState("1995-01-01");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Patient name is required.");
      return;
    }

    setSubmitting(true);
    setErr(null);
    try {
      const res = await quickCreatePatient({
        name,
        village_location: village,
        date_of_birth: dob,
        gender,
        phone,
      });
      onAdd(res);
    } catch (error: any) {
      setErr(error.message || "Failed to create patient");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = `w-full rounded-xl border px-3 py-2 text-xs focus:outline-none transition-all ${
    isDark
      ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-red-500"
      : "bg-white border-slate-300 text-slate-900 focus:border-red-500"
  }`;
  const labelClass = `block text-xs font-semibold mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <h3 className="text-sm font-extrabold flex items-center gap-2">
            <span className="text-red-500">➕</span> Quick Register Patient
          </h3>
          <button onClick={onClose} className={isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}>✕</button>
        </div>

        {err && <div className="mb-4 text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelClass}>Patient Name *</label>
            <TransliteratedInput required placeholder="e.g. Akshay Bombatkar" value={name} onChange={setName} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Village / Location</label>
            <TransliteratedInput placeholder="e.g. Bhandari, Motala" value={village} onChange={setVillage} className={inputClass} />
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

          <div className={`flex items-center justify-end gap-3 pt-3 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <button type="button" onClick={onClose} className={`px-4 py-2 text-xs font-bold ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-500/20"
            >
              {submitting ? "Registering…" : "Save & Select Patient"}
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

  // Split pane width state & drag handlers (Default 50% - 50% full width split)
  const [leftWidthPct, setLeftWidthPct] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const flexContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("rx_writer_split_pct");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 30 && parsed <= 85) {
        setLeftWidthPct(parsed);
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!flexContainerRef.current) return;
      const rect = flexContainerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const newPct = (relativeX / rect.width) * 100;
      const clampedPct = Math.min(85, Math.max(30, newPct));
      setLeftWidthPct(clampedPct);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem("rx_writer_split_pct", String(leftWidthPct));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, leftWidthPct]);

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

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // ── Row Manipulations ──
  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));
  const updateRow = (id: string, patch: Partial<RxRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  // Build print data object for live preview
  const buildCurrentPrintData = (): PrescriptionPrintData => {
    const validRows = rows.filter((r) => r.medicineName.trim().length > 0);
    return {
      prescriptionNumber: "RX-DRAFT",
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      doctorProfile: {
        hospitalName: profile.hospitalName || "Suyog Hospital",
        hospitalNameMr: profile.hospitalNameMr,
        doctorName: profile.doctorName || "Dr. Vikas Karande",
        doctorNameMr: profile.doctorNameMr,
        qualifications: profile.qualifications || "M.D. (Medicine)",
        regNumber: profile.regNumber || "MMC 2012/03/0842",
        specialties: profile.specialties || "Multispeciality & Critical Care Center",
        address: profile.address || "Main Road, Near Bus Stand, Motala, Dist. Buldhana",
        phone: profile.phone || "07267-242100 | Emergency: 98230 00000",
        facilities: profile.facilities || ["General Medicine", "ICU & OPD", "Laboratory"],
        clinicHours: profile.clinicHours || "Morning 9 to 1 | Evening 5 to 9",
        signatureDataUrl: profile.signatureDataUrl ?? null,
      },
      patientName: selectedPatient ? selectedPatient.name : "Patient Name",
      patientAgeFormatted: selectedPatient?.age?.formatted || "N/A",
      patientGender: selectedPatient?.gender || "M",
      patientLocation: selectedPatient ? selectedPatient.village_location : "Village Location",
      diagnosis: diagnosis || "General Consultation",
      items: validRows.map((r) => ({
        medType: r.medType,
        medicineName: r.medicineName,
        morning: r.morning,
        afternoon: r.afternoon,
        night: r.night,
        durationDays: r.durationDays,
        timing: r.timing,
      })),
      notes: notes || "Take warm water. Rest well.",
    };
  };

  // ── Direct Window Print (No DB required) ──
  const handleDirectPrint = () => {
    const data = buildCurrentPrintData();
    openPrintWindow(data);
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
        handleDirectPrint();
      }
    } catch (err: any) {
      console.warn("DB save error, falling back to direct print window", err);
      handleDirectPrint();
      setMessage({
        type: "success",
        text: `🖨️ Opening print window directly for ${selectedPatient ? selectedPatient.name : "Patient"}…`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Multi-theme responsive classes
  const cardClass = `rounded-2xl border p-5 space-y-4 shadow-xl ${
    isDark ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
  }`;
  const labelClass = `block text-xs font-bold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`;
  const inputClass = `w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold focus:outline-none transition-all ${
    isDark
      ? "bg-slate-950 border-slate-700 text-white focus:border-red-500 placeholder-slate-500"
      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-red-500 placeholder-slate-400"
  }`;

  const rowCardClass = `p-4 rounded-xl space-y-3 border transition-all ${
    isDark ? "bg-slate-950/90 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
  }`;

  const rowSelectClass = `rounded-lg border px-2 py-1.5 text-xs font-bold focus:outline-none transition-all ${
    isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
  }`;

  const rowInputClass = `w-full rounded-lg border px-2 py-1.5 text-xs font-bold text-center focus:outline-none transition-all ${
    isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
  }`;

  const rowPresetClass = `px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
    isDark
      ? "bg-slate-900 border-slate-700 text-slate-300 hover:border-red-500 hover:text-white"
      : "bg-white border-slate-300 text-slate-700 hover:border-red-500 hover:text-slate-900"
  }`;

  const headerBorderClass = `pb-3 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`;

  return (
    <div
      ref={flexContainerRef}
      style={{
        display: "flex",
        alignItems: "flex-start",
        width: "100%",
        gap: 0,
        position: "relative",
        userSelect: isDragging ? "none" : "auto",
      }}
    >
      {/* ── LEFT: Form Container ── */}
      <div
        style={{
          width: `${leftWidthPct}%`,
          flexShrink: 0,
          paddingRight: 12,
          minWidth: 280,
        }}
        className="space-y-6"
      >
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
            className={`px-4 py-1.5 rounded-xl font-bold text-xs border transition-all ${
              isDark ? "bg-slate-800 text-white border-slate-700 hover:bg-slate-700" : "bg-slate-900 text-white border-slate-800 hover:bg-slate-800"
            }`}
          >
            📄 Quick Print Window
          </button>
        </div>
      </div>

      {/* ── Patient Selector ── */}
      <div className={cardClass}>
        <div className={`flex items-center justify-between ${headerBorderClass}`}>
          <div className="flex items-center gap-2 text-sm font-extrabold" style={{ color: isDark ? "white" : "#0f172a" }}>
            <span className="text-red-500">👤</span> 1. Select Patient
          </div>
          <button
            type="button"
            onClick={() => setShowAddPatient(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-red-600/10 text-red-500 border border-red-600/30 hover:bg-red-600/20 transition-all"
          >
            ➕ Add New Patient
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Search Patient by Name or Village</label>
            <TransliteratedInput
              placeholder="Type patient name…"
              value={patientSearch}
              onChange={(val) => handlePatientSearchChange(val)}
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
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
            isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
          }`}>
            <div>
              <span className={`font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>{selectedPatient.name}</span>
              <span className={`ml-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>• {selectedPatient.village_location}</span>
            </div>
            <div className="text-emerald-500 font-extrabold">
              Age: {selectedPatient.age?.formatted} | Gender: {selectedPatient.gender}
            </div>
          </div>
        )}
      </div>

      {/* ── Diagnosis & Prescription Meta ── */}
      <div className={cardClass}>
        <div className={`flex items-center gap-2 text-sm font-extrabold ${headerBorderClass}`} style={{ color: isDark ? "white" : "#0f172a" }}>
          <span className="text-red-500">🩺</span> 2. Diagnosis &amp; Language
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Clinical Diagnosis / निदान *</label>
            <TransliteratedInput
              required
              placeholder="e.g. Viral Fever, Hypertension, Diabetes"
              value={diagnosis}
              onChange={(val) => setDiagnosis(val)}
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

      {/* ── Medicines Table Multi-Theme Container ── */}
      <div className={cardClass}>
        <div className={`flex items-center justify-between ${headerBorderClass}`}>
          <div className="flex items-center gap-2 text-sm font-extrabold" style={{ color: isDark ? "white" : "#0f172a" }}>
            <span className="text-red-500">💊</span> 3. Prescribed Medicines
          </div>
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-600/10 text-emerald-500 border border-emerald-600/30 hover:bg-emerald-600/20 transition-all"
          >
            ➕ Add Medicine Row
          </button>
        </div>

        <div className="space-y-4">
          {rows.map((r, idx) => (
            <div key={r.id} className={rowCardClass}>
              <div className="flex items-center justify-between gap-2">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0">
                  {idx + 1}
                </span>

                {/* Med Type */}
                <select
                  value={r.medType}
                  onChange={(e) => updateRow(r.id, { medType: e.target.value as MedType })}
                  className={rowSelectClass}
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
                  className="text-rose-500 hover:text-rose-400 disabled:opacity-30 p-1 flex-shrink-0 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Doses with ½ option */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center text-xs">
                {/* Morning */}
                <div>
                  <label className={`text-[10px] block mb-0.5 font-bold ${isDark ? "text-slate-400" : "text-slate-600"}`}>सकाळी (Morning)</label>
                  <select
                    value={r.morning}
                    onChange={(e) => updateRow(r.id, { morning: e.target.value })}
                    className={rowInputClass}
                  >
                    {DOSE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Afternoon */}
                <div>
                  <label className={`text-[10px] block mb-0.5 font-bold ${isDark ? "text-slate-400" : "text-slate-600"}`}>दुपारी (Afternoon)</label>
                  <select
                    value={r.afternoon}
                    onChange={(e) => updateRow(r.id, { afternoon: e.target.value })}
                    className={rowInputClass}
                  >
                    {DOSE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Night */}
                <div>
                  <label className={`text-[10px] block mb-0.5 font-bold ${isDark ? "text-slate-400" : "text-slate-600"}`}>रात्री (Night)</label>
                  <select
                    value={r.night}
                    onChange={(e) => updateRow(r.id, { night: e.target.value })}
                    className={rowInputClass}
                  >
                    {DOSE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className={`text-[10px] block mb-0.5 font-bold ${isDark ? "text-slate-400" : "text-slate-600"}`}>दिवस (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={r.durationDays}
                    onChange={(e) => updateRow(r.id, { durationDays: parseInt(e.target.value) || 1 })}
                    className={rowInputClass}
                  />
                </div>

                {/* Timing */}
                <div>
                  <label className={`text-[10px] block mb-0.5 font-bold ${isDark ? "text-slate-400" : "text-slate-600"}`}>Meal Timing</label>
                  <select
                    value={r.timing}
                    onChange={(e) => updateRow(r.id, { timing: e.target.value as any })}
                    className={rowInputClass}
                  >
                    <option value="After Meal">जेवनानंतर (After)</option>
                    <option value="Before Meal">जेवनाआधी (Before)</option>
                  </select>
                </div>
              </div>

              {/* Quick Presets row */}
              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                <span className={`font-extrabold ${isDark ? "text-slate-400" : "text-slate-600"}`}>Quick Doses:</span>
                {QUICK_DOSE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => updateRow(r.id, { morning: p.m, afternoon: p.a, night: p.n })}
                    className={rowPresetClass}
                  >
                    {p.label}
                  </button>
                ))}
                <span className="ml-auto text-emerald-500 font-extrabold">
                  Total Qty: {calculateTotalQty(r)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Advice / Notes ── */}
      <div className={cardClass}>
        <div className={`flex items-center gap-2 text-sm font-extrabold ${headerBorderClass}`} style={{ color: isDark ? "white" : "#0f172a" }}>
          <span className="text-red-500">📝</span> 4. Doctor Advice &amp; Notes / सूचना
        </div>
        <TransliteratedTextArea
          rows={3}
          placeholder="e.g. Drink plenty of warm water. Avoid cold & oily food. / पुरेसे गरम पाणी प्या. तळलेले व थंड पदार्थ टाळा."
          value={notes}
          onChange={(val) => setNotes(val)}
          className={inputClass}
        />
      </div>

      {/* ── Submit & Server Print ── */}
      <div className={`flex items-center justify-between p-4 rounded-2xl border flex-wrap gap-4 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="text-xs font-semibold" style={{ color: isDark ? "#94a3b8" : "#475569" }}>
          💡 Save to generate a prescription number. Quick Print skips saving.
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDirectPrint}
            className={`px-4 py-3 rounded-xl font-bold text-xs border transition-all ${
              isDark ? "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700" : "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200"
            }`}
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

      {/* ── MIDDLE: Interactive Drag Resizable Splitter Bar & Preset Controls ── */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: 16,
          flexShrink: 0,
          alignSelf: "stretch",
          cursor: "col-resize",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 100,
          gap: 12,
          zIndex: 10,
          margin: "0 -4px",
        }}
        title="Drag left or right to adjust container width"
      >
        {/* Visual Grip Bar */}
        <div
          style={{
            width: 6,
            height: 160,
            borderRadius: 6,
            background: isDragging
              ? "#ff671f"
              : isDark
              ? "rgba(255,255,255,0.2)"
              : "rgba(0,0,0,0.15)",
            boxShadow: isDragging ? "0 0 12px #ff671f" : "none",
            transition: "background 0.15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 10,
          }}
        >
          ⋮
        </div>

        {/* Quick Preset Buttons (50%, 60%, 70%) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            background: isDark ? "#0f172a" : "#f8fafc",
            border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
            borderRadius: 8,
            padding: 3,
            fontSize: 8,
            fontWeight: 800,
            color: isDark ? "#94a3b8" : "#475569",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {[
            { label: "50%", pct: 50 },
            { label: "60%", pct: 60 },
            { label: "70%", pct: 70 },
          ].map((p) => (
            <button
              key={p.pct}
              type="button"
              onClick={() => {
                setLeftWidthPct(p.pct);
                localStorage.setItem("rx_writer_split_pct", String(p.pct));
              }}
              style={{
                border: "none",
                padding: "3px 5px",
                borderRadius: 4,
                background: Math.round(leftWidthPct) === p.pct ? "#ff671f" : "transparent",
                color: Math.round(leftWidthPct) === p.pct ? "#fff" : "inherit",
                cursor: "pointer",
                fontSize: 8,
                fontWeight: 900,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Always-visible Live A4 Preview Container ── */}
      <div
        style={{
          width: `${100 - leftWidthPct}%`,
          flexShrink: 0,
          paddingLeft: 12,
          position: "sticky",
          top: 100,
          maxHeight: "calc(100vh - 120px)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between ${isDark ? "bg-amber-950/30 border-amber-800/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
          <span>📄 Live A4 Preview — updates as you type</span>
          <span style={{ fontSize: 10, opacity: 0.8 }}>Width: {Math.round(100 - leftWidthPct)}%</span>
        </div>
        <div
          style={{
            transform: `scale(${(100 - leftWidthPct) / 50})`,
            transformOrigin: "top left",
            width: `${(50 / Math.max(1, 100 - leftWidthPct)) * 100}%`,
            pointerEvents: "none",
            transition: isDragging ? "none" : "transform 0.15s ease",
          }}
        >
          <PrescriptionPrintTemplate data={buildCurrentPrintData()} />
        </div>
      </div>
    </div>
  );
}
