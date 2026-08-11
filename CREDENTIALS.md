# Prescripto - Credentials & Security Guide

This document contains demo access credentials for local testing, alongside security protocols for production deployment.

---

## 🔑 Demo Access Credentials (Development / Local Testing)

When running the application locally (`http://127.0.0.1:8080`), you can use the following default demo credentials to log in:

### 1. System Administrator / Doctor Account
- **Role**: `DOCTOR`
- **Email / Username**: `sarah.doc@livetest.com`
- **Password**: `docpassword123`
- **Permissions**: Create Patients, Calculate Dynamic Age, Issue Prescriptions, View Inventory Overview.

### 2. Pharmacist / Store Manager Account
- **Role**: `PHARMACIST`
- **Email / Username**: `dave.pharma@livetest.com`
- **Password**: `pharmapassword123`
- **Permissions**: Add New Medicines, Update/Restock Inventory, Dispense Prescriptions (Atomic Stock Deduction).

### 3. Demo Hospital Entity
- **Hospital Name**: City Care Hospital & Medical Store
- **Registration Number**: `CL-2026-9081`
- **Address**: 108 Health Avenue, Metro City

---

## 🔒 Production Security Checklist

When deploying Prescripto to production environments:

1. **JWT Secret Key Rotation**:
   - Change `SECRET_KEY` in `backend/.env` to a strong 256-bit cryptographically secure string:
     ```bash
     openssl rand -hex 32
     ```
2. **Database Credentials**:
   - Use a dedicated PostgreSQL connection string with encrypted credentials:
     ```ini
     DATABASE_URL="postgresql://user:strongpassword@localhost:5432/prescripto_db"
     ```
3. **Environment Files (.env)**:
   - Ensure `.env` is listed in `.gitignore` and **NEVER** committed with sensitive production passwords to public repositories. Use `.env.example` as template.
