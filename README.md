# Prescripto - Doctor Prescription & Pharmacy Management System

**Prescripto** is an integrated full-stack healthcare platform bridging clinic operations with medical store inventory management. It features dynamic patient age calculation, live pharmacy stock monitoring, atomic stock deduction during dispensing, role-based access control (Doctor vs Pharmacist), dual Light/Dark theme support, and complete REST & GraphQL APIs.

---

## 🌟 Application Screen Tour & Interface Breakdown

### 1. Doctor Dashboard & Patient Management Interface
- **Dynamic Real-Time Age Calculator**: When a Doctor registers a patient, entering their Date of Birth automatically computes the patient's age in **years, months, and days** (e.g. `29y 4m 16d`).
- **Interactive Prescription Generator**: Allows doctors to construct multi-line item prescriptions by selecting medicines from store inventory, specifying dosage (e.g. `500mg`), frequency (e.g. `1-0-1`), duration in days, prescribed quantity, and dietary instructions.
- **Patient Search & History**: Instant search filter by patient name or village/location.

```
+-----------------------------------------------------------------------+
|  DOCTOR DASHBOARD                                                     |
|  +-------------------------------+   +-----------------------------+  |
|  | Patient Registration Form     |   | Prescription Generator      |  |
|  | Name: [ Vikram Singh        ] |   | Select Patient: [ Vikram  ] |  |
|  | DOB:  [ 1997-03-25        ] |   | Diagnosis: [ Viral Fever  ] |  |
|  | -> Dynamic Age: 29y 4m 16d   |   | Medicines:                  |  |
|  | Village: [ Sunset Ridge     ] |   |  - Paracetamol 500mg (10)   |  |
|  | [ Register Patient ]          |   |  - Azithromycin 500mg (3)   |  |
|  +-------------------------------+   | [ Generate Prescription ]   |  |
|                                      +-----------------------------+  |
+-----------------------------------------------------------------------+
```

---

### 2. Pharmacist Inventory & Medical Store Dashboard
- **Live Inventory Monitor**: Displays available stock with color-coded status pills:
  - 🟢 **Available**: Stock exceeds minimum alert threshold.
  - 🟡 **Low Stock Alert**: Quantity $\le$ `min_stock_alert` threshold (pulsing warning).
  - 🔴 **Expired / Out of Stock**: Expiry date passed or quantity equals 0.
- **Add New Medicine Modal**: Form fields for Medicine Name, Category (Antibiotic, Analgesic, Antacid), Dosage Form (`Tablet`, `Capsule`, `Syrup`, `Injection`, `Ointment`, `Drops`), Initial Stock Quantity, Unit Price, Batch Number, and Expiry Date.
- **Stock Update / Restock Modal**: Quick stock incrementer with transaction notes logging to `StockTransaction`.

```
+-----------------------------------------------------------------------+
|  PHARMACIST INVENTORY MONITOR                                         |
|  [ Metrics ] Total: 120 | Low Stock: 3 | Expiring: 1 | Pending Rx: 2 |
|                                                                       |
|  Search: [ Paracetamol       ]  Filter: [ All Categories  ]           |
|  [+ Add New Medicine]                                                 |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Name              | Category   | Stock  | Price  | Status       |  |
|  | Paracetamol 500mg | Analgesic  | 250    | ₹3.50  | 🟢 Available  |  |
|  | Amoxicillin 500mg | Antibiotic | 12     | ₹18.00 | 🟡 Low Stock  |  |
|  | Insulin Glargine  | Diabetic   | 0      | ₹450   | 🔴 Out Stock |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

---

### 3. Pharmacy Dispense Queue & Live Stock Deduction Workflow
- **Atomic Dispense Action**: Pharmacists view pending prescriptions. Upon clicking **Dispense & Deduct Stock**, the system performs row-level database locking (`with_for_update()`), checks inventory sufficiency, deducts stock, records an audit log, and marks the prescription as `DISPENSED`.

---

### 4. Dual Theme Support: Light & Dark Mode
- Both the Vanilla JS UI and the Next.js React Component support seamless switching between **Dark Mode** (Glassmorphism Deep Slate `#0f172a`) and **Light Mode** (Crisp Slate/Indigo `#f8fafc`).
- Toggle button available in the top navbar header.

---

## 🏗️ Repository Architecture

```
Prescripto/
├── backend/                        # Python FastAPI Backend API
│   ├── app/
│   │   ├── api/                    # REST API Endpoints (Auth, Clinic, Patients, Inventory, Prescriptions)
│   │   ├── core/                   # Config, Database Session, JWT Security
│   │   ├── graphql/                # Strawberry GraphQL Engine & Resolvers
│   │   ├── models/                 # SQLAlchemy ORM Models (with @property age)
│   │   ├── mongo_models/           # MongoDB Document Schemas (ODM Alternative)
│   │   ├── schemas/                # Pydantic Schemas with Dynamic Age
│   │   └── main.py                 # FastAPI Application Entrypoint
│   ├── tests/                      # Pytest Suite (4/4 PASSED)
│   ├── .env                        # Environment Configuration
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/                       # Web App Interfaces
│   ├── components/                 # React Next.js Components
│   │   └── InventoryDashboard.tsx  # Next.js React Medical Store Component with Tailwind & Theme Toggle
│   ├── pages/
│   │   └── inventory.tsx           # Next.js Inventory Page Wrapper
│   ├── index.html                  # Glassmorphic Web App UI
│   ├── style.css                   # Custom CSS Design System (Light & Dark Theme)
│   ├── app.js                      # Client State & API Integration
│   ├── .env                        # Frontend Environment Configuration
│   ├── .env.local
│   └── .env.example
│
└── README.md                       # Comprehensive Documentation
```

---

## ⚡ Quick Start Guide

### 1. Run Backend Server
```bash
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
```
- **REST API Docs**: [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)
- **GraphQL IDE**: [http://127.0.0.1:8080/graphql](http://127.0.0.1:8080/graphql)

### 2. Run Backend Test Suite
```bash
cd backend
py -m pytest tests/
```

### 3. Run Frontend Web App
```bash
cd frontend
py -m http.server 3000
```
Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

---

## 🌿 Git Branching Strategy & Versioning Protocol

Every new feature or bugfix follows an isolated branching strategy and synchronized versioning policy (detailed in [DEVELOPMENT.md](file:///d:/MASAI/Prescripto/DEVELOPMENT.md)):

- **Feature Branching**: Developers branch off `main` using `feature/<feature-name>` (e.g. `feature/inventory-qr-scanner`).
- **Synchronized Versioning**: Backend (`backend/pyproject.toml`, `backend/app/core/config.py`) and Frontend (`frontend/package.json`, `frontend/.env`) maintain synchronized semantic versioning (`v1.0.0`, `v1.1.0`).

