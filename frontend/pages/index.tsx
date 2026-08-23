import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { apiFetch, getToken, getUser } from "../utils/api";
import { getDefaultRouteForRole } from "../components/RoleGuard";

const ROUTES = [
  {
    href: "/prescription",
    icon: "✍️",
    title: "Write Prescription",
    titleMr: "प्रिस्क्रिप्शन लिहा",
    desc: "Issue digital prescriptions with Marathi / Hindi / English support and professional print",
    role: "Doctor",
    roleColor: "#3b82f6",
    badge: "Doctor Only",
    gradient: "linear-gradient(135deg,#1e3a5f,#1e40af)",
    glow: "rgba(59,130,246,0.35)",
  },
  {
    href: "/inventory",
    icon: "💊",
    title: "Medical Store",
    titleMr: "औषध साठा",
    desc: "Manage medicine inventory, stock alerts, batches, expiry, and pharmacist controls",
    role: "Pharmacist",
    roleColor: "#10b981",
    badge: "Pharmacist",
    gradient: "linear-gradient(135deg,#064e3b,#065f46)",
    glow: "rgba(16,185,129,0.35)",
  },
  {
    href: "/doctor-profile",
    icon: "🏥",
    title: "Hospital Profile",
    titleMr: "हॉस्पिटल प्रोफाइल",
    desc: "Set hospital name, doctor details, facilities list, clinic hours — used on every prescription",
    role: "Admin",
    roleColor: "#f59e0b",
    badge: "Doctor Admin",
    gradient: "linear-gradient(135deg,#451a03,#78350f)",
    glow: "rgba(245,158,11,0.35)",
  },
  {
    href: "/admin",
    icon: "🛡️",
    title: "Master Admin Portal",
    titleMr: "मास्टर ॲडमिन पोर्टल",
    desc: "System analytics, hospital block/unblock, subscription plans, and support desk",
    role: "Admin",
    roleColor: "#a855f7",
    badge: "Master Admin",
    gradient: "linear-gradient(135deg,#3b0764,#581c87)",
    glow: "rgba(168,85,247,0.35)",
  },
];

interface DashStats {
  prescriptions: string;
  medicines: string;
  patients: string;
  pending: string;
}

export default function IndexPage() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const [stats, setStats] = useState<DashStats>({
    prescriptions: "—", medicines: "—", patients: "—", pending: "—",
  });

  useEffect(() => {
    const user = getUser();
    if (user) {
      router.replace(getDefaultRouteForRole(user.role));
      return;
    }
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return; // Only load stats when logged in
    const load = async () => {
      try {
        const [rxList, medList, patList] = await Promise.allSettled([
          apiFetch<{ id: string; status: string }[]>("/prescriptions"),
          apiFetch<{ id: string }[]>("/inventory/medicines"),
          apiFetch<{ id: string }[]>("/patients"),
        ]);
        const rxData = rxList.status === "fulfilled" ? rxList.value : [];
        const medData = medList.status === "fulfilled" ? medList.value : [];
        const patData = patList.status === "fulfilled" ? patList.value : [];
        const pending = rxData.filter((r: any) => r.status === "PENDING").length;
        setStats({
          prescriptions: String(rxData.length),
          medicines: String(medData.length),
          patients: String(patData.length),
          pending: String(pending),
        });
      } catch {
        // silently ignore if not logged in
      }
    };
    load();
  }, []);

  const liveStats = [
    { label: "Active Prescriptions", value: stats.prescriptions, icon: "📋" },
    { label: "Medicines in Store", value: stats.medicines, icon: "💊" },
    { label: "Patients Registered", value: stats.patients, icon: "👥" },
    { label: "Pending Dispense", value: stats.pending, icon: "⏳" },
  ];

  return (
    <>
      <Head>
        <title>Prescripto — Doctor & Pharmacy Management</title>
        <meta name="description" content="Professional prescription management system for Indian clinics and hospitals. Supports Marathi, Hindi, and English prescriptions." />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)",
        fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
        color: "white",
      }}>

        {/* ── TOP NAV ── */}
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 32px",
          background: "rgba(255,255,255,0.03)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Logo mark */}
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg,#c41e3a,#e53e3e)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, boxShadow: "0 4px 12px rgba(196,30,58,0.4)",
            }}>⚕</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>Prescripto</div>
              <div style={{ fontSize: 9.5, color: "#64748b", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                Hospital Management System
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {ROUTES.map(r => (
              <Link key={r.href} href={r.href} style={{
                padding: "7px 14px", fontSize: 11, fontWeight: 700,
                borderRadius: 8, textDecoration: "none",
                color: "#94a3b8", transition: "all 0.2s",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                {r.icon} {r.title}
              </Link>
            ))}
          </div>
        </nav>

        {/* ── HERO ── */}
        <div style={{ textAlign: "center", padding: "72px 32px 48px" }}>
          {/* Animated gradient orb */}
          <div style={{
            width: 120, height: 120, borderRadius: "50%", margin: "0 auto 28px",
            background: "linear-gradient(135deg,#c41e3a,#7c3aed,#1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 48,
            boxShadow: "0 0 80px rgba(196,30,58,0.4), 0 0 40px rgba(124,58,237,0.3)",
            animation: "pulse 3s ease-in-out infinite",
          }}>
            ⚕️
          </div>

          <h1 style={{
            fontSize: 42, fontWeight: 900, letterSpacing: "-1px",
            background: "linear-gradient(90deg,#f8fafc,#c7d2fe,#fda4af)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            lineHeight: 1.15, marginBottom: 14,
          }}>
            Prescripto
          </h1>
          <div style={{
            fontFamily: "'Noto Sans Devanagari',Arial,sans-serif",
            fontSize: 18, color: "#94a3b8", fontWeight: 600, marginBottom: 8,
          }}>
            डॉक्टर प्रिस्क्रिप्शन व फार्मसी व्यवस्थापन
          </div>
          <p style={{ fontSize: 14, color: "#64748b", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
            Professional prescription system for Indian clinics.
            Marathi · Hindi · English trilingual support.
            A4 print-ready prescriptions. Inventory management. Patient records.
          </p>
        </div>

        {/* ── STATS BAR ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)",
          gap: 1, margin: "0 32px 48px",
          borderRadius: 16, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
          maxWidth: 860, marginLeft: "auto", marginRight: "auto",
        }}>
          {liveStats.map((s, i) => (
            <div key={i} style={{
              padding: "20px 24px",
              background: "rgba(255,255,255,0.03)",
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>{s.value}</div>
              <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 600, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN ROUTE CARDS ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20, padding: "0 32px 64px",
          maxWidth: 1100, margin: "0 auto",
        }}>
          {ROUTES.map(r => (
            <Link
              key={r.href}
              href={r.href}
              style={{ textDecoration: "none" }}
              onMouseEnter={() => setHovered(r.href)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{
                background: r.gradient,
                borderRadius: 20,
                padding: "32px 28px",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: hovered === r.href
                  ? `0 24px 60px ${r.glow}, 0 8px 24px rgba(0,0,0,0.4)`
                  : "0 4px 20px rgba(0,0,0,0.3)",
                transform: hovered === r.href ? "translateY(-6px) scale(1.01)" : "translateY(0) scale(1)",
                transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                cursor: "pointer", height: "100%",
              }}>
                {/* Icon */}
                <div style={{
                  fontSize: 40, marginBottom: 16,
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                }}>
                  {r.icon}
                </div>

                {/* Role badge */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 20, marginBottom: 14,
                  backgroundColor: `${r.roleColor}25`,
                  border: `1px solid ${r.roleColor}50`,
                  fontSize: 10, fontWeight: 800,
                  color: r.roleColor, letterSpacing: "0.4px", textTransform: "uppercase",
                }}>
                  {r.badge}
                </div>

                {/* Title */}
                <div style={{ fontSize: 20, fontWeight: 800, color: "white", marginBottom: 4, letterSpacing: "-0.3px" }}>
                  {r.title}
                </div>
                <div style={{
                  fontFamily: "'Noto Sans Devanagari',Arial,sans-serif",
                  fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginBottom: 12,
                }}>
                  {r.titleMr}
                </div>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, margin: 0 }}>
                  {r.desc}
                </p>

                {/* Arrow */}
                <div style={{
                  marginTop: 24, display: "flex", alignItems: "center", gap: 6,
                  fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)",
                  transform: hovered === r.href ? "translateX(4px)" : "translateX(0)",
                  transition: "transform 0.2s ease",
                }}>
                  Open {r.title} →
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── FEATURE HIGHLIGHTS ── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "48px 32px 64px",
          maxWidth: 1100, margin: "0 auto",
        }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>
              KEY FEATURES
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>
              Built for Indian Clinics
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {[
              { icon: "🖨️", title: "Print-Perfect A4", desc: "Opens clean print window — only the prescription, no UI" },
              { icon: "🇮🇳", title: "Trilingual Support", desc: "Full Marathi · Hindi · English with Devanagari fonts" },
              { icon: "💊", title: "Drug Autocomplete", desc: "Search from inventory, add custom drugs without touching DB" },
              { icon: "👤", title: "Quick Patient Add", desc: "Inline patient registration if not found in list" },
              { icon: "🔒", title: "Role Protection", desc: "Pharmacist DB is read-only for doctors, write-only for pharmacist" },
              { icon: "📱", title: "Mobile Friendly", desc: "Fully responsive from 320px to 4K, all breakpoints covered" },
            ].map((f, i) => (
              <div key={i} style={{
                padding: "20px", borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 5 }}>{f.title}</div>
                <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "20px 32px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 11.5, color: "#475569",
        }}>
          <div>© 2026 Prescripto — Hospital Management System</div>
          <div style={{ display: "flex", gap: 20 }}>
            {ROUTES.map(r => (
              <Link key={r.href} href={r.href} style={{ color: "#475569", textDecoration: "none" }}>
                {r.title}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
