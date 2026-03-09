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
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: 480, maxWidth: "100%" }}>
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Create your account</div>
        <div style={{ opacity: 0.75, marginBottom: 14 }}>Sign up with email and password or use Google.</div>
        <div style={panel}>
          <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} style={{ ...ghostBtn, width: "100%" }}>Continue with Google</button>
          <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "14px 0" }}><div style={{ height: 1, flex: 1, background: "var(--panel-border)" }} /><div style={{ fontSize: 12, opacity: 0.7 }}>or</div><div style={{ height: 1, flex: 1, background: "var(--panel-border)" }} /></div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true); setError("");
            const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
            const data = await res.json().catch(() => ({}));
            setLoading(false);
            if (!res.ok) { setError(data?.error ?? "Failed to register"); return; }
            window.location.href = `/verify-email?email=${encodeURIComponent(email.trim())}`;
          }}>
            <label style={{ display: "block" }}><div style={{ fontSize: 12, opacity: 0.7 }}>Full name</div><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ ...inputStyle, width: "100%", marginTop: 6 }} /></label>
            <label style={{ display: "block", marginTop: 10 }}><div style={{ fontSize: 12, opacity: 0.7 }}>Email</div><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" style={{ ...inputStyle, width: "100%", marginTop: 6 }} /></label>
            <label style={{ display: "block", marginTop: 10 }}><div style={{ fontSize: 12, opacity: 0.7 }}>Password</div><div style={{ display: "flex", gap: 8, marginTop: 6 }}><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" style={{ ...inputStyle, width: "100%" }} /><button type="button" style={ghostBtn} onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button></div></label>
            {error && <div style={{ marginTop: 10, color: "crimson" }}>{error}</div>}
            <button style={{ ...primaryBtn, width: "100%", marginTop: 12 }} disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
            <div style={{ marginTop: 10 }}><a href="/login" style={{ fontSize: 13, opacity: 0.85 }}>Already have an account? Log in</a></div>
          </form>
        </div>
      </div>
    </main>
  );
}
