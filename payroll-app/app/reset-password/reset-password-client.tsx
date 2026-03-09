"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function ResetPasswordClient() {
  const sp = useSearchParams();
  const email = sp.get("email") ?? "";
  const token = sp.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const disabled = useMemo(() => !email || !token, [email, token]);

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Reset password</h1>

      {disabled ? (
        <div style={{ color: "crimson" }}>Invalid reset link.</div>
      ) : done ? (
        <div>
          <div style={{ marginTop: 12 }}>Password updated.</div>
          <p style={{ marginTop: 16 }}>
            <a href="/login">Go to login</a>
          </p>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");

            const res = await fetch("/api/auth/reset-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, token, password }),
            });

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(data?.error ?? "Failed to reset password");
              return;
            }

            setDone(true);
          }}
        >
          <div style={{ opacity: 0.8, marginBottom: 10 }}>For: {email}</div>

          <label>New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            style={{ padding: 10, width: "100%", marginTop: 6 }}
          />

          {error ? (
            <div style={{ marginTop: 10, color: "crimson" }}>{error}</div>
          ) : null}

          <button style={{ padding: 12, width: "100%", marginTop: 12 }}>
            Update password
          </button>
        </form>
      )}
    </main>
  );
}