# Prescripto Backend API Documentation

Prescripto is a high-performance Python **FastAPI** backend powering the Prescripto Hospital OPD & Pharmacy ERP platform. It connects to a pure **MongoDB** document database for high throughput and zero-relational lock overhead.

---

## 🚀 Server Execution & Default Routes

### Server Base URLs:
- **Default Base API Prefix**: `http://localhost:8000/api/v1`
- **Root Status Route**: `http://localhost:8000/`
- **Swagger Interactive OpenAPI Docs**: `http://localhost:8000/docs`
- **ReDoc API Specifications**: `http://localhost:8000/redoc`
- **OpenAPI Schema JSON**: `http://localhost:8000/api/v1/openapi.json`
- **GraphQL Router & Playground**: `http://localhost:8000/graphql`

---

## 📡 Default Root Route & Health Check

### `GET /`
Returns server metadata, database connectivity mode, and quick links to documentation.

#### Example Response:
```json
{
  "message": "Prescripto Backend API",
  "database": "MongoDB",
  "pymongo_installed": true,
  "docs": "/docs",
  "graphql": "/graphql",
  "version": "1.0.0"
}
```

---

## 📚 REST API Endpoint Reference (`/api/v1`)

### 1. Authentication & Security (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate user/doctor and return JWT access token | ❌ No |
| `POST` | `/api/v1/auth/register` | Register new user account | ❌ No |
| `GET` | `/api/v1/auth/me` | Fetch currently logged-in user profile & role | ✅ Yes |

---

### 2. Patient Management (`/api/v1/patients`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/patients` | List/search patients with pagination (`?search=Name`) | ✅ Yes |
| `POST` | `/api/v1/patients` | Create full patient record | ✅ Yes |
| `POST` | `/api/v1/patients/quick` | Quick register patient with age calculation (`age_years`, `age_months`) | ✅ Yes |
| `GET` | `/api/v1/patients/{id}` | Get single patient record by ID | ✅ Yes |
| `PUT` | `/api/v1/patients/{id}` | Update patient demographics or OPD ban status | ✅ Yes |

---

### 3. Doctor Prescriptions & Printing (`/api/v1/prescriptions`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/prescriptions` | List prescriptions with queue filters (`?status=PENDING`) | ✅ Yes |
| `POST` | `/api/v1/prescriptions` | Save OPD prescription with items, diagnosis, and language | ✅ Yes |
| `GET` | `/api/v1/prescriptions/{id}` | Retrieve JSON prescription details | ✅ Yes |
| `GET` | `/api/v1/prescriptions/{id}/print` | Generate 1-page A4 standalone HTML printable prescription | ❌ Optional |

---

### 4. Pharmacy Inventory & Stock (`/api/v1/inventory`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/inventory/medicines` | List all medicines in inventory catalog | ✅ Yes |
| `POST` | `/api/v1/inventory/medicines` | Add new medicine with price, batch, HSN, and rack location | ✅ Yes |
| `GET` | `/api/v1/inventory/medicines/autocomplete` | Lightweight search dropdown endpoint returning stock & price | ✅ Yes |
| `PUT` | `/api/v1/inventory/medicines/{id}` | Update stock quantity, price, or details | ✅ Yes |

---

### 5. Billing, Tax Invoices & History (`/api/v1/inventory/billing`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/inventory/billing/generate-bill` | Generate pharmacy bill, calculate GST, deduct stock atomically | ✅ Yes |
| `GET` | `/api/v1/inventory/billing/history` | Billing history audit log with search and payment channel filters | ✅ Yes |
| `GET` | `/api/v1/inventory/billing/details/{bill_id}` | Multi-tier bill lookup helper resolving `_id`, `bill_id`, `bill_number` | ✅ Yes |
| `GET` | `/api/v1/inventory/billing/{bill_id}/print` | 1-page A4 standalone HTML printable tax invoice document | ❌ Optional |

---

### 6. Master Admin & Clinic Profile (`/api/v1/admin` & `/api/v1/clinic-profile`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/stats` | Clinic revenue metrics, order counts, and active subscriptions | ✅ Admin |
| `POST` | `/api/v1/admin/broadcast-message` | Publish system-wide announcement banner | ✅ Admin |
| `GET` | `/api/v1/clinic-profile` | Fetch doctor profile, MMC reg number, signature, and clinic address | ✅ Yes |
| `PUT` | `/api/v1/clinic-profile` | Update clinic profile information | ✅ Yes |

---

### 7. Razorpay Payments & Subscriptions (`/api/v1/payments`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments/create-razorpay-order` | Create order ID for subscription upgrade | ✅ Yes |
| `POST` | `/api/v1/payments/verify-signature` | HMAC-SHA256 signature verification for payment callback | ✅ Yes |
| `GET` | `/api/v1/payments/status` | Fetch current clinic subscription tier & trial status | ✅ Yes |

---

## 🔒 Security & Environment Setup (`backend/.env`)

> [!WARNING]
> **Never commit real credentials to source control.** All database URLs, secret keys, and tokens must be loaded via environment variables.

### Environment Schema Example (`.env`):
```env
# Database Settings (MongoDB Engine)
MONGODB_URI=mongodb://localhost:27017/prescripto_db
DB_NAME=prescripto_db

# Host & Server Configuration
HOST=0.0.0.0
PORT=8000

# Security & JWT Tokens
JWT_SECRET_KEY=your_secure_jwt_secret_key_placeholder
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200

# CORS Allowed Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## 🛠️ How to Run the Backend

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start FastAPI server with Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
