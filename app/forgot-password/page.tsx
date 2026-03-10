"use client";

import { useState } from "react";
import { panel, input as inputStyle, primaryBtn } from "@/components/styles";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--background)", color: "var(--text)" }}>
      <div style={{ width: 440, maxWidth: "100%" }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, textAlign: "center" }}>Reset password</div>
        <p style={{ opacity: 0.75, marginBottom: 24, textAlign: "center" }}>Enter your email and we’ll send you a reset link.</p>

        <div style={panel}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            await fetch("/api/auth/request-password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
            setSent(true);
          }}>
            <label style={{ display: "block" }}>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>Email</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%" }} placeholder="you@company.com" />
            </label>
            <button style={{ ...primaryBtn, width: "100%", marginTop: 20, height: 44 }}>Send reset link</button>
          </form>

          {sent && <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: 14 }}>If an account exists for that email, a reset link has been sent.</div>}

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <a href="/login" style={{ fontSize: 13, color: "#38bdf8", textDecoration: "none" }}>Back to login</a>
          </div>
        </div>
      </div>
    </main>
  );
}