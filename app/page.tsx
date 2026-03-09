
"use client";

import Image from "next/image";
import { useState } from "react";
import MarketingHeader from "@/components/marketing-header";

const demos = [
  { id: "dashboard", label: "Dashboard", src: "/marketing/placeholder-dashboard.png", title: "Run payroll with clear company and employee views.", desc: "Manage employees, payroll periods, leave balances and generated files from one place." },
  { id: "payslips", label: "Payslips", src: "/marketing/placeholder-demos.png", title: "Preview and generate payslips faster.", desc: "See totals before exporting and keep payroll history available for later reference." },
  { id: "forms", label: "FSS Forms", src: "/marketing/placeholder-dashboard.svg", title: "Generate FS3, FS5 and FS7 forms.", desc: "Use payroll records to prepare statutory forms and export PDFs when needed." },
];

export default function LandingPage() {
  const [activeDemo, setActiveDemo] = useState(demos[0]);

  return <main style={{ background:"#f8fafc", color:"#0f172a", minHeight:"100vh" }}>
    <MarketingHeader />
    <section style={{ maxWidth:1200, margin:"0 auto", padding:"72px 24px 56px", display:"grid", gridTemplateColumns:"1.1fr 0.9fr", gap:32, alignItems:"center" }}>
      <div>
        <div style={{ display:"inline-flex", padding:"6px 12px", borderRadius:999, background:"#f5e7b8", color:"#8a6a18", fontWeight:700, fontSize:12 }}>Payroll SaaS for Malta</div>
        <h1 style={{ fontSize:56, lineHeight:1.05, margin:"18px 0 14px", fontWeight:900 }}>Malta payroll, payslips and FSS forms in one place.</h1>
        <p style={{ fontSize:18, lineHeight:1.6, color:"#475569", maxWidth:640 }}>Run payroll, preview payslips live, generate FS3/FS5/FS7 forms, manage vacation and sick leave, and keep employee records organized.</p>
        <div style={{ display:"flex", gap:12, marginTop:24, flexWrap:"wrap" }}>
          <a href="#pricing" style={{ padding:"12px 16px", borderRadius:12, background:"#8a6a18", color:"white", textDecoration:"none", fontWeight:800 }}>View pricing</a>
          <a href="#demos" style={{ padding:"12px 16px", borderRadius:12, border:"1px solid #cbd5e1", color:"#0f172a", textDecoration:"none", fontWeight:700 }}>See demo</a>
        </div>
      </div>
      <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:20, padding:18, boxShadow:"0 20px 60px rgba(15,23,42,0.08)" }}>
        <Image src="/marketing/placeholder-dashboard.png" alt="Payroll dashboard preview" width={900} height={560} style={{ width:"100%", height:"auto", borderRadius:14 }} />
      </div>
    </section>

    <section id="features" style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px 56px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:16 }}>
        {[["Live preview", "Preview payslips and statutory forms before generating PDFs."],["Payroll history", "Store past payslips and use them for total-to-date values."],["Leave tracking", "Track vacation leave and sick leave directly from the dashboard."],["Billing", "Simple subscription access for payroll teams and company owners."]].map(([title, text]) => <div key={title} style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:18, padding:20 }}><div style={{ fontWeight:800, fontSize:18 }}>{title}</div><div style={{ color:"#475569", marginTop:8, lineHeight:1.6 }}>{text}</div></div>)}
      </div>
    </section>

    <section id="demos" style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px 56px" }}>
      <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:24, padding:24, boxShadow:"0 20px 60px rgba(15,23,42,0.06)" }}>
        <div style={{ fontSize:30, fontWeight:900, marginBottom:8 }}>Application demo</div>
        <div style={{ color:"#475569", marginBottom:18 }}>Switch between screenshots using the buttons below.</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
          {demos.map((d) => <button key={d.id} onClick={() => setActiveDemo(d)} style={{ padding:"10px 14px", borderRadius:999, border:d.id===activeDemo.id?"1px solid #8a6a18":"1px solid #cbd5e1", background:d.id===activeDemo.id?"#f8f0d7":"white", color:"#0f172a", fontWeight:700, cursor:"pointer" }}>{d.label}</button>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1.25fr", gap:24, alignItems:"center" }}>
          <div>
            <div style={{ fontSize:24, fontWeight:900 }}>{activeDemo.title}</div>
            <div style={{ color:"#475569", lineHeight:1.7, marginTop:10 }}>{activeDemo.desc}</div>
          </div>
          <div style={{ border:"1px solid #e5e7eb", borderRadius:18, overflow:"hidden", background:"#f8fafc" }}>
            <Image src={activeDemo.src} alt={activeDemo.label} width={1200} height={720} style={{ width:"100%", height:"auto" }} />
          </div>
        </div>
      </div>
    </section>

    <section id="pricing" style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px 56px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"0.9fr 1.1fr", gap:20 }}>
        <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:22, padding:24 }}>
          <div style={{ fontSize:28, fontWeight:900 }}>Pricing</div>
          <div style={{ marginTop:8, color:"#475569", lineHeight:1.7 }}>One monthly plan for the full payroll workspace.</div>
        </div>
        <div style={{ background:"#0f172a", color:"white", borderRadius:22, padding:24 }}>
          <div style={{ opacity:0.75, fontSize:14 }}>Monthly plan</div>
          <div style={{ fontSize:42, fontWeight:900, marginTop:8 }}>€39<span style={{ fontSize:18, opacity:0.75 }}>/month</span></div>
          <div style={{ marginTop:16, display:"grid", gap:10, color:"#cbd5e1" }}>
            <div>Unlimited payroll runs</div><div>Payslip generation</div><div>FS3 / FS5 / FS7 forms</div><div>Employee and leave tracking</div><div>Stripe billing</div>
          </div>
          <div style={{ marginTop:18 }}><a href="/register" style={{ padding:"12px 16px", borderRadius:12, background:"#8a6a18", color:"white", textDecoration:"none", fontWeight:800, display:"inline-block" }}>Create account</a></div>
        </div>
      </div>
    </section>

    <section id="contact" style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px 80px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"0.9fr 1.1fr", gap:20 }}>
        <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:22, padding:24 }}>
          <div style={{ fontSize:28, fontWeight:900 }}>Contact</div>
          <div style={{ color:"#475569", lineHeight:1.7, marginTop:10 }}>Use the form to send a message. Update the placeholder contact details later.</div>
          <div style={{ marginTop:18, display:"grid", gap:8, color:"#334155" }}>
            <div><strong>Email:</strong> hello@example.com</div>
            <div><strong>Phone:</strong> +356 0000 0000</div>
            <div><strong>Address:</strong> Placeholder business address, Malta</div>
          </div>
        </div>
        <form action="/api/contact" method="post" style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:22, padding:24, display:"grid", gap:12 }}>
          <input name="name" placeholder="Full name" style={field} required />
          <input name="email" type="email" placeholder="Email address" style={field} required />
          <input name="subject" placeholder="Subject" style={field} required />
          <textarea name="message" placeholder="Your message" rows={6} style={{ ...field, resize:"vertical" }} required />
          <button style={{ padding:"12px 16px", borderRadius:12, border:"1px solid #8a6a18", background:"#8a6a18", color:"white", fontWeight:800 }}>Send message</button>
        </form>
      </div>
    </section>
    <style>{`@media (max-width: 900px){ section:first-of-type,#pricing > div,#contact > div,#demos > div > div:last-child{grid-template-columns:1fr !important;} #features > div{grid-template-columns:1fr !important;} }`}</style>
  </main>;
}
const field = { width:"100%", border:"1px solid #cbd5e1", borderRadius:12, padding:"12px 14px", fontSize:14, outline:"none" } as const;
