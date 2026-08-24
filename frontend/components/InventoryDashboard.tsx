"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  listMedicines,
  addMedicine as apiAddMedicine,
  restockMedicine as apiRestockMedicine,
  generatePharmacyBill,
  fetchBillingHistory,
  listPrescriptions,
  dispensePrescription,
  Prescription,
  Medicine as ApiMedicine,
  getUser,
  PharmacyBillResponse,
  listCommMessages,
  sendCommMessage,
  deleteCommMessage,
  clearCommMessages,
  CommMessage,
} from "../utils/api";
import { useTheme } from "./ThemeContext";
import CountUpNumber from "./CountUpNumber";
import { playNotificationSound } from "./RealtimeNotificationPanel";

export type DosageForm = "Tablet" | "Capsule" | "Syrup" | "Injection" | "Ointment" | "Drops";
export type UserRole = "PHARMACIST" | "DOCTOR_ADMIN" | "DOCTOR";

export interface MedicineItem {
  id: string;
  name: string;
  genericName?: string;
  manufacturer?: string;
  category: string;
  dosageForm: DosageForm;
  totalStock: number;
  unitPrice: number;
  pricePerTab?: number;
  pricePerStrip?: number;
  tabletsPerStrip?: number;
  expiryDate: string;
  batchNumber: string;
  minStockAlert: number;
  lastUpdated: string;
  hsnCode?: string;
  taxGstPercent?: number;
  scheduleType?: string;
  rackLocation?: string;
  imageUrl?: string;
  providerName?: string;
  providerContact?: string;
}

export const INITIAL_MEDICINES: MedicineItem[] = [
  {
    id: "med-1",
    name: "Paracetamol 500mg",
    genericName: "Paracetamol IP 500mg",
    manufacturer: "Cipla Ltd",
    category: "Analgesic",
    dosageForm: "Tablet",
    totalStock: 250,
    unitPrice: 3.50,
    pricePerTab: 3.50,
    pricePerStrip: 35.00,
    tabletsPerStrip: 10,
    expiryDate: "2027-12-31",
    batchNumber: "PCM-2026-A1",
    minStockAlert: 30,
    lastUpdated: "2026-08-21",
    hsnCode: "30049099",
    taxGstPercent: 12.0,
    scheduleType: "OTC",
    rackLocation: "Rack A-01",
  },
  {
    id: "med-2",
    name: "Amoxicillin 500mg",
    genericName: "Amoxicillin Trihydrate IP 500mg",
    manufacturer: "Sun Pharma",
    category: "Antibiotic",
    dosageForm: "Capsule",
    totalStock: 150,
    unitPrice: 12.00,
    pricePerTab: 12.00,
    pricePerStrip: 120.00,
    tabletsPerStrip: 10,
    expiryDate: "2027-08-15",
    batchNumber: "AMX-2026-B2",
    minStockAlert: 20,
    lastUpdated: "2026-08-21",
    hsnCode: "30041010",
    taxGstPercent: 12.0,
    scheduleType: "Schedule H",
    rackLocation: "Rack B-01",
  },
];

export function InventoryDashboard({
  isDarkTheme,
  onToggleTheme,
}: {
  isDarkTheme?: boolean;
  onToggleTheme?: () => void;
}) {
  const [role, setRole] = useState<UserRole>("PHARMACIST");
  const [internalDark, setInternalDark] = useState(true);
  const { themeId, isFullViewMode, toggleFullViewMode } = useTheme();
  const isDarkMode = themeId !== "light";
  const [activeTab, setActiveTab] = useState<"inventory" | "categories" | "otc_billing" | "dispense" | "doctor_chat" | "alerts" | "analytics" | "profile" | "history">("inventory");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Doctor OPD Communication Chat State
  const [chatMessages, setChatMessages] = useState<CommMessage[]>([]);
  const [chatInputText, setChatInputText] = useState("");
  const [chatPriority, setChatPriority] = useState("NORMAL");
  const [chatPatientName, setChatPatientName] = useState("");
  const [chatRxNumber, setChatRxNumber] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);

  const loadChatMessages = async () => {
    try {
      const data = await listCommMessages();
      setChatMessages(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadChatMessages();
    const interval = setInterval(loadChatMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSendChat = async (presetText?: string) => {
    const textToSend = presetText || chatInputText;
    if (!textToSend.trim()) return;

    setSendingChat(true);
    try {
      const sent = await sendCommMessage({
        message: textToSend.trim(),
        recipient_role: "DOCTOR",
        patient_name: chatPatientName.trim() || undefined,
        prescription_id: chatRxNumber.trim() || undefined,
        priority: chatPriority,
      });

      setChatMessages((prev) => [sent, ...prev]);
      setChatInputText("");
      setChatPatientName("");
      setChatRxNumber("");

      playNotificationSound("chime");
    } catch {
      // ignore
    } finally {
      setSendingChat(false);
    }
  };

  const handleDeleteSingleChat = async (msgId: string) => {
    if (!confirm("Are you sure you want to delete this chat message?")) return;
    try {
      await deleteCommMessage(msgId);
      setChatMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch {
      alert("Failed to delete message.");
    }
  };

  const handleClearAllChats = async () => {
    if (!confirm("⚠️ Are you sure you want to clear ALL chat history for this clinic? This cannot be undone.")) return;
    try {
      await clearCommMessages();
      setChatMessages([]);
    } catch {
      alert("Failed to clear chat history.");
    }
  };

  // Billing History State
  const [billingHistoryList, setBillingHistoryList] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState<"ALL" | "CASH" | "UPI" | "CARD">("ALL");
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadBillingHistory = async (search?: string, mode?: string) => {
    try {
      setLoadingHistory(true);
      const data = await fetchBillingHistory(search, mode);
      setBillingHistoryList(data);
    } catch {
      setBillingHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadBillingHistory(historySearch, historyPaymentFilter);
    }
  }, [activeTab, historyPaymentFilter]);

  // Medical Store Profile State
  const [storeProfile, setStoreProfile] = useState({
    storeName: "Shree Ganesha Medical & Surgical Store",
    pharmacistName: "Pharm. Ramesh Patil (B.Pharm)",
    regNo: "MSPC-102938 / Maharashtra State Pharmacy Council",
    drugLicense: "Form 20B/21B No. MH-AKL-882910",
    gstin: "27AAAAA0000A1Z5",
    phone: "+91 98230 12345",
    email: "pharmacy@prescripto-health.in",
    address: "Shop No. 4, Main Road Market, Near Civil Hospital, Motala, Dist. Buldhana - 443103",
    openingHours: "08:00 AM - 10:00 PM (Mon-Sat)",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Animated Search Suggestions State
  const SEARCH_SUGGESTIONS_PLACEHOLDERS = useMemo(() => [
    "Search Paracetamol 500mg…",
    "Search Amoxicillin Capsules…",
    "Search ORS Electrolyte Powder Pouch…",
    "Search Multivitamin Tonic Syrup…",
    "Search Augmentin 625mg Tablet…",
    "Search Diclofenac Sodium Injection…",
    "Search Clotrimazole Ointment Cream…",
    "Search Ciprofloxacin Eye Drops…",
  ], []);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS_PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [SEARCH_SUGGESTIONS_PLACEHOLDERS]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.genericName && m.genericName.toLowerCase().includes(q)) ||
        m.category.toLowerCase().includes(q) ||
        m.batchNumber.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searchQuery, medicines]);
  // Prescription Desk Sub-Tab State
  const [prescriptionSubTab, setPrescriptionSubTab] = useState<"pending" | "dispensed" | "stats">("pending");

  // Customized GST Rate State (Default 12%)
  const [selectedGstRate, setSelectedGstRate] = useState<number>(12.0);

  const [selectedTheme, setSelectedTheme] = useState<"govblue" | "dark" | "light" | "emerald">("govblue");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedMedForRestock, setSelectedMedForRestock] = useState<MedicineItem | null>(null);

  // Separate Category Management Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([
    "Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops", "Pouch", "Ayurvedic", "Surgical", "Nutraceuticals"
  ]);
  const [newCatName, setNewCatName] = useState("");

  // Branded Tax Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<PharmacyBillResponse | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [manualPatientName, setManualPatientName] = useState("");
  const [manualBillRows, setManualBillRows] = useState<Array<{
    medicine_id: string;
    unit_type: "TAB" | "STRIP";
    quantity: number;
  }>>([
    { medicine_id: "", unit_type: "TAB", quantity: 1 }
  ]);

  // New Medicine Form State
  const [newMed, setNewMed] = useState({
    name: "",
    category: "Analgesic",
    unit: "Tablets",
    dosageForm: "Tablet" as DosageForm,
    totalStock: 100,
    unitPrice: 10.00,
    expiryDate: "2027-12-31",
    batchNumber: "",
    minStockAlert: 20,
  });

  // Restock Form State
  const [restockAmount, setRestockAmount] = useState<number>(50);

  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);

  useEffect(() => {
    const user = getUser();
    if (user) setRole(user.role as any);
  }, []);

  const loadPendingPrescriptions = useCallback(async () => {
    try {
      const res = await listPrescriptions();
      if (res && res.length > 0) {
        setPendingPrescriptions(res);
      } else {
        setPendingPrescriptions([
          {
            id: "rx-demo-101",
            prescription_number: "RX-2026-8810",
            status: "PENDING",
            created_at: new Date().toISOString(),
            diagnosis: "Acute Upper Respiratory Tract Infection",
            patient: {
              id: "p-101",
              name: "Sunita Deshmukh",
              village_location: "Main Market, Motala",
              gender: "FEMALE",
              phone: "+91 98221 00192",
            },
            items: [
              {
                id: "item-1",
                medicine_id: "m-1",
                quantity_prescribed: 10,
                instructions: "Take 1 capsule twice daily after food",
                medicine: { name: "Amoxicillin 500mg Capsule", category: "Capsule" } as any,
              },
              {
                id: "item-2",
                medicine_id: "m-2",
                quantity_prescribed: 6,
                instructions: "1 tablet three times daily",
                medicine: { name: "Paracetamol 500mg Tablet", category: "Tablet" } as any,
              },
            ],
          },
          {
            id: "rx-demo-102",
            prescription_number: "RX-2026-8812",
            status: "PENDING",
            created_at: new Date().toISOString(),
            diagnosis: "Gastroenteritis & Mild Dehydration",
            patient: {
              id: "p-102",
              name: "Rajesh Sharma",
              village_location: "Station Road, Buldhana",
              gender: "MALE",
              phone: "+91 98902 44102",
            },
            items: [
              {
                id: "item-3",
                medicine_id: "m-3",
                quantity_prescribed: 4,
                instructions: "Dissolve 1 sachet in 1 liter clean water",
                medicine: { name: "ORS Electrolyte Powder Pouch", category: "Pouch" } as any,
              },
            ],
          },
          {
            id: "rx-demo-103",
            prescription_number: "RX-2026-8815",
            status: "DISPENSED",
            created_at: new Date().toISOString(),
            diagnosis: "Essential Hypertension Followup",
            patient: {
              id: "p-103",
              name: "Amitabh Verma",
              village_location: "Civil Lines, Motala",
              gender: "MALE",
              phone: "+91 94231 99801",
            },
            items: [
              {
                id: "item-4",
                medicine_id: "m-4",
                quantity_prescribed: 15,
                instructions: "1 tablet daily morning after breakfast",
                medicine: { name: "Amlodipine 5mg Tablet", category: "Tablet" } as any,
              },
            ],
          },
        ] as any);
      }
    } catch {
      setPendingPrescriptions([]);
    }
  }, []);

  const loadStoreInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listMedicines();
      if (res && res.length > 0) {
        const mapped: MedicineItem[] = res.map((m: ApiMedicine) => ({
          id: m.id,
          name: m.name,
          genericName: (m as any).generic_name || m.name,
          manufacturer: (m as any).manufacturer || "Cipla Ltd",
          category: m.category || "General",
          dosageForm: (m.unit as DosageForm) || "Tablet",
          totalStock: m.stock_quantity,
          unitPrice: m.price || 10.0,
          pricePerTab: (m as any).price_per_tab || m.price || 3.50,
          pricePerStrip: (m as any).price_per_strip || (m.price ? m.price * 10 : 35.00),
          tabletsPerStrip: (m as any).tablets_per_strip || 10,
          expiryDate: m.expiry_date || "2027-12-31",
          batchNumber: m.batch_number || "BATCH-01",
          minStockAlert: m.min_stock_alert || 10,
          hsnCode: (m as any).hsn_code || "30049099",
          taxGstPercent: (m as any).tax_gst_percent || 12.0,
          scheduleType: (m as any).schedule_type || "Schedule H",
          rackLocation: (m as any).rack_location || "Rack A-01",
          lastUpdated: new Date().toLocaleDateString(),
        }));
        setMedicines(mapped);
      } else {
        setMedicines([]);
      }
    } catch {
      const token = typeof window !== "undefined" ? localStorage.getItem("prescripto_token") : null;
      if (!token) {
        setMedicines(INITIAL_MEDICINES);
      } else {
        setMedicines([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoreInventory();
    loadPendingPrescriptions();

    // Auto-poll live doctor OPD prescriptions every 4 seconds
    const rxInterval = setInterval(() => {
      loadPendingPrescriptions();
    }, 4000);

    const handleSaved = () => {
      loadStoreInventory();
      loadPendingPrescriptions();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("prescription-saved", handleSaved);
      return () => {
        clearInterval(rxInterval);
        window.removeEventListener("prescription-saved", handleSaved);
      };
    }
  }, [loadStoreInventory, loadPendingPrescriptions]);

  const handleOneClickDispense = async (rx: Prescription) => {
    try {
      const billItems = rx.items.map((item) => {
        const targetMed = medicines.find((m) => m.id === item.medicine_id || m.name.toLowerCase() === (item.medicine?.name || "").toLowerCase());
        const price = targetMed ? (targetMed.pricePerTab || targetMed.unitPrice) : 15.0;
        return {
          medicine_id: item.medicine_id || targetMed?.id || "custom",
          medicine_name: item.medicine?.name || item.instructions || "Prescribed Medicine",
          quantity: item.quantity_prescribed || 1,
          unit_price: price,
          unit_type: "TAB",
          tablets_per_strip: targetMed?.tabletsPerStrip || 10,
        };
      });

      // 1. Generate Branded Pharmacy Bill & Deduct Stock
      const billRes = await generatePharmacyBill({
        prescription_id: rx.id,
        patient_name: rx.patient?.name || "OPD Patient",
        items: billItems,
      });

      // 2. Mark Prescription as DISPENSED (ATTENDED)
      await dispensePrescription(rx.id);

      setSelectedInvoice(billRes);
      setShowInvoiceModal(true);

      await loadStoreInventory();
      await loadPendingPrescriptions();
    } catch (err: any) {
      alert(err.message || "Failed to complete one-click dispense.");
    }
  };

  // Filtered Inventory
  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const matchesSearch =
        med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === "ALL" || med.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [medicines, searchQuery, selectedCategory]);

  const alertMedicines = useMemo(() => {
    return medicines.filter((m) => m.totalStock <= m.minStockAlert);
  }, [medicines]);

  // Metrics
  const totalItems = medicines.length;
  const lowStockCount = medicines.filter((m) => m.totalStock <= m.minStockAlert).length;
  const outOfStockCount = medicines.filter((m) => m.totalStock === 0).length;
  const totalValuation = medicines.reduce((acc, m) => acc + m.totalStock * m.unitPrice, 0);

  // Categories List (combines default + custom + active medicine categories)
  const categories = useMemo(() => {
    const fromMeds = medicines.map((m) => m.category);
    const combined = Array.from(new Set([...customCategories, ...fromMeds])).filter(Boolean);
    return ["ALL", ...combined];
  }, [medicines, customCategories]);

  // Form Handlers
  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name || !newMed.batchNumber) {
      alert("Please fill in medicine name and batch number.");
      return;
    }

    try {
      await apiAddMedicine({
        name: newMed.name,
        category: newMed.category,
        stock_quantity: Number(newMed.totalStock),
        price: Number(newMed.unitPrice),
        expiry_date: newMed.expiryDate,
        batch_number: newMed.batchNumber,
        unit: newMed.dosageForm,
        min_stock_alert: Number(newMed.minStockAlert),
      });

      await loadStoreInventory();
      setShowAddModal(false);
      setNewMed({
        name: "",
        category: "Analgesic",
        unit: "Tablets",
        dosageForm: "Tablet",
        totalStock: 100,
        unitPrice: 10.0,
        expiryDate: "2027-12-31",
        batchNumber: "",
        minStockAlert: 20,
      });
    } catch (err: any) {
      alert(err.message || "Failed to add medicine to database");
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedForRestock || restockAmount <= 0) return;

    try {
      await apiRestockMedicine(selectedMedForRestock.id, restockAmount, "Manual restock from inventory portal");
      await loadStoreInventory();
      setShowRestockModal(false);
      setSelectedMedForRestock(null);
      setRestockAmount(50);
    } catch (err: any) {
      alert(err.message || "Restock failed");
    }
  };

  const openRestockModal = (med: MedicineItem) => {
    setSelectedMedForRestock(med);
    setShowRestockModal(true);
  };

  return (
    <div className={`min-h-screen ux4g-theme-${themeId === "forest" ? "emerald" : themeId === "govblue" ? "govblue" : themeId === "light" ? "light" : "dark"} ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} font-sans transition-colors duration-200`}>
      {/* Header Bar */}
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b px-4 md:px-6 py-3 flex items-center justify-between flex-wrap gap-3 ${isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200"}`}>
        <div className="flex items-center space-x-3">
          {/* Mobile Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-1.5"
          >
            <span>{mobileSidebarOpen ? "✕" : "☰"}</span>
            <span>Menu</span>
          </button>

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-lg shadow-lg shadow-emerald-500/20">
            💊
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
              Medical Store Dashboard
              <span className="ux4g-badge ux4g-badge-gov">PHARMACIST PORTAL</span>
            </h1>
            <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Real-time Prescription Fulfillment &amp; Stock Sync</p>
          </div>
        </div>

        {/* 🔍 Centralized Global Search Bar with Animated Placeholder & Autocomplete Panel */}
        <div className="relative flex-1 max-w-md mx-2 hidden sm:block">
          <div className="relative">
            <input
              type="text"
              placeholder={SEARCH_SUGGESTIONS_PLACEHOLDERS[placeholderIndex]}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className={`w-full pl-9 pr-9 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDarkMode
                  ? "bg-slate-950/90 border-slate-800 text-white focus:border-amber-500 shadow-inner"
                  : "bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500 shadow-inner"
              }`}
            />
            <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Search Suggestions Dropdown Panel */}
          {isSearchFocused && searchSuggestions.length > 0 && (
            <div className={`absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-2xl z-50 overflow-hidden ${
              isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}>
              <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 flex justify-between">
                <span>Search Suggestions ({searchSuggestions.length})</span>
                <span className="text-amber-400">Click to filter inventory</span>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto">
                {searchSuggestions.map((med) => (
                  <div
                    key={med.id}
                    onMouseDown={() => {
                      setSearchQuery(med.name);
                      setActiveTab("inventory");
                      setIsSearchFocused(false);
                    }}
                    className="p-2.5 hover:bg-amber-500/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-amber-400 flex items-center gap-2">
                        <span>{med.name}</span>
                        <span className="ux4g-badge ux4g-badge-saffron" style={{ fontSize: 9 }}>
                          🏷️ {med.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">{med.genericName} · Batch: {med.batchNumber}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-400">₹{med.unitPrice.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400">Stock: {med.totalStock}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={toggleFullViewMode}
            className={`ux4g-btn text-xs ${isFullViewMode ? "ux4g-btn-saffron" : "ux4g-btn-outline"}`}
            style={{ padding: "6px 12px" }}
            title="Toggle 100% Immersive Full View Mode"
          >
            <span>🖥️</span>
            <span className="hidden sm:inline">{isFullViewMode ? "Exit Full View" : "Full View Mode"}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="ux4g-btn ux4g-btn-outline text-xs"
            style={{ padding: "6px 12px" }}
          >
            <span>🏷️ Categories</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="ux4g-btn ux4g-btn-green text-xs"
            style={{ padding: "6px 14px" }}
          >
            <span>+ Add Medicine</span>
          </button>
        </div>
      </header>

      {/* Main Layout Container with Responsive Collapsible Left Navigation Sidebar */}
      <div className="flex min-h-[calc(100vh-70px)] relative">
        {/* 🌟 Responsive & Collapsible Left Navigation Sidebar */}
        <aside
          className={`
            fixed md:sticky top-[57px] z-40 h-[calc(100vh-57px)] border-r flex flex-col justify-between transition-all duration-300 backdrop-blur-xl shrink-0
            ${isDarkMode ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-200"}
            ${sidebarCollapsed ? "w-16 p-2" : "w-64 p-4"}
            ${mobileSidebarOpen ? "left-0 shadow-2xl w-64 p-4" : "-left-64 md:left-0"}
          `}
        >
          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
              {!sidebarCollapsed && <span>Medical Modules</span>}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto"
                title={sidebarCollapsed ? "Expand Sidebar (256px)" : "Collapse Sidebar (64px mini-rail)"}
              >
                <span className="text-xs font-bold">{sidebarCollapsed ? "▶" : "◀ Collapse"}</span>
              </button>
            </div>

            <nav className="space-y-1.5">
              {[
                { id: "inventory", label: "Medicine Inventory", icon: "🧪", count: medicines.length, badgeColor: "ux4g-badge-gov" },
                { id: "categories", label: "Category Manager", icon: "🏷️", count: categories.filter((c) => c !== "ALL").length, badgeColor: "ux4g-badge-saffron" },
                { id: "otc_billing", label: "OTC Billing Desk", icon: "🛒", badgeColor: "ux4g-badge-green" },
                { id: "dispense", label: "Prescription Desk", icon: "📋", count: pendingPrescriptions.length, badgeColor: "ux4g-badge-blue" },
                { id: "doctor_chat", label: "Doctor OPD Chat", icon: "💬", count: chatMessages.length || undefined, badgeColor: "ux4g-badge-saffron" },
                { id: "alerts", label: "Stock & Expiry Alerts", icon: "📦", count: lowStockCount, badgeColor: "ux4g-badge-red" },
                { id: "analytics", label: "Revenue Analytics", icon: "📊", badgeColor: "ux4g-badge-amber" },
                { id: "history", label: "Billing History", icon: "📑", count: billingHistoryList.length || undefined, badgeColor: "ux4g-badge-green" },
                { id: "profile", label: "Store Profile", icon: "🏥", badgeColor: "ux4g-badge-gov" },
              ].map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id as any);
                      setMobileSidebarOpen(false);
                    }}
                    title={sidebarCollapsed ? `${t.label} ${t.count !== undefined ? `(${t.count})` : ""}` : ""}
                    className={`
                      w-full flex items-center ${sidebarCollapsed ? "justify-center p-2.5" : "justify-between p-3"} rounded-xl text-xs font-bold transition-all duration-200
                      ${isActive
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-[1.01]"
                        : isDarkMode
                        ? "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{t.icon}</span>
                      {!sidebarCollapsed && <span>{t.label}</span>}
                    </div>
                    {!sidebarCollapsed && t.count !== undefined && (
                      <span className={`ux4g-badge ${isActive ? "bg-slate-950 text-white" : t.badgeColor}`} style={{ fontSize: 9 }}>
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Info */}
          {!sidebarCollapsed && (
            <div className="p-3 rounded-xl border border-slate-800/60 bg-slate-950/60 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-semibold">Store Status:</span>
                <span className="ux4g-badge ux4g-badge-green">● ONLINE</span>
              </div>
              <div className="text-[10px] text-slate-500">Connected to Hospital MongoDB</div>
            </div>
          )}
        </aside>

        {/* Mobile Backdrop Overlay */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-xs md:hidden"
          />
        )}

        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto space-y-6 overflow-x-hidden min-w-0">
        {/* TAB 1: MEDICINE INVENTORY */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Total Medicines</div>
                <div className={`text-2xl font-black mt-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  <CountUpNumber end={totalItems} />
                </div>
                <div className={`text-[10px] mt-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Active inventory items</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="text-xs font-semibold text-amber-500">Low Stock Alerts</div>
                <div className="text-2xl font-black mt-1 text-amber-500">
                  <CountUpNumber end={lowStockCount} />
                </div>
                <div className="text-[10px] text-amber-600/80 mt-1">Requires restock soon</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="text-xs font-semibold text-rose-500">Out of Stock</div>
                <div className="text-2xl font-black mt-1 text-rose-500">
                  <CountUpNumber end={outOfStockCount} />
                </div>
                <div className="text-[10px] text-rose-600/80 mt-1">Unavailable for prescriptions</div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="text-xs font-semibold text-emerald-600">Total Valuation</div>
                <div className="text-2xl font-black mt-1 text-emerald-600">
                  <CountUpNumber end={totalValuation} prefix="₹" decimals={2} />
                </div>
                <div className="text-[10px] text-emerald-700/80 mt-1">Based on unit price</div>
              </div>
            </div>

            {/* Filter & Search Bar with Category Dropdown */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              <div className="flex-1 relative w-full">
                <input
                  type="text"
                  placeholder="Search by medicine name, generic name, or batch number…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border focus:outline-none transition-all ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500"
                  }`}
                />
                <span className="absolute left-3 top-3 text-slate-500 text-xs">🔍</span>
              </div>

              {/* Sleek Category Dropdown */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs font-extrabold text-slate-400 whitespace-nowrap">Filter Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none transition-all ${
                    isDarkMode
                      ? "bg-slate-950 border-slate-800 text-amber-400 focus:border-amber-500"
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500"
                  }`}
                >
                  <option value="ALL">🏷️ All Categories ({medicines.length})</option>
                  {categories.filter((c) => c !== "ALL").map((cat) => {
                    const cnt = medicines.filter((m) => m.category === cat).length;
                    return (
                      <option key={cat} value={cat}>
                        🏷️ {cat} ({cnt} meds)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            {loading ? (
              <div className={`p-12 text-center text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Loading medicines…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? "bg-slate-950/50 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                    <tr>
                      <th className="p-4">Medicine Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Batch No</th>
                      <th className="p-4">Stock &amp; Level Indicator</th>
                      <th className="p-4">Unit Price</th>
                      <th className="p-4">Expiry Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-slate-800 text-slate-200" : "divide-slate-200 text-slate-800"}`}>
                    {filteredMedicines.map((med) => {
                      const isLow = med.totalStock <= med.minStockAlert;
                      const isOut = med.totalStock === 0;
                      const pct = Math.min(100, Math.max(0, (med.totalStock / 200) * 100));
                      return (
                        <tr key={med.id} className={isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}>
                          <td className="p-4 font-bold">
                            <div>{med.name}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{med.dosageForm}</div>
                          </td>
                          <td className="p-4">{med.category}</td>
                          <td className="p-4 font-mono">{med.batchNumber}</td>
                          <td className="p-4 font-bold">
                            <div className="space-y-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] ${
                                  isOut
                                    ? "bg-rose-950 text-rose-400 border border-rose-800"
                                    : isLow
                                    ? "bg-amber-950 text-amber-400 border border-amber-800"
                                    : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                }`}
                              >
                                {med.totalStock} units
                              </span>
                              {/* Stock Bar Visual Analysis */}
                              <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isOut ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">₹{med.unitPrice.toFixed(2)}</td>
                          <td className="p-4">{med.expiryDate}</td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => openRestockModal(med)}
                              className="px-3 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30 rounded-lg text-[11px] font-bold transition-all"
                            >
                              Restock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )}

        {/* TAB 2: CATEGORY MANAGER */}
        {activeTab === "categories" && (
          <div className={`p-6 rounded-2xl border space-y-5 ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <span>🏷️ Medical Store Category Management</span>
                  <span className="ux4g-badge ux4g-badge-saffron">{categories.filter(c => c !== "ALL").length} CATEGORIES</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Organize shop inventory into dosage-form categories (Tablet, Syrup, Injection, Capsule, Pouch, etc.)</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="ux4g-btn ux4g-btn-green"
              >
                + Add Custom Category
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.filter((c) => c !== "ALL").map((cat) => {
                const medsInCat = medicines.filter((m) => m.category === cat);
                const count = medsInCat.length;
                const totalStockInCat = medsInCat.reduce((acc, m) => acc + m.totalStock, 0);
                return (
                  <div
                    key={cat}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2 hover:border-amber-500/50 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-amber-400 text-sm">🏷️ {cat}</span>
                      <span className="ux4g-badge ux4g-badge-gov">{count} medicines</span>
                    </div>
                    <div className="text-xs text-slate-400">Total Stock: <strong className="text-emerald-400">{totalStockInCat} units</strong></div>
                    <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[11px]">
                      <button
                        type="button"
                        onClick={() => { setSelectedCategory(cat); setActiveTab("inventory"); }}
                        className="text-amber-400 hover:underline font-bold"
                      >
                        View {count} Meds →
                      </button>
                      {count === 0 && (
                        <button
                          type="button"
                          onClick={() => setCustomCategories(customCategories.filter((c) => c !== cat))}
                          className="text-rose-400 hover:text-rose-300 font-bold"
                        >
                          ✕ Delete Category
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: OTC MULTI-ITEM PHARMACY BILLING DESK */}
        {activeTab === "otc_billing" && (
          <div className={`p-6 rounded-2xl border space-y-6 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>🧾 Multi-Item OTC Pharmacy Bill Generator</span>
                  <span className="ux4g-badge ux4g-badge-green">REAL-TIME STOCK SYNC</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Generate branded tax invoices with auto category badges, custom unit rate calculation, and live stock deduction.</p>
              </div>
              <button
                type="button"
                onClick={() => setManualBillRows([...manualBillRows, { medicine_id: "", unit_type: "TAB", quantity: 1 }])}
                className="ux4g-btn ux4g-btn-outline"
              >
                + Add Medicine Line Item
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!manualPatientName) {
                  alert("Please enter patient name.");
                  return;
                }

                const validItems = manualBillRows.filter((r) => r.medicine_id && r.quantity > 0);
                if (validItems.length === 0) {
                  alert("Please select at least one medicine and quantity.");
                  return;
                }

                const itemsPayload = validItems.map((r) => {
                  const med = medicines.find((m) => m.id === r.medicine_id);
                  const unitPrice = r.unit_type === "STRIP"
                    ? (med?.pricePerStrip || (med?.unitPrice || 10) * (med?.tabletsPerStrip || 10))
                    : (med?.pricePerTab || med?.unitPrice || 5);
                  return {
                    medicine_id: r.medicine_id,
                    medicine_name: med?.name || "Medicine",
                    quantity: r.quantity,
                    unit_price: unitPrice,
                    unit_type: r.unit_type,
                    tablets_per_strip: med?.tabletsPerStrip || 10,
                  };
                });

                try {
                  const billRes = await generatePharmacyBill({
                    patient_name: manualPatientName,
                    items: itemsPayload,
                    tax_gst_percent: selectedGstRate,
                  });

                  setSelectedInvoice(billRes);
                  setShowInvoiceModal(true);

                  await loadStoreInventory();
                  setManualPatientName("");
                  setManualBillRows([{ medicine_id: "", unit_type: "TAB", quantity: 1 }]);
                } catch (err: any) {
                  alert(err.message || "Failed to generate bill.");
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Patient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter patient full name (e.g. Sunita Deshmukh)"
                    value={manualPatientName}
                    onChange={(e) => setManualPatientName(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 font-bold ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Custom Tax Rate (GST) *</label>
                  <select
                    value={selectedGstRate}
                    onChange={(e) => setSelectedGstRate(Number(e.target.value))}
                    className={`w-full border rounded-xl p-2.5 font-bold ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value={12.0}>Standard 12% GST (6% CGST + 6% SGST)</option>
                    <option value={5.0}>5% GST (2.5% CGST + 2.5% SGST)</option>
                    <option value={18.0}>18% GST (9% CGST + 9% SGST)</option>
                    <option value={0.0}>0% Exempt Tax</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {manualBillRows.map((row, idx) => {
                  const selectedMed = medicines.find((m) => m.id === row.medicine_id);
                  const pricePerTab = selectedMed?.pricePerTab || selectedMed?.unitPrice || 5;
                  const pricePerStrip = selectedMed?.pricePerStrip || (pricePerTab * (selectedMed?.tabletsPerStrip || 10));
                  const effectiveRate = row.unit_type === "STRIP" ? pricePerStrip : pricePerTab;
                  const lineSubtotal = (row.quantity || 1) * effectiveRate;

                  return (
                    <div key={idx} className={`p-3 rounded-xl border space-y-2 ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-300"}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-400">Line Item #{idx + 1}</span>
                        {manualBillRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setManualBillRows(manualBillRows.filter((_, i) => i !== idx))}
                            className="text-rose-400 hover:text-rose-300 font-bold"
                          >
                            ✕ Remove Line
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-semibold mb-1 text-[10px] text-slate-400">Select Medicine *</label>
                          <select
                            value={row.medicine_id}
                            onChange={(e) => {
                              const medId = e.target.value;
                              const selectedMed = medicines.find((m) => m.id === medId);
                              const isSinglePackCat = selectedMed && ["Syrup", "Injection", "Ointment", "Drops", "Pouch"].includes(selectedMed.category);
                              const autoUnit = isSinglePackCat ? "STRIP" : "TAB";

                              const next = [...manualBillRows];
                              next[idx].medicine_id = medId;
                              next[idx].unit_type = autoUnit;

                              // Auto-add next blank line item if this is the last row
                              if (medId && idx === manualBillRows.length - 1) {
                                next.push({ medicine_id: "", unit_type: "TAB", quantity: 1 });
                              }

                              setManualBillRows(next);
                            }}
                            required
                            className={`w-full border rounded-xl p-2 font-semibold ${
                              isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
                            }`}
                          >
                            <option value="">-- Select Medicine --</option>
                            {medicines.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.category}) - Tab: ₹{m.pricePerTab || m.unitPrice} | Strip: ₹{m.pricePerStrip || (m.unitPrice * 10)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 font-semibold mb-1 text-[10px]">Billing Unit Mode *</label>
                          <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 border border-slate-800 rounded-xl">
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...manualBillRows];
                                next[idx].unit_type = "TAB";
                                setManualBillRows(next);
                              }}
                              className={`py-1 rounded-lg font-bold text-[10px] ${
                                row.unit_type === "TAB" ? "bg-amber-500 text-slate-950" : "text-slate-400"
                              }`}
                            >
                              💊 Single Tab
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...manualBillRows];
                                next[idx].unit_type = "STRIP";
                                setManualBillRows(next);
                              }}
                              className={`py-1 rounded-lg font-bold text-[10px] ${
                                row.unit_type === "STRIP" ? "bg-amber-500 text-slate-950" : "text-slate-400"
                              }`}
                            >
                              📦 Full Strip
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 font-semibold mb-1 text-[10px]">Quantity *</label>
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) => {
                              const next = [...manualBillRows];
                              next[idx].quantity = Number(e.target.value);
                              setManualBillRows(next);
                            }}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-bold"
                          />
                        </div>
                      </div>

                      {selectedMed && (
                        <div className="flex justify-between items-center text-[11px] pt-1 text-slate-400 border-t border-slate-800/60 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="ux4g-badge ux4g-badge-saffron" style={{ fontSize: 10 }}>
                              🏷️ Category: {selectedMed.category}
                            </span>
                            <span className={`font-bold ${selectedMed.totalStock > 10 ? "text-emerald-400" : "text-amber-400"}`}>
                              📦 Stock in DB: {selectedMed.totalStock} units
                            </span>
                            <button
                              type="button"
                              onClick={() => openRestockModal(selectedMed)}
                              className="text-[10px] text-teal-400 underline hover:text-teal-300 ml-1 font-bold"
                            >
                              ✏️ Adjust Stock
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span>HSN: {selectedMed.hsnCode || "30049099"} · Batch: {selectedMed.batchNumber}</span>
                            <span className="font-black text-emerald-400 text-xs">Line Amount: ₹{lineSubtotal.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setManualBillRows([...manualBillRows, { medicine_id: "", unit_type: "TAB", quantity: 1 }])}
                  className="ux4g-btn ux4g-btn-outline text-[11px]"
                >
                  + Add Another Medicine Line Item
                </button>

                <button type="submit" className="ux4g-btn ux4g-btn-green" style={{ padding: "8px 20px" }}>
                  🧾 Generate Multi-Item Tax Invoice &amp; Deduct Stock
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB: DOCTOR OPD COMMUNICATION CHAT DESK */}
        {activeTab === "doctor_chat" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💬</span>
                  <h2 className="text-lg font-black tracking-tight" style={{ color: isDarkMode ? "#ffffff" : "#0f172a" }}>
                    Doctor OPD &amp; Pharmacy Communication Desk
                  </h2>
                  <span className="ux4g-badge ux4g-badge-gov">REALTIME WEBSOCKET SYNC</span>
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Direct 2-way real-time messaging, drug availability inquiries, and prescription verification with Hospital Doctors.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setChatInputText("");
                    setChatPatientName("");
                    setChatRxNumber("");
                    setChatPriority("NORMAL");
                  }}
                  className="ux4g-btn ux4g-btn-saffron text-xs"
                >
                  ✨ Start Fresh Thread
                </button>
                <button
                  type="button"
                  onClick={handleClearAllChats}
                  className="ux4g-btn ux4g-btn-red text-xs"
                >
                  🧹 Clear Chat History
                </button>
                <button type="button" onClick={loadChatMessages} className="ux4g-btn ux4g-btn-outline text-xs">
                  🔄 Sync Messages
                </button>
              </div>
            </div>

            {/* Presets Bar */}
            <div className="flex gap-2 flex-wrap">
              {[
                "✅ Paracetamol 650mg is available in Medical Store stock",
                "⚠️ Amoxicillin Capsules out of stock — Substitute recommended",
                "📜 Please confirm dosage instructions for Rx #",
                "🚨 Emergency ICU Medicine Prepared & Ready for Pickup",
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendChat(p)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold hover:scale-[1.02] transition-transform ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-slate-100 border-slate-200 text-slate-800"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Chat Thread Box */}
            <div
              className={`rounded-2xl border p-4 flex flex-col justify-between space-y-4 min-h-[420px] ${
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px] pr-2">
                {chatMessages.length === 0 ? (
                  <div className="p-12 text-center text-xs font-bold text-slate-400">
                    No previous chat messages with Hospital Doctors. Send a message below to start 2-way communication!
                  </div>
                ) : (
                  chatMessages.slice().reverse().map((m) => {
                    const isPharmacistMsg = m.sender_role === "PHARMACIST";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isPharmacistMsg ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 shadow-sm ${
                            isPharmacistMsg
                              ? "bg-amber-500 text-slate-950 font-semibold rounded-tr-none"
                              : "bg-slate-800 text-white rounded-tl-none border border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 text-[10px] font-black opacity-90 border-b border-black/10 pb-1">
                            <span>{m.sender_name} ({m.sender_role})</span>
                            <span>{new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>

                          {m.patient_name && (
                            <div className="text-[10px] font-bold bg-black/20 px-2 py-0.5 rounded-md inline-block">
                              👤 Patient: {m.patient_name} {m.prescription_id ? `· Rx: ${m.prescription_id}` : ""}
                            </div>
                          )}

                          <div className="font-bold text-xs leading-relaxed">
                            {m.message}
                          </div>

                          <div className="pt-1 flex items-center justify-between gap-4 border-t border-black/10">
                            <button
                              type="button"
                              onClick={() => handleDeleteSingleChat(m.id)}
                              className="text-[10px] font-extrabold opacity-75 hover:opacity-100 hover:underline text-rose-300 flex items-center gap-1"
                              title="Delete message"
                            >
                              <span>🗑️ Delete</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setChatInputText(`Re: ${m.message}`);
                                if (m.patient_name) setChatPatientName(m.patient_name);
                                if (m.prescription_id) setChatRxNumber(m.prescription_id);
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
              </div>

              {/* Composer */}
              <div className="pt-3 border-t space-y-2 border-slate-800">
                <div className="flex gap-2 flex-wrap text-xs">
                  <input
                    type="text"
                    placeholder="Patient Name (Optional)"
                    value={chatPatientName}
                    onChange={(e) => setChatPatientName(e.target.value)}
                    className={`ux4g-input flex-1 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`}
                    style={{ fontSize: 11, padding: "6px 10px" }}
                  />
                  <input
                    type="text"
                    placeholder="Rx # (Optional)"
                    value={chatRxNumber}
                    onChange={(e) => setChatRxNumber(e.target.value)}
                    className={`ux4g-input w-32 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`}
                    style={{ fontSize: 11, padding: "6px 10px" }}
                  />
                  <select
                    value={chatPriority}
                    onChange={(e) => setChatPriority(e.target.value)}
                    className={`ux4g-input w-32 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`}
                    style={{ fontSize: 11, padding: "6px 10px" }}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">⚠️ Urgent</option>
                    <option value="EMERGENCY">🚨 Emergency</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type message to Hospital Doctor OPD…"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    className={`ux4g-input flex-1 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`}
                    style={{ fontSize: 12, padding: "8px 12px" }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSendChat()}
                    disabled={sendingChat || !chatInputText.trim()}
                    className="ux4g-btn ux4g-btn-saffron px-6"
                  >
                    {sendingChat ? "Sending…" : "✉️ Send Message"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LOW STOCK ALERTS */}
        {activeTab === "alerts" && (
          <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <h3 className="text-sm font-extrabold mb-4 text-amber-500">📦 Low Stock &amp; Restock Alerts ({alertMedicines.length})</h3>
            {alertMedicines.length === 0 ? (
              <p className="text-xs text-slate-400">All medicine stocks are healthy!</p>
            ) : (
              <div className="space-y-3">
                {alertMedicines.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl border border-amber-800/40 bg-amber-950/20 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-amber-300">{m.name}</div>
                      <div className="text-[11px] text-slate-400">Batch: {m.batchNumber} · Current Stock: {m.totalStock} units</div>
                    </div>
                    <button onClick={() => openRestockModal(m)} className="ux4g-btn ux4g-btn-saffron" style={{ padding: "4px 10px", fontSize: 11 }}>
                      + Restock Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MODERN SUB-TABBED PRESCRIPTION DESK & OPD QUEUE */}
        {activeTab === "dispense" && (
          <div className={`p-6 rounded-2xl border space-y-6 ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            {/* Header & Sub-Tab Navigation Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <span>📋 Prescription Desk &amp; Hospital OPD Queue</span>
                  <span className="ux4g-badge ux4g-badge-green">REAL-TIME LINKED QUEUE</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Dispense prescriptions issued by hospital doctors with one click and auto-deduct stock.</p>
              </div>

              {/* Sub-Tabs Selector */}
              <div className="flex gap-2">
                {[
                  {
                    id: "pending",
                    label: "⚡ Pending Queue",
                    count: pendingPrescriptions.filter(r => r.status === "PENDING").length,
                    badgeColor: "bg-amber-500 text-slate-950 font-black animate-pulse"
                  },
                  {
                    id: "dispensed",
                    label: "✅ Dispensed",
                    count: pendingPrescriptions.filter(r => r.status === "DISPENSED").length,
                    badgeColor: "ux4g-badge-green"
                  },
                  { id: "stats", label: "📊 Queue Metrics" }
                ].map((st) => {
                  const isSubActive = prescriptionSubTab === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setPrescriptionSubTab(st.id as any)}
                      className={`ux4g-btn transition-all text-xs ${
                        isSubActive ? "ux4g-btn-primary scale-[1.02] shadow-md" : "ux4g-btn-outline opacity-80"
                      }`}
                      style={{ padding: "6px 14px" }}
                    >
                      <span>{st.label}</span>
                      {st.count !== undefined && (
                        <span className={`ux4g-badge ${st.badgeColor}`} style={{ marginLeft: 6, fontSize: 9 }}>
                          {st.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SUB-TAB 1: PENDING PRESCRIPTIONS QUEUE */}
            {prescriptionSubTab === "pending" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <h4 className="font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <span>⚡ Action Required: Pending Hospital Prescriptions ({pendingPrescriptions.filter(r => r.status === "PENDING").length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Click One-Click Dispense to deduct stock &amp; print tax invoice</span>
                </div>

                {pendingPrescriptions.filter(r => r.status === "PENDING").length === 0 ? (
                  <div className={`p-8 text-center text-xs rounded-xl border border-dashed ${isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-300 text-slate-500 bg-slate-50"}`}>
                    <div className="text-2xl mb-1">🎉</div>
                    <div className="font-bold text-slate-400">All OPD Prescriptions are fully attended and dispensed!</div>
                    <div className="text-[11px] text-slate-500 mt-1">New OPD prescriptions issued by hospital doctors will appear here automatically.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingPrescriptions.filter(r => r.status === "PENDING").map((rx) => (
                      <div
                        key={rx.id}
                        className={`p-4 rounded-xl border space-y-3.5 text-xs transition-all hover:border-amber-500 ${
                          isDarkMode ? "bg-slate-950 border-amber-900/60 text-white" : "bg-amber-50/50 border-amber-300 text-slate-900"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-black text-amber-500 flex items-center gap-2">
                              <span>{rx.prescription_number}</span>
                              <span className="ux4g-badge ux4g-badge-saffron" style={{ fontSize: 9 }}>PENDING</span>
                            </div>
                            <div className="font-bold text-sm mt-1">{rx.patient?.name || "Sunita Deshmukh"}</div>
                            <div className="text-[11px] text-slate-400 font-semibold">
                              {(rx.patient as any)?.age_formatted || (rx.patient?.gender ? `${rx.patient.gender}, OPD` : "OPD Patient")} · {rx.patient?.village_location || "Motala"}
                            </div>
                            <div className="text-[11px] text-teal-400 font-bold mt-0.5">Diagnosis: {rx.diagnosis}</div>
                          </div>
                        </div>

                        {/* Prescribed Items Table Summary */}
                        <div className={`p-3 rounded-lg border space-y-1.5 ${isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"}`}>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prescribed Medications:</div>
                          {rx.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[11px] font-semibold border-b border-slate-800/40 pb-1 last:border-none">
                              <span className="flex items-center gap-1.5">
                                <span>💊</span> {item.medicine?.name || item.instructions || "Medicine"} ({item.dosage})
                              </span>
                              <span className="font-extrabold text-amber-400">{item.quantity_prescribed} units</span>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOneClickDispense(rx)}
                          className="ux4g-btn ux4g-btn-green w-full justify-center shadow-lg"
                          style={{ padding: "8px 14px", fontSize: 12 }}
                        >
                          ⚡ One-Click Dispense &amp; Generate Tax Invoice
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 2: DISPENSED & FULFILLED QUEUE */}
            {prescriptionSubTab === "dispensed" && (
              <div className="space-y-4">
                <h4 className="font-extrabold text-emerald-400 text-xs uppercase tracking-wider">
                  ✅ History of Fulfilled &amp; Dispensed Prescriptions ({pendingPrescriptions.filter(r => r.status === "DISPENSED").length})
                </h4>

                {pendingPrescriptions.filter(r => r.status === "DISPENSED").length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No dispensed prescriptions history found yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingPrescriptions.filter(r => r.status === "DISPENSED").map((rx) => (
                      <div
                        key={rx.id}
                        className={`p-4 rounded-xl border space-y-3 text-xs ${
                          isDarkMode ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-300 text-slate-900"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-black text-emerald-400">{rx.prescription_number}</div>
                            <div className="font-bold text-white mt-0.5">{rx.patient?.name || "Amitabh Verma"}</div>
                            <div className="text-[10px] text-slate-400">Diagnosis: {rx.diagnosis}</div>
                          </div>
                          <span className="ux4g-badge ux4g-badge-green">FULFILLED</span>
                        </div>

                        <div className={`p-2.5 rounded-lg border space-y-1 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                          {rx.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[11px]">
                              <span>💊 {item.medicine?.name || item.instructions || "Medicine"}</span>
                              <span className="font-bold text-emerald-400">{item.quantity_prescribed} units</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 3: QUEUE METRICS */}
            {prescriptionSubTab === "stats" && (
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-950 space-y-4 text-xs">
                <h4 className="font-extrabold text-amber-400">📊 OPD Prescription Queue Metrics &amp; Performance</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900">
                    <div className="text-slate-400 text-[10px]">Total Prescriptions Issued</div>
                    <div className="text-xl font-black text-white mt-1">{pendingPrescriptions.length}</div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900">
                    <div className="text-slate-400 text-[10px]">Pending (Action Required)</div>
                    <div className="text-xl font-black text-amber-400 mt-1">{pendingPrescriptions.filter(r => r.status === "PENDING").length}</div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900">
                    <div className="text-slate-400 text-[10px]">Dispensed (Fulfilled)</div>
                    <div className="text-xl font-black text-emerald-400 mt-1">{pendingPrescriptions.filter(r => r.status === "DISPENSED").length}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MODERN REVENUE & FINANCIAL ANALYTICS DASHBOARD */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Header & Filter Strip */}
            <div className={`p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <span>📊 Medical Store Revenue &amp; Financial Analytics</span>
                  <span className="ux4g-badge ux4g-badge-gov">LIVE FINANCIAL SYNC</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Real-time breakdown of OTC sales, OPD prescriptions fulfillment, stock asset valuation, and revenue metrics.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Filter Period:</span>
                <select className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`}>
                  <option>📅 This Month (August 2026)</option>
                  <option>📅 Last 30 Days</option>
                  <option>📅 This Quarter (Q3)</option>
                  <option>📅 Financial Year 2026-27</option>
                </select>
              </div>
            </div>

            {/* 4 Core Financial KPI Metric Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tile 1: Total Gross Sales */}
              <div className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] ${isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Total Pharmacy Sales</span>
                  <span className="ux4g-badge ux4g-badge-green">+14.2% vs last month</span>
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-2">
                  ₹{medicines.reduce((acc, m) => acc + (m.unitPrice * (100 - m.totalStock > 0 ? 100 - m.totalStock : 15)), 48250).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Includes OTC &amp; OPD Prescription Bills</div>
              </div>

              {/* Tile 2: Inventory Asset Value */}
              <div className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] ${isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Store Inventory Worth</span>
                  <span className="ux4g-badge ux4g-badge-gov">ASSET VALUE</span>
                </div>
                <div className="text-2xl font-black text-amber-400 mt-2">
                  ₹{medicines.reduce((acc, m) => acc + (m.totalStock * m.unitPrice), 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Total physical stock in MongoDB</div>
              </div>

              {/* Tile 3: Total Tax Invoices Issued */}
              <div className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] ${isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Bills Generated</span>
                  <span className="ux4g-badge ux4g-badge-saffron">124 BILLS</span>
                </div>
                <div className="text-2xl font-black text-teal-400 mt-2">124 Bills</div>
                <div className="text-[11px] text-slate-400 mt-1">100% Tax Compliant GST Invoices</div>
              </div>

              {/* Tile 4: Average Ticket Size */}
              <div className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] ${isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Avg Bill Value (ABV)</span>
                  <span className="ux4g-badge ux4g-badge-blue">₹389.11 / BILL</span>
                </div>
                <div className="text-2xl font-black text-indigo-400 mt-2">₹389.11</div>
                <div className="text-[11px] text-slate-400 mt-1">Avg transaction ticket size</div>
              </div>
            </div>

            {/* Middle Section: Weekly Revenue Bar Chart & Payment Method Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weekly Sales Performance Bar Chart */}
              <div className={`lg:col-span-2 p-6 rounded-2xl border space-y-4 ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-extrabold flex items-center gap-2">
                      <span>📈 Weekly Pharmacy Revenue Performance</span>
                      <span className="text-xs text-amber-400 font-normal">Last 7 Days</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">Daily sales breakdown across OTC billing &amp; prescription fulfillment</p>
                  </div>
                  <span className="ux4g-badge ux4g-badge-green">PEAK: SAT (₹11.4k)</span>
                </div>

                {/* SVG Visual Bar Graph Chart */}
                <div className="pt-4 space-y-2">
                  <div className="h-44 flex items-end justify-between gap-3 px-2">
                    {[
                      { day: "Mon", rev: 4200, height: "35%", color: "from-teal-600 to-emerald-500" },
                      { day: "Tue", rev: 6100, height: "52%", color: "from-teal-600 to-emerald-500" },
                      { day: "Wed", rev: 8400, height: "72%", color: "from-amber-600 to-amber-500" },
                      { day: "Thu", rev: 5900, height: "50%", color: "from-teal-600 to-emerald-500" },
                      { day: "Fri", rev: 9200, height: "80%", color: "from-amber-600 to-amber-500" },
                      { day: "Sat", rev: 11400, height: "100%", color: "from-emerald-500 to-teal-400" },
                      { day: "Sun", rev: 3050, height: "26%", color: "from-teal-700 to-emerald-600" },
                    ].map((bar) => (
                      <div key={bar.day} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                        {/* Tooltip on Hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-1 bg-slate-950 text-amber-400 font-extrabold text-[10px] rounded-lg border border-slate-700 pointer-events-none z-10 whitespace-nowrap shadow-xl">
                          ₹{bar.rev.toLocaleString("en-IN")}
                        </div>
                        <div className="w-full bg-slate-800/60 rounded-t-xl overflow-hidden h-36 flex items-end p-1">
                          <div
                            className={`w-full rounded-t-lg bg-gradient-to-t ${bar.color} transition-all duration-500 group-hover:brightness-125`}
                            style={{ height: bar.height }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Methods & Queue Attended Gauge */}
              <div className={`p-6 rounded-2xl border space-y-5 ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                <h4 className="text-sm font-extrabold border-b border-slate-800 pb-3 flex items-center justify-between">
                  <span>💳 Payment Modes &amp; Queue</span>
                  <span className="ux4g-badge ux4g-badge-blue">COLLECTION</span>
                </h4>

                {/* OPD Prescriptions Attended Rate Gauge */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-300">OPD Rx Fulfillment Rate:</span>
                    <span className="font-black text-emerald-400">
                      {pendingPrescriptions.length > 0
                        ? `${Math.round((pendingPrescriptions.filter(r => r.status === "DISPENSED").length / pendingPrescriptions.length) * 100)}% Attended`
                        : "100% Attended"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          pendingPrescriptions.length > 0
                            ? Math.round((pendingPrescriptions.filter(r => r.status === "DISPENSED").length / pendingPrescriptions.length) * 100)
                            : 100
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold pt-1">
                    <span>Total Rx: {pendingPrescriptions.length}</span>
                    <span>Dispensed: {pendingPrescriptions.filter(r => r.status === "DISPENSED").length}</span>
                    <span>Pending: {pendingPrescriptions.filter(r => r.status === "PENDING").length}</span>
                  </div>
                </div>

                {/* Payment Methods Distribution */}
                <div className="space-y-3 pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Revenue by Payment Channel</div>
                  
                  {/* UPI / QR Code */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <span>📱</span> UPI / PhonePe / GPay (68%)
                      </span>
                      <span className="font-bold text-emerald-400">₹32,810.00</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: "68%" }} />
                    </div>
                  </div>

                  {/* Cash */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <span>💵</span> Cash Collections (24%)
                      </span>
                      <span className="font-bold text-amber-400">₹11,580.00</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: "24%" }} />
                    </div>
                  </div>

                  {/* Card / POS */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <span>💳</span> POS Card Terminal (8%)
                      </span>
                      <span className="font-bold text-teal-400">₹3,860.00</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full" style={{ width: "8%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Category-wise Revenue Valuation Breakdown */}
            <div className={`p-6 rounded-2xl border space-y-4 ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-extrabold flex items-center gap-2">
                    <span>🏷️ Inventory Valuation &amp; Sales Share by Category</span>
                    <span className="ux4g-badge ux4g-badge-saffron">7 FORM CATEGORIES</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Detailed inventory worth and stock levels organized by medicine form factor.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.filter(c => c !== "ALL").map((cat) => {
                  const catMeds = medicines.filter(m => m.category === cat);
                  const catStock = catMeds.reduce((acc, m) => acc + m.totalStock, 0);
                  const catValuation = catMeds.reduce((acc, m) => acc + (m.totalStock * m.unitPrice), 0);
                  const totalValuation = medicines.reduce((acc, m) => acc + (m.totalStock * m.unitPrice), 1);
                  const sharePct = Math.min(100, Math.round((catValuation / totalValuation) * 100));

                  return (
                    <div key={cat} className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/70 space-y-3 hover:border-amber-500/50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="font-extrabold text-amber-400 text-xs flex items-center gap-2">
                          <span>🏷️ {cat}</span>
                          <span className="ux4g-badge ux4g-badge-gov" style={{ fontSize: 9 }}>
                            {catMeds.length} MEDS
                          </span>
                        </div>
                        <span className="text-[11px] font-black text-emerald-400">
                          ₹{catValuation.toFixed(2)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Stock Level: <strong className="text-white">{catStock} units</strong></span>
                          <span>Inventory Share: <strong className="text-amber-400">{sharePct}%</strong></span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(8, sharePct)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: DEDICATED MEDICAL STORE & PHARMACIST PROFILE */}
        {activeTab === "profile" && (
          <div className={`p-6 rounded-2xl border space-y-6 ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <span>🏥 Medical Store &amp; Pharmacist Registration Profile</span>
                  <span className="ux4g-badge ux4g-badge-green">VERIFIED LICENSE</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Official Drug License (Form 20B/21B), GSTIN Details, and Invoice Branding Profile</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className={`ux4g-btn text-xs ${isEditingProfile ? "ux4g-btn-saffron" : "ux4g-btn-outline"}`}
              >
                <span>{isEditingProfile ? "✕ Cancel Editing" : "✏️ Edit Profile"}</span>
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/80 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Medical Store Name</label>
                  <div className="text-sm font-black text-amber-400 mt-0.5">{storeProfile.storeName}</div>
                </div>
                <div>
                  <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Registered Pharmacist &amp; Degree</label>
                  <div className="font-bold text-white mt-0.5">{storeProfile.pharmacistName}</div>
                </div>
                <div>
                  <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">State Pharmacy Council Reg No.</label>
                  <div className="font-mono text-emerald-400 mt-0.5">{storeProfile.regNo}</div>
                </div>
                <div>
                  <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Store Opening Hours</label>
                  <div className="font-semibold text-slate-300 mt-0.5">{storeProfile.openingHours}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Drug License No. (Form 20B / 21B)</label>
                  <div className="font-mono font-bold text-amber-400 mt-0.5">{storeProfile.drugLicense}</div>
                </div>
                <div>
                  <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">GSTIN Registration No.</label>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">{storeProfile.gstin}</div>
                </div>
                <div>
                  <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Contact Phone &amp; Email</label>
                  <div className="font-semibold text-slate-300 mt-0.5">{storeProfile.phone} · {storeProfile.email}</div>
                </div>
                <div>
                  <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Store Physical Address</label>
                  <div className="font-semibold text-slate-300 mt-0.5">{storeProfile.address}</div>
                </div>
              </div>
            </div>

            {/* Editable Profile Form */}
            {isEditingProfile && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsEditingProfile(false);
                  alert("Medical Store Profile updated successfully!");
                }}
                className="p-5 rounded-xl border border-amber-900/50 bg-slate-950 space-y-4 text-xs"
              >
                <h4 className="font-extrabold text-amber-400 text-xs border-b border-slate-800 pb-2">✏️ Edit Medical Store Information</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Medical Store Name</label>
                    <input
                      type="text"
                      value={storeProfile.storeName}
                      onChange={(e) => setStoreProfile({ ...storeProfile, storeName: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Registered Pharmacist Name</label>
                    <input
                      type="text"
                      value={storeProfile.pharmacistName}
                      onChange={(e) => setStoreProfile({ ...storeProfile, pharmacistName: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Drug License No. (Form 20B/21B)</label>
                    <input
                      type="text"
                      value={storeProfile.drugLicense}
                      onChange={(e) => setStoreProfile({ ...storeProfile, drugLicense: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">GSTIN Registration No.</label>
                    <input
                      type="text"
                      value={storeProfile.gstin}
                      onChange={(e) => setStoreProfile({ ...storeProfile, gstin: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={storeProfile.phone}
                      onChange={(e) => setStoreProfile({ ...storeProfile, phone: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={storeProfile.email}
                      onChange={(e) => setStoreProfile({ ...storeProfile, email: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Store Physical Address</label>
                  <textarea
                    rows={2}
                    value={storeProfile.address}
                    onChange={(e) => setStoreProfile({ ...storeProfile, address: e.target.value })}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 text-slate-400 font-bold"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="ux4g-btn ux4g-btn-green" style={{ padding: "8px 20px" }}>
                    💾 Save Profile Changes
                  </button>
                </div>
              </form>
            )}

            {/* Live Invoice Header Preview */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
              <h4 className="font-extrabold text-amber-400 text-xs flex items-center justify-between">
                <span>🧾 Tax Invoice Header Preview (Printed on Customer Bills)</span>
                <span className="ux4g-badge ux4g-badge-gov">LIVE PREVIEW</span>
              </h4>
              <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-white text-xs space-y-1">
                <div className="text-sm font-black text-amber-300">{storeProfile.storeName}</div>
                <div className="text-[11px] text-emerald-200">{storeProfile.address}</div>
                <div className="text-[10px] text-slate-300 font-mono flex gap-4 pt-1">
                  <span>DL: {storeProfile.drugLicense}</span>
                  <span>GSTIN: {storeProfile.gstin}</span>
                  <span>Ph: {storeProfile.phone}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: BILLING HISTORY & INVOICES LOG */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Header & Filter Controls Bar */}
            <div className={`p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <span>📑 Medical Store Billing History &amp; Invoices Log</span>
                  <span className="ux4g-badge ux4g-badge-green">LIVE MONGODB SYNC</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Audit, search, view itemized breakdowns, and re-print tax invoices for both OPD Doctor prescriptions and manual OTC counter sales.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search by Bill No or Patient Name..."
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    loadBillingHistory(e.target.value, historyPaymentFilter);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />

                <div className="flex gap-1 bg-slate-950 p-1 border border-slate-800 rounded-xl text-xs">
                  {["ALL", "CASH", "UPI", "CARD"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setHistoryPaymentFilter(m as any)}
                      className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] ${
                        historyPaymentFilter === m ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {m === "ALL" ? "All Modes" : m === "UPI" ? "📱 UPI" : m === "CASH" ? "💵 Cash" : "💳 Card"}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => loadBillingHistory(historySearch, historyPaymentFilter)}
                  className="ux4g-btn ux4g-btn-outline text-xs"
                  style={{ padding: "6px 12px" }}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="text-xs text-slate-400 font-medium">Total Invoices Generated</div>
                <div className="text-2xl font-black text-amber-400 mt-1">{billingHistoryList.length}</div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="text-xs text-slate-400 font-medium">Total Billed Revenue</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  ₹{billingHistoryList.reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0).toFixed(2)}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="text-xs text-slate-400 font-medium">Average Bill Value (ABV)</div>
                <div className="text-2xl font-black text-teal-400 mt-1">
                  ₹{(billingHistoryList.length ? billingHistoryList.reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0) / billingHistoryList.length : 0).toFixed(2)}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="text-xs text-slate-400 font-medium">Doctor Rx vs Counter Ratio</div>
                <div className="text-sm font-black text-indigo-400 mt-2">
                  {billingHistoryList.filter(b => b.prescription_id || b.bill_type === "OPD Doctor Rx").length} Rx / {billingHistoryList.filter(b => !b.prescription_id && b.bill_type !== "OPD Doctor Rx").length} OTC
                </div>
              </div>
            </div>

            {/* Invoices History Table */}
            <div className={`p-6 rounded-2xl border space-y-4 ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
              <h4 className="font-extrabold text-amber-400 text-xs uppercase tracking-wider">
                🧾 All Generated Pharmacy Bills Log ({billingHistoryList.length} records)
              </h4>

              {loadingHistory ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading billing history from MongoDB...</div>
              ) : billingHistoryList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No generated bills found for the selected search filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[10px] font-black uppercase ${isDarkMode ? "border-slate-800 text-slate-400" : "border-slate-300 text-slate-600"}`}>
                        <th className="py-3 px-3">Bill Ref No &amp; Date</th>
                        <th className="py-3 px-3">Type &amp; Source</th>
                        <th className="py-3 px-3">Patient Name</th>
                        <th className="py-3 px-3">Billed Items Summary</th>
                        <th className="py-3 px-3 text-center">Payment Mode</th>
                        <th className="py-3 px-3 text-right">Tax GST (₹)</th>
                        <th className="py-3 px-3 text-right">Grand Total (₹)</th>
                        <th className="py-3 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {billingHistoryList.map((bill) => {
                        const isRx = bill.prescription_id || bill.bill_type === "OPD Doctor Rx";
                        const gstTotal = (Number(bill.cgst_amount) || 0) + (Number(bill.sgst_amount) || 0);

                        return (
                          <tr key={bill.bill_id || bill.bill_number} className="hover:bg-slate-800/20 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-black text-amber-400">{bill.bill_number}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(bill.created_at).toLocaleDateString()} {new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {isRx ? (
                                <span className="ux4g-badge ux4g-badge-blue" style={{ fontSize: 9 }}>📋 OPD Doctor Rx</span>
                              ) : (
                                <span className="ux4g-badge ux4g-badge-saffron" style={{ fontSize: 9 }}>🛒 OTC Counter Sale</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-white">{bill.patient_name}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-[11px] font-semibold text-slate-300">
                                {bill.items?.map((i: any) => i.medicine_name).slice(0, 2).join(", ")}
                                {bill.items?.length > 2 ? ` (+${bill.items.length - 2} more)` : ""}
                              </div>
                              <div className="text-[10px] text-slate-400">{bill.items?.length || 0} line item(s)</div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="ux4g-badge ux4g-badge-green" style={{ fontSize: 9 }}>
                                {bill.payment_mode === "UPI" ? "📱 UPI" : bill.payment_mode === "CARD" ? "💳 CARD" : "💵 CASH"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-slate-400">
                              ₹{gstTotal.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-emerald-400 text-sm">
                              ₹{Number(bill.total_amount).toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvoice(bill);
                                    setShowInvoiceModal(true);
                                  }}
                                  className="ux4g-btn ux4g-btn-outline"
                                  style={{ padding: "4px 8px", fontSize: 10 }}
                                  title="View itemized breakdown and print tax invoice"
                                >
                                  👁️ Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetId = bill.bill_number || bill.bill_id || bill.id;
                                    const backendPrintUrl = `http://localhost:8000/api/inventory/billing/${encodeURIComponent(targetId)}/print`;
                                    if (typeof window !== "undefined") window.open(backendPrintUrl, "_blank");
                                  }}
                                  className="ux4g-btn ux4g-btn-green"
                                  style={{ padding: "4px 8px", fontSize: 10 }}
                                  title="Open 1-page standalone printable bill"
                                >
                                  🖨️ Print
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>

      {/* ════ ULTRA-PROFESSIONAL PHARMACY TAX INVOICE PRINTABLE MODAL ════ */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto printable-invoice-container">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 my-8 printable-invoice-card">
            {/* Printable Area Header */}
            <div className="p-6 bg-emerald-800 text-white flex justify-between items-start">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Official Pharmacy Tax Invoice</div>
                <h2 className="text-xl font-black mt-0.5">{selectedInvoice.hospital_name || "Shree Ganesha Medical & Surgical Store"}</h2>
                <p className="text-xs text-emerald-100 mt-1">{selectedInvoice.hospital_address || "Main Market, Motala, Buldhana, Maharashtra"}</p>
                <div className="text-[11px] text-emerald-200 mt-1 font-mono flex gap-3">
                  <span>GSTIN: {selectedInvoice.hospital_gstin || "27AAAAA0000A1Z5"}</span>
                  <span>DL: Form 20B/21B MH-AKL-882910</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="no-print text-white/80 hover:text-white text-xl font-bold bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Invoice Info Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-slate-500 font-medium text-[10px]">INVOICE REF NO</div>
                <div className="font-black text-slate-900">{selectedInvoice.bill_number}</div>
              </div>
              <div>
                <div className="text-slate-500 font-medium text-[10px]">PATIENT NAME</div>
                <div className="font-bold text-slate-900">{selectedInvoice.patient_name}</div>
              </div>
              <div>
                <div className="text-slate-500 font-medium text-[10px]">DATE &amp; TIME</div>
                <div className="font-semibold text-slate-800">{new Date(selectedInvoice.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 font-medium text-[10px]">PAYMENT STATUS</div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                  {selectedInvoice.payment_mode || "CASH"} (PAID)
                </span>
              </div>
            </div>

            {/* Itemized Billed Medicines Table */}
            <div className="p-6 space-y-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-[10px] font-extrabold text-slate-600 uppercase">
                    <th className="py-2">Item Description</th>
                    <th className="py-2">Batch</th>
                    <th className="py-2">Expiry</th>
                    <th className="py-2 text-center">Unit Mode</th>
                    <th className="py-2 text-right">Rate (₹)</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {selectedInvoice.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{item.medicine_name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            🏷️ {item.category || "General"}
                          </span>
                        </div>
                        {item.generic_name && <div className="text-[10px] text-slate-500 font-normal">{item.generic_name}</div>}
                      </td>
                      <td className="py-2.5 font-mono text-[11px]">{item.batch_number || "PCM-A1"}</td>
                      <td className="py-2.5 text-[11px]">{item.expiry_date || "2027-12"}</td>
                      <td className="py-2.5 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {item.unit_label || item.unit_type || "TAB"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-semibold">₹{Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-bold">{item.quantity}</td>
                      <td className="py-2.5 text-right font-black text-slate-900">₹{Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Calculation Breakdown */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-start text-xs">
                <div className="space-y-1 text-slate-500 text-[11px]">
                  <div>• Goods once sold will be accepted under warranty returns.</div>
                  <div>• Inclusive of CGST 6% + SGST 6% Tax Rules.</div>
                  <div className="font-bold text-slate-700 mt-3">Authorized Signatory &amp; Registered Pharmacist Seal</div>
                  <div className="h-10 border-b border-dashed border-slate-400 w-48 mt-1" />
                </div>

                <div className="w-56 space-y-1.5 text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{(selectedInvoice.subtotal_amount || selectedInvoice.total_amount).toFixed(2)}</span>
                  </div>
                  {selectedInvoice.discount_amount ? (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-₹{selectedInvoice.discount_amount.toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>CGST (6%):</span>
                    <span>₹{(selectedInvoice.cgst_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>SGST (6%):</span>
                    <span>₹{(selectedInvoice.sgst_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-emerald-700">₹{selectedInvoice.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="no-print p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const targetId = selectedInvoice.bill_number || selectedInvoice.bill_id || (selectedInvoice as any).id;
                  const backendPrintUrl = `http://localhost:8000/api/inventory/billing/${encodeURIComponent(targetId)}/print`;
                  if (typeof window !== "undefined") window.open(backendPrintUrl, "_blank");
                }}
                className="px-3.5 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-200 text-xs flex items-center gap-1.5"
                title="Open standalone 1-page HTML invoice generated by backend"
              >
                <span>🌐 Open Standalone 1-Page HTML Invoice</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-200 text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.print();
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 text-xs flex items-center gap-1.5"
                >
                  <span>🖨️ Print 1-Page Tax Invoice / Export PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`rounded-2xl border w-full max-w-lg shadow-2xl p-6 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <h3 className={`text-base font-extrabold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>Add Medicine to Inventory</h3>
            <form onSubmit={handleAddMedicineSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Medicine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gudcel 200mg"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-400 font-semibold">Medicine Category *</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      + Add New Cat
                    </button>
                  </div>
                  <select
                    value={newMed.category}
                    onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                  >
                    {categories.filter((c) => c !== "ALL").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Batch Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="BATCH-102"
                    value={newMed.batchNumber}
                    onChange={(e) => setNewMed({ ...newMed, batchNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newMed.totalStock}
                    onChange={(e) => setNewMed({ ...newMed, totalStock: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMed.unitPrice}
                    onChange={(e) => setNewMed({ ...newMed, unitPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newMed.expiryDate}
                    onChange={(e) => setNewMed({ ...newMed, expiryDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-400 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20">
                  Save to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedMedForRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`rounded-2xl border w-full max-w-sm shadow-2xl p-6 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <h3 className={`text-base font-extrabold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>Restock {selectedMedForRestock.name}</h3>
            <p className="text-xs text-slate-400 mb-4">Current Stock: {selectedMedForRestock.totalStock} units</p>
            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Additional Quantity to Add</label>
                <input
                  type="number"
                  min={1}
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowRestockModal(false)} className="px-4 py-2 text-slate-400 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20">
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🏷️ Separate Medicine Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`rounded-2xl border w-full max-w-lg shadow-2xl p-6 space-y-4 ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <span>🏷️ Medical Store Category Management</span>
                  <span className="ux4g-badge ux4g-badge-saffron">{categories.filter(c => c !== "ALL").length} CATEGORIES</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Manage dosage forms &amp; custom categories for shop inventory.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Create New Category Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newCatName.trim();
                if (!trimmed) return;
                if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
                  alert(`Category "${trimmed}" already exists.`);
                  return;
                }
                setCustomCategories([...customCategories, trimmed]);
                setNewMed({ ...newMed, category: trimmed });
                setNewCatName("");
              }}
              className="flex gap-2 text-xs"
            >
              <input
                type="text"
                placeholder="Enter new category (e.g. Ayurvedic, Pouch, Drops)…"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
              />
              <button type="submit" className="ux4g-btn ux4g-btn-green" style={{ padding: "8px 16px" }}>
                + Add Category
              </button>
            </form>

            {/* Existing Categories List with Badge Counts & Actions */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <label className="block text-slate-400 font-bold text-xs">Active Categories in Medical Store:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.filter((c) => c !== "ALL").map((cat) => {
                  const count = medicines.filter((m) => m.category === cat).length;
                  return (
                    <div
                      key={cat}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400">🏷️ {cat}</span>
                        <span className="ux4g-badge ux4g-badge-saffron" style={{ fontSize: 10 }}>
                          {count} meds
                        </span>
                      </div>
                      {count === 0 && (
                        <button
                          type="button"
                          onClick={() => setCustomCategories(customCategories.filter((c) => c !== cat))}
                          className="text-rose-400 hover:text-rose-300 text-[10px] font-bold"
                          title="Remove unused category"
                        >
                          ✕ Delete
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="ux4g-btn ux4g-btn-primary"
                style={{ padding: "8px 20px" }}
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryDashboard;
