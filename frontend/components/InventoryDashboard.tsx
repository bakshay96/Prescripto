"use client";

import React, { useState, useMemo } from "react";

// Types
export type DosageForm = "Tablet" | "Capsule" | "Syrup" | "Injection" | "Ointment" | "Drops";
export type UserRole = "PHARMACIST" | "DOCTOR_ADMIN";

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
}

// Initial Mock Data
const INITIAL_MEDICINES: MedicineItem[] = [
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
    totalStock: 12, // Low stock alert!
    unitPrice: 18.00,
    expiryDate: "2027-08-15",
    batchNumber: "AMX-2026-B2",
    minStockAlert: 20,
    lastUpdated: new Date().toLocaleDateString(),
  },
  {
    id: "med-3",
    name: "Benadryl Cough Syrup 100ml",
    category: "Syrup/Liquid",
    dosageForm: "Syrup",
    totalStock: 45,
    unitPrice: 95.00,
    expiryDate: "2026-11-20",
    batchNumber: "CS-2026-C3",
    minStockAlert: 15,
    lastUpdated: new Date().toLocaleDateString(),
  },
  {
    id: "med-4",
    name: "Insulin Glargine 100 IU/ml",
    category: "Antidiabetic",
    dosageForm: "Injection",
    totalStock: 5, // Critical low stock!
    unitPrice: 450.00,
    expiryDate: "2027-01-10",
    batchNumber: "INS-2026-D4",
    minStockAlert: 10,
    lastUpdated: new Date().toLocaleDateString(),
  },
  {
    id: "med-5",
    name: "Pantoprazole 40mg",
    category: "Antacid",
    dosageForm: "Tablet",
    totalStock: 180,
    unitPrice: 12.00,
    expiryDate: "2028-05-30",
    batchNumber: "PAN-2026-E5",
    minStockAlert: 25,
    lastUpdated: new Date().toLocaleDateString(),
  },
];

export default function MedicalStoreDashboard() {
  const [role, setRole] = useState<UserRole>("PHARMACIST");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [medicines, setMedicines] = useState<MedicineItem[]>(INITIAL_MEDICINES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedMedForRestock, setSelectedMedForRestock] = useState<MedicineItem | null>(null);

  // New Medicine Form State
  const [newMed, setNewMed] = useState({
    name: "",
    category: "Analgesic",
    dosageForm: "Tablet" as DosageForm,
    totalStock: 100,
    unitPrice: 10.00,
    expiryDate: "2027-12-31",
    batchNumber: "",
    minStockAlert: 20,
  });

  // Restock Form State
  const [restockAmount, setRestockAmount] = useState<number>(50);

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

  // Metrics
  const totalItems = medicines.length;
  const lowStockCount = medicines.filter((m) => m.totalStock <= m.minStockAlert).length;
  const outOfStockCount = medicines.filter((m) => m.totalStock === 0).length;
  const totalValuation = medicines.reduce((acc, m) => acc + m.totalStock * m.unitPrice, 0);

  // Categories List
  const categories = ["ALL", ...Array.from(new Set(medicines.map((m) => m.category)))];

  // Form Handlers
  const handleAddMedicineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name || !newMed.batchNumber) {
      alert("Please fill in medicine name and batch number.");
      return;
    }

    const created: MedicineItem = {
      id: `med-${Date.now()}`,
      name: newMed.name,
      category: newMed.category,
      dosageForm: newMed.dosageForm,
      totalStock: Number(newMed.totalStock),
      unitPrice: Number(newMed.unitPrice),
      expiryDate: newMed.expiryDate,
      batchNumber: newMed.batchNumber,
      minStockAlert: Number(newMed.minStockAlert),
      lastUpdated: new Date().toLocaleDateString(),
    };

    setMedicines([created, ...medicines]);
    setShowAddModal(false);
    setNewMed({
      name: "",
      category: "Analgesic",
      dosageForm: "Tablet",
      totalStock: 100,
      unitPrice: 10.00,
      expiryDate: "2027-12-31",
      batchNumber: "",
      minStockAlert: 20,
    });
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedForRestock || restockAmount <= 0) return;

    setMedicines(
      medicines.map((m) =>
        m.id === selectedMedForRestock.id
          ? {
              ...m,
              totalStock: m.totalStock + Number(restockAmount),
              lastUpdated: new Date().toLocaleDateString(),
            }
          : m
      )
    );

    setShowRestockModal(false);
    setSelectedMedForRestock(null);
    setRestockAmount(50);
  };

  return (
    <div className={`min-h-screen font-sans p-4 md:p-8 transition-colors duration-300 ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP NAVBAR & ROLE SWITCHER */}
        <header className={`flex flex-col md:flex-row md:items-center justify-between p-6 backdrop-blur-md border rounded-2xl gap-4 shadow-xl transition-colors ${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200"}`}>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-cyan-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className={`text-2xl font-bold bg-clip-text text-transparent ${isDarkMode ? "bg-gradient-to-r from-white via-slate-200 to-teal-300" : "bg-gradient-to-r from-slate-900 via-teal-900 to-cyan-800"}`}>
                Medical Store Inventory Management
              </h1>
              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Hospital Pharmacy Live Stock Monitor & Dispensary Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all ${
                isDarkMode ? "bg-slate-950 border-slate-800 text-amber-400 hover:text-amber-300" : "bg-slate-100 border-slate-300 text-indigo-600 hover:text-indigo-800"
              }`}
              title="Toggle Light / Dark Mode"
            >
              <span>{isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}</span>
            </button>

            {/* Role Switcher Pill */}
            <div className={`flex items-center p-1.5 rounded-xl border self-start md:self-auto ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-300"}`}>
              <button
                onClick={() => setRole("PHARMACIST")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  role === "PHARMACIST"
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-600/30"
                    : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Pharmacist View</span>
              </button>
              <button
                onClick={() => setRole("DOCTOR_ADMIN")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  role === "DOCTOR_ADMIN"
                    ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                    : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Doctor / Admin Overview</span>
              </button>
            </div>
          </div>
        </header>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm flex items-center space-x-4">
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Medicines</p>
              <p className="text-2xl font-bold text-white">{totalItems}</p>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-amber-400">{lowStockCount}</p>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm flex items-center space-x-4">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Out of Stock</p>
              <p className="text-2xl font-bold text-rose-400">{outOfStockCount}</p>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Inventory Value</p>
              <p className="text-2xl font-bold text-emerald-400">₹{totalValuation.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* CONTROLS & LIVE MONITOR TABLE */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Live Inventory Stock Monitor</span>
                {role === "DOCTOR_ADMIN" && (
                  <span className="text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/50 px-2.5 py-0.5 rounded-full">
                    Read Only Clinical View
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Real-time tracking of medicine quantities, dosage forms, and expiration status
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative min-w-[220px]">
                <input
                  type="text"
                  placeholder="Search medicine or batch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 pl-9 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
                <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "ALL" ? "All Categories" : cat}
                  </option>
                ))}
              </select>

              {/* Add New Medicine Button (Pharmacist Only) */}
              {role === "PHARMACIST" && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-teal-500/20 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add New Medicine</span>
                </button>
              )}
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                  <th className="p-3.5">Medicine Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Dosage Form</th>
                  <th className="p-3.5">Batch No</th>
                  <th className="p-3.5">Current Stock</th>
                  <th className="p-3.5">Unit Price</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Expiry Date</th>
                  {role === "PHARMACIST" && <th className="p-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No medicines matching criteria found.
                    </td>
                  </tr>
                ) : (
                  filteredMedicines.map((med) => {
                    const isLowStock = med.totalStock <= med.minStockAlert && med.totalStock > 0;
                    const isOutOfStock = med.totalStock === 0;

                    return (
                      <tr key={med.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-semibold text-white">{med.name}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {med.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">{med.dosageForm}</td>
                        <td className="p-3.5 font-mono text-slate-400">{med.batchNumber}</td>
                        <td className="p-3.5 font-bold text-sm">
                          <span
                            className={
                              isOutOfStock
                                ? "text-rose-400"
                                : isLowStock
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }
                          >
                            {med.totalStock}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">₹{med.unitPrice.toFixed(2)}</td>
                        <td className="p-3.5">
                          {isOutOfStock ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 animate-pulse">
                              Low Stock ({med.totalStock})
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-400">{med.expiryDate}</td>
                        {role === "PHARMACIST" && (
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedMedForRestock(med);
                                setShowRestockModal(true);
                              }}
                              className="px-3 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg text-[11px] font-semibold transition-all"
                            >
                              + Update Stock
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL 1: ADD NEW MEDICINE */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span className="text-teal-400">❖</span>
                  <span>Add New Medicine to Store</span>
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddMedicineSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol 500mg"
                    value={newMed.name}
                    onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Category *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Antibiotic, Analgesic"
                      value={newMed.category}
                      onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Dosage Form *</label>
                    <select
                      value={newMed.dosageForm}
                      onChange={(e) => setNewMed({ ...newMed, dosageForm: e.target.value as DosageForm })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-teal-500 focus:outline-none"
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup/Liquid</option>
                      <option value="Injection">Injection</option>
                      <option value="Ointment">Ointment</option>
                      <option value="Drops">Drops</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Initial Total Stock *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newMed.totalStock}
                      onChange={(e) => setNewMed({ ...newMed, totalStock: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Unit Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newMed.unitPrice}
                      onChange={(e) => setNewMed({ ...newMed, unitPrice: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Batch Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BATCH-2026-X"
                      value={newMed.batchNumber}
                      onChange={(e) => setNewMed({ ...newMed, batchNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={newMed.expiryDate}
                      onChange={(e) => setNewMed({ ...newMed, expiryDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold shadow-lg shadow-teal-600/30"
                  >
                    Save Medicine
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: UPDATE STOCK */}
        {showRestockModal && selectedMedForRestock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white">Update Medicine Stock</h3>
                <button
                  onClick={() => setShowRestockModal(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="font-bold text-white text-sm">{selectedMedForRestock.name}</p>
                  <p className="text-slate-400 mt-0.5">
                    Current Stock: <span className="text-teal-400 font-bold">{selectedMedForRestock.totalStock}</span> ({selectedMedForRestock.dosageForm})
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Additional Stock Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRestockModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold shadow-lg shadow-teal-600/30"
                  >
                    Add to Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
