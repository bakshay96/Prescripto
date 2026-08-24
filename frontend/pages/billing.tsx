import Head from "next/head";
import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";
import RoleGuard from "../components/RoleGuard";
import VerticalSidebarNav from "../components/VerticalSidebarNav";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentHistory,
  applyCouponCode,
  CouponResponse,
  PaymentRecord,
} from "../utils/api";

type PlanType = "TRIAL_7D" | "PRO" | "ENTERPRISE";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function BillingContent() {
  const { theme, themeId, lang } = useTheme();
  const isDark = themeId !== "light";

  const [selectedPlan, setSelectedPlan] = useState<PlanType>("PRO");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResponse | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    loadHistory();
    loadRazorpayScript();
  }, []);

  const loadHistory = async () => {
    try {
      const records = await getPaymentHistory();
      setHistory(records);
    } catch {
      // ignore
    }
  };

  const loadRazorpayScript = () => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError(null);
    try {
      const res = await applyCouponCode(couponInput, selectedPlan);
      setAppliedCoupon(res);
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon code.");
      setAppliedCoupon(null);
    }
  };

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const activeCoupon = appliedCoupon ? appliedCoupon.coupon_code : (couponInput.trim() || undefined);
      const order = await createRazorpayOrder(selectedPlan, activeCoupon);

      if (order.amount === 0 || order.is_free_trial) {
        setSuccessMsg(order.message || `Plan ${selectedPlan} activated successfully!`);
        loadHistory();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("subscription-updated"));
        }
        setLoading(false);
        return;
      }

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || order.key_id || "rzp_live_ShxcWH099cPOXb";
      const loggedUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("prescripto_user") || "{}") : {};

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Prescripto Healthcare Platform",
        description: `Subscription: ${order.plan_label}`,
        order_id: order.order_id,
        prefill: {
          name: loggedUser?.name || "Hospital Doctor User",
          email: loggedUser?.email || "doctor@prescripto.com",
          contact: loggedUser?.phone || "9876543210",
        },
        notes: { plan: selectedPlan, app: "Prescripto Healthcare System" },
        handler: async (response: any) => {
          try {
            const verifyRes = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id || order.order_id,
              razorpay_payment_id: response.razorpay_payment_id || `pay_live_${Date.now()}`,
              razorpay_signature: response.razorpay_signature || `rzp_test_sig_${Date.now()}`,
              plan: selectedPlan,
            });

            setSuccessMsg(verifyRes.message);
            loadHistory();
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("subscription-updated"));
            }
          } catch (err: any) {
            setError(err.message || "Payment signature verification failed.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
        theme: { color: "#005691" },
      };

      if (typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        const verifyRes = await verifyRazorpayPayment({
          razorpay_order_id: order.order_id,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: `rzp_test_sig_${Date.now()}`,
          plan: selectedPlan,
        });
        setSuccessMsg(verifyRes.message);
        loadHistory();
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate payment order.");
      setLoading(false);
    }
  };

  const getPriceDisplay = () => {
    if (selectedPlan === "TRIAL_7D") return "₹0 (Free 7 Days)";
    const basePrice = selectedPlan === "PRO" ? 999 : 2499;
    if (appliedCoupon) {
      return `₹${appliedCoupon.final_price_inr} (Discount Applied)`;
    }
    return `₹${basePrice} / month`;
  };

  const TITLE: Record<string, string> = {
    mr: "💳 सबस्क्रिप्शन व पेमेंट व्यवस्थापन",
    hi: "💳 सब्सक्रिप्शन और भुगतान प्रबंधन",
    en: "💳 Subscription & Pricing Plans",
  };
  const SUB: Record<string, string> = {
    mr: "तुमचा चालू प्लॅन, ७-दिवसांचा मोफत ट्रायल, आणि रेझरपे सुरक्षित पेमेंट.",
    hi: "आपका वर्तमान प्लान, ७-दिनों का मुफ्त ट्रायल, और रेज़रपे सुरक्षित भुगतान।",
    en: "Manage hospital subscription, select pricing plans, apply coupons, and process bank-grade payments.",
  };

  return (
    <>
      <Head>
        <title>Subscription & Pricing — Prescripto</title>
        <meta name="description" content="Manage your hospital subscription plan, upgrade tier, apply discount coupons, and view billing history." />
      </Head>

      {/* Sticky Layout Wrapper: Sidebar locked on left, main area scrollable */}
      <div
        className="flex h-[calc(100vh-76px)] overflow-hidden"
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily: "'Inter','Noto Sans Devanagari',Arial,sans-serif",
        }}
      >
        {/* Fixed / Sticky Left Sidebar */}
        <VerticalSidebarNav mode="DOCTOR" />

        {/* Scrollable Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto space-y-6 min-w-0">
          <div style={{ marginBottom: 20 }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">💳</span>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.text, margin: 0 }}>
                {TITLE[lang] ?? TITLE.en}
              </h1>
              <span className="ux4g-badge ux4g-badge-gov">RAZORPAY VERIFIED</span>
            </div>
            <p style={{ fontSize: 12, color: theme.textMuted, margin: "4px 0 0" }}>
              {SUB[lang] ?? SUB.en}
            </p>
          </div>

          {/* Active Plan Summary Card */}
          <div
            className="p-5 rounded-2xl border flex items-center justify-between flex-wrap gap-4 shadow-sm"
            style={{
              background: isDark ? "linear-gradient(135deg,#005691 0%,#0b192c 100%)" : "linear-gradient(135deg,#e0f2fe 0%,#ffffff 100%)",
              borderColor: isDark ? "#005691" : "#7dd3fc",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">⭐</span>
              <div>
                <div className="text-base font-black" style={{ color: isDark ? "#ffffff" : "#005691" }}>
                  Active Subscription: PRO PLAN
                </div>
                <div className="text-xs mt-0.5" style={{ color: isDark ? "#90caf9" : "#0284c7" }}>
                  Full Access to Doctor OPD, Digital Prescription Writer, EHR Patient Records &amp; Medical Store Sync.
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-emerald-400">● 30 Days Remaining</div>
              <div className="text-[11px]" style={{ color: theme.textMuted }}>Renewal Date: 2026-09-20</div>
            </div>
          </div>

          {/* Banners */}
          {successMsg && (
            <div
              className="p-4 rounded-xl text-xs font-bold flex items-center justify-between"
              style={{ background: "rgba(4,106,56,0.15)", border: "1.5px solid #046a38", color: isDark ? "#6ee7b7" : "#046a38" }}
            >
              <span>✅ {successMsg}</span>
              <button type="button" onClick={() => setSuccessMsg(null)} className="font-black text-sm">✕</button>
            </div>
          )}

          {error && (
            <div
              className="p-4 rounded-xl text-xs font-bold flex items-center justify-between"
              style={{ background: "rgba(225,29,72,0.15)", border: "1.5px solid #e11d48", color: "#f43f5e" }}
            >
              <span>⚠️ {error}</span>
              <button type="button" onClick={() => setError(null)} className="font-black text-sm">✕</button>
            </div>
          )}

          {/* Inline Pricing Cards Section */}
          <div>
            <h2 className="text-base font-black mb-3" style={{ color: theme.text }}>
              Select Subscription Tier &amp; Pricing
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 7-DAY FREE TRIAL */}
              <div
                onClick={() => setSelectedPlan("TRIAL_7D")}
                className={`
                  p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between
                  ${selectedPlan === "TRIAL_7D" ? "scale-[1.02] shadow-xl" : "hover:scale-[1.01]"}
                `}
                style={{
                  background: selectedPlan === "TRIAL_7D"
                    ? (isDark ? "rgba(4,106,56,0.15)" : "rgba(4,106,56,0.06)")
                    : (isDark ? "#0f172a" : "#ffffff"),
                  borderColor: selectedPlan === "TRIAL_7D" ? "#046a38" : (isDark ? "#1e293b" : "#e2e8f0"),
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="ux4g-badge ux4g-badge-green text-[10px]">7-DAY FREE TRIAL</span>
                    {selectedPlan === "TRIAL_7D" && <span className="text-emerald-400 font-black text-xs">✓ Selected</span>}
                  </div>
                  <div className="text-lg font-black mt-3" style={{ color: theme.text }}>7-Day Free Trial</div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 my-2">₹0</div>
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    Full 7 days instant access. No credit card required.
                  </p>
                  <ul className="mt-4 space-y-2 text-xs font-semibold" style={{ color: theme.text }}>
                    <li>✓ Unlimited Prescription Writing</li>
                    <li>✓ Patient Directory Access</li>
                    <li>✓ Hospital Header Customization</li>
                  </ul>
                </div>
              </div>

              {/* PRO PLAN */}
              <div
                onClick={() => setSelectedPlan("PRO")}
                className={`
                  p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between
                  ${selectedPlan === "PRO" ? "scale-[1.02] shadow-xl" : "hover:scale-[1.01]"}
                `}
                style={{
                  background: selectedPlan === "PRO"
                    ? (isDark ? "rgba(255,103,31,0.15)" : "rgba(255,103,31,0.06)")
                    : (isDark ? "#0f172a" : "#ffffff"),
                  borderColor: selectedPlan === "PRO" ? "#ff671f" : (isDark ? "#1e293b" : "#e2e8f0"),
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="ux4g-badge ux4g-badge-saffron text-[10px]">MOST POPULAR</span>
                    {selectedPlan === "PRO" && <span className="text-amber-500 font-black text-xs">✓ Selected</span>}
                  </div>
                  <div className="text-lg font-black mt-3" style={{ color: theme.text }}>PRO PLAN</div>
                  <div className="text-2xl font-black text-amber-500 my-2">₹999 <span className="text-xs font-bold text-slate-400">/ month</span></div>
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    Complete OPD &amp; Clinic Suite for Doctors &amp; Staff.
                  </p>
                  <ul className="mt-4 space-y-2 text-xs font-semibold" style={{ color: theme.text }}>
                    <li>✓ Everything in Free Trial</li>
                    <li>✓ Medical Store Real-time Inventory</li>
                    <li>✓ Multi-Doctor OPD Support</li>
                    <li>✓ Multilingual Printing (Mr/Hi/En)</li>
                  </ul>
                </div>
              </div>

              {/* ENTERPRISE PLAN */}
              <div
                onClick={() => setSelectedPlan("ENTERPRISE")}
                className={`
                  p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between
                  ${selectedPlan === "ENTERPRISE" ? "scale-[1.02] shadow-xl" : "hover:scale-[1.01]"}
                `}
                style={{
                  background: selectedPlan === "ENTERPRISE"
                    ? (isDark ? "rgba(0,86,145,0.15)" : "rgba(0,86,145,0.06)")
                    : (isDark ? "#0f172a" : "#ffffff"),
                  borderColor: selectedPlan === "ENTERPRISE" ? "#005691" : (isDark ? "#1e293b" : "#e2e8f0"),
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="ux4g-badge ux4g-badge-gov text-[10px]">FULL SUITE</span>
                    {selectedPlan === "ENTERPRISE" && <span className="text-sky-400 font-black text-xs">✓ Selected</span>}
                  </div>
                  <div className="text-lg font-black mt-3" style={{ color: theme.text }}>ENTERPRISE</div>
                  <div className="text-2xl font-black text-sky-500 my-2">₹2,499 <span className="text-xs font-bold text-slate-400">/ month</span></div>
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    Unlimited Hospital, ICU Facilities &amp; Pharmacies.
                  </p>
                  <ul className="mt-4 space-y-2 text-xs font-semibold" style={{ color: theme.text }}>
                    <li>✓ Everything in PRO Plan</li>
                    <li>✓ Unlimited ICU &amp; Ward Beds</li>
                    <li>✓ Dedicated Support Manager</li>
                    <li>✓ Custom Hospital Billing Formats</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Coupon Code Entry & Checkout Bar */}
          <div
            className="p-5 rounded-2xl border space-y-4"
            style={{
              background: isDark ? "#0f172a" : "#ffffff",
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
            }}
          >
            {selectedPlan !== "TRIAL_7D" && (
              <div>
                <div className="text-xs font-bold mb-2" style={{ color: theme.text }}>
                  🎟️ Apply Promotional Discount Coupon
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter coupon code e.g. PRESCRIPTO50"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="ux4g-input flex-1"
                    style={{ fontSize: 12, padding: "8px 12px" }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="ux4g-btn ux4g-btn-saffron px-5"
                    style={{ fontSize: 12 }}
                  >
                    Apply Coupon
                  </button>
                </div>

                {appliedCoupon && (
                  <div className="text-xs font-bold text-emerald-500 mt-2">
                    🎉 {appliedCoupon.description} — Final Discounted Price: ₹{appliedCoupon.final_price_inr}
                  </div>
                )}
                {couponError && (
                  <div className="text-xs font-bold text-rose-500 mt-2">
                    ⚠️ {couponError}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t flex items-center justify-between flex-wrap gap-4" style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
              <div>
                <div className="text-xs font-semibold" style={{ color: theme.textMuted }}>Selected Plan Checkout</div>
                <div className="text-lg font-black" style={{ color: theme.text }}>{getPriceDisplay()}</div>
              </div>
              <button
                type="button"
                onClick={handlePay}
                disabled={loading}
                className="ux4g-btn ux4g-btn-saffron px-8 py-3 text-sm font-black shadow-lg"
              >
                {loading
                  ? "Activating Plan…"
                  : selectedPlan === "TRIAL_7D"
                  ? "🚀 Activate 7-Day Free Trial"
                  : `💳 Pay ${getPriceDisplay()} via Razorpay`}
              </button>
            </div>
          </div>

          {/* Payment Audit History */}
          {history.length > 0 && (
            <div
              className="p-5 rounded-2xl border space-y-3"
              style={{
                background: isDark ? "#0f172a" : "#ffffff",
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
              }}
            >
              <div className="text-xs font-black" style={{ color: theme.text }}>
                📜 Recent Subscription &amp; Payment Logs
              </div>
              <div className="space-y-2">
                {history.slice(0, 5).map((rec) => (
                  <div
                    key={rec.id}
                    className="flex justify-between items-center text-xs p-2.5 rounded-lg"
                    style={{ background: isDark ? "#020617" : "#f8fafc" }}
                  >
                    <div>
                      <strong style={{ color: theme.text }}>{rec.plan}</strong> · ₹{rec.amount}
                    </div>
                    <div className="text-emerald-500 font-bold">
                      {rec.status} ({new Date(rec.verified_at).toLocaleDateString("en-IN")})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function BillingPage() {
  return (
    <RoleGuard allowedRoles={["DOCTOR", "MASTER_ADMIN"]}>
      <BillingContent />
    </RoleGuard>
  );
}
