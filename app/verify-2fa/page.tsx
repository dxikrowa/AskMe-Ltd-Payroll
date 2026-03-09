"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Logo from "@/components/logo";

type Mode = "totp" | "backup";

export default function Verify2FAPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [mode, setMode] = useState<Mode>("totp");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.email) {
      router.replace("/login");
      return;
    }

    const twoFactorEnabled = Boolean((session.user as any)?.twoFactorEnabled);
    const twoFactorVerified = Boolean((session.user as any)?.twoFactorVerified);

    if (!twoFactorEnabled || twoFactorVerified) {
      router.replace("/dashboard");
    }
  }, [router, session, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          purpose: mode === "backup" ? "backup" : "login",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Verification failed. Please try again.");
        return;
      }

      await update({ twoFactorVerified: true });
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--panel-bg)",
          border: "1px solid var(--panel-border)",
          borderRadius: 16,
          padding: 36,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28, display: "flex", justifyContent: "center" }}>
          <Logo variant="light" size="md" />
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Two-Factor Authentication
        </h1>
        <p
          style={{
            textAlign: "center",
            opacity: 0.7,
            fontSize: 14,
            marginBottom: 28,
          }}
        >
          {mode === "totp"
            ? "Enter the 6-digit code from your authenticator app."
            : "Enter one of your saved backup codes."}
        </p>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 14,
              color: "#f87171",
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              {mode === "totp" ? "Authenticator code" : "Backup code"}
            </div>
            <input
              type="text"
              value={token}
              onChange={(e) =>
                setToken(
                  mode === "totp"
                    ? e.target.value.replace(/\D/g, "").slice(0, 6)
                    : e.target.value.toUpperCase().slice(0, 10)
                )
              }
              placeholder={mode === "totp" ? "000000" : "AB12CD34EF"}
              maxLength={mode === "totp" ? 6 : 10}
              inputMode={mode === "totp" ? "numeric" : "text"}
              autoComplete="one-time-code"
              style={{
                width: "100%",
                height: 48,
                padding: "0 16px",
                borderRadius: 10,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text)",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: mode === "totp" ? "0.3em" : "0.1em",
                textAlign: "center",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || status === "loading"}
            style={{
              height: 46,
              borderRadius: 10,
              border: "none",
              background: "var(--btn-primary-bg)",
              color: "var(--text)",
              fontWeight: 800,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "totp" ? "backup" : "totp");
              setToken("");
              setError("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--text)",
              opacity: 0.6,
              fontSize: 13,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {mode === "totp"
              ? "Use a backup code instead"
              : "Use authenticator app instead"}
          </button>
        </div>
      </div>
    </div>
  );
}
