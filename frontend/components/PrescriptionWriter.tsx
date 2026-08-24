"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  listPatients,
  quickCreatePatient,
  autocompleteMedicines,
  createPrescription,
  getPrintUrl,
  sendWhatsAppPrescription,
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

export type MedType = "Tab" | "Cap" | "Syp" | "Inj" | "Oint" | "Drop" | "Pouch";

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
  unitPrice?: number;
}

const MED_TYPES: MedType[] = ["Tab", "Cap", "Syp", "Inj", "Oint", "Drop", "Pouch"];

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

function detectMedType(name: string, category?: string, unit?: string): MedType {
  const cat = (category || "").toLowerCase();
  if (cat.includes("capsule")) return "Cap";
  if (cat.includes("tablet")) return "Tab";
  if (cat.includes("syrup")) return "Syp";
  if (cat.includes("injection")) return "Inj";
  if (cat.includes("ointment") || cat.includes("cream") || cat.includes("gel")) return "Oint";
  if (cat.includes("drop")) return "Drop";
  if (cat.includes("pouch") || cat.includes("sachet")) return "Pouch";

  const str = `${name} ${unit || ""}`.toLowerCase();
  if (str.includes("pouch") || str.includes("sachet") || str.includes("powder") || str.includes("ors") || str.includes("eno")) return "Pouch";
  if (str.includes("inj") || str.includes("vial") || str.includes("ampoule") || str.includes("injection") || str.includes("insulin")) return "Inj";
  if (str.includes("cap") || str.includes("capsule")) return "Cap";
  if (str.includes("syr") || str.includes("syp") || str.includes("syrup") || str.includes("tonic") || str.includes("suspension") || str.includes("liquid")) return "Syp";
  if (str.includes("gel") || str.includes("cream") || str.includes("oint") || str.includes("ointment")) return "Oint";
  if (str.includes("drop") || str.includes("eye") || str.includes("ear") || str.includes("ophthalmic")) return "Drop";
  return "Tab";
}

/**
 * Autocomplete Input Component for Medicines with Multi-Theme Support
 */
function MedicineSearchInput({
  value,
  onChange,
  isDark = true,
  excludedNames = [],
}: {
  value: string;
  onChange: (name: string, medicineId?: string, isCustom?: boolean, autoType?: MedType, unitPrice?: number) => void;
  isDark?: boolean;
  excludedNames?: string[];
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MedicineAutocomplete[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

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
      const filtered = res.filter(
        (m) => !excludedNames.some((ex) => ex && ex.toLowerCase() === m.name.toLowerCase())
      );
      setSuggestions(filtered);
      setHighlightedIndex(0);
      setIsOpen(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    const autoType = detectMedType(val);
    onChange(val, undefined, true, autoType, 0);
    fetchSuggestions(val);
  };

  const handleSelect = (item: MedicineAutocomplete) => {
    setQuery(item.name);
    const autoType = detectMedType(item.name, item.category, item.unit);
    const unitPrice = item.price !== undefined ? item.price : 5.0;
    onChange(item.name, item.id, false, autoType, unitPrice);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      <TransliteratedInput
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
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
            suggestions.map((s, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`p-2.5 cursor-pointer flex items-center justify-between border-b last:border-0 transition-all ${
                    isHighlighted
                      ? isDark
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-black"
                        : "bg-amber-100 border-amber-300 text-amber-900 font-black"
                      : isDark
                      ? "border-slate-800 hover:bg-slate-800 text-slate-200"
                      : "border-slate-100 hover:bg-slate-100 text-slate-900"
                  }`}
                >
                  <div>
                    <span className="font-extrabold">{s.name}</span>
                    <span className={`ml-2 text-[10px] ${isHighlighted ? "text-amber-400" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                      ({s.category || "General"})
                    </span>
                  </div>
                  <div className="text-right text-[10px] flex items-center gap-2">
                    <span className={`font-bold ${s.stock_quantity > 10 ? "text-emerald-500" : "text-amber-500"}`}>
                      Stock: {s.stock_quantity}
                    </span>
                    <span className="font-extrabold text-amber-400">₹{(s as any).price || 0}</span>
                    {isHighlighted && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                        TAB / ↵ SELECT
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
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
  const [ageYears, setAgeYears] = useState<number | "">(30);
  const [ageMonths, setAgeMonths] = useState<number | "">(0);
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
        age_years: typeof ageYears === "number" ? ageYears : 30,
        age_months: typeof ageMonths === "number" ? ageMonths : 0,
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
            <span className="text-red-500">➕</span> Quick Register Patient (Age Input)
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

          {/* Age Inputs (Years & Months) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Age (Years) *</label>
              <input
                type="number"
                min={0}
                max={120}
                required
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputClass}
                placeholder="e.g. 28"
              />
            </div>
            <div>
              <label className={labelClass}>Age (Months)</label>
              <input
                type="number"
                min={0}
                max={11}
                value={ageMonths}
                onChange={(e) => setAgeMonths(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputClass}
                placeholder="e.g. 6"
              />
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
  const [inlineVillage, setInlineVillage] = useState("Motala");
  const [inlineAge, setInlineAge] = useState<number>(30);
  const [inlineGender, setInlineGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");

  const [diagnosis, setDiagnosis] = useState("Viral Fever");
  const [notes, setNotes] = useState("");
  const [lang, setLang] = useState<"mr" | "en" | "hi">("mr");
  const [rows, setRows] = useState<RxRow[]>([newRow()]);

  // Follow-up & WhatsApp Delivery Gateway state
  const [followupDays, setFollowupDays] = useState<number>(7);
  const [customFollowupDate, setCustomFollowupDate] = useState<string>("");
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [whatsappModalData, setWhatsappModalData] = useState<{
    url: string;
    phone: string;
    patientName: string;
    rxNum: string;
  } | null>(null);

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
    } catch (e: any) {
      console.error(e);
    }
  }, []);

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
        hospitalName: profile.hospitalName || "",
        hospitalNameMr: profile.hospitalNameMr,
        doctorName: profile.doctorName || "",
        doctorNameMr: profile.doctorNameMr,
        qualifications: profile.qualifications || "",
        regNumber: profile.regNumber || "",
        specialties: profile.specialties || "",
        address: profile.address || "",
        phone: profile.phone || "",
        facilities: profile.facilities || [],
        clinicHours: profile.clinicHours || "",
        signatureDataUrl: profile.signatureDataUrl ?? null,
      },
      patientName: selectedPatient ? selectedPatient.name : (patientSearch || "Patient Name"),
      patientAgeFormatted: selectedPatient?.age?.formatted || `${inlineAge}y`,
      patientGender: selectedPatient?.gender || inlineGender,
      patientLocation: selectedPatient ? selectedPatient.village_location : inlineVillage,
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
    if (selectedPatient && selectedPatient.is_banned) {
      setMessage({
        type: "error",
        text: `🚫 Patient '${selectedPatient.name}' is banned from OPD services. (${selectedPatient.ban_reason || "Rule Violation"})`,
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
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

      // Calculate follow-up date
      let calculatedFollowupDate: string | null = null;
      if (followupDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + followupDays);
        calculatedFollowupDate = d.toISOString().split("T")[0];
      } else if (customFollowupDate) {
        calculatedFollowupDate = customFollowupDate;
      }

      const payload: any = {
        diagnosis,
        notes,
        items: itemsPayload,
        followup_date: calculatedFollowupDate,
      };

      if (selectedPatientId) {
        payload.patient_id = selectedPatientId;
      } else {
        // Auto-create new patient inline without separate modal!
        payload.new_patient = {
          name: patientSearch.trim() || "OPD Patient",
          village_location: inlineVillage || "Motala",
          age_years: inlineAge || 30,
          gender: inlineGender || "MALE",
        };
      }

      const createdRx = await createPrescription(payload);

      setMessage({
        type: "success",
        text: `✅ Prescription ${createdRx.prescription_number} saved to DB! Opening print window…`,
      });

      // Synchronously notify all components and tabs of real-time update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("prescription-saved", { detail: createdRx }));
      }

      // WhatsApp Delivery Gateway Trigger
      const patientPhone = selectedPatient?.phone || "9876543210";
      const patientName = selectedPatient ? selectedPatient.name : (patientSearch || "Patient");

      if (sendWhatsApp && createdRx?.id) {
        try {
          const waRes = await sendWhatsAppPrescription({
            prescription_id: createdRx.id,
            phone: patientPhone,
            patient_name: patientName,
            language: lang,
          });
          setWhatsappModalData({
            url: waRes.whatsapp_url,
            phone: waRes.phone,
            patientName,
            rxNum: createdRx.prescription_number,
          });
        } catch {
          // ignore
        }
      }

      const printUrl = getPrintUrl(createdRx.id, lang);
      window.open(printUrl, "_blank");

      // Reset form
      setPatientSearch("");
      setSelectedPatientId("");
      loadPatients();
    } catch (err: any) {
      console.warn("DB save error, falling back to direct print window", err);
      handleDirectPrint();
      setMessage({
        type: "success",
        text: `🖨️ Opening print window directly for ${selectedPatient ? selectedPatient.name : patientSearch || "Patient"}…`,
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
            <h2 className="text-sm font-extrabold" style={{ color: isDark ? "white" : "#0f172a" }}>{profile.hospitalName ? `${profile.hospitalName} Prescription Writer` : "OPD Prescription Writer"}</h2>
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
            <span className="text-red-500">👤</span> 1. Select or Type Patient Name
          </div>
          {selectedPatientId ? (
            <span className="ux4g-badge ux4g-badge-green">EXISTING PATIENT</span>
          ) : (
            <span className="ux4g-badge ux4g-badge-saffron">✨ NEW PATIENT (AUTO-SAVE)</span>
          )}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <label className={labelClass}>Patient Name (Search Existing or Type New) *</label>
            <TransliteratedInput
              placeholder="Type patient name e.g. Akshay Bombatkar…"
              value={patientSearch}
              onChange={(val) => {
                setPatientSearch(val);
                // Check if typed name matches an existing patient
                const match = patients.find((p) => p.name.toLowerCase() === val.toLowerCase());
                if (match) {
                  setSelectedPatientId(match.id);
                } else {
                  setSelectedPatientId("");
                }
                loadPatients(val);
              }}
              className={inputClass}
            />

            {/* Matching Patient Dropdown Suggestions */}
            {patients.length > 0 && patientSearch.trim().length > 0 && !selectedPatientId && (
              <div
                className={`mt-1 rounded-xl border p-2 text-xs space-y-1 ${
                  isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                <div className="text-[10px] text-slate-400 font-bold px-2">Existing Patient Matches:</div>
                {patients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setPatientSearch(p.name);
                    }}
                    className={`p-2 rounded-lg cursor-pointer flex justify-between items-center transition-all ${
                      isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                    }`}
                  >
                    <span>
                      <strong>{p.name}</strong> ({p.village_location})
                    </span>
                    <span className="text-emerald-500 font-bold">
                      Age: {p.age?.formatted || "N/A"} · {p.gender}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* If Existing Patient Selected */}
          {selectedPatient && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              selectedPatient.is_banned
                ? "bg-rose-950/40 border-rose-800 text-rose-300"
                : isDark
                ? "bg-slate-950 border-slate-800"
                : "bg-slate-100 border-slate-200"
            }`}>
              <div>
                <span className={`font-extrabold ${selectedPatient.is_banned ? "text-rose-400" : isDark ? "text-white" : "text-slate-900"}`}>
                  {selectedPatient.name}
                </span>
                <span className={`ml-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>• {selectedPatient.village_location}</span>
                {selectedPatient.is_banned && (
                  <span className="ml-2 px-2 py-0.5 rounded bg-rose-900 text-rose-200 font-extrabold text-[10px]">
                    🚫 BANNED FROM OPD SERVICES ({selectedPatient.ban_reason || "Rule Violation"})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-500 font-extrabold">
                  Age: {selectedPatient.age?.formatted} | Gender: {selectedPatient.gender}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientId("");
                    setPatientSearch("");
                  }}
                  className="text-slate-400 hover:text-red-400 text-xs"
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          )}

          {/* If NEW Patient (Inline Village & Age Inputs — No Modal Required!) */}
          {!selectedPatientId && patientSearch.trim().length > 0 && (
            <div className={`p-3 rounded-xl border space-y-2 text-xs ${
              isDark ? "bg-emerald-950/20 border-emerald-800/40" : "bg-emerald-50 border-emerald-200"
            }`}>
              <div className="text-emerald-500 font-bold flex items-center gap-1.5">
                <span>✨ New Patient:</span>
                <strong>"{patientSearch}"</strong>
                <span className="text-[10px] font-normal text-slate-400">(Auto-creates in database on save)</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Village / Location</label>
                  <TransliteratedInput
                    placeholder="Motala"
                    value={inlineVillage}
                    onChange={setInlineVillage}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Age (Years)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={inlineAge}
                    onChange={(e) => setInlineAge(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Gender</label>
                  <select
                    value={inlineGender}
                    onChange={(e) => setInlineGender(e.target.value as any)}
                    className={inputClass}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
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

        {/* Follow-up Date & WhatsApp Delivery Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: isDark ? "#334155" : "#e2e8f0" }}>
          <div>
            <label className={labelClass}>📅 OPD Follow-up Date / फॉलो-अप तारीख</label>
            <div className="flex gap-2">
              <select
                value={followupDays}
                onChange={(e) => setFollowupDays(Number(e.target.value))}
                className={inputClass}
              >
                <option value={3}>3 Days (3 दिवस)</option>
                <option value={7}>7 Days (1 आठवडा)</option>
                <option value={14}>14 Days (2 आठवडे)</option>
                <option value={30}>30 Days (1 महिना)</option>
                <option value={0}>Custom Date / No Followup</option>
              </select>
              {followupDays === 0 && (
                <input
                  type="date"
                  value={customFollowupDate}
                  onChange={(e) => setCustomFollowupDate(e.target.value)}
                  className={inputClass}
                />
              )}
            </div>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-500 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30 w-full">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>📱 Send Digital Rx link via WhatsApp to Patient</span>
            </label>
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

                {/* Auto-Selected Med Type Category Pill Badge */}
                <div className="flex-shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all ${
                      r.medType === "Cap"
                        ? "bg-purple-950/80 border-purple-800 text-purple-300"
                        : r.medType === "Inj"
                        ? "bg-rose-950/80 border-rose-800 text-rose-300"
                        : r.medType === "Syp"
                        ? "bg-amber-950/80 border-amber-800 text-amber-300"
                        : r.medType === "Pouch"
                        ? "bg-teal-950/80 border-teal-800 text-teal-300"
                        : r.medType === "Oint"
                        ? "bg-indigo-950/80 border-indigo-800 text-indigo-300"
                        : r.medType === "Drop"
                        ? "bg-cyan-950/80 border-cyan-800 text-cyan-300"
                        : "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                    }`}
                    title="Category auto-detected from medicine stock database"
                  >
                    {r.medType === "Inj"
                      ? "💉 Inj."
                      : r.medType === "Cap"
                      ? "💊 Cap."
                      : r.medType === "Syp"
                      ? "🥤 Syp."
                      : r.medType === "Pouch"
                      ? "📦 Pouch"
                      : r.medType === "Oint"
                      ? "🧴 Oint."
                      : r.medType === "Drop"
                      ? "💧 Drop."
                      : "💊 Tab."}
                  </span>
                </div>

                {/* Medicine Search Autocomplete */}
                <div className="flex-1">
                  <MedicineSearchInput
                    value={r.medicineName}
                    isDark={isDark}
                    excludedNames={rows.filter((other) => other.id !== r.id).map((other) => other.medicineName)}
                    onChange={(name, medId, custom, autoType, unitPrice) => {
                      updateRow(r.id, {
                        medicineName: name,
                        medicineId: medId,
                        isCustom: !!custom,
                        medType: autoType || r.medType,
                        unitPrice: unitPrice !== undefined ? unitPrice : r.unitPrice,
                      });

                      // Auto-add next blank row if choosing a medicine in the last row!
                      if (name && name.trim().length > 0 && idx === rows.length - 1) {
                        addRow();
                      }
                    }}
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

              {/* Quick Presets & Doctor Read-Only Price Row */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] pt-1.5 border-t border-slate-800/40">
                <div className="flex items-center gap-1.5">
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
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 font-bold flex items-center gap-1 text-[10px]">
                    <span className="text-slate-400 font-medium">💰 Unit Price (View Only):</span>
                    <span className="text-amber-300 font-black">₹{(r.unitPrice || 0).toFixed(2)}</span>
                  </div>
                  <span className="text-emerald-400 font-black text-[11px]">
                    Total Qty: {calculateTotalQty(r)} units = ₹{((r.unitPrice || 0) * calculateTotalQty(r)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* 🧾 Live Total Estimated Bill Ticker for Doctor View */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
            isDark ? "bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-emerald-800/60" : "bg-emerald-50 border-emerald-200"
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-xl">
                🧾
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Estimated Prescription Cost for Patient</span>
                  <span className="ux4g-badge ux4g-badge-green" style={{ fontSize: 9 }}>VIEW ONLY FOR DOCTOR</span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Total {rows.reduce((sum, r) => sum + calculateTotalQty(r), 0)} unit(s) prescribed across {rows.filter(r => r.medicineName.trim()).length} medication(s).
                </p>
              </div>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <div className="text-[10px] font-bold uppercase text-slate-400">Patient Expected Pharmacy Bill</div>
              <div className="text-2xl font-black text-amber-300">
                ₹{rows.reduce((acc, r) => acc + ((r.unitPrice || 0) * calculateTotalQty(r)), 0).toFixed(2)}
              </div>
            </div>
          </div>
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

      {whatsappModalData && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`p-6 rounded-2xl border shadow-2xl max-w-md w-full space-y-4 ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-emerald-500 flex items-center gap-2">
                <span>📱 WhatsApp Prescription Gateway</span>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappModalData(null)}
                className="text-xs font-black text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2 leading-relaxed">
              <p>
                Digital prescription link for <strong>{whatsappModalData.patientName}</strong> (Rx #{whatsappModalData.rxNum}) has been prepared.
              </p>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] break-all">
                {whatsappModalData.url}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setWhatsappModalData(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
              <a
                href={whatsappModalData.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => setWhatsappModalData(null)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <span>🚀 Launch WhatsApp Web Chat</span>
              </a>
            </div>
          </div>
        </div>
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
