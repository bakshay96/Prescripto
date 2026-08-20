import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { loginApi, registerHospitalApi, setToken, setUser, getUser } from "../utils/api";
import BrandLoader from "../components/BrandLoader";
import { useTheme } from "../components/ThemeContext";

const DEMO_CREDENTIALS = [
  {
    role: "DOCTOR" as const,
    label: "Doctor Login",
    emoji: "🩺",
    email: "doctor@prescripto.com",
    password: "doctor123",
    description: "Dr. Vikas Karande — Write prescriptions, manage patients",
    gradient: "linear-gradient(135deg,#c41e3a 0%,#be123c 100%)",
    glow: "rgba(196,30,58,0.35)",
    border: "rgba(196,30,58,0.4)",
    redirect: "/prescription",
  },
  {
    role: "PHARMACIST" as const,
    label: "Pharmacist Login",
    emoji: "💊",
    email: "pharma@prescripto.com",
    password: "pharma123",
    description: "Medical Store — Inventory, stock, dispense queue",
    gradient: "linear-gradient(135deg,#059669 0%,#047857 100%)",
    glow: "rgba(5,150,105,0.35)",
    border: "rgba(5,150,105,0.4)",
    redirect: "/inventory",
  },
  {
    role: "MASTER_ADMIN" as const,
    label: "Admin Login",
    emoji: "🛡️",
    email: "admin@prescripto.com",
    password: "admin123",
    description: "System admin — Hospitals, subscriptions, analytics",
    gradient: "linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)",
    glow: "rgba(124,58,237,0.35)",
    border: "rgba(124,58,237,0.4)",
    redirect: "/prescription",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState<"DOCTOR" | "PHARMACIST" | "MASTER_ADMIN" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regClinicName, setRegClinicName] = useState("");
  const [regClinicAddress, setRegClinicAddress] = useState("");
  const [regClinicPhone, setRegClinicPhone] = useState("");
  const [regLicense, setRegLicense] = useState("");

  useEffect(() => {
    const user = getUser();
    if (user) {
      if (user.role === "PHARMACIST") router.replace("/inventory");
      else router.replace("/prescription");
    }
  }, [router]);

  const doLogin = async (email: string, password: string, role?: typeof DEMO_CREDENTIALS[0]["role"]) => {
    setLoading(true);
    if (role) setLoadingRole(role);
    setError(null);
    try {
      const res = await loginApi(email, password);
      setToken(res.access_token);

      // Fetch full user profile from /auth/me
      let fullName = email.split("@")[0];
      let clinicId = "";
      try {
        const me = await getMeApi();
        fullName = me.full_name || fullName;
        clinicId = me.clinic_id || "";
      } catch {}

      setUser({
        id: res.user_id,
        role: res.role as any,
        full_name: fullName,
        email,
        clinic_id: clinicId,
      });

      // Show brand loader briefly before redirect
      await new Promise(r => setTimeout(r, 1200));

      if (res.role === "PHARMACIST") router.replace("/inventory");
      else router.replace("/prescription");
    } catch (err: any) {
      setLoadingRole(null);
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(loginEmail, loginPassword);
  };

  const handleDemoLogin = async (cred: typeof DEMO_CREDENTIALS[0]) => {
    setDemoLoading(cred.role);
    await doLogin(cred.email, cred.password, cred.role);
    setDemoLoading(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingRole("DOCTOR");
    setError(null);
    try {
      const res = await registerHospitalApi({
        full_name: regFullName, email: regEmail, password: regPassword,
        clinic_name: regClinicName, clinic_address: regClinicAddress,
        clinic_phone: regClinicPhone, license_number: regLicense,
      });
      setToken(res.access_token);
      setUser({ id: res.user_id, role: res.role as any, full_name: res.doctor_name, email: regEmail, clinic_id: res.clinic_id });
      await new Promise(r => setTimeout(r, 1200));
      router.replace("/prescription");
    } catch (err: any) {
      setLoadingRole(null);
      setError(err.message || "Hospital registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (loadingRole) {
    return <BrandLoader role={loadingRole} message="Authenticating your account… Please wait." />;
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
    color: "white", fontSize: 13, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <>
      <Head>
        <title>Login — Prescripto | Hospital Management Platform</title>
        <meta name="description" content="Sign in to Prescripto Hospital Management Platform as Doctor, Pharmacist, or Admin." />
      </Head>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#020617 0%,#0f172a 40%,#1e1b4b 70%,#020617 100%)",
        fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px", color: "white",
        position: "relative", overflow: "hidden",
      }}>
        {/* Background orbs */}
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,30,58,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "5%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Main card */}
        <div style={{
          width: "100%", maxWidth: 480,
          background: "rgba(15,23,42,0.92)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24, padding: "32px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          position: "relative",
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: "linear-gradient(135deg,#c41e3a,#e53e3e)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, boxShadow: "0 6px 20px rgba(196,30,58,0.5)",
              }}>⚕</div>
              <span style={{ fontSize: 24, fontWeight: 900, color: "white", letterSpacing: "-0.5px" }}>Prescripto</span>
            </Link>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
              Hospital &amp; Doctor Portal — Multilingual Prescription System
            </p>
          </div>

          {/* ═══ DEMO CREDENTIALS SECTION ═══ */}
          <div style={{
            marginBottom: 24,
            padding: "16px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>
              ⚡ One-Click Demo Login
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.role}
                  onClick={() => handleDemoLogin(cred)}
                  disabled={demoLoading !== null || loading}
                  style={{
                    display: "flex", alignItems: "center",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: `1px solid ${cred.border}`,
                    background: demoLoading === cred.role ? cred.gradient : `${cred.glow}`,
                    cursor: demoLoading !== null || loading ? "wait" : "pointer",
                    gap: 12,
                    transition: "all 0.2s",
                    boxShadow: demoLoading === cred.role ? `0 4px 16px ${cred.glow}` : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!demoLoading) {
                      (e.currentTarget as HTMLElement).style.background = cred.gradient;
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${cred.glow}`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!demoLoading || demoLoading !== cred.role) {
                      (e.currentTarget as HTMLElement).style.background = cred.glow;
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }
                  }}
                >
                  {demoLoading === cred.role ? (
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "white",
                      animation: "spin 0.8s linear infinite",
                      flexShrink: 0,
                    }} />
                  ) : (
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{cred.emoji}</span>
                  )}
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>{cred.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>{cred.description}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
                    {demoLoading === cred.role ? "⏳" : "→"}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: "#334155" }}>
              Backend: Active API • Mongo / Relational Ready
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>OR MANUAL LOGIN</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Tab Switcher */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 6, background: "rgba(255,255,255,0.05)",
            padding: 4, borderRadius: 12, marginBottom: 20
          }}>
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); }}
                style={{
                  padding: "9px", borderRadius: 8, border: "none",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: tab === t ? "#c41e3a" : "transparent",
                  color: tab === t ? "white" : "#64748b",
                  transition: "all 0.2s",
                }}
              >
                {t === "login" ? "🔑 Sign In" : "🏥 Register Hospital"}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171", padding: "10px 14px", borderRadius: 10,
              fontSize: 12, fontWeight: 600, marginBottom: 16
            }}>
              ⚠️ {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: "0.5px" }}>EMAIL</label>
                <input type="email" required placeholder="doctor@suyog.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: "0.5px" }}>PASSWORD</label>
                <input type="password" required placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "13px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#c41e3a,#e53e3e)",
                color: "white", fontSize: 14, fontWeight: 800, cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 16px rgba(196,30,58,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {loading && !loadingRole && <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.8s linear infinite", display: "inline-block" }} />}
                {loading && !loadingRole ? "Signing in…" : "Sign In →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4, letterSpacing: "0.5px" }}>HOSPITAL / CLINIC NAME *</label>
                <input type="text" required placeholder="Suyog Hospital" value={regClinicName} onChange={e => setRegClinicName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4, letterSpacing: "0.5px" }}>DOCTOR FULL NAME *</label>
                <input type="text" required placeholder="Dr. Vikas Va. Karande" value={regFullName} onChange={e => setRegFullName(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4, letterSpacing: "0.5px" }}>EMAIL *</label>
                  <input type="email" required placeholder="doctor@suyog.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4, letterSpacing: "0.5px" }}>PASSWORD *</label>
                  <input type="password" required placeholder="••••••••" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4, letterSpacing: "0.5px" }}>PHONE</label>
                  <input type="text" placeholder="7757003800" value={regClinicPhone} onChange={e => setRegClinicPhone(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4, letterSpacing: "0.5px" }}>REG NUMBER</label>
                  <input type="text" placeholder="06/2002/2451" value={regLicense} onChange={e => setRegLicense(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4, letterSpacing: "0.5px" }}>HOSPITAL ADDRESS</label>
                <input type="text" placeholder="तहसिल समोर, बुलडाणा रोड, मोताळा" value={regClinicAddress} onChange={e => setRegClinicAddress(e.target.value)} style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "13px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#c41e3a,#e53e3e)",
                color: "white", fontSize: 13, fontWeight: 800, cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 16px rgba(196,30,58,0.4)",
              }}>
                {loading ? "Registering…" : "Create Account & Clinic →"}
              </button>
            </form>
          )}

          {/* Demo credential hints */}
          <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Demo Credentials</div>
            {DEMO_CREDENTIALS.map((c) => (
              <div key={c.role} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 10 }}>
                <span style={{ color: "#475569" }}>{c.emoji} {c.label}:</span>
                <span style={{ color: "#64748b", fontFamily: "monospace" }}>{c.email} / {c.password}</span>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}
