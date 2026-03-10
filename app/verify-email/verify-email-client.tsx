"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { panel, input as inputStyle, primaryBtn, ghostBtn } from "@/components/styles";

export default function VerifyEmailClient() {
  const params = useSearchParams();
  const initialEmail = useMemo(() => params.get("email") ?? "", [params]);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(""); setMsg("");

    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error ?? "Verification failed"); return; }

      setMsg("Email verified. You can now sign in.");
      if (password) {
        const si = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
        if (si?.ok) { window.location.href = si.url ?? "/dashboard"; }
      }
    } finally { setLoading(false); }
  }

  async function resendCode() {
    setError(""); setMsg("");
    const res = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data?.error ?? "Failed to resend code"); return; }
    setMsg("A new code has been sent.");
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--background)", color: "var(--text)" }}>
      <div style={{ width: 460, maxWidth: "100%" }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, textAlign: "center" }}>Verify your email</div>
        <div style={{ opacity: 0.75, marginBottom: 24, textAlign: "center" }}>Enter the 6-digit code sent to your email address.</div>

        <div style={panel}>
          <form onSubmit={verify}>
            <label style={{ display: "block" }}><div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>Email</div><input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%" }} /></label>
            <label style={{ display: "block", marginTop: 16 }}><div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>Verification code</div><input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} style={{ ...inputStyle, width: "100%", letterSpacing: "0.3em", textAlign: "center", fontSize: 20, height: 48 }} placeholder="000000" /></label>
            <label style={{ display: "block", marginTop: 16 }}><div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>Password (optional, to sign in immediately)</div><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, width: "100%" }} /></label>

            {error ? <div style={{ marginTop: 14, color: "#fca5a5" }}>{error}</div> : null}
            {msg ? <div style={{ marginTop: 14, color: "#10b981" }}>{msg}</div> : null}

            <button style={{ ...primaryBtn, width: "100%", marginTop: 24, height: 44, fontSize: 15 }} disabled={loading}>{loading ? "Verifying..." : "Verify email"}</button>
          </form>
          <button type="button" style={{ ...ghostBtn, width: "100%", marginTop: 12, background: "transparent" }} onClick={resendCode}>Resend code</button>
        </div>
      </div>
    </main>
  );
}