import Head from "next/head";
import { useTheme } from "../components/ThemeContext";
import MedicalStoreDashboard from "../components/InventoryDashboard";

export default function InventoryPage() {
  const { theme } = useTheme();
  const isDark = theme.id !== "light";

  return (
    <>
      <Head>
        <title>Medical Store — Prescripto</title>
        <meta name="description" content="Manage medicine inventory, stock alerts, expiry tracking and batch management." />
      </Head>
      <div style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
        transition: "background-color 0.3s, color 0.3s",
      }}>
        <MedicalStoreDashboard isDarkTheme={isDark} />
      </div>
    </>
  );
}
