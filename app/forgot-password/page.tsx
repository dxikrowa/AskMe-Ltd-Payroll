"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Forgot password</h1>
      <p>Enter your email and we’ll send you a reset link.</p>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await fetch("/api/auth/request-password-reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          setSent(true);
        }}
      >
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 10, width: "100%", marginTop: 6 }} />
        <button style={{ padding: 12, width: "100%", marginTop: 12 }}>Send reset link</button>
      </form>

      {sent && <div style={{ marginTop: 12, opacity: 0.8 }}>If an account exists for that email, a reset link has been sent.</div>}

      <p style={{ marginTop: 16 }}>
        <a href="/login">Back to login</a>
      </p>
    </main>
  );
}
