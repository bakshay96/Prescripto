"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentHistory,
  applyCouponCode,
  CouponResponse,
  PaymentRecord,
} from "../utils/api";

interface SubscriptionPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (plan: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

type PlanType = "TRIAL_7D" | "PRO" | "ENTERPRISE";

export default function SubscriptionPaymentModal({
  isOpen,
  onClose,
  onSuccess,
}: SubscriptionPaymentModalProps) {
  const { theme, themeId } = useTheme();
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
    if (isOpen) {
      loadHistory();
      loadRazorpayScript();
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Create order on backend passing applied coupon code
      const activeCoupon = appliedCoupon ? appliedCoupon.coupon_code : (couponInput.trim() || undefined);
      const order = await createRazorpayOrder(selectedPlan, activeCoupon);

      // 2. If Free Trial or 100% Discounted (e.g. DOCTORFREE coupon) — backend activates plan instantly
      if (order.amount === 0 || order.is_free_trial) {
        setSuccessMsg(order.message || `Plan ${selectedPlan} activated successfully!`);
        onSuccess?.(selectedPlan);
        loadHistory();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("subscription-updated"));
        }
        setLoading(false);
        return;
      }

      // 3. Options for Razorpay Checkout Popup with Prefilled Contact details (no interruptive prompt)
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
        notes: {
          plan: selectedPlan,
          app: "Prescripto Healthcare System",
        },
        handler: async (response: any) => {
          try {
            // 4. HMAC-SHA256 verification on backend
            const verifyRes = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id || order.order_id,
              razorpay_payment_id: response.razorpay_payment_id || `pay_live_${Date.now()}`,
              razorpay_signature: response.razorpay_signature || `rzp_test_sig_${Date.now()}`,
              plan: selectedPlan,
            });

            setSuccessMsg(verifyRes.message);
            onSuccess?.(selectedPlan);
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
          ondismiss: () => {
            setLoading(false);
          },
        },
        theme: {
          color: "#005691",
        },
      };

      // Open Razorpay Popup
      if (typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Test fallback
        const verifyRes = await verifyRazorpayPayment({
          razorpay_order_id: order.order_id,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: `rzp_test_sig_${Date.now()}`,
          plan: selectedPlan,
        });
        setSuccessMsg(verifyRes.message);
        onSuccess?.(selectedPlan);
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, Arial, sans-serif",
      }}
    >
      <div
        className="ux4g-theme-govblue ux4g-card"
        style={{
          width: 620,
          maxWidth: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          background: isDark ? "#0f172a" : "#ffffff",
          border: `1.5px solid ${isDark ? "#1e293b" : "#cbd5e1"}`,
          borderRadius: 20,
          padding: 24,
        }}
      >
        {/* Header */}
        <div className="ux4g-card-header" style={{ marginBottom: 16 }}>
          <div>
            <div className="ux4g-card-title" style={{ fontSize: 18 }}>
              💳 Subscription Plans &amp; Razorpay Payment
            </div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
              7-Day Free Trial • Discount Coupons • 256-bit Bank Encryption
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: theme.textMuted,
              fontSize: 18,
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ✕
          </button>
        </div>

        {/* Success / Error Banners */}
        {successMsg && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(4,106,56,0.15)",
              border: "1.5px solid #046a38",
              color: isDark ? "#6ee7b7" : "#046a38",
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            ✅ {successMsg}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(225,29,72,0.15)",
              border: "1.5px solid #e11d48",
              color: "#f43f5e",
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Plan Selection Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {/* 7-DAY FREE TRIAL */}
          <div
            onClick={() => setSelectedPlan("TRIAL_7D")}
            style={{
              padding: 12,
              borderRadius: 14,
              border: `2px solid ${selectedPlan === "TRIAL_7D" ? "#046a38" : isDark ? "#334155" : "#e2e8f0"}`,
              background: selectedPlan === "TRIAL_7D" ? "rgba(4,106,56,0.08)" : "transparent",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span className="ux4g-badge ux4g-badge-green" style={{ fontSize: 9 }}>FREE TRIAL</span>
            <div style={{ fontSize: 13, fontWeight: 900, color: theme.text, marginTop: 6 }}>7-Day Trial</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#046a38", margin: "2px 0" }}>₹0</div>
            <div style={{ fontSize: 10, color: theme.textMuted }}>No Credit Card Required</div>
          </div>

          {/* PRO PLAN */}
          <div
            onClick={() => setSelectedPlan("PRO")}
            style={{
              padding: 12,
              borderRadius: 14,
              border: `2px solid ${selectedPlan === "PRO" ? "#ff671f" : isDark ? "#334155" : "#e2e8f0"}`,
              background: selectedPlan === "PRO" ? "rgba(255,103,31,0.08)" : "transparent",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span className="ux4g-badge ux4g-badge-saffron" style={{ fontSize: 9 }}>POPULAR</span>
            <div style={{ fontSize: 13, fontWeight: 900, color: theme.text, marginTop: 6 }}>PRO PLAN</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#ff671f", margin: "2px 0" }}>₹999/mo</div>
            <div style={{ fontSize: 10, color: theme.textMuted }}>Up to 5 Doctors &amp; OPD</div>
          </div>

          {/* ENTERPRISE PLAN */}
          <div
            onClick={() => setSelectedPlan("ENTERPRISE")}
            style={{
              padding: 12,
              borderRadius: 14,
              border: `2px solid ${selectedPlan === "ENTERPRISE" ? "#005691" : isDark ? "#334155" : "#e2e8f0"}`,
              background: selectedPlan === "ENTERPRISE" ? "rgba(0,86,145,0.08)" : "transparent",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span className="ux4g-badge ux4g-badge-gov" style={{ fontSize: 9 }}>FULL SUITE</span>
            <div style={{ fontSize: 13, fontWeight: 900, color: theme.text, marginTop: 6 }}>ENTERPRISE</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#005691", margin: "2px 0" }}>₹2,499/mo</div>
            <div style={{ fontSize: 10, color: theme.textMuted }}>Unlimited ICU &amp; Pharmacies</div>
          </div>
        </div>

        {/* Coupon Code Input Box (for PRO / ENTERPRISE) */}
        {selectedPlan !== "TRIAL_7D" && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: isDark ? "#020617" : "#f8fafc",
              border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.text, marginBottom: 6 }}>
              🎟️ Have a Promotional Discount Coupon?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Enter code e.g. PRESCRIPTO50"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                className="ux4g-input"
                style={{ fontSize: 12, padding: "6px 10px" }}
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="ux4g-btn ux4g-btn-saffron"
                style={{ padding: "6px 14px", fontSize: 12 }}
              >
                Apply
              </button>
            </div>

            {appliedCoupon && (
              <div style={{ fontSize: 11, color: "#046a38", fontWeight: 800, marginTop: 6 }}>
                🎉 {appliedCoupon.description} — Final Price: ₹{appliedCoupon.final_price_inr}
              </div>
            )}
            {couponError && (
              <div style={{ fontSize: 11, color: "#e11d48", fontWeight: 800, marginTop: 6 }}>
                ⚠️ {couponError}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} className="ux4g-btn ux4g-btn-outline" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className="ux4g-btn ux4g-btn-saffron"
            style={{ flex: 2 }}
          >
            {loading
              ? "Activating Plan…"
              : selectedPlan === "TRIAL_7D"
              ? "🚀 Activate 7-Day Free Trial"
              : `💳 Pay ${getPriceDisplay()} via Razorpay`}
          </button>
        </div>

        {/* Audit History Log */}
        {history.length > 0 && (
          <div style={{ marginTop: 20, borderTop: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`, paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: theme.text, marginBottom: 6 }}>
              📜 Subscription &amp; Payment History
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {history.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 10,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: isDark ? "#020617" : "#f1f5f9",
                  }}
                >
                  <span>
                    <strong>{rec.plan}</strong> · ₹{rec.amount}
                  </span>
                  <span style={{ color: "#046a38", fontWeight: 800 }}>
                    {rec.status} ({new Date(rec.verified_at).toLocaleDateString("en-IN")})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
