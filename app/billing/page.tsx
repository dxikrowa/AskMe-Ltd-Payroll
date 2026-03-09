"use client";

export default function BillingPage() {
  const subscribe = async () => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <div>
      <h1>Billing</h1>
      <p>Subscribe to unlock payroll features.</p>

      <button
        onClick={subscribe}
        style={{
          padding: "10px 16px",
          marginTop: 12,
          borderRadius: 6,
          border: "1px solid #e5e7eb",
        }}
      >
        Subscribe
      </button>
    </div>
  );
}
