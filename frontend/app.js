/* =============================================================
   PRESCRIPTO v2.0 — Complete SPA Engine
   Router | Auth | i18n | Doctor | Pharmacist | Master Admin
   ============================================================= */

'use strict';

/* ═══════════════════════════════════════════════════════
   1. CONFIGURATION & API
   ═══════════════════════════════════════════════════════ */
const API_BASE = (function () {
  const envUrl = typeof window !== 'undefined' && window.__ENV_API_URL__;
  return envUrl || 'http://127.0.0.1:8000/api/v1';
})();

/* ═══════════════════════════════════════════════════════
   2. APPLICATION STATE
   ═══════════════════════════════════════════════════════ */
const State = {
  currentView: 'landing',
  currentLang: localStorage.getItem('prescripto_lang') || 'en',
  currentTheme: localStorage.getItem('prescripto_theme') || 'dark',
  currentUser: null,
  token: localStorage.getItem('prescripto_token') || null,

  // Doctor state
  patients: JSON.parse(localStorage.getItem('prescripto_patients') || '[]'),
  prescriptions: JSON.parse(localStorage.getItem('prescripto_prescriptions') || '[]'),
  storeAdmins: JSON.parse(localStorage.getItem('prescripto_store_admins') || '[]'),
  drActivePanel: 'overview',
  rxFilter: '',

  // Pharmacist state
  medicines: JSON.parse(localStorage.getItem('prescripto_medicines') || '[]'),
  stockLedger: JSON.parse(localStorage.getItem('prescripto_stock_ledger') || '[]'),
  phActivePanel: 'inventory',

  // Admin state
  hospitals: JSON.parse(localStorage.getItem('prescripto_hospitals') || '[]'),
  queries: JSON.parse(localStorage.getItem('prescripto_queries') || '[]'),
  subscriptions: JSON.parse(localStorage.getItem('prescripto_subscriptions') || '[]'),
  maActivePanel: 'overview',

  // Print state
  printRxId: null,
  printLang: 'en',
  loginRole: 'DOCTOR',

  save() {
    localStorage.setItem('prescripto_patients', JSON.stringify(this.patients));
    localStorage.setItem('prescripto_prescriptions', JSON.stringify(this.prescriptions));
    localStorage.setItem('prescripto_medicines', JSON.stringify(this.medicines));
    localStorage.setItem('prescripto_stock_ledger', JSON.stringify(this.stockLedger));
    localStorage.setItem('prescripto_hospitals', JSON.stringify(this.hospitals));
    localStorage.setItem('prescripto_queries', JSON.stringify(this.queries));
    localStorage.setItem('prescripto_subscriptions', JSON.stringify(this.subscriptions));
    localStorage.setItem('prescripto_store_admins', JSON.stringify(this.storeAdmins));
  }
};

/* ═══════════════════════════════════════════════════════
   3. i18n — TRANSLATION DICTIONARY
   ═══════════════════════════════════════════════════════ */
const T = {
  en: {
    'lbl-total-patients': 'Total Patients', 'lbl-total-rx': 'Prescriptions Written',
    'lbl-pending-rx': 'Pending Dispense', 'lbl-today-rx': "Today's Prescriptions",
    'lbl-recent-rx': 'Recent Prescriptions', 'lbl-view-all': 'View All',
    'th-rx-num': 'Rx #', 'th-rx-patient': 'Patient', 'th-rx-diag': 'Diagnosis',
    'th-rx-status': 'Status', 'th-rx-date': 'Date', 'th-rx-action': 'Action',
    'lbl-patient-mgmt': 'Patient Management', 'lbl-add-patient': 'Register Patient',
    'th-pt-name': 'Name', 'th-pt-village': 'Village', 'th-pt-age': 'Age',
    'th-pt-gender': 'Gender', 'th-pt-phone': 'Phone', 'th-pt-action': 'Action',
    'lbl-create-rx': 'Create Prescription', 'lbl-doctor-badge': 'Doctor Access',
    'lbl-select-patient': 'Select Patient', 'lbl-diagnosis': 'Diagnosis',
    'lbl-rx-notes': 'Doctor Notes / Dietary Advice', 'lbl-prescribed-meds': 'Prescribed Medicines',
    'lbl-add-med-row': 'Add Medicine', 'lbl-generate-rx': 'Issue Prescription',
    'lbl-rx-history': 'Prescription History', 'lbl-store-admins': 'Medical Store Admins',
    'lbl-inventory-title': 'Medicine Inventory', 'lbl-add-med': 'Add Medicine',
    'th-inv-name': 'Medicine', 'th-inv-cat': 'Category', 'th-inv-stock': 'Stock',
    'th-inv-price': 'Price', 'th-inv-exp': 'Expiry', 'th-inv-batch': 'Batch',
    'th-inv-status': 'Status', 'th-inv-action': 'Action',
    'lbl-dispense-queue': 'Dispense Queue',
    'lbl-stock-ledger': 'Stock Ledger & Restock Portal',
    'lbl-stock-sub': 'Track provider details, HSN codes, shelf locations, and audit logs',
    'th-sl-img': 'Image', 'th-sl-name': 'Medicine', 'th-sl-qty': 'Stock',
    'th-sl-exp': 'Expiry', 'th-sl-prov': 'Provider', 'th-sl-hsn': 'HSN Code',
    'th-sl-rack': 'Rack', 'th-sl-status': 'Status', 'th-sl-action': 'Action',
    'lbl-ph-total': 'Total', 'lbl-ph-low': 'Low Stock', 'lbl-ph-exp': 'Expired',
    'lbl-ph-pending': 'Pending Rx',
    'lbl-pt-name': 'Patient Name', 'lbl-pt-village': 'Village / Location',
    'lbl-pt-dob': 'Date of Birth', 'lbl-pt-gender': 'Gender',
    'lbl-pt-phone': 'Phone', 'lbl-pt-history': 'Medical History / Allergies',
    'lbl-med-name': 'Medicine Name', 'lbl-med-cat': 'Category',
    'lbl-med-stock': 'Initial Stock', 'lbl-med-unit': 'Unit Type',
    'lbl-med-price': 'Price (₹)', 'lbl-med-alert': 'Min Stock Alert',
    'lbl-med-expiry': 'Expiry Date', 'lbl-med-batch': 'Batch Number',
    'lbl-med-img': 'Medicine Image URL', 'lbl-med-provider': 'Supplier / Provider Name',
    'lbl-med-contact': 'Provider Contact', 'lbl-med-hsn': 'HSN Code',
    'lbl-med-rack': 'Rack / Shelf Location',
    'loginBtnText': 'Sign In'
  },
  mr: {
    'lbl-total-patients': 'एकूण रुग्ण', 'lbl-total-rx': 'लिहिलेल्या प्रिस्क्रिप्शन',
    'lbl-pending-rx': 'प्रलंबित वितरण', 'lbl-today-rx': 'आजच्या प्रिस्क्रिप्शन',
    'lbl-recent-rx': 'अलीकडील प्रिस्क्रिप्शन', 'lbl-view-all': 'सर्व पहा',
    'th-rx-num': 'Rx क्र.', 'th-rx-patient': 'रुग्ण', 'th-rx-diag': 'निदान',
    'th-rx-status': 'स्थिती', 'th-rx-date': 'तारीख', 'th-rx-action': 'क्रिया',
    'lbl-patient-mgmt': 'रुग्ण व्यवस्थापन', 'lbl-add-patient': 'रुग्ण नोंदणी',
    'th-pt-name': 'नाव', 'th-pt-village': 'गाव', 'th-pt-age': 'वय',
    'th-pt-gender': 'लिंग', 'th-pt-phone': 'फोन', 'th-pt-action': 'क्रिया',
    'lbl-create-rx': 'प्रिस्क्रिप्शन तयार करा', 'lbl-doctor-badge': 'डॉक्टर प्रवेश',
    'lbl-select-patient': 'रुग्ण निवडा', 'lbl-diagnosis': 'निदान',
    'lbl-rx-notes': 'डॉक्टरांच्या नोंदी / आहाराचा सल्ला',
    'lbl-prescribed-meds': 'लिहिलेली औषधे', 'lbl-add-med-row': 'औषध जोडा',
    'lbl-generate-rx': 'प्रिस्क्रिप्शन जारी करा', 'lbl-rx-history': 'प्रिस्क्रिप्शन इतिहास',
    'lbl-store-admins': 'मेडिकल स्टोअर व्यवस्थापक',
    'lbl-inventory-title': 'औषध यादी', 'lbl-add-med': 'औषध जोडा',
    'th-inv-name': 'औषध', 'th-inv-cat': 'श्रेणी', 'th-inv-stock': 'साठा',
    'th-inv-price': 'किंमत', 'th-inv-exp': 'कालबाह्यता', 'th-inv-batch': 'बॅच',
    'th-inv-status': 'स्थिती', 'th-inv-action': 'क्रिया',
    'lbl-dispense-queue': 'वितरण रांग',
    'lbl-stock-ledger': 'साठा खतावणी आणि पुनर्भरण पोर्टल',
    'lbl-stock-sub': 'पुरवठादार तपशील, HSN कोड, शेल्फ ठिकाण आणि लेखापरीक्षण लॉग ट्रॅक करा',
    'th-sl-img': 'फोटो', 'th-sl-name': 'औषध', 'th-sl-qty': 'साठा',
    'th-sl-exp': 'कालबाह्यता', 'th-sl-prov': 'पुरवठादार', 'th-sl-hsn': 'HSN कोड',
    'th-sl-rack': 'रॅक', 'th-sl-status': 'स्थिती', 'th-sl-action': 'क्रिया',
    'lbl-ph-total': 'एकूण', 'lbl-ph-low': 'कमी साठा', 'lbl-ph-exp': 'कालबाह्य',
    'lbl-ph-pending': 'प्रलंबित Rx',
    'lbl-pt-name': 'रुग्णाचे नाव', 'lbl-pt-village': 'गाव / ठिकाण',
    'lbl-pt-dob': 'जन्मतारीख', 'lbl-pt-gender': 'लिंग',
    'lbl-pt-phone': 'फोन', 'lbl-pt-history': 'वैद्यकीय इतिहास / ऍलर्जी',
    'lbl-med-name': 'औषधाचे नाव', 'lbl-med-cat': 'श्रेणी',
    'lbl-med-stock': 'प्रारंभिक साठा', 'lbl-med-unit': 'एकक प्रकार',
    'lbl-med-price': 'किंमत (₹)', 'lbl-med-alert': 'किमान साठा सूचना',
    'lbl-med-expiry': 'कालबाह्यता तारीख', 'lbl-med-batch': 'बॅच क्रमांक',
    'lbl-med-img': 'औषध प्रतिमा URL', 'lbl-med-provider': 'पुरवठादाराचे नाव',
    'lbl-med-contact': 'पुरवठादार संपर्क', 'lbl-med-hsn': 'HSN कोड',
    'lbl-med-rack': 'रॅक / शेल्फ ठिकाण',
    'loginBtnText': 'साइन इन करा'
  },
  hi: {
    'lbl-total-patients': 'कुल मरीज', 'lbl-total-rx': 'लिखे नुस्खे',
    'lbl-pending-rx': 'लंबित वितरण', 'lbl-today-rx': 'आज के नुस्खे',
    'lbl-recent-rx': 'हालिया नुस्खे', 'lbl-view-all': 'सभी देखें',
    'th-rx-num': 'Rx क्र.', 'th-rx-patient': 'मरीज', 'th-rx-diag': 'निदान',
    'th-rx-status': 'स्थिति', 'th-rx-date': 'तिथि', 'th-rx-action': 'क्रिया',
    'lbl-patient-mgmt': 'मरीज प्रबंधन', 'lbl-add-patient': 'मरीज पंजीकरण',
    'th-pt-name': 'नाम', 'th-pt-village': 'गांव', 'th-pt-age': 'उम्र',
    'th-pt-gender': 'लिंग', 'th-pt-phone': 'फोन', 'th-pt-action': 'क्रिया',
    'lbl-create-rx': 'नुस्खा बनाएं', 'lbl-doctor-badge': 'डॉक्टर एक्सेस',
    'lbl-select-patient': 'मरीज चुनें', 'lbl-diagnosis': 'निदान',
    'lbl-rx-notes': 'डॉक्टर नोट्स / खान-पान सलाह',
    'lbl-prescribed-meds': 'निर्धारित दवाइयाँ', 'lbl-add-med-row': 'दवा जोड़ें',
    'lbl-generate-rx': 'नुस्खा जारी करें', 'lbl-rx-history': 'नुस्खा इतिहास',
    'lbl-store-admins': 'मेडिकल स्टोर व्यवस्थापक',
    'lbl-inventory-title': 'दवाई सूची', 'lbl-add-med': 'दवा जोड़ें',
    'th-inv-name': 'दवाई', 'th-inv-cat': 'श्रेणी', 'th-inv-stock': 'स्टॉक',
    'th-inv-price': 'मूल्य', 'th-inv-exp': 'समाप्ति', 'th-inv-batch': 'बैच',
    'th-inv-status': 'स्थिति', 'th-inv-action': 'क्रिया',
    'lbl-dispense-queue': 'वितरण कतार',
    'lbl-stock-ledger': 'स्टॉक खाता और पुनर्भरण पोर्टल',
    'lbl-stock-sub': 'आपूर्तिकर्ता विवरण, HSN कोड, शेल्फ स्थान और ऑडिट लॉग ट्रैक करें',
    'th-sl-img': 'फोटो', 'th-sl-name': 'दवाई', 'th-sl-qty': 'स्टॉक',
    'th-sl-exp': 'समाप्ति', 'th-sl-prov': 'आपूर्तिकर्ता', 'th-sl-hsn': 'HSN कोड',
    'th-sl-rack': 'रैक', 'th-sl-status': 'स्थिति', 'th-sl-action': 'क्रिया',
    'lbl-ph-total': 'कुल', 'lbl-ph-low': 'कम स्टॉक', 'lbl-ph-exp': 'एक्सपायर',
    'lbl-ph-pending': 'लंबित Rx',
    'lbl-pt-name': 'मरीज का नाम', 'lbl-pt-village': 'गांव / स्थान',
    'lbl-pt-dob': 'जन्म तिथि', 'lbl-pt-gender': 'लिंग',
    'lbl-pt-phone': 'फोन', 'lbl-pt-history': 'चिकित्सा इतिहास / एलर्जी',
    'lbl-med-name': 'दवाई का नाम', 'lbl-med-cat': 'श्रेणी',
    'lbl-med-stock': 'प्रारंभिक स्टॉक', 'lbl-med-unit': 'इकाई प्रकार',
    'lbl-med-price': 'मूल्य (₹)', 'lbl-med-alert': 'न्यूनतम स्टॉक अलर्ट',
    'lbl-med-expiry': 'समाप्ति तिथि', 'lbl-med-batch': 'बैच नंबर',
    'lbl-med-img': 'दवाई छवि URL', 'lbl-med-provider': 'आपूर्तिकर्ता का नाम',
    'lbl-med-contact': 'आपूर्तिकर्ता संपर्क', 'lbl-med-hsn': 'HSN कोड',
    'lbl-med-rack': 'रैक / शेल्फ स्थान',
    'loginBtnText': 'साइन इन करें'
  }
};

/* ═══════════════════════════════════════════════════════
   4. DEMO DATA — Seeds on first load
   ═══════════════════════════════════════════════════════ */
const DEMO_ACCOUNTS = {
  doctor:     { email: 'doctor@prescripto.app',     password: 'demo123', role: 'DOCTOR',       name: 'Dr. Rajesh Sharma',    clinic: 'City Care Hospital', clinicAddress: '108 Health Avenue, Pune' },
  pharmacist: { email: 'pharma@prescripto.app',     password: 'demo123', role: 'PHARMACIST',   name: 'Rohini Patil',         clinic: 'City Care Hospital', clinicAddress: '108 Health Avenue, Pune' },
  admin:      { email: 'admin@prescripto.app',      password: 'admin123', role: 'MASTER_ADMIN', name: 'Master Administrator', clinic: 'Prescripto HQ',      clinicAddress: '' }
};

function seedDemoData() {
  if (State.patients.length === 0) {
    State.patients = [
      { id: uid(), name: 'Ramesh Patil', village: 'Shirur', dob: '1985-06-15', gender: 'MALE', phone: '9876543210', bloodGroup: 'B+', history: 'Hypertension', createdAt: new Date(Date.now()-86400000*10).toISOString() },
      { id: uid(), name: 'Sunita Deshmukh', village: 'Daund', dob: '1992-03-22', gender: 'FEMALE', phone: '9123456789', bloodGroup: 'O+', history: 'Diabetes Type 2', createdAt: new Date(Date.now()-86400000*7).toISOString() },
      { id: uid(), name: 'Vijay Kumar', village: 'Wagholi', dob: '2010-11-05', gender: 'MALE', phone: '8765432109', bloodGroup: 'A+', history: 'Asthma', createdAt: new Date(Date.now()-86400000*3).toISOString() },
    ];
  }
  if (State.medicines.length === 0) {
    const today = new Date(); today.setFullYear(today.getFullYear() + 1);
    const past = new Date('2025-12-31');
    State.medicines = [
      { id: uid(), name: 'Paracetamol 500mg', category: 'Analgesic', stock: 250, price: 8.50, unit: 'Tablets', expiry: today.toISOString().split('T')[0], batch: 'PCM-2026-A1', minAlert: 20, imgUrl: '', providerName: 'Apex Pharma', providerContact: '9876543210', hsnCode: '30049099', rackLocation: 'Rack A-01', createdAt: new Date().toISOString() },
      { id: uid(), name: 'Amoxicillin 250mg', category: 'Antibiotic', stock: 8, price: 45.00, unit: 'Capsules', expiry: today.toISOString().split('T')[0], batch: 'AMX-2026-B2', minAlert: 15, imgUrl: '', providerName: 'MedLine Distributors', providerContact: '9123456789', hsnCode: '30041000', rackLocation: 'Rack B-03', createdAt: new Date().toISOString() },
      { id: uid(), name: 'Cough Syrup (100ml)', category: 'Syrup', stock: 45, price: 65.00, unit: 'Bottles', expiry: past.toISOString().split('T')[0], batch: 'CSY-2025-C3', minAlert: 10, imgUrl: '', providerName: 'Apex Pharma', providerContact: '9876543210', hsnCode: '30049099', rackLocation: 'Rack C-12', createdAt: new Date().toISOString() },
      { id: uid(), name: 'Vitamin D3 Tablet', category: 'Vitamin', stock: 180, price: 12.00, unit: 'Tablets', expiry: today.toISOString().split('T')[0], batch: 'VD3-2026-D4', minAlert: 30, imgUrl: '', providerName: 'Wellness Pharma', providerContact: '9988776655', hsnCode: '30049099', rackLocation: 'Rack A-07', createdAt: new Date().toISOString() },
    ];
  }
  if (State.prescriptions.length === 0) {
    const p = State.patients;
    const m = State.medicines;
    if (p.length && m.length) {
      State.prescriptions = [
        { id: uid(), rxNumber: 'RX-20260001', patientId: p[0].id, diagnosis: 'Viral Fever', notes: 'Drink plenty of fluids', status: 'DISPENSED', items: [{ medicineId: m[0].id, medicineName: m[0].name, dosage: '500mg', frequency: '1-1-1 after meals', durationDays: 5, quantity: 15 }], createdAt: new Date(Date.now()-86400000*5).toISOString(), dispensedAt: new Date(Date.now()-86400000*5).toISOString() },
        { id: uid(), rxNumber: 'RX-20260002', patientId: p[1].id, diagnosis: 'Respiratory Infection', notes: 'Complete the full course', status: 'PENDING', items: [{ medicineId: m[1].id, medicineName: m[1].name, dosage: '250mg', frequency: '1-0-1 after meals', durationDays: 7, quantity: 14 }], createdAt: new Date(Date.now()-86400000*2).toISOString(), dispensedAt: null },
        { id: uid(), rxNumber: 'RX-20260003', patientId: p[2].id, diagnosis: 'Cough & Cold', notes: '', status: 'PENDING', items: [{ medicineId: m[2].id, medicineName: m[2].name, dosage: '10ml', frequency: '3 times daily', durationDays: 5, quantity: 1 }], createdAt: new Date().toISOString(), dispensedAt: null },
      ];
    }
  }
  if (State.hospitals.length === 0) {
    State.hospitals = [
      { id: uid(), name: 'City Care Hospital', doctor: 'Dr. Rajesh Sharma', email: 'doctor@prescripto.app', address: '108 Health Avenue, Pune', plan: 'PRO', status: 'ACTIVE', joinedAt: new Date(Date.now()-86400000*30).toISOString() },
      { id: uid(), name: 'Green Valley Clinic', doctor: 'Dr. Priya Nair', email: 'priya@greenvalley.app', address: '45 MG Road, Nashik', plan: 'BASIC', status: 'ACTIVE', joinedAt: new Date(Date.now()-86400000*15).toISOString() },
      { id: uid(), name: 'Wellness Medical Center', doctor: 'Dr. Suresh Iyer', email: 'suresh@wellness.app', address: '12 Station Road, Aurangabad', plan: 'FREE', status: 'ACTIVE', joinedAt: new Date(Date.now()-86400000*7).toISOString() },
    ];
  }
  if (State.queries.length === 0) {
    State.queries = [
      { id: uid(), from: 'Dr. Rajesh Sharma', clinic: 'City Care Hospital', subject: 'Prescription print template issue', message: 'The Marathi font is not printing correctly on older printers.', status: 'OPEN', createdAt: new Date(Date.now()-86400000*2).toISOString(), response: '' },
      { id: uid(), from: 'Dr. Priya Nair', clinic: 'Green Valley Clinic', subject: 'Request to upgrade subscription plan', message: 'We would like to upgrade from BASIC to PRO plan. Please guide us through the process.', status: 'RESOLVED', createdAt: new Date(Date.now()-86400000*5).toISOString(), response: 'Your plan has been upgraded. Please login to verify.' },
    ];
  }
  if (State.subscriptions.length === 0) {
    State.subscriptions = State.hospitals.map(h => ({
      id: uid(), clinicId: h.id, clinicName: h.name, plan: h.plan,
      validUntil: new Date(Date.now() + 86400000*365).toISOString().split('T')[0], isActive: h.status === 'ACTIVE'
    }));
  }
  State.save();
}

/* ═══════════════════════════════════════════════════════
   5. ROUTER — Bulletproof View Isolation
   Each .view is position:fixed full-screen. Only .active is shown.
   Body is overflow:hidden — views scroll independently.
   ═══════════════════════════════════════════════════════ */
function navigate(view) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
  });

  // Show target view
  const el = document.getElementById('view-' + view);
  if (!el) {
    console.warn('[Router] View not found: view-' + view);
    return;
  }
  el.classList.add('active');
  State.currentView = view;

  // Scroll the view container back to top (body is overflow:hidden)
  el.scrollTop = 0;

  // Update page title
  const titles = {
    landing: 'Prescripto — Hospital Management Platform',
    login: 'Login — Prescripto',
    register: 'Register — Prescripto',
    doctor: 'Doctor Dashboard — Prescripto',
    pharmacist: 'Pharmacist Dashboard — Prescripto',
    'master-admin': 'Master Admin — Prescripto'
  };
  document.title = titles[view] || 'Prescripto';
}

function routeByRole(role) {
  switch (role) {
    case 'DOCTOR':       navigate('doctor'); initDoctorDashboard(); break;
    case 'PHARMACIST':   navigate('pharmacist'); initPharmacistDashboard(); break;
    case 'MASTER_ADMIN': navigate('master-admin'); initAdminDashboard(); break;
    default:             navigate('landing');
  }
}


/* ═══════════════════════════════════════════════════════
   6. AUTH
   ═══════════════════════════════════════════════════════ */
function selectLoginRole(btn, role) {
  State.loginRole = role;
  document.querySelectorAll('#loginRoleSelector .role-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  // Check demo accounts
  let user = null;
  Object.values(DEMO_ACCOUNTS).forEach(acc => {
    if (acc.email === email && acc.password === password) user = acc;
  });

  // Check registered users in localStorage
  if (!user) {
    const regUsers = JSON.parse(localStorage.getItem('prescripto_registered_users') || '[]');
    const found = regUsers.find(u => u.email === email && u.password === password);
    if (found) user = found;
  }

  if (!user) {
    errEl.textContent = 'Invalid email or password. Try the demo login buttons below.';
    errEl.style.display = 'block';
    return;
  }

  // Role check — for pharmacists created via store admin
  const btn = document.getElementById('loginBtn');
  btn.classList.add('btn-loading');
  setTimeout(() => {
    btn.classList.remove('btn-loading');
    State.currentUser = user;
    localStorage.setItem('prescripto_token', btoa(JSON.stringify(user)));
    State.token = localStorage.getItem('prescripto_token');
    toast('Welcome back, ' + (user.name.split(' ')[0] || 'User') + '!', 'success');
    routeByRole(user.role);
  }, 700);
}

function quickLogin(type) {
  const acc = DEMO_ACCOUNTS[type];
  document.getElementById('loginEmail').value = acc.email;
  document.getElementById('loginPassword').value = acc.password;
  // Select role
  const roleMap = { doctor: 'DOCTOR', pharmacist: 'PHARMACIST', admin: 'MASTER_ADMIN' };
  document.querySelectorAll('#loginRoleSelector .role-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.role === roleMap[type]);
  });
  State.loginRole = roleMap[type];
  handleLogin(new Event('submit'));
}

function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  btn.classList.add('btn-loading');
  setTimeout(() => {
    btn.classList.remove('btn-loading');
    const name  = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass  = document.getElementById('regPassword').value;
    const clinic = document.getElementById('regClinicName').value.trim();
    const address = document.getElementById('regClinicAddress').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const license = document.getElementById('regLicense').value.trim();

    // Check duplicate
    const regUsers = JSON.parse(localStorage.getItem('prescripto_registered_users') || '[]');
    if (regUsers.find(u => u.email === email)) {
      toast('This email is already registered. Please login.', 'error');
      return;
    }

    const newUser = { email, password: pass, role: 'DOCTOR', name, clinic, clinicAddress: address, phone, license };
    regUsers.push(newUser);
    localStorage.setItem('prescripto_registered_users', JSON.stringify(regUsers));

    // Add to hospitals list for admin
    const hosp = { id: uid(), name: clinic, doctor: name, email, address, plan: 'FREE', status: 'ACTIVE', joinedAt: new Date().toISOString() };
    State.hospitals.push(hosp);
    State.subscriptions.push({ id: uid(), clinicId: hosp.id, clinicName: clinic, plan: 'FREE', validUntil: new Date(Date.now()+86400000*30).toISOString().split('T')[0], isActive: true });
    State.save();

    State.currentUser = newUser;
    toast('Hospital registered! Welcome to Prescripto, ' + name.split(' ')[0] + '!', 'success');
    routeByRole('DOCTOR');
  }, 900);
}

function confirmLogout() {
  if (confirm('Are you sure you want to logout?')) {
    State.currentUser = null;
    State.token = null;
    localStorage.removeItem('prescripto_token');
    navigate('landing');
    toast('Logged out successfully.', 'success');
  }
}

function handleAddStoreAdmin(e) {
  e.preventDefault();
  const name = document.getElementById('storeAdminName').value.trim();
  const email = document.getElementById('storeAdminEmail').value.trim().toLowerCase();
  const pass = document.getElementById('storeAdminPassword').value;

  if (!State.currentUser) return;
  const clinic = State.currentUser.clinic || 'Clinic';

  const regUsers = JSON.parse(localStorage.getItem('prescripto_registered_users') || '[]');
  if (regUsers.find(u => u.email === email)) {
    toast('This email is already registered.', 'warning'); return;
  }
  const newPharm = { email, password: pass, role: 'PHARMACIST', name, clinic, clinicAddress: State.currentUser.clinicAddress || '' };
  regUsers.push(newPharm);
  localStorage.setItem('prescripto_registered_users', JSON.stringify(regUsers));

  State.storeAdmins.push({ id: uid(), name, email, clinic, addedAt: new Date().toISOString() });
  State.save();
  closeModal('addStoreAdminModal');
  renderStoreAdminsList();
  toast('Pharmacist account created: ' + email, 'success');
}

/* ═══════════════════════════════════════════════════════
   7. DOCTOR DASHBOARD
   ═══════════════════════════════════════════════════════ */
function initDoctorDashboard() {
  const u = State.currentUser;
  if (!u) return;
  const initials = u.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  setEl('drAvatar', initials);
  setEl('drName', u.name);
  setEl('drClinic', u.clinic || 'Your Clinic');
  showDrPanel('overview');
  applyLang();
}

function showDrPanel(panel) {
  ['overview', 'patients', 'prescribe', 'history', 'store', 'patient-history'].forEach(p => {
    const el = document.getElementById('dr-panel-' + p);
    if (el) el.style.display = 'none';
    const nav = document.getElementById('nav-dr-' + (p === 'patient-history' ? 'patients-hist' : p));
    if (nav) nav.classList.remove('active');
  });
  const el = document.getElementById('dr-panel-' + panel);
  if (el) el.style.display = 'block';
  State.drActivePanel = panel;

  const navMap = { 'overview': 'overview', 'patients': 'patients', 'prescribe': 'prescribe', 'history': 'history', 'store': 'store', 'patient-history': 'patients-hist' };
  const navId = 'nav-dr-' + (navMap[panel] || panel);
  const navEl = document.getElementById(navId);
  if (navEl) navEl.classList.add('active');

  const titles = { overview: 'Overview', patients: 'Patients', prescribe: 'New Prescription', history: 'Prescription History', store: 'Store Admin Management', 'patient-history': 'Patient History' };
  setEl('drPageTitle', titles[panel] || panel);

  if (panel === 'overview') renderDrOverview();
  if (panel === 'patients') { renderPatientsTable(); populateRxPatientSelects(); }
  if (panel === 'prescribe') { initRxForm(); populateRxPatientSelects(); }
  if (panel === 'history') renderHistoryTable();
  if (panel === 'store') renderStoreAdminsList();
  if (panel === 'patient-history') { populateHistoryPatientSelect(); }
  closeSidebar();
}

function renderDrOverview() {
  const rxs = State.prescriptions;
  const today = new Date().toDateString();
  setEl('mTotalPatients', State.patients.length);
  setEl('mTotalRx', rxs.length);
  setEl('mPendingRx', rxs.filter(r => r.status === 'PENDING').length);
  setEl('mTodayRx', rxs.filter(r => new Date(r.createdAt).toDateString() === today).length);
  renderRecentRxTable();
}

function renderRecentRxTable() {
  const tbody = document.getElementById('recentRxTableBody');
  if (!tbody) return;
  const rxs = [...State.prescriptions].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
  if (!rxs.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:40px;">No prescriptions written yet.</td></tr>'; return; }
  tbody.innerHTML = rxs.map(rx => {
    const pat = State.patients.find(p => p.id === rx.patientId);
    return `<tr>
      <td data-label="Rx #"><span class="badge badge-indigo">${esc(rx.rxNumber)}</span></td>
      <td data-label="Patient"><strong>${esc(pat?.name || 'Unknown')}</strong></td>
      <td data-label="Diagnosis">${esc(rx.diagnosis)}</td>
      <td data-label="Status">${statusBadge(rx.status)}</td>
      <td data-label="Date">${formatDate(rx.createdAt)}</td>
      <td data-label="Action">
        <button class="btn btn-sm btn-secondary" onclick="openPrintModal('${rx.id}')"><i class="fa-solid fa-print"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function renderPatientsTable() {
  const tbody = document.getElementById('patientsTableBody');
  if (!tbody) return;
  const search = (document.getElementById('patientSearchInput')?.value || '').toLowerCase();
  const genderFilter = document.getElementById('patientGenderFilter')?.value || '';
  let patients = State.patients.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search) || (p.village || '').toLowerCase().includes(search);
    const matchGender = !genderFilter || p.gender === genderFilter;
    return matchSearch && matchGender;
  });
  if (!patients.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:40px;">No patients found.</td></tr>';
    return;
  }
  tbody.innerHTML = patients.map(p => {
    const age = calcAge(p.dob);
    const ageStr = age ? `${age.y}y ${age.m}m` : '—';
    const avatarColor = p.gender === 'FEMALE' ? 'avatar-purple' : 'avatar-teal';
    return `<tr>
      <td data-label="Name">
        <div class="flex items-center gap-3">
          <div class="patient-avatar ${avatarColor}" style="width:34px;height:34px;font-size:13px;">${p.name.charAt(0)}</div>
          <div><div class="font-bold">${esc(p.name)}</div><div class="text-xs text-muted">${esc(p.bloodGroup || '')}</div></div>
        </div>
      </td>
      <td data-label="Village">${esc(p.village)}</td>
      <td data-label="Age"><span class="age-badge"><i class="fa-solid fa-calendar-days"></i> ${ageStr}</span></td>
      <td data-label="Gender">${genderBadge(p.gender)}</td>
      <td data-label="Phone">${esc(p.phone || '—')}</td>
      <td data-label="Action">
        <div class="flex gap-2">
          <button class="btn btn-sm btn-secondary" onclick="quickPrescribePatient('${p.id}')"><i class="fa-solid fa-prescription"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deletePatient('${p.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function handleAddPatient(e) {
  e.preventDefault();
  const p = {
    id: uid(), name: document.getElementById('pName').value.trim(),
    village: document.getElementById('pVillage').value.trim(),
    dob: document.getElementById('pDob').value,
    gender: document.getElementById('pGender').value,
    phone: document.getElementById('pPhone').value.trim(),
    bloodGroup: document.getElementById('pBloodGroup').value,
    history: document.getElementById('pHistory').value.trim(),
    createdAt: new Date().toISOString()
  };
  State.patients.push(p);
  State.save();
  closeModal('addPatientModal');
  document.getElementById('addPatientForm').reset();
  document.getElementById('agePreviewBox').style.display = 'none';
  renderPatientsTable();
  toast('Patient registered: ' + p.name, 'success');
}

function deletePatient(id) {
  if (!confirm('Delete this patient and all their records?')) return;
  State.patients = State.patients.filter(p => p.id !== id);
  State.prescriptions = State.prescriptions.filter(r => r.patientId !== id);
  State.save();
  renderPatientsTable();
  toast('Patient record deleted.', 'success');
}

function quickPrescribePatient(patientId) {
  showDrPanel('prescribe');
  setTimeout(() => {
    const sel = document.getElementById('rxPatientSelect');
    if (sel) sel.value = patientId;
  }, 100);
}

function previewAge() {
  const dob = document.getElementById('pDob').value;
  const box = document.getElementById('agePreviewBox');
  const val = document.getElementById('agePreviewValue');
  if (!dob) { box.style.display = 'none'; return; }
  const age = calcAge(dob);
  if (age) { val.textContent = `${age.y} years, ${age.m} months, ${age.d} days`; box.style.display = 'inline-flex'; }
}

/* ── Prescription Writer ── */
let rxRowCount = 0;
function initRxForm() {
  const container = document.getElementById('rxItemsContainer');
  if (!container) return;
  container.innerHTML = '';
  rxRowCount = 0;
  addRxRow();
}

function addRxRow() {
  rxRowCount++;
  const meds = State.medicines;
  const medOptions = meds.map(m => `<option value="${m.id}" data-name="${esc(m.name)}">${esc(m.name)}</option>`).join('');
  const lang = State.currentLang;
  const freqOpts = {
    en: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', 'SOS', 'Morning only', 'Night only'],
    mr: ['१-०-१', '१-१-१', '०-०-१', 'सकाळी', 'रात्री', 'आवश्यकतेनुसार'],
    hi: ['1-0-1', '1-1-1', '0-0-1', 'सुबह', 'रात', 'आवश्यकतानुसार']
  };
  const opts = freqOpts[lang] || freqOpts.en;
  const container = document.getElementById('rxItemsContainer');
  const row = document.createElement('div');
  row.className = 'rx-item-row';
  row.id = 'rxRow-' + rxRowCount;
  row.innerHTML = `
    <div>
      <div class="rx-number">${rxRowCount}</div>
      <select class="form-control" id="rxMed-${rxRowCount}" style="margin-top: var(--space-2);" required>
        <option value="">Select medicine</option>
        ${medOptions}
      </select>
    </div>
    <div>
      <input class="form-control" id="rxDosage-${rxRowCount}" type="text" placeholder="Dosage (e.g. 500mg)" required>
    </div>
    <div>
      <select class="form-control" id="rxFreq-${rxRowCount}" required>
        ${opts.map(o => `<option>${o}</option>`).join('')}
      </select>
    </div>
    <div>
      <input class="form-control" id="rxDays-${rxRowCount}" type="number" placeholder="Days" min="1" required value="5">
    </div>
    <div>
      <button type="button" class="btn btn-sm btn-danger btn-icon" onclick="removeRxRow('rxRow-${rxRowCount}')"><i class="fa-solid fa-trash"></i></button>
    </div>
  `;
  container.appendChild(row);
}

function removeRxRow(rowId) {
  const el = document.getElementById(rowId);
  if (el) el.remove();
}

function handleGenerateRx(e) {
  e.preventDefault();
  const patientId = document.getElementById('rxPatientSelect').value;
  const diagnosis = document.getElementById('rxDiagnosis').value.trim();
  const notes = document.getElementById('rxNotes').value.trim();

  const items = [];
  for (let i = 1; i <= rxRowCount; i++) {
    const medEl = document.getElementById('rxMed-' + i);
    if (!medEl) continue;
    const medId = medEl.value;
    if (!medId) continue;
    const med = State.medicines.find(m => m.id === medId);
    items.push({
      medicineId: medId,
      medicineName: med?.name || '—',
      dosage: document.getElementById('rxDosage-' + i)?.value || '',
      frequency: document.getElementById('rxFreq-' + i)?.value || '',
      durationDays: parseInt(document.getElementById('rxDays-' + i)?.value) || 5,
      quantity: Math.ceil((parseInt(document.getElementById('rxDays-' + i)?.value) || 5) * 3)
    });
  }

  if (!items.length) { toast('Add at least one medicine.', 'warning'); return; }

  const rxNum = 'RX-' + new Date().getFullYear() + String(State.prescriptions.length + 1).padStart(4, '0');
  const rx = { id: uid(), rxNumber: rxNum, patientId, diagnosis, notes, status: 'PENDING', items, createdAt: new Date().toISOString(), dispensedAt: null };
  State.prescriptions.push(rx);
  State.save();
  toast('Prescription ' + rxNum + ' issued!', 'success');
  clearRxForm();
  openPrintModal(rx.id);
}

function clearRxForm() {
  const form = document.getElementById('prescriptionForm');
  if (form) form.reset();
  initRxForm();
}

function filterRxStatus(status, btn) {
  State.rxFilter = status;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderHistoryTable();
}

function renderHistoryTable() {
  const tbody = document.getElementById('historyRxTableBody');
  if (!tbody) return;
  let rxs = [...State.prescriptions].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  if (State.rxFilter) rxs = rxs.filter(r => r.status === State.rxFilter);
  if (!rxs.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:40px;">No prescriptions found.</td></tr>';
    return;
  }
  tbody.innerHTML = rxs.map(rx => {
    const pat = State.patients.find(p => p.id === rx.patientId);
    const medNames = rx.items.map(i => i.medicineName).join(', ');
    return `<tr>
      <td data-label="Rx #"><span class="badge badge-indigo">${esc(rx.rxNumber)}</span></td>
      <td data-label="Patient"><strong>${esc(pat?.name || 'Unknown')}</strong></td>
      <td data-label="Medicines"><span class="text-xs text-muted">${esc(medNames.substring(0,40))}${medNames.length > 40 ? '…' : ''}</span></td>
      <td data-label="Status">${statusBadge(rx.status)}</td>
      <td data-label="Date">${formatDate(rx.createdAt)}</td>
      <td data-label="Action">
        <button class="btn btn-sm btn-secondary" onclick="openPrintModal('${rx.id}')"><i class="fa-solid fa-print"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function populateRxPatientSelects() {
  ['rxPatientSelect', 'historyPatientSelect'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = `<option value="">— Select Patient —</option>` +
      State.patients.map(p => `<option value="${p.id}">${esc(p.name)} — ${esc(p.village || '')}</option>`).join('');
    if (val) sel.value = val;
  });
}

function populateHistoryPatientSelect() {
  populateRxPatientSelects();
}

function renderStoreAdminsList() {
  const el = document.getElementById('storeAdminsList');
  if (!el) return;
  if (!State.storeAdmins.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-user-plus"></i></div><p>No pharmacists assigned yet.</p></div>';
    return;
  }
  el.innerHTML = State.storeAdmins.map(a => `
    <div class="hospital-card" style="margin-bottom: var(--space-3);">
      <div class="flex items-center gap-3">
        <div class="hospital-icon"><i class="fa-solid fa-user-nurse"></i></div>
        <div><div class="font-bold">${esc(a.name)}</div><div class="text-sm text-muted">${esc(a.email)}</div></div>
      </div>
      <div class="flex gap-2 items-center">
        <span class="badge badge-teal">Active</span>
        <button class="btn btn-sm btn-danger" onclick="removeStoreAdmin('${a.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function removeStoreAdmin(id) {
  if (!confirm('Remove this store admin?')) return;
  State.storeAdmins = State.storeAdmins.filter(a => a.id !== id);
  State.save();
  renderStoreAdminsList();
  toast('Store admin removed.', 'success');
}

function renderPatientTimeline() {
  const patId = document.getElementById('historyPatientSelect')?.value;
  const el = document.getElementById('patientTimeline');
  if (!el) return;
  if (!patId) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-timeline"></i></div><p>Select a patient to view their complete history.</p></div>';
    return;
  }
  const pat = State.patients.find(p => p.id === patId);
  const rxs = State.prescriptions.filter(r => r.patientId === patId).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  const age = calcAge(pat?.dob);
  const ageStr = age ? `${age.y} years, ${age.m} months` : '—';

  el.innerHTML = `
    <div class="patient-card" style="margin-bottom: var(--space-6);">
      <div class="patient-avatar ${pat?.gender === 'FEMALE' ? 'avatar-purple' : 'avatar-teal'}">${pat?.name?.charAt(0) || '?'}</div>
      <div class="patient-info">
        <div class="patient-name">${esc(pat?.name || '—')}</div>
        <div class="patient-meta">${esc(pat?.village || '')} • ${esc(pat?.phone || '')} • ${esc(pat?.bloodGroup || '')} • <span class="age-badge" style="display:inline-flex;"><i class="fa-solid fa-cake-candles"></i> ${ageStr}</span></div>
        ${pat?.history ? `<div class="text-xs text-muted mt-1">⚕️ ${esc(pat.history)}</div>` : ''}
      </div>
      <button class="btn btn-sm btn-secondary" onclick="printPatientHistory('${patId}')"><i class="fa-solid fa-print"></i> Print</button>
    </div>
    ${rxs.length === 0 ? '<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-prescription"></i></div><p>No prescriptions for this patient yet.</p></div>' : ''}
    <div class="timeline">
      ${rxs.map(rx => `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-date">${formatDate(rx.createdAt)}</div>
          <div class="timeline-card">
            <div class="flex justify-between items-center mb-4">
              <div><strong>${esc(rx.rxNumber)}</strong> — <em>${esc(rx.diagnosis)}</em></div>
              ${statusBadge(rx.status)}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${rx.items.map(it => `<div class="text-sm">💊 <strong>${esc(it.medicineName)}</strong> — ${esc(it.dosage)}, ${esc(it.frequency)}, ${it.durationDays} days</div>`).join('')}
            </div>
            ${rx.notes ? `<div class="text-xs text-muted mt-2">📝 ${esc(rx.notes)}</div>` : ''}
            <div style="margin-top: var(--space-3);">
              <button class="btn btn-sm btn-secondary" onclick="openPrintModal('${rx.id}')"><i class="fa-solid fa-print"></i> Print</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function printPatientHistory(patId) {
  const pat = State.patients.find(p => p.id === patId);
  const rxs = State.prescriptions.filter(r => r.patientId === patId);
  toast('Patient history print — use browser Ctrl+P after opening prescription.', 'info');
}

/* ═══════════════════════════════════════════════════════
   8. PHARMACIST DASHBOARD
   ═══════════════════════════════════════════════════════ */
function initPharmacistDashboard() {
  const u = State.currentUser;
  if (u) {
    const initials = u.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    setEl('pharmAvatar', initials);
    setEl('pharmName', u.name);
    setEl('pharmClinic', u.clinic || 'Your Clinic');
  }
  showPhPanel('inventory');
  applyLang();
}

function showPhPanel(panel) {
  ['inventory', 'dispense', 'stock'].forEach(p => {
    const el = document.getElementById('ph-panel-' + p);
    if (el) el.style.display = 'none';
    const nav = document.getElementById('nav-ph-' + p);
    if (nav) nav.classList.remove('active');
  });
  const el = document.getElementById('ph-panel-' + panel);
  if (el) el.style.display = 'block';
  const nav = document.getElementById('nav-ph-' + panel);
  if (nav) nav.classList.add('active');

  const titles = { inventory: 'Inventory', dispense: 'Dispense Queue', stock: 'Stock Ledger' };
  setEl('pharmPageTitle', titles[panel] || panel);
  State.phActivePanel = panel;

  updatePharmMetrics();
  if (panel === 'inventory') renderInventoryTable();
  if (panel === 'dispense') renderDispenseQueue();
  if (panel === 'stock') renderStockLedgerTable();
  closeSidebar();
}

function updatePharmMetrics() {
  const meds = State.medicines;
  const today = new Date();
  setEl('pharmTotalMeds', meds.length);
  setEl('pharmLowStock', meds.filter(m => m.stock <= m.minAlert).length);
  setEl('pharmExpiring', meds.filter(m => new Date(m.expiry) < today).length);
  setEl('pharmPending', State.prescriptions.filter(r => r.status === 'PENDING').length);
  const badge = document.getElementById('pendingCountBadge');
  const count = State.prescriptions.filter(r => r.status === 'PENDING').length;
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'inline' : 'none'; }
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;
  const search = (document.getElementById('inventorySearch')?.value || '').toLowerCase();
  const cat = document.getElementById('inventoryCategoryFilter')?.value || '';
  const today = new Date();
  let meds = State.medicines.filter(m => {
    const matchS = !search || m.name.toLowerCase().includes(search) || (m.batch||'').toLowerCase().includes(search);
    const matchC = !cat || m.category === cat;
    return matchS && matchC;
  });
  if (!meds.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding:40px;">No medicines match filters.</td></tr>';
    return;
  }
  tbody.innerHTML = meds.map(m => {
    const expired = new Date(m.expiry) < today;
    const lowStock = m.stock <= m.minAlert;
    const rowClass = expired ? 'expired-row' : '';
    const statusBadgeHtml = expired ? '<span class="badge badge-red-flag"><i class="fa-solid fa-triangle-exclamation"></i> Expired</span>' :
      lowStock ? '<span class="badge badge-amber"><i class="fa-solid fa-arrow-trend-down"></i> Low Stock</span>' :
      '<span class="badge badge-teal"><i class="fa-solid fa-circle-check"></i> In Stock</span>';
    const imgHtml = m.imgUrl ?
      `<img src="${esc(m.imgUrl)}" class="table-med-img" alt="${esc(m.name)}" onerror="this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'42\' height=\'42\' fill=\'%2310b981\'><rect width=\'42\' height=\'42\' rx=\'8\' fill=\'%23132a1a\'/><text x=\'50%25\' y=\'55%25\' font-size=\'20\' text-anchor=\'middle\' dy=\'.3em\'>💊</text></svg>'">` :
      `<div style="width:42px;height:42px;background:rgba(16,185,129,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;">💊</div>`;
    return `<tr class="${rowClass}">
      <td data-label="Image">${imgHtml}</td>
      <td data-label="Medicine"><strong>${esc(m.name)}</strong></td>
      <td data-label="Category"><span class="badge badge-blue">${esc(m.category)}</span></td>
      <td data-label="Stock"><strong style="color:${m.stock <= m.minAlert ? '#f87171' : 'var(--brand-primary)'};">${m.stock}</strong> ${esc(m.unit)}</td>
      <td data-label="Price">₹${m.price.toFixed(2)}</td>
      <td data-label="Expiry">${esc(m.expiry)}</td>
      <td data-label="Batch"><code style="font-size:11px;">${esc(m.batch)}</code></td>
      <td data-label="Status">${statusBadgeHtml}</td>
      <td data-label="Action">
        <div class="flex gap-2">
          <button class="btn btn-sm btn-secondary" onclick="openRestockModal('${m.id}')"><i class="fa-solid fa-plus"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteMedicine('${m.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function handleAddMedicine(e) {
  e.preventDefault();
  const med = {
    id: uid(),
    name: document.getElementById('mName').value.trim(),
    category: document.getElementById('mCategory').value,
    stock: parseInt(document.getElementById('mStock').value),
    price: parseFloat(document.getElementById('mPrice').value),
    unit: document.getElementById('mUnit').value,
    minAlert: parseInt(document.getElementById('mAlert').value) || 10,
    expiry: document.getElementById('mExpiry').value,
    batch: document.getElementById('mBatch').value.trim(),
    imgUrl: document.getElementById('mImgUrl').value.trim(),
    providerName: document.getElementById('mProviderName').value.trim(),
    providerContact: document.getElementById('mProviderContact').value.trim(),
    hsnCode: document.getElementById('mHsnCode').value.trim(),
    rackLocation: document.getElementById('mRackLocation').value.trim(),
    createdAt: new Date().toISOString()
  };
  State.medicines.push(med);
  // Log stock entry
  State.stockLedger.push({ id: uid(), medicineId: med.id, medicineName: med.name, type: 'INITIAL_ADD', qty: med.stock, notes: 'Initial inventory', createdAt: new Date().toISOString() });
  State.save();
  closeModal('addMedicineModal');
  document.getElementById('addMedicineForm').reset();
  renderInventoryTable();
  renderStockLedgerTable();
  updatePharmMetrics();
  toast('Medicine added: ' + med.name, 'success');
}

function deleteMedicine(id) {
  if (!confirm('Remove this medicine from inventory?')) return;
  State.medicines = State.medicines.filter(m => m.id !== id);
  State.save();
  renderInventoryTable();
  renderStockLedgerTable();
  updatePharmMetrics();
  toast('Medicine removed.', 'success');
}

function openRestockModal(medId) {
  const med = State.medicines.find(m => m.id === medId);
  if (!med) return;
  document.getElementById('restockMedId').value = medId;
  setEl('restockMedName', med.name);
  setEl('restockCurrentStock', `Current Stock: ${med.stock} ${med.unit}`);
  document.getElementById('restockQuantity').value = '';
  document.getElementById('restockBatch').value = '';
  document.getElementById('restockExpiry').value = '';
  document.getElementById('restockNotes').value = '';
  openModal('restockModal');
}

function handleRestockSubmit(e) {
  e.preventDefault();
  const medId = document.getElementById('restockMedId').value;
  const qty = parseInt(document.getElementById('restockQuantity').value);
  const batch = document.getElementById('restockBatch').value.trim();
  const expiry = document.getElementById('restockExpiry').value;
  const notes = document.getElementById('restockNotes').value.trim();

  const med = State.medicines.find(m => m.id === medId);
  if (!med) return;
  med.stock += qty;
  if (batch) med.batch = batch;
  if (expiry) med.expiry = expiry;
  State.stockLedger.push({ id: uid(), medicineId: medId, medicineName: med.name, type: 'RESTOCK', qty, notes, createdAt: new Date().toISOString() });
  State.save();
  closeModal('restockModal');
  renderInventoryTable();
  renderStockLedgerTable();
  updatePharmMetrics();
  toast(`Restocked ${qty} units of ${med.name}`, 'success');
}

function renderDispenseQueue() {
  const el = document.getElementById('dispenseQueueList');
  if (!el) return;
  const pending = State.prescriptions.filter(r => r.status === 'PENDING');
  if (!pending.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-check-double"></i></div><p>No pending prescriptions. All caught up!</p></div>';
    return;
  }
  el.innerHTML = pending.map(rx => {
    const pat = State.patients.find(p => p.id === rx.patientId);
    const itemsHtml = rx.items.map(it => {
      const med = State.medicines.find(m => m.id === it.medicineId);
      const inStock = med && med.stock >= it.quantity;
      return `<div class="flex justify-between items-center" style="padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
        <div class="text-sm"><strong>${esc(it.medicineName)}</strong> — ${esc(it.dosage)} | ${esc(it.frequency)} | ${it.durationDays} days</div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted">Qty: ${it.quantity}</span>
          ${inStock ? '<span class="badge badge-teal">✓ In Stock</span>' : '<span class="badge badge-red">✗ Out of Stock</span>'}
        </div>
      </div>`;
    }).join('');
    const canDispense = rx.items.every(it => {
      const med = State.medicines.find(m => m.id === it.medicineId);
      return med && med.stock >= it.quantity;
    });
    return `<div class="dispense-card">
      <div class="dispense-header">
        <div class="flex items-center gap-3">
          <span class="badge badge-indigo">${esc(rx.rxNumber)}</span>
          <strong>${esc(pat?.name || 'Unknown Patient')}</strong>
          <span class="text-xs text-muted">${esc(rx.diagnosis)}</span>
        </div>
        <div class="flex gap-2 items-center">
          <span class="text-xs text-muted">${formatDate(rx.createdAt)}</span>
          ${canDispense
            ? `<button class="btn btn-sm btn-primary" onclick="dispenseRx('${rx.id}')"><i class="fa-solid fa-check"></i> Dispense</button>`
            : `<button class="btn btn-sm btn-secondary" disabled title="Insufficient stock"><i class="fa-solid fa-xmark"></i> Cannot Dispense</button>`
          }
        </div>
      </div>
      <div class="dispense-body">${itemsHtml}</div>
    </div>`;
  }).join('');
}

function dispenseRx(rxId) {
  const rx = State.prescriptions.find(r => r.id === rxId);
  if (!rx) return;
  // Deduct stock atomically
  let failed = false;
  rx.items.forEach(it => {
    const med = State.medicines.find(m => m.id === it.medicineId);
    if (!med || med.stock < it.quantity) { failed = true; return; }
    med.stock -= it.quantity;
    State.stockLedger.push({ id: uid(), medicineId: med.id, medicineName: med.name, type: 'DISPENSED', qty: -it.quantity, notes: `Dispensed via ${rx.rxNumber}`, createdAt: new Date().toISOString() });
  });
  if (failed) { toast('Insufficient stock for one or more medicines.', 'error'); return; }
  rx.status = 'DISPENSED';
  rx.dispensedAt = new Date().toISOString();
  State.save();
  renderDispenseQueue();
  updatePharmMetrics();
  toast('Prescription ' + rx.rxNumber + ' dispensed successfully!', 'success');
}

function renderStockLedgerTable() {
  const tbody = document.getElementById('stockLedgerTableBody');
  if (!tbody) return;
  const search = (document.getElementById('stockSearchInput')?.value || '').toLowerCase();
  const today = new Date();
  let meds = State.medicines.filter(m => {
    return !search || m.name.toLowerCase().includes(search) ||
      (m.providerName || '').toLowerCase().includes(search) ||
      (m.hsnCode || '').toLowerCase().includes(search);
  });
  if (!meds.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding:40px;">No medicines found.</td></tr>';
    return;
  }
  tbody.innerHTML = meds.map(m => {
    const expired = new Date(m.expiry) < today;
    const lowStock = m.stock <= m.minAlert;
    const statusHtml = expired ? '<span class="badge badge-red-flag"><i class="fa-solid fa-triangle-exclamation"></i> Expired</span>' :
      lowStock ? '<span class="badge badge-amber">Low Stock</span>' :
      '<span class="badge badge-teal">OK</span>';
    const imgHtml = m.imgUrl ?
      `<img src="${esc(m.imgUrl)}" class="table-med-img" alt="${esc(m.name)}" onerror="this.replaceWith(document.createTextNode('💊'))">` :
      `<div style="width:42px;height:42px;background:rgba(16,185,129,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;">💊</div>`;
    return `<tr>
      <td data-label="Image">${imgHtml}</td>
      <td data-label="Medicine"><strong>${esc(m.name)}</strong><div class="text-xs text-muted">${esc(m.category)}</div></td>
      <td data-label="Stock"><strong>${m.stock}</strong> ${esc(m.unit)}</td>
      <td data-label="Expiry"><span style="color:${expired?'#ef4444':'inherit'}">${esc(m.expiry)}</span></td>
      <td data-label="Provider"><div>${esc(m.providerName || '—')}</div><div class="text-xs text-muted">${esc(m.providerContact || '')}</div></td>
      <td data-label="HSN"><code style="font-size:11px;">${esc(m.hsnCode || '—')}</code></td>
      <td data-label="Rack"><span class="badge badge-gray">${esc(m.rackLocation || '—')}</span></td>
      <td data-label="Status">${statusHtml}</td>
      <td data-label="Action"><button class="btn btn-sm btn-secondary" onclick="openRestockModal('${m.id}')"><i class="fa-solid fa-rotate"></i> Restock</button></td>
    </tr>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════
   9. MASTER ADMIN DASHBOARD
   ═══════════════════════════════════════════════════════ */
function initAdminDashboard() {
  showAdminPanel('overview');
}

function showAdminPanel(panel) {
  ['overview', 'hospitals', 'subscriptions', 'queries', 'announcements'].forEach(p => {
    const el = document.getElementById('ma-panel-' + p);
    if (el) el.style.display = 'none';
    const nav = document.getElementById('nav-ma-' + p);
    if (nav) nav.classList.remove('active');
  });
  const el = document.getElementById('ma-panel-' + panel);
  if (el) el.style.display = 'block';
  const nav = document.getElementById('nav-ma-' + panel);
  if (nav) nav.classList.add('active');

  const titles = { overview: 'Platform Analytics', hospitals: 'Registered Hospitals', subscriptions: 'Subscription Management', queries: 'Support Query Inbox', announcements: 'Announcements' };
  setEl('adminPageTitle', titles[panel] || panel);
  State.maActivePanel = panel;

  if (panel === 'overview') renderAdminOverview();
  if (panel === 'hospitals') renderHospitalsList();
  if (panel === 'subscriptions') renderSubscriptionsList();
  if (panel === 'queries') renderQueriesList();
  closeSidebar();
}

function renderAdminOverview() {
  const openQ = State.queries.filter(q => q.status === 'OPEN').length;
  const activeSubs = State.subscriptions.filter(s => s.isActive).length;
  setEl('maTotalHospitals', State.hospitals.length);
  setEl('maTotalUsers', State.hospitals.length + State.storeAdmins.length);
  setEl('maOpenQueries', openQ);
  setEl('maActiveSubscriptions', activeSubs);
  const badge = document.getElementById('queryCountBadge');
  if (badge) { badge.textContent = openQ; badge.style.display = openQ > 0 ? 'inline' : 'none'; }

  const el = document.getElementById('recentHospitalsList');
  if (el) {
    const recent = [...State.hospitals].sort((a,b) => new Date(b.joinedAt)-new Date(a.joinedAt)).slice(0,3);
    el.innerHTML = recent.map(h => hospitalCardHtml(h)).join('');
  }
}

function renderHospitalsList() {
  const el = document.getElementById('hospitalsList');
  if (!el) return;
  const search = (document.getElementById('hospitalSearch')?.value || '').toLowerCase();
  const plan = document.getElementById('subscriptionFilter')?.value || '';
  let hospitals = State.hospitals.filter(h => {
    const matchS = !search || h.name.toLowerCase().includes(search) || h.doctor.toLowerCase().includes(search);
    const matchP = !plan || h.plan === plan;
    return matchS && matchP;
  });
  if (!hospitals.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">🏥</div><p>No hospitals found.</p></div>'; return; }
  el.innerHTML = hospitals.map(h => hospitalCardHtml(h)).join('');
}

function hospitalCardHtml(h) {
  const planBadge = h.plan === 'PRO' ? 'badge-purple' : h.plan === 'BASIC' ? 'badge-blue' : 'badge-gray';
  const statusBadge_ = h.status === 'ACTIVE' ? 'badge-teal' : 'badge-red';
  return `<div class="hospital-card" style="margin-bottom: var(--space-3);">
    <div class="flex items-center gap-3" style="flex: 1; min-width: 200px;">
      <div class="hospital-icon"><i class="fa-solid fa-hospital"></i></div>
      <div>
        <div class="font-bold">${esc(h.name)}</div>
        <div class="text-sm text-muted">👨‍⚕️ ${esc(h.doctor)} • ${esc(h.address || '')}</div>
        <div class="text-xs text-muted">${esc(h.email)}</div>
      </div>
    </div>
    <div class="flex gap-2 items-center flex-wrap">
      <span class="badge ${planBadge}">${h.plan}</span>
      <span class="badge ${statusBadge_}">${h.status}</span>
      <button class="btn btn-sm btn-${h.status === 'ACTIVE' ? 'danger' : 'primary'}" onclick="toggleHospitalStatus('${h.id}')">
        ${h.status === 'ACTIVE' ? '<i class="fa-solid fa-ban"></i> Block' : '<i class="fa-solid fa-unlock"></i> Unblock'}
      </button>
      <button class="btn btn-sm btn-secondary" onclick="changeHospitalPlan('${h.id}')">
        <i class="fa-solid fa-credit-card"></i> Plan
      </button>
    </div>
  </div>`;
}

function toggleHospitalStatus(id) {
  const h = State.hospitals.find(h => h.id === id);
  if (!h) return;
  h.status = h.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
  State.save();
  renderHospitalsList();
  renderAdminOverview();
  toast(`Hospital ${h.status === 'ACTIVE' ? 'unblocked' : 'blocked'}: ${h.name}`, h.status === 'ACTIVE' ? 'success' : 'warning');
}

function changeHospitalPlan(id) {
  const h = State.hospitals.find(h => h.id === id);
  if (!h) return;
  const plans = ['FREE', 'BASIC', 'PRO'];
  const current = plans.indexOf(h.plan);
  const newPlan = plans[(current + 1) % plans.length];
  h.plan = newPlan;
  const sub = State.subscriptions.find(s => s.clinicId === id);
  if (sub) sub.plan = newPlan;
  State.save();
  renderHospitalsList();
  toast(`Plan updated to ${newPlan} for ${h.name}`, 'success');
}

function renderSubscriptionsList() {
  const el = document.getElementById('subscriptionsList');
  if (!el) return;
  if (!State.subscriptions.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">💳</div><p>No subscriptions found.</p></div>'; return; }
  el.innerHTML = `<div class="table-container"><table class="data-table">
    <thead><tr><th>Hospital</th><th>Plan</th><th>Valid Until</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${State.subscriptions.map(s => `<tr>
      <td data-label="Hospital"><strong>${esc(s.clinicName)}</strong></td>
      <td data-label="Plan"><span class="badge ${s.plan === 'PRO' ? 'badge-purple' : s.plan === 'BASIC' ? 'badge-blue' : 'badge-gray'}">${s.plan}</span></td>
      <td data-label="Valid Until">${esc(s.validUntil)}</td>
      <td data-label="Status"><span class="badge ${s.isActive ? 'badge-teal' : 'badge-red'}">${s.isActive ? 'Active' : 'Inactive'}</span></td>
      <td data-label="Action">
        <button class="btn btn-sm btn-secondary" onclick="toggleSubscription('${s.id}')">
          <i class="fa-solid fa-${s.isActive ? 'pause' : 'play'}"></i> ${s.isActive ? 'Suspend' : 'Activate'}
        </button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function toggleSubscription(id) {
  const s = State.subscriptions.find(s => s.id === id);
  if (!s) return;
  s.isActive = !s.isActive;
  State.save();
  renderSubscriptionsList();
  toast(`Subscription ${s.isActive ? 'activated' : 'suspended'} for ${s.clinicName}`, s.isActive ? 'success' : 'warning');
}

function renderQueriesList() {
  const el = document.getElementById('queriesList');
  const badge = document.getElementById('openQueryCount');
  if (!el) return;
  const open = State.queries.filter(q => q.status === 'OPEN').length;
  if (badge) badge.textContent = open + ' Open';
  const badge2 = document.getElementById('queryCountBadge');
  if (badge2) { badge2.textContent = open; badge2.style.display = open > 0 ? 'inline' : 'none'; }

  if (!State.queries.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📥</div><p>No support queries.</p></div>'; return; }
  el.innerHTML = [...State.queries].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).map(q => `
    <div class="query-card ${q.status === 'OPEN' ? 'unread' : ''}">
      <div class="flex justify-between items-center mb-4">
        <div>
          <strong>${esc(q.subject)}</strong>
          <div class="text-sm text-muted">From: ${esc(q.from)} • ${esc(q.clinic)} • ${formatDate(q.createdAt)}</div>
        </div>
        <span class="badge ${q.status === 'OPEN' ? 'badge-amber' : 'badge-teal'}">${q.status}</span>
      </div>
      <p class="text-sm" style="margin-bottom: var(--space-3); color: var(--text-secondary);">${esc(q.message)}</p>
      ${q.response ? `<div class="glass-card" style="padding: var(--space-3); border-left: 3px solid var(--brand-primary);"><div class="text-xs text-muted">Admin Response:</div><p class="text-sm">${esc(q.response)}</p></div>` : ''}
      ${q.status === 'OPEN' ? `
        <div style="margin-top: var(--space-3);">
          <div class="flex gap-2">
            <input class="form-control" id="qReply-${q.id}" type="text" placeholder="Type your response..." style="flex:1;">
            <button class="btn btn-primary btn-sm" onclick="replyQuery('${q.id}')"><i class="fa-solid fa-paper-plane"></i> Reply</button>
          </div>
        </div>` : ''}
    </div>
  `).join('');
}

function replyQuery(id) {
  const q = State.queries.find(q => q.id === id);
  if (!q) return;
  const reply = document.getElementById('qReply-' + id)?.value.trim();
  if (!reply) { toast('Enter a response first.', 'warning'); return; }
  q.response = reply;
  q.status = 'RESOLVED';
  State.save();
  renderQueriesList();
  toast('Query resolved!', 'success');
}

function broadcastAnnouncement() {
  const text = document.getElementById('announceText')?.value.trim();
  if (!text) { toast('Enter an announcement message.', 'warning'); return; }
  document.getElementById('announceText').value = '';
  toast('Announcement broadcast to all ' + State.hospitals.length + ' hospitals!', 'success');
}

/* ═══════════════════════════════════════════════════════
   10. PRINT PRESCRIPTION
   ═══════════════════════════════════════════════════════ */
function openPrintModal(rxId) {
  State.printRxId = rxId;
  State.printLang = State.currentLang;
  renderPrintTemplate();
  openModal('printModal');
}

function setPrintLang(lang) {
  State.printLang = lang;
  ['En','Mr','Hi'].forEach(l => {
    const btn = document.getElementById('printLang' + l);
    if (btn) btn.classList.toggle('active', l.toLowerCase() === lang);
  });
  renderPrintTemplate();
}

function renderPrintTemplate() {
  const rx = State.prescriptions.find(r => r.id === State.printRxId);
  const el = document.getElementById('printableRxArea');
  if (!rx || !el) return;
  const pat = State.patients.find(p => p.id === rx.patientId);
  const age = calcAge(pat?.dob);
  const lang = State.printLang;

  const labels = {
    en: { rx: 'Rx', patient: 'Patient', age: 'Age', gender: 'Gender', village: 'Village', date: 'Date', diag: 'Diagnosis', medicine: 'Medicine', dosage: 'Dosage', frequency: 'Frequency', duration: 'Duration', qty: 'Qty', notes: 'Notes', sig: "Doctor's Signature", disc: 'This prescription is valid for 30 days. Please do not self-medicate.' },
    mr: { rx: 'Rx', patient: 'रुग्ण', age: 'वय', gender: 'लिंग', village: 'गाव', date: 'तारीख', diag: 'निदान', medicine: 'औषध', dosage: 'मात्रा', frequency: 'वारंवारता', duration: 'कालावधी', qty: 'प्रमाण', notes: 'नोंदी', sig: 'डॉक्टरची सही', disc: 'हे प्रिस्क्रिप्शन ३० दिवसांसाठी वैध आहे. स्वयंचिकित्सा करू नका.' },
    hi: { rx: 'Rx', patient: 'मरीज', age: 'उम्र', gender: 'लिंग', village: 'गांव', date: 'तिथि', diag: 'निदान', medicine: 'दवाई', dosage: 'खुराक', frequency: 'बारंबारता', duration: 'अवधि', qty: 'मात्रा', notes: 'नोट्स', sig: 'डॉक्टर के हस्ताक्षर', disc: 'यह नुस्खा 30 दिनों के लिए वैध है। स्व-चिकित्सा न करें।' }
  };
  const L = labels[lang] || labels.en;
  const ageStr = age ? `${age.y}y ${age.m}m` : '—';
  const clinicName = State.currentUser?.clinic || 'City Care Hospital';
  const doctorName = State.currentUser?.name || 'Dr. —';

  el.innerHTML = `
    <div class="print-template">
      <div class="print-header">
        <div>
          <div class="print-hospital-name">${esc(clinicName)}</div>
          <div class="print-hospital-sub">${esc(State.currentUser?.clinicAddress || '')} | ${esc(doctorName)}</div>
        </div>
        <div class="print-rx-badge">${L.rx} ${esc(rx.rxNumber)}</div>
      </div>
      <div class="print-patient-block">
        <div><div class="print-field-label">${L.patient}</div><div class="print-field-value">${esc(pat?.name || '—')}</div></div>
        <div><div class="print-field-label">${L.age} / ${L.gender}</div><div class="print-field-value">${ageStr} / ${esc(pat?.gender || '—')}</div></div>
        <div><div class="print-field-label">${L.village}</div><div class="print-field-value">${esc(pat?.village || '—')}</div></div>
        <div><div class="print-field-label">${L.date}</div><div class="print-field-value">${formatDate(rx.createdAt)}</div></div>
      </div>
      <div style="margin-bottom: 16px; padding: 12px 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
        <div class="print-field-label">${L.diag}</div>
        <div style="font-size: 16px; font-weight: 700; color: #065f46;">${esc(rx.diagnosis)}</div>
      </div>
      <table class="print-table">
        <thead><tr>
          <th>#</th><th>${L.medicine}</th><th>${L.dosage}</th>
          <th>${L.frequency}</th><th>${L.duration}</th><th>${L.qty}</th>
        </tr></thead>
        <tbody>
          ${rx.items.map((it, i) => `<tr>
            <td>${i+1}</td><td><strong>${esc(it.medicineName)}</strong></td>
            <td>${esc(it.dosage)}</td><td>${esc(it.frequency)}</td>
            <td>${it.durationDays} ${lang === 'en' ? 'Days' : lang === 'mr' ? 'दिवस' : 'दिन'}</td>
            <td>${it.quantity}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${rx.notes ? `<div style="padding: 12px 16px; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 24px;"><div class="print-field-label">${L.notes}</div><div style="font-size:14px;">${esc(rx.notes)}</div></div>` : ''}
      <div class="print-footer">
        <div class="print-disclaimer">${L.disc}</div>
        <div style="text-align: right;">
          <div class="print-sig-line"></div>
          <div style="font-size: 12px; color: #475569;">${L.sig}</div>
          <div style="font-size: 14px; font-weight: 700; margin-top: 4px;">${esc(doctorName)}</div>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════
   11. SUPPORT QUERY
   ═══════════════════════════════════════════════════════ */
function openSupportQuery() {
  document.getElementById('querySubject').value = '';
  document.getElementById('queryMessage').value = '';
  openModal('supportQueryModal');
}

function handleSupportQuery(e) {
  e.preventDefault();
  const q = {
    id: uid(),
    from: State.currentUser?.name || 'Anonymous',
    clinic: State.currentUser?.clinic || 'Unknown',
    subject: document.getElementById('querySubject').value.trim(),
    message: document.getElementById('queryMessage').value.trim(),
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    response: ''
  };
  State.queries.push(q);
  State.save();
  closeModal('supportQueryModal');
  toast('Support query submitted! Our team will respond within 24 hours.', 'success');
}

/* ═══════════════════════════════════════════════════════
   12. i18n APPLICATION
   ═══════════════════════════════════════════════════════ */
function setLang(lang) {
  State.currentLang = lang;
  localStorage.setItem('prescripto_lang', lang);
  applyLang();
  document.documentElement.lang = lang === 'en' ? 'en' : lang === 'mr' ? 'mr' : 'hi';
}

function applyLang() {
  const lang = State.currentLang;
  const dict = T[lang] || T.en;
  Object.keys(dict).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = dict[id];
  });
  // Update lang buttons
  ['sbl-en','sbl-mr','sbl-hi','sbl2-en','sbl2-mr','sbl2-hi'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const l = id.split('-').pop();
    el.classList.toggle('active', l === lang || (lang === 'mr' && id.includes('mr')) || (lang === 'hi' && id.includes('hi')));
  });
  ['sbl-en','sbl2-en'].forEach(id => { const el = document.getElementById(id); if(el) el.classList.toggle('active', lang==='en'); });
  ['sbl-mr','sbl2-mr'].forEach(id => { const el = document.getElementById(id); if(el) el.classList.toggle('active', lang==='mr'); });
  ['sbl-hi','sbl2-hi'].forEach(id => { const el = document.getElementById(id); if(el) el.classList.toggle('active', lang==='hi'); });
}

/* ═══════════════════════════════════════════════════════
   13. UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════ */
function uid() { return Math.random().toString(36).substring(2) + Date.now().toString(36); }
function esc(str) { if (!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function formatDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob); const now = new Date();
  let y = now.getFullYear() - birth.getFullYear();
  let m = now.getMonth() - birth.getMonth();
  let d = now.getDate() - birth.getDate();
  if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d };
}

function statusBadge(status) {
  const map = { PENDING: 'badge-amber', DISPENSED: 'badge-teal', CANCELLED: 'badge-red' };
  const icons = { PENDING: '⏳', DISPENSED: '✓', CANCELLED: '✗' };
  return `<span class="badge ${map[status] || 'badge-gray'}">${icons[status] || ''} ${status}</span>`;
}

function genderBadge(gender) {
  const map = { MALE: 'badge-blue', FEMALE: 'badge-purple', OTHER: 'badge-gray' };
  return `<span class="badge ${map[gender] || 'badge-gray'}">${gender}</span>`;
}

function togglePassword(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
}

function toggleTheme() {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('prescripto_theme', theme);
}

/* ── Modal Helpers ── */
function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('open'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }

function openAddPatientModal() { document.getElementById('addPatientForm')?.reset(); document.getElementById('agePreviewBox').style.display = 'none'; openModal('addPatientModal'); }
function openAddMedicineModal() { document.getElementById('addMedicineForm')?.reset(); openModal('addMedicineModal'); }
function openAddStoreAdminModal() { document.getElementById('addStoreAdminForm')?.reset(); openModal('addStoreAdminModal'); }

/* ── Sidebar Helpers ── */
function openSidebar(sidebarId) {
  const sidebar = document.getElementById(sidebarId || 'doctorSidebar') ||
    document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.add('open');
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) overlay.classList.add('open');
}
function closeSidebar() {
  document.querySelectorAll('.sidebar').forEach(s => s.classList.remove('open'));
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) overlay.classList.remove('open');
}

/* ── Smooth scroll within fixed view (anchor links work correctly) ── */
function smoothScrollTo(anchorId) {
  // The landing view is position:fixed with overflow-y:auto
  // We must scroll the view element, not window
  const view = document.getElementById('view-landing');
  const target = document.getElementById(anchorId);
  if (!view || !target) return;
  // Get target's offset from the top of the scrollable view container
  const targetTop = target.getBoundingClientRect().top + view.scrollTop - view.getBoundingClientRect().top;
  view.scrollTo({ top: targetTop - 64, behavior: 'smooth' }); // 64 = nav height
}

/* ── Mobile Menu ── */
function openMobileMenu() { const m = document.getElementById('mobileMenu'); if(m) m.classList.add('open'); }
function closeMobileMenu() { const m = document.getElementById('mobileMenu'); if(m) m.classList.remove('open'); }


/* ── Toast ── */
function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type] || icons.success} toast-icon"></i>
    <div class="toast-msg">${esc(msg)}</div>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>`;
  container.appendChild(t);
  setTimeout(() => { if (t.parentElement) { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = 'all 0.3s ease'; setTimeout(() => t.remove(), 300); } }, 4000);
}

/* ── Close modals on backdrop click ── */
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', function(e) {
    if (e.target === this) { this.classList.remove('open'); }
  });
});

/* ═══════════════════════════════════════════════════════
   14. APP INITIALIZATION
   ═══════════════════════════════════════════════════════ */
(function init() {
  // Apply saved theme
  document.documentElement.dataset.theme = State.currentTheme;

  // Seed demo data
  seedDemoData();

  // Apply saved language
  applyLang();

  // Check if already logged in
  if (State.token) {
    try {
      const user = JSON.parse(atob(State.token));
      State.currentUser = user;
      routeByRole(user.role);
      return;
    } catch (e) {
      localStorage.removeItem('prescripto_token');
    }
  }

  // Start on landing page
  navigate('landing');
})();
