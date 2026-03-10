"use client";

import { useState } from "react";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subscribe = async () => {
    setLoading(true); setError("");
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setLoading(false);
      setError(data?.error ?? "Unable to start checkout");
      return;
    }
    window.location.href = data.url;
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--background)", color: "var(--text)" }}>
      <div style={{ width: 720, maxWidth: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: 20, padding: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 900 }}>Billing</div>
          <div style={{ color: "var(--muted)", lineHeight: 1.7, marginTop: 12 }}>Subscribe to unlock payroll features for your workspace. Ensure seamless compliance and access to all FSS tools.</div>
        </div>

        <div style={{ background: "#0c1831", border: "2px solid #38bdf8", color: "white", borderRadius: 20, padding: 32, boxShadow: "0 20px 40px rgba(56,189,248,0.1)" }}>
          <div style={{ opacity: 0.8, fontSize: 14, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800 }}>Pro Plan</div>
          <div style={{ fontSize: 48, fontWeight: 900, marginTop: 8 }}>€39<span style={{ fontSize: 18, opacity: 0.8 }}>/month</span></div>
          <div style={{ marginTop: 20, color: "#cbd5e1", lineHeight: 1.8 }}>Includes full payroll runs, FS3/FS5/FS7 generation, timesheets, and historical record keeping.</div>
          
          {error ? <div style={{ color: "#fca5a5", marginTop: 16, background: "rgba(239,68,68,0.1)", padding: 12, borderRadius: 8 }}>{error}</div> : null}
          
          <button onClick={subscribe} disabled={loading} style={{ width: "100%", padding: "14px 16px", marginTop: 24, borderRadius: 12, border: "none", background: "#38bdf8", color: "#0b1220", fontWeight: 900, fontSize: 16, cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={(e) => e.currentTarget.style.transform = "none"}>
            {loading ? "Redirecting..." : "Subscribe Now"}
          </button>
        </div>

      </div>
    </main>
  );
}