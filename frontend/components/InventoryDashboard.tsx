"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  listMedicines,
  addMedicine as apiAddMedicine,
  restockMedicine as apiRestockMedicine,
  Medicine as ApiMedicine,
  getUser,
} from "../utils/api";

export type DosageForm = "Tablet" | "Capsule" | "Syrup" | "Injection" | "Ointment" | "Drops";
export type UserRole = "PHARMACIST" | "DOCTOR_ADMIN" | "DOCTOR";

export interface MedicineItem {
  id: string;
  name: string;
  category: string;
  dosageForm: DosageForm;
  totalStock: number;
  unitPrice: number;
  expiryDate: string;
  batchNumber: string;
  minStockAlert: number;
  lastUpdated: string;
  imageUrl?: string;
  providerName?: string;
  providerContact?: string;
  hsnCode?: string;
  rackLocation?: string;
}

export const INITIAL_MEDICINES: MedicineItem[] = [
  {
    id: "med-1",
    name: "Paracetamol 500mg",
    category: "Analgesic",
    dosageForm: "Tablet",
    totalStock: 250,
    unitPrice: 3.50,
    expiryDate: "2027-12-31",
    batchNumber: "PCM-2026-A1",
    minStockAlert: 30,
    lastUpdated: new Date().toLocaleDateString(),
  },
  {
    id: "med-2",
    name: "Amoxicillin 500mg",
    category: "Antibiotic",
    dosageForm: "Capsule",
    totalStock: 12,
    unitPrice: 18.00,
    expiryDate: "2027-08-15",
    batchNumber: "AMX-2026-B2",
    minStockAlert: 20,
    lastUpdated: new Date().toLocaleDateString(),
  },
];

export default function MedicalStoreDashboard({
  isDarkTheme,
  onToggleTheme,
}: {
  isDarkTheme?: boolean;
  onToggleTheme?: () => void;
}) {
  const [role, setRole] = useState<UserRole>("PHARMACIST");
  const [internalDark, setInternalDark] = useState(true);
  const isDarkMode = isDarkTheme !== undefined ? isDarkTheme : internalDark;
  const toggleDark = onToggleTheme || (() => setInternalDark(!internalDark));

  const [activeTab, setActiveTab] = useState<"inventory" | "alerts" | "dispense" | "analytics">("inventory");
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedMedForRestock, setSelectedMedForRestock] = useState<MedicineItem | null>(null);

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

  useEffect(() => {
    const user = getUser();
    if (user) setRole(user.role as any);
  }, []);

  const loadStoreInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listMedicines();
      if (res && res.length > 0) {
        const mapped: MedicineItem[] = res.map((m: ApiMedicine) => ({
          id: m.id,
          name: m.name,
          category: m.category || "General",
          dosageForm: (m.unit as DosageForm) || "Tablet",
          totalStock: m.stock_quantity,
          unitPrice: m.price || 10.0,
          expiryDate: m.expiry_date || "2027-12-31",
          batchNumber: m.batch_number || "BATCH-01",
          minStockAlert: m.min_stock_alert || 10,
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
  }, [loadStoreInventory]);

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

  // Categories List
  const categories = ["ALL", ...Array.from(new Set(medicines.map((m) => m.category)))];

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
    <div className={`min-h-screen ux4g-theme-govblue ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} font-sans transition-colors duration-200`}>
      {/* Header Bar */}
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between flex-wrap gap-4 ${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200"}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-500/20">
            💊
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              Medical Store &amp; Pharmacy Dashboard
              <span className="ux4g-badge ux4g-badge-gov">PHARMACIST PORTAL</span>
            </h1>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Real-time Prescription Fulfillment &amp; Stock Sync</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="ux4g-btn ux4g-btn-green"
          >
            <span>+ Add Medicine to Store</span>
          </button>
        </div>
      </header>

      {/* Interactive Tabs Bar */}
      <div className="px-6 pt-4 flex gap-2 flex-wrap">
        {[
          { id: "inventory", label: "🧪 Medicine Inventory", count: medicines.length },
          { id: "alerts", label: "📦 Low Stock Alerts", count: lowStockCount },
          { id: "dispense", label: "📋 Prescription Dispense Desk" },
          { id: "analytics", label: "📊 Valuation Analytics" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`ux4g-btn ${activeTab === t.id ? "ux4g-btn-primary" : "ux4g-btn-outline"}`}
            style={{ fontSize: 12 }}
          >
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span className="ux4g-badge ux4g-badge-saffron" style={{ marginLeft: 4 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Total Medicines</div>
            <div className={`text-2xl font-black mt-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{totalItems}</div>
            <div className={`text-[10px] mt-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Active inventory items</div>
          </div>

          <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className="text-xs font-semibold text-amber-500">Low Stock Alerts</div>
            <div className="text-2xl font-black mt-1 text-amber-500">{lowStockCount}</div>
            <div className="text-[10px] text-amber-600/80 mt-1">Requires restock soon</div>
          </div>

          <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className="text-xs font-semibold text-rose-500">Out of Stock</div>
            <div className="text-2xl font-black mt-1 text-rose-500">{outOfStockCount}</div>
            <div className="text-[10px] text-rose-600/80 mt-1">Unavailable for prescriptions</div>
          </div>

          <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className="text-xs font-semibold text-emerald-600">Total Valuation</div>
            <div className="text-2xl font-black mt-1 text-emerald-600">₹{totalValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-emerald-700/80 mt-1">Based on unit price</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by medicine name or batch number…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border focus:outline-none transition-all ${
                isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500"
              }`}
            />
            <span className="absolute left-3 top-3 text-slate-500 text-xs">🔍</span>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-emerald-600 text-white"
                    : isDarkMode
                    ? "bg-slate-950 text-slate-400 hover:text-white"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Table */}
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
                    <th className="p-4">Stock</th>
                    <th className="p-4">Unit Price</th>
                    <th className="p-4">Expiry Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? "divide-slate-800 text-slate-200" : "divide-slate-200 text-slate-800"}`}>
                  {filteredMedicines.map((med) => {
                    const isLow = med.totalStock <= med.minStockAlert;
                    const isOut = med.totalStock === 0;
                    return (
                      <tr key={med.id} className={isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}>
                        <td className="p-4 font-bold">
                          <div>{med.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{med.dosageForm}</div>
                        </td>
                        <td className="p-4">{med.category}</td>
                        <td className="p-4 font-mono">{med.batchNumber}</td>
                        <td className="p-4 font-bold">
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
      </main>

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
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <input
                    type="text"
                    value={newMed.category}
                    onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
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
    </div>
  );
}
