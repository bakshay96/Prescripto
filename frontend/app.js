const API_BASE_URL = (typeof window !== 'undefined' && window.ENV_API_BASE_URL) || 'http://127.0.0.1:8080/api/v1';

// Initial Mock Seed State (Used for client fallback/demo mode)
let state = {
  currentRole: 'DOCTOR',
  clinic: {
    id: 'clinic-101',
    name: 'Apollo City Hospital & Pharmacy',
    address: '108 Health Blvd, Tech City • Reg: CL-2026-9081'
  },
  patients: [
    {
      id: 'p-1',
      name: 'Ramesh Sharma',
      village_location: 'Greenwood Village, Sector 4',
      date_of_birth: '1988-06-14',
      gender: 'MALE',
      phone: '+91 9876512345',
      medical_history: 'Hypertension'
    },
    {
      id: 'p-2',
      name: 'Priya Verma',
      village_location: 'Sunrise Village, Plot 12',
      date_of_birth: '1998-11-20',
      gender: 'FEMALE',
      phone: '+91 9123456789',
      medical_history: 'None'
    }
  ],
  medicines: [
    {
      id: 'm-1',
      name: 'Paracetamol 500mg',
      category: 'Analgesic',
      stock_quantity: 120,
      price: 3.50,
      expiry_date: '2027-12-31',
      batch_number: 'PCM-2026-A',
      unit: 'Tablets',
      min_stock_alert: 20
    },
    {
      id: 'm-2',
      name: 'Amoxicillin 500mg',
      category: 'Antibiotic',
      stock_quantity: 8, // Low stock demo!
      price: 18.00,
      expiry_date: '2027-08-15',
      batch_number: 'AMX-2026-B',
      unit: 'Strip',
      min_stock_alert: 15
    },
    {
      id: 'm-3',
      name: 'Cough Syrup 100ml',
      category: 'Syrup',
      stock_quantity: 45,
      price: 85.00,
      expiry_date: '2026-09-01',
      batch_number: 'CS-2026-C',
      unit: 'Bottle',
      min_stock_alert: 10
    }
  ],
  prescriptions: [
    {
      id: 'rx-1',
      prescription_number: 'RX-20260810-901',
      patient_id: 'p-1',
      patient_name: 'Ramesh Sharma',
      village: 'Greenwood Village, Sector 4',
      doctor_name: 'Dr. Alice Smith',
      diagnosis: 'Acute Viral Fever & Bodyache',
      notes: 'Take medicines after meal.',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      items: [
        {
          medicine_id: 'm-1',
          medicine_name: 'Paracetamol 500mg',
          dosage: '500mg',
          frequency: '1-0-1',
          duration_days: 5,
          quantity_prescribed: 10,
          quantity_dispensed: 0,
          instructions: 'After breakfast and dinner'
        }
      ]
    }
  ]
};

// i18n Dictionary for Vanilla Web App
const I18N_DICT = {
  en: {
    hospitalName: "City Care Hospital & Medical Store",
    hospitalSub: "108 Health Avenue • Phone: +91 98765 43210 • Reg: CL-2026-9081",
    title: "MEDICAL PRESCRIPTION",
    rxNum: "Prescription No:",
    date: "Date:",
    patient: "Patient Name:",
    age: "Age:",
    location: "Village / Location:",
    diagnosis: "Clinical Diagnosis:",
    medicinesTitle: "Prescribed Medicines & Dosage Instructions",
    colMed: "Medicine Name",
    colDosage: "Dosage",
    colFreq: "Frequency",
    colDuration: "Duration",
    colInstructions: "Instructions",
    docSig: "Doctor's Signature & Stamp",
    disclaimer: "Note: Take medicines strictly as prescribed. Do not substitute without doctor's advice.",
    freqMap: {
      "1-0-1": "Morning & Night (1-0-1)",
      "1-1-1": "Morning, Afternoon & Night (1-1-1)",
      "1-0-0": "Morning Only (1-0-0)",
      "0-0-1": "Night Only (0-0-1)"
    }
  },
  mr: {
    hospitalName: "सिटी केअर हॉस्पिटल आणि मेडिकल स्टोअर",
    hospitalSub: "१०८ हेल्थ एव्हेन्यू • फोन: +९१ ९८७६५ ४३२१० • नोंदणी क्र: CL-2026-9081",
    title: "वैद्यकीय चिठ्ठी (प्रिस्क्रिप्शन)",
    rxNum: "प्रिस्क्रिप्शन क्रमांक:",
    date: "दिनांक:",
    patient: "रुग्णाचे नाव:",
    age: "वय:",
    location: "गाव / पत्ता:",
    diagnosis: "निदान (आजाराचे स्वरूप):",
    medicinesTitle: "औषधांचा सविस्तर तपशील आणि घेण्याच्या वेळा",
    colMed: "औषधाचे नाव",
    colDosage: "मात्रा (डोस)",
    colFreq: "वेळा (वारंवारता)",
    colDuration: "कालावधी",
    colInstructions: "खास सूचना",
    docSig: "डॉक्टरांची स्वाक्षरी व शिक्का",
    disclaimer: "सूचना: औषधे दिलेल्या वेळेत व सूचनेनुसारच घ्यावीत. डॉक्टरांच्या सल्ल्याशिवाय बदल करू नये.",
    freqMap: {
      "1-0-1": "सकाळी व रात्री (१-०-१)",
      "1-1-1": "सकाळी, दुपारी व रात्री (१-१-१)",
      "1-0-0": "फक्त सकाळी (१-०-०)",
      "0-0-1": "फक्त रात्री (०-०-१)"
    }
  },
  hi: {
    hospitalName: "सिटी केयर अस्पताल एवं मेडिकल स्टोर",
    hospitalSub: "108 हेल्थ एवेन्यू • फोन: +91 98765 43210 • पंजीकरण सं: CL-2026-9081",
    title: "चिकित्सकीय पर्चा (प्रिस्क्रिप्शन)",
    rxNum: "पर्चा संख्या:",
    date: "दिनांक:",
    patient: "मरीज का नाम:",
    age: "आयु / उम्र:",
    location: "गांव / स्थान:",
    diagnosis: "रोग निदान:",
    medicinesTitle: "दवाइयों का विवरण एवं खुराक के निर्देश",
    colMed: "दवा का नाम",
    colDosage: "खुराक (डोज)",
    colFreq: "बारंबरता (फ्रीक्वेंसी)",
    colDuration: "अवधि",
    colInstructions: "विशेष निर्देश",
    docSig: "डॉक्टर के हस्ताक्षर एवं मुहर",
    disclaimer: "नोट: दवाइयां बताई गई समयावधि और निर्देशानुसार ही लें। बिना सलाह दवाइयां न बदलें।",
    freqMap: {
      "1-0-1": "सुबह एवं रात (1-0-1)",
      "1-1-1": "सुबह, दोपहर एवं रात (1-1-1)",
      "1-0-0": "केवल सुबह (1-0-0)",
      "0-0-1": "केवल रात (0-0-1)"
    }
  }
};

let currentPrintRx = null;
let currentPrintLang = 'en';

function openPrintModal(rxId) {
  currentPrintRx = state.prescriptions.find(r => r.id === rxId) || state.prescriptions[0];
  if (!currentPrintRx) return;
  currentPrintLang = 'en';
  renderPrintTemplate();
  document.getElementById('printModal').classList.add('open');
}

function closePrintModal() {
  document.getElementById('printModal').classList.remove('open');
}

function changePrintLang(lang) {
  currentPrintLang = lang;
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`langBtn-${lang}`).classList.add('active');
  renderPrintTemplate();
}

function renderPrintTemplate() {
  if (!currentPrintRx) return;
  const dict = I18N_DICT[currentPrintLang] || I18N_DICT.en;
  const rx = currentPrintRx;

  const container = document.getElementById('printableRxArea');
  container.innerHTML = `
    <div class="print-rx-doc" style="background:#fff; color:#000; padding:24px; font-family:sans-serif;">
      <div style="display:flex; justify-content:space-between; border-bottom:2px solid #0d9488; padding-bottom:12px; margin-bottom:16px;">
        <div>
          <h1 style="font-size:22px; font-weight:800; color:#0f766e; margin:0;">${dict.hospitalName}</h1>
          <p style="font-size:12px; color:#475569; margin:4px 0 0;">${dict.hospitalSub}</p>
        </div>
        <div style="text-align:right;">
          <span style="background:#ccfbf1; color:#0f766e; font-size:11px; font-weight:700; padding:4px 8px; border-radius:12px;">${dict.title}</span>
          <p style="font-size:12px; margin:6px 0 0; color:#334155;"><strong>${dict.rxNum}</strong> ${rx.prescription_number}</p>
          <p style="font-size:12px; margin:2px 0 0; color:#334155;"><strong>${dict.date}</strong> ${new Date(rx.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:8px; display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; font-size:12px; margin-bottom:16px;">
        <div><span style="color:#64748b; display:block;">${dict.patient}</span><strong style="color:#0f172a;">${escapeHtml(rx.patient_name)}</strong></div>
        <div><span style="color:#64748b; display:block;">${dict.age}</span><strong style="color:#0f172a;">29y 4m 16d</strong></div>
        <div><span style="color:#64748b; display:block;">${dict.location}</span><strong style="color:#0f172a;">${escapeHtml(rx.village)}</strong></div>
        <div><span style="color:#64748b; display:block;">${dict.diagnosis}</span><strong style="color:#0f172a;">${escapeHtml(rx.diagnosis)}</strong></div>
      </div>

      <div style="margin-bottom:24px;">
        <h3 style="font-size:13px; font-weight:800; color:#1e293b; text-transform:uppercase; margin-bottom:8px;">${dict.medicinesTitle}</h3>
        <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
          <thead>
            <tr style="background:#0f766e; color:#fff;">
              <th style="padding:8px;">#</th>
              <th style="padding:8px;">${dict.colMed}</th>
              <th style="padding:8px;">${dict.colDosage}</th>
              <th style="padding:8px;">${dict.colFreq}</th>
              <th style="padding:8px;">${dict.colDuration}</th>
              <th style="padding:8px;">${dict.colInstructions}</th>
            </tr>
          </thead>
          <tbody>
            ${rx.items.map((item, idx) => `
              <tr style="border-bottom:1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="padding:8px; font-weight:bold;">${idx + 1}</td>
                <td style="padding:8px; font-weight:bold; color:#0f172a;">${escapeHtml(item.medicine_name)}</td>
                <td style="padding:8px;">${item.dosage || '500mg'}</td>
                <td style="padding:8px; font-weight:600; color:#0f766e;">${dict.freqMap[item.frequency] || item.frequency || '1-0-1'}</td>
                <td style="padding:8px; font-weight:bold;">${item.duration_days || 3} Days</td>
                <td style="padding:8px; color:#475569;">${item.instructions || 'After Meal'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; align-items:end; margin-top:40px; border-top:1px solid #e2e8f0; padding-top:16px;">
        <p style="font-size:11px; color:#64748b; font-style:italic;">${dict.disclaimer}</p>
        <div style="text-align:right;">
          <div style="border-bottom:1px dashed #94a3b8; width:150px; display:inline-block; margin-bottom:8px;"></div>
          <p style="font-size:11px; font-weight:bold; margin:0;">${dict.docSig}</p>
        </div>
      </div>
    </div>
  `;
}

function triggerPrint() {
  window.print();
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  updateClinicHeader();
  renderPatientsTable();
  renderPatientSelectDropdown();
  renderInventoryTable();
  renderPrescriptionsTable();
  renderDispenseQueue();
  updateMetrics();
  addPrescriptionItemRow(); // Initial medicine row in Rx form
}

let currentAppLanguage = 'en';

function setAppLanguage(lang) {
  currentAppLanguage = lang;
  document.querySelectorAll('.lang-select-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`appLang-${lang}`);
  if (activeBtn) activeBtn.classList.add('active');

  const dict = I18N_DICT[lang] || I18N_DICT.en;

  // Update UI Labels
  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setTxt('lblNavDoctor', dict.doctorView);
  setTxt('lblNavPharmacy', dict.pharmacistView);
  setTxt('lblNavStock', dict.stockPageView);
  setTxt('lblApiStatus', dict.backendConnected);
  setTxt('lblStockLedgerTitle', dict.stockLedgerTitle);
  setTxt('lblStockLedgerSub', dict.stockLedgerSub);

  // Table Headers
  setTxt('thImg2', dict.thImg);
  setTxt('thMedName2', dict.thMedName);
  setTxt('thStockQty2', dict.thStockQty);
  setTxt('thExpiry2', dict.thExpiry);
  setTxt('thProvider2', dict.thProvider);
  setTxt('thStatus2', dict.thStatus);
  setTxt('thActions2', dict.thActions);

  renderPatientsTable();
  renderInventoryTable();
  renderStockLedgerTable();
  renderPrescriptionsTable();
  renderDispenseQueue();
  updateMetrics();
}

// Switch Role (DOCTOR, PHARMACIST, STOCK)
function switchRole(role) {
  state.currentRole = role;
  document.getElementById('roleDoctorBtn').classList.toggle('active', role === 'DOCTOR');
  document.getElementById('rolePharmacistBtn').classList.toggle('active', role === 'PHARMACIST');
  document.getElementById('roleStockBtn').classList.toggle('active', role === 'STOCK');
  
  document.getElementById('doctorDashboard').classList.toggle('active', role === 'DOCTOR');
  document.getElementById('pharmacistDashboard').classList.toggle('active', role === 'PHARMACIST');
  document.getElementById('stockDashboard').classList.toggle('active', role === 'STOCK');

  if (role === 'STOCK') {
    renderStockLedgerTable();
  }
}

// Toggle Light / Dark Mode
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

function updateClinicHeader() {
  document.getElementById('clinicName').textContent = state.clinic.name;
  document.getElementById('clinicAddress').textContent = state.clinic.address;
}

// Calculate Dynamic Age from Date of Birth
function calculateAgeFromDob(dobString) {
  if (!dobString) return null;
  const dob = new Date(dobString);
  const today = new Date();

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  let days = today.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  years = Math.max(0, years);
  months = Math.max(0, months);
  days = Math.max(0, days);

  return {
    years,
    months,
    days,
    formatted: `${years}y ${months}m ${days}d`
  };
}

// Live Age Preview in Form
function calculateLiveAge() {
  const dobVal = document.getElementById('pDob').value;
  const agePreview = document.getElementById('agePreviewValue');
  
  const age = calculateAgeFromDob(dobVal);
  if (age) {
    agePreview.innerHTML = `<span style="color: #2dd4bf;">${age.years} Years, ${age.months} Months, ${age.days} Days</span> (${age.formatted})`;
  } else {
    agePreview.textContent = 'Select Date of Birth to view age';
  }
}

// Create Patient Handler
function handleCreatePatient(event) {
  event.preventDefault();
  const name = document.getElementById('pName').value.trim();
  const village = document.getElementById('pVillage').value.trim();
  const dob = document.getElementById('pDob').value;
  const gender = document.getElementById('pGender').value;
  const phone = document.getElementById('pPhone').value.trim();
  const history = document.getElementById('pHistory').value.trim();

  const newPatient = {
    id: 'p-' + Date.now(),
    name,
    village_location: village,
    date_of_birth: dob,
    gender,
    phone,
    medical_history: history
  };

  state.patients.unshift(newPatient);
  
  // Reset Form
  document.getElementById('patientForm').reset();
  document.getElementById('agePreviewValue').textContent = 'Select Date of Birth to view age';

  renderPatientsTable();
  renderPatientSelectDropdown();
  alert(`Patient ${name} registered successfully!`);
}

// Render Patients Table
function renderPatientsTable() {
  const tbody = document.getElementById('patientsTableBody');
  const query = document.getElementById('patientSearchInput').value.toLowerCase();
  
  const filtered = state.patients.filter(p => 
    p.name.toLowerCase().includes(query) || p.village_location.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No patients found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const age = calculateAgeFromDob(p.date_of_birth);
    return `
      <tr>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${escapeHtml(p.village_location)}</td>
        <td>${p.date_of_birth}</td>
        <td><span class="badge badge-teal">${age ? age.formatted : 'N/A'}</span></td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="selectPatientForRx('${p.id}')">
            <i class="fa-solid fa-prescription"></i> Prescribe
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterPatients() {
  renderPatientsTable();
}

function renderPatientSelectDropdown() {
  const select = document.getElementById('rxPatientSelect');
  select.innerHTML = '<option value="">-- Choose Patient --</option>' +
    state.patients.map(p => {
      const age = calculateAgeFromDob(p.date_of_birth);
      return `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.village_location)} - ${age ? age.formatted : ''})</option>`;
    }).join('');
}

function selectPatientForRx(patientId) {
  document.getElementById('rxPatientSelect').value = patientId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Dynamic Prescription Form Items Row Handler
function addPrescriptionItemRow() {
  const container = document.getElementById('rxItemsContainer');
  const rowId = 'rx-item-' + Date.now() + Math.random().toString(36).substr(2, 4);

  const medOptions = state.medicines.map(m => 
    `<option value="${m.id}">${escapeHtml(m.name)} (Stock: ${m.stock_quantity} ${m.unit})</option>`
  ).join('');

  const row = document.createElement('div');
  row.className = 'rx-item-row';
  row.id = rowId;
  row.innerHTML = `
    <select class="med-select" required>
      <option value="">-- Select Medicine --</option>
      ${medOptions}
    </select>
    <input type="text" class="med-dosage" placeholder="Dosage (500mg)" required>
    <input type="text" class="med-freq" placeholder="Freq (1-0-1)" required>
    <input type="number" class="med-days" placeholder="Days (5)" min="1" required>
    <input type="number" class="med-qty" placeholder="Qty (10)" min="1" required>
    <button type="button" class="btn btn-sm btn-danger" onclick="removeRxRow('${rowId}')"><i class="fa-solid fa-trash"></i></button>
  `;

  container.appendChild(row);
}

function removeRxRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();
}

// Create Prescription Handler
function handleCreatePrescription(event) {
  event.preventDefault();
  const patientId = document.getElementById('rxPatientSelect').value;
  const diagnosis = document.getElementById('rxDiagnosis').value.trim();
  const notes = document.getElementById('rxNotes').value.trim();

  const patient = state.patients.find(p => p.id === patientId);
  if (!patient) return alert('Please select a valid patient');

  const rows = document.querySelectorAll('.rx-item-row');
  if (rows.length === 0) return alert('Add at least one medicine item');

  const items = [];
  rows.forEach(row => {
    const medId = row.querySelector('.med-select').value;
    const dosage = row.querySelector('.med-dosage').value;
    const freq = row.querySelector('.med-freq').value;
    const days = parseInt(row.querySelector('.med-days').value);
    const qty = parseInt(row.querySelector('.med-qty').value);

    const med = state.medicines.find(m => m.id === medId);
    if (med) {
      items.push({
        medicine_id: med.id,
        medicine_name: med.name,
        dosage,
        frequency: freq,
        duration_days: days,
        quantity_prescribed: qty,
        quantity_dispensed: 0
      });
    }
  });

  const prescriptionNumber = 'RX-' + new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14) + '-' + Math.floor(100 + Math.random() * 900);

  const newRx = {
    id: 'rx-' + Date.now(),
    prescription_number: prescriptionNumber,
    patient_id: patient.id,
    patient_name: patient.name,
    village: patient.village_location,
    doctor_name: 'Dr. Alice Smith',
    diagnosis,
    notes,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    items
  };

  state.prescriptions.unshift(newRx);

  // Reset form
  document.getElementById('prescriptionForm').reset();
  document.getElementById('rxItemsContainer').innerHTML = '';
  addPrescriptionItemRow();

  renderPrescriptionsTable();
  renderDispenseQueue();
  updateMetrics();
  alert(`Prescription ${prescriptionNumber} generated successfully!`);
}

// Render Prescriptions History Table
function renderPrescriptionsTable(statusFilter = '') {
  const tbody = document.getElementById('recentRxTableBody');
  const filtered = state.prescriptions.filter(rx => !statusFilter || rx.status === statusFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No prescriptions found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(rx => `
    <tr>
      <td><strong class="rx-num">${rx.prescription_number}</strong></td>
      <td>${escapeHtml(rx.patient_name)}</td>
      <td>${escapeHtml(rx.village)}</td>
      <td>${escapeHtml(rx.diagnosis)}</td>
      <td>${rx.items.map(i => `${i.medicine_name} (${i.quantity_prescribed})`).join(', ')}</td>
      <td>
        <span class="badge ${rx.status === 'DISPENSED' ? 'badge-teal' : rx.status === 'PENDING' ? 'badge-amber' : 'badge-crimson'}">
          ${rx.status}
        </span>
      </td>
      <td>${new Date(rx.created_at).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="openPrintModal('${rx.id}')">
          <i class="fa-solid fa-print"></i> Print
        </button>
      </td>
    </tr>
  `).join('');
}

function filterRxStatus(status, btnElement) {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  if (btnElement) {
    btnElement.classList.add('active');
  } else if (typeof event !== 'undefined' && event && event.target) {
    event.target.classList.add('active');
  } else if (typeof window !== 'undefined' && window.event && window.event.target) {
    window.event.target.classList.add('active');
  }
  renderPrescriptionsTable(status);
}

// Render Pharmacy Inventory Table
function renderInventoryTable() {
  const tbody = document.getElementById('inventoryTableBody');
  const searchInput = document.getElementById('inventorySearch');
  const search = searchInput ? searchInput.value.toLowerCase() : '';
  const catInput = document.getElementById('inventoryCategoryFilter');
  const cat = catInput ? catInput.value : '';

  const filtered = state.medicines.filter(m => 
    (!cat || m.category === cat) &&
    (m.name.toLowerCase().includes(search) || m.batch_number.toLowerCase().includes(search) || (m.hsn_code && m.hsn_code.includes(search)))
  );

  const dict = I18N_DICT[currentAppLanguage] || I18N_DICT.en;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-muted);">No medicines in inventory</td></tr>`;
    return;
  }

  const defaultImg = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100&auto=format&fit=crop&q=60";

  tbody.innerHTML = filtered.map(m => {
    const isLow = m.stock_quantity <= m.min_stock_alert;
    const isExp = new Date(m.expiry_date) < new Date();
    const img = m.image_url || defaultImg;
    
    return `
      <tr style="${isExp ? 'background: rgba(239, 68, 68, 0.08);' : ''}">
        <td><strong>${escapeHtml(m.name)}</strong></td>
        <td><span class="badge badge-indigo">${escapeHtml(m.category)}</span></td>
        <td>
          <span style="font-weight: 700; color: ${isLow ? '#f87171' : '#34d399'};">
            ${m.stock_quantity} ${m.unit}
          </span>
        </td>
        <td>₹${parseFloat(m.price).toFixed(2)}</td>
        <td>${m.expiry_date}</td>
        <td><code>${m.batch_number}</code></td>
        <td>
          ${isExp ? `<span class="badge badge-red-flag">${dict.statusExpiredRedFlag}</span>` : 
            isLow ? `<span class="badge badge-amber">${dict.statusLowStock}</span>` : 
            `<span class="badge badge-teal">${dict.statusAvailable}</span>`}
        </td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="openRestockModal('${m.id}')">
            <i class="fa-solid fa-plus"></i> Restock
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Dedicated Stock & Restock Page Table
function renderStockLedgerTable() {
  const tbody = document.getElementById('stockLedgerTableBody');
  if (!tbody) return;

  const searchInput = document.getElementById('stockSearchInput');
  const search = searchInput ? searchInput.value.toLowerCase() : '';

  const filtered = state.medicines.filter(m => 
    !search || 
    m.name.toLowerCase().includes(search) || 
    m.batch_number.toLowerCase().includes(search) ||
    (m.provider_name && m.provider_name.toLowerCase().includes(search)) ||
    (m.hsn_code && m.hsn_code.includes(search))
  );

  const dict = I18N_DICT[currentAppLanguage] || I18N_DICT.en;
  const defaultImg = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100&auto=format&fit=crop&q=60";

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-muted);">No stock ledger records found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(m => {
    const isLow = m.stock_quantity <= m.min_stock_alert;
    const isExp = new Date(m.expiry_date) < new Date();
    const img = m.image_url || defaultImg;
    const provider = m.provider_name || "Apex Pharma Distributors";
    const hsn = m.hsn_code || "30049099";
    const rack = m.rack_location || "Rack A-12";

    return `
      <tr style="${isExp ? 'background: rgba(239, 68, 68, 0.08);' : ''}">
        <td><img src="${img}" class="table-med-img" alt="Med"></td>
        <td>
          <strong style="font-size:14px;">${escapeHtml(m.name)}</strong>
          <span style="display:block; font-size:11px; color:var(--text-muted);">${escapeHtml(m.category)} • ${m.unit}</span>
        </td>
        <td>
          <strong style="font-size:15px; color: ${isLow ? '#f87171' : '#34d399'};">${m.stock_quantity}</strong>
        </td>
        <td>
          <span style="color: ${isExp ? '#f87171' : 'inherit'}; font-weight: 600;">${m.expiry_date}</span>
        </td>
        <td>
          <strong>${escapeHtml(provider)}</strong>
          <span style="display:block; font-size:11px; color:var(--text-muted);">${escapeHtml(m.provider_contact || '+91 9876543210')}</span>
        </td>
        <td><code>${hsn}</code></td>
        <td><span class="badge badge-indigo">${rack}</span></td>
        <td>
          ${isExp ? `<span class="badge badge-red-flag">${dict.statusExpiredRedFlag}</span>` : 
            isLow ? `<span class="badge badge-amber">${dict.statusLowStock}</span>` : 
            `<span class="badge badge-teal">${dict.statusAvailable}</span>`}
        </td>
        <td>
          <button class="btn btn-sm btn-emerald" onclick="openRestockModal('${m.id}')">
            <i class="fa-solid fa-plus"></i> ${dict.restockBtn}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Pharmacy Dispense Queue
function renderDispenseQueue() {
  const container = document.getElementById('dispenseQueueList');
  const pendingRx = state.prescriptions.filter(rx => rx.status === 'PENDING');

  if (pendingRx.length === 0) {
    container.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 20px;">No pending prescriptions to dispense!</div>`;
    return;
  }

  container.innerHTML = pendingRx.map(rx => `
    <div class="dispense-card">
      <div class="dispense-card-header">
        <div>
          <span class="rx-num">${rx.prescription_number}</span>
          <span style="font-weight:600; margin-left: 10px;">${escapeHtml(rx.patient_name)}</span> (${escapeHtml(rx.village)})
        </div>
        <span class="badge badge-amber">Pending Dispense</span>
      </div>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;"><strong>Diagnosis:</strong> ${escapeHtml(rx.diagnosis)}</p>
      
      <div style="background: rgba(0,0,0,0.2); border-radius: var(--radius-sm); padding: 8px; margin-bottom: 12px;">
        <strong style="font-size:12px; color: var(--accent-cyan);">Prescribed Medicines:</strong>
        <ul style="font-size:13px; padding-left: 18px; margin-top: 4px;">
          ${rx.items.map(i => {
            const med = state.medicines.find(m => m.id === i.medicine_id);
            const stock = med ? med.stock_quantity : 0;
            const hasEnough = stock >= i.quantity_prescribed;
            return `<li>${i.medicine_name} - ${i.dosage} (${i.frequency}) | Qty: ${i.quantity_prescribed} | <span style="color: ${hasEnough ? '#34d399' : '#f87171'}; font-weight:600;">Store Stock: ${stock}</span></li>`;
          }).join('')}
        </ul>
      </div>

      <button class="btn btn-emerald btn-full" onclick="dispensePrescription('${rx.id}')">
        <i class="fa-solid fa-prescription-bottle-medical"></i> Dispense & Deduct Stock
      </button>
    </div>
  `).join('');
}

// Dispense Prescription Workflow
function dispensePrescription(rxId) {
  const rx = state.prescriptions.find(r => r.id === rxId);
  if (!rx) return;

  // Check stock sufficiency
  for (let item of rx.items) {
    const med = state.medicines.find(m => m.id === item.medicine_id);
    if (!med || med.stock_quantity < item.quantity_prescribed) {
      alert(`Cannot dispense! Insufficient stock for ${item.medicine_name}. Available: ${med ? med.stock_quantity : 0}, Needed: ${item.quantity_prescribed}`);
      return;
    }
  }

  // Perform Stock Deduction
  rx.items.forEach(item => {
    const med = state.medicines.find(m => m.id === item.medicine_id);
    if (med) {
      med.stock_quantity -= item.quantity_prescribed;
      item.quantity_dispensed = item.quantity_prescribed;
    }
  });

  rx.status = 'DISPENSED';
  rx.dispensed_at = new Date().toISOString();

  renderInventoryTable();
  renderPrescriptionsTable();
  renderDispenseQueue();
  updateMetrics();
  alert(`Prescription ${rx.prescription_number} successfully dispensed and inventory stock updated!`);
}

// Metrics Update
function updateMetrics() {
  document.getElementById('metricTotalMeds').textContent = state.medicines.length;
  document.getElementById('metricLowStock').textContent = state.medicines.filter(m => m.stock_quantity <= m.min_stock_alert).length;
  document.getElementById('metricExpiring').textContent = state.medicines.filter(m => new Date(m.expiry_date) < new Date()).length;
  document.getElementById('metricPendingRx').textContent = state.prescriptions.filter(rx => rx.status === 'PENDING').length;
}

// Add Medicine Modal Handlers
function openAddMedicineModal() {
  document.getElementById('addMedicineModal').classList.add('open');
}

function closeAddMedicineModal() {
  document.getElementById('addMedicineModal').classList.remove('open');
}

function handleAddMedicine(event) {
  event.preventDefault();
  const name = document.getElementById('mName').value.trim();
  const category = document.getElementById('mCategory').value.trim();
  const stock = parseInt(document.getElementById('mStock').value);
  const price = parseFloat(document.getElementById('mPrice').value);
  const expiry = document.getElementById('mExpiry').value;
  const batch = document.getElementById('mBatch').value.trim();
  const unit = document.getElementById('mUnit').value;
  const alertVal = parseInt(document.getElementById('mAlert').value);

  const imgEl = document.getElementById('mImgUrl');
  const providerEl = document.getElementById('mProviderName');
  const contactEl = document.getElementById('mProviderContact');
  const hsnEl = document.getElementById('mHsnCode');
  const rackEl = document.getElementById('mRackLocation');

  const newMed = {
    id: 'm-' + Date.now(),
    name,
    category,
    stock_quantity: stock,
    price,
    expiry_date: expiry,
    batch_number: batch,
    unit,
    min_stock_alert: alertVal,
    image_url: imgEl ? imgEl.value.trim() : null,
    provider_name: providerEl ? providerEl.value.trim() : "Apex Pharma Distributors",
    provider_contact: contactEl ? contactEl.value.trim() : "+91 9876543210",
    hsn_code: hsnEl ? hsnEl.value.trim() : "30049099",
    rack_location: rackEl ? rackEl.value.trim() : "Rack A-12"
  };

  state.medicines.unshift(newMed);
  closeAddMedicineModal();
  document.getElementById('addMedicineForm').reset();

  renderInventoryTable();
  renderStockLedgerTable();
  updateMetrics();
  alert(`Medicine ${name} added to store inventory!`);
}

// Restock Modal Handlers
function openRestockModal(medId) {
  const med = state.medicines.find(m => m.id === medId);
  if (!med) return;

  document.getElementById('restockMedId').value = med.id;
  document.getElementById('restockMedName').textContent = `${med.name} (Current Stock: ${med.stock_quantity} ${med.unit})`;
  document.getElementById('restockModal').classList.add('open');
}

function closeRestockModal() {
  document.getElementById('restockModal').classList.remove('open');
}

function handleRestockSubmit(event) {
  event.preventDefault();
  const medId = document.getElementById('restockMedId').value;
  const addQty = parseInt(document.getElementById('restockQuantity').value);

  const med = state.medicines.find(m => m.id === medId);
  if (med) {
    med.stock_quantity += addQty;
    alert(`Added ${addQty} ${med.unit} to ${med.name}. New Stock: ${med.stock_quantity}`);
  }

  closeRestockModal();
  renderInventoryTable();
  renderStockLedgerTable();
  renderDispenseQueue();
  updateMetrics();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
