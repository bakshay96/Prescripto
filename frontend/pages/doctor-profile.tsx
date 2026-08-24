import Head from "next/head";
import { useTheme } from "../components/ThemeContext";
import DoctorProfilePanel from "../components/DoctorProfilePanel";
import RoleGuard from "../components/RoleGuard";
import VerticalSidebarNav from "../components/VerticalSidebarNav";

function DoctorProfileContent() {
  const { theme, lang } = useTheme();
  const isDark = theme.id !== "light";

  const TITLE: Record<string, string> = {
    mr: "🏥 डॉक्टर व हॉस्पिटल प्रोफाइल",
    hi: "🏥 डॉक्टर और अस्पताल प्रोफाइल",
    en: "🏥 Doctor & Hospital Profile",
  };
  const SUB: Record<string, string> = {
    mr: "प्रत्येक प्रिस्क्रिप्शनवर दिसणारी माहिती — नाव, पत्ता, सुविधा.",
    hi: "हर पर्चे पर दिखने वाली जानकारी — नाम, पता, सुविधाएं.",
    en: "Details shown on every prescription — name, address, facilities.",
  };

  return (
    <>
      <Head>
        <title>Hospital Profile — Prescripto</title>
        <meta name="description" content="Set your hospital name, doctor details, qualifications, facilities and clinic hours used on every printed prescription." />
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
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.text, margin: 0 }}>
              {TITLE[lang] ?? TITLE.en}
            </h1>
            <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
              {SUB[lang] ?? SUB.en}
            </p>
          </div>
          <DoctorProfilePanel isDark={isDark} />
        </div>
      </div>
    </>
  );
}

export default function DoctorProfilePage() {
  return (
    <RoleGuard allowedRoles={["DOCTOR", "MASTER_ADMIN"]}>
      <DoctorProfileContent />
    </RoleGuard>
  );
}
