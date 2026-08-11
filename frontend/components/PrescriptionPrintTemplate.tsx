"use client";

import React, { useState } from "react";
import { Language, TRANSLATIONS, translateInstruction } from "../utils/i18n";

export interface PrescriptionItemPrint {
  medicineName: string;
  dosage: string;
  frequency: string; // e.g. "1-0-1"
  timing?: string;    // e.g. "After Meal"
  durationDays: number;
  instructions?: string;
}

export interface PrescriptionPrintData {
  prescriptionNumber: string;
  date: string;
  doctorName: string;
  doctorLicense: string;
  patientName: string;
  patientAgeFormatted: string;
  patientGender: string;
  patientLocation: string;
  diagnosis: string;
  items: PrescriptionItemPrint[];
}

interface Props {
  data: PrescriptionPrintData;
  onClose?: () => void;
}

export default function PrescriptionPrintTemplate({ data, onClose }: Props) {
  const [lang, setLang] = useState<Language>("en");
  const t = TRANSLATIONS[lang];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* LANGUAGE SELECTOR & PRINT BUTTON BAR (Hidden during printing) */}
      <div className="print:hidden flex flex-wrap items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl gap-4">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold text-slate-300">Select Prescription Language:</span>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                lang === "en" ? "bg-teal-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang("mr")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                lang === "mr" ? "bg-teal-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              मराठी (Marathi)
            </button>
            <button
              type="button"
              onClick={() => setLang("hi")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                lang === "hi" ? "bg-teal-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              हिंदी (Hindi)
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Close
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>{t.printBtnLabel}</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE PRESCRIPTION DOCUMENT CONTAINER */}
      <div className="printable-rx-document bg-white text-slate-900 p-8 rounded-xl shadow-2xl border border-slate-200 font-sans max-w-4xl mx-auto">
        
        {/* HEADER SECTION */}
        <header className="border-b-2 border-teal-600 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-extrabold text-teal-800 tracking-tight">{t.hospitalName}</h1>
            <p className="text-xs text-slate-600 mt-1">{t.hospitalSub}</p>
            <div className="mt-2 text-xs font-bold text-slate-800">
              <span>Doctor: {data.doctorName}</span>
              <span className="ml-3 font-normal text-slate-500">Lic: {data.doctorLicense}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {t.prescriptionTitle}
            </span>
            <p className="text-xs text-slate-600 mt-2 font-mono">
              <strong>{t.rxNumberLabel}</strong> {data.prescriptionNumber}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              <strong>{t.dateLabel}</strong> {data.date}
            </p>
          </div>
        </header>

        {/* PATIENT INFO BLOCK */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">{t.patientNameLabel}</span>
            <strong className="text-slate-900 text-sm">{data.patientName}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">{t.ageLabel}</span>
            <strong className="text-slate-900">{data.patientAgeFormatted}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">{t.genderLabel}</span>
            <strong className="text-slate-900">{data.patientGender}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">{t.locationLabel}</span>
            <strong className="text-slate-900">{data.patientLocation}</strong>
          </div>
        </div>

        {/* DIAGNOSIS */}
        <div className="mb-6">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t.diagnosisLabel}</span>
          <p className="text-sm font-semibold text-slate-800 mt-0.5 bg-amber-50 border-l-4 border-amber-500 p-2 rounded-r-md">
            {data.diagnosis}
          </p>
        </div>

        {/* RX SYMBOL & MEDICINES TABLE */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-2xl font-serif font-bold text-teal-700">℞</span>
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              {t.medicinesTableTitle}
            </h3>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-teal-700 text-white font-bold border border-teal-700">
                <th className="p-2.5">#</th>
                <th className="p-2.5">{t.colMedicine}</th>
                <th className="p-2.5">{t.colDosage}</th>
                <th className="p-2.5">{t.colFrequency}</th>
                <th className="p-2.5">{t.colDuration}</th>
                <th className="p-2.5">{t.colInstructions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 border border-slate-200">
              {data.items.map((item, idx) => {
                const freqText = t.freqMap?.[item.frequency] || item.frequency;
                const timingText = item.timing?.includes("Before") ? (t.beforeMeal || "Before Meal") : (t.afterMeal || "After Meal");

                return (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                    <td className="p-2.5 font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-slate-900 text-sm">{item.medicineName}</td>
                    <td className="p-2.5 font-medium text-slate-800">{item.dosage}</td>
                    <td className="p-2.5 text-teal-900 font-semibold">{freqText}</td>
                    <td className="p-2.5 font-bold text-slate-800">{item.durationDays} {t.daysUnit}</td>
                    <td className="p-2.5 text-slate-700">
                      <span className="font-semibold text-amber-900">{timingText}</span>
                      {item.instructions && <span className="block text-[11px] text-slate-500 mt-0.5">{item.instructions}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER & DOCTOR SIGNATURE BLOCK */}
        <footer className="pt-8 border-t border-slate-200 mt-12 grid grid-cols-2 gap-8 items-end">
          <div>
            <p className="text-[11px] text-slate-500 leading-relaxed italic border-l-2 border-slate-300 pl-3">
              {t.disclaimerNotice}
            </p>
          </div>
          <div className="text-right space-y-12">
            <div className="inline-block border-b-2 border-dashed border-slate-400 w-48 mb-2"></div>
            <div>
              <p className="text-xs font-bold text-slate-900">{data.doctorName}</p>
              <p className="text-[10px] text-slate-500">{t.doctorSigLabel}</p>
            </div>
          </div>
        </footer>

      </div>

      {/* PRINT MEDIA STYLES */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          .print\\:hidden, header, nav, button, .modal-backdrop {
            display: none !important;
          }
          .printable-rx-document {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
