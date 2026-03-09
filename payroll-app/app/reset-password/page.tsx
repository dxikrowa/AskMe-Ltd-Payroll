import { Suspense } from "react";
import ResetPasswordClient from "./reset-password-client";

function ResetPasswordFallback() {
  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Reset password</h1>
      <div style={{ opacity: 0.8, marginTop: 12 }}>Loading...</div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordClient />
    </Suspense>
  );
}