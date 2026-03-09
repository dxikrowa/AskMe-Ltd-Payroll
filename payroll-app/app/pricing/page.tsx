import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  return (
    <main style={{ minHeight: "100vh", background: "#05070b", color: "#e5e7eb" }}>
      <header
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", color: "#e5e7eb", fontWeight: 900 }}>
          Payroll App
        </Link>

        <nav style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link href="/" style={{ color: "#e5e7eb", opacity: 0.9, textDecoration: "none" }}>
            Features
          </Link>
          <Link
            href={session ? "/dashboard" : "/login"}
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Dashboard
          </Link>
          <Link
            href={session ? "/account" : "/login"}
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            My Account
          </Link>
        </nav>
      </header>

      <section style={{ padding: "56px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 40, fontWeight: 950 }}>Pricing</div>
        <div style={{ marginTop: 10, opacity: 0.8 }}>Pick the plan that fits your team.</div>

        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
          {["Starter", "Pro", "Business"].map((name, idx) => (
            <div
              key={name}
              style={{
                padding: 18,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: idx === 1 ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 950, fontSize: 16 }}>{name}</div>
              <div style={{ marginTop: 10, fontSize: 28, fontWeight: 950 }}>
                {idx === 0 ? "€19" : idx === 1 ? "€49" : "€99"}
                <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.8 }}>/mo</span>
              </div>
              <ul style={{ marginTop: 12, opacity: 0.82, lineHeight: 1.7, paddingLeft: 18 }}>
                <li>Payslips PDF generator</li>
                <li>FS3 / FS5 / FS7 generator</li>
                <li>Payroll history & search</li>
                <li>Overtime & leave tracking</li>
              </ul>

              <Link
                href={session ? "/billing" : "/register"}
                style={{
                  marginTop: 14,
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  background: "rgba(59,130,246,0.85)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  textDecoration: "none",
                  fontWeight: 900,
                }}
              >
                {session ? "Manage subscription" : "Get started"}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
