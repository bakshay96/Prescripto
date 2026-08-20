import Head from "next/head";
import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";
import PrescriptionWriter from "../components/PrescriptionWriter";
import { INITIAL_MEDICINES, MedicineItem } from "../components/InventoryDashboard";
import { listMedicines, Medicine } from "../utils/api";

export default function PrescriptionPage() {
  const { theme, lang } = useTheme();
  const [inventoryMeds, setInventoryMeds] = useState<MedicineItem[]>(INITIAL_MEDICINES);

  useEffect(() => {
    // Load live medicines from backend for autocomplete in PrescriptionWriter
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
        // If API returns empty, keep INITIAL_MEDICINES as fallback
      })
      .catch(() => {
        // Keep INITIAL_MEDICINES fallback on API error
      });
  }, []);

  const LABELS: Record<string, Record<string, string>> = {
    title: { mr: "✍️ प्रिस्क्रिप्शन लिहा", hi: "✍️ पर्चा लिखें", en: "✍️ Write Prescription" },
    sub: {
      mr: "केवळ डॉक्टर • औषधे यादीतून • A4 प्रिंट",
      hi: "केवल डॉक्टर • दवाएं सूची से • A4 प्रिंट",
      en: "Doctor access only · Medicines auto-suggested · A4 print output",
    },
  };

  return (
    <>
      <Head>
        <title>Write Prescription — Prescripto</title>
        <meta name="description" content="Issue digital prescriptions with Marathi, Hindi, English multilingual support and A4 print output." />
      </Head>
      <div style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
        transition: "background-color 0.3s, color 0.3s",
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 16px 80px" }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.text, margin: 0 }}>
              {LABELS.title[lang] ?? LABELS.title.en}
            </h1>
            <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
              {LABELS.sub[lang] ?? LABELS.sub.en}
            </p>
          </div>
          <PrescriptionWriter
            inventoryMeds={inventoryMeds}
            isDark={theme.id === "dark" || theme.id === "indigo" || theme.id === "forest" || theme.id === "sunset"}
            userRole="DOCTOR"
          />
        </div>
      </div>
    </>
  );
}
