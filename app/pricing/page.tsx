import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Image from "next/image";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  return (
    <main style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text)" }}>
      <header style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid var(--panel-border)", background: "var(--panel-bg)" }}>
        <Link href="/" style={{ textDecoration: "none", color: "var(--text)", fontWeight: 900, display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/askmeltdbluelionpayroll.png" alt="Logo" width={28} height={28} style={{ objectFit: "contain" }} /> AskMe Payroll
        </Link>
        <nav style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link href={session ? "/dashboard" : "/login"} style={{ height: 36, padding: "0 16px", borderRadius: 10, background: "var(--toggle-on-bg)", color: "#38bdf8", display: "flex", alignItems: "center", textDecoration: "none", fontWeight: 800 }}>Dashboard</Link>
        </nav>
      </header>

      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div style={{ color: "#38bdf8", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Transparent Pricing</div>
        <div style={{ fontSize: 48, fontWeight: 950 }}>Pick the plan that fits.</div>

        <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, textAlign: "left" }}>
          {/* Starter */}
          <div style={{ padding: 32, borderRadius: 20, border: "1px solid var(--panel-border)", background: "var(--panel-bg)" }}>
            <div style={{ fontWeight: 950, fontSize: 20 }}>Starter</div>
            <div style={{ marginTop: 12, fontSize: 36, fontWeight: 950 }}>€39<span style={{ fontSize: 16, fontWeight: 700, opacity: 0.6 }}>/mo</span></div>
            <ul style={{ marginTop: 24, opacity: 0.82, lineHeight: 2, paddingLeft: 0, listStyle: "none" }}>
              <li>✓ Payslips PDF generator</li>
              <li>✓ FS3 / FS5 / FS7 forms</li>
              <li>✓ Payroll history & search</li>
              <li>✓ Overtime & leave tracking</li>
            </ul>
            <Link href={session ? "/billing" : "/register"} style={{ marginTop: 32, height: 44, display: "flex", justifyContent: "center", alignItems: "center", borderRadius: 12, background: "var(--toggle-on-bg)", color: "#38bdf8", textDecoration: "none", fontWeight: 900 }}>{session ? "Manage subscription" : "Get started"}</Link>
          </div>
          
          {/* Pro */}
          <div style={{ padding: 32, borderRadius: 20, border: "2px solid #38bdf8", background: "#0c1831", position: "relative", transform: "scale(1.05)", boxShadow: "0 24px 50px rgba(56,189,248,0.15)" }}>
            <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#38bdf8", color: "#0b1220", padding: "6px 16px", borderRadius: 999, fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Most Popular</div>
            <div style={{ fontWeight: 950, fontSize: 20 }}>Pro</div>
            <div style={{ marginTop: 12, fontSize: 36, fontWeight: 950 }}>€79<span style={{ fontSize: 16, fontWeight: 700, opacity: 0.6 }}>/mo</span></div>
            <ul style={{ marginTop: 24, opacity: 0.9, lineHeight: 2, paddingLeft: 0, listStyle: "none" }}>
              <li>✓ Everything in Starter</li>
              <li>✓ Multi-company support</li>
              <li>✓ Automated Timesheet sync</li>
              <li>✓ Advanced Leave pro-rating</li>
            </ul>
            <Link href={session ? "/billing" : "/register"} style={{ marginTop: 32, height: 44, display: "flex", justifyContent: "center", alignItems: "center", borderRadius: 12, background: "#38bdf8", color: "#0b1220", textDecoration: "none", fontWeight: 900 }}>Start Free Trial</Link>
          </div>
          
          {/* Business */}
          <div style={{ padding: 32, borderRadius: 20, border: "1px solid var(--panel-border)", background: "var(--panel-bg)" }}>
            <div style={{ fontWeight: 950, fontSize: 20 }}>Enterprise</div>
            <div style={{ marginTop: 12, fontSize: 36, fontWeight: 950 }}>Custom</div>
            <ul style={{ marginTop: 24, opacity: 0.82, lineHeight: 2, paddingLeft: 0, listStyle: "none" }}>
              <li>✓ Everything in Pro</li>
              <li>✓ API Access</li>
              <li>✓ Bulk Import tools</li>
              <li>✓ Priority Support</li>
            </ul>
            <Link href={session ? "/billing" : "/register"} style={{ marginTop: 32, height: 44, display: "flex", justifyContent: "center", alignItems: "center", borderRadius: 12, border: "1px solid var(--panel-border)", color: "var(--text)", textDecoration: "none", fontWeight: 900 }}>Contact Sales</Link>
          </div>
        </div>
      </section>
    </main>
  );
}