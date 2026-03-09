"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  panel,
  input as inputStyle,
  primaryBtn,
  ghostBtn,
} from "@/components/styles";

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
    setLoading(true);
    setError("");
    setMsg("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Verification failed");
        return;
      }

      setMsg("Email verified. You can now sign in.");

      if (password) {
        const si = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: "/dashboard",
        });

        if (si?.ok) {
          window.location.href = si.url ?? "/dashboard";
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError("");
    setMsg("");

    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error ?? "Failed to resend code");
      return;
    }

    setMsg("A new code has been sent.");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: 460, maxWidth: "100%" }}>
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>
          Verify your email
        </div>
        <div style={{ opacity: 0.75, marginBottom: 14 }}>
          Enter the 6-digit code sent to your email address.
        </div>

        <div style={panel}>
          <form onSubmit={verify}>
            <label style={{ display: "block" }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ ...inputStyle, width: "100%", marginTop: 6 }}
              />
            </label>

            <label style={{ display: "block", marginTop: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Verification code
              </div>
              <input
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                style={{
                  ...inputStyle,
                  width: "100%",
                  marginTop: 6,
                  letterSpacing: "0.3em",
                  textAlign: "center",
                }}
              />
            </label>

            <label style={{ display: "block", marginTop: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Password (optional, to sign in immediately)
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, width: "100%", marginTop: 6 }}
              />
            </label>

            {error ? (
              <div style={{ marginTop: 10, color: "crimson" }}>{error}</div>
            ) : null}

            {msg ? (
              <div style={{ marginTop: 10, color: "green" }}>{msg}</div>
            ) : null}

            <button
              style={{ ...primaryBtn, width: "100%", marginTop: 12 }}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify email"}
            </button>
          </form>

          <button
            type="button"
            style={{ ...ghostBtn, width: "100%", marginTop: 10 }}
            onClick={resendCode}
          >
            Resend code
          </button>
        </div>
      </div>
    </main>
  );
}