import Image from "next/image";
import MarketingHeader from "@/components/marketing-header";

const demos = [
  { id: "dashboard", label: "Dashboard", src: "/marketing/placeholder-dashboard.png" },
  { id: "payslips", label: "Payslips", src: "/marketing/placeholder-demos.png" },
  { id: "forms", label: "Forms", src: "/marketing/placeholder-dashboard.svg" },
];

export default function LandingPage() {
  return <main style={{ background:"#f8fafc", color:"#0f172a", minHeight:"100vh" }}>
    <MarketingHeader />
    <section style={{ maxWidth:1200, margin:"0 auto", padding:"72px 24px 56px", display:"grid", gridTemplateColumns:"1.1fr 0.9fr", gap:32, alignItems:"center" }}>
      <div>
        <div style={{ display:"inline-flex", padding:"6px 12px", borderRadius:999, background:"#e0e7ff", color:"#1d4ed8", fontWeight:700, fontSize:12 }}>Payroll updates 2026</div>
        <h1 style={{ fontSize:56, lineHeight:1.05, margin:"18px 0 14px", fontWeight:900 }}>Malta payroll, payslips and FSS forms in one place.</h1>
        <p style={{ fontSize:18, lineHeight:1.6, color:"#475569", maxWidth:640 }}>Run payroll, preview payslips live, generate FS3/FS5/FS7 forms, manage vacation and sick leave, and keep employee records organized.</p>
        <div style={{ display:"flex", gap:12, marginTop:24, flexWrap:"wrap" }}>
          <a href="#demos" style={{ padding:"12px 16px", borderRadius:12, background:"#1f3d7a", color:"white", textDecoration:"none", fontWeight:800 }}>Scroll to demo</a>
          <a href="#features" style={{ padding:"12px 16px", borderRadius:12, border:"1px solid #cbd5e1", color:"#0f172a", textDecoration:"none", fontWeight:700 }}>Explore features</a>
        </div>
      </div>
      <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:20, padding:18, boxShadow:"0 20px 60px rgba(15,23,42,0.08)" }}>
        <Image src="/marketing/placeholder-dashboard.png" alt="Payroll dashboard preview" width={900} height={560} style={{ width:"100%", height:"auto", borderRadius:14 }} />
      </div>
    </section>

    <section id="features" style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px 56px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:16 }}>
        {[
          ["Live preview", "Preview payslips and statutory forms before generating PDFs."],
          ["Payroll history", "Store past payslips and use them for total-to-date values."],
          ["Leave tracking", "Track vacation leave and sick leave directly from the dashboard."],
        ].map(([title, text]) => <div key={title} style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:18, padding:20 }}><div style={{ fontWeight:800, fontSize:18 }}>{title}</div><div style={{ color:"#475569", marginTop:8, lineHeight:1.6 }}>{text}</div></div>)}
      </div>
    </section>

    <section id="demos" style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px 80px" }}>
      <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:24, padding:24, boxShadow:"0 20px 60px rgba(15,23,42,0.06)" }}>
        <div style={{ fontSize:30, fontWeight:900, marginBottom:8 }}>Application demo</div>
        <div style={{ color:"#475569", marginBottom:18 }}>Switch between a few application screenshots below.</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
          {demos.map((d) => <a key={d.id} href={`#demo-${d.id}`} style={{ padding:"10px 14px", borderRadius:999, border:"1px solid #cbd5e1", textDecoration:"none", color:"#0f172a", fontWeight:700 }}>{d.label}</a>)}
        </div>
        <div style={{ display:"grid", gap:28 }}>
          {demos.map((d) => <div key={d.id} id={`demo-${d.id}`}><div style={{ fontWeight:800, marginBottom:10 }}>{d.label}</div><div style={{ border:"1px solid #e5e7eb", borderRadius:18, overflow:"hidden" }}><Image src={d.src} alt={d.label} width={1200} height={720} style={{ width:"100%", height:"auto", background:"#f8fafc" }} /></div></div>)}
        </div>
      </div>
    </section>

    <section id="contact" style={{ borderTop:"1px solid #e5e7eb", padding:"24px", textAlign:"center", color:"#64748b" }}>AskMe Limited Payroll</section>
    <style>{`@media (max-width: 900px){ section:first-of-type{grid-template-columns:1fr !important;} #features > div{grid-template-columns:1fr !important;} }`}</style>
  </main>;
}
