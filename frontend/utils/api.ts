/**
 * Central API client for Prescripto frontend.
 * Automatically attaches JWT Authorization header from localStorage.
 */

const PRIMARY_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const FALLBACK_BASE = "http://127.0.0.1:8080";

// ── Token helpers ──────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("prescripto_token");
}

export function setToken(token: string): void {
  localStorage.setItem("prescripto_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("prescripto_token");
  localStorage.removeItem("prescripto_user");
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("prescripto_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user: StoredUser): void {
  localStorage.setItem("prescripto_user", JSON.stringify(user));
}

export interface StoredUser {
  id: string;
  role: "DOCTOR" | "PHARMACIST" | "MASTER_ADMIN";
  full_name: string;
  email: string;
  clinic_id: string;
}

// ── Core fetch wrapper with port fallback ──────────────────────────────────

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${PRIMARY_BASE}/api/v1${path}`, { ...options, headers });
  } catch {
    res = await fetch(`${FALLBACK_BASE}/api/v1${path}`, { ...options, headers });
  }

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized — please log in again");
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {}
    throw new Error(detail);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return res.json() as Promise<T>;
  return res.text() as unknown as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  user_id: string;
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const form = new URLSearchParams({ username: email, password });
  const reqInit = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  };

  let res: Response;
  try {
    res = await fetch(`${PRIMARY_BASE}/api/v1/auth/login`, reqInit);
  } catch {
    res = await fetch(`${FALLBACK_BASE}/api/v1/auth/login`, reqInit);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? "Login failed");
  }
  return res.json();
}

export interface HospitalRegisterResponse {
  access_token: string;
  role: string;
  user_id: string;
  clinic_id: string;
  clinic_name: string;
  doctor_name: string;
}

export async function registerHospitalApi(data: {
  full_name: string;
  email: string;
  password: string;
  clinic_name: string;
  clinic_address?: string;
  clinic_phone?: string;
  license_number?: string;
}): Promise<HospitalRegisterResponse> {
  const res = await fetch(`${PRIMARY_BASE}/api/v1/auth/hospital-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? "Registration failed");
  }
  return res.json();
}

export async function getMeApi(): Promise<StoredUser> {
  return apiFetch<StoredUser>("/auth/me");
}

// ── Patients ──────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  name: string;
  village_location: string;
  date_of_birth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string | null;
  age: { years: number; months: number; days: number; formatted: string };
}

export function listPatients(search?: string): Promise<Patient[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<Patient[]>(`/patients${q}`);
}

export async function quickCreatePatient(data: {
  name: string;
  village_location?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
}): Promise<Patient> {
  return apiFetch<Patient>("/patients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listPatientsMongo(search?: string): Promise<Patient[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  try {
    return await apiFetch<Patient[]>(`/patients${q}`);
  } catch {
    return [];
  }
}

// ── Medicines ─────────────────────────────────────────────────────────────

export interface MedicineAutocomplete {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock_quantity: number;
  is_low_stock: boolean;
}

export interface Medicine extends MedicineAutocomplete {
  price: number;
  expiry_date: string;
  batch_number: string;
  min_stock_alert: number;
  provider_name: string | null;
  provider_contact: string | null;
  hsn_code: string | null;
  rack_location: string | null;
}

export function autocompleteMedicines(q: string): Promise<MedicineAutocomplete[]> {
  return apiFetch<MedicineAutocomplete[]>(`/inventory/medicines/autocomplete?q=${encodeURIComponent(q)}`);
}

export function listMedicines(search?: string, category?: string): Promise<Medicine[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  const q = params.toString() ? `?${params}` : "";
  return apiFetch<Medicine[]>(`/inventory/medicines${q}`);
}

export function addMedicine(data: Partial<Medicine>): Promise<Medicine> {
  return apiFetch<Medicine>("/inventory/medicines", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateMedicine(id: string, data: Partial<Medicine>): Promise<Medicine> {
  return apiFetch<Medicine>(`/inventory/medicines/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function restockMedicine(id: string, quantity: number, notes?: string): Promise<Medicine> {
  return apiFetch<Medicine>(`/inventory/medicines/${id}/restock`, {
    method: "POST",
    body: JSON.stringify({ quantity, notes }),
  });
}

// ── Prescriptions ─────────────────────────────────────────────────────────

export interface RxItem {
  medicine_id?: string | null;
  medicine_name?: string | null;
  dosage: string;
  frequency: string;
  duration_days: number;
  quantity_prescribed: number;
  instructions?: string;
  is_custom?: boolean;
}

export interface RxCreateV2 {
  patient_id?: string | null;
  new_patient?: {
    name: string;
    village_location?: string;
    date_of_birth?: string;
    gender?: string;
    phone?: string;
  } | null;
  diagnosis: string;
  notes?: string;
  items: RxItem[];
}

export interface Prescription {
  id: string;
  prescription_number: string;
  diagnosis: string;
  notes: string | null;
  status: string;
  created_at: string;
  patient: Patient | null;
  items: Array<{
    id: string;
    medicine_id: string;
    dosage: string;
    frequency: string;
    duration_days: number;
    quantity_prescribed: number;
    instructions: string | null;
    medicine: Medicine | null;
  }>;
}

export function createPrescription(data: RxCreateV2): Promise<Prescription> {
  return apiFetch<Prescription>("/prescriptions/v2", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listPrescriptions(patientId?: string): Promise<Prescription[]> {
  const q = patientId ? `?patient_id=${patientId}` : "";
  return apiFetch<Prescription[]>(`/prescriptions${q}`);
}

/** Returns the full URL to open in a new tab for printing */
export function getPrintUrl(prescriptionId: string, lang: string = "mr"): string {
  const token = getToken();
  return `${PRIMARY_BASE}/api/v1/prescriptions/${prescriptionId}/print-html?lang=${lang}&token=${token}`;
}

// ── Clinic Profile ────────────────────────────────────────────────────────

export interface ClinicProfile {
  id: string;
  clinic_id: string;
  hospital_name_en: string;
  hospital_name_mr: string | null;
  doctor_name_en: string;
  doctor_name_mr: string | null;
  qualifications: string | null;
  reg_number: string | null;
  specialties: string | null;
  clinic_hours: string | null;
  address: string | null;
  phone: string | null;
  uhid_prefix: string | null;
  default_lang: string;
  facilities: string[];
  signature_data_url?: string | null;
}

export function getClinicProfile(): Promise<ClinicProfile> {
  return apiFetch<ClinicProfile>("/clinic-profile");
}

export function updateClinicProfile(data: Partial<ClinicProfile>): Promise<ClinicProfile> {
  return apiFetch<ClinicProfile>("/clinic-profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Master Admin ──────────────────────────────────────────────────────────

export interface PlatformAnalytics {
  total_hospitals: number;
  total_users: number;
  total_prescriptions: number;
  total_medicines: number;
  open_queries: number;
  active_subscriptions: number;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  registration_number: string;
  doctor_count: number;
  subscription_plan: string;
  subscription_active: boolean;
  subscription_valid_until: string | null;
}

export interface SupportQuery {
  id: string;
  from_user_id: string;
  clinic_id: string;
  subject: string;
  message: string;
  status: "OPEN" | "RESOLVED";
  admin_response?: string | null;
  responded_at?: string | null;
  created_at: string;
}

export function getAdminAnalytics(): Promise<PlatformAnalytics> {
  return apiFetch<PlatformAnalytics>("/admin/analytics");
}

export function listHospitals(search?: string): Promise<Hospital[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<Hospital[]>(`/admin/hospitals${q}`);
}

export function blockHospital(clinicId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/hospitals/${clinicId}/block`, { method: "POST" });
}

export function unblockHospital(clinicId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/hospitals/${clinicId}/unblock`, { method: "POST" });
}

export function updateSubscription(clinicId: string, plan: string): Promise<any> {
  return apiFetch<any>(`/admin/subscriptions/${clinicId}`, {
    method: "POST",
    body: JSON.stringify({ plan, is_active: true }),
  });
}

export function listSupportQueries(): Promise<SupportQuery[]> {
  return apiFetch<SupportQuery[]>("/admin/queries");
}

export function respondSupportQuery(queryId: string, responseText: string): Promise<SupportQuery> {
  return apiFetch<SupportQuery>(`/admin/queries/${queryId}/respond`, {
    method: "POST",
    body: JSON.stringify({ response: responseText }),
  });
}
