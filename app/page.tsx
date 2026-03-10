"use client";

import Image from "next/image";
import { useState } from "react";
import MarketingHeader from "@/components/marketing-header";

const demoTabs = [
  { id: "dashboard", label: "Dashboard Analytics", title: "Add your team", desc: "Import team members and manage their tax profiles, employment types, and details effortlessly.", img: "/image_4f4cbe.png" },
  { id: "history", label: "Review hours & bonuses", title: "Review hours & bonuses", desc: "We auto-sync timesheets and leave records. Just review the entries and apply any one-off bonuses or deductions.", img: "/image_4f4c3a.png" },
  { id: "analytics", label: "Click 'Run Payroll'", title: "Click 'Run Payroll'", desc: "Get a clear breakdown of gross, net, tax, and NI contributions. We handle the heavy lifting and FSS compliance.", img: "/image_4f4959.png" }
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <main style={{ background: "var(--background)", color: "var(--text)", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <MarketingHeader />
      
      {/* Hero Section */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40, alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-flex", padding: "6px 16px", borderRadius: 999, background: "var(--toggle-on-bg)", color: "#38bdf8", fontWeight: 800, fontSize: 13, marginBottom: 20, border: "1px solid var(--btn-primary-border)" }}>
             V1.0.0 is live
          </div>
          <h1 style={{ fontSize: 64, lineHeight: 1.05, margin: "0 0 20px", fontWeight: 900, letterSpacing: "-1px" }}>
            Payroll Management, without the <span style={{ color: "#38bdf8" }}>headaches.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--muted)", maxWidth: 600, marginBottom: 32 }}>
            Automate your entire payroll process, calculate accurately, and pay your team in clicks, not hours. Built for modern businesses that value time.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <a href="/register" style={{ padding: "14px 24px", borderRadius: 12, background: "#38bdf8", color: "#0b1220", textDecoration: "none", fontWeight: 800, transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 8px 24px rgba(56,189,248,0.25)" }}>
              Start 1 Month Free Trial →
            </a>
            <a href="#demos" style={{ padding: "14px 24px", borderRadius: 12, border: "1px solid var(--panel-border)", color: "var(--text)", textDecoration: "none", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "var(--panel-bg)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
              ▶ View Demo
            </a>
          </div>
        </div>
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: 24, padding: 12, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
          <Image src="/image_4f4959.png" alt="Payroll dashboard" width={1000} height={600} style={{ width: "100%", height: "auto", borderRadius: 16 }} />
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px 100px", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12 }}>Everything you need to manage payroll</h2>
        <p style={{ fontSize: 18, color: "var(--muted)", maxWidth: 600, margin: "0 auto 48px" }}>We have removed the complexity from paying your team. Enjoy a seamless experience with features designed for scale.</p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, textAlign: "left" }}>
          {[
            { icon: "📄", title: "Automated FSS Filing", text: "We automatically calculate, deduct, and generate FS3, FS5, and FS7 forms for you. Never worry about penalties." },
            { icon: "⏱", title: "Time Tracking Sync", text: "Integrate directly with our native timesheets. Overtime and part-time hours sync automatically into the pay run." },
            { icon: "🏖", title: "Leave Management", text: "Track sick leave and vacation leave accurately. Balances update in real-time on every generated payslip." },
            { icon: "🛡", title: "Compliance Built-in", text: "Stay compliant with ever-changing labor laws. We calculate Malta NI, taxes, and maternity funds accurately." },
            { icon: "🗂", title: "Historical Records", text: "Keep a perfectly organized history of all payrolls. Generate total-to-date reports across any given period easily." },
            { icon: "💶", title: "Precise Calculations", text: "Handle complex pro-rata calculations for part-time employees, including capped statutory bonuses and allowances." }
          ].map((f, idx) => (
            <div key={idx} style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: 20, padding: 32, transition: "transform 0.2s, border-color 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "#38bdf8"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--panel-border)"; }}>
              <div style={{ fontSize: 28, marginBottom: 16, background: "var(--toggle-on-bg)", width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 12 }}>{f.title}</h3>
              <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demos" style={{ background: "#060a10", padding: "100px 0", borderTop: "1px solid var(--panel-border)", borderBottom: "1px solid var(--panel-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ color: "#38bdf8", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Simple Process</div>
          <h2 style={{ fontSize: 40, fontWeight: 900, marginBottom: 40 }}>Run payroll in minutes, not days.</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 60, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {demoTabs.map((tab, i) => (
                <button key={i} onClick={() => setActiveTab(i)} style={{ textAlign: "left", padding: 24, borderRadius: 20, background: activeTab === i ? "var(--panel-bg)" : "transparent", border: activeTab === i ? "1px solid var(--btn-primary-border)" : "1px solid transparent", cursor: "pointer", transition: "all 0.2s ease" }}>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ background: activeTab === i ? "#38bdf8" : "var(--panel-border)", color: activeTab === i ? "#0b1220" : "var(--text)", width: 32, height: 32, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0 }}>0{i+1}</div>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: activeTab === i ? "#38bdf8" : "var(--text)", marginBottom: 8 }}>{tab.title}</h3>
                      <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>{tab.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: 24, padding: 12, boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }}>
              <Image src={demoTabs[activeTab].img} alt={demoTabs[activeTab].title} width={1200} height={750} style={{ width: "100%", height: "auto", borderRadius: 16, transition: "opacity 0.3s ease" }} priority />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px", textAlign: "center" }}>
        <div style={{ color: "#38bdf8", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Pricing Plans</div>
        <h2 style={{ fontSize: 40, fontWeight: 900, marginBottom: 48 }}>Simple, transparent pricing</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, textAlign: "left" }}>
          {/* Starter */}
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: 24, padding: 40 }}>
            <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Starter</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24 }}>Perfect for small teams and startups.</p>
            <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 24 }}>€39<span style={{ fontSize: 18, color: "var(--muted)", fontWeight: 500 }}>/mo</span></div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", color: "var(--muted)", lineHeight: 2 }}>
              <li>✓ Automated payroll runs</li>
              <li>✓ Basic FSS filings</li>
              <li>✓ Payslip generation</li>
              <li>✓ Email support</li>
            </ul>
            <a href="/register" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 12, background: "var(--toggle-on-bg)", color: "#38bdf8", textDecoration: "none", fontWeight: 800, transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(56,189,248,0.25)"} onMouseOut={(e) => e.currentTarget.style.background = "var(--toggle-on-bg)"}>Get Started</a>
          </div>
          
          {/* Pro */}
          <div style={{ background: "#0c1831", border: "2px solid #38bdf8", borderRadius: 24, padding: 40, position: "relative", transform: "scale(1.05)", zIndex: 10, boxShadow: "0 24px 50px rgba(56,189,248,0.15)" }}>
            <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#38bdf8", color: "#0b1220", padding: "6px 16px", borderRadius: 999, fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Most Popular</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Pro</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24 }}>Everything you need to scale your growing business.</p>
            <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 24 }}>€79<span style={{ fontSize: 18, color: "var(--muted)", fontWeight: 500 }}>/mo</span></div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", color: "var(--text)", lineHeight: 2 }}>
              <li>✓ Everything in Starter</li>
              <li>✓ Multi-company support</li>
              <li>✓ Leave & Timesheet tracking</li>
              <li>✓ Advanced FS3, FS5, FS7 PDFs</li>
              <li>✓ Priority support</li>
            </ul>
            <a href="/register" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 12, background: "#38bdf8", color: "#0b1220", textDecoration: "none", fontWeight: 800, transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "#7dd3fc"} onMouseOut={(e) => e.currentTarget.style.background = "#38bdf8"}>Start Free Trial</a>
          </div>

          {/* Enterprise */}
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: 24, padding: 40 }}>
            <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Enterprise</h3>
            <p style={{ color: "var(--muted)", marginBottom: 24 }}>Advanced features for large organizations.</p>
            <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 24 }}>Custom</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", color: "var(--muted)", lineHeight: 2 }}>
              <li>✓ Everything in Pro</li>
              <li>✓ Custom API access</li>
              <li>✓ Custom HR workflows</li>
              <li>✓ Dedicated account manager</li>
            </ul>
            <a href="#contact" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 12, border: "1px solid var(--panel-border)", color: "var(--text)", textDecoration: "none", fontWeight: 800, transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "var(--panel-bg)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>Contact Sales</a>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: 24, display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden" }}>
          <div style={{ background: "#0c1831", padding: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>Ready to transform your payroll?</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 40 }}>Book a personalized demo with our team or shoot us a message. We are here to help you ditch the payroll headaches.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, color: "var(--text)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ color: "#38bdf8" }}>✉</span> info@amlpayroll.com</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ color: "#38bdf8" }}>☏</span> +356 9908 9573</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ color: "#38bdf8" }}>📍</span> Office 2, 642, Saint Joseph Street, Hamrun</div>
            </div>
          </div>
          <div style={{ padding: 48 }}>
            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Send us a message</h3>
            <form action="/api/contact" method="post" style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <input name="name" placeholder="First Name" style={{ width: "100%", padding: 14, borderRadius: 12, background: "transparent", border: "1px solid var(--panel-border)", color: "var(--text)", outline: "none" }} required />
                <input name="lastName" placeholder="Last Name" style={{ width: "100%", padding: 14, borderRadius: 12, background: "transparent", border: "1px solid var(--panel-border)", color: "var(--text)", outline: "none" }} />
              </div>
              <input name="email" type="email" placeholder="Work Email" style={{ width: "100%", padding: 14, borderRadius: 12, background: "transparent", border: "1px solid var(--panel-border)", color: "var(--text)", outline: "none" }} required />
              <textarea name="message" placeholder="How can we help?" rows={4} style={{ width: "100%", padding: 14, borderRadius: 12, background: "transparent", border: "1px solid var(--panel-border)", color: "var(--text)", outline: "none", resize: "vertical" }} required />
              <button style={{ padding: "16px", borderRadius: 12, background: "var(--background)", border: "1px solid var(--panel-border)", color: "var(--text)", fontWeight: 800, cursor: "pointer", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "#38bdf8"} onMouseOut={(e) => e.currentTarget.style.background = "var(--background)"}>Send Message →</button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}