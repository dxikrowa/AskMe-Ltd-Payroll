"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { panel, input as inputStyle, primaryBtn, ghostBtn } from "@/components/styles";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--background)", color: "var(--text)" }}>
      <div style={{ width: 480, maxWidth: "100%" }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, textAlign: "center" }}>Create your account</div>
        <div style={{ opacity: 0.75, marginBottom: 24, textAlign: "center" }}>Start your 14-day free trial. No credit card required.</div>
        <div style={panel}>
          <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} style={{ ...ghostBtn, width: "100%", background: "var(--input-bg)" }}>Continue with Google</button>
          <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "18px 0" }}><div style={{ height: 1, flex: 1, background: "var(--panel-border)" }} /><div style={{ fontSize: 12, opacity: 0.5 }}>OR</div><div style={{ height: 1, flex: 1, background: "var(--panel-border)" }} /></div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true); setError("");
            const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
            const data = await res.json().catch(() => ({}));
            setLoading(false);
            if (!res.ok) { setError(data?.error ?? "Failed to register"); return; }
            window.location.href = `/verify-email?email=${encodeURIComponent(email.trim())}`;
          }}>
            <label style={{ display: "block" }}><div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>Full name</div><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ ...inputStyle, width: "100%" }} /></label>
            <label style={{ display: "block", marginTop: 16 }}><div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>Email</div><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" style={{ ...inputStyle, width: "100%" }} /></label>
            <label style={{ display: "block", marginTop: 16 }}><div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>Password</div><div style={{ display: "flex", gap: 8 }}><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" style={{ ...inputStyle, width: "100%" }} /><button type="button" style={ghostBtn} onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button></div></label>
            {error && <div style={{ marginTop: 12, color: "#fca5a5", fontSize: 14 }}>{error}</div>}
            <button style={{ ...primaryBtn, width: "100%", marginTop: 24, height: 44, fontSize: 15 }} disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
            <div style={{ marginTop: 16, textAlign: "center" }}><a href="/login" style={{ fontSize: 13, color: "#38bdf8", textDecoration: "none" }}>Already have an account? Log in</a></div>
          </form>
        </div>
      </div>
    </main>
  );
}