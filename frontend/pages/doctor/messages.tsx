import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../components/ThemeContext";
import RoleGuard from "../../components/RoleGuard";
import VerticalSidebarNav from "../../components/VerticalSidebarNav";
import { listCommMessages, sendCommMessage, CommMessage } from "../../utils/api";
import { playNotificationSound } from "../../components/RealtimeNotificationPanel";

function DoctorPharmacyMessagesContent() {
  const { theme, lang } = useTheme();
  const isDark = theme.id !== "light";

  const [messages, setMessages] = useState<CommMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [patientName, setPatientName] = useState("");
  const [rxNumber, setRxNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 8000); // Polling sync
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const data = await listCommMessages();
      setMessages(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (presetText?: string) => {
    const textToSend = presetText || inputText;
    if (!textToSend.trim()) return;

    setSending(true);
    try {
      const sent = await sendCommMessage({
        message: textToSend.trim(),
        recipient_role: "PHARMACIST",
        patient_name: patientName.trim() || undefined,
        prescription_id: rxNumber.trim() || undefined,
        priority,
      });

      setMessages((prev) => [sent, ...prev]);
      setInputText("");
      setPatientName("");
      setRxNumber("");
      
      // Play audio chime
      playNotificationSound("chime");

      // Notify global panel
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("admin-broadcast", {
            detail: {
              subject: `💬 Message sent to Medical Store`,
              message: textToSend.slice(0, 80),
            },
          })
        );
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const PRESETS = [
    "💊 Is Paracetamol 650mg in stock at Pharmacy counter?",
    "✅ Substitute drug approved by Doctor for patient",
    "📜 Please verify Rx details before dispensing medicine",
    "🚨 Emergency ICU Medicine Delivery Required Immediately",
  ];

  return (
    <>
      <Head>
        <title>Doctor &amp; Pharmacy Communication — Prescripto</title>
        <meta name="description" content="Real-time communication and drug availability chat between Doctor OPD and Medical Store Pharmacy Desk." />
      </Head>

      <div
        className="flex h-[calc(100vh-76px)] overflow-hidden"
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
        }}
      >
        <VerticalSidebarNav mode="DOCTOR" />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto space-y-6 min-w-0 flex flex-col">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💬</span>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.text, margin: 0 }}>
                  {lang === "mr" ? "डॉक्टर व औषध दुकान संवाद केंद्र" : "Doctor & Pharmacy Communication Hub"}
                </h1>
                <span className="ux4g-badge ux4g-badge-gov">REALTIME AUDIO CHIME</span>
              </div>
              <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
                Direct communication, drug availability inquiries, and prescription verification with Medical Store.
              </p>
            </div>

            <button type="button" onClick={loadMessages} className="ux4g-btn ux4g-btn-outline">
              🔄 Sync Messages
            </button>
          </div>

          {/* Quick Presets Bar */}
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p)}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold hover:scale-[1.02] transition-transform"
                style={{
                  background: isDark ? "#0f172a" : "#f8fafc",
                  borderColor: isDark ? "#1e293b" : "#e2e8f0",
                  color: theme.text,
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages Thread Container */}
          <div
            className="flex-1 rounded-2xl border p-4 flex flex-col justify-between space-y-4 overflow-hidden min-h-[380px]"
            style={{
              background: isDark ? "#0f172a" : "#ffffff",
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
            }}
          >
            {/* Scrollable Message List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {loading ? (
                <div className="p-8 text-center text-xs font-bold text-slate-400">
                  Loading Doctor-Pharmacy chat thread…
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-slate-400">
                  No previous messages. Start a conversation with the Medical Store pharmacist above!
                </div>
              ) : (
                messages.slice().reverse().map((m) => {
                  const isDoctor = m.sender_role === "DOCTOR";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isDoctor ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-lg p-3.5 rounded-2xl text-xs space-y-1 shadow-sm ${
                          isDoctor
                            ? "bg-rose-600 text-white rounded-tr-none"
                            : "bg-slate-800 text-white rounded-tl-none border border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] font-black opacity-80">
                          <span>{m.sender_name} ({m.sender_role})</span>
                          <span>{new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>

                        {m.patient_name && (
                          <div className="text-[10px] font-bold bg-black/20 px-2 py-0.5 rounded-md inline-block">
                            👤 Patient: {m.patient_name} {m.prescription_id ? `· Rx: ${m.prescription_id}` : ""}
                          </div>
                        )}

                        <div className="font-semibold text-xs leading-relaxed">
                          {m.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Composer */}
            <div className="pt-3 border-t space-y-2" style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
              <div className="flex gap-2 flex-wrap text-xs">
                <input
                  type="text"
                  placeholder="Patient Name (Optional)"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="ux4g-input flex-1"
                  style={{ fontSize: 11, padding: "5px 10px" }}
                />
                <input
                  type="text"
                  placeholder="Rx # (Optional)"
                  value={rxNumber}
                  onChange={(e) => setRxNumber(e.target.value)}
                  className="ux4g-input w-32"
                  style={{ fontSize: 11, padding: "5px 10px" }}
                />
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="ux4g-input w-32"
                  style={{ fontSize: 11, padding: "5px 10px" }}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">⚠️ Urgent</option>
                  <option value="EMERGENCY">🚨 Emergency</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type message to Pharmacist / Medical Store…"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="ux4g-input flex-1"
                  style={{ fontSize: 12, padding: "8px 12px" }}
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={sending || !inputText.trim()}
                  className="ux4g-btn ux4g-btn-saffron px-6"
                >
                  {sending ? "Sending…" : "✉️ Send Message"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function DoctorPharmacyMessagesPage() {
  return (
    <RoleGuard allowedRoles={["DOCTOR", "MASTER_ADMIN"]}>
      <DoctorPharmacyMessagesContent />
    </RoleGuard>
  );
}
