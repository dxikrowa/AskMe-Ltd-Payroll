import { Suspense } from "react";
import VerifyEmailClient from "./verify-email-client";

function VerifyEmailFallback() {
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
        <div style={{ opacity: 0.75, marginBottom: 14 }}>Loading...</div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailClient />
    </Suspense>
  );
}