"use client";

/**
 * app/(dashboard)/account/two-factor-section.tsx
 *
 * Client component that handles the 2FA setup / disable flow inline
 * on the Account page. No page navigation required.
 *
 * Steps:
 *  Disabled → click "Enable 2FA" → loads QR code → user scans + enters token
 *           → server enables 2FA → backup codes shown once
 *  Enabled  → click "Disable 2FA" → user enters current TOTP → server disables
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step =
  | "idle"
  | "loading-qr"
  | "show-qr"
  | "verifying-setup"
  | "show-backup"
  | "disabling";

interface Props {
  twoFactorEnabled: boolean;
}

export default function TwoFactorSection({ twoFactorEnabled: initialEnabled }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<Step>("idle");

  // Setup flow
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Disable flow
  const [disableToken, setDisableToken] = useState("");

  const [error, setError] = useState("");

  const card: React.CSSProperties = {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
  };

  // ── Enable flow ──────────────────────────────────────────────────────────────

  async function startSetup() {
    setError("");
    setStep("loading-qr");
    try {
      const res = await fetch("/api/auth/setup-2fa");
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to start 2FA setup"); setStep("idle"); return; }
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("show-qr");
    } catch {
      setError("Network error. Please try again.");
      setStep("idle");
    }
  }

  async function confirmSetup() {
    setError("");
    if (setupToken.length !== 6) { setError("Please enter a 6-digit code."); return; }
    setStep("verifying-setup");
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: setupToken, purpose: "setup" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Verification failed"); setStep("show-qr"); return; }
      setBackupCodes(data.backupCodes ?? []);
      setEnabled(true);
      setStep("show-backup");
    } catch {
      setError("Network error. Please try again.");
      setStep("show-qr");
    }
  }

  // ── Disable flow ─────────────────────────────────────────────────────────────

  async function confirmDisable() {
    setError("");
    if (disableToken.length !== 6) { setError("Please enter a 6-digit code."); return; }
    try {
      const res = await fetch("/api/auth/disable-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: disableToken }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to disable 2FA"); return; }
      setEnabled(false);
      setStep("idle");
      setDisableToken("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 42,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "var(--text, #fff)",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "0.25em",
    textAlign: "center",
    outline: "none",
    marginTop: 8,
  };

  const btnPrimary: React.CSSProperties = {
    height: 40,
    padding: "0 18px",
    borderRadius: 10,
    border: "none",
    background: "rgba(201,168,76,0.85)",
    color: "#0F1035",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    marginTop: 12,
  };

  const btnDanger: React.CSSProperties = {
    height: 40,
    padding: "0 18px",
    borderRadius: 10,
    border: "1px solid rgba(239,68,68,0.5)",
    background: "rgba(239,68,68,0.1)",
    color: "#f87171",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  };

  const btnGhost: React.CSSProperties = {
    height: 40,
    padding: "0 18px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "transparent",
    color: "var(--text, #fff)",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    marginLeft: 8,
  };

  return (
    <div style={card}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
        Two-Factor Authentication (2FA)
      </div>

      {/* Status badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span
          style={{
            display: "inline-block",
            width: 8, height: 8,
            borderRadius: "50%",
            background: enabled ? "#4ade80" : "rgba(255,255,255,0.3)",
          }}
        />
        <span style={{ fontWeight: 700 }}>{enabled ? "Enabled" : "Disabled"}</span>
      </div>

      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 13,
          color: "#f87171",
          marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      {/* ── IDLE ────────────────────────────────────────────────────────── */}
      {step === "idle" && !enabled && (
        <div>
          <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 12, lineHeight: 1.6 }}>
            Protect your account with a time-based one-time password (TOTP). 
            Works with Google Authenticator, Authy, and other standard apps.
          </p>
          <button style={btnPrimary} onClick={startSetup}>Enable 2FA</button>
        </div>
      )}

      {step === "idle" && enabled && (
        <div>
          <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 12, lineHeight: 1.6 }}>
            Your account is protected with 2FA. To disable it, enter your current authenticator code below.
          </p>
          <button style={btnDanger} onClick={() => { setStep("disabling"); setError(""); }}>
            Disable 2FA
          </button>
        </div>
      )}

      {/* ── LOADING QR ──────────────────────────────────────────────────── */}
      {step === "loading-qr" && (
        <p style={{ opacity: 0.7, fontSize: 14 }}>Generating QR code…</p>
      )}

      {/* ── SHOW QR ─────────────────────────────────────────────────────── */}
      {(step === "show-qr" || step === "verifying-setup") && (
        <div>
          <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 14, lineHeight: 1.6 }}>
            Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
          </p>
          {qrCode && (
            <div style={{ marginBottom: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCode}
                alt="2FA QR Code"
                style={{ width: 180, height: 180, borderRadius: 10, background: "#fff", padding: 8 }}
              />
              <div style={{ marginTop: 10, fontSize: 11, opacity: 0.55 }}>
                Can't scan? Enter manually: <code style={{ fontSize: 11, letterSpacing: "0.1em" }}>{secret}</code>
              </div>
            </div>
          )}
          <label style={{ display: "block", fontSize: 12, opacity: 0.7 }}>
            Authenticator Code
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              style={inputStyle}
              autoFocus
            />
          </label>
          <div>
            <button
              style={{ ...btnPrimary, opacity: step === "verifying-setup" ? 0.7 : 1 }}
              onClick={confirmSetup}
              disabled={step === "verifying-setup"}
            >
              {step === "verifying-setup" ? "Verifying…" : "Confirm & Enable"}
            </button>
            <button style={btnGhost} onClick={() => { setStep("idle"); setSetupToken(""); setError(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── BACKUP CODES ────────────────────────────────────────────────── */}
      {step === "show-backup" && (
        <div>
          <div style={{
            background: "rgba(234,179,8,0.1)",
            border: "1px solid rgba(234,179,8,0.4)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 14,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>⚠️ Save your backup codes</div>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
              These codes can be used to access your account if you lose your authenticator. 
              Each code can only be used once. <strong>Save them now — they won't be shown again.</strong>
            </div>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 16,
            background: "rgba(0,0,0,0.25)",
            borderRadius: 10,
            padding: 14,
          }}>
            {backupCodes.map((code) => (
              <code key={code} style={{ fontSize: 14, letterSpacing: "0.1em", fontWeight: 600 }}>
                {code}
              </code>
            ))}
          </div>
          <button style={btnPrimary} onClick={() => setStep("idle")}>
            I've saved my backup codes
          </button>
        </div>
      )}

      {/* ── DISABLING ───────────────────────────────────────────────────── */}
      {step === "disabling" && (
        <div>
          <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 12 }}>
            Enter your current authenticator code to disable 2FA.
          </p>
          <label style={{ display: "block", fontSize: 12, opacity: 0.7 }}>
            Authenticator Code
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableToken}
              onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              style={inputStyle}
              autoFocus
            />
          </label>
          <div>
            <button style={btnDanger} onClick={confirmDisable}>Disable 2FA</button>
            <button style={btnGhost} onClick={() => { setStep("idle"); setDisableToken(""); setError(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
