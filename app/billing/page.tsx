
"use client";

import { useState } from "react";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subscribe = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setLoading(false);
      setError(data?.error ?? "Unable to start checkout");
      return;
    }
    window.location.href = data.url;
  };

  return <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", padding:24, background:"#f8fafc" }}><div style={{ width:720, maxWidth:"100%", display:"grid", gridTemplateColumns:"0.9fr 1.1fr", gap:20 }}><div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:20, padding:24 }}><div style={{ fontSize:30, fontWeight:900 }}>Billing</div><div style={{ color:"#475569", lineHeight:1.7, marginTop:10 }}>Subscribe to unlock payroll features for your workspace.</div></div><div style={{ background:"#0f172a", color:"white", borderRadius:20, padding:24 }}><div style={{ opacity:0.75 }}>Monthly plan</div><div style={{ fontSize:40, fontWeight:900, marginTop:8 }}>€39<span style={{ fontSize:18, opacity:0.8 }}>/month</span></div><div style={{ marginTop:16, color:"#cbd5e1", lineHeight:1.8 }}>Payroll runs, payslips, FSS forms, employee management and history.</div>{error ? <div style={{ color:"#fca5a5", marginTop:12 }}>{error}</div> : null}<button onClick={subscribe} disabled={loading} style={{ padding:"12px 16px", marginTop:18, borderRadius:12, border:"1px solid #8a6a18", background:"#8a6a18", color:"white", fontWeight:800 }}>{loading ? "Redirecting to checkout..." : "Subscribe"}</button></div></div></main>;
}
