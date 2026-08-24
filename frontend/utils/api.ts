/**
 * Central API client for Prescripto frontend.
 * Automatically attaches JWT Authorization header from localStorage.
 */

export const PRIMARY_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
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
  status?: "ACTIVE" | "BANNED" | "SUSPENDED";
  is_banned?: boolean;
  ban_reason?: string | null;
  created_at?: string;
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
  age_years?: number;
  age_months?: number;
  gender?: string;
  phone?: string;
}): Promise<Patient> {
  return apiFetch<Patient>("/patients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updatePatient(patientId: string, data: Partial<Patient>): Promise<Patient> {
  return apiFetch<Patient>(`/patients/${patientId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function banPatient(patientId: string, reason?: string): Promise<{ message: string; patient: Patient }> {
  const q = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  return apiFetch<{ message: string; patient: Patient }>(`/patients/${patientId}/ban${q}`, {
    method: "POST",
  });
}

export function unbanPatient(patientId: string): Promise<{ message: string; patient: Patient }> {
  return apiFetch<{ message: string; patient: Patient }>(`/patients/${patientId}/unban`, {
    method: "POST",
  });
}

export function deletePatient(patientId: string): Promise<{ message: string; deleted_patient_id: string }> {
  return apiFetch<{ message: string; deleted_patient_id: string }>(`/patients/${patientId}`, {
    method: "DELETE",
  });
}

export function deletePatientHistory(patientId: string): Promise<{ message: string; deleted_count: number }> {
  return apiFetch<{ message: string; deleted_count: number }>(`/patients/${patientId}/history`, {
    method: "DELETE",
  });
}

export interface PatientHistoryItem {
  id: string;
  prescription_number: string;
  doctor_name: string;
  diagnosis: string;
  chief_complaints: string;
  vitals?: any;
  medicines: any[];
  advice?: string;
  date: string;
}

export interface PatientHistoryResponse {
  patient: Patient;
  total_visits: number;
  history: PatientHistoryItem[];
}

export type PatientHistoryRecord = PatientHistoryResponse;

export function getPatientHistory(patientId: string): Promise<PatientHistoryResponse> {
  return apiFetch<PatientHistoryResponse>(`/patients/${patientId}/history`);
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
  price?: number;
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
    age_years?: number;
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

export function dispensePrescription(prescriptionId: string): Promise<{ message: string; status: string }> {
  return apiFetch<{ message: string; status: string }>(`/prescriptions/${prescriptionId}/dispense`, {
    method: "POST",
  });
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

export interface HospitalOwnerInfo {
  name: string;
  email: string;
  phone: string;
  role: string;
  registration_number?: string;
}

export interface Hospital {
  id: string;
  name: string;
  name_mr?: string;
  address: string;
  phone: string;
  email: string;
  registration_number: string;
  created_at?: string;
  active_from?: string;
  doctor_count: number;
  pharmacist_count?: number;
  prescription_count?: number;
  patient_count?: number;
  medicine_count?: number;
  bill_count?: number;
  total_revenue?: number;
  subscription_plan: string;
  subscription_active: boolean;
  subscription_valid_until: string | null;
  trial_days_remaining?: number;
  custom_price_inr?: number | null;
  owner_info?: HospitalOwnerInfo | null;
  facilities?: string[];
  clinic_hours?: string;
}

export interface UserLoginVitals {
  id: string;
  full_name: string;
  email: string;
  role: string;
  clinic_id: string;
  hospital_name: string;
  is_active: boolean;
  license_number?: string | null;
  last_login_at: string;
  last_platform: string;
  last_ip: string;
  is_online: boolean;
  created_at: string;
}

export function listAdminUsers(): Promise<UserLoginVitals[]> {
  return apiFetch<UserLoginVitals[]>("/admin/users");
}

export interface BroadcastMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  target_group: "ALL" | "DOCTORS" | "PHARMACISTS" | "HOSPITALS" | "SPECIFIC";
  target_clinic_id?: string | null;
  target_user_id?: string | null;
  subject: string;
  message: string;
  priority: "INFO" | "WARNING" | "CRITICAL_ALERT";
  created_at: string;
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

export function grantSubscriptionTrial(clinicId: string, trialDays: number): Promise<{
  message: string;
  clinic_id: string;
  plan: string;
  valid_until: string;
  trial_days_remaining: number;
}> {
  return apiFetch(`/admin/hospitals/${clinicId}/trial`, {
    method: "POST",
    body: JSON.stringify({ trial_days: trialDays }),
  });
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

export interface AdminPlanConfig {
  plan_key: string;
  label: string;
  amount_inr: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
}

export function getAdminPlans(): Promise<AdminPlanConfig[]> {
  return apiFetch<AdminPlanConfig[]>("/admin/plans");
}

export function saveAdminPlan(data: AdminPlanConfig): Promise<{ message: string; plan: any }> {
  return apiFetch<{ message: string; plan: any }>("/admin/plans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function setCustomHospitalSubscription(
  clinicId: string,
  data: { plan: string; custom_price_inr: number; duration_days: number; notes?: string }
): Promise<{ message: string; subscription: any }> {
  return apiFetch<{ message: string; subscription: any }>(`/admin/hospitals/${clinicId}/custom-subscription`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function sendBroadcastMessage(data: {
  target_group: string;
  target_clinic_id?: string;
  target_user_id?: string;
  subject: string;
  message: string;
  priority: string;
}): Promise<{ message: string; id: string; doc: BroadcastMessage }> {
  return apiFetch("/admin/messages/broadcast", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listBroadcastMessages(): Promise<BroadcastMessage[]> {
  return apiFetch<BroadcastMessage[]>("/admin/messages");
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

// ── Doctor & Pharmacy Communication Desk ────────────────────────────────────

export interface CommMessage {
  id: string;
  clinic_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  recipient_role: string;
  message: string;
  prescription_id?: string | null;
  patient_name?: string | null;
  priority: string;
  created_at: string;
}

export function listCommMessages(): Promise<CommMessage[]> {
  return apiFetch<CommMessage[]>("/communication/messages");
}

export function sendCommMessage(data: {
  message: string;
  recipient_role?: string;
  prescription_id?: string;
  patient_name?: string;
  priority?: string;
}): Promise<CommMessage> {
  return apiFetch<CommMessage>("/communication/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Persistent System Notifications & Alerts ────────────────────────────────

export interface SystemApiNotification {
  id: string;
  category: "PRICING" | "FEATURE_ALERT" | "BROADCAST" | "MESSAGE" | "SYSTEM";
  title: string;
  message: string;
  target_role: string;
  target_clinic_id?: string | null;
  priority: string;
  read: boolean;
  expires_at?: string | null;
  reping_count?: number;
  created_at: string;
}

export function listApiNotifications(): Promise<SystemApiNotification[]> {
  return apiFetch<SystemApiNotification[]>("/notifications");
}

export function markApiNotificationsRead(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/notifications/mark-read", { method: "POST" });
}

export function sendApiBroadcastNotification(data: {
  category: string;
  title: string;
  message: string;
  target_role?: string;
  target_clinic_id?: string;
  priority?: string;
  expiry_hours?: number;
}): Promise<{ message: string; id: string }> {
  return apiFetch<{ message: string; id: string }>("/notifications/broadcast", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function repingApiNotification(notificationId: string): Promise<{ message: string; reping_count: number }> {
  return apiFetch<{ message: string; reping_count: number }>(`/notifications/${notificationId}/reping`, { method: "POST" });
}

export function triggerWsBroadcastApi(payload: {
  event: string;
  title: string;
  message: string;
  target_role?: string;
  target_clinic_id?: string;
  priority?: string;
  expires_at?: string;
}): Promise<any> {
  return apiFetch<any>("/ws/broadcast", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Patient WhatsApp & Follow-Up Reminders Gateway ──────────────────────────

export interface FollowupRecord {
  prescription_id: string;
  prescription_number: string;
  patient_name: string;
  phone: string;
  diagnosis: string;
  followup_date: string;
  is_due_today: boolean;
  status: string;
}

export function sendWhatsAppPrescription(data: {
  prescription_id: string;
  phone: string;
  patient_name: string;
  language?: string;
}): Promise<{ message: string; whatsapp_url: string; phone: string; prescription_number: string }> {
  return apiFetch("/messaging/send-whatsapp", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listUpcomingFollowups(): Promise<FollowupRecord[]> {
  return apiFetch<FollowupRecord[]>("/messaging/upcoming-followups");
}

export function sendFollowupReminder(data: {
  prescription_id: string;
  phone: string;
  patient_name: string;
  followup_date: string;
  language?: string;
}): Promise<{ message: string; whatsapp_url: string; phone: string; followup_date: string }> {
  return apiFetch("/messaging/send-followup-reminder", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Payments & Razorpay Subscription ─────────────────────────────────────────

export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan: string;
  plan_label: string;
  is_free_trial?: boolean;
  message?: string;
}

export interface PaymentVerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: string;
}

export interface PaymentRecord {
  id: string;
  clinic_id: string;
  user_id: string;
  order_id: string;
  payment_id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  verified_at: string;
}

export function createRazorpayOrder(plan: string, coupon_code?: string): Promise<RazorpayOrderResponse> {
  return apiFetch<RazorpayOrderResponse>("/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ plan, coupon_code }),
  });
}

export function verifyRazorpayPayment(data: PaymentVerifyRequest): Promise<{
  status: string;
  message: string;
  plan: string;
  valid_until: string;
  payment_id: string;
}> {
  return apiFetch("/payments/verify-payment", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getPaymentHistory(): Promise<PaymentRecord[]> {
  return apiFetch<PaymentRecord[]>("/payments/history");
}

export interface HospitalSubscriptionStatus {
  clinic_id: string;
  plan: string;
  is_active: boolean;
  valid_until: string | null;
  days_remaining: number | null;
}

export interface SubscriptionPlanDetail {
  id: string;
  name: string;
  price_inr: number;
  amount_paise: number;
  currency: string;
  duration_days: number;
  features: string[];
}

export function getSubscriptionStatus(): Promise<HospitalSubscriptionStatus> {
  return apiFetch<HospitalSubscriptionStatus>("/payments/subscription-status");
}

export function getSubscriptionPlans(): Promise<SubscriptionPlanDetail[]> {
  return apiFetch<SubscriptionPlanDetail[]>("/payments/plans");
}

export interface CouponResponse {
  valid: boolean;
  coupon_code: string;
  description: string;
  original_price_inr: number;
  discount_inr: number;
  final_price_inr: number;
  final_amount_paise: number;
}

export function applyCouponCode(coupon_code: string, plan: string): Promise<CouponResponse> {
  return apiFetch<CouponResponse>("/payments/apply-coupon", {
    method: "POST",
    body: JSON.stringify({ coupon_code, plan }),
  });
}

export interface PlatformAnnouncement {
  active: boolean;
  title: string;
  message: string;
  coupon_code: string;
  discount_badge: string;
  trial_offer: string;
}

export function getPlatformAnnouncements(): Promise<PlatformAnnouncement> {
  return apiFetch<PlatformAnnouncement>("/payments/announcements");
}

export function searchPrescriptionByNumber(query: string): Promise<Prescription[]> {
  return apiFetch<Prescription[]>(`/prescriptions/search/${encodeURIComponent(query)}`);
}

export interface PharmacyBillInput {
  prescription_id?: string;
  patient_name: string;
  items: Array<{
    medicine_id: string;
    medicine_name: string;
    quantity: number;
    unit_price: number;
    unit_type?: "TAB" | "STRIP" | string;
    tablets_per_strip?: number;
  }>;
  payment_mode?: string;
  discount_amount?: number;
  tax_gst_percent?: number;
}

export interface PharmacyBillResponse {
  bill_id: string;
  bill_number: string;
  patient_name: string;
  hospital_name?: string;
  hospital_address?: string;
  hospital_phone?: string;
  hospital_gstin?: string;
  items: any[];
  subtotal_amount?: number;
  discount_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  total_amount: number;
  payment_mode?: string;
  status: string;
  created_at: string;
  message: string;
}

export function generatePharmacyBill(data: PharmacyBillInput): Promise<PharmacyBillResponse> {
  return apiFetch<PharmacyBillResponse>("/inventory/billing/generate-bill", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function fetchBillingHistory(search?: string, paymentMode?: string): Promise<PharmacyBillResponse[]> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (paymentMode && paymentMode !== "ALL") params.append("payment_mode", paymentMode);
  return apiFetch<PharmacyBillResponse[]>(`/inventory/billing/history?${params.toString()}`);
}
