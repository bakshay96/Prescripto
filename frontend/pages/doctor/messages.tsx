import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../components/ThemeContext";
import RoleGuard from "../../components/RoleGuard";
import VerticalSidebarNav from "../../components/VerticalSidebarNav";
import { listCommMessages, sendCommMessage, deleteCommMessage, clearCommMessages, CommMessage, getUser } from "../../utils/api";
import { playNotificationSound } from "../../components/RealtimeNotificationPanel";

function DoctorPharmacyMessagesContent() {
  const { theme, lang } = useTheme();
  const isDark = theme.id !== "light";

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<CommMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [chatSubTab, setChatSubTab] = useState<"live" | "history" | "urgent">("live");

  const [inputText, setInputText] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [patientName, setPatientName] = useState("");
  const [rxNumber, setRxNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUser(getUser());
    loadMessages();
    const interval = setInterval(loadMessages, 5000); // 5s polling sync
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

  const isPharmacist = currentUser?.role === "PHARMACIST";

  const handleDeleteSingleMessage = async (msgId: string) => {
    if (!confirm("Are you sure you want to delete this chat message?")) return;
    try {
      await deleteCommMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch {
      alert("Failed to delete message.");
    }
  };

  const handleClearAllHistory = async () => {
    if (!confirm("⚠️ Are you sure you want to clear ALL chat history for this clinic? This cannot be undone.")) return;
    setClearing(true);
    try {
      await clearCommMessages();
      setMessages([]);
    } catch {
      alert("Failed to clear chat history.");
    } finally {
      setClearing(false);
    }
  };

  const handleStartFreshThread = () => {
    setInputText("");
    setPatientName("");
    setRxNumber("");
    setPriority("NORMAL");
    setChatSubTab("live");
    playNotificationSound("chime");
  };

  const handleSend = async (presetText?: string) => {
    const textToSend = presetText || inputText;
    if (!textToSend.trim()) return;

    setSending(true);
    try {
      const targetRole = isPharmacist ? "DOCTOR" : "PHARMACIST";
      const sent = await sendCommMessage({
        message: textToSend.trim(),
        recipient_role: targetRole,
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

      // Dispatch event to global panel
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("admin-broadcast", {
            detail: {
              subject: `💬 Message sent to ${targetRole === "PHARMACIST" ? "Medical Store" : "Doctor OPD"}`,
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
    { label: "💊 Check Stock", text: "💊 Is Paracetamol 650mg & Amoxicillin in stock at Pharmacy counter?" },
    { label: "✅ Approve Substitute", text: "✅ Generic substitute drug approved by OPD Doctor for patient" },
    { label: "📜 Verify Rx", text: "📜 Please verify prescription details before dispensing medicine" },
    { label: "🚨 Emergency ICU", text: "🚨 Emergency ICU Medicine Delivery Required Immediately" },
    { label: "📦 Dispense Ready", text: "📦 Prescription medicines packed & ready for patient pickup" },
  ];

  // Filtered message thread
  const filteredMessages = messages.filter((m) => {
    const matchesSearch =
      m.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.patient_name && m.patient_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.prescription_id && m.prescription_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.sender_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = filterPriority === "ALL" || m.priority === filterPriority;

    return matchesSearch && matchesPriority;
  });

  return (
    <>
      <Head>
        <title>Doctor &amp; Pharmacy Communication — Prescripto</title>
        <meta name="description" content="Interactive 2-way communication and drug availability chat between Doctor OPD and Medical Store Pharmacy Desk." />
      </Head>

      <div
        className="flex h-[calc(100vh-76px)] overflow-hidden"
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
        }}
      >
        <VerticalSidebarNav mode={isPharmacist ? "PHARMACIST" : "DOCTOR"} />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto space-y-5 min-w-0 flex flex-col">
          {/* Top Title Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{isPharmacist ? "💊" : "🩺"}</span>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.text, margin: 0 }}>
                  {isPharmacist
                    ? (lang === "mr" ? "औषध दुकान → डॉक्टर संवाद केंद्र" : "Medical Store → Doctor OPD Communication Desk")
                    : (lang === "mr" ? "डॉक्टर → औषध दुकान संवाद केंद्र" : "Doctor OPD → Medical Store Communication Desk")}
                </h1>
                <span className="ux4g-badge ux4g-badge-gov">WEBSOCKET AUDIO CHIME</span>
              </div>
              <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
                Direct 2-way real-time messaging, drug availability inquiries, and prescription verification.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={handleStartFreshThread} className="ux4g-btn ux4g-btn-saffron text-xs">
                ✨ Start Fresh Thread
              </button>
              <button type="button" onClick={handleClearAllHistory} disabled={clearing} className="ux4g-btn ux4g-btn-red text-xs">
                {clearing ? "Clearing…" : "🧹 Clear Chat History"}
              </button>
              <button type="button" onClick={loadMessages} className="ux4g-btn ux4g-btn-outline text-xs">
                🔄 Sync
              </button>
            </div>
          </div>

          {/* Sub-Tabs Bar */}
          <div className="flex gap-2 border-b pb-2 flex-wrap" style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
            {[
              { id: "live", label: "💬 Active Live Chat", count: messages.length },
              { id: "history", label: "📜 Full Chat History Timeline", count: messages.length },
              { id: "urgent", label: "🚨 Urgent Inquiries", count: messages.filter(m => m.priority !== "NORMAL").length },
            ].map((st) => {
              const isSubActive = chatSubTab === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setChatSubTab(st.id as any);
                    if (st.id === "urgent") setFilterPriority("URGENT");
                    else setFilterPriority("ALL");
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isSubActive
                      ? "bg-amber-500 text-slate-950 font-black shadow-md"
                      : isDark ? "bg-slate-900 text-slate-300 hover:bg-slate-800" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>{st.label}</span>
                  {st.count !== undefined && (
                    <span className="ml-2 opacity-80 font-mono">({st.count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Interactive Search & Filter Bar */}
          <div
            className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{
              background: isDark ? "#0f172a" : "#ffffff",
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
            }}
          >
            <div className="flex-1 relative w-full">
              <input
                type="text"
                placeholder="Search messages by medicine, patient name, or Rx #…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ux4g-input w-full pl-9"
                style={{ fontSize: 11, padding: "6px 12px 6px 32px" }}
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2 text-slate-400 font-bold text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Priority Filter:</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="ux4g-input text-xs"
                style={{ fontSize: 11, padding: "6px 10px" }}
              >
                <option value="ALL">All Priorities ({messages.length})</option>
                <option value="NORMAL">Normal</option>
                <option value="URGENT">⚠️ Urgent</option>
                <option value="EMERGENCY">🚨 Emergency</option>
              </select>
            </div>
          </div>

          {/* Quick Presets Action Chips Bar */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">⚡ Quick Action Triggers:</span>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p.text)}
                className="px-3 py-1.5 rounded-xl border text-xs font-extrabold hover:scale-[1.03] transition-all shadow-xs"
                style={{
                  background: isDark ? "#1e293b" : "#f1f5f9",
                  borderColor: isDark ? "#334155" : "#cbd5e1",
                  color: theme.text,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Thread Container */}
          <div
            className="flex-1 rounded-2xl border p-4 flex flex-col justify-between space-y-4 overflow-hidden min-h-[420px]"
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
              ) : filteredMessages.length === 0 ? (
                <div className="p-12 text-center text-xs font-bold text-slate-400">
                  No chat messages found matching filters. Send a new message below!
                </div>
              ) : (
                filteredMessages.slice().reverse().map((m) => {
                  const isSenderSelf = (isPharmacist && m.sender_role === "PHARMACIST") || (!isPharmacist && m.sender_role === "DOCTOR");
                  const isDoctorRole = m.sender_role === "DOCTOR";
                  
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isSenderSelf ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-xl p-4 rounded-2xl text-xs space-y-2 shadow-md transition-all ${
                          isSenderSelf
                            ? isDoctorRole
                              ? "bg-gradient-to-r from-rose-600 to-red-700 text-white rounded-tr-none"
                              : "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold rounded-tr-none"
                            : isDoctorRole
                            ? "bg-slate-800 text-white rounded-tl-none border border-slate-700"
                            : "bg-emerald-900/90 text-emerald-100 rounded-tl-none border border-emerald-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] font-black opacity-90 border-b border-black/10 pb-1">
                          <span className="flex items-center gap-1.5">
                            <span>{isDoctorRole ? "🩺" : "💊"}</span>
                            <span>{m.sender_name}</span>
                            <span className="opacity-75">({m.sender_role})</span>
                          </span>
                          <span>{new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>

                        {/* Priority Badge */}
                        {m.priority && m.priority !== "NORMAL" && (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider inline-block ${
                            m.priority === "EMERGENCY" ? "bg-rose-950 text-rose-200 border border-rose-600 animate-pulse" : "bg-amber-950 text-amber-200 border border-amber-600"
                          }`}>
                            {m.priority === "EMERGENCY" ? "🚨 EMERGENCY" : "⚠️ URGENT"}
                          </span>
                        )}

                        {m.patient_name && (
                          <div className="text-[10px] font-extrabold bg-black/25 px-2.5 py-1 rounded-lg flex items-center justify-between gap-2">
                            <span>👤 Patient: {m.patient_name}</span>
                            {m.prescription_id && <span className="font-mono">Rx #: {m.prescription_id}</span>}
                          </div>
                        )}

                        <div className="font-bold text-xs leading-relaxed">
                          {m.message}
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-4 border-t border-black/10">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleMessage(m.id)}
                            className="text-[10px] font-extrabold opacity-75 hover:opacity-100 hover:underline text-rose-300 flex items-center gap-1"
                            title="Delete message"
                          >
                            <span>🗑️ Delete</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setInputText(`Re: ${m.message}`);
                              if (m.patient_name) setPatientName(m.patient_name);
                              if (m.prescription_id) setRxNumber(m.prescription_id);
                            }}
                            className="text-[10px] font-extrabold opacity-90 hover:opacity-100 hover:underline flex items-center gap-1"
                          >
                            <span>💬 Quick Reply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Interactive Message Composer */}
            <div className="pt-3 border-t space-y-2" style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
              <div className="flex gap-2 flex-wrap text-xs">
                <input
                  type="text"
                  placeholder="Patient Name (Optional)"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="ux4g-input flex-1"
                  style={{ fontSize: 11, padding: "6px 10px" }}
                />
                <input
                  type="text"
                  placeholder="Rx # (Optional)"
                  value={rxNumber}
                  onChange={(e) => setRxNumber(e.target.value)}
                  className="ux4g-input w-36"
                  style={{ fontSize: 11, padding: "6px 10px" }}
                />
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="ux4g-input w-36"
                  style={{ fontSize: 11, padding: "6px 10px" }}
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="URGENT">⚠️ Urgent</option>
                  <option value="EMERGENCY">🚨 Emergency</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={isPharmacist ? "Type message to Hospital OPD Doctor…" : "Type message to Medical Store Pharmacist…"}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="ux4g-input flex-1"
                  style={{ fontSize: 12, padding: "9px 14px" }}
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
    <RoleGuard allowedRoles={["DOCTOR", "PHARMACIST", "MASTER_ADMIN"]}>
      <DoctorPharmacyMessagesContent />
    </RoleGuard>
  );
}
