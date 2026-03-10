"use client";

import { getSession, signIn } from "next-auth/react";
import { useState } from "react";
import { panel, input as inputStyle, primaryBtn, ghostBtn } from "@/components/styles";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--background)", color: "var(--text)" }}>
      <div style={{ width: 440, maxWidth: "100%" }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, textAlign: "center" }}>Welcome back</div>
        <div style={{ opacity: 0.75, marginBottom: 24, textAlign: "center" }}>Sign in to continue to your payroll dashboard.</div>

        <div style={panel}>
          <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} style={{ ...ghostBtn, width: "100%", background: "var(--input-bg)" }}>Continue with Google</button>
          <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "18px 0" }}><div style={{ height: 1, flex: 1, background: "var(--panel-border)" }} /><div style={{ fontSize: 12, opacity: 0.5 }}>OR</div><div style={{ height: 1, flex: 1, background: "var(--panel-border)" }} /></div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (rememberMe) localStorage.setItem("rememberMe", "1"); else localStorage.removeItem("rememberMe");
            const res = await signIn("credentials", { email: email.trim(), password, callbackUrl: "/dashboard", redirect: false });
            if (res?.error) {
              setError(res.error === "EMAIL_NOT_VERIFIED" ? "Please verify your email before signing in." : "Invalid email or password");
              return;
            }
            const session = await getSession();
            const twoFactorEnabled = Boolean((session?.user as any)?.twoFactorEnabled);
            const twoFactorVerified = Boolean((session?.user as any)?.twoFactorVerified);
            if (twoFactorEnabled && !twoFactorVerified) { window.location.href = "/verify-2fa"; return; }
            window.location.href = res?.url ?? "/dashboard";
          }}>
            <label style={{ display: "block" }}><div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>Email</div><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" style={{ ...inputStyle, width: "100%" }} /></label>
            <label style={{ display: "block", marginTop: 16 }}><div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>Password</div><div style={{ display: "flex", gap: 8 }}><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, width: "100%" }} /><button type="button" style={ghostBtn} onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button></div></label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, opacity: 0.8 }}><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Remember me</label>
            {error && <div style={{ marginTop: 12, color: "#fca5a5", fontSize: 14 }}>{error}</div>}
            <button style={{ ...primaryBtn, width: "100%", marginTop: 20, height: 44, fontSize: 15 }}>Log in</button>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><a href="/forgot-password" style={{ fontSize: 13, color: "#38bdf8", textDecoration: "none" }}>Forgot password?</a><a href="/register" style={{ fontSize: 13, color: "#38bdf8", textDecoration: "none" }}>Create an account</a></div>
          </form>
        </div>
      </div>
    </main>
  );
}