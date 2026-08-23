"use client";

import React, { useState } from "react";
import type { Language } from "../utils/i18n";

/* ═══════════════════════════════════════════════
   TYPES  (exported for use by PrescriptionWriter)
═══════════════════════════════════════════════ */
export interface PrescriptionItemPrint {
  medicineName: string;
  medType: "Tab" | "Cap" | "Syp" | "Inj" | "Oint" | "Drop" | string;
  dosage?: string;
  morning: number | string;
  afternoon: number | string;
  night: number | string;
  durationDays: number;
  timing?: "Before Meal" | "After Meal";
  isCustom?: boolean;
  instructions?: string;
}

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
  facilities: string[];
  defaultLang?: Language;
  signatureDataUrl?: string | null;
}

export interface PrescriptionPrintData {
  prescriptionNumber: string;
  date: string;
  uhid?: string;
  doctorProfile: DoctorProfile;
  patientName: string;
  patientAgeFormatted: string;
  patientGender: string;
  patientLocation: string;
  diagnosis: string;
  items: PrescriptionItemPrint[];
  notes?: string;
}

interface Props {
  data: PrescriptionPrintData;
  onClose?: () => void;
}

/* ═══════════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════════ */
const L = {
  en: {
    morning: "Morning", afternoon: "Afternoon", night: "Night",
    days: "Days", services: "Our Services", hours: "OPD Hours",
    timing_before: "Before Meal", timing_after: "After Meal",
    dose_unit: { Tab:"tab", Cap:"cap", Syp:"ml", Inj:"inj", Oint:"app", Drop:"drops" } as Record<string,string>,
    advice: "Advice", suchna: "Notes", sig: "Doctor's Signature",
    disclaimer: "This prescription is valid for 30 days only. Do not self-medicate.",
    sunday: "Closed on Sundays.", pname: "Name", date_lbl: "Date",
    followup: "Follow-up after", followup_days: "days",
    lang_label: "Language",
  },
  mr: {
    morning: "सकाळी", afternoon: "दुपारी", night: "रात्री",
    days: "दिवस", services: "उपलब्ध सुविधा", hours: "वेळ",
    timing_before: "जेवनाआधी", timing_after: "जेवनानंतर",
    dose_unit: { Tab:"गोळी", Cap:"गोळी", Syp:"चमचा", Inj:"इंजे.", Oint:"लेप", Drop:"थेंब" } as Record<string,string>,
    advice: "Advice", suchna: "सूचना", sig: "डॉक्टरांची सही व शिक्का",
    disclaimer: "हे प्रिस्क्रिप्शन ३० दिवसांसाठी वैध आहे. स्वयंचिकित्सा करू नका.",
    sunday: "दर रविवारला दवाखाना बंद राहील.", pname: "Name", date_lbl: "Date",
    followup: "पुढील भेट", followup_days: "दिवसांनंतर",
    lang_label: "भाषा",
  },
  hi: {
    morning: "सुबह", afternoon: "दोपहर", night: "रात",
    days: "दिन", services: "उपलब्ध सेवाएं", hours: "समय",
    timing_before: "खाने से पहले", timing_after: "खाने के बाद",
    dose_unit: { Tab:"गोली", Cap:"गोली", Syp:"चम्मच", Inj:"इंजे.", Oint:"लेप", Drop:"बूंद" } as Record<string,string>,
    advice: "Advice", suchna: "सलाह", sig: "डॉक्टर के हस्ताक्षर",
    disclaimer: "यह नुस्खा 30 दिनों के लिए वैध है। स्व-चिकित्सा न करें।",
    sunday: "रविवार को बंद रहेगा।", pname: "Name", date_lbl: "Date",
    followup: "अगली मुलाकात", followup_days: "दिन बाद",
    lang_label: "भाषा",
  },
} as const;

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
const isActive = (v: string | number | undefined) =>
  v !== 0 && v !== "0" && v !== "" && v !== undefined && v !== null;

function calcTotal(item: PrescriptionItemPrint): number {
  const dpd = (isActive(item.morning) ? 1 : 0)
            + (isActive(item.afternoon) ? 1 : 0)
            + (isActive(item.night) ? 1 : 0);
  const amt = parseFloat(String(
    isActive(item.morning) ? item.morning :
    isActive(item.afternoon) ? item.afternoon :
    item.night
  )) || 1;
  return Math.ceil(amt * dpd * item.durationDays);
}

interface TranslationShape {
  timing_before: string;
  timing_after: string;
  morning: string; afternoon: string; night: string; days: string;
  services: string; hours: string; sunday: string;
  dose_unit: Record<string,string>;
  advice: string; suchna: string; sig: string; disclaimer: string;
  pname: string; date_lbl: string; followup: string; followup_days: string;
  lang_label: string;
}

function getTimingLabel(t: TranslationShape, timing?: "Before Meal" | "After Meal"): string {
  if (!timing) return "";
  return timing === "Before Meal" ? t.timing_before : t.timing_after;
}

/* ═══════════════════════════════════════════════
   HTML GENERATOR
   Produces a self-contained prescription document
   that matches the Suyog Hospital reference image.
═══════════════════════════════════════════════ */
function buildPrescriptionHTML(data: PrescriptionPrintData, lang: Language): string {
  const t   = L[lang];
  const p   = data.doctorProfile;
  const hosName = (lang === "mr" && p.hospitalNameMr) ? p.hospitalNameMr : p.hospitalName;
  const docName  = (lang === "mr" && p.doctorNameMr)  ? p.doctorNameMr  : p.doctorName;

  const facilitiesHTML = (p.facilities?.length ? p.facilities : ["General Medicine"])
    .map(f => `<li>${f}</li>`).join("\n");

  const medsHTML = data.items.map((item, idx) => {
    const mOn = isActive(item.morning);
    const aOn = isActive(item.afternoon);
    const nOn = isActive(item.night);
    const total = calcTotal(item);
    const dose  = String(mOn ? item.morning : aOn ? item.afternoon : nOn ? item.night : 1);
    const unit  = t.dose_unit[item.medType] || "dose";
    const timing = getTimingLabel(t, item.timing);

    return `
<div class="med">
  <div class="med-r1">
    <span class="mtype">${item.medType}.</span>
    <span class="mname">${item.medicineName}${item.dosage ? " " + item.dosage : ""}</span>
    <span class="mtotal">${total}</span>
  </div>
  <div class="med-r2">
    <span class="mtiming">${timing}</span>
    <span class="mdose">${dose} ${unit}</span>
    <span class="mslot${mOn ? " on" : ""}">${t.morning}</span>
    <span class="mslot${aOn ? " on" : ""}">${t.afternoon}</span>
    <span class="mslot${nOn ? " on" : ""}">${t.night}</span>
    <span class="mdur">${item.durationDays}&nbsp;${t.days}</span>
  </div>
</div>
${idx < data.items.length - 1 ? '<hr class="msep">' : ""}`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prescription — ${data.patientName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800;900&family=Noto+Serif+Devanagari:wght@700;900&display=swap" rel="stylesheet">
<style>
/* ── A4 print setup ── */
@page { size:A4 portrait; margin:8mm 10mm; }

*,*::before,*::after {
  box-sizing:border-box;
  -webkit-print-color-adjust:exact !important;
  print-color-adjust:exact !important;
  color-adjust:exact !important;
}

body {
  margin:0; padding:0;
  background:white;
  font-family:'Noto Sans Devanagari',Arial,Helvetica,sans-serif;
  color:#1a1a1a;
  font-size:12px;
  line-height:1.4;
}

/* ── Outer border ── */
.rx {
  width:190mm;
  margin:0 auto;
  border:2.5px solid #1a237e;
  background:white;
}

/* ════ HEADER ════ */
.hdr {
  display:flex;
  align-items:flex-start;
  gap:10px;
  padding:10px 14px 8px;
  border-bottom:3px double #1a237e;
}

/* Left: Hospital block */
.hosp { flex:0 0 46%; }

.hname {
  font-family:'Noto Serif Devanagari','Noto Sans Devanagari',serif;
  font-size:32px;
  font-weight:900;
  line-height:1.1;
  letter-spacing:-0.5px;
  /* Yellow–orange–red gradient matching the image */
  background:linear-gradient(135deg,#c8a000 0%,#e06500 45%,#c41e3a 100%);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
}

.ecg { width:100%; height:22px; margin:5px 0 2px; display:block; }

/* Right: Doctor block */
.doc {
  flex:1;
  border-left:2px solid #d0d0d0;
  padding-left:14px;
}
.dname {
  font-size:26px;
  font-weight:900;
  color:#1a237e;
  line-height:1.2;
  font-family:'Noto Sans Devanagari',Arial,sans-serif;
}
.dqual  { font-size:11px; color:#333; margin-top:3px; font-weight:600; }
.dreg   { font-size:10px; color:#777; margin-top:2px; }
.dextra { font-size:9.5px; color:#555; margin-top:4px; line-height:1.6; border-top:1px solid #e0e0e0; padding-top:4px; }
.dspec  { font-size:12.5px; font-weight:800; color:#1a237e; margin-top:5px; line-height:1.5; font-family:'Noto Sans Devanagari',Arial,sans-serif; }

/* ════ BODY ════ */
.body  { display:flex; min-height:560px; }

/* ── Sidebar ── */
.sb {
  width:130px;
  flex-shrink:0;
  border-right:2px solid #1a237e;
  background:#fffde7;
  display:flex;
  flex-direction:column;
}

.sb-title {
  background:linear-gradient(135deg,#ff8f00,#e65100);
  color:white;
  text-align:center;
  padding:7px 5px;
  font-size:10.5px;
  font-weight:800;
  font-family:'Noto Sans Devanagari',Arial,sans-serif;
  letter-spacing:.2px;
}

.sb-list { list-style:none; margin:0; padding:8px 7px; flex:1; }
.sb-list li {
  font-size:10px;
  color:#333;
  margin-bottom:5.5px;
  line-height:1.35;
  font-family:'Noto Sans Devanagari',Arial,sans-serif;
  display:flex;
  align-items:flex-start;
  gap:5px;
}
.sb-list li::before { content:'●'; color:#c41e3a; flex-shrink:0; font-size:8px; margin-top:2px; }

.sb-time {
  background:#c41e3a;
  color:white;
  padding:8px 6px;
  text-align:center;
  font-size:10px;
  font-weight:700;
  line-height:1.7;
  font-family:'Noto Sans Devanagari',Arial,sans-serif;
}

.sb-sun {
  padding:6px 7px 8px;
  font-size:9.5px;
  color:#333;
  font-family:'Noto Sans Devanagari',Arial,sans-serif;
  line-height:1.4;
  display:flex;
  align-items:flex-start;
  gap:4px;
}
.sb-sun::before { content:'●'; color:#333; font-size:8px; flex-shrink:0; margin-top:2px; }

/* ── Main Rx area ── */
.main {
  flex:1;
  padding:12px 16px;
  position:relative;
  overflow:hidden;
}

.rxsym {
  font-family:'Times New Roman',Georgia,serif;
  font-style:italic;
  font-size:34px;
  font-weight:900;
  color:#1a1a1a;
  display:block;
  margin-bottom:8px;
}

/* Patient row */
.pat {
  display:flex;
  align-items:baseline;
  gap:6px;
  border-bottom:1px solid #444;
  padding-bottom:5px;
  margin-bottom:3px;
  font-size:11.5px;
}
.pl { color:#555; font-weight:600; }
.pn { font-weight:900; font-size:13px; text-transform:uppercase; font-family:'Noto Sans Devanagari',Arial,sans-serif; }
.pv { font-weight:800; font-size:12px; text-transform:uppercase; flex:1; }
.pd { font-size:11px; color:#333; }

.uhid-row {
  display:flex; justify-content:flex-end;
  font-size:11.5px; font-weight:700; color:#333;
  margin-bottom:10px;
}

/* Medicine entries */
.med { margin-bottom:10px; }

.med-r1 {
  display:flex; align-items:baseline; gap:4px;
  font-size:12px; font-weight:700;
}
.mtype  { min-width:32px; font-weight:900; }
.mname  { flex:1; font-family:'Noto Sans Devanagari',Arial,sans-serif; font-weight:700; }
.mtotal { min-width:24px; text-align:right; color:#333; }

.med-r2 {
  display:flex; align-items:center; gap:5px;
  margin-top:2px; padding-left:20px;
  font-size:11px; font-family:'Noto Sans Devanagari',Arial,sans-serif;
}
.mtiming { min-width:78px; color:#333; }
.mdose   { min-width:46px; font-weight:700; }
.mslot   { min-width:38px; text-align:center; color:#bbb; font-size:10.5px; }
.mslot.on{ color:#1a1a1a; font-weight:800; font-size:11px; }
.mdur    { margin-left:auto; font-weight:800; }

hr.msep  { border:none; border-top:1px dashed #ccc; margin:8px 0; }

/* Advice */
.adv { border-top:1px solid #444; margin-top:12px; padding-top:7px; }
.adv-en  { font-size:12px; font-weight:800; color:#1a1a1a; }
.adv-mr  { font-size:11.5px; color:#444; margin-top:2px; font-family:'Noto Sans Devanagari',Arial,sans-serif; }
.adv-txt {
  font-size:11.5px; color:#222; line-height:1.85; margin-top:5px;
  min-height:55px; font-family:'Noto Sans Devanagari',Arial,sans-serif;
}

/* Signature */
.sig {
  position:absolute; bottom:20px; right:18px;
  text-align:center;
}
.sig-mark { font-family:'Times New Roman',serif; font-style:italic; font-size:36px; color:#333; line-height:1; }
.sig-line { width:140px; height:1px; background:#666; margin:6px auto; }
.sig-name { font-size:10.5px; color:#444; font-family:'Noto Sans Devanagari',Arial,sans-serif; font-weight:600; }
.sig-lbl  { font-size:9.5px; color:#888; font-family:'Noto Sans Devanagari',Arial,sans-serif; margin-top:2px; }

/* ════ FOOTER ════ */
.ftr {
  border-top:2.5px solid #1a237e;
  display:flex; justify-content:space-between; align-items:center;
  padding:7px 14px; background:#e8eaf6;
}
.ftr-addr  { font-size:11.5px; color:#1a237e; font-weight:600; font-family:'Noto Sans Devanagari',Arial,sans-serif; }
.ftr-phone { font-size:13px; font-weight:800; color:#c41e3a; font-family:'Noto Sans Devanagari',Arial,sans-serif; }
</style>
</head>
<body>
<div class="rx">

  <!-- ════ HEADER ════ -->
  <div class="hdr">
    <div class="hosp">
      <div class="hname">${hosName}</div>
      <svg class="ecg" viewBox="0 0 320 22" xmlns="http://www.w3.org/2000/svg">
        <polyline
          points="0,11 55,11 65,4 70,18 75,2 81,20 87,11 200,11 210,5 218,17 222,11 320,11"
          fill="none" stroke="#c41e3a" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="doc">
      <div class="dname">${docName}</div>
      ${p.qualifications ? `<div class="dqual">${p.qualifications}</div>` : ""}
      ${p.regNumber     ? `<div class="dreg">Reg. No. ${p.regNumber}</div>` : ""}
      ${p.specialties   ? `<div class="dspec">${p.specialties}</div>` : ""}
    </div>
  </div>

  <!-- ════ BODY ════ -->
  <div class="body">

    <!-- ── SIDEBAR ── -->
    <div class="sb">
      <div class="sb-title">✦ ${t.services} ✦</div>
      <ul class="sb-list">${facilitiesHTML}</ul>
      ${p.clinicHours ? `<div class="sb-time">☸ ${t.hours} ☸<br>${p.clinicHours}</div>` : ""}
      <div class="sb-sun">${t.sunday}</div>
    </div>

    <!-- ── MAIN RX ── -->
    <div class="main">
      <span class="rxsym">R<sub style="font-size:18px">x</sub></span>

      <!-- Patient bar -->
      <div class="pat">
        <span class="pl">${t.pname}</span>
        <span class="pn">${data.patientName}</span>
        <span class="pv">${data.patientLocation}</span>
        <span class="pd">${t.date_lbl} : &nbsp;${data.date}</span>
      </div>
      <div class="uhid-row">
        ${p.uhidPrefix || "U.H.I.D."} :&nbsp;<strong>${data.uhid || data.prescriptionNumber}</strong>
      </div>

      <!-- Medicines -->
      ${medsHTML}

      <!-- Advice -->
      <div class="adv">
        <div class="adv-en">${t.advice}</div>
        <div class="adv-mr">${t.suchna} :</div>
        <div class="adv-txt">${data.notes ? data.notes.replace(/\n/g,"<br>") : "&nbsp;"}</div>
      </div>

      <!-- Signature -->
      <div class="sig">
        ${p.signatureDataUrl
          ? `<img src="${p.signatureDataUrl}" alt="Doctor Signature" style="max-width:160px;max-height:60px;object-fit:contain;display:block;margin:0 auto 4px;">`
          : `<div class="sig-mark">)</div>`
        }
        <div class="sig-line"></div>
        <div class="sig-name">${docName}</div>
        <div class="sig-lbl">${t.sig}</div>
      </div>
    </div>
  </div>

  <!-- ════ FOOTER ════ -->
  <div class="ftr">
    <div class="ftr-addr">📍 ${p.address}</div>
    <div class="ftr-phone">मोबा. नं. ${p.phone}</div>
  </div>

</div>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════
   REACT COMPONENT  (Screen Preview + Print)
═══════════════════════════════════════════════ */
export default function PrescriptionPrintTemplate({ data, onClose }: Props) {
  const [lang, setLang] = useState<Language>(data.doctorProfile.defaultLang ?? "mr");
  const t = L[lang];
  const p = data.doctorProfile;
  const hosName = (lang === "mr" && p.hospitalNameMr) ? p.hospitalNameMr : p.hospitalName;
  const docName  = (lang === "mr" && p.doctorNameMr)  ? p.doctorNameMr  : p.doctorName;

  /* ── Print handler: new clean window → ONLY prescription prints ── */
  const handlePrint = () => {
    const html = buildPrescriptionHTML(data, lang);
    const win  = window.open("", "_blank", "width=960,height=1280,scrollbars=yes");
    if (!win) {
      alert("⚠️ Browser blocked the popup. Please allow pop-ups for this site and try again.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Wait for Google Fonts to load, then print
    win.addEventListener("load", () => {
      setTimeout(() => { win.focus(); win.print(); }, 900);
    });
  };

  /* Helpers for screen preview */
  const timingL = (timing?: "Before Meal" | "After Meal") =>
    timing ? (timing === "Before Meal" ? t.timing_before : t.timing_after) : "";

  const F = { fontFamily: "'Noto Sans Devanagari', Arial, sans-serif" };

  /* ── Inline button style factory ── */
  const langBtn = (l: Language) => ({
    padding: "7px 16px", fontSize: 11, fontWeight: 800 as const,
    borderRadius: 8, border: "none", cursor: "pointer" as const,
    backgroundColor: lang === l ? "#c41e3a" : "transparent",
    color: lang === l ? "white" : "#94a3b8",
    boxShadow: lang === l ? "0 3px 12px rgba(196,30,58,.4)" : "none",
    transition: "all .2s", ...F,
  });

  return (
    <div style={{ ...F, backgroundColor: "#0f172a", minHeight: "100vh", padding: 16 }}>

      {/* ── TOP CONTROLS BAR ── */}
      <div style={{
        maxWidth: 740, margin: "0 auto 16px",
        backgroundColor: "#1e293b", border: "1px solid #334155",
        borderRadius: 16, padding: "14px 20px",
        display: "flex", flexWrap: "wrap", alignItems: "center",
        justifyContent: "space-between", gap: 12,
      }}>
        {/* Language selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>{t.lang_label}:</span>
          <div style={{ display: "flex", backgroundColor: "#0f172a", borderRadius: 10, padding: 4, gap: 4, border: "1px solid #1e293b" }}>
            {(["en", "mr", "hi"] as Language[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={langBtn(l)}>
                {l === "en" ? "English" : l === "mr" ? "मराठी" : "हिंदी"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {onClose && (
            <button onClick={onClose} style={{
              padding: "8px 16px", fontSize: 11, fontWeight: 700, borderRadius: 10,
              backgroundColor: "#1e293b", color: "#94a3b8",
              border: "1px solid #334155", cursor: "pointer",
            }}>
              ✕ Close
            </button>
          )}
          <button onClick={handlePrint} style={{
            padding: "10px 24px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none",
            background: "linear-gradient(135deg,#c41e3a,#e53e3e)",
            color: "white", cursor: "pointer",
            boxShadow: "0 4px 18px rgba(196,30,58,.45)", ...F,
          }}>
            🖨 Print Prescription
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SCREEN PREVIEW  (mirrors print layout)
      ════════════════════════════════════════════ */}
      <div style={{
        maxWidth: 740, margin: "0 auto",
        border: "2.5px solid #1a237e", borderRadius: 12, overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,.65)", backgroundColor: "white",
      }}>

        {/* ─ HEADER ─ */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px 10px", borderBottom: "3px double #1a237e", backgroundColor: "white" }}>
          {/* Hospital side */}
          <div style={{ flex: "0 0 46%" }}>
            <div style={{
              ...F, fontSize: 28, fontWeight: 900, lineHeight: 1.15,
              background: "linear-gradient(135deg,#c8a000 0%,#e06500 45%,#c41e3a 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>{hosName}</div>
            <svg viewBox="0 0 320 22" style={{ width: "100%", height: 22, margin: "5px 0 2px", display: "block" }}>
              <polyline points="0,11 55,11 65,4 70,18 75,2 81,20 87,11 200,11 210,5 218,17 222,11 320,11"
                fill="none" stroke="#c41e3a" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Doctor side */}
          <div style={{ flex: 1, borderLeft: "2px solid #d0d0d0", paddingLeft: 14 }}>
            <div style={{ ...F, fontSize: 22, fontWeight: 900, color: "#1a237e", lineHeight: 1.2 }}>{docName}</div>
            {p.qualifications && <div style={{ fontSize: 11, color: "#333", marginTop: 3, fontWeight: 600 }}>{p.qualifications}</div>}
            {p.regNumber     && <div style={{ fontSize: 10, color: "#777", marginTop: 2 }}>Reg. No. {p.regNumber}</div>}
            {p.specialties   && <div style={{ ...F, fontSize: 12, fontWeight: 800, color: "#1a237e", marginTop: 5, lineHeight: 1.5 }}>{p.specialties}</div>}
          </div>
        </div>

        {/* ─ BODY ─ */}
        <div style={{ display: "flex", minHeight: 500, backgroundColor: "white" }}>

          {/* SIDEBAR */}
          <div style={{ width: 130, flexShrink: 0, borderRight: "2px solid #1a237e", backgroundColor: "#fffde7", display: "flex", flexDirection: "column" }}>
            <div style={{ ...F, background: "linear-gradient(135deg,#ff8f00,#e65100)", color: "white", textAlign: "center", padding: "7px 5px", fontSize: 10.5, fontWeight: 800 }}>
              ✦ {t.services} ✦
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: "8px 7px", flex: 1 }}>
              {(p.facilities?.length ? p.facilities : ["General Medicine"]).map((f, i) => (
                <li key={i} style={{ ...F, fontSize: 10, color: "#333", marginBottom: 5.5, lineHeight: 1.35, display: "flex", alignItems: "flex-start", gap: 5 }}>
                  <span style={{ color: "#c41e3a", fontSize: 8, marginTop: 2, flexShrink: 0 }}>●</span>
                  {f}
                </li>
              ))}
            </ul>
            {p.clinicHours && (
              <div style={{ ...F, backgroundColor: "#c41e3a", color: "white", padding: "8px 6px", textAlign: "center", fontSize: 10, fontWeight: 700, lineHeight: 1.7 }}>
                ☸ {t.hours} ☸<br />{p.clinicHours}
              </div>
            )}
            <div style={{ ...F, padding: "6px 7px 8px", fontSize: 9.5, color: "#333", lineHeight: 1.4, display: "flex", alignItems: "flex-start", gap: 4 }}>
              <span style={{ fontSize: 8, marginTop: 2, flexShrink: 0 }}>●</span>
              {t.sunday}
            </div>
          </div>

          {/* MAIN RX */}
          <div style={{ flex: 1, padding: "12px 16px", position: "relative", backgroundColor: "white" }}>
            {/* Rx symbol */}
            <div style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 30, fontWeight: 900, color: "#1a1a1a", marginBottom: 8 }}>
              R<sub style={{ fontSize: 16 }}>x</sub>
            </div>

            {/* Patient bar */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, borderBottom: "1px solid #444", paddingBottom: 5, marginBottom: 3, fontSize: 11.5 }}>
              <span style={{ color: "#555", fontWeight: 600 }}>Name</span>
              <span style={{ ...F, fontWeight: 900, fontSize: 13, textTransform: "uppercase" }}>{data.patientName}</span>
              <span style={{ ...F, fontWeight: 800, fontSize: 12, textTransform: "uppercase", flex: 1 }}>{data.patientLocation}</span>
              <span style={{ fontSize: 11, color: "#333" }}>Date :&nbsp;{data.date}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 11.5, fontWeight: 700, color: "#333", marginBottom: 10 }}>
              {p.uhidPrefix || "U.H.I.D."} :&nbsp;<strong style={{ marginLeft: 4 }}>{data.uhid || data.prescriptionNumber}</strong>
            </div>

            {/* Medicines */}
            {data.items.map((item, idx) => {
              const mOn = isActive(item.morning);
              const aOn = isActive(item.afternoon);
              const nOn = isActive(item.night);
              const total = calcTotal(item);
              const dose  = String(mOn ? item.morning : aOn ? item.afternoon : nOn ? item.night : 1);
              const unit  = t.dose_unit[item.medType] || "dose";
              return (
                <div key={idx}>
                  {/* Row 1: Type | Name | Total */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                    <span style={{ minWidth: 32, fontWeight: 900 }}>{item.medType}.</span>
                    <span style={{ ...F, flex: 1, fontWeight: 700 }}>{item.medicineName}{item.dosage ? " " + item.dosage : ""}</span>
                    <span style={{ minWidth: 24, textAlign: "right", color: "#333" }}>{total}</span>
                  </div>
                  {/* Row 2: Timing | Dose | Slots | Duration */}
                  <div style={{ ...F, display: "flex", alignItems: "center", gap: 5, paddingLeft: 20, fontSize: 11 }}>
                    <span style={{ minWidth: 78, color: "#333" }}>{timingL(item.timing)}</span>
                    <span style={{ minWidth: 46, fontWeight: 700 }}>{dose}&nbsp;{unit}</span>
                    <span style={{ minWidth: 38, textAlign: "center", color: mOn ? "#1a1a1a" : "#bbb", fontWeight: mOn ? 800 : 400 }}>{t.morning}</span>
                    <span style={{ minWidth: 38, textAlign: "center", color: aOn ? "#1a1a1a" : "#bbb", fontWeight: aOn ? 800 : 400 }}>{t.afternoon}</span>
                    <span style={{ minWidth: 38, textAlign: "center", color: nOn ? "#1a1a1a" : "#bbb", fontWeight: nOn ? 800 : 400 }}>{t.night}</span>
                    <span style={{ marginLeft: "auto", fontWeight: 800 }}>{item.durationDays}&nbsp;{t.days}</span>
                  </div>
                  {idx < data.items.length - 1 && (
                    <hr style={{ border: "none", borderTop: "1px dashed #ccc", margin: "8px 0" }} />
                  )}
                </div>
              );
            })}

            {/* Advice */}
            <div style={{ borderTop: "1px solid #444", marginTop: 14, paddingTop: 7 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1a1a" }}>{t.advice}</div>
              <div style={{ ...F, fontSize: 11.5, color: "#444", marginTop: 2 }}>{t.suchna} :</div>
              <div style={{ ...F, fontSize: 11.5, color: "#222", lineHeight: 1.85, marginTop: 5, minHeight: 50 }}>
                {data.notes || ""}
              </div>
            </div>

            {/* Signature */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 32, color: "#333", lineHeight: 1 }}>)</div>
                <div style={{ width: 140, height: 1, backgroundColor: "#666", margin: "6px auto" }} />
                <div style={{ ...F, fontSize: 10.5, color: "#444", fontWeight: 600 }}>{docName}</div>
                <div style={{ ...F, fontSize: 9.5, color: "#888", marginTop: 2 }}>{t.sig}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─ FOOTER ─ */}
        <div style={{ borderTop: "2.5px solid #1a237e", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", backgroundColor: "#e8eaf6" }}>
          <div style={{ ...F, fontSize: 11.5, color: "#1a237e", fontWeight: 600 }}>📍 {p.address}</div>
          <div style={{ ...F, fontSize: 13, fontWeight: 800, color: "#c41e3a" }}>मोबा. नं. {p.phone}</div>
        </div>
      </div>

      {/* Print tip */}
      <div style={{ maxWidth: 740, margin: "14px auto 0", padding: "11px 18px", backgroundColor: "#1e293b", borderRadius: 12, border: "1px solid #334155" }}>
        <p style={{ margin: 0, fontSize: 11, color: "#64748b", ...F }}>
          💡 <strong style={{ color: "#94a3b8" }}>How to Print:</strong>&nbsp;
          Click <strong style={{ color: "white" }}>🖨 Print Prescription</strong> — it opens a <strong style={{ color: "white" }}>new clean window</strong> containing
          only the prescription (no UI, no navbar). Your browser will show the print dialog automatically.
          Set paper size to <strong style={{ color: "white" }}>A4</strong>. Enable <strong style={{ color: "white" }}>Background graphics</strong> to keep colors.
        </p>
      </div>
    </div>
  );
}

export function openPrintWindow(data: PrescriptionPrintData, lang: Language = "mr") {
  const html = buildPrescriptionHTML(data, lang);
  const win = window.open("", "_blank", "width=850,height=1100");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
