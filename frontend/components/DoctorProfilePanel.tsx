"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getClinicProfile, updateClinicProfile, ClinicProfile } from "../utils/api";
import { useTheme } from "./ThemeContext";
import { TransliteratedInput, TransliteratedTextArea } from "./TransliteratedInput";

export interface DoctorProfile {
  hospitalName: string;
  hospitalNameMr?: string;
  doctorName: string;
  doctorNameMr?: string;
  qualifications: string;
  regNumber: string;
  specialties: string;
  clinicHours?: string;
  address: string;
  phone: string;
  uhidPrefix?: string;
  defaultLang?: "en" | "mr" | "hi";
  facilities: string[];
  signatureDataUrl?: string | null;
}

const DEFAULT_PROFILE: DoctorProfile = {
  hospitalName: "Suyog Hospital",
  hospitalNameMr: "सुयोग हॉस्पिटल",
  doctorName: "Dr. Vikas Va. Karande",
  doctorNameMr: "डॉ. विकास वा. करांडे",
  qualifications: "M.B.B.S. (MUHS NASIK)",
  regNumber: "06/2002/2451",
  specialties: "जनरल फिजीशियन व सर्जन बालरोग व क्षीरोग चिकित्सक",
  clinicHours: "सकाळी ९ ते सायं. ६ वाजेपर्यंत",
  address: "तहसिल समोर, बुलडाणा रोड, मोताळा",
  phone: "7757003800",
  uhidPrefix: "U.H.I.D.",
  defaultLang: "mr",
  facilities: [
    "हृदय रोग",
    "ब्लड प्रेशर",
    "दमा",
    "टि.बी.",
    "छातीचे विकार",
    "मधुमेह",
    "एड्स सहा",
    "नेफ्युलायझेशन",
    "त्वचारोग विषयक सहा",
    "आहार विषयक सहा",
    "आलेरग्णो विभाग (भरतीची व्यवस्था)",
  ],
};

export function useDoctorProfile() {
  const [profile, setProfileState] = useState<DoctorProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    getClinicProfile()
      .then((res) => {
        setProfileState({
          hospitalName: res.hospital_name_en || DEFAULT_PROFILE.hospitalName,
          hospitalNameMr: res.hospital_name_mr || DEFAULT_PROFILE.hospitalNameMr,
          doctorName: res.doctor_name_en || DEFAULT_PROFILE.doctorName,
          doctorNameMr: res.doctor_name_mr || DEFAULT_PROFILE.doctorNameMr,
          qualifications: res.qualifications || DEFAULT_PROFILE.qualifications,
          regNumber: res.reg_number || DEFAULT_PROFILE.regNumber,
          specialties: res.specialties || DEFAULT_PROFILE.specialties,
          clinicHours: res.clinic_hours || DEFAULT_PROFILE.clinicHours,
          address: res.address || DEFAULT_PROFILE.address,
          phone: res.phone || DEFAULT_PROFILE.phone,
          uhidPrefix: res.uhid_prefix || DEFAULT_PROFILE.uhidPrefix,
          defaultLang: (res.default_lang as any) || "mr",
          facilities: res.facilities.length > 0 ? res.facilities : DEFAULT_PROFILE.facilities,
          signatureDataUrl: res.signature_data_url ?? null,
        });
      })
      .catch(() => {});
  }, []);

  const save = async (p: DoctorProfile) => {
    setProfileState(p);
    try {
      await updateClinicProfile({
        hospital_name_en: p.hospitalName,
        hospital_name_mr: p.hospitalNameMr,
        doctor_name_en: p.doctorName,
        doctor_name_mr: p.doctorNameMr,
        qualifications: p.qualifications,
        reg_number: p.regNumber,
        specialties: p.specialties,
        clinic_hours: p.clinicHours,
        address: p.address,
        phone: p.phone,
        uhid_prefix: p.uhidPrefix,
        default_lang: p.defaultLang,
        facilities: p.facilities,
        signature_data_url: p.signatureDataUrl ?? undefined,
      });
    } catch (e) {
      console.error("Failed to save profile", e);
    }
  };

  return { profile, saveProfile: save };
}

function FacilityItem({
  value,
  index,
  isDark,
  onChange,
  onDelete,
}: {
  value: string;
  index: number;
  isDark?: boolean;
  onChange: (i: number, val: string) => void;
  onDelete: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <span className={`text-xs w-5 text-right ${isDark ? "text-slate-500" : "text-slate-400"}`}>{index + 1}.</span>
      <div className="flex-1">
        <TransliteratedInput
          value={value}
          onChange={(val) => onChange(index, val)}
          className={`w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:border-red-500 transition-all ${isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
          placeholder="e.g. हृदय रोग / Heart Disease"
        />
      </div>
      <button
        type="button"
        onClick={() => onDelete(index)}
        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-400 transition-all"
        title="Remove"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function HeaderPreview({ profile, headerColor }: { profile: DoctorProfile; headerColor: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 mt-4" style={{ fontFamily: "'Arial', 'Noto Sans Devanagari', sans-serif" }}>
      <div className="px-4 py-3 text-white flex justify-between items-start" style={{ background: headerColor }}>
        <div>
          <div className="text-base font-black">{profile.hospitalNameMr || profile.hospitalName}</div>
          {profile.address && <div className="text-[10px] opacity-80 mt-0.5 leading-snug">{profile.address}</div>}
        </div>
        <div className="text-right text-[11px]">
          <div className="font-extrabold">{profile.doctorNameMr || profile.doctorName}</div>
          <div className="opacity-80">{profile.qualifications}</div>
          {profile.regNumber && <div className="opacity-60 text-[9px]">Reg. {profile.regNumber}</div>}
        </div>
      </div>
      <div className="h-1" style={{ background: "linear-gradient(90deg,#dc2626,#fbbf24,#10b981,#3b82f6,#dc2626)" }} />
    </div>
  );
}

export default function DoctorProfilePanel({ isDark = true, onSaved }: { isDark?: boolean; onSaved?: (profile: DoctorProfile) => void }) {
  const { profile, saveProfile } = useDoctorProfile();
  const { prescriptionColor, setPrescriptionColor } = useTheme();
  const [local, setLocal] = useState<DoctorProfile>(profile);
  const [saved, setSaved] = useState(false);
  const [headerColor, setHeaderColorState] = useState(prescriptionColor);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(profile.signatureDataUrl ?? null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigDrawing = useRef(false);
  const lastSigPt = useRef<{ x: number; y: number } | null>(null);

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    sigDrawing.current = true;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    lastSigPt.current = { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const drawMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!sigDrawing.current || !sigCanvasRef.current || !lastSigPt.current) return;
    const canvas = sigCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(lastSigPt.current.x, lastSigPt.current.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastSigPt.current = { x, y };
  }, []);

  const endDraw = useCallback(() => {
    sigDrawing.current = false;
    lastSigPt.current = null;
    if (sigCanvasRef.current) {
      const url = sigCanvasRef.current.toDataURL("image/png");
      setSignatureDataUrl(url);
      setLocal((prev) => ({ ...prev, signatureDataUrl: url }));
      setSaved(false);
    }
  }, []);

  const clearSignature = () => {
    if (sigCanvasRef.current) {
      const ctx = sigCanvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
    }
    setSignatureDataUrl(null);
    setLocal((prev) => ({ ...prev, signatureDataUrl: null }));
    setSaved(false);
  };

  const handleSigImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setSignatureDataUrl(url);
      setLocal((prev) => ({ ...prev, signatureDataUrl: url }));
      setSaved(false);
      // Draw onto canvas
      if (sigCanvasRef.current) {
        const ctx = sigCanvasRef.current.getContext("2d");
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, sigCanvasRef.current!.width, sigCanvasRef.current!.height);
            ctx.drawImage(img, 0, 0, sigCanvasRef.current!.width, sigCanvasRef.current!.height);
          };
          img.src = url;
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const COLOR_PRESETS = [
    { label: "Crimson",  value: "#b91c1c" },
    { label: "Navy",     value: "#1a237e" },
    { label: "Teal",     value: "#0f766e" },
    { label: "Indigo",   value: "#3730a3" },
    { label: "Forest",   value: "#15803d" },
    { label: "Purple",   value: "#7c3aed" },
    { label: "Slate",    value: "#1e293b" },
    { label: "Amber",    value: "#b45309" },
    { label: "Rose",     value: "#9f1239" },
    { label: "Cyan",     value: "#0e7490" },
  ];

  const applyColor = (c: string) => {
    setHeaderColorState(c);
    setPrescriptionColor(c);
    setSaved(false);
  };

  useEffect(() => {
    setLocal(profile);
  }, [profile]);

  const updateField = <K extends keyof DoctorProfile>(key: K, value: DoctorProfile[K]) => {
    setLocal((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveProfile(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.(local);
  };

  const cardClass = `rounded-2xl border p-5 space-y-4 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`;
  const labelClass = `block text-xs font-semibold mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`;
  const inputClass = `w-full rounded-xl border px-3 py-2 text-xs focus:outline-none transition-all ${
    isDark
      ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 placeholder-slate-600"
      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-red-500"
  }`;

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border overflow-hidden relative ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#dc2626,#fbbf24,#10b981,#3b82f6)" }} />
        <div className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-black shadow-xl flex-shrink-0" style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
              {local.doctorName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>{local.doctorName}</h2>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>{local.qualifications}</p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                saved ? "bg-emerald-600 text-white" : "bg-gradient-to-r from-red-600 to-rose-500 text-white"
              }`}
            >
              {saved ? "✓ Profile Saved!" : "💾 Save Profile"}
            </button>
          </div>
          <HeaderPreview profile={local} headerColor={headerColor} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Color customization panel */}
        <div className={`lg:col-span-2 rounded-2xl border p-5 space-y-3 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className={`flex items-center gap-2 text-sm font-bold pb-3 border-b ${isDark ? "border-slate-800 text-white" : "border-slate-200 text-slate-900"}`}>
            🎨 Prescription Header Color
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => applyColor(c.value)}
                title={c.label}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: c.value,
                  border: headerColor === c.value ? "3px solid white" : "3px solid transparent",
                  outline: headerColor === c.value ? `2px solid ${c.value}` : "none",
                  cursor: "pointer",
                  transition: "transform 0.15s",
                  transform: headerColor === c.value ? "scale(1.2)" : "scale(1)",
                  boxShadow: headerColor === c.value ? `0 0 12px ${c.value}80` : "none",
                }}
              />
            ))}
            {/* Custom hex input */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="color"
                value={headerColor}
                onChange={(e) => applyColor(e.target.value)}
                style={{ width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer", padding: 0 }}
                title="Custom color"
              />
              <input
                type="text"
                value={headerColor}
                onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) applyColor(e.target.value); }}
                className={`w-24 rounded-lg border px-2 py-1 text-xs font-mono focus:outline-none ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"
                }`}
                placeholder="#b91c1c"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">This color is applied to the prescription header. Saved locally and on profile save.</p>
        </div>

        <div className={cardClass}>
          <div className={`flex items-center gap-2 text-sm font-bold pb-3 border-b ${isDark ? "border-slate-800 text-white" : "border-slate-200 text-slate-900"}`}>
            🏥 Hospital &amp; Doctor Details
          </div>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Hospital Name (English)</label>
              <TransliteratedInput value={local.hospitalName} onChange={(v) => updateField("hospitalName", v)} className={inputClass} placeholder="e.g. Suyog Hospital" />
            </div>
            <div>
              <label className={labelClass}>Hospital Name (Marathi / सुयोग हॉस्पिटल)</label>
              <TransliteratedInput value={local.hospitalNameMr || ""} onChange={(v) => updateField("hospitalNameMr", v)} className={inputClass} placeholder="e.g. सुयोग हॉस्पिटल" />
            </div>
            <div>
              <label className={labelClass}>Doctor Name (English)</label>
              <TransliteratedInput value={local.doctorName} onChange={(v) => updateField("doctorName", v)} className={inputClass} placeholder="e.g. Dr. Vikas Karande" />
            </div>
            <div>
              <label className={labelClass}>Doctor Name (Marathi / डॉ. विकास वा. करांडे)</label>
              <TransliteratedInput value={local.doctorNameMr || ""} onChange={(v) => updateField("doctorNameMr", v)} className={inputClass} placeholder="e.g. डॉ. विकास वा. करांडे" />
            </div>
            <div>
              <label className={labelClass}>Qualifications</label>
              <TransliteratedInput value={local.qualifications} onChange={(v) => updateField("qualifications", v)} className={inputClass} placeholder="e.g. M.B.B.S., M.D." />
            </div>
            <div>
              <label className={labelClass}>Specialties / विशेषज्ञता</label>
              <TransliteratedInput value={local.specialties} onChange={(v) => updateField("specialties", v)} className={inputClass} placeholder="e.g. General Physician" />
            </div>
            <div>
              <label className={labelClass}>Registration Number</label>
              <TransliteratedInput value={local.regNumber} onChange={(v) => updateField("regNumber", v)} className={inputClass} placeholder="e.g. MMC/2002/2451" />
            </div>
            <div>
              <label className={labelClass}>Clinic Hours / वेळ</label>
              <TransliteratedInput value={local.clinicHours || ""} onChange={(v) => updateField("clinicHours", v)} className={inputClass} placeholder="e.g. Morning 9–1 | Evening 5–9" />
            </div>
            <div>
              <label className={labelClass}>Hospital Address / पत्ता</label>
              <TransliteratedTextArea rows={2} value={local.address} onChange={(v) => updateField("address", v)} className={inputClass} placeholder="e.g. Motala, Dist. Buldhana" />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input type="tel" className={inputClass} value={local.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="e.g. 7757003800" />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className={`flex items-center gap-2 text-sm font-bold pb-3 border-b ${isDark ? "border-slate-800 text-white" : "border-slate-200 text-slate-900"}`}>
            ✍️ Doctor Signature
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-4 flex-wrap">
              {/* Canvas Pad */}
              <div>
                <p className={`text-[11px] mb-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Draw signature below (mouse or touch):</p>
                <canvas
                  ref={sigCanvasRef}
                  width={300}
                  height={90}
                  onMouseDown={startDraw}
                  onMouseMove={drawMove}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw as any}
                  onTouchMove={drawMove as any}
                  onTouchEnd={endDraw}
                  style={{
                    border: `2px dashed ${isDark ? "#334155" : "#cbd5e1"}`,
                    borderRadius: 10,
                    background: "white",
                    cursor: "crosshair",
                    display: "block",
                    touchAction: "none",
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs px-3 py-1.5 rounded-lg border border-rose-700 text-rose-400 hover:bg-rose-900/20"
                  >
                    🗑 Clear
                  </button>
                  <label className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 cursor-pointer">
                    📁 Upload Image
                    <input type="file" accept="image/*" onChange={handleSigImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
              {/* Saved preview */}
              {signatureDataUrl && (
                <div>
                  <p className={`text-[11px] mb-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Preview on prescription:</p>
                  <div style={{
                    border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                    borderRadius: 10, padding: 8, background: "white",
                    display: "inline-block",
                  }}>
                    <img src={signatureDataUrl} alt="Signature" style={{ maxWidth: 200, maxHeight: 70, objectFit: "contain", display: "block" }} />
                    <div style={{ borderTop: "1px solid #999", marginTop: 4, paddingTop: 2, fontSize: 10, color: "#666", textAlign: "center" }}>
                      {local.doctorName}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500">Signature will appear on every printed prescription. Saved when you click "Save Profile" above.</p>
          </div>
        </div>

        <div className={cardClass}>
          <div className={`flex items-center gap-2 text-sm font-bold pb-3 border-b ${isDark ? "border-slate-800 text-white" : "border-slate-200 text-slate-900"}`}>
            📋 उपलब्ध सुविधा (Available Facilities)
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {local.facilities.map((fac, i) => (
              <FacilityItem
                key={i}
                value={fac}
                index={i}
                isDark={isDark}
                onChange={(idx, val) => {
                  const copy = [...local.facilities];
                  copy[idx] = val;
                  updateField("facilities", copy);
                }}
                onDelete={(idx) => updateField("facilities", local.facilities.filter((_, k) => k !== idx))}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => updateField("facilities", [...local.facilities, "New Facility"])}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-400"
          >
            ➕ Add Facility / सुविधा जोडा
          </button>
        </div>
      </div>
    </div>
  );
}
